/*
  # Fix Foreign Key Constraint for Import Sessions Deletion

  1. Problem
    - The foreign key constraint between papers_setup.import_session_id and past_paper_import_sessions.id
    - Currently prevents deletion of import sessions when papers_setup records reference them
    - Error: "update or delete on table "past_paper_import_sessions" violates foreign key constraint"

  2. Solution
    - Drop any existing foreign key constraint
    - Recreate it with proper ON DELETE SET NULL behavior
    - This allows import sessions to be deleted while setting referencing records to NULL

  3. Changes
    - Drop papers_setup_import_session_id_fkey constraint if it exists
    - Add new constraint with ON DELETE SET NULL
    - Ensure proper indexing for performance
*/

-- Drop the existing foreign key constraint if it exists
DO $$
BEGIN
  -- Check if the constraint exists and drop it
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'papers_setup_import_session_id_fkey' 
    AND table_name = 'papers_setup'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE papers_setup DROP CONSTRAINT papers_setup_import_session_id_fkey;
    RAISE NOTICE 'Dropped existing foreign key constraint papers_setup_import_session_id_fkey';
  END IF;
END $$;

-- Add the foreign key constraint with proper ON DELETE SET NULL behavior
ALTER TABLE papers_setup 
ADD CONSTRAINT papers_setup_import_session_id_fkey 
FOREIGN KEY (import_session_id) 
REFERENCES past_paper_import_sessions(id) 
ON DELETE SET NULL;

-- Ensure index exists for better performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_papers_setup_import_session_id'
    AND tablename = 'papers_setup'
    AND schemaname = 'public'
  ) THEN
    CREATE INDEX idx_papers_setup_import_session_id 
    ON papers_setup(import_session_id);
    RAISE NOTICE 'Created index idx_papers_setup_import_session_id';
  END IF;
END $$;

-- Verify the constraint was created correctly
DO $$
DECLARE
  constraint_info RECORD;
BEGIN
  SELECT 
    tc.constraint_name,
    rc.delete_rule
  INTO constraint_info
  FROM information_schema.table_constraints tc
  JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
  WHERE tc.constraint_name = 'papers_setup_import_session_id_fkey'
    AND tc.table_name = 'papers_setup'
    AND tc.table_schema = 'public';
    
  IF FOUND THEN
    RAISE NOTICE 'Foreign key constraint % created with delete rule: %', 
      constraint_info.constraint_name, constraint_info.delete_rule;
  ELSE
    RAISE EXCEPTION 'Failed to create foreign key constraint papers_setup_import_session_id_fkey';
  END IF;
END $$;

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';