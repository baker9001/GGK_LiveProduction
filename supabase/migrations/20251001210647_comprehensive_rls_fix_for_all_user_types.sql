/*
  # COMPREHENSIVE RLS FIX FOR ALL USER TYPES AND TABLES

  ## CRITICAL ROOT CAUSE IDENTIFIED

  ### Problem 1: Circular RLS Dependency
  - Policies check: auth.uid() IN (SELECT id FROM admin_users)
  - But admin_users also has RLS: USING (auth.uid() = id)
  - The RLS check itself is blocked by RLS!
  - Result: No queries work, no data retrieved

  ### Problem 2: Missing Policies on Critical Tables
  - Reference tables (companies, regions, programs, providers, edu_subjects, etc.)
  - Learning tables (data_structures, edu_units, edu_topics, etc.)
  - License tables (licenses, license_actions, etc.)
  - Config tables (roles, permissions, etc.)

  ### Problem 3: Cleanup Only Fixed users Table
  - Previous migration fixed users table only
  - Left all other tables with broken or missing policies
  - System admins, entity admins, teachers, students all blocked

  ## SOLUTION

  ### Approach: Function-Based RLS
  Instead of inline subquery (which causes circular dependency):
    USING (auth.uid() IN (SELECT id FROM admin_users)) ❌

  Use helper function (which bypasses RLS):
    USING (is_admin_user(auth.uid())) ✅

  ### Policy Strategy
  1. Create helper functions to check user types (bypass RLS)
  2. Allow authenticated users to read their own user-type records
  3. Allow system admins full access via function check
  4. Allow reference tables to be readable by all authenticated users
  5. Scope entity/teacher/student data appropriately

  ## TABLES COVERED
  - admin_users, entity_users, teachers, students
  - roles, permissions, role_permissions
  - companies, regions, programs, providers, edu_subjects
  - licenses, license_actions
  - data_structures, edu_units, edu_topics, edu_subtopics, edu_objectives, edu_concepts
  - materials, materials_files
  - questions_master_admin
  - audit_logs
*/

-- ============================================================================
-- STEP 1: Create Helper Functions (Bypass RLS)
-- ============================================================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS is_admin_user(UUID);
DROP FUNCTION IF EXISTS is_entity_user(UUID);
DROP FUNCTION IF EXISTS is_teacher(UUID);
DROP FUNCTION IF EXISTS is_student(UUID);
DROP FUNCTION IF EXISTS get_user_type(UUID);

-- Check if user is a system admin
CREATE OR REPLACE FUNCTION is_admin_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is an entity user
CREATE OR REPLACE FUNCTION is_entity_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM entity_users
    WHERE user_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is a teacher
