/*
  # Add System Admin Policies to Core Infrastructure Tables

  ## Overview
  Adds comprehensive system admin (admin_users) policies to core infrastructure tables.
  System admins need full access to all user, student, teacher, and license data across
  all companies for platform management and support operations.

  ## Tables Updated
  1. **users** - All user accounts (system-wide)
  2. **entity_users** - Entity admin/staff accounts
  3. **students** - Student records
  4. **teachers** - Teacher records
  5. **licenses** - License definitions
  6. **student_licenses** - Student license assignments
  7. **departments** - Academic departments

  ## Security Model
  - System admins (admin_users): Full SELECT/INSERT/UPDATE/DELETE access to all records
  - Existing entity-scoped policies remain active for entity users
  - System admin policies are additive (do not replace existing policies)

  ## Important Notes
  - Uses separate policies for each operation (SELECT, INSERT, UPDATE, DELETE)
  - System admin check: auth.uid() IN (SELECT id FROM admin_users)
  - All policies are named consistently for easy identification
*/

-- ============================================================================
-- USERS TABLE
-- ============================================================================

CREATE POLICY "System admins can view all users"
  ON users FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create users"
  ON users FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all users"
  ON users FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete users"
  ON users FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- ENTITY_USERS TABLE
-- ============================================================================

CREATE POLICY "System admins can view all entity users"
  ON entity_users FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create entity users"
  ON entity_users FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all entity users"
  ON entity_users FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete entity users"
  ON entity_users FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- STUDENTS TABLE
-- ============================================================================

CREATE POLICY "System admins can view all students"
  ON students FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create students"
  ON students FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all students"
  ON students FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete students"
  ON students FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- TEACHERS TABLE
-- ============================================================================

CREATE POLICY "System admins can view all teachers"
  ON teachers FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create teachers"
  ON teachers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all teachers"
  ON teachers FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete teachers"
  ON teachers FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- LICENSES TABLE
-- ============================================================================

CREATE POLICY "System admins can view all licenses"
  ON licenses FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create licenses"
  ON licenses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all licenses"
  ON licenses FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete licenses"
  ON licenses FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- STUDENT_LICENSES TABLE
-- ============================================================================

CREATE POLICY "System admins can view all student licenses"
  ON student_licenses FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create student licenses"
  ON student_licenses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all student licenses"
  ON student_licenses FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete student licenses"
  ON student_licenses FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- DEPARTMENTS TABLE
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'departments') THEN
    EXECUTE '
      CREATE POLICY "System admins can view all departments"
        ON departments FOR SELECT TO authenticated
        USING (auth.uid() IN (SELECT id FROM admin_users));

      CREATE POLICY "System admins can create departments"
        ON departments FOR INSERT TO authenticated
        WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

      CREATE POLICY "System admins can update all departments"
        ON departments FOR UPDATE TO authenticated
        USING (auth.uid() IN (SELECT id FROM admin_users))
        WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

      CREATE POLICY "System admins can delete departments"
        ON departments FOR DELETE TO authenticated
        USING (auth.uid() IN (SELECT id FROM admin_users));
    ';
  END IF;
END $$;
