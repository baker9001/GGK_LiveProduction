/*
  # Add code column to edu_topics table

  1. Changes
    - Add `code` column to `edu_topics` table with TEXT type
    - This resolves the frontend error when querying the non-existent code column

  2. Security
    - No changes to RLS policies needed as this is just adding a column
*/

-- Add code column to edu_topics table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'edu_topics' AND column_name = 'code'
  ) THEN
    ALTER TABLE edu_topics ADD COLUMN code TEXT;
  END IF;
END $$;