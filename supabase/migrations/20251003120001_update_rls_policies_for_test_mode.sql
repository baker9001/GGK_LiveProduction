/*
  # Update RLS Policies to Support Test Mode

  ## Overview
  This migration updates existing RLS policies across critical tables to support
  test mode by using get_effective_user_id() instead of auth.uid().

  ## Strategy
  1. Update user-related tables (users, admin_users, entity_users, teachers, students)
  2. Update organizational tables (companies, schools, branches)
  3. Add SSA bypass policies for test mode access
  4. Maintain existing security for non-test mode operations

  ## Security Principles
  - Test mode only works for Super System Admins
  - Test user can only see data within their normal scope
  - All test mode access is logged
  - Real admin identity is preserved for audit trail

  ## Tables Updated
  - users
  - admin_users
  - entity_users
  - teachers
  - students
  - companies
  - schools
  - branches
  - entity_admin_scope
*/

-- ============================================================================
-- USERS TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own record" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;
DROP POLICY IF EXISTS "System admins can view all users" ON users;
DROP POLICY IF EXISTS "System admins can update all users" ON users;

-- Recreate with test mode support
CREATE POLICY "Users can view their own record"
  ON users FOR SELECT
  TO authenticated
  USING (
    id = get_effective_user_id() OR
    is_super_admin()
  );

CREATE POLICY "Users can update their own record"
  ON users FOR UPDATE
  TO authenticated
  USING (id = get_effective_user_id())
  WITH CHECK (id = get_effective_user_id());

CREATE POLICY "System admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (is_admin_user(get_real_admin_id()));

CREATE POLICY "System admins can manage all users"
  ON users FOR ALL
  TO authenticated
  USING (is_admin_user(get_real_admin_id()))
  WITH CHECK (is_admin_user(get_real_admin_id()));

-- ============================================================================
-- ADMIN_USERS TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admin users can view their own record" ON admin_users;
DROP POLICY IF EXISTS "Admin users can update their own record" ON admin_users;
DROP POLICY IF EXISTS "System admins can view all admin users" ON admin_users;

-- Recreate with test mode support
CREATE POLICY "Admin users can view their own record"
  ON admin_users FOR SELECT
  TO authenticated
  USING (
    id = get_effective_user_id() OR
    is_super_admin()
  );

CREATE POLICY "Admin users can update their own record"
  ON admin_users FOR UPDATE
  TO authenticated
  USING (id = get_effective_user_id())
  WITH CHECK (id = get_effective_user_id());

CREATE POLICY "System admins can manage all admin users"
  ON admin_users FOR ALL
  TO authenticated
  USING (is_admin_user(get_real_admin_id()))
  WITH CHECK (is_admin_user(get_real_admin_id()));

-- ============================================================================
-- ENTITY_USERS TABLE
-- ============================================================================

-- Drop existing circular dependency policies
DROP POLICY IF EXISTS "Entity users can view their own record" ON entity_users;
DROP POLICY IF EXISTS "Entity users can update their own record" ON entity_users;
DROP POLICY IF EXISTS "System admins can view all entity users" ON entity_users;
DROP POLICY IF EXISTS "Entity admins can view users in their scope" ON entity_users;

-- Recreate with test mode support and no circular dependencies
CREATE POLICY "Entity users can view their own record"
  ON entity_users FOR SELECT
  TO authenticated
  USING (
    user_id = get_effective_user_id() OR
    is_super_admin()
  );

CREATE POLICY "Entity users can update their own record"
  ON entity_users FOR UPDATE
  TO authenticated
  USING (user_id = get_effective_user_id())
  WITH CHECK (user_id = get_effective_user_id());

CREATE POLICY "System admins can manage all entity users"
  ON entity_users FOR ALL
  TO authenticated
  USING (is_admin_user(get_real_admin_id()))
  WITH CHECK (is_admin_user(get_real_admin_id()));

-- Policy for entity admins to view users in their scope
CREATE POLICY "Entity admins can view users in their company"
  ON entity_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_users eu
      WHERE eu.user_id = get_effective_user_id()
        AND eu.company_id = entity_users.company_id
        AND eu.admin_level IN ('company_admin', 'school_admin', 'branch_admin')
        AND eu.is_active = true
    )
  );

-- ============================================================================
-- TEACHERS TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Teachers can view their own record" ON teachers;
DROP POLICY IF EXISTS "System admins can view all teachers" ON teachers;
DROP POLICY IF EXISTS "Entity admins can view teachers in their scope" ON teachers;

-- Recreate with test mode support
CREATE POLICY "Teachers can view their own record"
  ON teachers FOR SELECT
  TO authenticated
  USING (
    user_id = get_effective_user_id() OR
    is_super_admin()
  );

CREATE POLICY "Teachers can update their own record"
  ON teachers FOR UPDATE
  TO authenticated
  USING (user_id = get_effective_user_id())
  WITH CHECK (user_id = get_effective_user_id());

