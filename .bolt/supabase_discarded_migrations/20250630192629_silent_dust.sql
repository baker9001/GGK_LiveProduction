/*
  # Fix papers_setup table subject_code constraint

  1. Changes
    - Make subject_code column nullable in papers_setup table
    - Update existing records to use code from edu_subjects table
    - Add trigger to automatically set subject_code from edu_subjects

  2. Security
    - No changes to RLS policies needed
*/

-- First, make the subject_code column nullable
ALTER TABLE papers_setup ALTER COLUMN subject_code DROP NOT NULL;

-- Update existing records to use code from edu_subjects
UPDATE papers_setup ps
SET subject_code = es.code
FROM edu_subjects es
WHERE ps.subject_id = es.id
AND (ps.subject_code IS NULL OR ps.subject_code = '');

-- Create a function to automatically set subject_code from edu_subjects
CREATE OR REPLACE FUNCTION set_subject_code_from_subject()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the code from edu_subjects
  SELECT code INTO NEW.subject_code
  FROM edu_subjects
  WHERE id = NEW.subject_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically set subject_code
DROP TRIGGER IF EXISTS set_subject_code_trigger ON papers_setup;
CREATE TRIGGER set_subject_code_trigger
BEFORE INSERT OR UPDATE ON papers_setup
FOR EACH ROW
WHEN (NEW.subject_id IS NOT NULL AND (NEW.subject_code IS NULL OR NEW.subject_code = ''))
EXECUTE FUNCTION set_subject_code_from_subject();

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';