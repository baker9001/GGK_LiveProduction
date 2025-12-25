/*
  # Fix Session Preferences Admin RLS Policy

  **Issue**: The admin access policy for `user_session_preferences` table has two problems:
    1. References non-existent `users.role` column (should be `users.user_type`)
    2. Checks wrong user ID column (should be `auth_user_id` not `id`)

  **Impact**:
    - System admins cannot view user session preferences
    - Support staff cannot troubleshoot session issues for users
    - Policy evaluation fails due to incorrect column references

  **Changes**:
    1. Drop the incorrect admin policy
    2. Recreate policy with correct column references
    3. Check for `user_type = 'system_admin'` and active status

  **Security**: Maintains secure access - only authenticated system administrators
  can view preferences for support purposes.
*/

-- Drop the existing incorrect policy
DROP POLICY IF EXISTS "Admins can view all preferences" ON user_session_preferences;

-- Recreate the policy with correct column references
CREATE POLICY "Admins can view all preferences"
  ON user_session_preferences
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.user_type = 'system_admin'
      AND users.is_active = TRUE
    )
  );

-- Add comment for documentation
COMMENT ON POLICY "Admins can view all preferences" ON user_session_preferences IS
  'Allows active system administrators to view all user session preferences for support and troubleshooting purposes';
