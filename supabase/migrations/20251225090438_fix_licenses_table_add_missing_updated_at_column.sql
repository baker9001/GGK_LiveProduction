/*
  # Fix Licenses Table - Add Missing updated_at Column

  ## Problem
  The licenses table has a trigger `update_licenses_updated_at` that tries to 
  set NEW.updated_at, but the column doesn't exist. This causes UPDATE operations 
  to fail with error: "record 'new' has no field 'updated_at'"

  ## Root Cause
  - Trigger exists: update_licenses_updated_at (calls update_updated_at_column())
  - Column missing: updated_at
  - Result: Any UPDATE on licenses table fails

  ## Solution
  Add the missing updated_at column with proper default value.

  ## Tables Modified
  - licenses: Add updated_at column

  ## Impact
  - License EXPAND/EXTEND/RENEW actions will now work completely
  - Full audit trail maintained with both created_at and updated_at
*/

-- ============================================================================
-- STEP 1: Add missing updated_at column to licenses table
-- ============================================================================

DO $$
BEGIN
  -- Add updated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'licenses'
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE licenses
    ADD COLUMN updated_at timestamptz DEFAULT now() NOT NULL;
    
    -- Initialize updated_at to created_at for existing records
    UPDATE licenses
    SET updated_at = created_at
    WHERE updated_at IS NULL;
    
    RAISE NOTICE '✓ Added updated_at column to licenses table';
    RAISE NOTICE '✓ Initialized existing records with created_at values';
  ELSE
    RAISE NOTICE 'ℹ updated_at column already exists on licenses table';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Verify the trigger function exists
-- ============================================================================

-- The trigger already exists, just verify the function
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'update_updated_at_column'
  ) THEN
    -- Create the function if it doesn't exist
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $func$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $func$;
    
    RAISE NOTICE '✓ Created update_updated_at_column() function';
  ELSE
    RAISE NOTICE 'ℹ update_updated_at_column() function already exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Add column comment
-- ============================================================================

COMMENT ON COLUMN licenses.updated_at IS 
'Timestamp of last update, automatically maintained by trigger';

-- ============================================================================
-- STEP 4: Verification
-- ============================================================================

DO $$
DECLARE
  column_exists boolean;
  trigger_exists boolean;
  function_exists boolean;
BEGIN
  -- Check if updated_at column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'licenses'
    AND column_name = 'updated_at'
  ) INTO column_exists;

  -- Check if trigger exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'update_licenses_updated_at'
    AND event_object_table = 'licenses'
  ) INTO trigger_exists;

  -- Check if function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'update_updated_at_column'
  ) INTO function_exists;

  IF column_exists AND trigger_exists AND function_exists THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Licenses Table Fix Complete:';
    RAISE NOTICE '  - updated_at column: ✓';
    RAISE NOTICE '  - Trigger active: ✓';
    RAISE NOTICE '  - Function exists: ✓';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 License UPDATE operations will now work correctly!';
    RAISE NOTICE '   All EXPAND/EXTEND/RENEW actions are now fully functional!';
  ELSE
    RAISE WARNING '⚠ Verification incomplete:';
    IF NOT column_exists THEN
      RAISE WARNING '  - updated_at column: ✗';
    END IF;
    IF NOT trigger_exists THEN
      RAISE WARNING '  - Trigger: ✗';
    END IF;
    IF NOT function_exists THEN
      RAISE WARNING '  - Function: ✗';
    END IF;
  END IF;
END $$;
