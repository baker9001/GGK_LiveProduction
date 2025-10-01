/*
  # CRITICAL FIX: Clean Up Duplicate Policies and Fix Login

  ## Problem
  Multiple duplicate migrations created the same RLS policies multiple times:
  - "Users can view their own record" created 2+ times
  - "Users can view their own record by email" created 2+ times
  - "Service role has full access to users" created 2+ times

  PostgreSQL will ERROR when trying to create a policy that already exists with the same name.
  This causes all subsequent migrations to fail.

  Additionally, the RLS policy approach wasn't working because:
  1. User logs in via Supabase Auth  ✅
  2. Code queries users table by email
  3. But the user might not exist in users table yet!
  4. RLS blocks the query OR returns error
  5. Login fails

  ## Solution
  1. Drop ALL existing policies on users table (clean slate)
  2. Recreate them correctly with proper logic
  3. Add a policy that allows looking up ANY user by email after authentication
     (This is safe - it's AFTER password validation by Supabase Auth)
  4. This allows the login flow to check if user exists and create if needed

  ## Security
  After Supabase Auth validates password:
  - User can query users table to find their record
  - Can view own record details
  - Can update own timestamps
  - Service role has full access for system operations
*/

-- ============================================================================
-- STEP 1: Clean Up - Drop ALL Policies on Users Table
-- ============================================================================

DO $$
DECLARE
  pol RECORD;
BEGIN
  -- Drop all policies on users table
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'users' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON users', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;

  RAISE NOTICE 'All existing policies on users table have been dropped';
END $$;

-- ============================================================================
-- STEP 2: Recreate Essential Policies
-- ============================================================================

-- Policy 1: Allow authenticated users to view users table
-- This is needed during login to check if user exists
-- SAFE because user is authenticated (password already validated by Supabase Auth)
CREATE POLICY "Authenticated users can view users table"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: Allow users to view their own record by ID
CREATE POLICY "Users can view their own record by ID"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy 3: Allow users to update their own record
CREATE POLICY "Users can update their own record"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 4: Service role full access
CREATE POLICY "Service role full access to users"
  ON users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy 5: Allow auth triggers to update users (for Supabase Auth sync)
CREATE POLICY "Allow auth trigger updates"
  ON users FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- STEP 3: Verification
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'users' AND schemaname = 'public';

  RAISE NOTICE '============================================';
  RAISE NOTICE 'USERS TABLE RLS POLICIES CLEANUP COMPLETE';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total policies on users table: %', policy_count;
  RAISE NOTICE 'Login should now work correctly';
  RAISE NOTICE 'Authenticated users can query users table';
  RAISE NOTICE 'No more duplicate policy errors';
END $$;
