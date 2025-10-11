/*
  # Mock exam status wizard support

  ## Overview
  - Store per-stage completion metadata for mock exams
  - Capture instructions prepared for different audiences
  - Link mock exams to curated question selections or bespoke questions

  ## Tables
  - `mock_exam_stage_progress`
  - `mock_exam_instructions`
  - `mock_exam_questions`
*/

-- Stage progress table
CREATE TABLE IF NOT EXISTS mock_exam_stage_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_exam_id uuid NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN (
    'draft',
    'planned',
    'scheduled',
    'materials_ready',
    'in_progress',
    'grading',
    'moderation',
    'analytics_released',
    'completed',
    'cancelled'
  )),
  requirements jsonb DEFAULT '{}'::jsonb,
  completed boolean DEFAULT false NOT NULL,
  completed_at timestamptz,
  completed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(mock_exam_id, stage)
);

CREATE INDEX IF NOT EXISTS idx_mock_exam_stage_progress_exam_stage
  ON mock_exam_stage_progress(mock_exam_id, stage);

ALTER TABLE mock_exam_stage_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access stage progress for authorised users"
  ON mock_exam_stage_progress
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mock_exams me
      WHERE me.id = mock_exam_stage_progress.mock_exam_id
        AND me.company_id IN (
          SELECT company_id FROM entity_users
          WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Modify stage progress for authorised users"
  ON mock_exam_stage_progress
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mock_exams me
      WHERE me.id = mock_exam_stage_progress.mock_exam_id
        AND me.company_id IN (
          SELECT company_id FROM entity_users
          WHERE user_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mock_exams me
      WHERE me.id = mock_exam_stage_progress.mock_exam_id
        AND me.company_id IN (
          SELECT company_id FROM entity_users
          WHERE user_id = auth.uid()
        )
    )
  );

-- Instructions table
CREATE TABLE IF NOT EXISTS mock_exam_instructions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_exam_id uuid NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
  audience text NOT NULL CHECK (audience IN (
    'students',
    'invigilators',
    'markers',
    'teachers',
    'admins',
    'other'
  )),
  instructions text NOT NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mock_exam_instructions_exam
  ON mock_exam_instructions(mock_exam_id);

ALTER TABLE mock_exam_instructions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access instructions for authorised users"
  ON mock_exam_instructions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mock_exams me
      WHERE me.id = mock_exam_instructions.mock_exam_id
        AND me.company_id IN (
          SELECT company_id FROM entity_users
          WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Modify instructions for authorised users"
  ON mock_exam_instructions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mock_exams me
      WHERE me.id = mock_exam_instructions.mock_exam_id
        AND me.company_id IN (
          SELECT company_id FROM entity_users
          WHERE user_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mock_exams me
      WHERE me.id = mock_exam_instructions.mock_exam_id
        AND me.company_id IN (
          SELECT company_id FROM entity_users
          WHERE user_id = auth.uid()
        )
    )
  );

CREATE TRIGGER update_mock_exam_instructions_updated_at
  BEFORE UPDATE ON mock_exam_instructions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Question selections table
CREATE TABLE IF NOT EXISTS mock_exam_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_exam_id uuid NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('bank', 'custom')),
  question_id uuid REFERENCES questions_master_admin(id) ON DELETE SET NULL,
  custom_question jsonb,
  marks numeric(6,2),
  sequence integer DEFAULT 1 NOT NULL,
  is_optional boolean DEFAULT false NOT NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CHECK (
    (source_type = 'bank' AND question_id IS NOT NULL AND custom_question IS NULL) OR
    (source_type = 'custom' AND custom_question IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_mock_exam_questions_exam
  ON mock_exam_questions(mock_exam_id, sequence);

CREATE INDEX IF NOT EXISTS idx_mock_exam_questions_question
  ON mock_exam_questions(question_id)
  WHERE question_id IS NOT NULL;

ALTER TABLE mock_exam_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access exam questions for authorised users"
  ON mock_exam_questions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mock_exams me
      WHERE me.id = mock_exam_questions.mock_exam_id
        AND me.company_id IN (
          SELECT company_id FROM entity_users
          WHERE user_id = auth.uid()
        )
    )
  );

CREATE POLICY "Modify exam questions for authorised users"
  ON mock_exam_questions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM mock_exams me
      WHERE me.id = mock_exam_questions.mock_exam_id
        AND me.company_id IN (
          SELECT company_id FROM entity_users
          WHERE user_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM mock_exams me
      WHERE me.id = mock_exam_questions.mock_exam_id
        AND me.company_id IN (
          SELECT company_id FROM entity_users
          WHERE user_id = auth.uid()
        )
    )
  );

CREATE TRIGGER update_mock_exam_questions_updated_at
  BEFORE UPDATE ON mock_exam_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
