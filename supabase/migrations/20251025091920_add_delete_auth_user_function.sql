/*
  # Add function to delete user from auth.users
  
  This function allows deletion of users from auth.users table using service role privileges.
  Required for testing and administrative cleanup.
*/

-- Create function to delete user from auth.users
CREATE OR REPLACE FUNCTION delete_auth_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete from auth.users
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

COMMENT ON FUNCTION delete_auth_user IS 'Delete user from auth.users table (requires SECURITY DEFINER)';
