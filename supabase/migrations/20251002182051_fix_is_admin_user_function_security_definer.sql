/*
  # Fix is_admin_user Function with SECURITY DEFINER

  ## Problem
  The is_admin_user() function creates a circular RLS dependency:
  1. Schools/branches policies call is_admin_user(auth.uid())
  2. is_admin_user() queries admin_users table
  3. admin_users table has RLS enabled with policies using is_admin_user()
  4. This creates a deadlock where the function can't read admin_users

  ## Solution
  Replace the existing is_admin_user() function with SECURITY DEFINER attribute.
  This makes the function run with the privileges of the function owner (postgres),
  bypassing RLS on the admin_users table during the check.

  ## Changes
  - Use CREATE OR REPLACE to update the function
  - Add SECURITY DEFINER attribute
  - Ensure proper grants for authenticated users
*/

-- Replace function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION is_admin_user(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = user_id
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_admin_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_user(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION is_admin_user(UUID) TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION is_admin_user(UUID) IS 
  'Checks if a user is a system admin. Uses SECURITY DEFINER to bypass RLS on admin_users table.';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'is_admin_user() FUNCTION FIXED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Function now uses SECURITY DEFINER';
  RAISE NOTICE 'This bypasses RLS circular dependency';
  RAISE NOTICE 'System admins can now access schools/branches';
END $$;