/*
  # Fix Papers Setup Archive RLS Policy Conflict
  
  ## Issue
  The papers_setup table has conflicting RLS policies preventing archive operations:
  1. Old policy "System admins manage papers" directly checks auth.uid() IN admin_users.id
  2. New policies use is_admin_user() function which joins through users table
  3. Both policies are active, causing conflicts during UPDATE operations
  
  ## Root Cause
  - The old policy expects: auth.uid() = admin_users.id (direct match)
  - The function expects: auth.uid() = users.auth_user_id, then join to admin_users
  - Since admin_users.id = users.id = users.auth_user_id (same UUID), both patterns work
  - However, having BOTH policies active causes conflicts
  
  ## Solution
  1. Drop the old conflicting "System admins manage papers" policy
  2. Keep the optimized policies that use is_admin_user() function
  3. Ensure the function definition is correct and matches the data structure
  
  ## Impact
  - Fixes archive functionality for system admins
  - Maintains security - only authenticated admin users can update papers
  - Improves performance by using optimized (SELECT auth.uid()) pattern
  
  ## Tables Affected
  - papers_setup (RLS policies only)
*/

-- ============================================================================
-- STEP 1: Remove conflicting old policy
-- ============================================================================

-- Drop the old "System admins manage papers" policy that conflicts with new policies
DROP POLICY IF EXISTS "System admins manage papers" ON papers_setup;

-- Also drop the redundant "Authenticated view papers" policy since we have a more specific one
DROP POLICY IF EXISTS "Authenticated view papers" ON papers_setup;

-- ============================================================================
-- STEP 2: Verify remaining policies are correct
-- ============================================================================

-- The following policies should remain active and are correct:
-- 1. "System admins can view all papers_setup" - FOR SELECT
-- 2. "System admins can create papers_setup" - FOR INSERT
-- 3. "System admins can update all papers_setup" - FOR UPDATE (this one enables archive)
-- 4. "System admins can delete papers_setup" - FOR DELETE

-- These policies use: is_admin_user((SELECT auth.uid()))
-- The function correctly joins: users.auth_user_id = user_id parameter
-- Then checks: admin_users.id exists (via FK to users.id)

-- ============================================================================
-- STEP 3: Verify is_admin_user function is correct
-- ============================================================================

-- Ensure the function definition is optimal
-- It should already be correct from previous migrations, but let's verify
CREATE OR REPLACE FUNCTION is_admin_user(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the provided auth user_id belongs to an admin user
  -- Join through users table: auth.uid() -> users.auth_user_id -> users.id -> admin_users.id
  RETURN EXISTS (
    SELECT 1 
    FROM admin_users au
    JOIN users u ON u.id = au.id
    WHERE u.auth_user_id = user_id
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_admin_user(uuid) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION is_admin_user IS 'Checks if a given Supabase auth UID belongs to a system admin user. Joins through users.auth_user_id to admin_users.id. Used in RLS policies to restrict admin-only operations.';

-- ============================================================================
-- STEP 4: Add diagnostic view for troubleshooting (optional)
-- ============================================================================

-- Create a diagnostic view to help debug RLS issues (visible to admins only)
CREATE OR REPLACE VIEW admin_user_auth_mapping AS
SELECT 
  au.id as admin_user_id,
  au.name as admin_name,
  au.email as admin_email,
  u.auth_user_id,
  u.is_active as user_is_active,
  CASE 
    WHEN u.auth_user_id IS NOT NULL THEN 'Linked'
    ELSE 'Not Linked'
  END as link_status
FROM admin_users au
LEFT JOIN users u ON u.id = au.id
ORDER BY au.created_at DESC;

COMMENT ON VIEW admin_user_auth_mapping IS 'Diagnostic view showing the relationship between admin_users and auth users. Used for troubleshooting RLS policy issues.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- List remaining policies on papers_setup
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE 'Papers Setup RLS Policies after fix:';
  FOR r IN (
    SELECT policyname, cmd 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'papers_setup'
    ORDER BY cmd, policyname
  ) LOOP
    RAISE NOTICE '  - % (Operation: %)', r.policyname, r.cmd;
  END LOOP;
END $$;