CREATE POLICY "System admins can manage all teachers"
  ON teachers FOR ALL
  TO authenticated
  USING (is_admin_user(get_real_admin_id()))
  WITH CHECK (is_admin_user(get_real_admin_id()));

-- ============================================================================
-- STUDENTS TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Students can view their own record" ON students;
DROP POLICY IF EXISTS "System admins can view all students" ON students;
DROP POLICY IF EXISTS "Teachers can view their students" ON students;

-- Recreate with test mode support
CREATE POLICY "Students can view their own record"
  ON students FOR SELECT
  TO authenticated
  USING (
    user_id = get_effective_user_id() OR
    is_super_admin()
  );

CREATE POLICY "Students can update their own record"
  ON students FOR UPDATE
  TO authenticated
  USING (user_id = get_effective_user_id())
  WITH CHECK (user_id = get_effective_user_id());

CREATE POLICY "System admins can manage all students"
  ON students FOR ALL
  TO authenticated
  USING (is_admin_user(get_real_admin_id()))
  WITH CHECK (is_admin_user(get_real_admin_id()));

-- ============================================================================
-- COMPANIES TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "System admins can view all companies" ON companies;
DROP POLICY IF EXISTS "Entity admins can view their company" ON companies;

-- Recreate with test mode support
CREATE POLICY "System admins can view all companies"
  ON companies FOR SELECT
  TO authenticated
  USING (is_admin_user(get_real_admin_id()));

CREATE POLICY "Entity admins can view their company"
  ON companies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_users eu
      WHERE eu.user_id = get_effective_user_id()
        AND eu.company_id = companies.id
        AND eu.is_active = true
    )
  );

CREATE POLICY "System admins can manage all companies"
  ON companies FOR ALL
  TO authenticated
  USING (is_admin_user(get_real_admin_id()))
  WITH CHECK (is_admin_user(get_real_admin_id()));

-- ============================================================================
-- SCHOOLS TABLE
-- ============================================================================

-- Drop problematic recursive policies
DROP POLICY IF EXISTS "System admins can view all schools" ON schools;
DROP POLICY IF EXISTS "Entity admins can view schools in their scope" ON schools;

-- Recreate with test mode support and no recursion
CREATE POLICY "System admins can view all schools"
  ON schools FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Entity admins can view schools in their company"
  ON schools FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_users eu
      WHERE eu.user_id = get_effective_user_id()
        AND eu.company_id = schools.company_id
        AND eu.is_active = true
    )
  );

CREATE POLICY "System admins can manage all schools"
  ON schools FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ============================================================================
-- BRANCHES TABLE
-- ============================================================================

-- Drop problematic recursive policies
DROP POLICY IF EXISTS "System admins can view all branches" ON branches;
DROP POLICY IF EXISTS "Entity admins can view branches in their scope" ON branches;

-- Recreate with test mode support and no recursion
CREATE POLICY "System admins can view all branches"
  ON branches FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Entity admins can view branches in their school"
  ON branches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_users eu
      JOIN schools s ON s.company_id = eu.company_id
      WHERE eu.user_id = get_effective_user_id()
        AND s.id = branches.school_id
        AND eu.is_active = true
    )
  );

CREATE POLICY "System admins can manage all branches"
  ON branches FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ============================================================================
-- ENTITY_ADMIN_SCOPE TABLE (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'entity_admin_scope') THEN
    -- Drop existing policies
    EXECUTE 'DROP POLICY IF EXISTS "Users can view their own scope" ON entity_admin_scope';
    EXECUTE 'DROP POLICY IF EXISTS "System admins can view all scopes" ON entity_admin_scope';

    -- Recreate with test mode support
    EXECUTE 'CREATE POLICY "Users can view their own scope"
      ON entity_admin_scope FOR SELECT
      TO authenticated
      USING (
        user_id = get_effective_user_id() OR
        is_super_admin()
      )';

    EXECUTE 'CREATE POLICY "System admins can manage all scopes"
      ON entity_admin_scope FOR ALL
      TO authenticated
      USING (is_super_admin())
      WITH CHECK (is_super_admin())';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'RLS POLICIES UPDATED FOR TEST MODE';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Tables updated:';
  RAISE NOTICE '  - users';
  RAISE NOTICE '  - admin_users';
  RAISE NOTICE '  - entity_users';
  RAISE NOTICE '  - teachers';
  RAISE NOTICE '  - students';
  RAISE NOTICE '  - companies';
  RAISE NOTICE '  - schools';
  RAISE NOTICE '  - branches';
  RAISE NOTICE '  - entity_admin_scope (if exists)';
  RAISE NOTICE '';
  RAISE NOTICE 'Key changes:';
  RAISE NOTICE '  - Policies now use get_effective_user_id()';
  RAISE NOTICE '  - Super admins can access all data';
  RAISE NOTICE '  - Test mode respects user scopes';
  RAISE NOTICE '  - Circular dependencies removed';
END $$;
