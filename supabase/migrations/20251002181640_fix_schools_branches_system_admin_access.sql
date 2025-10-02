/*
  # Fix System Admin Access to Schools and Branches Tables

  ## Overview
  This migration fixes RLS policies for schools and branches tables to ensure
  system admin users can properly access and manage all data.

  ## Problem
  The current policies use direct subqueries like:
  `auth.uid() IN (SELECT admin_users.id FROM admin_users)`
  
  This approach has performance issues and may not work correctly with RLS.

  ## Solution
  Replace the direct subqueries with the existing `is_admin_user()` helper function
  which is SECURITY DEFINER and bypasses RLS during evaluation.

  ## Tables Modified
  1. schools - System admin policies for SELECT, INSERT, UPDATE, DELETE
  2. branches - System admin policies for SELECT, INSERT, UPDATE, DELETE

  ## Changes Made
  - Drop old system admin policies that use direct subqueries
  - Create new policies using is_admin_user() helper function
  - Ensure consistent policy naming and structure
*/

-- ============================================================================
-- SCHOOLS TABLE - Fix System Admin Policies
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "System admins can view all schools" ON schools;
DROP POLICY IF EXISTS "System admins can create schools" ON schools;
DROP POLICY IF EXISTS "System admins can update all schools" ON schools;
DROP POLICY IF EXISTS "System admins can delete schools" ON schools;

-- Create new policies using helper function
CREATE POLICY "System admins can view all schools"
  ON schools FOR SELECT TO authenticated
  USING (is_admin_user(auth.uid()));

CREATE POLICY "System admins can insert schools"
  ON schools FOR INSERT TO authenticated
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "System admins can update schools"
  ON schools FOR UPDATE TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "System admins can delete schools"
  ON schools FOR DELETE TO authenticated
  USING (is_admin_user(auth.uid()));

-- ============================================================================
-- BRANCHES TABLE - Fix System Admin Policies
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "System admins can view all branches" ON branches;
DROP POLICY IF EXISTS "System admins can create branches" ON branches;
DROP POLICY IF EXISTS "System admins can update all branches" ON branches;
DROP POLICY IF EXISTS "System admins can delete branches" ON branches;

-- Create new policies using helper function
CREATE POLICY "System admins can view all branches"
  ON branches FOR SELECT TO authenticated
  USING (is_admin_user(auth.uid()));

CREATE POLICY "System admins can insert branches"
  ON branches FOR INSERT TO authenticated
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "System admins can update branches"
  ON branches FOR UPDATE TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "System admins can delete branches"
  ON branches FOR DELETE TO authenticated
  USING (is_admin_user(auth.uid()));

-- ============================================================================
-- SERVICE ROLE ACCESS (Bypass RLS for backend operations)
-- ============================================================================

CREATE POLICY "Service role full access to schools"
  ON schools FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to branches"
  ON branches FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  schools_policy_count INTEGER;
  branches_policy_count INTEGER;
BEGIN
  -- Count policies on schools
  SELECT COUNT(*) INTO schools_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'schools';

  -- Count policies on branches
  SELECT COUNT(*) INTO branches_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'branches';

  RAISE NOTICE '============================================';
  RAISE NOTICE 'SYSTEM ADMIN ACCESS FIX COMPLETED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Schools table policies: %', schools_policy_count;
  RAISE NOTICE 'Branches table policies: %', branches_policy_count;
  RAISE NOTICE 'System admins now have full access using is_admin_user()';
END $$;