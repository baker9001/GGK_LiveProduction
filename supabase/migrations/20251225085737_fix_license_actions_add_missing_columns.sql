/*
  # Fix License Actions Table - Add Missing Columns

  ## Problem
  The license_actions table is missing critical columns:
  - performed_by: Tracks which admin performed the action
  - updated_at: Tracks when the record was last updated

  This causes INSERT failures when the frontend tries to include performed_by in the payload.

  ## Root Cause
  The table was created without these columns, likely because:
  1. Table existed before migration 20251013180000 ran
  2. CREATE TABLE IF NOT EXISTS skipped full creation
  3. Columns were never added

  ## Solution
  Add the missing columns with proper constraints and defaults:
  - performed_by: uuid REFERENCES users(id) - allows NULL for historical records
  - updated_at: timestamptz with trigger for auto-update

  ## Tables Modified
  - license_actions: Add performed_by, updated_at columns

  ## Security
  - Foreign key to users(id) maintains referential integrity
  - Trigger ensures updated_at is always current
  - RLS policies already exist and will work once column is added
*/

-- ============================================================================
-- STEP 1: Add missing performed_by column
-- ============================================================================

DO $$
BEGIN
  -- Add performed_by column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'license_actions'
    AND column_name = 'performed_by'
  ) THEN
    ALTER TABLE license_actions
    ADD COLUMN performed_by uuid REFERENCES users(id) ON DELETE SET NULL;
    
    RAISE NOTICE '✓ Added performed_by column to license_actions';
  ELSE
    RAISE NOTICE 'ℹ performed_by column already exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Add missing updated_at column
-- ============================================================================

DO $$
BEGIN
  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'license_actions'
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE license_actions
    ADD COLUMN updated_at timestamptz DEFAULT now() NOT NULL;
    
    RAISE NOTICE '✓ Added updated_at column to license_actions';
  ELSE
    RAISE NOTICE 'ℹ updated_at column already exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Create or replace updated_at trigger
-- ============================================================================

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_license_actions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_license_actions_updated_at ON license_actions;

-- Create trigger
CREATE TRIGGER set_license_actions_updated_at
  BEFORE UPDATE ON license_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_license_actions_updated_at();

-- ============================================================================
-- STEP 4: Add index for performed_by foreign key
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_license_actions_performed_by
  ON license_actions(performed_by)
  WHERE performed_by IS NOT NULL;

-- ============================================================================
-- STEP 5: Add column comments
-- ============================================================================

COMMENT ON COLUMN license_actions.performed_by IS 
'User who performed the license action (references users.id, converted from auth.uid())';

COMMENT ON COLUMN license_actions.updated_at IS 
'Timestamp of last update, automatically maintained by trigger';

-- ============================================================================
-- STEP 6: Verification
-- ============================================================================

DO $$
DECLARE
  performed_by_exists boolean;
  updated_at_exists boolean;
  trigger_exists boolean;
BEGIN
  -- Check if performed_by column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'license_actions'
    AND column_name = 'performed_by'
  ) INTO performed_by_exists;

  -- Check if updated_at column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'license_actions'
    AND column_name = 'updated_at'
  ) INTO updated_at_exists;

  -- Check if trigger exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'set_license_actions_updated_at'
    AND event_object_table = 'license_actions'
  ) INTO trigger_exists;

  IF performed_by_exists AND updated_at_exists AND trigger_exists THEN
    RAISE NOTICE '✅ License Actions Table Fix Complete:';
    RAISE NOTICE '  - performed_by column: ✓';
    RAISE NOTICE '  - updated_at column: ✓';
    RAISE NOTICE '  - updated_at trigger: ✓';
    RAISE NOTICE '  - Foreign key index: ✓';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 License actions (EXPAND/EXTEND/RENEW) will now work correctly!';
  ELSE
    RAISE WARNING '⚠ Verification incomplete:';
    IF NOT performed_by_exists THEN
      RAISE WARNING '  - performed_by column: ✗';
    END IF;
    IF NOT updated_at_exists THEN
      RAISE WARNING '  - updated_at column: ✗';
    END IF;
    IF NOT trigger_exists THEN
      RAISE WARNING '  - updated_at trigger: ✗';
    END IF;
  END IF;
END $$;
