/*
  # Add index on raw_json column for better query performance

  1. Changes
    - Add GIN index on raw_json column in past_paper_import_sessions table
    - This improves performance when querying JSON data

  2. Impact
    - Faster searches on JSON content
    - Better performance for the Previous Sessions tab
*/

-- Add GIN index on raw_json column for better JSON querying performance
CREATE INDEX IF NOT EXISTS idx_past_paper_import_sessions_raw_json 
ON past_paper_import_sessions USING GIN (raw_json);

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';