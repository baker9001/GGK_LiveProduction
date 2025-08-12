/*
  # Add course_id column to edu_units table

  1. Changes
    - Add course_id column to edu_units table
    - Add foreign key constraint to edu_courses table
    - Update existing records to use a default course

  2. Security
    - No changes to RLS policies needed
*/

-- First, check if the column already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'edu_units' AND column_name = 'course_id'
  ) THEN
    -- Add the course_id column
    ALTER TABLE edu_units ADD COLUMN course_id uuid;
    
    -- Add foreign key constraint
    ALTER TABLE edu_units 
    ADD CONSTRAINT edu_units_course_id_fkey 
    FOREIGN KEY (course_id) REFERENCES edu_courses(id) ON DELETE SET NULL;
    
    -- Create index for better performance
    CREATE INDEX idx_edu_units_course_id ON edu_units(course_id);
  END IF;
END $$;

-- Create a function to update existing units with a default course
CREATE OR REPLACE FUNCTION update_units_with_default_course()
RETURNS void AS $$
DECLARE
  subject_record RECORD;
  default_course_id uuid;
BEGIN
  -- Loop through each subject that has units without course_id
  FOR subject_record IN 
    SELECT DISTINCT subject_id 
    FROM edu_units 
    WHERE course_id IS NULL
  LOOP
    -- Try to find an existing course for this subject
    SELECT id INTO default_course_id
    FROM edu_courses
    WHERE subject_id = subject_record.subject_id
    AND status = 'active'
    LIMIT 1;
    
    -- If no course exists, create a default one
    IF default_course_id IS NULL THEN
      WITH subject_info AS (
        SELECT name, code FROM edu_subjects WHERE id = subject_record.subject_id
      ),
      inserted_course AS (
        INSERT INTO edu_courses (
          subject_id, 
          name, 
          code, 
          level, 
          status
        )
        SELECT 
          subject_record.subject_id,
          name || ' - General',
          COALESCE(code, 'GEN') || '-001',
          'General',
          'active'
        FROM subject_info
        RETURNING id
      )
      SELECT id INTO default_course_id FROM inserted_course;
    END IF;
    
    -- Update all units for this subject to use the default course
    UPDATE edu_units
    SET course_id = default_course_id
    WHERE subject_id = subject_record.subject_id
    AND course_id IS NULL;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the function to update existing units
SELECT update_units_with_default_course();

-- Drop the function as it's no longer needed
DROP FUNCTION update_units_with_default_course();