/*
  # Fix License Actions Foreign Key Reference

  ## Problem
  The license_actions table has `performed_by uuid REFERENCES users(id)`, but system admins
  performing license actions have their IDs in the `admin_users` table, not the `users` table.
  When the frontend tries to INSERT with `auth.uid()`, the foreign key constraint fails because
  that UUID doesn't exist in the `users` table.

  ## Root Cause
  - `performed_by` references `users(id)`
  - System admins are stored in `admin_users` table
  - `auth.uid()` returns an ID that exists in `admin_users`, not `users`
  - Foreign key constraint violation occurs on INSERT

  ## Solution
  1. Drop the existing foreign key constraint on `performed_by`
  2. Change the reference to `admin_users(id)` instead of `users(id)`
  3. This allows system admins to properly record their actions
  4. Frontend code already uses `auth.uid()` which matches `admin_users.id`

  ## Impact
  - Fixes EXPAND, EXTEND, and RENEW license actions
  - System admins can now successfully record action history
  - Maintains referential integrity with correct table
  - No data loss (just constraint modification)
*/

-- ============================================================================
-- STEP 1: Drop existing foreign key constraint
-- ============================================================================

DO $$
BEGIN
  -- Drop the constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'license_actions_performed_by_fkey'
    AND table_name = 'license_actions'
  ) THEN
    ALTER TABLE license_actions
    DROP CONSTRAINT license_actions_performed_by_fkey;

    RAISE NOTICE 'Dropped existing foreign key constraint: license_actions_performed_by_fkey';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Add new foreign key constraint referencing admin_users
-- ============================================================================

-- Add foreign key to admin_users table instead of users table
ALTER TABLE license_actions
  ADD CONSTRAINT license_actions_performed_by_fkey
  FOREIGN KEY (performed_by)
  REFERENCES admin_users(id)
  ON DELETE SET NULL;

-- ============================================================================
-- STEP 3: Add comment for documentation
-- ============================================================================

COMMENT ON COLUMN license_actions.performed_by IS 'System admin who performed the license action (references admin_users.id, matches auth.uid() for system admins)';

-- ============================================================================
-- STEP 4: Verification
-- ============================================================================

DO $$
DECLARE
  constraint_exists boolean;
BEGIN
  -- Check if the new constraint exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'license_actions'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'performed_by'
    AND ccu.table_name = 'admin_users'
  ) INTO constraint_exists;

  IF constraint_exists THEN
    RAISE NOTICE '✓ Foreign key constraint successfully updated';
    RAISE NOTICE '  - Column: license_actions.performed_by';
    RAISE NOTICE '  - References: admin_users(id)';
    RAISE NOTICE '  - On Delete: SET NULL';
    RAISE NOTICE '  - License actions can now be recorded by system admins';
  ELSE
    RAISE WARNING '⚠ Foreign key constraint may not have been created correctly';
  END IF;
END $$;
