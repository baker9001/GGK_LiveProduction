/*
  # Fix missing description column in edu_specific_concepts

  This migration ensures that the description column exists on the edu_specific_concepts 
  table, as it is required by the application for querying concepts.

  ## Changes
  1. Add description column to edu_specific_concepts if it doesn't exist
  2. Set a default value for existing records
  3. Refresh PostgREST schema cache
*/

-- Add description column to edu_specific_concepts if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'edu_specific_concepts' 
    AND column_name = 'description'
  ) THEN
    ALTER TABLE edu_specific_concepts ADD COLUMN description text NOT NULL DEFAULT '';
    
    -- Update any existing records that might have empty descriptions
    UPDATE edu_specific_concepts 
    SET description = 'Concept description' 
    WHERE description = '' OR description IS NULL;
  END IF;
END $$;

-- Ensure the column exists on edu_learning_objectives as well (from previous migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'edu_learning_objectives' 
    AND column_name = 'description'
  ) THEN
    ALTER TABLE edu_learning_objectives ADD COLUMN description text NOT NULL DEFAULT '';
  END IF;
END $$;

-- Refresh PostgREST schema cache to ensure changes are recognized
NOTIFY pgrst, 'reload schema';