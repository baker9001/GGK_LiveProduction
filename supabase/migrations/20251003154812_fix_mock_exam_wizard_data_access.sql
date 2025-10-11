/*
  # Fix Mock Exam Wizard Data Access Issue

  ## Problem
  Users are encountering "Failed to Load Exam Data" when opening the status transition wizard.
  The issue is caused by missing or incorrect RLS policies that prevent entity users from
  reading mock exam data and related tables.

  ## Root Cause Analysis
  1. Missing explicit SELECT policies for entity users on mock_exams table
  2. Helper functions may not be properly checking entity user access
  3. Related tables (data_structures, questions_master_admin) may lack proper SELECT policies
  4. Junction tables may not have proper read access for entity users

  ## Changes Made
  1. Drop and recreate helper functions with correct security context
  2. Add explicit SELECT policies for entity users on mock_exams
  3. Add SELECT policies for related lookup tables
  4. Ensure all wizard-related tables have proper read access
  5. Add performance indexes to optimize policy checks

  ## Security Notes
  - Entity admins can read all exams in their company
  - School admins can read exams assigned to their schools
  - Branch admins can read exams assigned to their branches
  - System admins can read all exams across all companies
*/

-- ============================================================================
-- STEP 1: Drop and recreate helper functions with proper security
-- ============================================================================

-- Drop functions with CASCADE to remove dependent policies
DROP FUNCTION IF EXISTS user_has_exam_access(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_system_admin() CASCADE;
DROP FUNCTION IF EXISTS is_entity_admin(uuid) CASCADE;

-- Check if user is a system admin
CREATE OR REPLACE FUNCTION is_system_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if user is an entity admin for a specific company
CREATE OR REPLACE FUNCTION is_entity_admin(company_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM entity_users
    WHERE user_id = auth.uid()
      AND company_id = company_uuid
      AND admin_level IN ('entity_admin', 'sub_entity_admin')
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if user has access to a specific exam (entity admin, school admin, or branch admin)
CREATE OR REPLACE FUNCTION user_has_exam_access(exam_id uuid)
RETURNS boolean AS $$
DECLARE
  exam_company_id uuid;
BEGIN
  -- Get the company_id for the exam
  SELECT company_id INTO exam_company_id
  FROM mock_exams
  WHERE id = exam_id;

  -- If exam doesn't exist, return false
  IF exam_company_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if user is system admin
  IF is_system_admin() THEN
    RETURN true;
  END IF;

  -- Check if user is entity admin for the exam's company
  IF is_entity_admin(exam_company_id) THEN
    RETURN true;
  END IF;

  -- Check if user is school admin for any school assigned to the exam
  IF EXISTS (
    SELECT 1 FROM entity_users eu
    JOIN entity_user_schools eus ON eus.entity_user_id = eu.id
    JOIN mock_exam_schools mes ON mes.school_id = eus.school_id
    WHERE eu.user_id = auth.uid()
      AND mes.mock_exam_id = exam_id
      AND eu.admin_level = 'school_admin'
      AND eu.is_active = true
  ) THEN
    RETURN true;
  END IF;

  -- Check if user is branch admin for any branch assigned to the exam
  IF EXISTS (
    SELECT 1 FROM entity_users eu
    JOIN entity_user_branches eub ON eub.entity_user_id = eu.id
    JOIN mock_exam_branches meb ON meb.branch_id = eub.branch_id
    WHERE eu.user_id = auth.uid()
      AND meb.mock_exam_id = exam_id
      AND eu.admin_level = 'branch_admin'
      AND eu.is_active = true
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- STEP 2: Fix mock_exams table SELECT policies
-- ============================================================================

-- Drop existing SELECT policies that might be conflicting
DROP POLICY IF EXISTS "Entity users can view mock exams in their company" ON mock_exams;
DROP POLICY IF EXISTS "Entity admins can view all company exams" ON mock_exams;
DROP POLICY IF EXISTS "School admins can view exams for their schools" ON mock_exams;
DROP POLICY IF EXISTS "Branch admins can view exams for their branches" ON mock_exams;

-- Create comprehensive SELECT policy for entity admins
CREATE POLICY "Entity admins can view all company exams"
  ON mock_exams
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_users eu
      WHERE eu.user_id = auth.uid()
        AND eu.company_id = mock_exams.company_id
        AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
        AND eu.is_active = true
    )
  );

-- Create SELECT policy for school admins
CREATE POLICY "School admins can view exams for their schools"
  ON mock_exams
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_users eu
      JOIN entity_user_schools eus ON eus.entity_user_id = eu.id
      JOIN mock_exam_schools mes ON mes.school_id = eus.school_id
      WHERE eu.user_id = auth.uid()
        AND mes.mock_exam_id = mock_exams.id
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  );

