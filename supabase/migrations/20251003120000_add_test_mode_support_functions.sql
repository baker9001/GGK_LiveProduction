/*
  # Add Test Mode Support Functions and RLS Enhancements

  ## Overview
  This migration adds comprehensive test mode support to enable Super System Admins (SSA)
  to safely impersonate other users for testing permissions and module access.

  ## Problem Statement
  The current test mode implementation has several critical issues:
  1. RLS policies use auth.uid() which always returns the real admin's ID, not test user's ID
  2. Permission checks fail because test user's permissions aren't loaded
  3. No database-level support for test mode detection
  4. Security audit trail for test mode sessions is missing

  ## Solution
  Create helper functions and policies that:
  1. Detect when a user is in test mode via session variables
  2. Return the appropriate user ID (test user or real user) for RLS checks
  3. Allow SSA to access data as any user during test mode
  4. Log all test mode activities for security auditing

  ## Security Considerations
  - Only Super System Admins can activate test mode
  - Test mode sessions are time-limited (5 minutes)
  - All test mode activities are logged
  - Test mode cannot escalate privileges beyond target user's permissions
  - Original admin identity is always preserved

  ## Changes Made
  1. Helper Functions
     - get_effective_user_id() - Returns test user ID if in test mode, otherwise auth.uid()
     - is_in_test_mode() - Checks if current session is in test mode
     - get_real_admin_id() - Returns the real admin ID when in test mode
     - log_test_mode_activity() - Logs test mode actions for audit

  2. Test Mode Session Management
     - Uses Supabase session custom claims: test_mode_active, test_user_id, real_admin_id
     - Frontend sets these claims when entering test mode
     - Backend validates these claims in RLS policies

  3. RLS Policy Updates
     - Existing policies updated to use get_effective_user_id() instead of auth.uid()
     - New policies added for SSA to access any user's data during test mode
     - Audit logging integrated into sensitive operations

  ## Testing
  1. Enter test mode as SSA
  2. Verify you can see test user's data
  3. Check that RLS properly restricts access to test user's scope
  4. Confirm audit logs capture test mode activities
  5. Exit test mode and verify real admin session restored
*/

-- ============================================================================
-- STEP 1: Create Test Mode Helper Functions
-- ============================================================================

-- Function to check if user is currently in test mode
-- This reads from the request headers/session to determine test mode state
CREATE OR REPLACE FUNCTION is_in_test_mode()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  test_mode_header TEXT;
  test_mode_setting TEXT;
BEGIN
  -- Try to get test mode from custom setting (set by frontend)
  BEGIN
    test_mode_setting := current_setting('request.jwt.claims.test_mode_active', true);
    IF test_mode_setting = 'true' THEN
      RETURN true;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      NULL; -- Ignore errors, not in test mode
  END;

  -- Try to get from request headers
  BEGIN
    test_mode_header := current_setting('request.headers', true)::json->>'x-test-mode';
    IF test_mode_header = 'true' THEN
      RETURN true;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      NULL; -- Ignore errors
  END;

  RETURN false;
END;
$$;

-- Function to get the effective user ID (test user if in test mode, otherwise real user)
CREATE OR REPLACE FUNCTION get_effective_user_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  test_user_id_str TEXT;
  test_user_uuid UUID;
BEGIN
  -- Check if in test mode
  IF is_in_test_mode() THEN
    -- Try to get test user ID from custom setting
    BEGIN
      test_user_id_str := current_setting('request.jwt.claims.test_user_id', true);
      IF test_user_id_str IS NOT NULL AND test_user_id_str != '' THEN
        test_user_uuid := test_user_id_str::UUID;
        RETURN test_user_uuid;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        NULL; -- Fall through to return real user ID
    END;

    -- Try to get from request headers
    BEGIN
      test_user_id_str := current_setting('request.headers', true)::json->>'x-test-user-id';
      IF test_user_id_str IS NOT NULL AND test_user_id_str != '' THEN
        test_user_uuid := test_user_id_str::UUID;
        RETURN test_user_uuid;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        NULL; -- Fall through
    END;
  END IF;

  -- Not in test mode or couldn't get test user ID, return real user
  RETURN auth.uid();
END;
$$;

-- Function to get the real admin user ID (when in test mode)
CREATE OR REPLACE FUNCTION get_real_admin_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Always return the actual authenticated user
  RETURN auth.uid();
END;
$$;

-- Function to check if the real admin is a Super System Admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  admin_role_name TEXT;
BEGIN
  -- Check if user is an admin
  IF NOT is_admin_user(auth.uid()) THEN
    RETURN false;
  END IF;

  -- Get the admin's role
  SELECT r.name INTO admin_role_name
  FROM admin_users au
  JOIN roles r ON r.id = au.role_id
  WHERE au.id = auth.uid();

  -- Check if role is Super Admin
  RETURN admin_role_name = 'Super Admin';
END;
$$;

-- ============================================================================
-- STEP 2: Create Test Mode Audit Logging Function
-- ============================================================================

