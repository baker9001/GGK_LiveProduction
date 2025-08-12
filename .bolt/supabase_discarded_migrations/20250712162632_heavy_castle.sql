/*
  # Update past_paper_import_sessions table for JSON-only imports

  1. Changes
    - Add raw_json column to store JSON content directly
    - This supports the new workflow where only JSON files are accepted for import

  2. Impact
    - Simplifies the import process
    - Improves auditability by storing the original JSON
    - Enables better debugging and data recovery
*/

-- Add the raw_json column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'past_paper_import_sessions'
    AND column_name = 'raw_json'
  ) THEN
    ALTER TABLE past_paper_import_sessions 
    ADD COLUMN raw_json jsonb;
  END IF;
END $$;

-- Update any existing records to ensure metadata is preserved in raw_json
UPDATE past_paper_import_sessions
SET raw_json = metadata
WHERE raw_json IS NULL AND metadata IS NOT NULL;

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';