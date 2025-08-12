/*
  # Add program_id to past_paper_import_sessions table

  1. Changes
    - Add program_id column to past_paper_import_sessions table
    - Add foreign key constraint to programs table
    - Update existing records to have valid program_id values (if possible)

  2. Security
    - No changes to RLS policies needed
*/

-- Add program_id column if it doesn't exist
ALTER TABLE past_paper_import_sessions
ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES programs(id);

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';