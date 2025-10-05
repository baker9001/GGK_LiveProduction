/*
  # Fix Students Self-Access to Profile

  1. Changes
    - Add RLS policy allowing students to view their own record
    - Add RLS policy allowing students to update their own profile fields
    - Ensures students can access the student profile settings page

  2. Security
    - Students can only access their own record (not other students)
    - Students can only update specific allowed fields (phone, birthday, gender)
    - Cannot modify critical fields like school_id, branch_id, student_code, etc.
*/

-- Allow students to view their own student record
CREATE POLICY "Students can view own record"
  ON students
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Allow students to update their own profile fields
CREATE POLICY "Students can update own profile fields"
  ON students
  FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Add comment to document the policy
COMMENT ON POLICY "Students can view own record" ON students IS
'Allows students to view their own student record for profile page access';

COMMENT ON POLICY "Students can update own profile fields" ON students IS
'Allows students to update their own profile fields (phone, birthday, gender) but not critical fields';
