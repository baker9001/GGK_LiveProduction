/*
  # Add region_id, program_id, provider_id, subject_id columns to questions_master_admin table

  1. Changes
    - Add region_id column to questions_master_admin table
    - Add program_id column to questions_master_admin table
    - Add provider_id column to questions_master_admin table
    - Add subject_id column to questions_master_admin table
    - Populate these columns from data_structures table for existing records
    - Add NOT NULL constraints after data migration
    - Add foreign key constraints

  2. Security
    - Maintain existing RLS policies
*/

-- Add new columns if they don't exist
ALTER TABLE questions_master_admin
ADD COLUMN IF NOT EXISTS region_id uuid,
ADD COLUMN IF NOT EXISTS program_id uuid,
ADD COLUMN IF NOT EXISTS provider_id uuid,
ADD COLUMN IF NOT EXISTS subject_id uuid;

-- Populate the new columns from data_structures for existing records
UPDATE questions_master_admin q
SET 
  region_id = ds.region_id,
  program_id = ds.program_id,
  provider_id = ds.provider_id,
  subject_id = ds.subject_id
FROM data_structures ds
WHERE q.data_structure_id = ds.id;

-- Add NOT NULL constraints
ALTER TABLE questions_master_admin
ALTER COLUMN region_id SET NOT NULL,
ALTER COLUMN program_id SET NOT NULL,
ALTER COLUMN provider_id SET NOT NULL,
ALTER COLUMN subject_id SET NOT NULL;

-- Add foreign key constraints
ALTER TABLE questions_master_admin
ADD CONSTRAINT questions_master_admin_region_id_fkey
FOREIGN KEY (region_id) REFERENCES regions(id);

ALTER TABLE questions_master_admin
ADD CONSTRAINT questions_master_admin_program_id_fkey
FOREIGN KEY (program_id) REFERENCES programs(id);

ALTER TABLE questions_master_admin
ADD CONSTRAINT questions_master_admin_provider_id_fkey
FOREIGN KEY (provider_id) REFERENCES providers(id);

ALTER TABLE questions_master_admin
ADD CONSTRAINT questions_master_admin_subject_id_fkey
FOREIGN KEY (subject_id) REFERENCES subjects(id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_questions_master_admin_region_id ON questions_master_admin(region_id);
CREATE INDEX IF NOT EXISTS idx_questions_master_admin_program_id ON questions_master_admin(program_id);
CREATE INDEX IF NOT EXISTS idx_questions_master_admin_provider_id ON questions_master_admin(provider_id);
CREATE INDEX IF NOT EXISTS idx_questions_master_admin_subject_id ON questions_master_admin(subject_id);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';