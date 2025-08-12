/*
  # Create papers_setup table

  1. New Tables
    - `papers_setup`
      - `id` (uuid, primary key)
      - `subject_code` (text, auto-filled from selected subject)
      - `paper_number` (text, required)
      - `variant_number` (text, required)
      - `exam_session` (text, required: May/June or Oct/Nov)
      - `exam_year` (integer, required)
      - `paper_code` (text, auto-generated, unique)
      - `data_structure_id` (uuid, foreign key to data_structures)
      - `region_id` (uuid, foreign key to regions)
      - `program_id` (uuid, foreign key to programs)
      - `provider_id` (uuid, foreign key to providers)
      - `subject_id` (uuid, foreign key to subjects)
      - `status` (text, required: active/inactive)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Foreign Keys
    - papers_setup.data_structure_id references data_structures(id)
    - papers_setup.region_id references regions(id)
    - papers_setup.program_id references programs(id)
    - papers_setup.provider_id references providers(id)
    - papers_setup.subject_id references subjects(id)

  3. Security
    - Enable RLS
    - Add policies for authenticated users
*/

CREATE TABLE papers_setup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_code text NOT NULL,
  paper_number text NOT NULL,
  variant_number text NOT NULL,
  exam_session text NOT NULL CHECK (exam_session IN ('May/June', 'Oct/Nov')),
  exam_year integer NOT NULL CHECK (exam_year >= 2000 AND exam_year <= 2050),
  paper_code text NOT NULL UNIQUE,
  data_structure_id uuid NOT NULL REFERENCES data_structures(id),
  region_id uuid NOT NULL REFERENCES regions(id),
  program_id uuid NOT NULL REFERENCES programs(id),
  provider_id uuid NOT NULL REFERENCES providers(id),
  subject_id uuid NOT NULL REFERENCES subjects(id),
  status text NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE papers_setup ENABLE ROW LEVEL SECURITY;

-- Add policies for authenticated users
CREATE POLICY "Allow full access to authenticated users on papers_setup"
  ON papers_setup
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX idx_papers_setup_data_structure_id ON papers_setup(data_structure_id);
CREATE INDEX idx_papers_setup_region_id ON papers_setup(region_id);
CREATE INDEX idx_papers_setup_program_id ON papers_setup(program_id);
CREATE INDEX idx_papers_setup_provider_id ON papers_setup(provider_id);
CREATE INDEX idx_papers_setup_subject_id ON papers_setup(subject_id);
CREATE INDEX idx_papers_setup_paper_code ON papers_setup(paper_code);
CREATE INDEX idx_papers_setup_exam_session ON papers_setup(exam_session);
CREATE INDEX idx_papers_setup_exam_year ON papers_setup(exam_year);
CREATE INDEX idx_papers_setup_status ON papers_setup(status);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_papers_setup_updated_at 
    BEFORE UPDATE ON papers_setup 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';