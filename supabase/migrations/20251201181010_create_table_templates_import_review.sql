/*
  # Table Templates Import Review System

  1. New Tables
    - `table_templates_import_review`
      - Stores table templates during import review phase
      - Uses question_identifier (string) instead of question_id (UUID)
      - Linked to review_session_id for tracking and cleanup
      - Auto-deleted when review session is cancelled (CASCADE)

    - `table_template_cells_import_review`
      - Stores cell configurations for review-phase templates
      - Same structure as table_template_cells but for review phase
      - Auto-deleted when parent template is deleted (CASCADE)

  2. Purpose
    - Enable real-time database persistence during import review
    - Store template data with proper relationships before questions are finalized
    - Automatic migration to production tables on import approval
    - Automatic cleanup on import cancellation

  3. Security
    - Enable RLS on both tables
    - System admins have full access
    - Teachers can access templates for their own review sessions
    - Students have no access

  4. Migration Function
    - Automatic migration from review tables to production tables
    - Called when import is approved and questions get real UUIDs
    - Maps question_identifier to actual question_id or sub_question_id
*/

-- Create table_templates_import_review table
CREATE TABLE IF NOT EXISTS table_templates_import_review (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_session_id uuid NOT NULL REFERENCES question_import_review_sessions(id) ON DELETE CASCADE,
  question_identifier text NOT NULL,
  is_subquestion boolean DEFAULT false,
  parent_question_identifier text,
  rows integer NOT NULL CHECK (rows >= 2 AND rows <= 50),
  columns integer NOT NULL CHECK (columns >= 2 AND columns <= 20),
  headers text[] NOT NULL DEFAULT '{}',
  title text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_review_template UNIQUE(review_session_id, question_identifier)
);

-- Create table_template_cells_import_review table
CREATE TABLE IF NOT EXISTS table_template_cells_import_review (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES table_templates_import_review(id) ON DELETE CASCADE,
  row_index integer NOT NULL CHECK (row_index >= 0),
  col_index integer NOT NULL CHECK (col_index >= 0),
  cell_type text NOT NULL CHECK (cell_type IN ('locked', 'editable')),
  locked_value text,
  expected_answer text,
  marks integer DEFAULT 1 CHECK (marks > 0),
  accepts_equivalent_phrasing boolean DEFAULT false,
  case_sensitive boolean DEFAULT false,
  alternative_answers text[] DEFAULT '{}'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_table_templates_import_review_session
  ON table_templates_import_review(review_session_id);

CREATE INDEX IF NOT EXISTS idx_table_templates_import_review_identifier
  ON table_templates_import_review(question_identifier);

CREATE INDEX IF NOT EXISTS idx_table_template_cells_import_review_template
  ON table_template_cells_import_review(template_id);

CREATE INDEX IF NOT EXISTS idx_table_template_cells_import_review_position
  ON table_template_cells_import_review(template_id, row_index, col_index);

-- Enable RLS
ALTER TABLE table_templates_import_review ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_template_cells_import_review ENABLE ROW LEVEL SECURITY;

-- RLS Policies for table_templates_import_review

-- System admins have full access
CREATE POLICY "System admins have full access to review templates"
  ON table_templates_import_review FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.user_type = 'system_admin'
      AND users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.user_type = 'system_admin'
      AND users.is_active = true
    )
  );

-- Users can manage templates for their own review sessions
CREATE POLICY "Users can manage review templates for own sessions"
  ON table_templates_import_review FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM question_import_review_sessions qirs
      INNER JOIN users u ON u.id = qirs.user_id
      WHERE qirs.id = table_templates_import_review.review_session_id
      AND u.auth_user_id = auth.uid()
      AND u.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM question_import_review_sessions qirs
      INNER JOIN users u ON u.id = qirs.user_id
      WHERE qirs.id = table_templates_import_review.review_session_id
      AND u.auth_user_id = auth.uid()
      AND u.is_active = true
    )
  );

-- RLS Policies for table_template_cells_import_review

-- System admins have full access
CREATE POLICY "System admins have full access to review template cells"
  ON table_template_cells_import_review FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.user_type = 'system_admin'
      AND users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.user_type = 'system_admin'
      AND users.is_active = true
    )
  );

