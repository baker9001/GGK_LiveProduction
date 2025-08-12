-- Migration to ensure subject names include the code in the format "Name - Code"

-- First, update existing subjects to include their code in the name if not already present
UPDATE edu_subjects
SET name = format_subject_name_with_code(name, code)
WHERE code IS NOT NULL 
  AND code != ''
  AND position(' - ' || code IN name) = 0;

-- Create or replace the trigger function to ensure this format is maintained
CREATE OR REPLACE FUNCTION format_subject_before_insert_update()
RETURNS TRIGGER AS $$
DECLARE
  extracted_code text;
  formatted_name text;
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

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS format_subject_trigger ON edu_subjects;
CREATE TRIGGER format_subject_trigger
BEFORE INSERT OR UPDATE ON edu_subjects
FOR EACH ROW
EXECUTE FUNCTION format_subject_before_insert_update();

-- Update the display of subjects in the UI
CREATE OR REPLACE VIEW subject_display AS
SELECT 
  id,
  name,
  code,
  status,
  created_at
FROM edu_subjects;

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';