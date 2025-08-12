/*
  # Create questions_attachments table

  1. New Tables
    - `questions_attachments`
      - `id` (uuid, primary key)
      - `question_id` (uuid, foreign key to questions)
      - `sub_question_id` (uuid, foreign key to sub_questions, optional)
      - `file_name` (text, required)
      - `file_size` (bigint, required)
      - `file_type` (text, required)
      - `file_url` (text, required)
      - `created_at` (timestamp)

  2. Foreign Keys
    - questions_attachments.question_id references questions(id) ON DELETE CASCADE
    - questions_attachments.sub_question_id references sub_questions(id) ON DELETE CASCADE

  3. Security
    - Enable RLS
    - Add policies for authenticated users
    - Create storage bucket for question attachments
*/

-- Create questions_attachments table
CREATE TABLE questions_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  sub_question_id uuid REFERENCES sub_questions(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  file_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE questions_attachments ENABLE ROW LEVEL SECURITY;

-- Add policies for authenticated users
CREATE POLICY "Allow full access to authenticated users on questions_attachments"
  ON questions_attachments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create storage bucket for question attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('questions-attachments', 'questions-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Add storage policies for authenticated users
CREATE POLICY "Allow authenticated users to read question attachments"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'questions-attachments');

CREATE POLICY "Allow authenticated users to insert question attachments"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'questions-attachments');

CREATE POLICY "Allow authenticated users to update question attachments"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'questions-attachments')
  WITH CHECK (bucket_id = 'questions-attachments');

CREATE POLICY "Allow authenticated users to delete question attachments"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'questions-attachments');

-- Add public access policy for question attachments
CREATE POLICY "Allow public to view question attachments"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'questions-attachments');

-- Add indexes for better performance
CREATE INDEX idx_questions_attachments_question_id ON questions_attachments(question_id);
CREATE INDEX idx_questions_attachments_sub_question_id ON questions_attachments(sub_question_id);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';