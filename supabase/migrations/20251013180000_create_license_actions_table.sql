/*
  # Create License Actions Table for Action History Tracking

  ## Problem
  The license_actions table is referenced in the application code but was never created.
  This causes license action operations (EXPAND, EXTEND, RENEW) to fail when attempting
  to insert records into the non-existent table.

  ## Solution
  Create the license_actions table with:
  1. Proper schema with all required columns
  2. Foreign key constraints to licenses table
  3. Validation constraints for action types and data integrity
  4. Indexes for performance
  5. RLS policies for secure access control
  6. Audit trail with timestamps and user tracking

  ## Tables Created
  - license_actions: Records all actions performed on licenses (expand, extend, renew)

  ## Columns
  - id: Unique identifier for the action record
  - license_id: Reference to the license being modified
  - action_type: Type of action (EXPAND, EXTEND, RENEW)
  - change_quantity: Number of licenses added (for EXPAND and RENEW)
  - new_end_date: New expiration date (for EXTEND and RENEW)
  - notes: Optional admin notes about the action
  - performed_by: User who performed the action
  - created_at: Timestamp when action was recorded
  - updated_at: Timestamp of last update

  ## Security
  - System admins: Can insert, update, and delete license actions
  - Authenticated users: Read-only access to view license history
  - Service role: Full access for system operations

  ## Validation
  - Action type must be one of: EXPAND, EXTEND, RENEW
  - Change quantity must be positive if provided
  - Foreign key ensures license exists
  - Proper timestamps for audit trail
*/

-- ============================================================================
-- STEP 1: Create license_actions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS license_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('EXPAND', 'EXTEND', 'RENEW')),
  change_quantity integer CHECK (change_quantity IS NULL OR change_quantity > 0),
  new_end_date date,
  notes text,
  performed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  -- Validation: EXPAND actions should have change_quantity
  CONSTRAINT expand_has_quantity CHECK (
    action_type != 'EXPAND' OR change_quantity IS NOT NULL
  ),

  -- Validation: EXTEND and RENEW actions should have new_end_date
  CONSTRAINT extend_renew_has_date CHECK (
    action_type NOT IN ('EXTEND', 'RENEW') OR new_end_date IS NOT NULL
  )
);

-- Add comment for documentation
COMMENT ON TABLE license_actions IS 'Tracks all modification actions performed on licenses (expand, extend, renew) for audit and history purposes';
COMMENT ON COLUMN license_actions.action_type IS 'Type of action: EXPAND (add more licenses), EXTEND (extend expiration date), RENEW (create new period)';
COMMENT ON COLUMN license_actions.change_quantity IS 'Number of licenses added (used for EXPAND and RENEW actions)';
COMMENT ON COLUMN license_actions.new_end_date IS 'New expiration date after the action (used for EXTEND and RENEW actions)';
COMMENT ON COLUMN license_actions.performed_by IS 'User who performed the action (typically a system admin)';

-- ============================================================================
-- STEP 2: Create indexes for performance
-- ============================================================================

-- Index for querying actions by license (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_license_actions_license_id
  ON license_actions(license_id);

-- Index for filtering by action type
CREATE INDEX IF NOT EXISTS idx_license_actions_action_type
  ON license_actions(action_type);

-- Index for chronological sorting (history view)
CREATE INDEX IF NOT EXISTS idx_license_actions_created_at
  ON license_actions(created_at DESC);

-- Composite index for license history queries (optimizes main use case)
CREATE INDEX IF NOT EXISTS idx_license_actions_license_created
  ON license_actions(license_id, created_at DESC);

-- Index for auditing by user
CREATE INDEX IF NOT EXISTS idx_license_actions_performed_by
  ON license_actions(performed_by)
  WHERE performed_by IS NOT NULL;

-- ============================================================================
-- STEP 3: Add updated_at trigger for audit trail
-- ============================================================================

-- The update_updated_at_column() function should already exist from licenses table migration
-- If not, create it here
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    CREATE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END $$;

-- Create trigger to auto-update updated_at column
DROP TRIGGER IF EXISTS update_license_actions_updated_at ON license_actions;
CREATE TRIGGER update_license_actions_updated_at
  BEFORE UPDATE ON license_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 4: Enable Row Level Security
-- ============================================================================

ALTER TABLE license_actions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: Create RLS policies
-- ============================================================================

-- Ensure is_admin_user() helper function exists (should be created in earlier migrations)
-- This function has SECURITY DEFINER to bypass RLS when checking admin_users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'is_admin_user'
  ) THEN
    CREATE FUNCTION is_admin_user(user_id UUID)
    RETURNS BOOLEAN AS $func$
    BEGIN
      RETURN EXISTS (
        SELECT 1 FROM admin_users
        WHERE id = user_id
      );
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION is_admin_user TO authenticated;
  END IF;
END $$;

-- Drop any existing policies to ensure clean state
DROP POLICY IF EXISTS "Authenticated users can view license_actions" ON license_actions;
DROP POLICY IF EXISTS "System admins can create license_actions" ON license_actions;
DROP POLICY IF EXISTS "System admins can update license_actions" ON license_actions;
DROP POLICY IF EXISTS "System admins can delete license_actions" ON license_actions;
DROP POLICY IF EXISTS "System admins can manage license_actions" ON license_actions;
DROP POLICY IF EXISTS "Service role full access to license_actions" ON license_actions;

-- Policy 1: All authenticated users can view license action history
CREATE POLICY "Authenticated users can view license_actions"
  ON license_actions FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: System admins can INSERT new license actions
CREATE POLICY "System admins can create license_actions"
  ON license_actions FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_user(auth.uid()));

-- Policy 3: System admins can UPDATE license actions
CREATE POLICY "System admins can update license_actions"
  ON license_actions FOR UPDATE
  TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Policy 4: System admins can DELETE license actions
CREATE POLICY "System admins can delete license_actions"
  ON license_actions FOR DELETE
  TO authenticated
  USING (is_admin_user(auth.uid()));

-- Policy 5: Service role has full access (for system operations)
CREATE POLICY "Service role full access to license_actions"
  ON license_actions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- STEP 6: Grant necessary permissions
-- ============================================================================

-- Grant execute permission on the helper function
GRANT EXECUTE ON FUNCTION is_admin_user TO authenticated;

-- ============================================================================
-- STEP 7: Verification and logging
-- ============================================================================

-- Add comment to track this migration
COMMENT ON TABLE license_actions IS 'License action history table with RLS policies (migration 20251013180000). Tracks EXPAND, EXTEND, and RENEW operations.';

-- Log successful creation
DO $$
BEGIN
  RAISE NOTICE 'License actions table created successfully with:';
  RAISE NOTICE '  - Proper schema with validation constraints';
  RAISE NOTICE '  - Performance indexes on key columns';
  RAISE NOTICE '  - RLS policies for secure access';
  RAISE NOTICE '  - Audit trail with timestamps';
  RAISE NOTICE '  - Support for EXPAND, EXTEND, and RENEW actions';
END $$;
