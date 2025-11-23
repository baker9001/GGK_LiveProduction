/*
  # Optimize RLS Auth Calls - Critical Tables Part 1

  1. Performance Optimization
    - Wrap auth function calls in SELECT to initialize once per query
    - Prevents re-evaluation for each row
    - Critical performance improvement at scale
  
  2. Tables Optimized (High Priority)
    - mock_exams
    - teachers
    - students
    - materials
    - licenses
    - past_paper_import_sessions
*/

-- Mock Exams: Entity admins can create
DROP POLICY IF EXISTS "Entity admins can create mock exams in their company" ON mock_exams;
CREATE POLICY "Entity admins can create mock exams in their company"
  ON mock_exams FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT eu.company_id 
      FROM entity_users eu 
      WHERE eu.user_id = (SELECT auth.uid())
      AND eu.is_active = true
    )
  );

-- Mock Exams: School admins can create
DROP POLICY IF EXISTS "School admins can create mock exams for their schools" ON mock_exams;
CREATE POLICY "School admins can create mock exams for their schools"
  ON mock_exams FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM entity_admin_scope eas
      JOIN schools s ON s.id = eas.school_id
      WHERE eas.user_id = (SELECT auth.uid())
      AND eas.is_active = true
      AND s.company_id = company_id
    )
  );

-- Teachers: Branch admins manage
DROP POLICY IF EXISTS "Branch admins manage teachers in branches" ON teachers;
CREATE POLICY "Branch admins manage teachers in branches"
  ON teachers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM entity_admin_scope eas
      WHERE eas.user_id = (SELECT auth.uid())
      AND eas.branch_id = teachers.branch_id
      AND eas.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM entity_admin_scope eas
      WHERE eas.user_id = (SELECT auth.uid())
      AND eas.branch_id = teachers.branch_id
      AND eas.is_active = true
    )
  );

-- Teachers: Entity admins manage
DROP POLICY IF EXISTS "Entity admins manage teachers in company" ON teachers;
CREATE POLICY "Entity admins manage teachers in company"
  ON teachers FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT eu.company_id
      FROM entity_users eu
      WHERE eu.user_id = (SELECT auth.uid())
      AND eu.is_company_admin = true
      AND eu.is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT eu.company_id
      FROM entity_users eu
      WHERE eu.user_id = (SELECT auth.uid())
      AND eu.is_company_admin = true
      AND eu.is_active = true
    )
  );

-- Teachers: School admins manage
DROP POLICY IF EXISTS "School admins manage teachers in schools" ON teachers;
CREATE POLICY "School admins manage teachers in schools"
  ON teachers FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT eas.school_id
      FROM entity_admin_scope eas
      WHERE eas.user_id = (SELECT auth.uid())
      AND eas.is_active = true
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT eas.school_id
      FROM entity_admin_scope eas
      WHERE eas.user_id = (SELECT auth.uid())
      AND eas.is_active = true
    )
  );

-- Teachers: View own record
DROP POLICY IF EXISTS "School and branch admins can view teachers" ON teachers;
CREATE POLICY "School and branch admins can view teachers"
  ON teachers FOR SELECT
  TO authenticated
  USING (
    auth_user_id = (SELECT auth.uid())
    OR
    EXISTS (
      SELECT 1
      FROM entity_admin_scope eas
      WHERE eas.user_id = (SELECT auth.uid())
      AND (eas.school_id = teachers.school_id OR eas.branch_id = teachers.branch_id)
      AND eas.is_active = true
    )
  );

-- Students: Branch admins manage
DROP POLICY IF EXISTS "Branch admins manage students in branches" ON students;
CREATE POLICY "Branch admins manage students in branches"
  ON students FOR ALL
  TO authenticated
  USING (
    branch_id IN (
      SELECT eas.branch_id
      FROM entity_admin_scope eas
      WHERE eas.user_id = (SELECT auth.uid())
      AND eas.is_active = true
    )
  )
  WITH CHECK (
    branch_id IN (
      SELECT eas.branch_id
      FROM entity_admin_scope eas
      WHERE eas.user_id = (SELECT auth.uid())
      AND eas.is_active = true
    )
  );

-- Students: Entity admins manage
DROP POLICY IF EXISTS "Entity admins manage students in company" ON students;
CREATE POLICY "Entity admins manage students in company"
  ON students FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT eu.company_id
      FROM entity_users eu
      WHERE eu.user_id = (SELECT auth.uid())
      AND eu.is_company_admin = true
      AND eu.is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT eu.company_id
      FROM entity_users eu
      WHERE eu.user_id = (SELECT auth.uid())
      AND eu.is_company_admin = true
      AND eu.is_active = true
    )
  );

-- Students: School admins manage
DROP POLICY IF EXISTS "School admins manage students in schools" ON students;
CREATE POLICY "School admins manage students in schools"
  ON students FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT eas.school_id
      FROM entity_admin_scope eas
      WHERE eas.user_id = (SELECT auth.uid())
      AND eas.is_active = true
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT eas.school_id
      FROM entity_admin_scope eas
      WHERE eas.user_id = (SELECT auth.uid())
      AND eas.is_active = true
    )
  );

-- Materials: System admin policies
DROP POLICY IF EXISTS "System admins can create materials" ON materials;
CREATE POLICY "System admins can create materials"
  ON materials FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

DROP POLICY IF EXISTS "System admins can update materials" ON materials;
CREATE POLICY "System admins can update materials"
  ON materials FOR UPDATE
  TO authenticated
  USING (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

DROP POLICY IF EXISTS "System admins can delete materials" ON materials;
CREATE POLICY "System admins can delete materials"
  ON materials FOR DELETE
  TO authenticated
  USING (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

DROP POLICY IF EXISTS "System admins can view all materials" ON materials;
CREATE POLICY "System admins can view all materials"
  ON materials FOR SELECT
  TO authenticated
  USING (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

-- Licenses: View policies
DROP POLICY IF EXISTS "Entity users view company licenses" ON licenses;
CREATE POLICY "Entity users view company licenses"
  ON licenses FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT eu.company_id
      FROM entity_users eu
      WHERE eu.user_id = (SELECT auth.uid())
      AND eu.is_active = true
    )
  );

DROP POLICY IF EXISTS "Teachers view company licenses" ON licenses;
CREATE POLICY "Teachers view company licenses"
  ON licenses FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT t.company_id
      FROM teachers t
      WHERE t.auth_user_id = (SELECT auth.uid())
      AND t.is_active = true
    )
  );

DROP POLICY IF EXISTS "Students view company licenses" ON licenses;
CREATE POLICY "Students view company licenses"
  ON licenses FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT s.company_id
      FROM students s
      WHERE s.auth_user_id = (SELECT auth.uid())
      AND s.is_active = true
    )
  );

-- Past paper import sessions: User policies
DROP POLICY IF EXISTS "Users can create import sessions" ON past_paper_import_sessions;
CREATE POLICY "Users can create import sessions"
  ON past_paper_import_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can view own import sessions" ON past_paper_import_sessions;
CREATE POLICY "Users can view own import sessions"
  ON past_paper_import_sessions FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own import sessions" ON past_paper_import_sessions;
CREATE POLICY "Users can update own import sessions"
  ON past_paper_import_sessions FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own import sessions" ON past_paper_import_sessions;
CREATE POLICY "Users can delete own import sessions"
  ON past_paper_import_sessions FOR DELETE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
  );
