/*
  # Fix Admin Users Table RLS for Authentication

  ## Problem
  System administrators need to read their own record from admin_users table during login
  to determine their role and permissions. Current RLS policies may block this.

  ## Solution
  Add self-access policy for admin_users table to allow system admins to read their own record
  and their role information during the authentication process.

  ## Tables Updated
  - admin_users: Add self-access SELECT policy

  ## Security Model
  - Authenticated users can SELECT their own admin record (auth.uid() = id)
  - System admins can SELECT/INSERT/UPDATE/DELETE all admin records (existing policy)
  - Service role has full access

  ## Impact
  - Fixes login for system administrators
  - Allows admins to read their role during authentication
  - Maintains security with self-access restrictions
*/

-- ============================================================================
-- ADMIN_USERS TABLE - Add Self-Access Policy
-- ============================================================================

-- First, check if admin_users table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'admin_users'
  ) THEN
    -- Enable RLS if not already enabled
    EXECUTE 'ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY';

    -- Allow authenticated users to read their own admin record
    -- This is CRITICAL for system admin login
    EXECUTE '
      CREATE POLICY "Admin users can view their own record"
        ON admin_users FOR SELECT TO authenticated
        USING (auth.uid() = id)
    ';

    -- Allow service role full access
    EXECUTE '
      CREATE POLICY "Service role has full access to admin_users"
        ON admin_users FOR ALL TO service_role
        USING (true)
        WITH CHECK (true)
    ';

    RAISE NOTICE 'Admin users table RLS policies updated';
  ELSE
    RAISE NOTICE 'Admin users table does not exist - skipping';
  END IF;
END $$;
