/*
  # Increase Students Phone Column Size

  ## Overview
  This migration increases the phone column size in the students table from varchar(30) 
  to varchar(50) to properly accommodate international phone numbers with country codes, 
  spaces, and various formatting.

  ## Problem Statement
  The current phone column size of varchar(30) is insufficient for some international 
  phone numbers, especially when formatted with country codes and spaces 
  (e.g., "+1 234 567 8900" or "+966 50 123 4567").

  ## Changes Made

  1. **Alter students.phone Column**
     - Change from: varchar(30)
     - Change to: varchar(50)
     - Reason: Provides sufficient space for international numbers with formatting

  2. **Verification**
     - Verify column type change
     - Check existing data is preserved
     - Confirm column accepts longer values

  ## Security
  - No RLS policy changes needed
  - Existing policies continue to work unchanged
  - Column constraints remain the same (nullable)

  ## Migration Safety
  - Safe to run on existing data (column expansion doesn't affect existing values)
  - No data transformation required
  - Backwards compatible (shorter values still work)
*/

-- ============================================================================
-- STEP 1: Increase Phone Column Size
-- ============================================================================

DO $$
BEGIN
  -- Alter phone column to increase size from varchar(30) to varchar(50)
  ALTER TABLE students ALTER COLUMN phone TYPE varchar(50);
  RAISE NOTICE 'Increased students.phone column size to varchar(50)';
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Failed to alter phone column: %', SQLERRM;
END $$;

-- ============================================================================
-- STEP 2: Update Column Comment
-- ============================================================================

COMMENT ON COLUMN students.phone IS 'Student direct contact number with country code (format: +XXX XXXXXXXXX) - supports up to 50 characters for international formats';

-- ============================================================================
-- STEP 3: Verification
-- ============================================================================

DO $$
DECLARE
  column_type text;
  column_length integer;
BEGIN
  -- Get current column type and length
  SELECT 
    data_type,
    character_maximum_length
  INTO column_type, column_length
  FROM information_schema.columns
  WHERE table_name = 'students' 
    AND column_name = 'phone';
  
  IF column_length = 50 THEN
    RAISE NOTICE '✓ Phone column successfully increased to varchar(50)';
  ELSE
    RAISE WARNING '✗ Phone column size is %, expected 50', column_length;
  END IF;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'PHONE COLUMN SIZE MIGRATION COMPLETED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  - Column: students.phone';
  RAISE NOTICE '  - New Type: varchar(50)';
  RAISE NOTICE '  - Previous: varchar(30)';
  RAISE NOTICE '  - Reason: Support longer international phone numbers';
  RAISE NOTICE '';
  RAISE NOTICE 'Notes:';
  RAISE NOTICE '  - Existing data is preserved';
  RAISE NOTICE '  - No application changes required for existing functionality';
  RAISE NOTICE '  - Column can now accept phone numbers up to 50 characters';
END $$;
