/*
  # Fix subject_code NOT NULL constraint in papers_setup table

  1. Changes
    - Ensure the subject_code column in papers_setup table allows NULL values
    - This resolves the constraint violation error when inserting records without subject_code

  2. Background
    - The application is inserting records without subject_code values
    - Previous migrations may not have been applied successfully
    - This migration ensures the column is definitely nullable
*/

-- First, check if the column exists and get its current state
DO $$
BEGIN
  -- Make subject_code column nullable if it exists and is currently NOT NULL
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'papers_setup' 
    AND column_name = 'subject_code'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE papers_setup ALTER COLUMN subject_code DROP NOT NULL;
    RAISE NOTICE 'SUCCESS: subject_code column is now nullable';
  ELSE
    RAISE NOTICE 'INFO: subject_code column is already nullable or does not exist';
  END IF;
END $$;

-- Add a comment to document this change
COMMENT ON COLUMN papers_setup.subject_code IS 'Legacy subject code field - nullable as relationships now use subject_id';

-- Force PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';

-- Final verification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'papers_setup' 
    AND column_name = 'subject_code' 
    AND is_nullable = 'YES'
  ) THEN
    RAISE NOTICE 'VERIFIED: subject_code column is now nullable';
  ELSE
    RAISE WARNING 'WARNING: subject_code column may still have NOT NULL constraint';
  END IF;
END $$;