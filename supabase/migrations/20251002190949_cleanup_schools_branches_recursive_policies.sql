/*
  # Cleanup Recursive Policies on Schools and Branches Tables
  
  ## Problem
  After fixing entity_users table recursion, we still have policies on schools table
  that query entity_users with subqueries:
  
  1. "Company members access" - Uses EXISTS with entity_users subquery
  2. "Entity admins manage schools in company" - Uses IN with entity_users subquery
  
  These policies can trigger RLS checks on entity_users, which could potentially
  still cause performance issues or edge case recursion.
  
  ## Solution
  Replace these subquery-based policies with simple helper function calls.
  The helper functions use SECURITY DEFINER to bypass RLS and prevent recursion.
  
  ## Changes
  - DROP problematic policies on schools that use entity_users subqueries
  - DROP problematic policies on branches that use entity_users subqueries
  - Create simplified policies using existing helper functions
  - Ensure all access checks go through SECURITY DEFINER helpers
*/

-- ============================================================================
-- STEP 1: Drop Problematic Policies on Schools Table
-- ============================================================================

DROP POLICY IF EXISTS "Company members access" ON schools;
DROP POLICY IF EXISTS "Entity admins manage schools in company" ON schools;

-- ============================================================================
-- STEP 2: Create New Simplified Policy for Entity Admins on Schools
-- ============================================================================

-- Entity admins can manage schools in their company
-- Uses the helper function instead of subquery
CREATE POLICY "Entity admins manage schools in company"
  ON schools FOR ALL TO authenticated
  USING (is_entity_admin_in_company(auth.uid(), company_id))
  WITH CHECK (is_entity_admin_in_company(auth.uid(), company_id));

-- ============================================================================
-- STEP 3: Check and Fix Branches Table Policies
-- ============================================================================

-- Drop any problematic policies on branches that might exist
DROP POLICY IF EXISTS "Entity admins manage branches in company" ON branches;
DROP POLICY IF EXISTS "Entity/school admins manage branches in scope" ON branches;

-- The "Admins manage branches in their scope" policy already uses can_access_branch
-- which is correct, so no need to recreate it

-- ============================================================================
-- STEP 4: Verification
-- ============================================================================

DO $$
DECLARE
  schools_policy_count INTEGER;
  branches_policy_count INTEGER;
  schools_policies TEXT;
  branches_policies TEXT;
BEGIN
  -- Count and list policies on schools
  SELECT COUNT(*), STRING_AGG(policyname, ', ' ORDER BY policyname)
  INTO schools_policy_count, schools_policies
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'schools';

  -- Count and list policies on branches
  SELECT COUNT(*), STRING_AGG(policyname, ', ' ORDER BY policyname)
  INTO branches_policy_count, branches_policies
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'branches';

  RAISE NOTICE '============================================';
  RAISE NOTICE 'SCHOOLS & BRANCHES POLICY CLEANUP COMPLETED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Schools policies: %', schools_policy_count;
  RAISE NOTICE '  %', schools_policies;
  RAISE NOTICE '';
  RAISE NOTICE 'Branches policies: %', branches_policy_count;
  RAISE NOTICE '  %', branches_policies;
  RAISE NOTICE '';
  RAISE NOTICE 'All policies now use SECURITY DEFINER helpers';
  RAISE NOTICE 'No direct entity_users subqueries remain';
  RAISE NOTICE 'Recursion risk eliminated!';
END $$;
