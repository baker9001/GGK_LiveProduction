/*
  # Make paper_number and variant_number columns nullable in papers_setup table

  1. Changes
    - Modify the paper_number column in papers_setup table to allow NULL values
    - Modify the variant_number column in papers_setup table to allow NULL values
    - This fixes the error when inserting records without paper_number or variant_number values

  2. Reason
    - The application is attempting to insert records without providing paper_number values
    - The current schema has a NOT NULL constraint that prevents these inserts
    - Making these columns nullable allows the import functionality to work properly
*/

-- Make paper_number column nullable
ALTER TABLE papers_setup ALTER COLUMN paper_number DROP NOT NULL;

-- Make variant_number column nullable
ALTER TABLE papers_setup ALTER COLUMN variant_number DROP NOT NULL;

-- Add comments to document these changes
COMMENT ON COLUMN papers_setup.paper_number IS 'Paper number component of the paper code - nullable to support various import formats';
COMMENT ON COLUMN papers_setup.variant_number IS 'Variant number component of the paper code - nullable to support various import formats';

-- Force PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the changes were applied
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'papers_setup' 
    AND column_name = 'paper_number' 
    AND is_nullable = 'YES'
  ) THEN
    RAISE NOTICE 'SUCCESS: paper_number column is now nullable';
  ELSE
    RAISE EXCEPTION 'FAILED: paper_number column is still NOT NULL';
  END IF;
  
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'papers_setup' 
    AND column_name = 'variant_number' 
    AND is_nullable = 'YES'
  ) THEN
    RAISE NOTICE 'SUCCESS: variant_number column is now nullable';
  ELSE
    RAISE EXCEPTION 'FAILED: variant_number column is still NOT NULL';
  END IF;
END $$;