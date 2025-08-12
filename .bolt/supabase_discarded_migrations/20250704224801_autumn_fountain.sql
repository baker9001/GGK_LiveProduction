/*
  # Fix data_structures foreign key relationships

  1. Changes
    - Ensure data_structures table exists with proper structure
    - Drop and recreate foreign key constraints for program_id and provider_id
    - Add missing foreign key for edu_subject_id if needed
    - Force multiple schema cache refreshes to ensure PostgREST recognizes relationships

  2. Security
    - Maintain existing RLS policies
    - Preserve all existing data
*/

-- Ensure the data_structures table has the correct structure
DO $$
BEGIN
  -- Check if program_id column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'data_structures' AND column_name = 'program_id'
  ) THEN
    ALTER TABLE data_structures ADD COLUMN program_id uuid;
  END IF;

  -- Check if provider_id column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'data_structures' AND column_name = 'provider_id'
  ) THEN
    ALTER TABLE data_structures ADD COLUMN provider_id uuid;
  END IF;

  -- Check if edu_subject_id column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'data_structures' AND column_name = 'edu_subject_id'
  ) THEN
    ALTER TABLE data_structures ADD COLUMN edu_subject_id uuid;
  END IF;
END $$;

-- Drop all existing foreign key constraints to start fresh
ALTER TABLE data_structures DROP CONSTRAINT IF EXISTS data_structures_program_id_fkey;
ALTER TABLE data_structures DROP CONSTRAINT IF EXISTS data_structures_provider_id_fkey;
ALTER TABLE data_structures DROP CONSTRAINT IF EXISTS data_structures_edu_subject_id_fkey;
ALTER TABLE data_structures DROP CONSTRAINT IF EXISTS data_structures_region_id_fkey;

-- Ensure referenced tables exist and have proper primary keys
DO $$
BEGIN
  -- Verify programs table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'programs') THEN
    RAISE EXCEPTION 'programs table does not exist';
  END IF;

  -- Verify providers table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'providers') THEN
    RAISE EXCEPTION 'providers table does not exist';
  END IF;

  -- Verify edu_subjects table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'edu_subjects') THEN
    RAISE EXCEPTION 'edu_subjects table does not exist';
  END IF;

  -- Verify regions table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'regions') THEN
    RAISE EXCEPTION 'regions table does not exist';
  END IF;
END $$;

-- Re-add foreign key constraints with explicit names
ALTER TABLE data_structures
ADD CONSTRAINT data_structures_program_id_fkey
FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;

ALTER TABLE data_structures
ADD CONSTRAINT data_structures_provider_id_fkey
FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE;

ALTER TABLE data_structures
ADD CONSTRAINT data_structures_edu_subject_id_fkey
FOREIGN KEY (edu_subject_id) REFERENCES edu_subjects(id) ON DELETE CASCADE;

ALTER TABLE data_structures
ADD CONSTRAINT data_structures_region_id_fkey
FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE CASCADE;

-- Force schema cache refresh multiple times to ensure PostgREST picks up changes
NOTIFY pgrst, 'reload schema';

-- Wait a moment and notify again
SELECT pg_sleep(0.1);
NOTIFY pgrst, 'reload schema';

-- Create a function to verify relationships are working
CREATE OR REPLACE FUNCTION verify_data_structures_relationships()
RETURNS boolean AS $$
BEGIN
  -- Test if we can query with joins
  PERFORM 1 FROM data_structures ds
  LEFT JOIN programs p ON ds.program_id = p.id
  LEFT JOIN providers pr ON ds.provider_id = pr.id
  LEFT JOIN edu_subjects es ON ds.edu_subject_id = es.id
  LEFT JOIN regions r ON ds.region_id = r.id
  LIMIT 1;
  
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Test the relationships
SELECT verify_data_structures_relationships() as relationships_working;

-- Final schema cache refresh
NOTIFY pgrst, 'reload schema';