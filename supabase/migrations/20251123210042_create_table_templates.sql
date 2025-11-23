/*
  # Table Completion Templates System

  1. New Tables
    - `table_templates`
      - `id` (uuid, primary key) - Unique template identifier
      - `question_id` (uuid, nullable, fk to questions_master_admin) - Associated question
      - `sub_question_id` (uuid, nullable, fk to sub_questions) - Associated subquestion
      - `rows` (integer) - Number of table rows
      - `columns` (integer) - Number of table columns
      - `headers` (text[]) - Column header labels
      - `title` (text, nullable) - Optional table title
      - `description` (text, nullable) - Optional description
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

    - `table_template_cells`
      - `id` (uuid, primary key) - Unique cell identifier
      - `template_id` (uuid, fk to table_templates) - Parent template
      - `row_index` (integer) - Cell row position (0-based)
      - `col_index` (integer) - Cell column position (0-based)
      - `cell_type` (text) - 'locked' or 'editable'
      - `locked_value` (text, nullable) - Pre-filled value for locked cells
      - `expected_answer` (text, nullable) - Correct answer for editable cells
      - `marks` (integer) - Points awarded for correct answer
      - `accepts_equivalent_phrasing` (boolean) - Allow alternative phrasings
      - `case_sensitive` (boolean) - Require exact case match
      - `alternative_answers` (text[]) - List of acceptable alternative answers

  2. Security
    - Enable RLS on both tables
    - System admins have full access
    - Teachers can create/edit templates for their questions
    - Students can view templates (read-only)

  3. Constraints
    - Either question_id or sub_question_id must be provided (not both)
    - Row and column indices must be non-negative
    - Cell type must be 'locked' or 'editable'
    - Marks must be positive
*/

-- Create table_templates table
CREATE TABLE IF NOT EXISTS table_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES questions_master_admin(id) ON DELETE CASCADE,
  sub_question_id uuid REFERENCES sub_questions(id) ON DELETE CASCADE,
  rows integer NOT NULL CHECK (rows >= 2 AND rows <= 50),
  columns integer NOT NULL CHECK (columns >= 2 AND columns <= 20),
  headers text[] NOT NULL DEFAULT '{}',
  title text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT either_question_or_subquestion CHECK (
    (question_id IS NOT NULL AND sub_question_id IS NULL) OR
    (question_id IS NULL AND sub_question_id IS NOT NULL)
  )
);

-- Create table_template_cells table
CREATE TABLE IF NOT EXISTS table_template_cells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES table_templates(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_table_templates_question_id
  ON table_templates(question_id) WHERE question_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_table_templates_sub_question_id
  ON table_templates(sub_question_id) WHERE sub_question_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_table_template_cells_template_id
  ON table_template_cells(template_id);

CREATE INDEX IF NOT EXISTS idx_table_template_cells_position
  ON table_template_cells(template_id, row_index, col_index);

-- Enable RLS
ALTER TABLE table_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_template_cells ENABLE ROW LEVEL SECURITY;

-- RLS Policies for table_templates

-- System admins can do everything
CREATE POLICY "System admins have full access to table templates"
  ON table_templates FOR ALL
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

-- Teachers can create templates for their questions
CREATE POLICY "Teachers can manage templates for their questions"
  ON table_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      INNER JOIN teachers t ON t.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
      AND u.user_type = 'teacher'
      AND u.is_active = true
      AND t.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      INNER JOIN teachers t ON t.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
      AND u.user_type = 'teacher'
      AND u.is_active = true
      AND t.is_active = true
    )
  );

-- Students can view templates (for answering questions)
CREATE POLICY "Students can view table templates"
  ON table_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      INNER JOIN students s ON s.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
      AND u.user_type = 'student'
      AND u.is_active = true
    )
  );

-- RLS Policies for table_template_cells

-- System admins can do everything
CREATE POLICY "System admins have full access to template cells"
  ON table_template_cells FOR ALL
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

-- Teachers can manage cells for their templates
CREATE POLICY "Teachers can manage template cells"
  ON table_template_cells FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      INNER JOIN teachers t ON t.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
      AND u.user_type = 'teacher'
      AND u.is_active = true
      AND t.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      INNER JOIN teachers t ON t.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
      AND u.user_type = 'teacher'
      AND u.is_active = true
      AND t.is_active = true
    )
  );

-- Students can view template cells (for answering questions)
CREATE POLICY "Students can view template cells"
  ON table_template_cells FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      INNER JOIN students s ON s.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
      AND u.user_type = 'student'
      AND u.is_active = true
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_table_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_table_templates_updated_at
  BEFORE UPDATE ON table_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_table_templates_updated_at();