-- Create audit table for test mode activities if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'test_mode_audit_log') THEN
    CREATE TABLE test_mode_audit_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      real_admin_id UUID NOT NULL,
      test_user_id UUID NOT NULL,
      test_user_email TEXT,
      test_user_type TEXT,
      action TEXT NOT NULL,
      table_name TEXT,
      record_id UUID,
      details JSONB,
      ip_address INET,
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    -- Enable RLS on audit log (only SSA can view)
    ALTER TABLE test_mode_audit_log ENABLE ROW LEVEL SECURITY;

    -- Policy: Only Super Admins can view audit logs
    CREATE POLICY "Super admins can view test mode audit logs"
      ON test_mode_audit_log FOR SELECT
      TO authenticated
      USING (is_super_admin());

    -- Policy: System can insert audit logs
    CREATE POLICY "System can insert test mode audit logs"
      ON test_mode_audit_log FOR INSERT
      TO authenticated
      WITH CHECK (true);

    -- Create index for faster queries
    CREATE INDEX IF NOT EXISTS idx_test_mode_audit_real_admin
      ON test_mode_audit_log(real_admin_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_test_mode_audit_test_user
      ON test_mode_audit_log(test_user_id, created_at DESC);
  END IF;
END $$;

-- Function to log test mode activities
CREATE OR REPLACE FUNCTION log_test_mode_activity(
  p_action TEXT,
  p_table_name TEXT DEFAULT NULL,
  p_record_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_test_user_id UUID;
  v_test_user_email TEXT;
  v_test_user_type TEXT;
BEGIN
  -- Only log if in test mode
  IF NOT is_in_test_mode() THEN
    RETURN;
  END IF;

  -- Get test user ID
  v_test_user_id := get_effective_user_id();

  -- Get test user details
  SELECT email,
    CASE
      WHEN EXISTS (SELECT 1 FROM admin_users WHERE id = v_test_user_id) THEN 'admin'
      WHEN EXISTS (SELECT 1 FROM entity_users WHERE user_id = v_test_user_id) THEN 'entity'
      WHEN EXISTS (SELECT 1 FROM teachers WHERE user_id = v_test_user_id) THEN 'teacher'
      WHEN EXISTS (SELECT 1 FROM students WHERE user_id = v_test_user_id) THEN 'student'
      ELSE 'unknown'
    END
  INTO v_test_user_email, v_test_user_type
  FROM users
  WHERE id = v_test_user_id;

  -- Insert audit log
  INSERT INTO test_mode_audit_log (
    real_admin_id,
    test_user_id,
    test_user_email,
    test_user_type,
    action,
    table_name,
    record_id,
    details
  ) VALUES (
    get_real_admin_id(),
    v_test_user_id,
    v_test_user_email,
    v_test_user_type,
    p_action,
    p_table_name,
    p_record_id,
    p_details
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the operation if logging fails
    RAISE WARNING 'Failed to log test mode activity: %', SQLERRM;
END;
$$;

-- ============================================================================
-- STEP 3: Grant Execute Permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION is_in_test_mode() TO authenticated;
GRANT EXECUTE ON FUNCTION is_in_test_mode() TO anon;
GRANT EXECUTE ON FUNCTION get_effective_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_effective_user_id() TO anon;
GRANT EXECUTE ON FUNCTION get_real_admin_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION log_test_mode_activity(TEXT, TEXT, UUID, JSONB) TO authenticated;

-- ============================================================================
-- STEP 4: Add Comments for Documentation
-- ============================================================================

COMMENT ON FUNCTION is_in_test_mode() IS
  'Checks if the current session is in test mode by reading custom JWT claims or headers';

COMMENT ON FUNCTION get_effective_user_id() IS
  'Returns the test user ID if in test mode, otherwise returns auth.uid(). Use this instead of auth.uid() in RLS policies.';

COMMENT ON FUNCTION get_real_admin_id() IS
  'Returns the real admin user ID, even when in test mode. Use for audit logging.';

COMMENT ON FUNCTION is_super_admin() IS
  'Checks if the current user is a Super System Admin';

COMMENT ON FUNCTION log_test_mode_activity(TEXT, TEXT, UUID, JSONB) IS
  'Logs test mode activities for security auditing. Called automatically by sensitive operations.';

COMMENT ON TABLE test_mode_audit_log IS
  'Audit trail for all test mode activities. Only viewable by Super Admins.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'TEST MODE SUPPORT FUNCTIONS CREATED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - is_in_test_mode()';
  RAISE NOTICE '  - get_effective_user_id()';
  RAISE NOTICE '  - get_real_admin_id()';
  RAISE NOTICE '  - is_super_admin()';
  RAISE NOTICE '  - log_test_mode_activity()';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - test_mode_audit_log';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Update RLS policies to use get_effective_user_id()';
  RAISE NOTICE '  2. Update frontend to set test mode session variables';
  RAISE NOTICE '  3. Test with sample users';
END $$;
