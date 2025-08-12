/*
  # Rename description to name in objectives and concepts tables

  1. Changes
    - Rename description column to name in edu_learning_objectives table
    - Rename description column to name in edu_specific_concepts table
    - Update any references to these columns in the codebase

  2. Security
    - No changes to RLS policies needed
*/

-- Rename description to name in edu_learning_objectives
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'edu_learning_objectives'
    AND column_name = 'description'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'edu_learning_objectives'
    AND column_name = 'name'
  ) THEN
    ALTER TABLE edu_learning_objectives RENAME COLUMN description TO name;
    RAISE NOTICE 'Renamed description to name in edu_learning_objectives';
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'edu_learning_objectives'
    AND column_name = 'name'
  ) THEN
    -- If neither column exists, add the name column
    ALTER TABLE edu_learning_objectives ADD COLUMN name text NOT NULL DEFAULT '';
    RAISE NOTICE 'Added name column to edu_learning_objectives';
  ELSE
    RAISE NOTICE 'name column already exists in edu_learning_objectives';
  END IF;
END $$;

-- Rename description to name in edu_specific_concepts
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'edu_specific_concepts'
    AND column_name = 'description'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'edu_specific_concepts'
    AND column_name = 'name'
  ) THEN
    ALTER TABLE edu_specific_concepts RENAME COLUMN description TO name;
    RAISE NOTICE 'Renamed description to name in edu_specific_concepts';
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'edu_specific_concepts'
    AND column_name = 'name'
  ) THEN
    -- If neither column exists, add the name column
    ALTER TABLE edu_specific_concepts ADD COLUMN name text NOT NULL DEFAULT '';
    RAISE NOTICE 'Added name column to edu_specific_concepts';
  ELSE
    RAISE NOTICE 'name column already exists in edu_specific_concepts';
  END IF;
END $$;

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';