/*
  # Fix License Actions RLS Admin Check

  ## Problem
  The `is_admin_user()` function is failing because:
  1. RLS policy calls: `is_admin_user(auth.uid())`
  2. But `auth.uid()` returns auth.users.id
  3. Function checks: `admin_users.id = user_id`
  4. But `admin_users.id` references `users.id` (not auth.users.id)

  The chain is: auth.uid() → users.auth_user_id → users.id → admin_users.id
  
  ## Solution
  Update the `is_admin_user()` function to:
  1. First convert auth.uid() to users.id
  2. Then check if that users.id exists in admin_users

  ## Tables Affected
  - Fixes function: is_admin_user()
  - Affects policies on: license_actions (and other tables using this function)

  ## Security
  - Maintains SECURITY DEFINER to bypass RLS when checking admin status
  - Properly validates admin privileges through the full chain
*/

-- Create/Replace the corrected function (keeping same parameter name)
CREATE OR REPLACE FUNCTION is_admin_user(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record_id UUID;
BEGIN
  -- Step 1: Get the users.id from auth.uid()
  -- The user_id parameter is actually auth.uid(), so we need to convert it
  SELECT u.id INTO user_record_id
  FROM users u
  WHERE u.auth_user_id = user_id
  LIMIT 1;

  -- Step 2: Check if this users.id exists in admin_users
  IF user_record_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = user_record_id
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = user_record_id
      AND users.is_active = true
      AND users.user_type = 'system_admin'
    )
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_admin_user TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_user TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION is_admin_user IS 'Check if an auth.uid() belongs to an active system admin. Converts auth.uid() -> users.id -> admin_users.id';

-- Log successful fix
DO $$
BEGIN
  RAISE NOTICE 'is_admin_user() function fixed:';
  RAISE NOTICE '  - Now properly handles auth.uid() → users.id → admin_users.id chain';
  RAISE NOTICE '  - Checks user is active and has system_admin user_type';
  RAISE NOTICE '  - License actions INSERT/UPDATE/DELETE policies will now work correctly';
END $$;
