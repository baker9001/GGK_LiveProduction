/*
  # Create past paper import tables and storage

  1. New Tables
    - `past_paper_import_sessions`
      - `id` (uuid, primary key)
      - `uploader_id` (uuid, foreign key to admin_users)
      - `subject_id` (uuid, foreign key to subjects)
      - `year` (integer)
      - `exam_session` (text: May/June or Oct/Nov)
      - `paper_number` (text)
      - `variant_number` (text)
      - `region_id` (uuid, foreign key to regions)
      - `program_id` (uuid, foreign key to programs)
      - `provider_id` (uuid, foreign key to providers)
      - `data_structure_id` (uuid, foreign key to data_structures)
      - `paper_id` (uuid, foreign key to papers_setup, optional)
      - `question_paper_url` (text)
      - `mark_scheme_url` (text)
      - `status` (text: uploaded, processing, completed, failed)
      - `created_at` (timestamp)
      - `processed_at` (timestamp, optional)

  2. Storage
    - Create past_paper_imports bucket
    - Add RLS policies for authenticated users

  3. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create past_paper_import_sessions table
CREATE TABLE past_paper_import_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploader_id uuid NOT NULL REFERENCES admin_users(id),
  subject_id uuid NOT NULL REFERENCES subjects(id),
  year integer NOT NULL CHECK (year >= 2000 AND year <= 2050),
  exam_session text NOT NULL CHECK (exam_session IN ('May/June', 'Oct/Nov')),
  paper_number text NOT NULL,
  variant_number text NOT NULL,
  region_id uuid NOT NULL REFERENCES regions(id),
  program_id uuid NOT NULL REFERENCES programs(id),
  provider_id uuid NOT NULL REFERENCES providers(id),
  data_structure_id uuid NOT NULL REFERENCES data_structures(id),
  paper_id uuid REFERENCES papers_setup(id),
  question_paper_url text NOT NULL,
  mark_scheme_url text NOT NULL,
  status text NOT NULL CHECK (status IN ('uploaded', 'processing', 'completed', 'failed')),
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Enable RLS
ALTER TABLE past_paper_import_sessions ENABLE ROW LEVEL SECURITY;

-- Add policies for authenticated users
CREATE POLICY "Allow full access to authenticated users on past_paper_import_sessions"
  ON past_paper_import_sessions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create storage bucket for past paper imports
INSERT INTO storage.buckets (id, name, public)
VALUES ('past_paper_imports', 'past_paper_imports', true)
ON CONFLICT (id) DO NOTHING;

-- Add storage policies
CREATE POLICY "Allow authenticated users to manage past paper imports"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'past_paper_imports')
WITH CHECK (bucket_id = 'past_paper_imports');

-- Add indexes for better performance
CREATE INDEX idx_past_paper_import_sessions_uploader_id ON past_paper_import_sessions(uploader_id);
CREATE INDEX idx_past_paper_import_sessions_subject_id ON past_paper_import_sessions(subject_id);
CREATE INDEX idx_past_paper_import_sessions_data_structure_id ON past_paper_import_sessions(data_structure_id);
CREATE INDEX idx_past_paper_import_sessions_paper_id ON past_paper_import_sessions(paper_id);
CREATE INDEX idx_past_paper_import_sessions_status ON past_paper_import_sessions(status);

-- Create storage bucket for extracted diagrams
INSERT INTO storage.buckets (id, name, public)
VALUES ('questions_diagrams', 'questions_diagrams', true)
ON CONFLICT (id) DO NOTHING;

-- Add storage policies for questions_diagrams
CREATE POLICY "Allow authenticated users to manage questions diagrams"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'questions_diagrams')
WITH CHECK (bucket_id = 'questions_diagrams');

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';