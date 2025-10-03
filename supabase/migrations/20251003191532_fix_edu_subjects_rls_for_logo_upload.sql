/*
  # Fix edu_subjects RLS Policies for Logo Upload

  ## Problem Identified
  The current RLS policy on edu_subjects uses `FOR ALL` which causes issues during UPDATE operations.
  System admin users authenticated via Supabase Auth cannot update edu_subjects records because:
  1. The `FOR ALL` policy combines all operations into one
  2. The UPDATE operation fails the USING clause check before attempting the update
  3. The is_admin_user() function may not be properly identifying admins during UPDATE operations

  ## Solution
  1. Drop the existing "System admins can manage edu_subjects" policy
  2. Create separate, explicit policies for INSERT, UPDATE, and DELETE operations
  3. Keep the SELECT policy for all authenticated users
  4. Add explicit INSERT policy for system admins
  5. Add explicit UPDATE policy with proper checks for system admins
  6. Add explicit DELETE policy for system admins

  ## Security
  - All authenticated users can view edu_subjects (read-only access)
  - Only system admins (verified via is_admin_user function) can modify edu_subjects
  - Policies use SECURITY DEFINER function to bypass RLS when checking admin_users table
  - Each operation has its own policy for clarity and proper enforcement
*/

-- ============================================================================
-- STEP 1: Drop the problematic "FOR ALL" policy
-- ============================================================================

DROP POLICY IF EXISTS "System admins can manage edu_subjects" ON edu_subjects;

-- ============================================================================
-- STEP 2: Create Explicit Policies for Each Operation
-- ============================================================================

-- Policy for INSERT: Allow system admins to create new subjects
CREATE POLICY "System admins can insert edu_subjects"
  ON edu_subjects FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_user(auth.uid()));

-- Policy for UPDATE: Allow system admins to update existing subjects
-- This is the critical fix for logo upload functionality
CREATE POLICY "System admins can update edu_subjects"
  ON edu_subjects FOR UPDATE
  TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Policy for DELETE: Allow system admins to delete subjects
CREATE POLICY "System admins can delete edu_subjects"
  ON edu_subjects FOR DELETE
  TO authenticated
  USING (is_admin_user(auth.uid()));

-- ============================================================================
-- STEP 3: Add Service Role Full Access (for Edge Functions and admin operations)
-- ============================================================================

CREATE POLICY "Service role full access to edu_subjects"
  ON edu_subjects FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- STEP 4: Verification
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
  insert_policy_exists BOOLEAN;
  update_policy_exists BOOLEAN;
  delete_policy_exists BOOLEAN;
BEGIN
  -- Count total policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'edu_subjects' AND schemaname = 'public';

  -- Check specific policies exist
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'edu_subjects' 
    AND policyname = 'System admins can insert edu_subjects'
  ) INTO insert_policy_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'edu_subjects' 
    AND policyname = 'System admins can update edu_subjects'
  ) INTO update_policy_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'edu_subjects' 
    AND policyname = 'System admins can delete edu_subjects'
  ) INTO delete_policy_exists;

  RAISE NOTICE '========================================================';
  RAISE NOTICE 'EDU_SUBJECTS RLS POLICY FIX COMPLETE';
  RAISE NOTICE '========================================================';
  RAISE NOTICE 'Total policies on edu_subjects: %', policy_count;
  RAISE NOTICE 'INSERT policy exists: %', insert_policy_exists;
  RAISE NOTICE 'UPDATE policy exists: %', update_policy_exists;
  RAISE NOTICE 'DELETE policy exists: %', delete_policy_exists;
  RAISE NOTICE '';
  RAISE NOTICE 'System admins can now:';
  RAISE NOTICE '  - Create new subjects with logos';
  RAISE NOTICE '  - Update existing subjects including logo_url';
  RAISE NOTICE '  - Delete subjects';
  RAISE NOTICE '';
  RAISE NOTICE 'All authenticated users can view subjects (read-only)';
  RAISE NOTICE '========================================================';
END $$;
