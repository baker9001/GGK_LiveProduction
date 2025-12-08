/*
  # Fix Entity Users RLS Policies - Circular Reference Fix

  ## Problem
  The entity_users table policies have circular references causing infinite recursion.
  The helper functions exist but policies still query entity_users directly.
  
  ## Solution
  Update policies to use existing SECURITY DEFINER helper functions.
  Functions already exist from previous migration:
  - is_entity_admin_for_company(UUID, UUID)
  - is_school_admin_for_school(UUID, UUID) 
  - is_branch_admin_for_branch(UUID, UUID)
*/

-- ============================================================================
-- Drop Old Circular Policies
-- ============================================================================

DROP POLICY IF EXISTS "Entity admins can view entity_users in their company" ON entity_users;
DROP POLICY IF EXISTS "Entity admins can create entity_users in their company" ON entity_users;
DROP POLICY IF EXISTS "Entity admins can update entity_users in their company" ON entity_users;
DROP POLICY IF EXISTS "Entity admins can delete entity_users in their company" ON entity_users;
DROP POLICY IF EXISTS "School admins can view entity_users in their schools" ON entity_users;
DROP POLICY IF EXISTS "Branch admins can view entity_users in their branches" ON entity_users;

-- ============================================================================
-- Create New Non-Circular Policies Using Helper Functions
-- ============================================================================

-- Entity admins can view users in their company
CREATE POLICY "Entity admins can view entity_users in their company"
  ON entity_users FOR SELECT
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
    OR is_entity_admin_for_company((SELECT auth.uid()), company_id)
  );

-- Entity admins can create users in their company
CREATE POLICY "Entity admins can create entity_users in their company"
  ON entity_users FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT is_system_admin()) = true
    OR is_entity_admin_for_company((SELECT auth.uid()), company_id)
  );

-- Entity admins can update users in their company
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

-- Entity admins can delete users in their company
CREATE POLICY "Entity admins can delete entity_users in their company"
  ON entity_users FOR DELETE
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
    OR is_entity_admin_for_company((SELECT auth.uid()), company_id)
  );

-- School admins can view users in their schools (NO circular reference)
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

-- Branch admins can view users in their branches (NO circular reference)
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
