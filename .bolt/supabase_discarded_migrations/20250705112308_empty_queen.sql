/*
  # Fix data_structures foreign key constraints

  1. Changes
    - Drop all existing foreign key constraints on data_structures table
    - Re-add constraints with standardized names:
      - data_structures_region_id_fkey
      - data_structures_program_id_fkey
      - data_structures_provider_id_fkey
      - data_structures_subject_id_fkey
    - Force schema cache refresh multiple times

  2. Security
    - No changes to RLS policies needed
*/

-- Drop all existing foreign key constraints
ALTER TABLE data_structures DROP CONSTRAINT IF EXISTS data_structures_region_id_fkey;
ALTER TABLE data_structures DROP CONSTRAINT IF EXISTS fk_data_structures_region;
ALTER TABLE data_structures DROP CONSTRAINT IF EXISTS data_structures_program_id_fkey;
ALTER TABLE data_structures DROP CONSTRAINT IF EXISTS data_structures_provider_id_fkey;
ALTER TABLE data_structures DROP CONSTRAINT IF EXISTS data_structures_subject_id_fkey;
ALTER TABLE data_structures DROP CONSTRAINT IF EXISTS data_structures_edu_subject_id_fkey;

-- Re-add foreign key constraints with standardized names
ALTER TABLE data_structures
ADD CONSTRAINT data_structures_region_id_fkey
FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE CASCADE;

ALTER TABLE data_structures
ADD CONSTRAINT data_structures_program_id_fkey
FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;

ALTER TABLE data_structures
ADD CONSTRAINT data_structures_provider_id_fkey
FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE;

ALTER TABLE data_structures
ADD CONSTRAINT data_structures_subject_id_fkey
FOREIGN KEY (subject_id) REFERENCES edu_subjects(id) ON DELETE CASCADE;

-- Force multiple schema cache refreshes to ensure PostgREST picks up changes
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(0.1);
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(0.1);
NOTIFY pgrst, 'reload schema';

-- Verify constraints are correctly set up
DO $$
DECLARE
  region_constraint_exists BOOLEAN;
  program_constraint_exists BOOLEAN;
  provider_constraint_exists BOOLEAN;
  subject_constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'data_structures_region_id_fkey'
    AND table_name = 'data_structures'
  ) INTO region_constraint_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'data_structures_program_id_fkey'
    AND table_name = 'data_structures'
  ) INTO program_constraint_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'data_structures_provider_id_fkey'
    AND table_name = 'data_structures'
  ) INTO provider_constraint_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'data_structures_subject_id_fkey'
    AND table_name = 'data_structures'
  ) INTO subject_constraint_exists;
  
  IF region_constraint_exists AND program_constraint_exists AND provider_constraint_exists AND subject_constraint_exists THEN
    RAISE NOTICE 'All foreign key constraints successfully created';
  ELSE
    RAISE WARNING 'Some constraints are missing: region=%, program=%, provider=%, subject=%', 
      region_constraint_exists, program_constraint_exists, provider_constraint_exists, subject_constraint_exists;
  END IF;
END $$;