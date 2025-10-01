/*
  # Fix Reference Tables RLS

  ## Overview
  Separates read and write permissions for reference/lookup tables.
  Authenticated users can read, but only system admins can modify.

  ## Tables Fixed
  - data_structures: Read for all, write for system admins
  - regions: Read for all, write for system admins
  - cities, countries: Keep as-is (truly global lookups)

  ## Security Model
  - SELECT: All authenticated users (needed for forms/dropdowns)
  - INSERT/UPDATE/DELETE: Only system admins (admin_users table)
*/

-- ============================================================================
-- DATA_STRUCTURES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Allow full access to authenticated users on data_structures" ON data_structures;

CREATE POLICY "Authenticated can view data structures"
  ON data_structures FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins manage data structures"
  ON data_structures FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins update data structures"
  ON data_structures FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins delete data structures"
  ON data_structures FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- REGIONS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Allow full access to authenticated users" ON regions;

CREATE POLICY "Authenticated can view regions"
  ON regions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins manage regions"
  ON regions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins update regions"
  ON regions FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins delete regions"
  ON regions FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- Note: cities and countries tables keep "USING (true)" policies as they are
-- truly global reference data that all users need to read and potentially
-- system admins need to manage. These are acceptable for lookup tables.