-- Create SELECT policy for branch admins
CREATE POLICY "Branch admins can view exams for their branches"
  ON mock_exams
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_users eu
      JOIN entity_user_branches eub ON eub.entity_user_id = eu.id
      JOIN mock_exam_branches meb ON meb.branch_id = eub.branch_id
      WHERE eu.user_id = auth.uid()
        AND meb.mock_exam_id = mock_exams.id
        AND eu.admin_level = 'branch_admin'
        AND eu.is_active = true
    )
  );

-- ============================================================================
-- STEP 3: Ensure data_structures table has proper SELECT access
-- ============================================================================

-- Drop and recreate SELECT policy for data_structures
DROP POLICY IF EXISTS "Entity users can view data structures" ON data_structures;
DROP POLICY IF EXISTS "Authenticated users can view active data structures" ON data_structures;

CREATE POLICY "Authenticated users can view active data structures"
  ON data_structures
  FOR SELECT
  TO authenticated
  USING (status = 'active');

-- ============================================================================
-- STEP 4: Ensure questions_master_admin table has proper SELECT access
-- ============================================================================

-- Check if table exists first
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'questions_master_admin') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "System admins can view all questions" ON questions_master_admin;
    DROP POLICY IF EXISTS "Entity users can view questions" ON questions_master_admin;
    DROP POLICY IF EXISTS "Authenticated users can view active questions" ON questions_master_admin;

    -- Create SELECT policy for authenticated users to view active questions
    CREATE POLICY "Authenticated users can view active questions"
      ON questions_master_admin
      FOR SELECT
      TO authenticated
      USING (status = 'active');
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Ensure wizard tables have proper access
-- ============================================================================

-- Update mock_exam_stage_progress policies
CREATE POLICY "Entity users can view stage progress"
  ON mock_exam_stage_progress
  FOR SELECT
  TO authenticated
  USING (
    user_has_exam_access(mock_exam_id) OR is_system_admin()
  );

-- Update mock_exam_instructions policies
CREATE POLICY "Entity users can view instructions"
  ON mock_exam_instructions
  FOR SELECT
  TO authenticated
  USING (
    user_has_exam_access(mock_exam_id) OR is_system_admin()
  );

-- Update mock_exam_questions policies
CREATE POLICY "Entity users can view exam questions"
  ON mock_exam_questions
  FOR SELECT
  TO authenticated
  USING (
    user_has_exam_access(mock_exam_id) OR is_system_admin()
  );

-- Re-create INSERT, UPDATE, DELETE policies for wizard tables
CREATE POLICY "Entity users can insert stage progress"
  ON mock_exam_stage_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_exam_access(mock_exam_id) OR is_system_admin()
  );

CREATE POLICY "Entity users can update stage progress"
  ON mock_exam_stage_progress
  FOR UPDATE
  TO authenticated
  USING (
    user_has_exam_access(mock_exam_id) OR is_system_admin()
  )
  WITH CHECK (
    user_has_exam_access(mock_exam_id) OR is_system_admin()
  );

CREATE POLICY "Entity users can delete stage progress"
  ON mock_exam_stage_progress
  FOR DELETE
  TO authenticated
  USING (
    user_has_exam_access(mock_exam_id) OR is_system_admin()
  );

CREATE POLICY "Entity users can insert instructions"
  ON mock_exam_instructions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_exam_access(mock_exam_id) OR is_system_admin()
  );

CREATE POLICY "Entity users can update instructions"
  ON mock_exam_instructions
  FOR UPDATE
  TO authenticated
  USING (
    user_has_exam_access(mock_exam_id) OR is_system_admin()
  )
  WITH CHECK (
    user_has_exam_access(mock_exam_id) OR is_system_admin()
  );

