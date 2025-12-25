/*
  # Fix is_admin_user() Function - Correct User Type Check

  ## Problem
  The updated `is_admin_user()` function is checking for `user_type = 'system_admin'`,
  but the actual value in the database is `user_type = 'system'`.
  
  This causes ALL admin checks to fail, resulting in:
  - License Management page showing "No licenses found"
  - Unable to perform any admin operations
  - RLS policies blocking all SELECT queries

  ## Root Cause
  In the previous fix, we added a check: `users.user_type = 'system_admin'`
  But the correct value in the database is: `users.user_type = 'system'`

  ## Solution
  Update the function to check for the correct user_type value: 'system'

  ## Impact
  This fix will restore:
  - License Management page data display
  - All admin operations across the system
  - RLS policies working correctly for system admins
*/

-- Update the is_admin_user() function with correct user_type check
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
      AND users.user_type = 'system'  -- ✅ FIXED: Changed from 'system_admin' to 'system'
    )
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_admin_user TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_user TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION is_admin_user IS 'Check if an auth.uid() belongs to an active system admin. Checks for user_type = ''system'' (not ''system_admin'')';

-- Log successful fix
DO $$
BEGIN
  RAISE NOTICE 'is_admin_user() function FIXED:';
  RAISE NOTICE '  - Now checks for user_type = ''system'' (correct value)';
  RAISE NOTICE '  - Previous bug: was checking for ''system_admin'' (wrong value)';
  RAISE NOTICE '  - License Management and all admin operations will now work';
END $$;
