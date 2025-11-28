/*
  # Remove ALL Circular Entity Users Policies

  ## Problem
  Multiple duplicate policies exist on entity_users table, some with circular
  references that query entity_users within their USING clauses.
  
  Current issue: 16 policies found, many are duplicates or use circular logic.
  
  ## Solution
  1. Drop ALL policies on entity_users
  2. Recreate ONLY the correct non-circular policies
  3. Use SECURITY DEFINER helper functions exclusively
*/

-- ============================================================================
-- STEP 1: Drop ALL Existing Policies (Clean Slate)
-- ============================================================================

-- Drop all policies found in pg_policies query
DROP POLICY IF EXISTS "Branch admins can view entity_users in their branches" ON entity_users;
DROP POLICY IF EXISTS "Entity admins can create entity_users in their company" ON entity_users;
DROP POLICY IF EXISTS "Entity admins can delete entity_users in their company" ON entity_users;
DROP POLICY IF EXISTS "Entity admins can update entity_users in their company" ON entity_users;
DROP POLICY IF EXISTS "Entity admins can view entity_users in their company" ON entity_users;
DROP POLICY IF EXISTS "Entity admins create users in company" ON entity_users;
DROP POLICY IF EXISTS "Entity admins delete users in company" ON entity_users;
DROP POLICY IF EXISTS "Entity admins manage entity users in company" ON entity_users;  -- CIRCULAR!
DROP POLICY IF EXISTS "Entity admins update users in company" ON entity_users;
DROP POLICY IF EXISTS "Entity admins view users in company" ON entity_users;
DROP POLICY IF EXISTS "Entity users read access" ON entity_users;  -- CIRCULAR!
DROP POLICY IF EXISTS "Entity users view own record" ON entity_users;
DROP POLICY IF EXISTS "School admins can view entity_users in their schools" ON entity_users;
DROP POLICY IF EXISTS "Service role full access to entity_users" ON entity_users;
DROP POLICY IF EXISTS "System admins full access to entity users" ON entity_users;
DROP POLICY IF EXISTS "System admins full access to entity_users" ON entity_users;
DROP POLICY IF EXISTS "System admins can view all entity_users" ON entity_users;
DROP POLICY IF EXISTS "System admins can manage entity_users" ON entity_users;

-- ============================================================================
-- STEP 2: Create Clean Non-Circular Policies
-- ============================================================================

-- Policy 1: System admins have full access (using is_system_admin function)
CREATE POLICY "System admins full access to entity_users"
  ON entity_users FOR ALL
  TO authenticated
  USING ((SELECT is_system_admin()) = true)
  WITH CHECK ((SELECT is_system_admin()) = true);

-- Policy 2: Service role full access (for backend operations)
CREATE POLICY "Service role full access to entity_users"
  ON entity_users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy 3: Entity users can view their own record
CREATE POLICY "Entity users view own record"
  ON entity_users FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Policy 4: Entity admins can view users in their company
CREATE POLICY "Entity admins can view entity_users in their company"
  ON entity_users FOR SELECT
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
    OR is_entity_admin_for_company((SELECT auth.uid()), company_id)
  );

-- Policy 5: Entity admins can create users in their company
CREATE POLICY "Entity admins can create entity_users in their company"
  ON entity_users FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT is_system_admin()) = true
    OR is_entity_admin_for_company((SELECT auth.uid()), company_id)
  );

-- Policy 6: Entity admins can update users in their company
CREATE POLICY "Entity admins can update entity_users in their company"
  ON entity_users FOR UPDATE
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
    OR is_entity_admin_for_company((SELECT auth.uid()), company_id)
  )
  WITH CHECK (
    (SELECT is_system_admin()) = true
    OR is_entity_admin_for_company((SELECT auth.uid()), company_id)
  );

-- Policy 7: Entity admins can delete users in their company
CREATE POLICY "Entity admins can delete entity_users in their company"
  ON entity_users FOR DELETE
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
    OR is_entity_admin_for_company((SELECT auth.uid()), company_id)
  );

-- Policy 8: School admins can view users in their schools
CREATE POLICY "School admins can view entity_users in their schools"
  ON entity_users FOR SELECT
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
    OR EXISTS (
      SELECT 1 FROM entity_user_schools eus
      WHERE eus.entity_user_id = entity_users.id
        AND is_school_admin_for_school((SELECT auth.uid()), eus.school_id)
    )
  );

-- Policy 9: Branch admins can view users in their branches  
CREATE POLICY "Branch admins can view entity_users in their branches"
  ON entity_users FOR SELECT
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
    OR EXISTS (
      SELECT 1 FROM entity_user_branches eub
      WHERE eub.entity_user_id = entity_users.id
        AND is_branch_admin_for_branch((SELECT auth.uid()), eub.branch_id)
    )
  );

-- ============================================================================
-- Verification: Ensure RLS is enabled
-- ============================================================================

ALTER TABLE entity_users ENABLE ROW LEVEL SECURITY;
