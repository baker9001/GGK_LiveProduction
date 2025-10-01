/*
  # Add System Admin Access to Core Entity Tables

  ## Overview
  Adds system admin (admin_users) access to companies, schools, and branches tables.
  System admins need to manage all entities across all companies.

  ## Tables Updated
  - companies: Add system admin policy
  - schools: Add system admin policy
  - branches: Add system admin policy

  ## Security Model
  - System admins (admin_users): Full access to all companies/schools/branches
  - Entity users: Access to their company's data (existing policies)
*/

-- ============================================================================
-- COMPANIES TABLE
-- ============================================================================

CREATE POLICY "System admins can manage all companies"
  ON companies FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- SCHOOLS TABLE
-- ============================================================================

CREATE POLICY "System admins can manage all schools"
  ON schools FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- BRANCHES TABLE
-- ============================================================================

CREATE POLICY "System admins can manage all branches"
  ON branches FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));
