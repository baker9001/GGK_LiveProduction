/*
  # Add marks column to questions and sub-questions tables

  1. Changes
    - Add marks column to questions_master_admin table
    - Add marks column to sub_questions table
    - Set default values for existing records
    - Add NOT NULL constraint

  2. Purpose
    - Enable storing question marks/points for scoring
    - Support complex questions with sub-question marks
*/

-- Add marks column to questions_master_admin if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'questions_master_admin' 
    AND column_name = 'marks'
  ) THEN
    ALTER TABLE questions_master_admin ADD COLUMN marks integer;
  END IF;
END $$;

-- Add marks column to sub_questions if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'sub_questions' 
    AND column_name = 'marks'
  ) THEN
    ALTER TABLE sub_questions ADD COLUMN marks integer;
  END IF;
END $$;

-- Set default value of 1 for existing records in questions_master_admin
UPDATE questions_master_admin
SET marks = 1
WHERE marks IS NULL;

-- Set default value of 1 for existing records in sub_questions
UPDATE sub_questions
SET marks = 1
WHERE marks IS NULL;

-- Add NOT NULL constraint to marks column in questions_master_admin
ALTER TABLE questions_master_admin
ALTER COLUMN marks SET NOT NULL;

-- Add NOT NULL constraint to marks column in sub_questions
ALTER TABLE sub_questions
ALTER COLUMN marks SET NOT NULL;

-- Add check constraint to ensure marks is positive
ALTER TABLE questions_master_admin
ADD CONSTRAINT questions_master_admin_marks_check CHECK (marks > 0);

ALTER TABLE sub_questions
ADD CONSTRAINT sub_questions_marks_check CHECK (marks > 0);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';