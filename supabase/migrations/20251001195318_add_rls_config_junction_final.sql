/*
  # Add RLS to Configuration and Junction Tables (Final)

  ## Tables Updated
  - academic_years, grade_levels, class_sections (configuration)
  - entity_user_schools, entity_user_branches (user assignments)
  - department_branches (department assignments)
  - grade_level_branches, grade_level_schools (grade assignments)
  - class_section_departments (section assignments)
  - academic_year_schools (year assignments)
*/

-- ============================================================================
-- CONFIGURATION TABLES
-- ============================================================================

-- academic_years
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Entity users manage own academic years" ON academic_years;

CREATE POLICY "Entity users manage academic years in scope"
  ON academic_years FOR ALL TO authenticated
  USING (
    school_id IN (
      SELECT s.id FROM schools s
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE eu.user_id = auth.uid() AND eu.is_active = true
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT s.id FROM schools s
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE eu.user_id = auth.uid() AND eu.is_active = true
    )
  );

-- grade_levels
ALTER TABLE grade_levels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Entity users manage own grade levels" ON grade_levels;
DROP POLICY IF EXISTS "Company members access" ON grade_levels;

CREATE POLICY "Entity users manage grade levels in company"
  ON grade_levels FOR ALL TO authenticated
  USING (
    school_id IN (
      SELECT s.id FROM schools s
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE eu.user_id = auth.uid() AND eu.is_active = true
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT s.id FROM schools s
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE eu.user_id = auth.uid() AND eu.is_active = true
    )
  );

-- class_sections
ALTER TABLE class_sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Entity users manage own class sections" ON class_sections;

CREATE POLICY "Entity users manage class sections in scope"
  ON class_sections FOR ALL TO authenticated
  USING (
    grade_level_id IN (
      SELECT gl.id FROM grade_levels gl
      JOIN schools s ON s.id = gl.school_id
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE eu.user_id = auth.uid() AND eu.is_active = true
    )
  )
  WITH CHECK (
    grade_level_id IN (
      SELECT gl.id FROM grade_levels gl
      JOIN schools s ON s.id = gl.school_id
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE eu.user_id = auth.uid() AND eu.is_active = true
    )
  );

-- ============================================================================
-- JUNCTION TABLES
-- ============================================================================

-- entity_user_schools
ALTER TABLE entity_user_schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Entity admins manage user-school assignments"
  ON entity_user_schools FOR ALL TO authenticated
  USING (
    entity_user_id IN (
      SELECT id FROM entity_users 
      WHERE company_id IN (
        SELECT company_id FROM entity_users WHERE user_id = auth.uid() AND is_active = true
      )
    )
  )
  WITH CHECK (
    entity_user_id IN (
      SELECT id FROM entity_users 
      WHERE company_id IN (
        SELECT company_id FROM entity_users WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- entity_user_branches
ALTER TABLE entity_user_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Entity admins manage user-branch assignments"
  ON entity_user_branches FOR ALL TO authenticated
  USING (
    entity_user_id IN (
      SELECT id FROM entity_users 
      WHERE company_id IN (
        SELECT company_id FROM entity_users WHERE user_id = auth.uid() AND is_active = true
      )
    )
  )
  WITH CHECK (
    entity_user_id IN (
      SELECT id FROM entity_users 
      WHERE company_id IN (
        SELECT company_id FROM entity_users WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- department_branches
ALTER TABLE department_branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "department_branches_view_policy" ON department_branches;
DROP POLICY IF EXISTS "department_branches_insert_policy" ON department_branches;
DROP POLICY IF EXISTS "department_branches_update_policy" ON department_branches;
DROP POLICY IF EXISTS "department_branches_delete_policy" ON department_branches;

CREATE POLICY "Entity users manage department-branch assignments"
  ON department_branches FOR ALL TO authenticated
  USING (
    department_id IN (
      SELECT d.id FROM departments d
      JOIN entity_users eu ON eu.company_id = d.company_id
      WHERE eu.user_id = auth.uid() AND eu.is_active = true
    )
  )
  WITH CHECK (
    department_id IN (
      SELECT d.id FROM departments d
      JOIN entity_users eu ON eu.company_id = d.company_id
      WHERE eu.user_id = auth.uid() AND eu.is_active = true
    )
  );

-- Enable RLS on remaining junction tables (policies already exist)
ALTER TABLE department_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_level_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_level_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_section_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_year_schools ENABLE ROW LEVEL SECURITY;
