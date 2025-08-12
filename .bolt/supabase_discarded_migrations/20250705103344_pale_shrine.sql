/*
  # Fix data_structures regions foreign key ambiguity

  1. Changes
    - Drop all existing foreign key constraints between data_structures.region_id and regions.id
    - Add back only one properly named constraint: data_structures_region_id_fkey
    - Force schema cache refresh for PostgREST

  2. Security
    - Maintain existing RLS policies
    - Preserve all existing data
*/

-- Drop all existing foreign key constraints between data_structures and regions
ALTER TABLE data_structures DROP CONSTRAINT IF EXISTS fk_data_structures_region;
ALTER TABLE data_structures DROP CONSTRAINT IF EXISTS data_structures_region_id_fkey;

-- Add back only one properly named foreign key constraint
ALTER TABLE data_structures
ADD CONSTRAINT data_structures_region_id_fkey
FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE CASCADE;

-- Force multiple schema cache refreshes to ensure PostgREST picks up changes
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(0.1);
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(0.1);
NOTIFY pgrst, 'reload schema';

-- Verify the constraint exists and is unique
DO $$
DECLARE
  constraint_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO constraint_count
  FROM information_schema.table_constraints 
  WHERE table_name = 'data_structures' 
  AND column_name = 'region_id'
  AND constraint_type = 'FOREIGN KEY';
  
  IF constraint_count != 1 THEN
    RAISE EXCEPTION 'Expected exactly 1 foreign key constraint for data_structures.region_id, found %', constraint_count;
  END IF;
  
  RAISE NOTICE 'Foreign key constraint successfully fixed. Found % constraint(s).', constraint_count;
END $$;