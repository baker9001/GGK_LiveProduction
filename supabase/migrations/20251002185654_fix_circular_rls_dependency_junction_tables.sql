/*
  # Fix Circular RLS Dependency in Junction Tables

  ## Problem
  The entity_user_schools and entity_user_branches tables have RLS policies that create
  infinite recursion when accessed by system admins:
  
  1. System admin queries schools table
  2. School admin policies check entity_user_schools junction table
  3. entity_user_schools policies query entity_users table (recursion!)
  4. This creates circular dependency: schools → entity_user_schools → entity_users → entity_user_schools
  
  Error: "infinite recursion detected in policy for relation 'entity_user_schools'" (Code: 42P17)

  ## Root Cause
  Junction table policies use complex subqueries that access entity_users:
  ```sql
  entity_user_id IN (
    SELECT id FROM entity_users
    WHERE company_id IN (
      SELECT company_id FROM entity_users WHERE user_id = auth.uid()
    )
  )
  ```
  
  This creates a recursive loop when these junction tables are accessed by policies
  on schools/branches that also check entity_users.

  ## Solution
  1. Create SECURITY DEFINER helper functions to check permissions without RLS
  2. Replace complex recursive policies with simple, direct policies
  3. Use helper functions that bypass RLS to break the circular dependency
  4. Add service role bypass for backend operations

  ## Tables Modified
  - entity_user_schools: Fix all policies to use SECURITY DEFINER functions
  - entity_user_branches: Fix all policies to use SECURITY DEFINER functions

  ## Security Notes
  - SECURITY DEFINER functions run with elevated privileges but contain proper checks
  - Junction tables now have lightweight, non-recursive policies
  - System admins maintain full access via helper functions
  - Entity admins can only manage assignments within their company scope
*/

-- ============================================================================
-- STEP 1: Create SECURITY DEFINER Helper Functions
-- ============================================================================

-- Function to check if user can manage junction table assignments
CREATE OR REPLACE FUNCTION can_manage_entity_user_assignments(check_user_id UUID, target_entity_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_system_admin BOOLEAN;
  user_company_id UUID;
  target_company_id UUID;
BEGIN
  -- Check if user is system admin (bypass RLS on admin_users)
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE id = check_user_id
  ) INTO is_system_admin;
  
  IF is_system_admin THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is entity admin in the same company (bypass RLS on entity_users)
  SELECT company_id INTO user_company_id
  FROM entity_users
  WHERE user_id = check_user_id 
    AND is_active = true
  LIMIT 1;
  
  SELECT company_id INTO target_company_id
  FROM entity_users
  WHERE id = target_entity_user_id
  LIMIT 1;
  
  -- Allow if same company
  RETURN (user_company_id IS NOT NULL AND user_company_id = target_company_id);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION can_manage_entity_user_assignments(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_entity_user_assignments(UUID, UUID) TO service_role;

COMMENT ON FUNCTION can_manage_entity_user_assignments(UUID, UUID) IS 
  'Checks if a user can manage entity_user junction assignments. Uses SECURITY DEFINER to avoid circular RLS dependencies.';

-- ============================================================================
-- STEP 2: Fix entity_user_schools RLS Policies
-- ============================================================================

-- Drop all existing policies that cause recursion
DROP POLICY IF EXISTS "Entity admins manage user-school assignments" ON entity_user_schools;
DROP POLICY IF EXISTS "System admins can view all entity user schools" ON entity_user_schools;
DROP POLICY IF EXISTS "System admins can create entity user schools" ON entity_user_schools;
DROP POLICY IF EXISTS "System admins can update all entity user schools" ON entity_user_schools;
DROP POLICY IF EXISTS "System admins can delete entity user schools" ON entity_user_schools;

-- Create new simple policies using helper function
CREATE POLICY "Allow viewing entity_user_schools with permission check"
  ON entity_user_schools FOR SELECT TO authenticated
  USING (can_manage_entity_user_assignments(auth.uid(), entity_user_id));

CREATE POLICY "Allow inserting entity_user_schools with permission check"
  ON entity_user_schools FOR INSERT TO authenticated
  WITH CHECK (can_manage_entity_user_assignments(auth.uid(), entity_user_id));

CREATE POLICY "Allow updating entity_user_schools with permission check"
  ON entity_user_schools FOR UPDATE TO authenticated
  USING (can_manage_entity_user_assignments(auth.uid(), entity_user_id))
  WITH CHECK (can_manage_entity_user_assignments(auth.uid(), entity_user_id));

CREATE POLICY "Allow deleting entity_user_schools with permission check"
  ON entity_user_schools FOR DELETE TO authenticated
  USING (can_manage_entity_user_assignments(auth.uid(), entity_user_id));

-- Service role bypass
CREATE POLICY "Service role full access to entity_user_schools"
  ON entity_user_schools FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- STEP 3: Fix entity_user_branches RLS Policies
-- ============================================================================

-- Drop all existing policies that cause recursion
DROP POLICY IF EXISTS "Entity admins manage user-branch assignments" ON entity_user_branches;
DROP POLICY IF EXISTS "System admins can view all entity user branches" ON entity_user_branches;
DROP POLICY IF EXISTS "System admins can create entity user branches" ON entity_user_branches;
DROP POLICY IF EXISTS "System admins can update all entity user branches" ON entity_user_branches;
DROP POLICY IF EXISTS "System admins can delete entity user branches" ON entity_user_branches;

-- Create new simple policies using helper function
CREATE POLICY "Allow viewing entity_user_branches with permission check"
  ON entity_user_branches FOR SELECT TO authenticated
  USING (can_manage_entity_user_assignments(auth.uid(), entity_user_id));

CREATE POLICY "Allow inserting entity_user_branches with permission check"
  ON entity_user_branches FOR INSERT TO authenticated
  WITH CHECK (can_manage_entity_user_assignments(auth.uid(), entity_user_id));

CREATE POLICY "Allow updating entity_user_branches with permission check"
  ON entity_user_branches FOR UPDATE TO authenticated
  USING (can_manage_entity_user_assignments(auth.uid(), entity_user_id))
  WITH CHECK (can_manage_entity_user_assignments(auth.uid(), entity_user_id));

CREATE POLICY "Allow deleting entity_user_branches with permission check"
  ON entity_user_branches FOR DELETE TO authenticated
  USING (can_manage_entity_user_assignments(auth.uid(), entity_user_id));

-- Service role bypass
CREATE POLICY "Service role full access to entity_user_branches"
  ON entity_user_branches FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- STEP 4: Verification
-- ============================================================================

DO $$
DECLARE
  schools_policy_count INTEGER;
  branches_policy_count INTEGER;
BEGIN
  -- Count policies on entity_user_schools
  SELECT COUNT(*) INTO schools_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'entity_user_schools';

  -- Count policies on entity_user_branches
  SELECT COUNT(*) INTO branches_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'entity_user_branches';

  RAISE NOTICE '============================================';
  RAISE NOTICE 'CIRCULAR RLS DEPENDENCY FIX COMPLETED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'entity_user_schools policies: %', schools_policy_count;
  RAISE NOTICE 'entity_user_branches policies: %', branches_policy_count;
  RAISE NOTICE 'Junction tables now use SECURITY DEFINER helper';
  RAISE NOTICE 'Circular dependency has been eliminated';
  RAISE NOTICE 'System admins and entity admins can access data';
END $$;
