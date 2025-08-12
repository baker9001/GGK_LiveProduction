/*
  # Fix logo_url column and refresh schema cache

  1. Changes
    - Ensure logo_url column exists in providers table
    - Ensure logo_url column exists in subjects table
    - Refresh schema cache
*/

-- Ensure logo_url column exists in providers
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'providers' 
    AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE providers ADD COLUMN logo_url text;
  END IF;
END $$;

-- Ensure logo_url column exists in subjects
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'subjects' 
    AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE subjects ADD COLUMN logo_url text;
  END IF;
END $$;

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';