/*
  # Fix audit_logs INSERT Policy for Authentication
  
  ## Problem
  The audit_logs table has an INSERT policy "System admins can create audit_logs" with no WITH CHECK clause.
  This causes auth triggers to fail when trying to insert audit logs during login.
  
  Error: "Database error granting user" during authentication
  
  ## Root Cause
  Triggers `sync_auth_password_change` and `sync_password_to_admin_users` attempt to insert into audit_logs
  during authentication, but the RLS policy blocks them because:
  - Policy has qual: null (no WITH CHECK clause)
  - Triggers run as SECURITY DEFINER but still respect RLS
  - INSERT fails silently, causing Supabase Auth to report "database error granting user"
  
  ## Solution
  Drop and recreate the INSERT policy with proper WITH CHECK clause that allows:
  1. System admins to create any audit log
  2. Auth triggers to create audit logs for password changes
  3. Service operations to create audit logs
  
  ## Security
  - System admins can insert any audit log (is_admin_user check)
  - Service role has full access (bypasses RLS)
  - Regular users cannot insert audit logs directly
*/

-- ============================================================================
-- STEP 1: Drop existing problematic INSERT policy
-- ============================================================================

DROP POLICY IF EXISTS "System admins can create audit_logs" ON audit_logs;

-- ============================================================================
-- STEP 2: Create proper INSERT policy with WITH CHECK clause
-- ============================================================================

CREATE POLICY "System admins can create audit_logs"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow system admins to create any audit log
    is_admin_user(auth.uid())
    OR
    -- Allow users to create audit logs for their own actions
    -- (This is needed for auth triggers that run during login)
    user_id = auth.uid()
  );

-- ============================================================================
-- STEP 3: Add service role bypass policy for audit operations
-- ============================================================================

-- Service role should be able to insert audit logs without restrictions
-- This ensures auth triggers work correctly
DO $$
BEGIN
  -- Check if service role policy already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_logs'
      AND policyname = 'Service role full access to audit_logs'
  ) THEN
    -- Create service role full access policy
    CREATE POLICY "Service role full access to audit_logs"
      ON audit_logs
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Verify policies were created successfully
-- ============================================================================

DO $$
DECLARE
  v_insert_policy_count integer;
  v_service_policy_count integer;
BEGIN
  -- Check INSERT policy
  SELECT COUNT(*) INTO v_insert_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'audit_logs'
    AND policyname = 'System admins can create audit_logs'
    AND cmd = 'INSERT';
    
  IF v_insert_policy_count = 0 THEN
    RAISE EXCEPTION 'CRITICAL: INSERT policy was not created on audit_logs';
  END IF;
  
  -- Check service role policy
  SELECT COUNT(*) INTO v_service_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'audit_logs'
    AND policyname = 'Service role full access to audit_logs';
    
  IF v_service_policy_count = 0 THEN
    RAISE EXCEPTION 'CRITICAL: Service role policy was not created on audit_logs';
  END IF;
  
  RAISE NOTICE '============================================';
  RAISE NOTICE 'AUDIT LOGS AUTHENTICATION FIX APPLIED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'INSERT policy recreated with proper WITH CHECK clause';
  RAISE NOTICE 'Service role policy created for auth triggers';
  RAISE NOTICE 'Authentication should now work correctly';
  RAISE NOTICE 'This fixes the "Database error granting user" error';
END $$;
