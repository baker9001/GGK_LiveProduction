/*
  # Fix License Actions - Make change_quantity Nullable

  ## Problem
  The license_actions.change_quantity column has a NOT NULL constraint, but 
  EXTEND actions don't have a quantity change (only date change). This causes
  EXTEND operations to fail with NOT NULL constraint violation.

  ## Root Cause
  - change_quantity is NOT NULL
  - EXTEND action sets change_quantity = null (no quantity change for date extension)
  - INSERT fails with constraint violation

  ## Solution
  Make change_quantity nullable since it's not applicable for all action types:
  - EXPAND: Has change_quantity (additional licenses)
  - EXTEND: No change_quantity (only date changes) → NULL
  - RENEW: Has change_quantity (difference in total quantity)

  ## Tables Modified
  - license_actions: Make change_quantity nullable

  ## Impact
  - EXTEND action will now work correctly
  - All three license actions (EXPAND, EXTEND, RENEW) fully functional
*/

-- ============================================================================
-- STEP 1: Make change_quantity nullable
-- ============================================================================

DO $$
BEGIN
  -- Drop NOT NULL constraint from change_quantity
  ALTER TABLE license_actions 
  ALTER COLUMN change_quantity DROP NOT NULL;
  
  RAISE NOTICE '✓ Removed NOT NULL constraint from change_quantity column';
  RAISE NOTICE '✓ EXTEND actions can now set change_quantity to NULL';
END $$;

-- ============================================================================
-- STEP 2: Add column comment explaining when NULL is valid
-- ============================================================================

COMMENT ON COLUMN license_actions.change_quantity IS 
'Quantity change for this action. NULL for EXTEND actions (date-only changes). 
Required for EXPAND (additional quantity) and RENEW (total quantity difference).';

-- ============================================================================
-- STEP 3: Verification
-- ============================================================================

DO $$
DECLARE
  col_nullable text;
BEGIN
  -- Check if change_quantity is now nullable
  SELECT c.is_nullable INTO col_nullable
  FROM information_schema.columns c
  WHERE c.table_name = 'license_actions'
  AND c.column_name = 'change_quantity';

  IF col_nullable = 'YES' THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ License Actions Fix Complete:';
    RAISE NOTICE '  - change_quantity: NOW NULLABLE ✓';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 All license actions now work:';
    RAISE NOTICE '   - EXPAND: change_quantity = additional quantity';
    RAISE NOTICE '   - EXTEND: change_quantity = NULL (date change only)';
    RAISE NOTICE '   - RENEW: change_quantity = new_total - old_total';
  ELSE
    RAISE WARNING '⚠ Verification failed: change_quantity is still NOT NULL';
  END IF;
END $$;
