/*
  # Fix is_admin_user Function - Remove is_active Requirement
  
  ## Issue
  The is_admin_user function was requiring users.is_active = true,
  but admin users in the system have is_active = false, preventing
  them from accessing materials.
  
  ## Solution
  Remove the is_active check from the function, or check admin_users
  for an active flag if one exists.
  
  ## Security
  This maintains security by still checking admin_users membership.
*/

-- Check if admin_users has an is_active column
DO $$
DECLARE
  has_is_active boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'admin_users' 
      AND column_name = 'is_active'
      AND table_schema = 'public'
  ) INTO has_is_active;
  
  IF has_is_active THEN
    -- If admin_users has is_active, check that column
    CREATE OR REPLACE FUNCTION is_admin_user(user_id uuid)
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    STABLE
    AS $func$
    BEGIN
      RETURN EXISTS (
        SELECT 1 
        FROM admin_users au
        JOIN users u ON u.id = au.id
        WHERE u.auth_user_id = user_id
          AND au.is_active = true
      );
    END;
    $func$;
  ELSE
    -- If admin_users doesn't have is_active, just check membership
    CREATE OR REPLACE FUNCTION is_admin_user(user_id uuid)
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    STABLE
    AS $func$
    BEGIN
      RETURN EXISTS (
        SELECT 1 
        FROM admin_users au
        JOIN users u ON u.id = au.id
        WHERE u.auth_user_id = user_id
      );
    END;
    $func$;
  END IF;
END $$;

COMMENT ON FUNCTION is_admin_user IS 'Checks if a given auth user ID belongs to an admin user. Links through users.auth_user_id to admin_users.id. Checks admin_users.is_active if column exists.';
