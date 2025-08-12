/*
  # Add provider_id and program_id columns to past_paper_import_sessions table

  1. New Columns
    - `provider_id` (uuid, foreign key to providers)
    - `program_id` (uuid, foreign key to programs)

  2. Foreign Keys
    - past_paper_import_sessions.provider_id references providers(id)
    - past_paper_import_sessions.program_id references programs(id)

  3. Changes
    - Add provider_id column if it doesn't exist
    - Add program_id column if it doesn't exist
    - Add foreign key constraints
*/

-- Add provider_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'past_paper_import_sessions' 
    AND column_name = 'provider_id'
  ) THEN
    ALTER TABLE past_paper_import_sessions 
    ADD COLUMN provider_id uuid REFERENCES providers(id);
  END IF;
END $$;

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

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';