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

CREATE TRIGGER update_mock_exam_instructions_updated_at
  BEFORE UPDATE ON mock_exam_instructions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Questions table
CREATE TABLE IF NOT EXISTS mock_exam_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_exam_id uuid NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('bank', 'custom')),
  question_id uuid REFERENCES questions_master_admin(id) ON DELETE SET NULL,
  custom_question jsonb,
  marks numeric,
  sequence integer NOT NULL,
  is_optional boolean DEFAULT false NOT NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(mock_exam_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_mock_exam_questions_exam_sequence
  ON mock_exam_questions(mock_exam_id, sequence);

CREATE INDEX IF NOT EXISTS idx_mock_exam_questions_question_id
  ON mock_exam_questions(question_id) WHERE question_id IS NOT NULL;

ALTER TABLE mock_exam_questions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_mock_exam_questions_updated_at
  BEFORE UPDATE ON mock_exam_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
