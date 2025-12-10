/*
  # Add Document Material Type

  ## Overview
  This migration adds 'document' as a new material type option, allowing
  proper categorization of Word, Excel, PowerPoint, and other document formats.

  ## Changes
  1. Updates the materials.type column constraint to include 'document'
  2. Adds 'interactive' type for future quiz/assignment enhancements

  ## Affected Tables
  - materials: type column constraint updated

  ## Security
  - No security changes required - RLS policies already handle all types
*/

-- Drop the existing constraint and add a new one with expanded types
DO $$
BEGIN
  -- First check if the constraint exists
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'materials' AND column_name = 'type'
  ) THEN
    -- Drop any existing check constraint on type column
    ALTER TABLE materials DROP CONSTRAINT IF EXISTS materials_type_check;
  END IF;
  
  -- Add new constraint with expanded type options
  ALTER TABLE materials ADD CONSTRAINT materials_type_check
    CHECK (type IN ('video', 'ebook', 'audio', 'assignment', 'document', 'interactive'));
EXCEPTION
  WHEN duplicate_object THEN
    -- Constraint already exists with correct definition, ignore
    NULL;
END $$;

-- Add comment documenting the type options
COMMENT ON COLUMN materials.type IS 'Material content type: video (lessons/tutorials), document (PDF/Word/Excel/PPT), ebook (reading materials), audio (podcasts/audiobooks), assignment (homework/tests), interactive (quizzes/simulations)';
