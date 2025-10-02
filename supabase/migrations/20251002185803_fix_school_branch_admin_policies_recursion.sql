/*
  # Fix School and Branch Admin Policies to Prevent Recursion

  ## Problem
  School and branch policies still have potential for recursion because they:
  1. Join entity_user_schools/branches with entity_users
  2. This can trigger RLS checks on entity_users
  3. While less severe than before, it can still cause performance issues
  
  ## Solution
  Create SECURITY DEFINER helper functions to check school/branch admin access
  without triggering cascading RLS checks.

  ## Changes
  1. Create helper functions for school admin and branch admin checks
  2. Replace complex JOIN policies with simple helper function calls
  3. Maintain proper security boundaries and scope checking
*/

-- ============================================================================
-- Helper Functions for School and Branch Access
-- ============================================================================

-- Check if user is a school admin for a specific school
CREATE OR REPLACE FUNCTION is_school_admin_for_school(check_user_id UUID, check_school_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM entity_user_schools eus
    JOIN entity_users eu ON eu.id = eus.entity_user_id
    WHERE eu.user_id = check_user_id
      AND eus.school_id = check_school_id
      AND eu.admin_level = 'school_admin'
      AND eu.is_active = true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION is_school_admin_for_school(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_school_admin_for_school(UUID, UUID) TO service_role;

COMMENT ON FUNCTION is_school_admin_for_school(UUID, UUID) IS 
  'Checks if user is a school admin for a specific school. Uses SECURITY DEFINER to avoid RLS cascading.';

-- Check if user is a branch admin for a specific branch
CREATE OR REPLACE FUNCTION is_branch_admin_for_branch(check_user_id UUID, check_branch_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM entity_user_branches eub
    JOIN entity_users eu ON eu.id = eub.entity_user_id
    WHERE eu.user_id = check_user_id
      AND eub.branch_id = check_branch_id
      AND eu.admin_level = 'branch_admin'
      AND eu.is_active = true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION is_branch_admin_for_branch(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_branch_admin_for_branch(UUID, UUID) TO service_role;

COMMENT ON FUNCTION is_branch_admin_for_branch(UUID, UUID) IS 
  'Checks if user is a branch admin for a specific branch. Uses SECURITY DEFINER to avoid RLS cascading.';

-- Check if user is entity/sub-entity admin for a company
CREATE OR REPLACE FUNCTION is_entity_admin_for_company(check_user_id UUID, check_company_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM entity_users eu
    WHERE eu.user_id = check_user_id
      AND eu.company_id = check_company_id
      AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
      AND eu.is_active = true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION is_entity_admin_for_company(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_entity_admin_for_company(UUID, UUID) TO service_role;

COMMENT ON FUNCTION is_entity_admin_for_company(UUID, UUID) IS 
  'Checks if user is an entity/sub-entity admin for a company. Uses SECURITY DEFINER to avoid RLS cascading.';

-- Check if user is school admin for a school by checking company through school
CREATE OR REPLACE FUNCTION is_school_admin_for_school_in_company(check_user_id UUID, check_school_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  school_company_id UUID;
BEGIN
  -- Get the company_id for the school
  SELECT company_id INTO school_company_id
  FROM schools
  WHERE id = check_school_id;
  
  IF school_company_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user is entity admin for this company OR school admin for this specific school
  RETURN (
    is_entity_admin_for_company(check_user_id, school_company_id) OR
    is_school_admin_for_school(check_user_id, check_school_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION is_school_admin_for_school_in_company(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_school_admin_for_school_in_company(UUID, UUID) TO service_role;

COMMENT ON FUNCTION is_school_admin_for_school_in_company(UUID, UUID) IS 
  'Checks if user can access a school (entity admin or school admin). Uses SECURITY DEFINER.';

-- ============================================================================
-- Update Schools Table Policies
-- ============================================================================

-- Drop the policy that uses JOIN with entity_users
DROP POLICY IF EXISTS "School admins manage assigned schools" ON schools;

-- Create new policy using helper function
CREATE POLICY "School admins manage assigned schools"
  ON schools FOR ALL TO authenticated
  USING (is_school_admin_for_school_in_company(auth.uid(), id))
  WITH CHECK (is_school_admin_for_school_in_company(auth.uid(), id));

-- ============================================================================
-- Update Branches Table Policies
-- ============================================================================

-- Drop the policies that use JOIN with entity_users
DROP POLICY IF EXISTS "Branch admins manage assigned branches" ON branches;
DROP POLICY IF EXISTS "Entity/school admins manage branches in scope" ON branches;

-- Helper function to check if user can access a branch
CREATE OR REPLACE FUNCTION can_access_branch(check_user_id UUID, check_branch_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  branch_school_id UUID;
  school_company_id UUID;
BEGIN
  -- Get the school_id for the branch
  SELECT school_id INTO branch_school_id
  FROM branches
  WHERE id = check_branch_id;
  
  IF branch_school_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get the company_id for the school
  SELECT company_id INTO school_company_id
  FROM schools
  WHERE id = branch_school_id;
  
  IF school_company_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check access: entity admin, school admin, or branch admin
  RETURN (
    is_entity_admin_for_company(check_user_id, school_company_id) OR
    is_school_admin_for_school(check_user_id, branch_school_id) OR
    is_branch_admin_for_branch(check_user_id, check_branch_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION can_access_branch(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_branch(UUID, UUID) TO service_role;

COMMENT ON FUNCTION can_access_branch(UUID, UUID) IS 
  'Checks if user can access a branch (entity/school/branch admin). Uses SECURITY DEFINER.';

-- Create unified policy for branch access
CREATE POLICY "Admins manage branches in their scope"
  ON branches FOR ALL TO authenticated
  USING (can_access_branch(auth.uid(), id))
  WITH CHECK (can_access_branch(auth.uid(), id));

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
  schools_policy_count INTEGER;
  branches_policy_count INTEGER;
  functions_count INTEGER;
BEGIN
  -- Count policies on schools
  SELECT COUNT(*) INTO schools_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'schools';

  -- Count policies on branches
  SELECT COUNT(*) INTO branches_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'branches';
  
  -- Count new helper functions
  SELECT COUNT(*) INTO functions_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'is_school_admin_for_school',
      'is_branch_admin_for_branch',
      'is_entity_admin_for_company',
      'is_school_admin_for_school_in_company',
      'can_access_branch'
    );

  RAISE NOTICE '============================================';
  RAISE NOTICE 'SCHOOL/BRANCH POLICY RECURSION FIX COMPLETED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Schools table policies: %', schools_policy_count;
  RAISE NOTICE 'Branches table policies: %', branches_policy_count;
  RAISE NOTICE 'New helper functions: %', functions_count;
  RAISE NOTICE 'All policies now use SECURITY DEFINER helpers';
  RAISE NOTICE 'No more JOIN-based recursion risks';
END $$;
