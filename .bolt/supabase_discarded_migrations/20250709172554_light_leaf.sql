/*
  # Fix question_subtopics relationship with edu_subtopics

  1. Problem
    - PostgREST schema cache doesn't recognize the relationship between question_subtopics and edu_subtopics
    - This prevents proper joins in API queries
    - Error: "Could not find a relationship between 'question_subtopics' and 'edu_subtopics' in the schema cache"

  2. Solution
    - Drop and recreate the foreign key constraint between question_subtopics.subtopic_id and edu_subtopics.id
    - Force multiple schema cache refreshes to ensure PostgREST recognizes the relationship
    - Verify the constraint is correctly set up

  3. Impact
    - Enables proper querying of subtopics related to questions
    - Fixes the error in the Questions Setup page
    - No data loss or modification
*/

-- Step 1: Drop existing foreign key constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'question_subtopics_subtopic_id_fkey'
    AND table_name = 'question_subtopics'
  ) THEN
    ALTER TABLE question_subtopics DROP CONSTRAINT question_subtopics_subtopic_id_fkey;
    RAISE NOTICE 'Dropped existing foreign key constraint for subtopic_id';
  END IF;
END $$;

-- Step 2: Add the foreign key constraint with explicit name
ALTER TABLE question_subtopics
ADD CONSTRAINT question_subtopics_subtopic_id_fkey
FOREIGN KEY (subtopic_id)
REFERENCES edu_subtopics(id)
ON DELETE CASCADE;

-- Step 3: Force schema cache refresh multiple times with delays
-- This is crucial for PostgREST to recognize the relationship
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(0.5);
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(0.5);
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(0.5);

-- Step 4: Update table statistics to help PostgREST
ANALYZE question_subtopics;
ANALYZE edu_subtopics;

-- Step 5: Final verification
DO $$
BEGIN
  -- Verify the foreign key constraint exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'question_subtopics_subtopic_id_fkey'
    AND table_name = 'question_subtopics'
  ) THEN
    RAISE NOTICE 'SUCCESS: Foreign key constraint exists for subtopic_id';
  ELSE
    RAISE EXCEPTION 'FAILED: Foreign key constraint does not exist for subtopic_id';
  END IF;
  
  -- Verify the referenced table and column
  IF EXISTS (
    SELECT 1 FROM information_schema.key_column_usage kcu
    JOIN information_schema.constraint_column_usage ccu
      ON kcu.constraint_name = ccu.constraint_name
    WHERE kcu.constraint_name = 'question_subtopics_subtopic_id_fkey'
      AND kcu.table_name = 'question_subtopics'
      AND kcu.column_name = 'subtopic_id'
      AND ccu.table_name = 'edu_subtopics'
      AND ccu.column_name = 'id'
  ) THEN
    RAISE NOTICE 'SUCCESS: Foreign key references edu_subtopics.id correctly';
  ELSE
    RAISE EXCEPTION 'FAILED: Foreign key does not reference edu_subtopics.id correctly';
  END IF;
END $$;

-- Step 6: Final schema refresh
NOTIFY pgrst, 'reload schema';