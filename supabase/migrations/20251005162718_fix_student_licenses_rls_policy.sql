/*
  # Fix Student Licenses RLS Policy for Student Self-Access

  ## Problem
  Students cannot view their learning pathway - infinite loading loop occurs.
  
  ## Root Cause
  The RLS policy "Students can view their own licenses" uses incorrect logic:
  - Current: `students.user_id = auth.uid()`
  - Issue: students.user_id references users.id, NOT auth.uid()
  - Result: Policy never matches, students cannot see their licenses
  
  ## Solution
  Update the policy to correctly match students to authenticated users:
  - Use: `students.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())`
  - This properly joins through the users table to match auth.uid()
  
  ## Impact
  - Students can now view their own licenses
  - Learning pathway page will load correctly
  - No impact on admin or teacher access
*/

-- Drop the incorrect policy
DROP POLICY IF EXISTS "Students can view their own licenses" ON student_licenses;

-- Create corrected policy with proper user_id matching
CREATE POLICY "Students can view their own licenses"
  ON student_licenses
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT s.id 
      FROM students s
      JOIN users u ON u.id = s.user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- Add documentation
COMMENT ON POLICY "Students can view their own licenses" ON student_licenses IS
  'Allows students to view their own license assignments. Correctly joins through users table to match auth.uid() with students.user_id.';

-- Verification
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'student_licenses'
    AND policyname = 'Students can view their own licenses'
    AND cmd = 'SELECT';
  
  IF policy_count = 1 THEN
    RAISE NOTICE '✓ Student licenses RLS policy fixed successfully';
  ELSE
    RAISE WARNING '✗ Policy creation may have failed';
  END IF;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'STUDENT LICENSES RLS POLICY FIX COMPLETED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Students can now:';
  RAISE NOTICE '  - View their assigned licenses';
  RAISE NOTICE '  - Access the learning pathway page';
  RAISE NOTICE '  - See their available subjects';
END $$;