CREATE OR REPLACE FUNCTION is_teacher(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM teachers
    WHERE user_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is a student
CREATE OR REPLACE FUNCTION is_student(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM students
    WHERE user_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user type from users table
CREATE OR REPLACE FUNCTION get_user_type(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_type_val TEXT;
BEGIN
  SELECT user_type INTO user_type_val
  FROM users
  WHERE id = user_id;

  RETURN COALESCE(user_type_val, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 2: Clean Up Existing Policies on All Tables
-- ============================================================================

DO $$
DECLARE
  tbl RECORD;
  pol RECORD;
BEGIN
  -- List of tables to clean up
  FOR tbl IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN (
      'admin_users', 'entity_users', 'teachers', 'students',
      'roles', 'permissions', 'role_permissions',
      'companies', 'regions', 'programs', 'providers', 'edu_subjects',
      'licenses', 'license_actions',
      'data_structures', 'edu_units', 'edu_topics', 'edu_subtopics',
      'edu_objectives', 'edu_concepts',
      'materials', 'materials_files',
      'questions_master_admin',
      'audit_logs'
    )
  LOOP
    -- Drop all policies on this table
    FOR pol IN
      SELECT policyname
      FROM pg_policies
      WHERE tablename = tbl.tablename AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl.tablename);
    END LOOP;

    RAISE NOTICE 'Cleaned policies on table: %', tbl.tablename;
  END LOOP;
END $$;

-- ============================================================================
-- STEP 3: ADMIN_USERS TABLE
-- ============================================================================

CREATE POLICY "Admin users can view their own record"
  ON admin_users FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "System admins can view all admin_users"
  ON admin_users FOR SELECT TO authenticated
  USING (is_admin_user(auth.uid()));

CREATE POLICY "System admins can manage admin_users"
  ON admin_users FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Service role full access to admin_users"
  ON admin_users FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- STEP 4: ENTITY_USERS TABLE
-- ============================================================================

CREATE POLICY "Entity users can view their own record"
  ON entity_users FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System admins can view all entity_users"
  ON entity_users FOR SELECT TO authenticated
  USING (is_admin_user(auth.uid()));

CREATE POLICY "System admins can manage entity_users"
  ON entity_users FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Service role full access to entity_users"
  ON entity_users FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- STEP 5: TEACHERS TABLE
-- ============================================================================

CREATE POLICY "Teachers can view their own record"
  ON teachers FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System admins can view all teachers"
  ON teachers FOR SELECT TO authenticated
  USING (is_admin_user(auth.uid()));

CREATE POLICY "System admins can manage teachers"
  ON teachers FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Service role full access to teachers"
  ON teachers FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- STEP 6: STUDENTS TABLE
-- ============================================================================

CREATE POLICY "Students can view their own record"
  ON students FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System admins can view all students"
  ON students FOR SELECT TO authenticated
  USING (is_admin_user(auth.uid()));

CREATE POLICY "System admins can manage students"
  ON students FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Service role full access to students"
  ON students FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- STEP 7: ROLES & PERMISSIONS TABLES
-- ============================================================================

-- Roles table
CREATE POLICY "Authenticated users can view roles"
  ON roles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins can manage roles"
  ON roles FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Permissions table
CREATE POLICY "Authenticated users can view permissions"
  ON permissions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins can manage permissions"
  ON permissions FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Role_permissions junction table
CREATE POLICY "Authenticated users can view role_permissions"
  ON role_permissions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins can manage role_permissions"
  ON role_permissions FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- ============================================================================
-- STEP 8: REFERENCE TABLES (Read by all authenticated users)
-- ============================================================================

-- Companies
CREATE POLICY "Authenticated users can view companies"
  ON companies FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins can manage companies"
  ON companies FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Regions
CREATE POLICY "Authenticated users can view regions"
  ON regions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins can manage regions"
  ON regions FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Programs
CREATE POLICY "Authenticated users can view programs"
  ON programs FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins can manage programs"
  ON programs FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Providers
CREATE POLICY "Authenticated users can view providers"
  ON providers FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins can manage providers"
  ON providers FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Edu_subjects
CREATE POLICY "Authenticated users can view edu_subjects"
  ON edu_subjects FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins can manage edu_subjects"
  ON edu_subjects FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- ============================================================================
-- STEP 9: LICENSE TABLES
-- ============================================================================

-- Licenses
CREATE POLICY "Authenticated users can view licenses"
  ON licenses FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins can manage licenses"
  ON licenses FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- License_actions
CREATE POLICY "Authenticated users can view license_actions"
  ON license_actions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins can manage license_actions"
  ON license_actions FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- ============================================================================
-- STEP 10: LEARNING STRUCTURE TABLES
-- ============================================================================

-- Data_structures
CREATE POLICY "Authenticated users can view data_structures"
  ON data_structures FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins can manage data_structures"
  ON data_structures FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Edu_units
CREATE POLICY "Authenticated users can view edu_units"
  ON edu_units FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins can manage edu_units"
  ON edu_units FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Edu_topics
CREATE POLICY "Authenticated users can view edu_topics"
  ON edu_topics FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins can manage edu_topics"
  ON edu_topics FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Edu_subtopics
CREATE POLICY "Authenticated users can view edu_subtopics"
  ON edu_subtopics FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins can manage edu_subtopics"
  ON edu_subtopics FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Edu_objectives
CREATE POLICY "Authenticated users can view edu_objectives"
  ON edu_objectives FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins can manage edu_objectives"
  ON edu_objectives FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Edu_concepts
CREATE POLICY "Authenticated users can view edu_concepts"
  ON edu_concepts FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins can manage edu_concepts"
  ON edu_concepts FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- ============================================================================
-- STEP 11: MATERIALS TABLES
-- ============================================================================

-- Materials
CREATE POLICY "Authenticated users can view materials"
  ON materials FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins can manage materials"
  ON materials FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Materials_files
CREATE POLICY "Authenticated users can view materials_files"
  ON materials_files FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins can manage materials_files"
  ON materials_files FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- ============================================================================
-- STEP 12: QUESTIONS TABLE
-- ============================================================================

CREATE POLICY "Authenticated users can view questions"
  ON questions_master_admin FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins can manage questions"
  ON questions_master_admin FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- ============================================================================
-- STEP 13: AUDIT LOGS
-- ============================================================================

CREATE POLICY "Users can view their own audit logs"
  ON audit_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System admins can view all audit_logs"
  ON audit_logs FOR SELECT TO authenticated
  USING (is_admin_user(auth.uid()));

CREATE POLICY "System admins can manage audit_logs"
  ON audit_logs FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  function_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- Count helper functions
  SELECT COUNT(*) INTO function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname IN ('is_admin_user', 'is_entity_user', 'is_teacher', 'is_student', 'get_user_type');

  -- Count policies on critical tables
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename IN (
    'admin_users', 'entity_users', 'teachers', 'students',
    'roles', 'permissions', 'companies', 'regions', 'programs',
    'licenses', 'data_structures', 'materials'
  );

  RAISE NOTICE '============================================';
  RAISE NOTICE 'COMPREHENSIVE RLS FIX COMPLETE';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Helper functions created: %', function_count;
  RAISE NOTICE 'Policies created on core tables: %', policy_count;
  RAISE NOTICE 'All user types should now have proper access';
  RAISE NOTICE 'System admins can access all features';
  RAISE NOTICE 'Reference tables readable by all authenticated users';
END $$;
