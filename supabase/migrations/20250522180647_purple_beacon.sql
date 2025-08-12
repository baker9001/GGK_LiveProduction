/*
  # Create data structures table

  1. New Tables
    - `data_structures`
      - `id` (uuid, primary key)
      - `region_id` (uuid, foreign key to regions)
      - `program_id` (uuid, foreign key to programs)
      - `provider_id` (uuid, foreign key to providers)
      - `subject_id` (uuid, foreign key to subjects)
      - `status` (text, required: 'active' or 'inactive')
      - `created_at` (timestamp)

  2. Foreign Keys
    - data_structures.region_id references regions(id)
    - data_structures.program_id references programs(id)
    - data_structures.provider_id references providers(id)
    - data_structures.subject_id references subjects(id)

  3. Security
    - Enable RLS
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS data_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid NOT NULL REFERENCES regions(id),
  program_id uuid NOT NULL REFERENCES programs(id),
  provider_id uuid NOT NULL REFERENCES providers(id),
  subject_id uuid NOT NULL REFERENCES subjects(id),
  status text NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(region_id, program_id, provider_id, subject_id)
);

ALTER TABLE data_structures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users on data_structures"
  ON data_structures
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_data_structures_region_id ON data_structures(region_id);
CREATE INDEX IF NOT EXISTS idx_data_structures_program_id ON data_structures(program_id);
CREATE INDEX IF NOT EXISTS idx_data_structures_provider_id ON data_structures(provider_id);
CREATE INDEX IF NOT EXISTS idx_data_structures_subject_id ON data_structures(subject_id);