/*
  # Fix subject_code NOT NULL constraint in papers_setup table

  1. Changes
    - Make the subject_code column nullable in papers_setup table
    - Add a comment explaining the change
    - Force schema cache refresh

  2. Reason
    - The application is inserting records without subject_code values
    - The current code uses subject_id instead of subject_code for relationships
    - Making this column nullable allows the import functionality to work properly
*/

-- Make subject_code column nullable
ALTER TABLE papers_setup ALTER COLUMN subject_code DROP NOT NULL;

-- Add a comment to document this change
COMMENT ON COLUMN papers_setup.subject_code IS 'Legacy subject code field - nullable as relationships now use subject_id';

-- Force PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the change was applied
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'papers_setup' 
    AND column_name = 'subject_code' 
    AND is_nullable = 'YES'
  ) THEN
    RAISE NOTICE 'SUCCESS: subject_code column is now nullable';
  ELSE
    RAISE EXCEPTION 'FAILED: subject_code column is still NOT NULL';
  END IF;
END $$;