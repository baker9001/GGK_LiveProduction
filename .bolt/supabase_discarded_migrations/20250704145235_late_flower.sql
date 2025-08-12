/*
  # Add code column to edu_topics table

  1. Changes
    - Add code column to edu_topics table if it doesn't exist
    - Generate codes for existing topics based on their names
    - Add index on code column for better query performance

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
    -- Add the code column
    ALTER TABLE edu_topics ADD COLUMN code TEXT;
    
    -- Generate codes for existing topics
    UPDATE edu_topics 
    SET code = UPPER(REPLACE(REPLACE(name, ' ', '_'), '-', '_'))
    WHERE code IS NULL OR code = '';
    
    -- Add index for better performance
    CREATE INDEX IF NOT EXISTS idx_edu_topics_code ON edu_topics(code);
    
    RAISE NOTICE 'Added code column to edu_topics table';
  ELSE
    RAISE NOTICE 'code column already exists in edu_topics table';
  END IF;
END $$;

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';