/*
  # Add cluster_tag columns to questions tables

  1. Changes
    - Add cluster_tag column to questions_master_admin table
    - Add cluster_tag column to sub_questions table
    - Add questions_mark_steps table for mark breakdown

  2. Security
    - Enable RLS on questions_mark_steps table
    - Add policies for authenticated users
*/

-- Add cluster_tag column to questions_master_admin
ALTER TABLE questions_master_admin
ADD COLUMN IF NOT EXISTS cluster_tag text;

-- Add cluster_tag column to sub_questions
ALTER TABLE sub_questions
ADD COLUMN IF NOT EXISTS cluster_tag text;

-- Create questions_mark_steps table if it doesn't exist
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

-- Enable RLS on questions_mark_steps
ALTER TABLE questions_mark_steps ENABLE ROW LEVEL SECURITY;

-- Add policies for authenticated users
CREATE POLICY "Allow full access to authenticated users on questions_mark_steps"
  ON questions_mark_steps
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_questions_mark_steps_question_id ON questions_mark_steps(question_id);
CREATE INDEX IF NOT EXISTS idx_questions_mark_steps_sub_question_id ON questions_mark_steps(sub_question_id);

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';