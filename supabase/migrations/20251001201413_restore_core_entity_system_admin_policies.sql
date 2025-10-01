/*
  # Restore Core Entity System Admin Policies (Granular)

  ## Overview
  Restores the system admin policies for companies, schools, and branches tables
  using the granular SELECT/INSERT/UPDATE/DELETE approach instead of FOR ALL.

  ## Tables Updated
  - companies
  - schools
  - branches

  ## Security Model
  - System admins get full access via separate policies for each operation
  - Existing entity-scoped policies remain active
*/

-- ============================================================================
-- COMPANIES TABLE - System Admin Policies
-- ============================================================================

CREATE POLICY "System admins can view all companies"
  ON companies FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create companies"
  ON companies FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all companies"
  ON companies FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete companies"
  ON companies FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- SCHOOLS TABLE - System Admin Policies
-- ============================================================================

CREATE POLICY "System admins can view all schools"
  ON schools FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create schools"
  ON schools FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all schools"
  ON schools FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete schools"
  ON schools FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- BRANCHES TABLE - System Admin Policies
-- ============================================================================

CREATE POLICY "System admins can view all branches"
  ON branches FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create branches"
  ON branches FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all branches"
  ON branches FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete branches"
  ON branches FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));
