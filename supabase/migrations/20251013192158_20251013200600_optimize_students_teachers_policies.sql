/*
  # Optimize Students and Teachers RLS Policies
  
  1. Performance Improvements
    - Replace auth.uid() with (select auth.uid()) 
    - Optimizes ~40 policies for students and teachers tables
  
  2. Changes
    - Update all students table policies
    - Update all teachers table policies
    - Update related junction table policies
*/

-- =============================================
-- STUDENTS TABLE
-- =============================================

DROP POLICY IF EXISTS "Branch admins can create students in their branches" ON students;
DROP POLICY IF EXISTS "Branch admins can delete students in their branches" ON students;
DROP POLICY IF EXISTS "Branch admins can update students in their branches" ON students;
DROP POLICY IF EXISTS "Branch admins can view students in their branches" ON students;
DROP POLICY IF EXISTS "Entity admins can create students in their company" ON students;
DROP POLICY IF EXISTS "Entity admins can delete students in their company" ON students;
DROP POLICY IF EXISTS "Entity admins can update students in their company" ON students;
DROP POLICY IF EXISTS "Entity admins can view students in their company" ON students;
DROP POLICY IF EXISTS "School admins can create students in their schools" ON students;
DROP POLICY IF EXISTS "School admins can delete students in their schools" ON students;
DROP POLICY IF EXISTS "School admins can update students in their schools" ON students;
DROP POLICY IF EXISTS "School admins can view students in their schools" ON students;
DROP POLICY IF EXISTS "Students can update their own profile" ON students;
DROP POLICY IF EXISTS "Students can view their own record" ON students;
DROP POLICY IF EXISTS "System admins can manage students" ON students;
DROP POLICY IF EXISTS "System admins can view all students" ON students;

-- Recreate optimized
CREATE POLICY "Students can view their own record"
  ON students FOR SELECT
  TO authenticated
  USING (students.user_id = (SELECT auth.uid()));

CREATE POLICY "Students can update their own profile"
  ON students FOR UPDATE
  TO authenticated
  USING (students.user_id = (SELECT auth.uid()))
  WITH CHECK (students.user_id = (SELECT auth.uid()));

CREATE POLICY "Entity admins can view students in their company"
  ON students FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_users
      WHERE entity_users.user_id = (SELECT auth.uid())
      AND entity_users.company_id = students.company_id
      AND entity_users.is_company_admin = true
      AND entity_users.is_active = true
    )
  );

CREATE POLICY "School admins can view students in their schools"
  ON students FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_user_schools eus
      JOIN entity_users eu ON eu.id = eus.entity_user_id
      WHERE eu.user_id = (SELECT auth.uid())
      AND eus.school_id = students.school_id
      AND eu.is_active = true
    )
  );

CREATE POLICY "Branch admins can view students in their branches"
  ON students FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_user_branches eub
      JOIN entity_users eu ON eu.id = eub.entity_user_id
      WHERE eu.user_id = (SELECT auth.uid())
      AND eub.branch_id = students.branch_id
      AND eu.is_active = true
    )
  );

CREATE POLICY "Entity admins can create students in their company"
  ON students FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM entity_users
      WHERE entity_users.user_id = (SELECT auth.uid())
      AND entity_users.company_id = students.company_id
      AND entity_users.is_company_admin = true
      AND entity_users.is_active = true
    )
  );

CREATE POLICY "School admins can create students in their schools"
  ON students FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM entity_user_schools eus
      JOIN entity_users eu ON eu.id = eus.entity_user_id
      WHERE eu.user_id = (SELECT auth.uid())
      AND eus.school_id = students.school_id
      AND eu.is_active = true
    )
  );

CREATE POLICY "Branch admins can create students in their branches"
  ON students FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM entity_user_branches eub
      JOIN entity_users eu ON eu.id = eub.entity_user_id
      WHERE eu.user_id = (SELECT auth.uid())
      AND eub.branch_id = students.branch_id
      AND eu.is_active = true
    )
  );

CREATE POLICY "Entity admins can update students in their company"
  ON students FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_users
      WHERE entity_users.user_id = (SELECT auth.uid())
      AND entity_users.company_id = students.company_id
      AND entity_users.is_company_admin = true
      AND entity_users.is_active = true
    )
  );

CREATE POLICY "School admins can update students in their schools"
  ON students FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_user_schools eus
      JOIN entity_users eu ON eu.id = eus.entity_user_id
      WHERE eu.user_id = (SELECT auth.uid())
      AND eus.school_id = students.school_id
      AND eu.is_active = true
    )
  );

