/*
  # Fix edu_topics table code column

  1. Changes
    - Ensure `code` column exists in `edu_topics` table
    - Add proper index for performance
    - Update existing records to have a code if missing

  2. Security
    - No changes to RLS policies needed
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

-- Update existing records that don't have a code
UPDATE edu_topics 
SET code = UPPER(REPLACE(REPLACE(name, ' ', '_'), '-', '_'))
WHERE code IS NULL OR code = '';

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_edu_topics_code ON edu_topics(code);

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';