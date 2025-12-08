/*
  # Optimize RLS Auth Calls - Teacher Association Tables

  1. Performance Optimization
    - Wrap auth function calls in SELECT for teacher association tables
    - Prevents re-evaluation for each row
    - Critical performance improvement at scale

  2. Tables Optimized
    - teacher_branches, teacher_schools, teacher_programs
    - teacher_subjects, teacher_departments, teacher_grade_levels
    - teacher_sections
*/

-- Teacher Branches: Optimize auth calls
DROP POLICY IF EXISTS "Users can manage teacher branches in their scope" ON teacher_branches;
CREATE POLICY "Users can manage teacher branches in their scope"
  ON teacher_branches FOR ALL
  TO authenticated
  USING (
    teacher_id IN (
      SELECT t.id FROM teachers t
      JOIN entity_users eu ON eu.company_id = t.company_id
      WHERE eu.user_id = (SELECT auth.uid())
      AND eu.is_active = true
    )
  );

-- Teacher Schools: Optimize auth calls
DROP POLICY IF EXISTS "Users can manage teacher schools in their scope" ON teacher_schools;
CREATE POLICY "Users can manage teacher schools in their scope"
  ON teacher_schools FOR ALL
  TO authenticated
  USING (
    teacher_id IN (
      SELECT t.id FROM teachers t
      JOIN entity_users eu ON eu.company_id = t.company_id
      WHERE eu.user_id = (SELECT auth.uid())
      AND eu.is_active = true
    )
  );

-- Teacher Programs: Optimize auth calls
DROP POLICY IF EXISTS "Users can manage teacher programs in their scope" ON teacher_programs;
CREATE POLICY "Users can manage teacher programs in their scope"
  ON teacher_programs FOR ALL
  TO authenticated
  USING (
    teacher_id IN (
      SELECT t.id FROM teachers t
      JOIN entity_users eu ON eu.company_id = t.company_id
      WHERE eu.user_id = (SELECT auth.uid())
      AND eu.is_active = true
    )
  );

-- Teacher Subjects: Optimize auth calls
DROP POLICY IF EXISTS "Users can manage teacher subjects in their scope" ON teacher_subjects;
CREATE POLICY "Users can manage teacher subjects in their scope"
  ON teacher_subjects FOR ALL
  TO authenticated
  USING (
    teacher_id IN (
      SELECT t.id FROM teachers t
      JOIN entity_users eu ON eu.company_id = t.company_id
      WHERE eu.user_id = (SELECT auth.uid())
      AND eu.is_active = true
    )
  );

-- Teacher Departments: Optimize auth calls
DROP POLICY IF EXISTS "Users can manage teacher departments in their scope" ON teacher_departments;
CREATE POLICY "Users can manage teacher departments in their scope"
  ON teacher_departments FOR ALL
  TO authenticated
  USING (
    teacher_id IN (
      SELECT t.id FROM teachers t
      JOIN entity_users eu ON eu.company_id = t.company_id
      WHERE eu.user_id = (SELECT auth.uid())
      AND eu.is_active = true
    )
  );

-- Teacher Grade Levels: Optimize auth calls
DROP POLICY IF EXISTS "Users can manage teacher grade levels in their scope" ON teacher_grade_levels;
CREATE POLICY "Users can manage teacher grade levels in their scope"
  ON teacher_grade_levels FOR ALL
  TO authenticated
  USING (
    teacher_id IN (
      SELECT t.id FROM teachers t
      JOIN entity_users eu ON eu.company_id = t.company_id
      WHERE eu.user_id = (SELECT auth.uid())
      AND eu.is_active = true
    )
  );

-- Teacher Sections: Optimize auth calls
DROP POLICY IF EXISTS "Users can manage teacher sections in their scope" ON teacher_sections;
CREATE POLICY "Users can manage teacher sections in their scope"
  ON teacher_sections FOR ALL
  TO authenticated
  USING (
    teacher_id IN (
      SELECT t.id FROM teachers t
      JOIN entity_users eu ON eu.company_id = t.company_id
      WHERE eu.user_id = (SELECT auth.uid())
      AND eu.is_active = true
    )
  );