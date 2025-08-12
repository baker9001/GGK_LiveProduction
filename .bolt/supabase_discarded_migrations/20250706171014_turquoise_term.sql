/*
  # Fix Foreign Key Constraint for Import Sessions

  1. Problem
    - The foreign key constraint between papers_setup.import_session_id and past_paper_import_sessions.id
    - Currently prevents deletion of import sessions when papers_setup records reference them
    - Should allow deletion with ON DELETE SET NULL behavior

  2. Solution
    - Drop the existing foreign key constraint
    - Recreate it with proper ON DELETE SET NULL behavior
    - This allows import sessions to be deleted while setting referencing records to NULL

  3. Changes
    - Drop papers_setup_import_session_id_fkey constraint
    - Add new constraint with ON DELETE SET NULL
*/

-- First, check if the constraint exists and drop it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'papers_setup_import_session_id_fkey' 
    AND table_name = 'papers_setup'
  ) THEN
    ALTER TABLE papers_setup DROP CONSTRAINT papers_setup_import_session_id_fkey;
  END IF;
END $$;

-- Add the foreign key constraint with proper ON DELETE SET NULL behavior
ALTER TABLE papers_setup 
ADD CONSTRAINT papers_setup_import_session_id_fkey 
FOREIGN KEY (import_session_id) 
REFERENCES past_paper_import_sessions(id) 
ON DELETE SET NULL;