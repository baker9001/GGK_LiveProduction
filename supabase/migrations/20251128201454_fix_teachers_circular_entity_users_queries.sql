/*
  # Fix Teachers Table Circular Entity Users Queries

  ## Problem
  The teachers table has multiple policies that query entity_users directly,
  creating a circular chain when combined with table_templates policies:
  
  table_templates → teachers → entity_users → (potential recursion)
  
  Found 9 policies on teachers that query entity_users directly without
  using SECURITY DEFINER helper functions.
  
  ## Solution
  Replace direct entity_users queries with helper function calls.
*/

-- ============================================================================
-- Drop Old Circular Teacher Policies
-- ============================================================================

DROP POLICY IF EXISTS "Branch admins manage teachers in branches" ON teachers;
DROP POLICY IF EXISTS "Entity admins can create teachers in their company" ON teachers;
DROP POLICY IF EXISTS "Entity admins can delete teachers in their company" ON teachers;
DROP POLICY IF EXISTS "Entity admins can update teachers in their company" ON teachers;
DROP POLICY IF EXISTS "Entity admins can view teachers in their company" ON teachers;
DROP POLICY IF EXISTS "Entity admins manage teachers in company" ON teachers;
DROP POLICY IF EXISTS "School admins manage teachers in schools" ON teachers;
DROP POLICY IF EXISTS "School and branch admins can view teachers" ON teachers;
DROP POLICY IF EXISTS "Teachers read access" ON teachers;

-- ============================================================================
-- Create Non-Circular Teacher Policies Using Helper Functions
-- ============================================================================

-- Policy 1: Teachers can view their own record
CREATE POLICY "Teachers can view own record"
  ON teachers FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Policy 2: Teachers can update their own record
CREATE POLICY "Teachers can update own record"
  ON teachers FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Policy 3: System admins full access
CREATE POLICY "System admins full access to teachers"
  ON teachers FOR ALL
  TO authenticated
  USING ((SELECT is_system_admin()) = true)
  WITH CHECK ((SELECT is_system_admin()) = true);

-- Policy 4: Entity admins can view teachers in their company
CREATE POLICY "Entity admins can view teachers in their company"
  ON teachers FOR SELECT
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
    OR is_entity_admin_for_company((SELECT auth.uid()), company_id)
  );

-- Policy 5: Entity admins can create teachers in their company
CREATE POLICY "Entity admins can create teachers in their company"
  ON teachers FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT is_system_admin()) = true
    OR is_entity_admin_for_company((SELECT auth.uid()), company_id)
  );

-- Policy 6: Entity admins can update teachers in their company
CREATE POLICY "Entity admins can update teachers in their company"
  ON teachers FOR UPDATE
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
    OR is_entity_admin_for_company((SELECT auth.uid()), company_id)
  )
  WITH CHECK (
    (SELECT is_system_admin()) = true
    OR is_entity_admin_for_company((SELECT auth.uid()), company_id)
  );

-- Policy 7: Entity admins can delete teachers in their company
CREATE POLICY "Entity admins can delete teachers in their company"
  ON teachers FOR DELETE
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
    OR is_entity_admin_for_company((SELECT auth.uid()), company_id)
  );

-- Policy 8: School admins can view teachers in their schools
CREATE POLICY "School admins can view teachers in their schools"
  ON teachers FOR SELECT
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
    OR (
      school_id IS NOT NULL 
      AND is_school_admin_for_school((SELECT auth.uid()), school_id)
    )
  );

-- Policy 9: Branch admins can view teachers in their branches
CREATE POLICY "Branch admins can view teachers in their branches"
  ON teachers FOR SELECT
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
    OR (
      branch_id IS NOT NULL
      AND is_branch_admin_for_branch((SELECT auth.uid()), branch_id)
    )
  );
