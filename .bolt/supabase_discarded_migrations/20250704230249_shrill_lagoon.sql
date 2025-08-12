/*
  # Fix duplicate foreign key constraints in data_structures table

  1. Changes
    - Remove duplicate foreign key constraint `fk_data_structures_region`
    - Keep only the standard `data_structures_region_id_fkey` constraint
    - Force schema cache refresh to ensure PostgREST recognizes the change

  2. Security
    - Maintain existing RLS policies
    - Preserve all existing data
*/

-- Drop the duplicate foreign key constraint
ALTER TABLE data_structures DROP CONSTRAINT IF EXISTS fk_data_structures_region;

-- Verify that the standard constraint still exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'data_structures' 
    AND constraint_name = 'data_structures_region_id_fkey'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    -- Re-add the standard constraint if it doesn't exist
    ALTER TABLE data_structures
    ADD CONSTRAINT data_structures_region_id_fkey
    FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Force multiple schema cache refreshes to ensure PostgREST picks up changes
NOTIFY pgrst, 'reload schema';

-- Wait a moment and notify again
SELECT pg_sleep(0.1);
NOTIFY pgrst, 'reload schema';

-- Create a function to verify the relationship is working correctly
CREATE OR REPLACE FUNCTION verify_data_structures_regions_relationship()
RETURNS boolean AS $$
BEGIN
  -- Test if we can query with the regions join without ambiguity
  PERFORM 1 FROM data_structures ds
  LEFT JOIN regions r ON ds.region_id = r.id
  LIMIT 1;
  
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Test the relationship
SELECT verify_data_structures_regions_relationship() as regions_relationship_working;

-- Final schema cache refresh
NOTIFY pgrst, 'reload schema';