CREATE POLICY "Branch admins can update students in their branches"
  ON students FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_user_branches eub
      JOIN entity_users eu ON eu.id = eub.entity_user_id
      WHERE eu.user_id = (SELECT auth.uid())
      AND eub.branch_id = students.branch_id
      AND eu.is_active = true
    )
  );

CREATE POLICY "Entity admins can delete students in their company"
  ON students FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_users
      WHERE entity_users.user_id = (SELECT auth.uid())
      AND entity_users.company_id = students.company_id
      AND entity_users.is_company_admin = true
      AND entity_users.is_active = true
    )
  );

CREATE POLICY "School admins can delete students in their schools"
  ON students FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_user_schools eus
      JOIN entity_users eu ON eu.id = eus.entity_user_id
      WHERE eu.user_id = (SELECT auth.uid())
      AND eus.school_id = students.school_id
      AND eu.is_active = true
    )
  );

CREATE POLICY "Branch admins can delete students in their branches"
  ON students FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_user_branches eub
      JOIN entity_users eu ON eu.id = eub.entity_user_id
      WHERE eu.user_id = (SELECT auth.uid())
      AND eub.branch_id = students.branch_id
      AND eu.is_active = true
    )
  );

-- =============================================
-- TEACHERS TABLE  
-- =============================================

DROP POLICY IF EXISTS "Branch admins can create teachers in their branches" ON teachers;
DROP POLICY IF EXISTS "Branch admins can delete teachers in their branches" ON teachers;
DROP POLICY IF EXISTS "Branch admins can update teachers in their branches" ON teachers;
DROP POLICY IF EXISTS "Branch admins can view teachers in their branches" ON teachers;
DROP POLICY IF EXISTS "Entity admins can create teachers in their company" ON teachers;
DROP POLICY IF EXISTS "Entity admins can delete teachers in their company" ON teachers;
DROP POLICY IF EXISTS "Entity admins can update teachers in their company" ON teachers;
DROP POLICY IF EXISTS "Entity admins can view teachers in their company" ON teachers;
DROP POLICY IF EXISTS "School admins can create teachers in their schools" ON teachers;
DROP POLICY IF EXISTS "School admins can delete teachers in their schools" ON teachers;
DROP POLICY IF EXISTS "School admins can update teachers in their schools" ON teachers;
DROP POLICY IF EXISTS "School admins can view teachers in their schools" ON teachers;
DROP POLICY IF EXISTS "Teachers can view their own record" ON teachers;
DROP POLICY IF EXISTS "System admins can manage teachers" ON teachers;
DROP POLICY IF EXISTS "System admins can view all teachers" ON teachers;

-- Recreate optimized
CREATE POLICY "Teachers can view their own record"
  ON teachers FOR SELECT
  TO authenticated
  USING (teachers.user_id = (SELECT auth.uid()));

CREATE POLICY "Entity admins can view teachers in their company"
  ON teachers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_users
      WHERE entity_users.user_id = (SELECT auth.uid())
      AND entity_users.company_id = teachers.company_id
      AND entity_users.is_company_admin = true
      AND entity_users.is_active = true
    )
  );

CREATE POLICY "School admins can view teachers in their schools"
  ON teachers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teacher_schools ts
      JOIN entity_user_schools eus ON eus.school_id = ts.school_id
      JOIN entity_users eu ON eu.id = eus.entity_user_id
      WHERE ts.teacher_id = teachers.id
      AND eu.user_id = (SELECT auth.uid())
      AND eu.is_active = true
    )
  );

CREATE POLICY "Branch admins can view teachers in their branches"
  ON teachers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teacher_branches tb
      JOIN entity_user_branches eub ON eub.branch_id = tb.branch_id
      JOIN entity_users eu ON eu.id = eub.entity_user_id
      WHERE tb.teacher_id = teachers.id
      AND eu.user_id = (SELECT auth.uid())
      AND eu.is_active = true
    )
  );

CREATE POLICY "Entity admins can create teachers in their company"
  ON teachers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM entity_users
      WHERE entity_users.user_id = (SELECT auth.uid())
      AND entity_users.company_id = teachers.company_id
      AND entity_users.is_company_admin = true
      AND entity_users.is_active = true
    )
  );

CREATE POLICY "Entity admins can update teachers in their company"
  ON teachers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_users
      WHERE entity_users.user_id = (SELECT auth.uid())
      AND entity_users.company_id = teachers.company_id
      AND entity_users.is_company_admin = true
      AND entity_users.is_active = true
    )
  );

CREATE POLICY "Entity admins can delete teachers in their company"
  ON teachers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_users
      WHERE entity_users.user_id = (SELECT auth.uid())
      AND entity_users.company_id = teachers.company_id
      AND entity_users.is_company_admin = true
      AND entity_users.is_active = true
    )
  );