/*
  # Create past_paper_import_sessions table

  1. New Tables
    - `past_paper_import_sessions`
      - `id` (uuid, primary key)
      - `uploader_id` (uuid, foreign key to admin_users)
      - `subject_id` (uuid, foreign key to subjects)
      - `year` (integer, required)
      - `exam_session` (text, required: May/June or Oct/Nov)
      - `paper_number` (text, required)
      - `variant_number` (text, required)
      - `region_id` (uuid, foreign key to regions)
      - `program_id` (uuid, foreign key to programs)
      - `provider_id` (uuid, foreign key to providers)
      - `data_structure_id` (uuid, foreign key to data_structures)
      - `paper_id` (uuid, foreign key to papers_setup, optional)
      - `question_paper_url` (text, required)
      - `mark_scheme_url` (text, required)
      - `status` (text, required: uploaded, processing, completed, failed)
      - `created_at` (timestamp)
      - `processed_at` (timestamp, optional)

  2. Foreign Keys
    - past_paper_import_sessions.uploader_id references admin_users(id)
    - past_paper_import_sessions.subject_id references subjects(id)
    - past_paper_import_sessions.region_id references regions(id)
    - past_paper_import_sessions.program_id references programs(id)
    - past_paper_import_sessions.provider_id references providers(id)
    - past_paper_import_sessions.data_structure_id references data_structures(id)
    - past_paper_import_sessions.paper_id references papers_setup(id)

  3. Security
    - Enable RLS
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

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';