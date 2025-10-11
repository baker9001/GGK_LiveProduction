/*
  # Fix Entity Users Table RLS for Authentication

  ## Problem
  Entity administrators, teachers, and other entity users need to read their own record
  from entity_users table during login to determine their permissions and scope.

  ## Solution
  Add self-access policy for entity_users table to allow entity users to read their own
  record during authentication.

  ## Tables Updated
  - entity_users: Add self-access SELECT policy

  ## Security Model
  - Authenticated users can SELECT their own entity_users record (user_id = auth.uid())
  - System admins can SELECT/INSERT/UPDATE/DELETE all records (existing policy)
  - Entity admins can manage records in their scope (existing policies)
  - Service role has full access

  ## Impact
  - Fixes login for entity administrators
  - Allows entity users to read their permissions during login
  - Maintains security with self-access restrictions
*/

-- ============================================================================
-- ENTITY_USERS TABLE - Add Self-Access Policy
-- ============================================================================

-- Allow authenticated users to read their own entity_users record
-- This is CRITICAL for entity admin login
CREATE POLICY "Entity users can view their own record"
  ON entity_users FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Allow service role full access
CREATE POLICY "Service role has full access to entity_users"
  ON entity_users FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Entity users table RLS policies updated';
  RAISE NOTICE 'Entity users can now read their own record during login';
END $$;
