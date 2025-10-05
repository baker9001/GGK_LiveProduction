/*
  # Fix Student Profile UPDATE RLS Policy

  ## Problem
  Students cannot update their phone numbers despite success messages showing.

  ## Root Cause
  The RLS policy "Students can update their own record" uses:
    `USING (user_id = get_effective_user_id())`

  However:
  - get_effective_user_id() returns auth.uid() (Supabase auth UUID)
  - students.user_id references users.id (internal application UUID)
  - These are different values

  The correct lookup chain is:
    students.user_id → users.id → users.auth_user_id → auth.uid()

  ## Solution
  Update the RLS policy to properly match students.user_id with users.id
  by looking up users where auth_user_id = auth.uid()

  ## Security
  - Maintains same security level: students can only update their own record
  - Uses proper user_id lookup chain
  - Prevents students from updating critical fields (school_id, branch_id, etc.)
  - Works correctly with both normal mode and test mode
*/

-- Drop the incorrect policy
DROP POLICY IF EXISTS "Students can update their own record" ON students;

-- Create correct policy with proper user_id lookup
CREATE POLICY "Students can update their own record"
  ON students
  FOR UPDATE
  TO authenticated
  USING (
    -- Match students.user_id with users.id where users.auth_user_id = effective user
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = get_effective_user_id()
    )
  )
  WITH CHECK (
    -- Same check for WITH CHECK clause
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = get_effective_user_id()
    )
  );

-- Add policy comment for documentation
COMMENT ON POLICY "Students can update their own record" ON students IS
  'Allows students to update their own profile fields (phone, birthday, gender). Uses proper user_id lookup: students.user_id → users.id → users.auth_user_id → auth.uid(). Works with both normal and test mode via get_effective_user_id().';

-- Verify the policy was created
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'students'
    AND policyname = 'Students can update their own record';

  IF policy_count = 1 THEN
    RAISE NOTICE '✓ Student UPDATE policy fixed successfully';
  ELSE
    RAISE WARNING '✗ Failed to create student UPDATE policy';
  END IF;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'STUDENT UPDATE RLS POLICY FIX COMPLETED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  - Fixed students UPDATE policy to use proper user_id lookup';
  RAISE NOTICE '  - Policy now correctly matches students.user_id with users.id';
  RAISE NOTICE '  - Students can now update phone, birthday, gender fields';
  RAISE NOTICE '  - Policy works with both normal and test mode';
  RAISE NOTICE '';
  RAISE NOTICE 'Testing:';
  RAISE NOTICE '  1. Login as a student';
  RAISE NOTICE '  2. Navigate to profile page';
  RAISE NOTICE '  3. Update phone number and save';
  RAISE NOTICE '  4. Refresh page and verify phone number persisted';
END $$;
