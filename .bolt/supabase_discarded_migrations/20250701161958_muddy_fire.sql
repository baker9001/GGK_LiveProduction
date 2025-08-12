/*
  # Fix edu_subjects logo column

  This migration ensures the edu_subjects table has the correct logo column structure.

  ## Changes
  1. Add logo column if it doesn't exist
  2. Rename logo_url to logo if logo_url exists and logo doesn't
  3. Ensure proper column type and constraints

  ## Security
  - No changes to RLS policies needed
*/

-- Check if logo column exists, if not add it or rename from logo_url
DO $$
BEGIN
  -- If logo column doesn't exist but logo_url does, rename it
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'edu_subjects' AND column_name = 'logo' AND table_schema = 'public')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'edu_subjects' AND column_name = 'logo_url' AND table_schema = 'public') THEN
    
    ALTER TABLE edu_subjects RENAME COLUMN logo_url TO logo;
    
  -- If neither logo nor logo_url exists, add logo column
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'edu_subjects' AND column_name = 'logo' AND table_schema = 'public')
        AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'edu_subjects' AND column_name = 'logo_url' AND table_schema = 'public') THEN
    
    ALTER TABLE edu_subjects ADD COLUMN logo text;
    
  END IF;
END $$;

-- Ensure the logo column has the correct type (text, nullable)
DO $$
BEGIN
  -- Check if logo column exists and update its type if needed
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'edu_subjects' AND column_name = 'logo' AND table_schema = 'public') THEN
    -- Ensure it's text type and nullable
    ALTER TABLE edu_subjects ALTER COLUMN logo TYPE text;
    ALTER TABLE edu_subjects ALTER COLUMN logo DROP NOT NULL;
  END IF;
END $$;