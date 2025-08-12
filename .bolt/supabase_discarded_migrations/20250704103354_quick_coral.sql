/*
  # Add logo column to edu_subjects table

  This migration ensures the edu_subjects table has a logo column for storing subject logos.

  ## Changes
  1. Add logo column to edu_subjects table if it doesn't exist
  2. Set proper column type (text, nullable)

  ## Security
  - No changes to RLS policies needed as this is just adding a column
*/

-- Add logo column to edu_subjects table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'edu_subjects' 
    AND column_name = 'logo' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE edu_subjects ADD COLUMN logo text;
  END IF;
END $$;

-- Ensure the logo column is nullable and of correct type
ALTER TABLE edu_subjects ALTER COLUMN logo TYPE text;
ALTER TABLE edu_subjects ALTER COLUMN logo DROP NOT NULL;