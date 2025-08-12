/*
  # Fix subject name duplication issue

  1. Changes
    - Update the format_subject_before_insert_update trigger function
    - Prevent code from being appended multiple times to subject names
    - Fix existing data with duplicated codes in names

  2. Security
    - No changes to RLS policies needed
*/

-- First, fix existing data with duplicated codes
UPDATE edu_subjects
SET name = regexp_replace(name, '(.*?) - (.*?) - \2$', '\1 - \2')
WHERE name ~ '.* - .* - .*';

-- Create a better version of the trigger function to prevent duplication
CREATE OR REPLACE FUNCTION format_subject_before_insert_update()
RETURNS TRIGGER AS $$
DECLARE
  extracted_code text;
  name_part text;
  code_pattern text;
BEGIN
  -- Check if the name already contains a code pattern
  IF position(' - ' IN NEW.name) > 0 THEN
    -- Extract the name part (before the first " - ")
    name_part := substring(NEW.name from 1 for position(' - ' IN NEW.name) - 1);
    
    -- Extract the code part (after the first " - ")
    extracted_code := substring(NEW.name from position(' - ' IN NEW.name) + 3);
    
    -- If no code is provided or it's different from the extracted one, use the extracted code
    IF NEW.code IS NULL OR NEW.code = '' THEN
      NEW.code := extracted_code;
    END IF;
    
    -- Always use the clean name part and the code from the code field
    NEW.name := name_part || ' - ' || NEW.code;
  ELSE
    -- If name doesn't contain code but code is provided, append it
    IF NEW.code IS NOT NULL AND NEW.code != '' THEN
      NEW.name := NEW.name || ' - ' || NEW.code;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS format_subject_trigger ON edu_subjects;

-- Create the trigger on edu_subjects table
CREATE TRIGGER format_subject_trigger
BEFORE INSERT OR UPDATE ON edu_subjects
FOR EACH ROW
EXECUTE FUNCTION format_subject_before_insert_update();

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';