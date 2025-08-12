/*
  # Fix Foreign Key Relationship Between Questions and Papers

  1. Problem
    - Missing foreign key constraint between questions_master_admin.paper_id and papers_setup.id
    - Error: "Could not find a relationship between 'questions_master_admin' and 'papers_setup' in the schema cache"
    - This prevents proper joins between these tables in Supabase queries

  2. Solution
    - Clean up orphaned records in questions_master_admin
    - Drop any existing foreign key constraint to avoid conflicts
    - Add proper foreign key constraint with ON DELETE SET NULL behavior
    - Force schema cache refresh to ensure PostgREST recognizes the relationship

  3. Changes
    - Update orphaned paper_id references to NULL
    - Add foreign key constraint from questions_master_admin.paper_id to papers_setup.id
    - Add index on paper_id for better query performance
    - Force multiple schema cache refreshes
*/

-- Step 1: Clean up orphaned records
UPDATE questions_master_admin
SET paper_id = NULL
WHERE paper_id IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM papers_setup WHERE id = questions_master_admin.paper_id
);

-- Step 2: Drop existing foreign key constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'questions_master_admin_paper_id_fkey'
    AND table_name = 'questions_master_admin'
  ) THEN
    ALTER TABLE questions_master_admin DROP CONSTRAINT questions_master_admin_paper_id_fkey;
    RAISE NOTICE 'Dropped existing foreign key constraint for paper_id';
  END IF;
END $$;

-- Step 3: Add the foreign key constraint with ON DELETE SET NULL
ALTER TABLE questions_master_admin
ADD CONSTRAINT questions_master_admin_paper_id_fkey
FOREIGN KEY (paper_id)
REFERENCES papers_setup(id)
ON DELETE SET NULL;

-- Step 4: Add index for better performance if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'questions_master_admin'
    AND indexname = 'idx_questions_master_admin_paper_id'
  ) THEN
    CREATE INDEX idx_questions_master_admin_paper_id
    ON questions_master_admin(paper_id);
    RAISE NOTICE 'Created index on paper_id column';
  END IF;
END $$;

-- Step 5: Force schema cache refresh multiple times with delays
-- This is crucial for PostgREST to recognize the relationship
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(0.5);
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(0.5);
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(0.5);

-- Step 6: Update table statistics to help PostgREST
ANALYZE questions_master_admin;
ANALYZE papers_setup;

-- Step 7: Final verification
DO $$
BEGIN
  -- Verify the foreign key constraint exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'questions_master_admin_paper_id_fkey'
    AND table_name = 'questions_master_admin'
  ) THEN
    RAISE NOTICE 'SUCCESS: Foreign key constraint exists for paper_id';
  ELSE
    RAISE EXCEPTION 'FAILED: Foreign key constraint does not exist for paper_id';
  END IF;
  
  -- Verify the referenced table and column
  IF EXISTS (
    SELECT 1 FROM information_schema.key_column_usage kcu
    JOIN information_schema.constraint_column_usage ccu
      ON kcu.constraint_name = ccu.constraint_name
    WHERE kcu.constraint_name = 'questions_master_admin_paper_id_fkey'
      AND kcu.table_name = 'questions_master_admin'
      AND kcu.column_name = 'paper_id'
      AND ccu.table_name = 'papers_setup'
      AND ccu.column_name = 'id'
  ) THEN
    RAISE NOTICE 'SUCCESS: Foreign key references papers_setup.id correctly';
  ELSE
    RAISE EXCEPTION 'FAILED: Foreign key does not reference papers_setup.id correctly';
  END IF;
END $$;

-- Step 8: Final schema refresh
NOTIFY pgrst, 'reload schema';