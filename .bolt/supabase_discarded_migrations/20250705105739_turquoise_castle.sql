/*
  # Fix data_structures foreign key constraints

  1. Changes
    - Drop existing foreign key constraints for region_id, program_id, provider_id, and subject_id
    - Re-add foreign key constraints with proper references and explicit names
    - Force schema cache refresh to update PostgREST's internal cache

  2. Reason
    - The database schema cache does not recognize the relationships between tables
    - This prevents the application from correctly querying related data
    - Re-creating the constraints and refreshing the schema cache resolves the issue
*/

-- Drop existing foreign key constraints
ALTER TABLE data_structures DROP CONSTRAINT IF EXISTS data_structures_region_id_fkey;
ALTER TABLE data_structures DROP CONSTRAINT IF EXISTS fk_data_structures_region;
ALTER TABLE data_structures DROP CONSTRAINT IF EXISTS data_structures_program_id_fkey;
ALTER TABLE data_structures DROP CONSTRAINT IF EXISTS data_structures_provider_id_fkey;
ALTER TABLE data_structures DROP CONSTRAINT IF EXISTS data_structures_subject_id_fkey;
ALTER TABLE data_structures DROP CONSTRAINT IF EXISTS data_structures_edu_subject_id_fkey;

-- Re-add foreign key constraints with explicit names
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