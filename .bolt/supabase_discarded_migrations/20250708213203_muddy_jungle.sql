/*
  # Fix subtopic_id column schema cache issue

  1. Problem
    - PostgREST schema cache doesn't recognize subtopic_id column in questions_master_admin
    - Previous migration attempts haven't properly refreshed the schema cache
    - Error: "Could not find the 'subtopic_id' column of 'questions_master_admin' in the schema cache"

  2. Solution
    - Ensure the subtopic_id column exists with proper constraints
    - Force multiple schema cache refreshes
    - Verify the column is properly recognized by PostgREST

  3. Changes
    - Recreate subtopic_id column if it doesn't exist
    - Add proper foreign key constraint to edu_subtopics
    - Force schema cache refresh multiple times
    - Add verification checks
*/

-- Step 1: Ensure the subtopic_id column exists
DO $$
BEGIN
  -- Check if the column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions_master_admin' AND column_name = 'subtopic_id'
  ) THEN
    ALTER TABLE questions_master_admin ADD COLUMN subtopic_id uuid;
    RAISE NOTICE 'Added subtopic_id column to questions_master_admin table';
  ELSE
    RAISE NOTICE 'subtopic_id column already exists in questions_master_admin table';
  END IF;
END $$;

-- Step 2: Ensure the foreign key constraint exists
DO $$
BEGIN
  -- Drop existing constraint if it exists (to avoid conflicts)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'questions_master_admin_subtopic_id_fkey'
    AND table_name = 'questions_master_admin'
  ) THEN
    ALTER TABLE questions_master_admin DROP CONSTRAINT questions_master_admin_subtopic_id_fkey;
    RAISE NOTICE 'Dropped existing foreign key constraint for subtopic_id';
  END IF;
  
  -- Add the foreign key constraint
  ALTER TABLE questions_master_admin 
  ADD CONSTRAINT questions_master_admin_subtopic_id_fkey 
  FOREIGN KEY (subtopic_id) 
  REFERENCES edu_subtopics(id) 
  ON DELETE SET NULL;
  
  RAISE NOTICE 'Added foreign key constraint for subtopic_id';
END $$;

-- Step 3: Ensure the index exists for better performance
CREATE INDEX IF NOT EXISTS idx_questions_master_admin_subtopic_id 
ON questions_master_admin(subtopic_id);

-- Step 4: Force schema cache refresh multiple times with delays
-- This is crucial for PostgREST to recognize the column
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(0.5);
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(0.5);
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(0.5);

-- Step 5: Update table statistics to help PostgREST
ANALYZE questions_master_admin;

-- Step 6: Final verification
DO $$
BEGIN
  -- Verify the column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions_master_admin' AND column_name = 'subtopic_id'
  ) THEN
    RAISE NOTICE 'SUCCESS: subtopic_id column exists in questions_master_admin table';
  ELSE
    RAISE EXCEPTION 'FAILED: subtopic_id column does not exist in questions_master_admin table';
  END IF;
  
  -- Verify the foreign key constraint exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'questions_master_admin_subtopic_id_fkey'
    AND table_name = 'questions_master_admin'
  ) THEN
    RAISE NOTICE 'SUCCESS: Foreign key constraint exists for subtopic_id';
  ELSE
    RAISE EXCEPTION 'FAILED: Foreign key constraint does not exist for subtopic_id';
  END IF;
  
  -- Verify the index exists
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'questions_master_admin' 
    AND indexname = 'idx_questions_master_admin_subtopic_id'
  ) THEN
    RAISE NOTICE 'SUCCESS: Index exists for subtopic_id';
  ELSE
    RAISE EXCEPTION 'FAILED: Index does not exist for subtopic_id';
  END IF;
END $$;

-- Step 7: Final schema refresh
NOTIFY pgrst, 'reload schema';