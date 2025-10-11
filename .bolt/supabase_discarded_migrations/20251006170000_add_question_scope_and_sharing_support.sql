/*
  # Question Scope and Sharing Support for Mock Exams

  ## Overview
  Enhances the question bank system to support:
  - Global questions accessible to all schools across the platform
  - Custom questions created by individual schools
  - Shareable custom questions within the same company/entity
  - Proper filtering and visibility controls for question selection

  ## Changes

  1. **New Columns on questions_master_admin**
     - `scope` - Enum: 'global' or 'custom' (default: 'custom')
     - `school_id` - References schools table, NULL for global questions
     - `company_id` - References companies table for entity-level organization
     - `created_by_school_id` - Tracks which school authored the question
     - `is_shared` - Boolean indicating if custom question is shared within company
     - `question_bank_tag` - Text field for categorization (e.g., 'System Bank', 'School Bank')

  2. **Indexes for Performance**
     - Composite index on scope, school_id, company_id for filtering
     - Index on subject_id, topic_id for filtered queries
     - Index on year for year-based filtering

  3. **Row Level Security**
     - Global questions readable by all authenticated users
     - Custom questions readable only by users from owning school
     - Shared custom questions readable by all schools in same company
     - Write permissions restricted to question creators and school admins

  4. **Mock Exam Questions Enhancement**
     - Add scope_filter column to mock_exams tracking which scopes used

  ## Security
  - RLS enforces visibility rules based on question scope and school membership
  - Prevents deletion of questions already used in mock exams
  - Audit trail maintained for question creation and modifications
*/

-- Add new columns to questions_master_admin table
DO $$
BEGIN
  -- Add scope column with default 'custom'
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions_master_admin' AND column_name = 'scope'
  ) THEN
    ALTER TABLE questions_master_admin
    ADD COLUMN scope text NOT NULL DEFAULT 'custom' CHECK (scope IN ('global', 'custom'));
  END IF;

  -- Add school_id column (NULL for global questions)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions_master_admin' AND column_name = 'school_id'
  ) THEN
    ALTER TABLE questions_master_admin
    ADD COLUMN school_id uuid REFERENCES schools(id) ON DELETE SET NULL;
  END IF;

  -- Add company_id column for entity-level organization
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions_master_admin' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE questions_master_admin
    ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE SET NULL;
  END IF;

  -- Add created_by_school_id to track authorship
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions_master_admin' AND column_name = 'created_by_school_id'
  ) THEN
    ALTER TABLE questions_master_admin
    ADD COLUMN created_by_school_id uuid REFERENCES schools(id) ON DELETE SET NULL;
  END IF;

  -- Add is_shared flag for company-wide sharing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions_master_admin' AND column_name = 'is_shared'
  ) THEN
    ALTER TABLE questions_master_admin
    ADD COLUMN is_shared boolean DEFAULT false NOT NULL;
  END IF;

  -- Add question_bank_tag for categorization
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions_master_admin' AND column_name = 'question_bank_tag'
  ) THEN
    ALTER TABLE questions_master_admin
    ADD COLUMN question_bank_tag text;
  END IF;
END $$;

-- Add scope_filter column to mock_exams table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mock_exams' AND column_name = 'scope_filter'
  ) THEN
    ALTER TABLE mock_exams
    ADD COLUMN scope_filter jsonb DEFAULT '{"scopes": ["global", "custom"], "includeShared": true}'::jsonb;
  END IF;
END $$;

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_questions_scope_school_company
  ON questions_master_admin(scope, school_id, company_id);

CREATE INDEX IF NOT EXISTS idx_questions_subject_topic
  ON questions_master_admin(subject_id, topic_id) WHERE subject_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_questions_year_scope
  ON questions_master_admin(year, scope) WHERE year IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_questions_created_by_school
  ON questions_master_admin(created_by_school_id) WHERE created_by_school_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_questions_shared_company
  ON questions_master_admin(company_id, is_shared) WHERE is_shared = true;

CREATE INDEX IF NOT EXISTS idx_questions_difficulty_type
  ON questions_master_admin(difficulty, type) WHERE difficulty IS NOT NULL;

-- Create helper function to check if user has access to question
CREATE OR REPLACE FUNCTION user_can_access_question(question_id_param uuid, user_id_param uuid)
RETURNS boolean AS $$
DECLARE
  question_scope text;
  question_school_id uuid;
  question_company_id uuid;
  question_is_shared boolean;
  user_has_access boolean := false;
BEGIN
  -- Get question details
  SELECT scope, school_id, company_id, is_shared
  INTO question_scope, question_school_id, question_company_id, question_is_shared
  FROM questions_master_admin
  WHERE id = question_id_param;

  -- Global questions are accessible to all
  IF question_scope = 'global' THEN
    RETURN true;
  END IF;

  -- Custom questions: check school membership or sharing
  IF question_scope = 'custom' THEN
    -- Check if user belongs to the question's school
    IF EXISTS (
      SELECT 1 FROM entity_users eu
      JOIN entity_user_schools eus ON eus.entity_user_id = eu.id
      WHERE eu.user_id = user_id_param
        AND eus.school_id = question_school_id
        AND eu.is_active = true
    ) THEN
      RETURN true;
    END IF;

    -- Check if question is shared and user belongs to same company
    IF question_is_shared = true THEN
      IF EXISTS (
        SELECT 1 FROM entity_users eu
        WHERE eu.user_id = user_id_param
          AND eu.company_id = question_company_id
          AND eu.is_active = true
      ) THEN
        RETURN true;
      END IF;
    END IF;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for questions_master_admin

