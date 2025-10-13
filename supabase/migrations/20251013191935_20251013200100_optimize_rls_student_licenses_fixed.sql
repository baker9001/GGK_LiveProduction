/*
  # Optimize RLS Auth Function Calls - Student Licenses
  
  1. Performance Improvements
    - Replace auth.uid() with (select auth.uid()) in RLS policies
    - Prevents re-evaluation for each row
    - Significantly improves query performance at scale
  
  2. Changes
    - Update all student_licenses policies
    - Maintains same security logic with better performance
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Branch admins can manage licenses for students in their branche" ON student_licenses;
DROP POLICY IF EXISTS "Entity admins can manage all student licenses in their company" ON student_licenses;
DROP POLICY IF EXISTS "School admins can manage licenses for students in their schools" ON student_licenses;
DROP POLICY IF EXISTS "Students can activate their own pending licenses" ON student_licenses;
DROP POLICY IF EXISTS "Students can view their own licenses" ON student_licenses;
DROP POLICY IF EXISTS "System admins can create student licenses" ON student_licenses;
DROP POLICY IF EXISTS "System admins can delete student licenses" ON student_licenses;
DROP POLICY IF EXISTS "System admins can update all student licenses" ON student_licenses;
DROP POLICY IF EXISTS "System admins can view all student licenses" ON student_licenses;

-- Recreate with optimized auth calls

-- SELECT policies
CREATE POLICY "Students can view their own licenses"
  ON student_licenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = student_licenses.student_id
      AND students.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "System admins can view all student licenses"
  ON student_licenses FOR SELECT
  TO authenticated
  USING (is_admin_user((SELECT auth.uid())));

-- INSERT policies
CREATE POLICY "System admins can create student licenses"
  ON student_licenses FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_user((SELECT auth.uid())));

-- UPDATE policies
CREATE POLICY "Students can activate their own pending licenses"
  ON student_licenses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = student_licenses.student_id
      AND students.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = student_licenses.student_id
      AND students.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "System admins can update all student licenses"
  ON student_licenses FOR UPDATE
  TO authenticated
  USING (is_admin_user((SELECT auth.uid())))
  WITH CHECK (is_admin_user((SELECT auth.uid())));

CREATE POLICY "Branch admins can update licenses"
  ON student_licenses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN entity_users eu ON eu.user_id = (SELECT auth.uid())
      JOIN entity_user_branches eub ON eub.entity_user_id = eu.id
      WHERE s.id = student_licenses.student_id
      AND s.branch_id = eub.branch_id
      AND eu.is_active = true
    )
  );

CREATE POLICY "Entity admins can update student licenses"
  ON student_licenses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN entity_users eu ON eu.user_id = (SELECT auth.uid())
      WHERE s.id = student_licenses.student_id
      AND s.company_id = eu.company_id
      AND eu.is_company_admin = true
      AND eu.is_active = true
    )
  );

CREATE POLICY "School admins can update licenses"
  ON student_licenses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN entity_users eu ON eu.user_id = (SELECT auth.uid())
      JOIN entity_user_schools eus ON eus.entity_user_id = eu.id
      WHERE s.id = student_licenses.student_id
      AND s.school_id = eus.school_id
      AND eu.is_active = true
    )
  );

-- DELETE policies
CREATE POLICY "System admins can delete student licenses"
  ON student_licenses FOR DELETE
  TO authenticated
  USING (is_admin_user((SELECT auth.uid())));