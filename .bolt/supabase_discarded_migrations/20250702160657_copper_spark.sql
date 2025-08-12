/*
  # Add import_session_id to papers_setup table

  1. Changes
    - Add import_session_id column to papers_setup table
    - Add foreign key constraint to past_paper_import_sessions table
    - Add index for better query performance

  2. Security
    - No changes to RLS policies needed
*/

-- Add import_session_id column to papers_setup table
ALTER TABLE papers_setup 
ADD COLUMN import_session_id uuid;

-- Add foreign key constraint
ALTER TABLE papers_setup 
ADD CONSTRAINT papers_setup_import_session_id_fkey 
FOREIGN KEY (import_session_id) 
REFERENCES past_paper_import_sessions(id) 
ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX idx_papers_setup_import_session_id 
ON papers_setup(import_session_id);

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';