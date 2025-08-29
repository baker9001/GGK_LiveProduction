/*
  # Fix Multi-Select Configuration Tables

  This migration updates the configuration tables to properly support multi-school/multi-branch relationships
  for departments, grade levels, and class sections.

  ## Changes Made

  1. **Grade Levels**: Can now belong to multiple schools
  2. **Academic Years**: Can now span multiple schools  
  3. **Departments**: Can now operate across multiple schools
  4. **Class Sections**: Updated field names for clarity

  ## Security
  - Maintains existing RLS policies
  - Preserves data integrity with proper constraints
*/

-- Update grade_levels table to support multiple schools
-- Note: We'll handle this through a junction table approach for proper normalization

-- Create grade_level_schools junction table
CREATE TABLE IF NOT EXISTS grade_level_schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_level_id uuid NOT NULL REFERENCES grade_levels(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(grade_level_id, school_id)
);

-- Create academic_year_schools junction table  
CREATE TABLE IF NOT EXISTS academic_year_schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id uuid NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(academic_year_id, school_id)
);

-- Create department_schools junction table
CREATE TABLE IF NOT EXISTS department_schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(department_id, school_id)
);

-- Update class_sections table with better field names
DO $$
BEGIN
  -- Add new columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'class_sections' AND column_name = 'classroom_number'
  ) THEN
    ALTER TABLE class_sections ADD COLUMN classroom_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'class_sections' AND column_name = 'building'
  ) THEN
    ALTER TABLE class_sections ADD COLUMN building text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'class_sections' AND column_name = 'floor'
  ) THEN
    ALTER TABLE class_sections ADD COLUMN floor integer;
  END IF;
END $$;

-- Enable RLS on new junction tables
ALTER TABLE grade_level_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_year_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_schools ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for junction tables
CREATE POLICY "Company members can manage grade level schools"
  ON grade_level_schools
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM grade_levels gl
      JOIN schools s ON s.id = grade_level_schools.school_id
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE gl.id = grade_level_schools.grade_level_id
      AND eu.user_id = auth.uid()
      AND eu.is_active = true
    )
  );

CREATE POLICY "Company members can manage academic year schools"
  ON academic_year_schools
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM academic_years ay
      JOIN schools s ON s.id = academic_year_schools.school_id
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE ay.id = academic_year_schools.academic_year_id
      AND eu.user_id = auth.uid()
      AND eu.is_active = true
    )
  );

CREATE POLICY "Company members can manage department schools"
  ON department_schools
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM departments d
      JOIN schools s ON s.id = department_schools.school_id
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE d.id = department_schools.department_id
      AND eu.user_id = auth.uid()
      AND eu.is_active = true
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_grade_level_schools_grade_level ON grade_level_schools(grade_level_id);
CREATE INDEX IF NOT EXISTS idx_grade_level_schools_school ON grade_level_schools(school_id);

CREATE INDEX IF NOT EXISTS idx_academic_year_schools_year ON academic_year_schools(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_academic_year_schools_school ON academic_year_schools(school_id);

CREATE INDEX IF NOT EXISTS idx_department_schools_department ON department_schools(department_id);
CREATE INDEX IF NOT EXISTS idx_department_schools_school ON department_schools(school_id);

-- Create helper functions for managing multi-school relationships

-- Function to get schools for a grade level
CREATE OR REPLACE FUNCTION get_grade_level_schools(grade_level_uuid uuid)
RETURNS TABLE(school_id uuid, school_name text) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name
  FROM schools s
  JOIN grade_level_schools gls ON gls.school_id = s.id
  WHERE gls.grade_level_id = grade_level_uuid
  ORDER BY s.name;
END;
$$ LANGUAGE plpgsql;

-- Function to get schools for an academic year
CREATE OR REPLACE FUNCTION get_academic_year_schools(academic_year_uuid uuid)
RETURNS TABLE(school_id uuid, school_name text) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name
  FROM schools s
  JOIN academic_year_schools ays ON ays.school_id = s.id
  WHERE ays.academic_year_id = academic_year_uuid
  ORDER BY s.name;
END;
$$ LANGUAGE plpgsql;

-- Function to get schools for a department
CREATE OR REPLACE FUNCTION get_department_schools(department_uuid uuid)
RETURNS TABLE(school_id uuid, school_name text) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name
  FROM schools s
  JOIN department_schools ds ON ds.school_id = s.id
  WHERE ds.department_id = department_uuid
  ORDER BY s.name;
END;
$$ LANGUAGE plpgsql;