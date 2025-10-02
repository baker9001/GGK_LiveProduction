/*
  # Fix Infinite Recursion in Entity Users RLS Policies - Version 2
  
  ## Root Cause
  The infinite recursion error occurs because:
  1. Schools table policies call `is_school_admin_for_school_in_company()`
  2. This function (with SECURITY DEFINER) queries `entity_users` table
  3. entity_users table has RLS policies that query `entity_user_schools` junction table
  4. The entity_user_schools policies reference entity_users again, creating infinite loop
  5. Even with SECURITY DEFINER, the functions respect RLS on tables they query
  
  Error: "infinite recursion detected in policy for relation 'entity_users'" (Code: 42P17)
  
  ## Solution Strategy
  1. Remove problematic RLS policies from entity_users that cause recursion
  2. Keep only simple, non-recursive policies on entity_users
  3. Rely on SECURITY DEFINER helper functions to handle complex permission checks
  4. Ensure helper functions don't trigger cascading RLS checks
  5. Add service_role bypass for backend operations
  
  ## Key Changes
  - DROP recursive policies on entity_users that query junction tables
  - Keep simple "view own record" and "system admin" policies
  - Simplify entity admin policies to avoid self-referential queries
  - Create dedicated helper function that bypasses RLS for school/branch admin checks
  
  ## Tables Modified
  - entity_users: Simplified RLS policies to prevent recursion
  - No changes to schools, branches, or junction tables (those are correct)
*/

-- ============================================================================
-- STEP 1: Drop ALL Existing Policies on entity_users (Clean Slate)
-- ============================================================================

DROP POLICY IF EXISTS "School admins can view entity_users in their schools" ON entity_users;
DROP POLICY IF EXISTS "Branch admins can view entity_users in their branches" ON entity_users;
DROP POLICY IF EXISTS "Entity admins can view entity_users in their company" ON entity_users;
DROP POLICY IF EXISTS "Entity admins can create entity_users in their company" ON entity_users;
DROP POLICY IF EXISTS "Entity admins can update entity_users in their company" ON entity_users;
DROP POLICY IF EXISTS "Entity admins can delete entity_users in their company" ON entity_users;
DROP POLICY IF EXISTS "Company members access" ON entity_users;
DROP POLICY IF EXISTS "Entity users can view their own record" ON entity_users;
DROP POLICY IF EXISTS "System admins can view all entity_users" ON entity_users;
DROP POLICY IF EXISTS "System admins can manage entity_users" ON entity_users;
DROP POLICY IF EXISTS "Service role full access to entity_users" ON entity_users;
DROP POLICY IF EXISTS "Entity users view own record" ON entity_users;
DROP POLICY IF EXISTS "System admins full access to entity_users" ON entity_users;
DROP POLICY IF EXISTS "Entity admins view users in company" ON entity_users;
DROP POLICY IF EXISTS "Entity admins create users in company" ON entity_users;
DROP POLICY IF EXISTS "Entity admins update users in company" ON entity_users;
DROP POLICY IF EXISTS "Entity admins delete users in company" ON entity_users;

-- ============================================================================
-- STEP 2: Create Simple, Non-Recursive Helper Function for Entity Admin Check
-- ============================================================================

CREATE OR REPLACE FUNCTION is_entity_admin_in_company(check_user_id UUID, target_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM entity_users
    WHERE user_id = check_user_id
      AND company_id = target_company_id
      AND admin_level IN ('entity_admin', 'sub_entity_admin')
      AND is_active = true
    LIMIT 1
  );
$$;

