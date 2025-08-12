/*
  # Fix subtopic_id reference in questions_master_admin table

  1. Problem
    - The subtopic_id column exists in questions_master_admin table
    - But PostgREST cannot find it in the schema cache
    - Error: "Could not find the 'subtopic_id' column of 'questions_master_admin' in the schema cache"

  2. Solution
    - Drop and recreate the subtopic_id column with proper references
    - Ensure the foreign key constraint references the correct table (edu_subtopics)
    - Force multiple schema cache refreshes to ensure PostgREST recognizes the column

  3. Changes
    - Drop existing subtopic_id column and constraints
    - Add subtopic_id column with proper foreign key to edu_subtopics
    - Add index for better query performance
    - Force schema cache refresh
*/

-- Step 1: Drop existing subtopic_id column and constraints
ALTER TABLE questions_master_admin DROP COLUMN IF EXISTS subtopic_id;

-- Step 2: Add subtopic_id column with proper foreign key
ALTER TABLE questions_master_admin ADD COLUMN subtopic_id uuid;
ALTER TABLE questions_master_admin 
ADD CONSTRAINT questions_master_admin_subtopic_id_fkey 
FOREIGN KEY (subtopic_id) 
REFERENCES edu_subtopics(id) 
ON DELETE SET NULL;

-- Step 3: Add index for better performance
CREATE INDEX IF NOT EXISTS idx_questions_master_admin_subtopic_id 
ON questions_master_admin(subtopic_id);

-- Step 4: Force multiple schema cache refreshes to ensure PostgREST picks up changes
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(0.1);
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(0.1);
NOTIFY pgrst, 'reload schema';

-- Step 5: Verify the column was added successfully
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions_master_admin' AND column_name = 'subtopic_id'
  ) THEN
    RAISE NOTICE 'Verification successful: subtopic_id column exists in questions_master_admin table';
  ELSE
    RAISE EXCEPTION 'Verification failed: subtopic_id column does not exist in questions_master_admin table';
  END IF;
  
  -- Also verify the foreign key constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'questions_master_admin_subtopic_id_fkey'
    AND table_name = 'questions_master_admin'
  ) THEN
    RAISE NOTICE 'Verification successful: Foreign key constraint exists for subtopic_id';
  ELSE
    RAISE EXCEPTION 'Verification failed: Foreign key constraint does not exist for subtopic_id';
  END IF;
END $$;