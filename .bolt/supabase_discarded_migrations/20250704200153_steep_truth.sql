/*
  # Fix missing description columns

  This migration ensures that the description columns exist on the edu_learning_objectives 
  and edu_specific_concepts tables, as they are required by the application.

  ## Changes
  1. Add description column to edu_learning_objectives if it doesn't exist
  2. Add description column to edu_specific_concepts if it doesn't exist
  3. Refresh PostgREST schema cache
*/

-- Add description column to edu_learning_objectives if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'edu_learning_objectives' AND column_name = 'description'
  ) THEN
    ALTER TABLE edu_learning_objectives ADD COLUMN description text NOT NULL DEFAULT '';
  END IF;
END $$;

-- Add description column to edu_specific_concepts if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'edu_specific_concepts' AND column_name = 'description'
  ) THEN
    ALTER TABLE edu_specific_concepts ADD COLUMN description text NOT NULL DEFAULT '';
  END IF;
END $$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';