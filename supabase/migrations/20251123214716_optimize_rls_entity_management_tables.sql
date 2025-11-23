/*
  # Optimize RLS Auth Calls - Entity Management Tables

  1. Performance Optimization
    - Wrap auth function calls in SELECT for entity management tables
    - Prevents re-evaluation for each row
    - Critical performance improvement at scale

  2. Tables Optimized
    - entity_users, admin_users
    - class_sections, grade_levels
    - academic_years, departments
    - entity_admin_scope
*/

-- Entity Users: View own record
DROP POLICY IF EXISTS "Entity users view own record" ON entity_users;
CREATE POLICY "Entity users view own record"
  ON entity_users FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
  );

-- Entity Users: System admin access
DROP POLICY IF EXISTS "System admins full access to entity users" ON entity_users;
CREATE POLICY "System admins full access to entity users"
  ON entity_users FOR ALL
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
  );

-- Entity Users: Company admins manage
DROP POLICY IF EXISTS "Entity admins manage entity users in company" ON entity_users;
CREATE POLICY "Entity admins manage entity users in company"
  ON entity_users FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT eu.company_id
      FROM entity_users eu
      WHERE eu.user_id = (SELECT auth.uid())
      AND eu.is_company_admin = true
      AND eu.is_active = true
    )
  );

-- Admin Users: System admin policies
DROP POLICY IF EXISTS "System admins can create admin users" ON admin_users;
CREATE POLICY "System admins can create admin users"
  ON admin_users FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT is_system_admin()) = true
  );

DROP POLICY IF EXISTS "System admins can update admin users" ON admin_users;
CREATE POLICY "System admins can update admin users"
  ON admin_users FOR UPDATE
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
  );

DROP POLICY IF EXISTS "System admins can delete admin users" ON admin_users;
CREATE POLICY "System admins can delete admin users"
  ON admin_users FOR DELETE
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
  );

DROP POLICY IF EXISTS "System admins can view admin users" ON admin_users;
CREATE POLICY "System admins can view admin users"
  ON admin_users FOR SELECT
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
  );

-- Admin Users: View own record
DROP POLICY IF EXISTS "Admin users view own record" ON admin_users;
CREATE POLICY "Admin users view own record"
  ON admin_users FOR SELECT
  TO authenticated
  USING (
    id = (SELECT auth.uid())
  );

-- Class Sections: System admin
DROP POLICY IF EXISTS "System admins manage class sections" ON class_sections;
CREATE POLICY "System admins manage class sections"
  ON class_sections FOR ALL
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
  );

-- Grade Levels: System admin policies
DROP POLICY IF EXISTS "System admins manage grade levels" ON grade_levels;
CREATE POLICY "System admins manage grade levels"
  ON grade_levels FOR ALL
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
  );

-- Grade Levels: School admins manage
DROP POLICY IF EXISTS "School admins manage grade levels" ON grade_levels;
CREATE POLICY "School admins manage grade levels"
  ON grade_levels FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT eas.scope_id
      FROM entity_admin_scope eas
      WHERE eas.user_id = (SELECT auth.uid())
      AND eas.scope_type = 'school'
      AND eas.is_active = true
    )
  );

-- Grade Levels: Branch admins manage
DROP POLICY IF EXISTS "Branch admins manage grade levels" ON grade_levels;
CREATE POLICY "Branch admins manage grade levels"
  ON grade_levels FOR ALL
  TO authenticated
  USING (
    branch_id IN (
      SELECT eas.scope_id
      FROM entity_admin_scope eas
      WHERE eas.user_id = (SELECT auth.uid())
      AND eas.scope_type = 'branch'
      AND eas.is_active = true
    )
  );

-- Academic Years: System admin policies
DROP POLICY IF EXISTS "System admins manage academic years" ON academic_years;
CREATE POLICY "System admins manage academic years"
  ON academic_years FOR ALL
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
  );

-- Academic Years: School admins view
DROP POLICY IF EXISTS "School admins view academic years" ON academic_years;
CREATE POLICY "School admins view academic years"
  ON academic_years FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT eas.scope_id
      FROM entity_admin_scope eas
      WHERE eas.user_id = (SELECT auth.uid())
      AND eas.scope_type = 'school'
      AND eas.is_active = true
    )
  );

-- Departments: System admin policies
DROP POLICY IF EXISTS "System admins manage departments" ON departments;
CREATE POLICY "System admins manage departments"
  ON departments FOR ALL
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
  );

-- Departments: Company admins view
DROP POLICY IF EXISTS "Company admins view departments" ON departments;
CREATE POLICY "Company admins view departments"
  ON departments FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT eu.company_id
      FROM entity_users eu
      WHERE eu.user_id = (SELECT auth.uid())
      AND eu.is_active = true
    )
  );

-- Departments: School admins view
DROP POLICY IF EXISTS "School admins view departments" ON departments;
CREATE POLICY "School admins view departments"
  ON departments FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT eas.scope_id
      FROM entity_admin_scope eas
      WHERE eas.user_id = (SELECT auth.uid())
      AND eas.scope_type = 'school'
      AND eas.is_active = true
    )
  );

-- Entity Admin Scope: System admin policies
DROP POLICY IF EXISTS "System admins manage entity admin scope" ON entity_admin_scope;
CREATE POLICY "System admins manage entity admin scope"
  ON entity_admin_scope FOR ALL
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
  );

-- Entity Admin Scope: View own scope
DROP POLICY IF EXISTS "Entity admins view own scope" ON entity_admin_scope;
CREATE POLICY "Entity admins view own scope"
  ON entity_admin_scope FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
  );

-- Entity Admin Scope: Company admins manage
DROP POLICY IF EXISTS "Company admins manage scope in company" ON entity_admin_scope;
CREATE POLICY "Company admins manage scope in company"
  ON entity_admin_scope FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT eu.company_id
      FROM entity_users eu
      WHERE eu.user_id = (SELECT auth.uid())
      AND eu.is_company_admin = true
      AND eu.is_active = true
    )
  );