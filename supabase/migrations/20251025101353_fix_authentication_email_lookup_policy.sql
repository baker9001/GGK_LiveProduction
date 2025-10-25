/*
  # CRITICAL FIX: Restore Email Lookup Policy for Authentication

  ## Problem
  The RLS policy "Users can view their own record by email" is missing from the users table.
  This policy was supposed to be created by migration 20251001205004 but is not present.

  During login, the code queries: SELECT * FROM users WHERE email = 'user@example.com'
  
  Without the email-based policy, RLS blocks this query because:
  - Existing policy only allows: auth.uid() = id (ID-based lookup)
  - Login needs: email = auth.email() (email-based lookup)
  
  Result: Login fails with "Database error granting user" or "Failed to retrieve user information"

  ## Solution
  Re-create the email-based RLS policy that allows authenticated users to look up their own record by email.

  ## Security
  - User can ONLY query their own email (auth.email())
  - Cannot query other users' emails
  - Must be authenticated first (Supabase Auth validates password)
  
  ## Root Cause Analysis
  The policy may have been:
  1. Removed by a subsequent migration (cleanup or optimization)
  2. Never properly created due to migration failure
  3. Dropped during RLS policy consolidation
*/

-- ============================================================================
-- STEP 1: Check if policy already exists (defensive)
-- ============================================================================

DO $$
BEGIN
  -- Drop if exists to ensure clean state
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'users' 
      AND policyname = 'Users can view their own record by email'
  ) THEN
    DROP POLICY "Users can view their own record by email" ON users;
    RAISE NOTICE 'Dropped existing email lookup policy';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Create the critical email lookup policy
-- ============================================================================

CREATE POLICY "Users can view their own record by email"
  ON users 
  FOR SELECT 
  TO authenticated
  USING (email = auth.email());

-- ============================================================================
-- STEP 3: Verify the policy was created
-- ============================================================================

DO $$
DECLARE
  v_policy_count integer;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'users'
    AND policyname = 'Users can view their own record by email';
    
  IF v_policy_count = 0 THEN
    RAISE EXCEPTION 'CRITICAL: Email lookup policy was not created successfully';
  END IF;
  
  RAISE NOTICE '============================================';
  RAISE NOTICE 'AUTHENTICATION FIX APPLIED SUCCESSFULLY';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Policy "Users can view their own record by email" created';
  RAISE NOTICE 'Users can now login using email/password authentication';
  RAISE NOTICE 'RLS will allow: SELECT * FROM users WHERE email = auth.email()';
  RAISE NOTICE 'This fixes the authentication service error';
END $$;
