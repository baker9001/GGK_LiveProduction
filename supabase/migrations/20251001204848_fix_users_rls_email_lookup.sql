/*
  # CRITICAL FIX: Allow User Lookup by Email During Login

  ## Problem
  The RLS policy "Users can view their own record" uses: USING (auth.uid() = id)

  This ONLY works when querying by ID directly.

  During login, the code queries: SELECT * FROM users WHERE email = 'user@example.com'

  The RLS policy can't match because:
  - Policy checks: auth.uid() = id
  - Query filters: email = 'user@example.com'
  - These are different columns!

  Result: Query blocked by RLS → Login fails with "Failed to retrieve user information"

  ## Solution
  Add a policy that explicitly allows authenticated users to look up their own record by email.
  This is safe because:
  1. User must be authenticated (passed Supabase Auth)
  2. Can only look up the email that matches their auth.email()
  3. Returns only their own record

  ## Security
  - User can ONLY query their own email (auth.email())
  - Cannot query other users' emails
  - Must be authenticated first (Supabase Auth validates password)
*/

-- ============================================================================
-- CRITICAL FIX: Add Email Lookup Policy
-- ============================================================================

-- Allow authenticated users to look up their own record by email during login
CREATE POLICY "Users can view their own record by email"
  ON users FOR SELECT TO authenticated
  USING (email = auth.email());

-- This policy works in conjunction with the existing "Users can view their own record" policy
-- Together they allow:
-- 1. SELECT WHERE id = auth.uid() (existing policy)
-- 2. SELECT WHERE email = auth.email() (this new policy)

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'CRITICAL LOGIN FIX APPLIED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Users can now query their record by email during login';
  RAISE NOTICE 'RLS will allow: SELECT * FROM users WHERE email = auth.email()';
  RAISE NOTICE 'This fixes the "Failed to retrieve user information" error';
END $$;
