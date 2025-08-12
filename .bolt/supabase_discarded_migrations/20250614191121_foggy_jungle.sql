/*
  # Create questions_attachments table

  1. New Table
    - `questions_attachments`
      - `id` (uuid, primary key)
      - `entity_type` (text, required: 'question' or 'sub-question')
      - `entity_id` (uuid, required)
      - `file_name` (text, required)
      - `file_size` (bigint, required)
      - `file_type` (text, required)
      - `file_url` (text, required)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create questions_attachments table
CREATE TABLE questions_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('question', 'sub-question')),
  entity_id uuid NOT NULL,
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

-- Add storage policies
CREATE POLICY "Allow authenticated users to manage questions attachments"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'questions-attachments')
WITH CHECK (bucket_id = 'questions-attachments');

-- Add indexes for better performance
CREATE INDEX idx_questions_attachments_entity_type ON questions_attachments(entity_type);
CREATE INDEX idx_questions_attachments_entity_id ON questions_attachments(entity_id);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';