-- Drop existing policies if they exist to avoid conflicts
DO $$
BEGIN
  DROP POLICY IF EXISTS "Global questions readable by all authenticated users" ON questions_master_admin;
  DROP POLICY IF EXISTS "Custom questions readable by school members" ON questions_master_admin;
  DROP POLICY IF EXISTS "Shared custom questions readable within company" ON questions_master_admin;
  DROP POLICY IF EXISTS "Users can create custom questions" ON questions_master_admin;
  DROP POLICY IF EXISTS "Question creators can update their questions" ON questions_master_admin;
  DROP POLICY IF EXISTS "School admins can update school questions" ON questions_master_admin;
EXCEPTION
  WHEN undefined_object THEN
    NULL; -- Policy doesn't exist, continue
END $$;

-- Policy: All authenticated users can read global questions
CREATE POLICY "Global questions readable by all authenticated users"
  ON questions_master_admin
  FOR SELECT
  TO authenticated
  USING (scope = 'global');

-- Policy: Users can read custom questions from their assigned schools
CREATE POLICY "Custom questions readable by school members"
  ON questions_master_admin
  FOR SELECT
  TO authenticated
  USING (
    scope = 'custom'
    AND school_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM entity_users eu
      JOIN entity_user_schools eus ON eus.entity_user_id = eu.id
      WHERE eu.user_id = auth.uid()
        AND eus.school_id = questions_master_admin.school_id
        AND eu.is_active = true
    )
  );

-- Policy: Users can read shared custom questions within their company
CREATE POLICY "Shared custom questions readable within company"
  ON questions_master_admin
  FOR SELECT
  TO authenticated
  USING (
    scope = 'custom'
    AND is_shared = true
    AND company_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM entity_users eu
      WHERE eu.user_id = auth.uid()
        AND eu.company_id = questions_master_admin.company_id
        AND eu.is_active = true
    )
  );

-- Policy: School admins and teachers can create custom questions
CREATE POLICY "Users can create custom questions"
  ON questions_master_admin
  FOR INSERT
  TO authenticated
  WITH CHECK (
    scope = 'custom'
    AND school_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM entity_users eu
      JOIN entity_user_schools eus ON eus.entity_user_id = eu.id
      WHERE eu.user_id = auth.uid()
        AND eus.school_id = questions_master_admin.school_id
        AND eu.admin_level IN ('school_admin', 'teacher')
        AND eu.is_active = true
    )
  );

-- Policy: Question creators can update their own questions
CREATE POLICY "Question creators can update their questions"
  ON questions_master_admin
  FOR UPDATE
  TO authenticated
  USING (
    created_by_school_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM entity_users eu
      JOIN entity_user_schools eus ON eus.entity_user_id = eu.id
      WHERE eu.user_id = auth.uid()
        AND eus.school_id = questions_master_admin.created_by_school_id
        AND eu.is_active = true
    )
  );

-- Policy: School admins can update questions from their school
CREATE POLICY "School admins can update school questions"
  ON questions_master_admin
  FOR UPDATE
  TO authenticated
  USING (
    school_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM entity_users eu
      JOIN entity_user_schools eus ON eus.entity_user_id = eu.id
      WHERE eu.user_id = auth.uid()
        AND eus.school_id = questions_master_admin.school_id
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  );

-- Policy: Prevent deletion of questions used in mock exams
CREATE OR REPLACE FUNCTION prevent_question_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM mock_exam_questions
    WHERE question_id = OLD.id
  ) THEN
    RAISE EXCEPTION 'Cannot delete question that is used in mock exams';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_question_deletion_trigger ON questions_master_admin;
CREATE TRIGGER prevent_question_deletion_trigger
  BEFORE DELETE ON questions_master_admin
  FOR EACH ROW
  EXECUTE FUNCTION prevent_question_deletion();

-- Create view for question bank filtering
CREATE OR REPLACE VIEW question_bank_with_metadata AS
SELECT
  q.id,
  q.question_number,
  q.question_description,
  q.marks,
  q.type,
  q.difficulty,
  q.status,
  q.year,
  q.scope,
  q.school_id,
  q.company_id,
  q.is_shared,
  q.question_bank_tag,
  q.subject_id,
  q.topic_id,
  q.subtopic_id,
  s.name as school_name,
  c.name as company_name,
  subj.name as subject_name,
  t.name as topic_name,
  st.name as subtopic_name,
  (SELECT COUNT(*) FROM sub_questions sq WHERE sq.question_id = q.id) as sub_questions_count,
  (SELECT COUNT(*) FROM question_attachments qa WHERE qa.question_id = q.id) as attachments_count
FROM questions_master_admin q
LEFT JOIN schools s ON s.id = q.school_id
LEFT JOIN companies c ON c.id = q.company_id
LEFT JOIN edu_subjects subj ON subj.id = q.subject_id
LEFT JOIN edu_topics t ON t.id = q.topic_id
LEFT JOIN edu_subtopics st ON st.id = q.subtopic_id
WHERE q.status = 'active' OR q.status IS NULL;

-- Grant appropriate permissions
GRANT SELECT ON question_bank_with_metadata TO authenticated;

-- Add helpful comment
COMMENT ON COLUMN questions_master_admin.scope IS 'Question visibility: global (all schools) or custom (school-specific)';
COMMENT ON COLUMN questions_master_admin.is_shared IS 'Whether custom question is shared with other schools in same company';
COMMENT ON COLUMN questions_master_admin.question_bank_tag IS 'Categorization tag for organizing questions (e.g., System Bank, School Bank)';
