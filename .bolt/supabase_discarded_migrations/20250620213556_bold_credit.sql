/*
  # Add AI-related columns and tables

  1. New Tables
    - `questions_mark_steps`
      - `id` (uuid, primary key)
      - `question_id` (uuid, foreign key to questions_master_admin)
      - `sub_question_id` (uuid, foreign key to sub_questions)
      - `step_number` (integer)
      - `step_text` (text)
      - `marks` (integer)
      - `created_at` (timestamp)

    - `ai_audit_logs`
      - `id` (uuid, primary key)
      - `import_session_id` (uuid, foreign key to past_paper_import_sessions)
      - `question_id` (uuid, nullable, foreign key to questions_master_admin)
      - `sub_question_id` (uuid, nullable, foreign key to sub_questions)
      - `type` (text: 'hint', 'cluster', 'topic_mapping', 'mark_breakdown', 'diagram')
      - `input_text` (text)
      - `generated_output` (text)
      - `confidence_score` (float)
      - `created_at` (timestamp)

  2. New Columns
    - Add `cluster_tag` to questions_master_admin
    - Add `cluster_tag` to sub_questions
    - Add `confidence_score` to questions_master_admin
    - Add `confidence_score` to sub_questions
    - Add `metadata` JSONB to past_paper_import_sessions

  3. Security
    - Enable RLS on new tables
    - Add policies for authenticated users
*/

-- Add cluster_tag column to questions_master_admin
ALTER TABLE questions_master_admin
ADD COLUMN IF NOT EXISTS cluster_tag text;

-- Add confidence_score column to questions_master_admin
ALTER TABLE questions_master_admin
ADD COLUMN IF NOT EXISTS confidence_score float;

-- Add cluster_tag column to sub_questions
ALTER TABLE sub_questions
ADD COLUMN IF NOT EXISTS cluster_tag text;

-- Add confidence_score column to sub_questions
ALTER TABLE sub_questions
ADD COLUMN IF NOT EXISTS confidence_score float;

-- Add metadata JSONB column to past_paper_import_sessions
ALTER TABLE past_paper_import_sessions
ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Create questions_mark_steps table
CREATE TABLE IF NOT EXISTS questions_mark_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES questions_master_admin(id) ON DELETE CASCADE,
  sub_question_id uuid REFERENCES sub_questions(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  step_text text NOT NULL,
  marks integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  CHECK (
    (question_id IS NOT NULL AND sub_question_id IS NULL) OR
    (question_id IS NULL AND sub_question_id IS NOT NULL)
  )
);

-- Create ai_audit_logs table
CREATE TABLE IF NOT EXISTS ai_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_session_id uuid NOT NULL REFERENCES past_paper_import_sessions(id) ON DELETE CASCADE,
  question_id uuid REFERENCES questions_master_admin(id) ON DELETE SET NULL,
  sub_question_id uuid REFERENCES sub_questions(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('hint', 'cluster', 'topic_mapping', 'mark_breakdown', 'diagram')),
  input_text text NOT NULL,
  generated_output text NOT NULL,
  confidence_score float NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index on import_session_id for better performance
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_import_session_id ON ai_audit_logs(import_session_id);

-- Enable RLS on questions_mark_steps
ALTER TABLE questions_mark_steps ENABLE ROW LEVEL SECURITY;

-- Enable RLS on ai_audit_logs
ALTER TABLE ai_audit_logs ENABLE ROW LEVEL SECURITY;

-- Add policies for authenticated users
CREATE POLICY "Allow authenticated users to read questions_mark_steps"
  ON questions_mark_steps
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert questions_mark_steps"
  ON questions_mark_steps
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read ai_audit_logs"
  ON ai_audit_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert ai_audit_logs"
  ON ai_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);