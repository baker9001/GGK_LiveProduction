/*
  # Fix Licenses Table - Ensure total_allocated Column Exists with Proper Constraints

  ## Problem
  The licenses table has a schema conflict between migrations:
  - Migration 20251001191013 added total_allocated column (NOT NULL)
  - Migration 20251013164532 recreated the table without total_allocated
  - Frontend sends total_quantity but database expects total_allocated
  - Result: INSERT operations fail with "null value in column total_allocated violates not-null constraint"

  ## Solution
  1. Ensure total_allocated column exists with NOT NULL constraint
  2. Add a BEFORE INSERT/UPDATE trigger to automatically populate total_allocated from total_quantity if needed
  3. Backfill any existing records where total_allocated is NULL
  4. Maintain backward compatibility by keeping both columns synchronized

  ## Changes
  1. Add total_allocated column if it doesn't exist
  2. Populate total_allocated from total_quantity for existing records
  3. Set NOT NULL constraint on total_allocated
  4. Create trigger to auto-populate total_allocated from total_quantity
  5. Add indexes for performance

  ## Security
  - No RLS changes required
  - Maintains existing access control policies
*/

-- ============================================================================
-- STEP 1: Ensure total_allocated column exists
-- ============================================================================

DO $$
BEGIN
  -- Add total_allocated column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'licenses' AND column_name = 'total_allocated'
  ) THEN
    ALTER TABLE licenses ADD COLUMN total_allocated integer;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Backfill total_allocated from total_quantity
-- ============================================================================

-- Populate total_allocated from total_quantity for any NULL values
UPDATE licenses
SET total_allocated = total_quantity
WHERE total_allocated IS NULL;

-- ============================================================================
-- STEP 3: Add NOT NULL constraint to total_allocated
-- ============================================================================

-- Now that all rows have values, make it NOT NULL
ALTER TABLE licenses 
  ALTER COLUMN total_allocated SET NOT NULL;

-- Add check constraint to ensure positive values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'licenses_total_allocated_positive'
  ) THEN
    ALTER TABLE licenses
      ADD CONSTRAINT licenses_total_allocated_positive
      CHECK (total_allocated > 0);
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Create trigger for backward compatibility
-- ============================================================================

-- This trigger ensures that if someone sends total_quantity but not total_allocated,
-- we automatically set total_allocated = total_quantity
CREATE OR REPLACE FUNCTION sync_license_total_allocated()
RETURNS TRIGGER AS $$
BEGIN
  -- On INSERT: If total_allocated is NULL but total_quantity is provided, sync them
  IF TG_OP = 'INSERT' THEN
    IF NEW.total_allocated IS NULL AND NEW.total_quantity IS NOT NULL THEN
      NEW.total_allocated := NEW.total_quantity;
    END IF;
    -- Also sync total_quantity if total_allocated is provided but total_quantity is NULL
    IF NEW.total_quantity IS NULL AND NEW.total_allocated IS NOT NULL THEN
      NEW.total_quantity := NEW.total_allocated;
    END IF;
  END IF;

  -- On UPDATE: Keep them in sync if one changes
  IF TG_OP = 'UPDATE' THEN
    -- If total_quantity changed but total_allocated didn't, sync total_allocated
    IF NEW.total_quantity != OLD.total_quantity AND NEW.total_allocated = OLD.total_allocated THEN
      NEW.total_allocated := NEW.total_quantity;
    END IF;
    -- If total_allocated changed but total_quantity didn't, sync total_quantity
    IF NEW.total_allocated != OLD.total_allocated AND NEW.total_quantity = OLD.total_quantity THEN
      NEW.total_quantity := NEW.total_allocated;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_sync_license_total_allocated ON licenses;

-- Create the trigger (runs BEFORE INSERT/UPDATE)
CREATE TRIGGER trigger_sync_license_total_allocated
  BEFORE INSERT OR UPDATE ON licenses
  FOR EACH ROW
  EXECUTE FUNCTION sync_license_total_allocated();

-- ============================================================================
-- STEP 5: Add indexes for performance (if they don't exist)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_licenses_total_allocated 
  ON licenses(total_allocated);

CREATE INDEX IF NOT EXISTS idx_licenses_allocation_usage 
  ON licenses(total_allocated, total_assigned, total_consumed);

-- ============================================================================
-- STEP 6: Add helpful comments
-- ============================================================================

COMMENT ON COLUMN licenses.total_allocated IS 
  'Total number of licenses allocated by system admin. Automatically synced with total_quantity for backward compatibility.';

COMMENT ON TRIGGER trigger_sync_license_total_allocated ON licenses IS 
  'Automatically synchronizes total_allocated and total_quantity columns for backward compatibility. Ensures INSERT operations work whether sending total_quantity or total_allocated.';

-- ============================================================================
-- STEP 7: Verify the fix
-- ============================================================================

-- Log the fix completion
DO $$
DECLARE
  v_record_count integer;
  v_null_count integer;
BEGIN
  SELECT COUNT(*) INTO v_record_count FROM licenses;
  SELECT COUNT(*) INTO v_null_count FROM licenses WHERE total_allocated IS NULL;
  
  RAISE NOTICE 'License table fix completed:';
  RAISE NOTICE '  - Total licenses: %', v_record_count;
  RAISE NOTICE '  - Licenses with NULL total_allocated: %', v_null_count;
  RAISE NOTICE '  - Trigger sync_license_total_allocated created successfully';
END $$;
