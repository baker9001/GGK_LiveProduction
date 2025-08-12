/*
  # Add program_id column to past_paper_import_sessions table

  1. Changes
    - Add program_id column to past_paper_import_sessions table
    - Add foreign key constraint to programs table
    - Update existing records to have valid program_id values (if possible)

  2. Security
    - No changes to RLS policies needed
*/

-- Add program_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'past_paper_import_sessions' 
    AND column_name = 'program_id'
  ) THEN
    ALTER TABLE past_paper_import_sessions 
    ADD COLUMN program_id uuid REFERENCES programs(id);
  END IF;
END $$;

-- Update existing records to set program_id from data_structure if possible
UPDATE past_paper_import_sessions pis
SET program_id = ds.program_id
FROM data_structures ds
WHERE pis.data_structure_id = ds.id
AND pis.program_id IS NULL;

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';