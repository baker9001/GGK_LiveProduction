/*
  # Fix is_admin_user Function - Remove Non-Existent Column Reference
  
  ## Issue
  The is_admin_user function was updated to check `au.is_active` but the admin_users 
  table doesn't have an is_active column, causing the function to fail with error:
  "column au.is_active does not exist"
  
  This is preventing archive operations from working since the RLS policies use this function.
  
  ## Root Cause
  A previous migration (20251014035637) added a check for au.is_active but admin_users 
  table only has status column, not is_active. Only the users table has is_active.
  
  ## Solution
  Restore the is_admin_user function to only check u.is_active (from users table),
  which is the correct approach since:
  1. admin_users doesn't have is_active column
  2. The users.is_active flag is sufficient to control access
  
  ## Impact
  - Fixes archive functionality immediately
  - Allows all RLS policies using is_admin_user to work correctly
  - Maintains proper security - only active users with admin records can access
*/

-- Restore the correct is_admin_user function without non-existent column reference
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
  -- Only check users.is_active since admin_users doesn't have is_active column
  RETURN EXISTS (
    SELECT 1 
    FROM admin_users au
    JOIN users u ON u.id = au.id
    WHERE u.auth_user_id = user_id
      AND u.is_active = true
  );
END;
$$;

-- Ensure proper permissions
GRANT EXECUTE ON FUNCTION is_admin_user(uuid) TO authenticated;

-- Add comment explaining the fix
COMMENT ON FUNCTION is_admin_user IS 'Checks if a given Supabase auth UID belongs to an active system admin user. Fixed to only check users.is_active (admin_users table does not have is_active column). Used in RLS policies to restrict admin-only operations.';
