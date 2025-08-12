/*
  # Rename description to name in edu_learning_objectives and edu_specific_concepts

  1. Changes
    - Rename description column to name in edu_learning_objectives table
    - Rename description column to name in edu_specific_concepts table
    - Add name column if description doesn't exist
    - Update any existing records to ensure data integrity

  2. Security
    - No changes to RLS policies needed
*/

-- Rename description to name in edu_learning_objectives
DO $$
BEGIN
  -- Check if description exists but name doesn't
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
    -- Rename the column
    ALTER TABLE edu_learning_objectives RENAME COLUMN description TO name;
    RAISE NOTICE 'Renamed description to name in edu_learning_objectives';
  
  -- If neither column exists, add name column
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'edu_learning_objectives'
    AND column_name = 'name'
  ) THEN
    ALTER TABLE edu_learning_objectives ADD COLUMN name text NOT NULL DEFAULT '';
    RAISE NOTICE 'Added name column to edu_learning_objectives';
  
  -- If both columns exist, copy data from description to name and drop description
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'edu_learning_objectives'
    AND column_name = 'description'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'edu_learning_objectives'
    AND column_name = 'name'
  ) THEN
    -- Update name with description values where name is empty
    UPDATE edu_learning_objectives
    SET name = description
    WHERE (name IS NULL OR name = '') AND description IS NOT NULL AND description != '';
    
    -- Drop the description column
    ALTER TABLE edu_learning_objectives DROP COLUMN description;
    RAISE NOTICE 'Copied data from description to name and dropped description column in edu_learning_objectives';
  
  ELSE
    RAISE NOTICE 'name column already exists in edu_learning_objectives';
  END IF;
END $$;

-- Rename description to name in edu_specific_concepts
DO $$
BEGIN
  -- Check if description exists but name doesn't
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
    -- Rename the column
    ALTER TABLE edu_specific_concepts RENAME COLUMN description TO name;
    RAISE NOTICE 'Renamed description to name in edu_specific_concepts';
  
  -- If neither column exists, add name column
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'edu_specific_concepts'
    AND column_name = 'name'
  ) THEN
    ALTER TABLE edu_specific_concepts ADD COLUMN name text NOT NULL DEFAULT '';
    RAISE NOTICE 'Added name column to edu_specific_concepts';
  
  -- If both columns exist, copy data from description to name and drop description
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'edu_specific_concepts'
    AND column_name = 'description'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'edu_specific_concepts'
    AND column_name = 'name'
  ) THEN
    -- Update name with description values where name is empty
    UPDATE edu_specific_concepts
    SET name = description
    WHERE (name IS NULL OR name = '') AND description IS NOT NULL AND description != '';
    
    -- Drop the description column
    ALTER TABLE edu_specific_concepts DROP COLUMN description;
    RAISE NOTICE 'Copied data from description to name and dropped description column in edu_specific_concepts';
  
  ELSE
    RAISE NOTICE 'name column already exists in edu_specific_concepts';
  END IF;
END $$;

-- Ensure name column is NOT NULL
ALTER TABLE edu_learning_objectives ALTER COLUMN name SET NOT NULL;
ALTER TABLE edu_specific_concepts ALTER COLUMN name SET NOT NULL;

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';