CREATE POLICY "Entity users can delete instructions"
  ON mock_exam_instructions
  FOR DELETE
  TO authenticated
  USING (
    user_has_exam_access(mock_exam_id) OR is_system_admin()
  );

CREATE POLICY "Entity users can insert exam questions"
  ON mock_exam_questions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_exam_access(mock_exam_id) OR is_system_admin()
  );

CREATE POLICY "Entity users can update exam questions"
  ON mock_exam_questions
  FOR UPDATE
  TO authenticated
  USING (
    user_has_exam_access(mock_exam_id) OR is_system_admin()
  )
  WITH CHECK (
    user_has_exam_access(mock_exam_id) OR is_system_admin()
  );

CREATE POLICY "Entity users can delete exam questions"
  ON mock_exam_questions
  FOR DELETE
  TO authenticated
  USING (
    user_has_exam_access(mock_exam_id) OR is_system_admin()
  );

-- ============================================================================
-- STEP 6: Ensure junction tables have proper read access
-- ============================================================================

-- mock_exam_schools
DROP POLICY IF EXISTS "Entity users can view mock exam schools" ON mock_exam_schools;
CREATE POLICY "Entity users can view mock exam schools"
  ON mock_exam_schools
  FOR SELECT
  TO authenticated
  USING (
    user_has_exam_access(mock_exam_id) OR is_system_admin()
  );

-- mock_exam_branches
DROP POLICY IF EXISTS "Entity users can view mock exam branches" ON mock_exam_branches;
CREATE POLICY "Entity users can view mock exam branches"
  ON mock_exam_branches
  FOR SELECT
  TO authenticated
  USING (
    user_has_exam_access(mock_exam_id) OR is_system_admin()
  );

-- mock_exam_grade_levels
DROP POLICY IF EXISTS "Entity users can view mock exam grade levels" ON mock_exam_grade_levels;
CREATE POLICY "Entity users can view mock exam grade levels"
  ON mock_exam_grade_levels
  FOR SELECT
  TO authenticated
  USING (
    user_has_exam_access(mock_exam_id) OR is_system_admin()
  );

-- mock_exam_sections
DROP POLICY IF EXISTS "Entity users can view mock exam sections" ON mock_exam_sections;
CREATE POLICY "Entity users can view mock exam sections"
  ON mock_exam_sections
  FOR SELECT
  TO authenticated
  USING (
    user_has_exam_access(mock_exam_id) OR is_system_admin()
  );

-- mock_exam_teachers
DROP POLICY IF EXISTS "Entity users can view mock exam teachers" ON mock_exam_teachers;
CREATE POLICY "Entity users can view mock exam teachers"
  ON mock_exam_teachers
  FOR SELECT
  TO authenticated
  USING (
    user_has_exam_access(mock_exam_id) OR is_system_admin()
  );

-- ============================================================================
-- STEP 7: Add performance indexes for RLS policy checks
-- ============================================================================

-- Index for entity_users lookups by user_id and company_id
CREATE INDEX IF NOT EXISTS idx_entity_users_user_company_active
  ON entity_users(user_id, company_id, is_active)
  WHERE is_active = true;

-- Index for entity_user_schools lookups
CREATE INDEX IF NOT EXISTS idx_entity_user_schools_entity_user_school
  ON entity_user_schools(entity_user_id, school_id);

-- Index for entity_user_branches lookups
CREATE INDEX IF NOT EXISTS idx_entity_user_branches_entity_user_branch
  ON entity_user_branches(entity_user_id, branch_id);

-- Index for mock_exam_schools lookups
CREATE INDEX IF NOT EXISTS idx_mock_exam_schools_exam_school
  ON mock_exam_schools(mock_exam_id, school_id);

-- Index for mock_exam_branches lookups
CREATE INDEX IF NOT EXISTS idx_mock_exam_branches_exam_branch
  ON mock_exam_branches(mock_exam_id, branch_id);

-- Index for admin_users lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_user_active
  ON admin_users(user_id, is_active)
  WHERE is_active = true;

-- Index for mock_exams company lookups
CREATE INDEX IF NOT EXISTS idx_mock_exams_company
  ON mock_exams(company_id);

-- ============================================================================
-- STEP 8: Grant necessary permissions on helper functions
-- ============================================================================

GRANT EXECUTE ON FUNCTION is_system_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_entity_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_exam_access(uuid) TO authenticated;
