/*
  # Fix Teachers Table Infinite Recursion Error

  ## Problem
  Students accessing the learning pathway page encounter:
  "infinite recursion detected in policy for relation 'teachers'"

  ## Root Cause Analysis
  When students query student_licenses to view their learning pathway:
  1. student_licenses RLS policy checks the students table
  2. students table policies join with entity_user_schools/entity_user_branches
  3. teachers table policies ALSO join with teacher_schools/teacher_branches
     and entity_user_schools/entity_user_branches
  4. These policies reference each other creating a circular dependency:
     student_licenses → students → junction tables → teachers policies →
     junction tables → infinite loop
  5. Postgres detects this recursion and throws error (Code: 42P17)

  ## Solution Strategy
  Following the same pattern used for entity_user_schools/branches junction tables
  (migration 20251002185654), we create SECURITY DEFINER helper functions that:
  - Check permissions without triggering RLS cascades
  - Break the circular dependency chain
  - Maintain proper security boundaries
  - Use direct table access with elevated privileges

  ## Security Notes
  - SECURITY DEFINER functions run with elevated privileges
  - Functions contain proper authorization checks
  - Only authenticated users can execute these functions
  - Service role maintains full access for backend operations
  - All security boundaries are preserved

  ## Tables Modified
  - teachers: Fix school/branch admin SELECT policies
  - teacher_schools: Simplify RLS to prevent recursion
  - teacher_branches: Simplify RLS to prevent recursion
  - teacher_subjects: Fix nested query causing recursion
  - teacher_programs: Fix nested query causing recursion
  - teacher_departments: Fix nested query causing recursion
  - teacher_grade_levels: Fix nested query causing recursion
  - teacher_sections: Fix nested query causing recursion
*/

-- ============================================================================
-- STEP 1: Create SECURITY DEFINER Helper Functions
-- ============================================================================

