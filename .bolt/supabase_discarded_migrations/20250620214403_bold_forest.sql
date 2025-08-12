/*
  # Add AI-enhanced importer tables and fields

  1. New Tables
    - `ai_audit_logs`
      - `id` (uuid, primary key)
      - `import_session_id` (uuid, foreign key to past_paper_import_sessions)
      - `question_id` (uuid, nullable, foreign key to questions_master_admin)
      - `sub_question_id` (uuid, nullable, foreign key to sub_questions)
      - `type` (text, enum: 'hint', 'cluster', 'topic_mapping', 'mark_breakdown', 'diagram')
      - `input_text` (text)
      - `generated_output` (text)
      - `confidence_score` (float)
      - `created_at` (timestamp)

    - `questions_mark_steps`
      - `id` (uuid, primary key)
      - `question_id` (uuid, nullable, foreign key to questions_master_admin)
      - `sub_question_id` (uuid, nullable, foreign key to sub_questions)
      - `step_number` (integer)
      - `step_text` (text)
      - `marks` (integer)
      - `created_at` (timestamp)

  2. Modify Existing Tables
    - Add to `questions_master_admin`:
      - `cluster_tag` (text, nullable)
      - `confidence_score` (float, nullable)
    
    - Add to `sub_questions`:
      - `cluster_tag` (text, nullable)
      - `confidence_score` (float, nullable)
    
    - Add to `past_paper_import_sessions`:
      - `metadata` (jsonb, nullable)

  3. Security
    - Enable RLS on new tables
    - Add policies for authenticated users
*/

-- Create AI audit logs table
CREATE TABLE IF NOT EXISTS ai_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_session_id uuid REFERENCES past_paper_import_sessions(id) ON DELETE CASCADE,
  question_id uuid REFERENCES questions_master_admin(id) ON DELETE CASCADE,
  sub_question_id uuid REFERENCES sub_questions(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('hint', 'cluster', 'topic_mapping', 'mark_breakdown', 'diagram')),
  input_text text NOT NULL,
  generated_output text NOT NULL,
  confidence_score float NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index on import_session_id for better performance
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_import_session_id ON ai_audit_logs(import_session_id);

-- Create questions mark steps table
CREATE TABLE IF NOT EXISTS questions_mark_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES questions_master_admin(id) ON DELETE CASCADE,
  sub_question_id uuid REFERENCES sub_questions(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  step_text text NOT NULL,
  marks integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  CHECK ((question_id IS NOT NULL AND sub_question_id IS NULL) OR (question_id IS NULL AND sub_question_id IS NOT NULL))
);

-- Add cluster_tag and confidence_score to questions_master_admin
ALTER TABLE questions_master_admin
ADD COLUMN IF NOT EXISTS cluster_tag text,
ADD COLUMN IF NOT EXISTS confidence_score float;

-- Add cluster_tag and confidence_score to sub_questions
ALTER TABLE sub_questions
ADD COLUMN IF NOT EXISTS cluster_tag text,
ADD COLUMN IF NOT EXISTS confidence_score float;

-- Add metadata to past_paper_import_sessions
ALTER TABLE past_paper_import_sessions
ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Enable RLS on new tables
ALTER TABLE ai_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions_mark_steps ENABLE ROW LEVEL SECURITY;

-- Add policies for authenticated users
CREATE POLICY "Allow authenticated users to read AI audit logs"
  ON ai_audit_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert AI audit logs"
  ON ai_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read mark steps"
  ON questions_mark_steps
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert mark steps"
  ON questions_mark_steps
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update mark steps"
  ON questions_mark_steps
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';