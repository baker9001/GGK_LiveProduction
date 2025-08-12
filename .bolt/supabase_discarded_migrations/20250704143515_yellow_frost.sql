/*
  # Create or update subject name format trigger

  1. New Functions
    - `extract_subject_code` - Extracts code from subject name in format "Name - Code"
    - `format_subject_name_with_code` - Formats subject name with code as "Name - Code"
    - `format_subject_before_insert_update` - Trigger function to handle formatting

  2. Changes
    - Creates a trigger on edu_subjects table to automatically format names and extract codes
    - Ensures subject names are consistently formatted as "Name - Code"
    - Updates existing subjects to follow the naming convention
*/

-- Create a function to extract subject code from name
CREATE OR REPLACE FUNCTION extract_subject_code(subject_name text)
RETURNS text AS $$
DECLARE
  code_part text;
BEGIN
  -- Check if the name is in the format "Name - Code"
  IF position(' - ' IN subject_name) > 0 THEN
    code_part := substring(subject_name from position(' - ' IN subject_name) + 3);
    RETURN code_part;
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create a function to format subject name with code
CREATE OR REPLACE FUNCTION format_subject_name_with_code(name text, code text)
RETURNS text AS $$
BEGIN
  -- If name already contains a code separator, extract the name part
  IF position(' - ' IN name) > 0 THEN
    name := substring(name from 1 for position(' - ' IN name) - 1);
  END IF;
  
  -- If code is provided, append it to the name
  IF code IS NOT NULL AND code != '' THEN
    RETURN name || ' - ' || code;
  ELSE
    RETURN name;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger function to automatically format subject names and extract codes
CREATE OR REPLACE FUNCTION format_subject_before_insert_update()
RETURNS TRIGGER AS $$
DECLARE
  extracted_code text;
  name_part text;
BEGIN
  -- Check if the name contains a code
  IF position(' - ' IN NEW.name) > 0 THEN
    -- Extract the code part
    extracted_code := extract_subject_code(NEW.name);
    
    -- Extract the name part
    name_part := substring(NEW.name from 1 for position(' - ' IN NEW.name) - 1);
    
    -- If no code is provided or it's different from the extracted one, use the extracted code
    IF NEW.code IS NULL OR NEW.code = '' OR NEW.code != extracted_code THEN
      NEW.code := extracted_code;
    END IF;
    
    -- Ensure the name uses the actual code from the code field
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

-- Update existing subjects to include their code in the name if not already present
UPDATE edu_subjects
SET name = format_subject_name_with_code(name, code)
WHERE code IS NOT NULL 
  AND code != ''
  AND position(' - ' || code IN name) = 0;