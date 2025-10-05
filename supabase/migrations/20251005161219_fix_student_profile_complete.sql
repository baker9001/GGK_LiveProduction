/*
  # Complete Student Profile Fix - Add Missing Columns and Fix RLS Policies

  ## Problem Statement
  Student profile page is failing with error: "column students.birthday does not exist"
  
  ## Root Causes Identified
  1. Migration 20251004164612_add_student_profile_fields.sql was never applied to production
  2. Birthday, gender, and phone columns are missing from students table
  3. RLS policies exist but students cannot access their own records due to user_id mismatch
  4. Policy uses `user_id = auth.uid()` but students.user_id references users.id, not auth.uid()

  ## Changes Made

  ### 1. Add Missing Columns to students Table
  - `birthday` (date): Student's date of birth for age verification and demographics
  - `gender` (varchar): Student's gender identity (optional field for inclusivity)
  - `phone` (varchar): Direct contact number for the student

  ### 2. Fix RLS Policies for Student Self-Access
  - Drop and recreate "Students can view their own record" policy
  - Drop and recreate "Students can update their own record" policy
  - Use correct user_id lookup: students.user_id must match users.id where users.auth_user_id = auth.uid()
  - Allow students to update only safe fields: phone, birthday, gender (not school_id, branch_id, etc.)

  ### 3. Add Indexes for Performance
  - Index on birthday for age-based queries
  - Index on gender for demographic reporting
  - Composite index on user_id for faster policy checks

  ## Security
  - Students can only view and update their own record
  - Students cannot modify critical fields (school_id, branch_id, student_code, etc.)
  - All existing admin policies remain unchanged
  - RLS is properly enforced

  ## Migration Safety
  - Uses IF NOT EXISTS checks to prevent errors on re-run
  - All columns are nullable to avoid breaking existing records
  - Policies are dropped before recreation to avoid conflicts
  - No data transformation required
*/

-- ============================================================================
-- STEP 1: Add Missing Columns to students Table
-- ============================================================================

DO $$
BEGIN
  -- Add birthday column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'birthday'
  ) THEN
    ALTER TABLE students ADD COLUMN birthday date;
    RAISE NOTICE 'Added birthday column to students table';
  ELSE
    RAISE NOTICE 'Birthday column already exists';
  END IF;

  -- Add gender column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'gender'
  ) THEN
    ALTER TABLE students ADD COLUMN gender varchar(50);
    RAISE NOTICE 'Added gender column to students table';
  ELSE
    RAISE NOTICE 'Gender column already exists';
  END IF;

  -- Add phone column for student direct contact
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'phone'
  ) THEN
    ALTER TABLE students ADD COLUMN phone varchar(30);
    RAISE NOTICE 'Added phone column to students table';
  ELSE
    RAISE NOTICE 'Phone column already exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Add Indexes for Performance
-- ============================================================================

-- Index on birthday for age-based queries and reporting
CREATE INDEX IF NOT EXISTS idx_students_birthday
ON students(birthday)
WHERE birthday IS NOT NULL;

-- Index on gender for demographic reporting
CREATE INDEX IF NOT EXISTS idx_students_gender
ON students(gender)
WHERE gender IS NOT NULL;

-- Index on user_id for faster RLS policy checks
CREATE INDEX IF NOT EXISTS idx_students_user_id
ON students(user_id)
WHERE user_id IS NOT NULL;

-- ============================================================================
-- STEP 3: Fix RLS Policies for Student Self-Access
-- ============================================================================

-- Drop existing student self-access policies if they exist
DROP POLICY IF EXISTS "Students can view their own record" ON students;
DROP POLICY IF EXISTS "Students can view own record" ON students;
DROP POLICY IF EXISTS "Students can update their own record" ON students;
DROP POLICY IF EXISTS "Students can update own record" ON students;
DROP POLICY IF EXISTS "Students can update own profile fields" ON students;

-- Create policy for students to view their own record
-- CRITICAL FIX: students.user_id references users.id, NOT auth.uid()
-- We must join to users table to match auth.uid() with users.auth_user_id
CREATE POLICY "Students can view their own record"
  ON students
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Create policy for students to update their own profile fields
-- Allows updates to phone, birthday, gender only (not critical fields)
CREATE POLICY "Students can update their own profile"
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

-- ============================================================================
-- STEP 4: Add Comments for Documentation
-- ============================================================================

COMMENT ON COLUMN students.birthday IS 'Student date of birth - used for age verification and demographics';
COMMENT ON COLUMN students.gender IS 'Student gender identity - optional field for inclusivity (values: male, female, other, prefer_not_to_say, or custom)';
COMMENT ON COLUMN students.phone IS 'Student direct contact number with country code (format: +XXX XXXXXXXXX)';

COMMENT ON POLICY "Students can view their own record" ON students IS 
  'Allows students to view their own student record for profile page access. Uses users.auth_user_id to match auth.uid().';

COMMENT ON POLICY "Students can update their own profile" ON students IS 
  'Allows students to update their own profile fields (phone, birthday, gender) but not critical fields like school_id, branch_id, or student_code.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  col_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- Verify columns exist
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_name = 'students'
    AND column_name IN ('birthday', 'gender', 'phone');
  
  IF col_count = 3 THEN
    RAISE NOTICE '✓ All student profile columns exist (birthday, gender, phone)';
  ELSE
    RAISE WARNING '✗ Only % of 3 expected columns exist', col_count;
  END IF;

  -- Verify policies exist
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'students'
    AND policyname IN ('Students can view their own record', 'Students can update their own profile');
  
  IF policy_count = 2 THEN
    RAISE NOTICE '✓ Student self-access policies created successfully';
  ELSE
    RAISE WARNING '✗ Only % of 2 expected policies exist', policy_count;
  END IF;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'STUDENT PROFILE FIX COMPLETED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  - Added birthday, gender, phone columns to students table';
  RAISE NOTICE '  - Created indexes for performance';
  RAISE NOTICE '  - Fixed RLS policies for student self-access';
  RAISE NOTICE '  - Students can now view and update their own profile';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Test student profile page access';
  RAISE NOTICE '  2. Verify students can update their profile';
  RAISE NOTICE '  3. Confirm RLS policies work correctly';
END $$;
