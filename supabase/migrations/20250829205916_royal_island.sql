/*
  # Enhanced Grade Linking System - Junction Tables

  1. New Tables
    - `grade_level_branches`
      - Links grade levels to specific branches
      - Tracks capacity per branch-grade combination
      - Enables branch-specific grade management
    - `grade_level_departments` 
      - Associates grade levels with academic departments
      - Supports primary/secondary department relationships
      - Enables department-based academic structure
    - `class_section_departments`
      - Links class sections to departments
      - Supports departmental class organization
      - Enables department-based scheduling

  2. Security
    - Enable RLS on all new tables
    - Add policies for company-scoped access
    - Ensure proper data isolation

  3. Indexes
    - Optimized queries for common lookup patterns
    - Foreign key performance optimization
    - Unique constraints for data integrity
*/

-- Create grade_level_branches junction table
CREATE TABLE IF NOT EXISTS grade_level_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_level_id uuid NOT NULL REFERENCES grade_levels(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  capacity integer DEFAULT 30 CHECK (capacity > 0),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  UNIQUE(grade_level_id, branch_id)
);

-- Create grade_level_departments junction table  
CREATE TABLE IF NOT EXISTS grade_level_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_level_id uuid NOT NULL REFERENCES grade_levels(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT false,
  relationship_type text DEFAULT 'associated' CHECK (relationship_type IN ('primary', 'associated', 'optional')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(grade_level_id, department_id)
);

-- Create class_section_departments junction table
CREATE TABLE IF NOT EXISTS class_section_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_section_id uuid NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(class_section_id, department_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_grade_level_branches_grade ON grade_level_branches(grade_level_id);
CREATE INDEX IF NOT EXISTS idx_grade_level_branches_branch ON grade_level_branches(branch_id);
CREATE INDEX IF NOT EXISTS idx_grade_level_branches_active ON grade_level_branches(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_grade_level_departments_grade ON grade_level_departments(grade_level_id);
CREATE INDEX IF NOT EXISTS idx_grade_level_departments_dept ON grade_level_departments(department_id);
CREATE INDEX IF NOT EXISTS idx_grade_level_departments_primary ON grade_level_departments(is_primary) WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_class_section_departments_section ON class_section_departments(class_section_id);
CREATE INDEX IF NOT EXISTS idx_class_section_departments_dept ON class_section_departments(department_id);

-- Enable Row Level Security
ALTER TABLE grade_level_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_level_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_section_departments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for grade_level_branches
CREATE POLICY "Company members can manage grade level branches"
  ON grade_level_branches
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM grade_levels gl
      JOIN schools s ON gl.school_id = s.id
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE gl.id = grade_level_branches.grade_level_id
      AND eu.user_id = auth.uid()
      AND eu.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM grade_levels gl
      JOIN schools s ON gl.school_id = s.id  
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE gl.id = grade_level_branches.grade_level_id
      AND eu.user_id = auth.uid()
      AND eu.is_active = true
    )
  );

-- Create RLS policies for grade_level_departments
CREATE POLICY "Company members can manage grade level departments"
  ON grade_level_departments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM grade_levels gl
      JOIN schools s ON gl.school_id = s.id
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE gl.id = grade_level_departments.grade_level_id
      AND eu.user_id = auth.uid()
      AND eu.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM grade_levels gl
      JOIN schools s ON gl.school_id = s.id
      JOIN entity_users eu ON eu.company_id = s.company_id  
      WHERE gl.id = grade_level_departments.grade_level_id
      AND eu.user_id = auth.uid()
      AND eu.is_active = true
    )
  );

-- Create RLS policies for class_section_departments
CREATE POLICY "Company members can manage class section departments"
  ON class_section_departments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM class_sections cs
      JOIN grade_levels gl ON cs.grade_level_id = gl.id
      JOIN schools s ON gl.school_id = s.id
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE cs.id = class_section_departments.class_section_id
      AND eu.user_id = auth.uid()
      AND eu.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM class_sections cs
      JOIN grade_levels gl ON cs.grade_level_id = gl.id
      JOIN schools s ON gl.school_id = s.id
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE cs.id = class_section_departments.class_section_id
      AND eu.user_id = auth.uid()
      AND eu.is_active = true
    )
  );

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_grade_level_branches_updated_at
  BEFORE UPDATE ON grade_level_branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grade_level_departments_updated_at  
  BEFORE UPDATE ON grade_level_departments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();