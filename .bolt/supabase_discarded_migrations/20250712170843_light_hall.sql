/*
  # Enhance past_paper_import_sessions table

  1. New Columns
    - `json_file_name` (text, nullable) - Store original file name
    - `year` (integer, nullable) - Store exam year
    - `error_message` (text, nullable) - Store detailed error messages

  2. Changes
    - Add new columns if they don't exist
    - Add index on subject_id for better query performance
    - Add index on year for better filtering
*/

-- Add json_file_name column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'past_paper_import_sessions' AND column_name = 'json_file_name'
  ) THEN
    ALTER TABLE past_paper_import_sessions ADD COLUMN json_file_name text;
  END IF;
END $$;

-- Add year column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'past_paper_import_sessions' AND column_name = 'year'
  ) THEN
    ALTER TABLE past_paper_import_sessions ADD COLUMN year integer;
  END IF;
END $$;

-- Add error_message column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'past_paper_import_sessions' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE past_paper_import_sessions ADD COLUMN error_message text;
  END IF;
END $$;

-- Add index on subject_id for better query performance
CREATE INDEX IF NOT EXISTS idx_past_paper_import_sessions_subject_id
ON past_paper_import_sessions(subject_id);

-- Add index on year for better filtering
CREATE INDEX IF NOT EXISTS idx_past_paper_import_sessions_year
ON past_paper_import_sessions(year);

-- Update existing records to populate year from metadata if available
UPDATE past_paper_import_sessions
SET year = (metadata->>'paper_metadata'->>'exam_year')::integer
WHERE year IS NULL 
  AND metadata IS NOT NULL 
  AND metadata->'paper_metadata'->>'exam_year' IS NOT NULL;

-- Update existing records to populate json_file_name from metadata if available
UPDATE past_paper_import_sessions
SET json_file_name = metadata->>'original_file_name'
WHERE json_file_name IS NULL 
  AND metadata IS NOT NULL 
  AND metadata->>'original_file_name' IS NOT NULL;

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';