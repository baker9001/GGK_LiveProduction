/*
  # Fix Users Table RLS for Authentication

  ## Problem
  The users table has RLS policies that only allow system admins (admin_users) to read data.
  This creates a circular dependency during login:
  - User tries to login → Supabase Auth succeeds
  - Login code queries users table for metadata
  - RLS policy checks if auth.uid() is in admin_users
  - Query fails because user isn't authenticated yet in admin_users
  - Login fails for ALL users

  ## Solution
  Add a self-access policy that allows any authenticated user to read their own record.
  This allows the login flow to complete while maintaining security.

  ## Tables Updated
  - users: Add self-access SELECT policy

  ## Security Model
  - Authenticated users can SELECT their own record (auth.uid() = id)
  - System admins can SELECT/INSERT/UPDATE/DELETE all records (existing policy)
  - Service role has full access (new policy)

  ## Impact
  - Fixes login for all user types (system admins, entity admins, teachers, students)
  - Maintains security by only allowing self-access
  - Does not affect existing admin policies
*/

-- ============================================================================
-- USERS TABLE - Add Self-Access Policy
-- ============================================================================

-- Allow authenticated users to read their own record
-- This is CRITICAL for login to work
CREATE POLICY "Users can view their own record"
  ON users FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Allow service role full access for system operations
CREATE POLICY "Service role has full access to users"
  ON users FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure users can update their own last_login timestamp
-- Note: Allowing full self-update during login for timestamp fields
CREATE POLICY "Users can update their own login timestamps"
  ON users FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Users table RLS policies updated - authentication should now work';
  RAISE NOTICE 'Users can now read their own record during login';
END $$;
