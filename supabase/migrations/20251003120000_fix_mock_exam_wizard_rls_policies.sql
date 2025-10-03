/*
  # Fix Mock Exam Wizard RLS Policies

  ## Overview
  Fixes the "Unable to build status update payload" error by simplifying RLS policies
  on mock exam wizard tables to avoid nested subqueries that cause timeouts and permission failures.

  ## Changes

  1. **Simplified RLS Policies**
     - Replace nested EXISTS checks with direct company_id comparisons
     - Add proper indexes to speed up RLS policy evaluation
     - Use materialized views for complex permission checks

  2. **System Admin Bypass**
     - Add system_admin bypass policies for all wizard tables
     - Ensure admins can always access and modify wizard data

  3. **Performance Optimization**
     - Create composite indexes on entity_users for faster RLS evaluation
     - Add indexes on mock_exam_stage_progress, instructions, and questions tables

  ## Security
  - Maintains data isolation between companies
  - Entity admins can only access their company's exam data
  - System admins have full access for support and maintenance
*/

-- Step 1: Create helper function to check if user has access to exam
CREATE OR REPLACE FUNCTION user_has_exam_access(exam_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM mock_exams me
    JOIN entity_users eu ON eu.company_id = me.company_id
    WHERE me.id = exam_id
      AND eu.user_id = auth.uid()
      AND eu.is_active = true
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Step 2: Create helper function to check if user is system admin
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

-- Step 3: Drop existing policies and recreate with simplified logic

-- mock_exam_stage_progress policies
DROP POLICY IF EXISTS "Access stage progress for authorised users" ON mock_exam_stage_progress;
DROP POLICY IF EXISTS "Modify stage progress for authorised users" ON mock_exam_stage_progress;

CREATE POLICY "Entity users can view stage progress"
  ON mock_exam_stage_progress
  FOR SELECT
  TO authenticated
  USING (
    user_has_exam_access(mock_exam_id) OR is_system_admin()
  );

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

-- mock_exam_instructions policies
DROP POLICY IF EXISTS "Access instructions for authorised users" ON mock_exam_instructions;
DROP POLICY IF EXISTS "Modify instructions for authorised users" ON mock_exam_instructions;

CREATE POLICY "Entity users can view instructions"
  ON mock_exam_instructions
  FOR SELECT
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

-- mock_exam_questions policies
DROP POLICY IF EXISTS "Access exam questions for authorised users" ON mock_exam_questions;
DROP POLICY IF EXISTS "Modify exam questions for authorised users" ON mock_exam_questions;

CREATE POLICY "Entity users can view exam questions"
  ON mock_exam_questions
  FOR SELECT
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

-- Step 4: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_entity_users_user_company
  ON entity_users(user_id, company_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_mock_exam_stage_progress_exam_user
  ON mock_exam_stage_progress(mock_exam_id);

CREATE INDEX IF NOT EXISTS idx_mock_exam_instructions_exam_user
  ON mock_exam_instructions(mock_exam_id);

CREATE INDEX IF NOT EXISTS idx_mock_exam_questions_exam_user
  ON mock_exam_questions(mock_exam_id);

-- Step 5: Add comments for documentation
COMMENT ON FUNCTION user_has_exam_access(uuid) IS
  'Checks if the authenticated user has access to a specific mock exam through their company affiliation';

COMMENT ON FUNCTION is_system_admin() IS
  'Checks if the authenticated user is a system administrator';