-- Users can manage cells for templates in their own review sessions
CREATE POLICY "Users can manage review template cells for own sessions"
  ON table_template_cells_import_review FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM table_template_cells_import_review ttcir
      INNER JOIN table_templates_import_review ttir ON ttir.id = ttcir.template_id
      INNER JOIN question_import_review_sessions qirs ON qirs.id = ttir.review_session_id
      INNER JOIN users u ON u.id = qirs.user_id
      WHERE ttcir.id = table_template_cells_import_review.id
      AND u.auth_user_id = auth.uid()
      AND u.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM table_templates_import_review ttir
      INNER JOIN question_import_review_sessions qirs ON qirs.id = ttir.review_session_id
      INNER JOIN users u ON u.id = qirs.user_id
      WHERE ttir.id = table_template_cells_import_review.template_id
      AND u.auth_user_id = auth.uid()
      AND u.is_active = true
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_table_templates_import_review_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_table_templates_import_review_updated_at
  BEFORE UPDATE ON table_templates_import_review
  FOR EACH ROW
  EXECUTE FUNCTION update_table_templates_import_review_updated_at();

-- Function to migrate review templates to production tables
-- Called when import is approved and questions get real UUIDs
CREATE OR REPLACE FUNCTION migrate_review_templates_to_production(
  p_review_session_id uuid,
  p_question_mapping jsonb  -- Maps question_identifier to actual question_id/sub_question_id
)
RETURNS jsonb AS $$
DECLARE
  v_template RECORD;
  v_cell RECORD;
  v_new_template_id uuid;
  v_question_id uuid;
  v_sub_question_id uuid;
  v_is_subquestion boolean;
  v_migrated_count integer := 0;
  v_result jsonb;
BEGIN
  -- Iterate through all templates for this review session
  FOR v_template IN
    SELECT * FROM table_templates_import_review
    WHERE review_session_id = p_review_session_id
  LOOP
    -- Get the actual question ID from mapping
    v_question_id := NULL;
    v_sub_question_id := NULL;
    v_is_subquestion := v_template.is_subquestion;

    IF v_is_subquestion THEN
      v_sub_question_id := (p_question_mapping->v_template.question_identifier->>'sub_question_id')::uuid;
    ELSE
      v_question_id := (p_question_mapping->v_template.question_identifier->>'question_id')::uuid;
    END IF;

    -- Skip if mapping not found
    IF v_question_id IS NULL AND v_sub_question_id IS NULL THEN
      RAISE NOTICE 'No mapping found for question_identifier: %', v_template.question_identifier;
      CONTINUE;
    END IF;

    -- Insert template into production table
    INSERT INTO table_templates (
      question_id,
      sub_question_id,
      rows,
      columns,
      headers,
      title,
      description
    ) VALUES (
      v_question_id,
      v_sub_question_id,
      v_template.rows,
      v_template.columns,
      v_template.headers,
      v_template.title,
      v_template.description
    )
    RETURNING id INTO v_new_template_id;

    -- Migrate all cells for this template
    FOR v_cell IN
      SELECT * FROM table_template_cells_import_review
      WHERE template_id = v_template.id
    LOOP
      INSERT INTO table_template_cells (
        template_id,
        row_index,
        col_index,
        cell_type,
        locked_value,
        expected_answer,
        marks,
        accepts_equivalent_phrasing,
        case_sensitive,
        alternative_answers
      ) VALUES (
        v_new_template_id,
        v_cell.row_index,
        v_cell.col_index,
        v_cell.cell_type,
        v_cell.locked_value,
        v_cell.expected_answer,
        v_cell.marks,
        v_cell.accepts_equivalent_phrasing,
        v_cell.case_sensitive,
        v_cell.alternative_answers
      );
    END LOOP;

    v_migrated_count := v_migrated_count + 1;
  END LOOP;

  -- Delete review templates (will cascade to cells)
  DELETE FROM table_templates_import_review
  WHERE review_session_id = p_review_session_id;

  -- Return result
  v_result := jsonb_build_object(
    'success', true,
    'migrated_count', v_migrated_count,
    'message', format('Successfully migrated %s template(s) to production', v_migrated_count)
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    v_result := jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to migrate templates to production'
    );
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments for documentation
COMMENT ON TABLE table_templates_import_review IS 'Stores table templates during import review phase before questions are finalized';
COMMENT ON TABLE table_template_cells_import_review IS 'Stores cell configurations for review-phase table templates';
COMMENT ON FUNCTION migrate_review_templates_to_production IS 'Migrates review templates to production tables when import is approved';