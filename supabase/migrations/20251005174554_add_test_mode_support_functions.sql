/*
  # Add Test Mode Support Functions

  Creates helper functions for test mode functionality:
  - get_effective_user_id() - Returns test user ID if in test mode, otherwise auth.uid()
  - is_in_test_mode() - Checks if current session is in test mode
  - get_real_admin_id() - Returns real admin ID when in test mode
  - is_super_admin() - Checks if user is Super System Admin

  These functions enable Super System Admins to safely impersonate users for testing.
*/

-- Function to check if user is currently in test mode
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
      NULL;
  END;

  -- Try to get from request headers
  BEGIN
    test_mode_header := current_setting('request.headers', true)::json->>'x-test-mode';
    IF test_mode_header = 'true' THEN
      RETURN true;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
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
        NULL;
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
        NULL;
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_in_test_mode() TO authenticated;
GRANT EXECUTE ON FUNCTION is_in_test_mode() TO anon;
GRANT EXECUTE ON FUNCTION get_effective_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_effective_user_id() TO anon;
GRANT EXECUTE ON FUNCTION get_real_admin_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;

-- Add comments
COMMENT ON FUNCTION is_in_test_mode() IS
  'Checks if the current session is in test mode by reading custom JWT claims or headers';

COMMENT ON FUNCTION get_effective_user_id() IS
  'Returns the test user ID if in test mode, otherwise returns auth.uid(). Use this instead of auth.uid() in RLS policies that need test mode support.';

COMMENT ON FUNCTION get_real_admin_id() IS
  'Returns the real admin user ID, even when in test mode. Use for audit logging.';

COMMENT ON FUNCTION is_super_admin() IS
  'Checks if the current user is a Super System Admin';
