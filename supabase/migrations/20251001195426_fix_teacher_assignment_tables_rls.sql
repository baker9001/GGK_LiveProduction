/*
  # Fix Teacher Assignment Tables RLS

  ## Overview
  Removes overly permissive USING (true) policies from teacher assignment tables
  and adds proper company-scoped access control.

  ## Tables Fixed
  - teacher_programs (was USING (true))
  - teacher_subjects (was USING (true))
  - teacher_branches (add RLS)
  - teacher_departments (add RLS)
  - teacher_grade_levels (add RLS)
  - teacher_schools (add RLS)
  - teacher_sections (add RLS)

  ## Security Model
  All teacher assignments scoped through teachers table -> company_id
*/

-- ============================================================================
-- FIX OVERLY PERMISSIVE POLICIES
-- ============================================================================

-- teacher_programs
DROP POLICY IF EXISTS "Authenticated users can manage teacher_programs" ON teacher_programs;

CREATE POLICY "Entity users manage teacher programs in company"
  ON teacher_programs FOR ALL TO authenticated
  USING (
    teacher_id IN (
      SELECT t.id FROM teachers t
      JOIN entity_users eu ON eu.company_id = t.company_id
      WHERE eu.user_id = auth.uid() AND eu.is_active = true
    )
  )
  WITH CHECK (
    teacher_id IN (
      SELECT t.id FROM teachers t
      JOIN entity_users eu ON eu.company_id = t.company_id
      WHERE eu.user_id = auth.uid() AND eu.is_active = true
    )
  );

-- teacher_subjects
DROP POLICY IF EXISTS "Authenticated users can manage teacher_subjects" ON teacher_subjects;

CREATE POLICY "Entity users manage teacher subjects in company"
  ON teacher_subjects FOR ALL TO authenticated
  USING (
    teacher_id IN (
      SELECT t.id FROM teachers t
      JOIN entity_users eu ON eu.company_id = t.company_id
      WHERE eu.user_id = auth.uid() AND eu.is_active = true
    )
  )
  WITH CHECK (
    teacher_id IN (
      SELECT t.id FROM teachers t
      JOIN entity_users eu ON eu.company_id = t.company_id
      WHERE eu.user_id = auth.uid() AND eu.is_active = true
    )
  );

-- ============================================================================
-- ADD RLS TO REMAINING TEACHER ASSIGNMENT TABLES
-- ============================================================================

-- teacher_branches
ALTER TABLE teacher_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Entity users manage teacher branches in company"
  ON teacher_branches FOR ALL TO authenticated
  USING (
    teacher_id IN (
      SELECT t.id FROM teachers t
      JOIN entity_users eu ON eu.company_id = t.company_id
      WHERE eu.user_id = auth.uid() AND eu.is_active = true
    )
  )
  WITH CHECK (
    teacher_id IN (
      SELECT t.id FROM teachers t
      JOIN entity_users eu ON eu.company_id = t.company_id
      WHERE eu.user_id = auth.uid() AND eu.is_active = true
    )
  );

-- teacher_departments
ALTER TABLE teacher_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Entity users manage teacher departments in company"
  ON teacher_departments FOR ALL TO authenticated
  USING (
    teacher_id IN (
      SELECT t.id FROM teachers t
      JOIN entity_users eu ON eu.company_id = t.company_id
      WHERE eu.user_id = auth.uid() AND eu.is_active = true
    )
  )
  WITH CHECK (
    teacher_id IN (
      SELECT t.id FROM teachers t
      JOIN entity_users eu ON eu.company_id = t.company_id
      WHERE eu.user_id = auth.uid() AND eu.is_active = true
    )
  );

-- teacher_grade_levels
ALTER TABLE teacher_grade_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Entity users manage teacher grade levels in company"
  ON teacher_grade_levels FOR ALL TO authenticated
  USING (
    teacher_id IN (
      SELECT t.id FROM teachers t
      JOIN entity_users eu ON eu.company_id = t.company_id
      WHERE eu.user_id = auth.uid() AND eu.is_active = true
    )
  )
  WITH CHECK (
    teacher_id IN (
      SELECT t.id FROM teachers t
      JOIN entity_users eu ON eu.company_id = t.company_id
      WHERE eu.user_id = auth.uid() AND eu.is_active = true
    )
  );

-- teacher_schools
ALTER TABLE teacher_schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Entity users manage teacher schools in company"
  ON teacher_schools FOR ALL TO authenticated
  USING (
    teacher_id IN (
      SELECT t.id FROM teachers t
      JOIN entity_users eu ON eu.company_id = t.company_id
      WHERE eu.user_id = auth.uid() AND eu.is_active = true
    )
  )
  WITH CHECK (
    teacher_id IN (
      SELECT t.id FROM teachers t
      JOIN entity_users eu ON eu.company_id = t.company_id
      WHERE eu.user_id = auth.uid() AND eu.is_active = true
    )
  );

-- teacher_sections
ALTER TABLE teacher_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Entity users manage teacher sections in company"
  ON teacher_sections FOR ALL TO authenticated
  USING (
    teacher_id IN (
      SELECT t.id FROM teachers t
      JOIN entity_users eu ON eu.company_id = t.company_id
      WHERE eu.user_id = auth.uid() AND eu.is_active = true
    )
  )
  WITH CHECK (
    teacher_id IN (
      SELECT t.id FROM teachers t
      JOIN entity_users eu ON eu.company_id = t.company_id
      WHERE eu.user_id = auth.uid() AND eu.is_active = true
    )
  );
