/*
  # Add System Admin Policies to Additional Entity and Reference Tables

  ## Overview
  Adds comprehensive system admin (admin_users) policies to additional entity metadata
  tables and reference/lookup tables used across the platform.

  ## Tables Updated
  1. **branches_additional** - Branch metadata
  2. **schools_additional** - School metadata
  3. **companies_additional** - Company metadata
  4. **entity_positions** - Staff position definitions
  5. **materials** - Learning materials (if exists)
  6. **audit_logs** - System audit logs (if exists)
  7. **cities** - City reference data
  8. **countries** - Country reference data
  9. **programs** - Educational programs (if exists)
  10. **providers** - Education providers (if exists)
  11. **edu_subjects** - Subject definitions (if exists)

  ## Security Model
  - System admins get full access to all metadata and reference tables
  - Reference tables maintain read access for authenticated users
  - System admin policies enable complete platform management
*/

-- ============================================================================
-- BRANCHES_ADDITIONAL TABLE
-- ============================================================================

CREATE POLICY "System admins can view all branches additional"
  ON branches_additional FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create branches additional"
  ON branches_additional FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all branches additional"
  ON branches_additional FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete branches additional"
  ON branches_additional FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- SCHOOLS_ADDITIONAL TABLE
-- ============================================================================

CREATE POLICY "System admins can view all schools additional"
  ON schools_additional FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create schools additional"
  ON schools_additional FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all schools additional"
  ON schools_additional FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete schools additional"
  ON schools_additional FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- COMPANIES_ADDITIONAL TABLE
-- ============================================================================

CREATE POLICY "System admins can view all companies additional"
  ON companies_additional FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create companies additional"
  ON companies_additional FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all companies additional"
  ON companies_additional FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete companies additional"
  ON companies_additional FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- ENTITY_POSITIONS TABLE
-- ============================================================================

CREATE POLICY "System admins can view all entity positions"
  ON entity_positions FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create entity positions"
  ON entity_positions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all entity positions"
  ON entity_positions FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete entity positions"
  ON entity_positions FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- MATERIALS TABLE (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'materials') THEN
    EXECUTE '
      CREATE POLICY "System admins can view all materials"
        ON materials FOR SELECT TO authenticated
        USING (auth.uid() IN (SELECT id FROM admin_users));

      CREATE POLICY "System admins can create materials"
        ON materials FOR INSERT TO authenticated
        WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

      CREATE POLICY "System admins can update all materials"
        ON materials FOR UPDATE TO authenticated
        USING (auth.uid() IN (SELECT id FROM admin_users))
        WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

      CREATE POLICY "System admins can delete materials"
        ON materials FOR DELETE TO authenticated
        USING (auth.uid() IN (SELECT id FROM admin_users));
    ';
  END IF;
END $$;

-- ============================================================================
-- AUDIT_LOGS TABLE (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    EXECUTE '
      CREATE POLICY "System admins can view all audit logs"
        ON audit_logs FOR SELECT TO authenticated
        USING (auth.uid() IN (SELECT id FROM admin_users));

      CREATE POLICY "System admins can create audit logs"
        ON audit_logs FOR INSERT TO authenticated
        WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

      CREATE POLICY "System admins can update all audit logs"
        ON audit_logs FOR UPDATE TO authenticated
        USING (auth.uid() IN (SELECT id FROM admin_users))
        WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

      CREATE POLICY "System admins can delete audit logs"
        ON audit_logs FOR DELETE TO authenticated
        USING (auth.uid() IN (SELECT id FROM admin_users));
    ';
  END IF;
END $$;

-- ============================================================================
-- CITIES TABLE
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cities') THEN
    EXECUTE '
      CREATE POLICY "System admins can view all cities"
        ON cities FOR SELECT TO authenticated
        USING (auth.uid() IN (SELECT id FROM admin_users));

      CREATE POLICY "System admins can create cities"
        ON cities FOR INSERT TO authenticated
        WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

      CREATE POLICY "System admins can update all cities"
        ON cities FOR UPDATE TO authenticated
        USING (auth.uid() IN (SELECT id FROM admin_users))
        WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

      CREATE POLICY "System admins can delete cities"
        ON cities FOR DELETE TO authenticated
        USING (auth.uid() IN (SELECT id FROM admin_users));
    ';
  END IF;
END $$;

-- ============================================================================
-- COUNTRIES TABLE
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'countries') THEN
    EXECUTE '
      CREATE POLICY "System admins can view all countries"
        ON countries FOR SELECT TO authenticated
        USING (auth.uid() IN (SELECT id FROM admin_users));

      CREATE POLICY "System admins can create countries"
        ON countries FOR INSERT TO authenticated
        WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

      CREATE POLICY "System admins can update all countries"
        ON countries FOR UPDATE TO authenticated
        USING (auth.uid() IN (SELECT id FROM admin_users))
        WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

      CREATE POLICY "System admins can delete countries"
        ON countries FOR DELETE TO authenticated
        USING (auth.uid() IN (SELECT id FROM admin_users));
    ';
  END IF;
END $$;

-- ============================================================================
-- PROGRAMS TABLE (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'programs') THEN
    EXECUTE '
      CREATE POLICY "System admins can view all programs"
        ON programs FOR SELECT TO authenticated
        USING (auth.uid() IN (SELECT id FROM admin_users));

      CREATE POLICY "System admins can create programs"
        ON programs FOR INSERT TO authenticated
        WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

      CREATE POLICY "System admins can update all programs"
        ON programs FOR UPDATE TO authenticated
        USING (auth.uid() IN (SELECT id FROM admin_users))
        WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

      CREATE POLICY "System admins can delete programs"
        ON programs FOR DELETE TO authenticated
        USING (auth.uid() IN (SELECT id FROM admin_users));
    ';
  END IF;
END $$;

-- ============================================================================
-- PROVIDERS TABLE (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'providers') THEN
    EXECUTE '
      CREATE POLICY "System admins can view all providers"
        ON providers FOR SELECT TO authenticated
        USING (auth.uid() IN (SELECT id FROM admin_users));

      CREATE POLICY "System admins can create providers"
        ON providers FOR INSERT TO authenticated
        WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

      CREATE POLICY "System admins can update all providers"
        ON providers FOR UPDATE TO authenticated
        USING (auth.uid() IN (SELECT id FROM admin_users))
        WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

      CREATE POLICY "System admins can delete providers"
        ON providers FOR DELETE TO authenticated
        USING (auth.uid() IN (SELECT id FROM admin_users));
    ';
  END IF;
END $$;

-- ============================================================================
-- EDU_SUBJECTS TABLE (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'edu_subjects') THEN
    EXECUTE '
      CREATE POLICY "System admins can view all edu subjects"
        ON edu_subjects FOR SELECT TO authenticated
        USING (auth.uid() IN (SELECT id FROM admin_users));

      CREATE POLICY "System admins can create edu subjects"
        ON edu_subjects FOR INSERT TO authenticated
        WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

      CREATE POLICY "System admins can update all edu subjects"
        ON edu_subjects FOR UPDATE TO authenticated
        USING (auth.uid() IN (SELECT id FROM admin_users))
        WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

      CREATE POLICY "System admins can delete edu subjects"
        ON edu_subjects FOR DELETE TO authenticated
        USING (auth.uid() IN (SELECT id FROM admin_users));
    ';
  END IF;
END $$;
