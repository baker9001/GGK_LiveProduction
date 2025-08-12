-- Add a migration to ensure subject names and codes are properly formatted
DO $$
BEGIN
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
    -- If code is already in the name, return as is
    IF position(' - ' IN name) > 0 THEN
      RETURN name;
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
    formatted_name text;
  BEGIN
    -- Check if the name contains a code
    IF position(' - ' IN NEW.name) > 0 THEN
      -- Extract the code part
      extracted_code := extract_subject_code(NEW.name);
      
      -- If no code is provided or it's different from the extracted one, use the extracted code
      IF NEW.code IS NULL OR NEW.code = '' OR NEW.code != extracted_code THEN
        NEW.code := extracted_code;
      END IF;
    END IF;
    
    -- Format the name with code
    NEW.name := format_subject_name_with_code(NEW.name, NEW.code);
    
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  -- Create the trigger on edu_subjects table
  DROP TRIGGER IF EXISTS format_subject_trigger ON edu_subjects;
  CREATE TRIGGER format_subject_trigger
  BEFORE INSERT OR UPDATE ON edu_subjects
  FOR EACH ROW
  EXECUTE FUNCTION format_subject_before_insert_update();
END $$;