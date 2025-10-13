/*
  # Fix Licenses Table RLS Policies for System Admin INSERT Operations

  ## Problem
  System admin users cannot create new licenses due to conflicting RLS policies.
  Multiple migrations created duplicate policies causing issues:
  1. Old policies using inline subqueries: `auth.uid() IN (SELECT id FROM admin_users)`
     - These cause circular RLS dependency issues
  2. New policies using helper functions: `is_admin_user(auth.uid())`
     - These properly bypass RLS with SECURITY DEFINER

  ## Solution
  1. Ensure licenses table exists with proper schema
  2. Drop ALL existing conflicting policies on licenses table
  3. Recreate clean, function-based policies for all operations
  4. Verify is_admin_user() helper function exists and works correctly
  5. Add proper indexes and constraints

  ## Tables Affected
  - licenses
  - license_actions

  ## Security
  - System admins: Full access via is_admin_user() function
  - Authenticated users: Read-only access to view licenses
  - Service role: Full access for system operations
*/

-- ============================================================================
-- STEP 1: Ensure licenses table exists with proper schema
-- ============================================================================

CREATE TABLE IF NOT EXISTS licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  data_structure_id uuid NOT NULL REFERENCES data_structures(id) ON DELETE RESTRICT,
  total_quantity integer NOT NULL CHECK (total_quantity > 0),
  used_quantity integer DEFAULT 0 NOT NULL CHECK (used_quantity >= 0 AND used_quantity <= total_quantity),
  start_date date NOT NULL,
  end_date date NOT NULL CHECK (end_date > start_date),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  -- Ensure unique combination per company and data structure
  CONSTRAINT unique_company_data_structure UNIQUE (company_id, data_structure_id, status)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_licenses_company_id ON licenses(company_id);
CREATE INDEX IF NOT EXISTS idx_licenses_data_structure_id ON licenses(data_structure_id);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_dates ON licenses(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_licenses_used_quantity ON licenses(used_quantity);
CREATE INDEX IF NOT EXISTS idx_licenses_availability ON licenses(total_quantity, used_quantity);

-- Ensure updated_at trigger exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_licenses_updated_at ON licenses;
CREATE TRIGGER update_licenses_updated_at
  BEFORE UPDATE ON licenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 2: Ensure is_admin_user() helper function exists
-- ============================================================================

-- Recreate the helper function with proper SECURITY DEFINER
CREATE OR REPLACE FUNCTION is_admin_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_admin_user TO authenticated;

-- ============================================================================
-- STEP 3: Enable RLS on licenses table
-- ============================================================================

ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Drop ALL existing policies to start clean
-- ============================================================================

-- Drop old policies that might exist from previous migrations
DROP POLICY IF EXISTS "Authenticated users can view licenses" ON licenses;
DROP POLICY IF EXISTS "System admins can view all licenses" ON licenses;
DROP POLICY IF EXISTS "System admins can create licenses" ON licenses;
DROP POLICY IF EXISTS "System admins can update all licenses" ON licenses;
DROP POLICY IF EXISTS "System admins can delete licenses" ON licenses;
DROP POLICY IF EXISTS "System admins can manage licenses" ON licenses;
DROP POLICY IF EXISTS "Service role has full access to licenses" ON licenses;
DROP POLICY IF EXISTS "Allow full access to authenticated users on licenses" ON licenses;

-- ============================================================================
-- STEP 5: Create clean, function-based RLS policies
-- ============================================================================

-- Policy 1: All authenticated users can view licenses (read-only)
CREATE POLICY "Authenticated users can view licenses"
  ON licenses FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: System admins can INSERT new licenses
CREATE POLICY "System admins can create licenses"
  ON licenses FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_user(auth.uid()));

-- Policy 3: System admins can UPDATE existing licenses
CREATE POLICY "System admins can update licenses"
  ON licenses FOR UPDATE
  TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Policy 4: System admins can DELETE licenses
CREATE POLICY "System admins can delete licenses"
  ON licenses FOR DELETE
  TO authenticated
  USING (is_admin_user(auth.uid()));

-- Policy 5: Service role has full access (for system operations)
CREATE POLICY "Service role full access to licenses"
  ON licenses FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- STEP 6: Fix license_actions table policies (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'license_actions') THEN
    -- Enable RLS
    EXECUTE 'ALTER TABLE license_actions ENABLE ROW LEVEL SECURITY';

    -- Drop old policies
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can view license_actions" ON license_actions';
    EXECUTE 'DROP POLICY IF EXISTS "System admins can manage license_actions" ON license_actions';
    EXECUTE 'DROP POLICY IF EXISTS "Service role full access to license_actions" ON license_actions';

    -- Create new policies
    EXECUTE '
      CREATE POLICY "Authenticated users can view license_actions"
        ON license_actions FOR SELECT
        TO authenticated
        USING (true)
    ';

    EXECUTE '
      CREATE POLICY "System admins can manage license_actions"
        ON license_actions FOR ALL
        TO authenticated
        USING (is_admin_user(auth.uid()))
        WITH CHECK (is_admin_user(auth.uid()))
    ';

    EXECUTE '
      CREATE POLICY "Service role full access to license_actions"
        ON license_actions FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true)
    ';
  END IF;
END $$;

-- ============================================================================
-- STEP 7: Verify and log setup
-- ============================================================================

-- Add a comment to track this fix
COMMENT ON TABLE licenses IS 'License management table with fixed RLS policies (migration 20251013164352)';