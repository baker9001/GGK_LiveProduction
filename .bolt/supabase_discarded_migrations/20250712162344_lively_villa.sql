/*
  # Update past_paper_import_sessions table structure

  1. Changes
    - Remove question_paper_url and mark_scheme_url columns
    - Add raw_json column to store JSON content directly
    - This supports the new workflow where only JSON files are accepted for import

  2. Impact
    - Simplifies the import process
    - Improves auditability by storing the original JSON
    - Reduces storage requirements by eliminating PDF uploads
*/

-- Step 1: Add the new raw_json column
ALTER TABLE past_paper_import_sessions 
ADD COLUMN raw_json jsonb;

-- Step 2: Remove the question_paper_url and mark_scheme_url columns
ALTER TABLE past_paper_import_sessions 
DROP COLUMN IF EXISTS question_paper_url,
DROP COLUMN IF EXISTS mark_scheme_url;

-- Step 3: Update any existing records to ensure metadata is preserved in raw_json
UPDATE past_paper_import_sessions
SET raw_json = metadata
WHERE raw_json IS NULL AND metadata IS NOT NULL;

-- Step 4: Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';