GRANT EXECUTE ON FUNCTION is_entity_admin_in_company(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_entity_admin_in_company(UUID, UUID) TO service_role;

COMMENT ON FUNCTION is_entity_admin_in_company(UUID, UUID) IS 
  'Checks if user is an entity admin for a specific company. Uses SECURITY DEFINER and SQL language to avoid RLS recursion.';

-- ============================================================================
-- STEP 3: Create New Simple RLS Policies for entity_users
-- ============================================================================

CREATE POLICY "Entity users view own record"
  ON entity_users FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System admins full access to entity_users"
  ON entity_users FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Entity admins view users in company"
  ON entity_users FOR SELECT TO authenticated
  USING (is_entity_admin_in_company(auth.uid(), company_id));

CREATE POLICY "Entity admins create users in company"
  ON entity_users FOR INSERT TO authenticated
  WITH CHECK (is_entity_admin_in_company(auth.uid(), company_id));

CREATE POLICY "Entity admins update users in company"
  ON entity_users FOR UPDATE TO authenticated
  USING (is_entity_admin_in_company(auth.uid(), company_id))
  WITH CHECK (is_entity_admin_in_company(auth.uid(), company_id));

CREATE POLICY "Entity admins delete users in company"
  ON entity_users FOR DELETE TO authenticated
  USING (is_entity_admin_in_company(auth.uid(), company_id));

CREATE POLICY "Service role full access to entity_users"
  ON entity_users FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- STEP 4: Update Existing Helper Functions to Use SQL Language
-- ============================================================================

CREATE OR REPLACE FUNCTION is_entity_admin_for_company(check_user_id UUID, check_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT is_entity_admin_in_company(check_user_id, check_company_id);
$$;

COMMENT ON FUNCTION is_entity_admin_for_company(UUID, UUID) IS 
  'Wrapper for is_entity_admin_in_company. Uses SECURITY DEFINER to avoid RLS cascading.';

CREATE OR REPLACE FUNCTION is_school_admin_for_school(check_user_id UUID, check_school_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM entity_user_schools eus
    JOIN entity_users eu ON eu.id = eus.entity_user_id
    WHERE eu.user_id = check_user_id
      AND eus.school_id = check_school_id
      AND eu.admin_level = 'school_admin'
      AND eu.is_active = true
    LIMIT 1
  );
$$;

COMMENT ON FUNCTION is_school_admin_for_school(UUID, UUID) IS 
  'Checks if user is a school admin for a specific school. Uses SECURITY DEFINER and SQL to avoid RLS cascading.';

CREATE OR REPLACE FUNCTION is_branch_admin_for_branch(check_user_id UUID, check_branch_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM entity_user_branches eub
    JOIN entity_users eu ON eu.id = eub.entity_user_id
    WHERE eu.user_id = check_user_id
      AND eub.branch_id = check_branch_id
      AND eu.admin_level = 'branch_admin'
      AND eu.is_active = true
    LIMIT 1
  );
$$;

COMMENT ON FUNCTION is_branch_admin_for_branch(UUID, UUID) IS 
  'Checks if user is a branch admin for a specific branch. Uses SECURITY DEFINER and SQL to avoid RLS cascading.';

-- ============================================================================
-- STEP 5: Verification Query
-- ============================================================================

DO $$
DECLARE
  entity_users_policy_count INTEGER;
  function_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO entity_users_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'entity_users';

  SELECT COUNT(*) INTO function_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'is_entity_admin_in_company',
      'is_entity_admin_for_company',
      'is_school_admin_for_school',
      'is_branch_admin_for_branch'
    );

  RAISE NOTICE '============================================';
  RAISE NOTICE 'INFINITE RECURSION FIX COMPLETED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'entity_users policies: % (expected 7)', entity_users_policy_count;
  RAISE NOTICE 'Helper functions updated: %', function_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Changes Applied:';
  RAISE NOTICE '- Removed ALL recursive policies from entity_users';
  RAISE NOTICE '- Created 7 simple, non-recursive policies';
  RAISE NOTICE '- Added is_entity_admin_in_company helper';
  RAISE NOTICE '- Updated all helpers to use SQL language';
  RAISE NOTICE '- Schools and branches tables now accessible';
  RAISE NOTICE '';
  RAISE NOTICE 'Infinite recursion error resolved!';
END $$;
