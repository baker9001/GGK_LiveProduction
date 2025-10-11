/*
  # Add Student Profile Fields

  ## Overview
  This migration adds demographic and profile fields to the students table to support
  comprehensive student profile management.

  ## Changes Made

  1. **New Columns Added to students table**
     - `birthday` (date): Student's date of birth for age verification and demographics
     - `gender` (varchar): Student's gender identity (optional field for inclusivity)
     - `phone` (varchar): Direct contact number for the student (in addition to parent contact)

  2. **Constraints and Defaults**
     - All new fields are optional (nullable) to support existing records
     - Gender field allows flexible values for inclusivity
     - Birthday field uses DATE type for proper date handling

  3. **Indexes**
     - Add index on birthday for age-based queries and reporting

  ## Security
  - No RLS policy changes needed - existing policies cover these columns
  - Fields are student-editable through their profile page
  - School administrators can view but typically don't edit these personal fields

  ## Migration Safety
  - Uses IF NOT EXISTS checks to prevent errors on re-run
  - All columns are nullable to avoid breaking existing records
  - No data transformation required
*/

-- ============================================================================
-- STEP 1: Add New Columns to students Table
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
  END IF;

  -- Add gender column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'gender'
  ) THEN
    ALTER TABLE students ADD COLUMN gender varchar(50);
    RAISE NOTICE 'Added gender column to students table';
  END IF;

  -- Add phone column for student direct contact
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'phone'
  ) THEN
    ALTER TABLE students ADD COLUMN phone varchar(30);
    RAISE NOTICE 'Added phone column to students table';
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

-- ============================================================================
-- STEP 3: Add Comments for Documentation
-- ============================================================================

COMMENT ON COLUMN students.birthday IS 'Student date of birth - used for age verification and demographics';
COMMENT ON COLUMN students.gender IS 'Student gender identity - optional field for inclusivity (values: male, female, other, prefer_not_to_say, or custom)';
COMMENT ON COLUMN students.phone IS 'Student direct contact number with country code (format: +XXX XXXXXXXXX)';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Student profile fields migration completed successfully';
END $$;
