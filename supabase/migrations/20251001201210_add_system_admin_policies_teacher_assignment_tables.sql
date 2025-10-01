/*
  # Add System Admin Policies to Teacher Assignment Tables

  ## Overview
  Adds comprehensive system admin (admin_users) policies to all teacher assignment
  and relationship tables that link teachers to programs, subjects, branches, schools,
  departments, grade levels, and sections.

  ## Tables Updated
  1. **teacher_programs** - Teacher to program assignments
  2. **teacher_subjects** - Teacher to subject assignments
  3. **teacher_branches** - Teacher to branch assignments
  4. **teacher_schools** - Teacher to school assignments
  5. **teacher_departments** - Teacher to department assignments
  6. **teacher_grade_levels** - Teacher to grade level assignments
  7. **teacher_sections** - Teacher to section assignments

  ## Security Model
  - System admins get full access to all teacher assignment data
  - Existing company-scoped policies remain active
  - System admin policies enable platform-wide teacher management
*/

-- ============================================================================
-- TEACHER_PROGRAMS TABLE
-- ============================================================================

CREATE POLICY "System admins can view all teacher programs"
  ON teacher_programs FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create teacher programs"
  ON teacher_programs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all teacher programs"
  ON teacher_programs FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete teacher programs"
  ON teacher_programs FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- TEACHER_SUBJECTS TABLE
-- ============================================================================

CREATE POLICY "System admins can view all teacher subjects"
  ON teacher_subjects FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create teacher subjects"
  ON teacher_subjects FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all teacher subjects"
  ON teacher_subjects FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete teacher subjects"
  ON teacher_subjects FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- TEACHER_BRANCHES TABLE
-- ============================================================================

CREATE POLICY "System admins can view all teacher branches"
  ON teacher_branches FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create teacher branches"
  ON teacher_branches FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all teacher branches"
  ON teacher_branches FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete teacher branches"
  ON teacher_branches FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- TEACHER_SCHOOLS TABLE
-- ============================================================================

CREATE POLICY "System admins can view all teacher schools"
  ON teacher_schools FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create teacher schools"
  ON teacher_schools FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all teacher schools"
  ON teacher_schools FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete teacher schools"
  ON teacher_schools FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- TEACHER_DEPARTMENTS TABLE
-- ============================================================================

CREATE POLICY "System admins can view all teacher departments"
  ON teacher_departments FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create teacher departments"
  ON teacher_departments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all teacher departments"
  ON teacher_departments FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete teacher departments"
  ON teacher_departments FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- TEACHER_GRADE_LEVELS TABLE
-- ============================================================================

CREATE POLICY "System admins can view all teacher grade levels"
  ON teacher_grade_levels FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create teacher grade levels"
  ON teacher_grade_levels FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all teacher grade levels"
  ON teacher_grade_levels FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete teacher grade levels"
  ON teacher_grade_levels FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- TEACHER_SECTIONS TABLE
-- ============================================================================

CREATE POLICY "System admins can view all teacher sections"
  ON teacher_sections FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create teacher sections"
  ON teacher_sections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all teacher sections"
  ON teacher_sections FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete teacher sections"
  ON teacher_sections FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));