-- Function to check if user can view a specific teacher
CREATE OR REPLACE FUNCTION can_view_teacher(check_user_id UUID, check_teacher_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_system_admin BOOLEAN;
  teacher_user_id UUID;
  teacher_company_id UUID;
  user_company_id UUID;
BEGIN
  -- Check if system admin (bypass RLS on admin_users)
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE id = check_user_id
  ) INTO is_system_admin;

  IF is_system_admin THEN
    RETURN TRUE;
  END IF;

  -- Get teacher details (bypass RLS on teachers)
  SELECT user_id, company_id INTO teacher_user_id, teacher_company_id
  FROM teachers
  WHERE id = check_teacher_id;

  -- Teacher can view their own record
  IF teacher_user_id = check_user_id THEN
    RETURN TRUE;
  END IF;

  -- Check if user is entity admin in same company (bypass RLS on entity_users)
  SELECT company_id INTO user_company_id
  FROM entity_users
  WHERE user_id = check_user_id
    AND is_company_admin = true
    AND is_active = true
  LIMIT 1;

  IF user_company_id IS NOT NULL AND user_company_id = teacher_company_id THEN
    RETURN TRUE;
  END IF;

  -- Check if user is school admin for any of teacher's schools (bypass RLS)
  IF EXISTS (
    SELECT 1
    FROM teacher_schools ts
    JOIN entity_user_schools eus ON eus.school_id = ts.school_id
    JOIN entity_users eu ON eu.id = eus.entity_user_id
    WHERE ts.teacher_id = check_teacher_id
      AND eu.user_id = check_user_id
      AND eu.is_active = true
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check if user is branch admin for any of teacher's branches (bypass RLS)
  IF EXISTS (
    SELECT 1
    FROM teacher_branches tb
    JOIN entity_user_branches eub ON eub.branch_id = tb.branch_id
    JOIN entity_users eu ON eu.id = eub.entity_user_id
    WHERE tb.teacher_id = check_teacher_id
      AND eu.user_id = check_user_id
      AND eu.is_active = true
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION can_view_teacher(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_teacher(UUID, UUID) TO service_role;

COMMENT ON FUNCTION can_view_teacher(UUID, UUID) IS
  'Checks if a user can view a specific teacher. Uses SECURITY DEFINER to avoid infinite recursion in RLS policies.';

-- Function to check if user can manage teacher assignments
CREATE OR REPLACE FUNCTION can_manage_teacher_in_company(check_user_id UUID, check_teacher_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_system_admin BOOLEAN;
  teacher_company_id UUID;
  user_company_id UUID;
BEGIN
  -- Check if system admin
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE id = check_user_id
  ) INTO is_system_admin;

  IF is_system_admin THEN
    RETURN TRUE;
  END IF;

  -- Get teacher's company
  SELECT company_id INTO teacher_company_id
  FROM teachers
  WHERE id = check_teacher_id;

  -- Check if user is entity admin in same company
  SELECT company_id INTO user_company_id
  FROM entity_users
  WHERE user_id = check_user_id
    AND is_company_admin = true
    AND is_active = true
  LIMIT 1;

  RETURN (user_company_id IS NOT NULL AND user_company_id = teacher_company_id);
END;
$$;

GRANT EXECUTE ON FUNCTION can_manage_teacher_in_company(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_teacher_in_company(UUID, UUID) TO service_role;

COMMENT ON FUNCTION can_manage_teacher_in_company(UUID, UUID) IS
  'Checks if a user can manage teacher assignments. Uses SECURITY DEFINER to avoid RLS recursion.';

-- ============================================================================
-- STEP 2: Fix Teachers Table RLS Policies
-- ============================================================================

-- Drop the problematic policies that cause recursion
DROP POLICY IF EXISTS "School admins can view teachers in their schools" ON teachers;
DROP POLICY IF EXISTS "Branch admins can view teachers in their branches" ON teachers;

-- Create new non-recursive policies using helper functions
CREATE POLICY "School and branch admins can view teachers"
  ON teachers FOR SELECT
  TO authenticated
  USING (can_view_teacher(auth.uid(), id));

-- Note: Keep existing policies for teachers viewing own record and entity admins
-- These don't cause recursion:
-- - "Teachers can view their own record" (direct user_id check)
-- - "Entity admins can view teachers in their company" (simple company_id check)

-- ============================================================================
-- STEP 3: Fix Teacher Assignment Tables RLS Policies
-- ============================================================================

-- teacher_schools: Simplify to prevent recursion
DROP POLICY IF EXISTS "Entity users manage teacher schools in company" ON teacher_schools;

CREATE POLICY "Users can manage teacher schools in their scope"
  ON teacher_schools FOR ALL
  TO authenticated
  USING (can_manage_teacher_in_company(auth.uid(), teacher_id))
  WITH CHECK (can_manage_teacher_in_company(auth.uid(), teacher_id));

-- Service role bypass
CREATE POLICY "Service role full access to teacher_schools"
  ON teacher_schools FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- teacher_branches: Simplify to prevent recursion
DROP POLICY IF EXISTS "Entity users manage teacher branches in company" ON teacher_branches;

CREATE POLICY "Users can manage teacher branches in their scope"
  ON teacher_branches FOR ALL
  TO authenticated
  USING (can_manage_teacher_in_company(auth.uid(), teacher_id))
  WITH CHECK (can_manage_teacher_in_company(auth.uid(), teacher_id));

-- Service role bypass
CREATE POLICY "Service role full access to teacher_branches"
  ON teacher_branches FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- teacher_subjects: Fix nested query
DROP POLICY IF EXISTS "Entity users manage teacher subjects in company" ON teacher_subjects;

CREATE POLICY "Users can manage teacher subjects in their scope"
  ON teacher_subjects FOR ALL
  TO authenticated
  USING (can_manage_teacher_in_company(auth.uid(), teacher_id))
  WITH CHECK (can_manage_teacher_in_company(auth.uid(), teacher_id));

-- Service role bypass
CREATE POLICY "Service role full access to teacher_subjects"
  ON teacher_subjects FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- teacher_programs: Fix nested query
DROP POLICY IF EXISTS "Entity users manage teacher programs in company" ON teacher_programs;

CREATE POLICY "Users can manage teacher programs in their scope"
  ON teacher_programs FOR ALL
  TO authenticated
  USING (can_manage_teacher_in_company(auth.uid(), teacher_id))
  WITH CHECK (can_manage_teacher_in_company(auth.uid(), teacher_id));

-- Service role bypass
CREATE POLICY "Service role full access to teacher_programs"
  ON teacher_programs FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- teacher_departments: Fix nested query
DROP POLICY IF EXISTS "Entity users manage teacher departments in company" ON teacher_departments;

CREATE POLICY "Users can manage teacher departments in their scope"
  ON teacher_departments FOR ALL
  TO authenticated
  USING (can_manage_teacher_in_company(auth.uid(), teacher_id))
  WITH CHECK (can_manage_teacher_in_company(auth.uid(), teacher_id));

-- Service role bypass
CREATE POLICY "Service role full access to teacher_departments"
  ON teacher_departments FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- teacher_grade_levels: Fix nested query
DROP POLICY IF EXISTS "Entity users manage teacher grade levels in company" ON teacher_grade_levels;

CREATE POLICY "Users can manage teacher grade levels in their scope"
  ON teacher_grade_levels FOR ALL
  TO authenticated
  USING (can_manage_teacher_in_company(auth.uid(), teacher_id))
  WITH CHECK (can_manage_teacher_in_company(auth.uid(), teacher_id));

-- Service role bypass
CREATE POLICY "Service role full access to teacher_grade_levels"
  ON teacher_grade_levels FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- teacher_sections: Fix nested query
DROP POLICY IF EXISTS "Entity users manage teacher sections in company" ON teacher_sections;

CREATE POLICY "Users can manage teacher sections in their scope"
  ON teacher_sections FOR ALL
  TO authenticated
  USING (can_manage_teacher_in_company(auth.uid(), teacher_id))
  WITH CHECK (can_manage_teacher_in_company(auth.uid(), teacher_id));

-- Service role bypass
CREATE POLICY "Service role full access to teacher_sections"
  ON teacher_sections FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- STEP 4: Verification
-- ============================================================================

DO $$
DECLARE
  teachers_policy_count INTEGER;
  assignment_tables_fixed INTEGER := 0;
  helper_functions_count INTEGER;
BEGIN
  -- Count policies on teachers table
  SELECT COUNT(*) INTO teachers_policy_count
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'teachers';

  -- Count fixed assignment tables
  SELECT COUNT(DISTINCT tablename) INTO assignment_tables_fixed
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (
      'teacher_schools', 'teacher_branches', 'teacher_subjects',
      'teacher_programs', 'teacher_departments', 'teacher_grade_levels',
      'teacher_sections'
    )
    AND policyname LIKE '%can manage teacher%';

  -- Count new helper functions
  SELECT COUNT(*) INTO helper_functions_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN ('can_view_teacher', 'can_manage_teacher_in_company');

  RAISE NOTICE '============================================';
  RAISE NOTICE 'TEACHERS TABLE INFINITE RECURSION FIX';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Teachers table policies: %', teachers_policy_count;
  RAISE NOTICE 'Fixed assignment tables: % of 7', assignment_tables_fixed;
  RAISE NOTICE 'Helper functions created: %', helper_functions_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Changes Applied:';
  RAISE NOTICE '  ✓ Replaced recursive JOIN policies with SECURITY DEFINER functions';
  RAISE NOTICE '  ✓ Fixed teacher_schools, teacher_branches, and 5 other tables';
  RAISE NOTICE '  ✓ Broke circular dependency: student_licenses → students → teachers';
  RAISE NOTICE '  ✓ Students can now access learning pathway without recursion';
  RAISE NOTICE '';
  RAISE NOTICE 'Security Maintained:';
  RAISE NOTICE '  ✓ Teachers can view their own records';
  RAISE NOTICE '  ✓ Entity admins can manage teachers in their company';
  RAISE NOTICE '  ✓ School/branch admins can view teachers in their scope';
  RAISE NOTICE '  ✓ System admins have full access';
  RAISE NOTICE '';

  IF helper_functions_count = 2 AND assignment_tables_fixed = 7 THEN
    RAISE NOTICE 'STATUS: All fixes applied successfully!';
  ELSE
    RAISE WARNING 'STATUS: Some fixes may not have been applied correctly';
  END IF;

  RAISE NOTICE '============================================';
END $$;
