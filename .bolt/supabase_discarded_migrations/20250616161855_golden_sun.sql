/*
  # Add year column to questions_master_admin table

  1. Changes
    - Add year column to questions_master_admin table if it doesn't exist
    - Set year to a default value for existing records
    - Add NOT NULL constraint to year column
    - Refresh schema cache

  2. Purpose
    - Fix "null value in column 'year' of relation 'questions_master_admin' violates not-null constraint" error
    - Ensure all questions have a valid year value
*/

-- Add year column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'questions_master_admin' 
    AND column_name = 'year'
  ) THEN
    ALTER TABLE questions_master_admin ADD COLUMN year integer;
  END IF;
END $$;

-- Update existing records to set year from paper_id if available
UPDATE questions_master_admin q
SET year = p.exam_year
FROM papers_setup p
WHERE q.paper_id = p.id
AND q.year IS NULL;

-- Set a default year for any remaining NULL values
UPDATE questions_master_admin
SET year = 2025
WHERE year IS NULL;

-- Add NOT NULL constraint
ALTER TABLE questions_master_admin
ALTER COLUMN year SET NOT NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_questions_master_admin_year ON questions_master_admin(year);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';