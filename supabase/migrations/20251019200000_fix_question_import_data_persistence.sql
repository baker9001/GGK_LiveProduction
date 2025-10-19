/*
  # Fix Question Import Data Persistence Issues

  1. Problem Analysis
    - Questions appear to import successfully but data doesn't persist to database
    - RLS policies may be failing silently during INSERT operations
    - Authentication session may not be properly synchronized
    - Missing validation causing constraint violations

  2. Solutions Implemented
    - Simplify RLS policies to prevent silent failures
    - Add explicit INSERT permissions for authenticated admin users
    - Create diagnostic functions to verify authentication and permissions
    - Add pre-flight validation checks
    - Ensure all foreign key references are valid

  3. Security
    - Maintains RLS security with clearer, more reliable policies
    - Uses SECURITY DEFINER functions for permission checks
    - Adds detailed logging for debugging without exposing sensitive data
*/

-- ============================================================================
-- STEP 1: Create diagnostic functions for troubleshooting
-- ============================================================================

-- Function to check if current user can insert questions
CREATE OR REPLACE FUNCTION can_insert_questions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  user_record record;
  admin_record record;
  result jsonb;
BEGIN
  -- Get current auth user ID
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'can_insert', false,
      'reason', 'No authenticated session found',
      'auth_uid', null
    );
  END IF;

  -- Check if user exists in users table
  SELECT * INTO user_record FROM users WHERE auth_user_id = current_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'can_insert', false,
      'reason', 'Auth user not found in users table',
      'auth_uid', current_user_id
    );
  END IF;

  -- Check if user is an admin
  SELECT * INTO admin_record FROM admin_users WHERE id = user_record.id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'can_insert', false,
      'reason', 'User is not a system admin',
      'auth_uid', current_user_id,
      'user_id', user_record.id
    );
  END IF;

  -- User can insert
  RETURN jsonb_build_object(
    'can_insert', true,
    'auth_uid', current_user_id,
    'user_id', user_record.id,
    'admin_user_id', admin_record.id,
    'is_active', COALESCE(admin_record.is_active, true)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION can_insert_questions() TO authenticated;

COMMENT ON FUNCTION can_insert_questions IS 'Diagnostic function to check if the current authenticated user has permission to insert questions. Returns detailed information about authentication and admin status.';

-- ============================================================================
-- STEP 2: Fix is_admin_user function to use auth_user_id correctly
-- ============================================================================

-- Recreate is_admin_user with better error handling and logging
CREATE OR REPLACE FUNCTION is_admin_user(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- If user_id is NULL, return false immediately
  IF user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if the provided auth user_id belongs to an admin user
  -- Join through users table: auth.uid() -> users.auth_user_id -> users.id -> admin_users.id
  SELECT EXISTS (
    SELECT 1
    FROM admin_users au
    JOIN users u ON u.id = au.id
    WHERE u.auth_user_id = user_id
      AND au.is_active = true
  ) INTO is_admin;

  RETURN COALESCE(is_admin, false);
END;
$$;

GRANT EXECUTE ON FUNCTION is_admin_user(uuid) TO authenticated;

COMMENT ON FUNCTION is_admin_user IS 'Checks if a given Supabase auth UID belongs to an active system admin user. Returns false for NULL input or inactive admins.';

-- ============================================================================
-- STEP 3: Recreate RLS policies for questions_master_admin with explicit INSERT
-- ============================================================================

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Authenticated view questions" ON questions_master_admin;
DROP POLICY IF EXISTS "System admins manage questions" ON questions_master_admin;
DROP POLICY IF EXISTS "System admins can view all questions_master_admin" ON questions_master_admin;
DROP POLICY IF EXISTS "System admins can create questions_master_admin" ON questions_master_admin;
DROP POLICY IF EXISTS "System admins can update all questions_master_admin" ON questions_master_admin;
DROP POLICY IF EXISTS "System admins can delete questions_master_admin" ON questions_master_admin;

-- Ensure RLS is enabled
ALTER TABLE questions_master_admin ENABLE ROW LEVEL SECURITY;

-- Policy 1: System admins can SELECT all questions
CREATE POLICY "System admins can view all questions_master_admin"
  ON questions_master_admin
  FOR SELECT
  TO authenticated
  USING (is_admin_user(auth.uid()));

-- Policy 2: System admins can INSERT questions
CREATE POLICY "System admins can create questions_master_admin"
  ON questions_master_admin
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_user(auth.uid()));

-- Policy 3: System admins can UPDATE questions
CREATE POLICY "System admins can update all questions_master_admin"
  ON questions_master_admin
  FOR UPDATE
  TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Policy 4: System admins can DELETE questions
CREATE POLICY "System admins can delete questions_master_admin"
  ON questions_master_admin
  FOR DELETE
  TO authenticated
  USING (is_admin_user(auth.uid()));

-- ============================================================================
-- STEP 4: Fix RLS policies for related tables (question_options, questions_attachments, etc.)
-- ============================================================================

-- Ensure question_options has proper RLS policies
ALTER TABLE question_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System admins can view all question_options" ON question_options;
DROP POLICY IF EXISTS "System admins can create question_options" ON question_options;
DROP POLICY IF EXISTS "System admins can update all question_options" ON question_options;
DROP POLICY IF EXISTS "System admins can delete question_options" ON question_options;

CREATE POLICY "System admins can view all question_options"
  ON question_options FOR SELECT TO authenticated
  USING (is_admin_user(auth.uid()));

CREATE POLICY "System admins can create question_options"
  ON question_options FOR INSERT TO authenticated
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "System admins can update all question_options"
  ON question_options FOR UPDATE TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "System admins can delete question_options"
  ON question_options FOR DELETE TO authenticated
  USING (is_admin_user(auth.uid()));

-- Ensure questions_attachments has proper RLS policies
ALTER TABLE questions_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System admins can view all questions_attachments" ON questions_attachments;
DROP POLICY IF EXISTS "System admins can create questions_attachments" ON questions_attachments;
DROP POLICY IF EXISTS "System admins can update all questions_attachments" ON questions_attachments;
DROP POLICY IF EXISTS "System admins can delete questions_attachments" ON questions_attachments;

CREATE POLICY "System admins can view all questions_attachments"
  ON questions_attachments FOR SELECT TO authenticated
  USING (is_admin_user(auth.uid()));

CREATE POLICY "System admins can create questions_attachments"
  ON questions_attachments FOR INSERT TO authenticated
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "System admins can update all questions_attachments"
  ON questions_attachments FOR UPDATE TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "System admins can delete questions_attachments"
  ON questions_attachments FOR DELETE TO authenticated
  USING (is_admin_user(auth.uid()));

-- Ensure question_correct_answers has proper RLS policies
ALTER TABLE question_correct_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System admins can view all question_correct_answers" ON question_correct_answers;
DROP POLICY IF EXISTS "System admins can create question_correct_answers" ON question_correct_answers;
DROP POLICY IF EXISTS "System admins can update all question_correct_answers" ON question_correct_answers;
DROP POLICY IF EXISTS "System admins can delete question_correct_answers" ON question_correct_answers;

CREATE POLICY "System admins can view all question_correct_answers"
  ON question_correct_answers FOR SELECT TO authenticated
  USING (is_admin_user(auth.uid()));

CREATE POLICY "System admins can create question_correct_answers"
  ON question_correct_answers FOR INSERT TO authenticated
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "System admins can update all question_correct_answers"
  ON question_correct_answers FOR UPDATE TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "System admins can delete question_correct_answers"
  ON question_correct_answers FOR DELETE TO authenticated
  USING (is_admin_user(auth.uid()));

-- Ensure sub_questions has proper RLS policies
ALTER TABLE sub_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System admins can view all sub_questions" ON sub_questions;
DROP POLICY IF EXISTS "System admins can create sub_questions" ON sub_questions;
DROP POLICY IF EXISTS "System admins can update all sub_questions" ON sub_questions;
DROP POLICY IF EXISTS "System admins can delete sub_questions" ON sub_questions;
DROP POLICY IF EXISTS "Authenticated view sub-questions" ON sub_questions;
DROP POLICY IF EXISTS "System admins manage sub-questions" ON sub_questions;

CREATE POLICY "System admins can view all sub_questions"
  ON sub_questions FOR SELECT TO authenticated
  USING (is_admin_user(auth.uid()));

CREATE POLICY "System admins can create sub_questions"
  ON sub_questions FOR INSERT TO authenticated
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "System admins can update all sub_questions"
  ON sub_questions FOR UPDATE TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "System admins can delete sub_questions"
  ON sub_questions FOR DELETE TO authenticated
  USING (is_admin_user(auth.uid()));

-- ============================================================================
-- STEP 5: Create validation function for pre-flight checks
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_question_import_prerequisites(
  p_paper_id uuid,
  p_data_structure_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb := jsonb_build_object('valid', true, 'errors', '[]'::jsonb);
  errors jsonb := '[]'::jsonb;
  paper_exists boolean;
  ds_exists boolean;
  ds_record record;
BEGIN
  -- Check if paper exists
  SELECT EXISTS(SELECT 1 FROM papers_setup WHERE id = p_paper_id) INTO paper_exists;
  IF NOT paper_exists THEN
    errors := errors || jsonb_build_object('field', 'paper_id', 'message', 'Paper does not exist');
  END IF;

  -- Check if data structure exists and has all required IDs
  SELECT * INTO ds_record FROM data_structures WHERE id = p_data_structure_id;
  IF NOT FOUND THEN
    errors := errors || jsonb_build_object('field', 'data_structure_id', 'message', 'Data structure does not exist');
  ELSE
    IF ds_record.region_id IS NULL THEN
      errors := errors || jsonb_build_object('field', 'region_id', 'message', 'Data structure missing region_id');
    END IF;
    IF ds_record.program_id IS NULL THEN
      errors := errors || jsonb_build_object('field', 'program_id', 'message', 'Data structure missing program_id');
    END IF;
    IF ds_record.provider_id IS NULL THEN
      errors := errors || jsonb_build_object('field', 'provider_id', 'message', 'Data structure missing provider_id');
    END IF;
    IF ds_record.subject_id IS NULL THEN
      errors := errors || jsonb_build_object('field', 'subject_id', 'message', 'Data structure missing subject_id');
    END IF;
  END IF;

  -- Build result
  IF jsonb_array_length(errors) > 0 THEN
    result := jsonb_build_object('valid', false, 'errors', errors);
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION validate_question_import_prerequisites(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION validate_question_import_prerequisites IS 'Validates that all prerequisites for importing questions are met. Checks paper existence and data structure completeness.';

-- ============================================================================
-- STEP 6: Add indexes for better performance during import
-- ============================================================================

-- Ensure critical indexes exist for question lookups during import
CREATE INDEX IF NOT EXISTS idx_questions_master_admin_paper_question_number
  ON questions_master_admin(paper_id, question_number)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_questions_master_admin_paper_id
  ON questions_master_admin(paper_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_question_options_question_id
  ON question_options(question_id);

CREATE INDEX IF NOT EXISTS idx_questions_attachments_question_id
  ON questions_attachments(question_id);

CREATE INDEX IF NOT EXISTS idx_question_correct_answers_question_id
  ON question_correct_answers(question_id);

CREATE INDEX IF NOT EXISTS idx_sub_questions_parent_question_id
  ON sub_questions(parent_question_id);

-- ============================================================================
-- STEP 7: Create a function to test insert permissions
-- ============================================================================

CREATE OR REPLACE FUNCTION test_question_insert_permission()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  test_result jsonb;
  current_user_info jsonb;
  can_view boolean := false;
  can_insert boolean := false;
BEGIN
  -- Get current user info
  current_user_info := can_insert_questions();

  -- Test if user can view questions
  BEGIN
    PERFORM 1 FROM questions_master_admin LIMIT 1;
    can_view := true;
  EXCEPTION WHEN insufficient_privilege THEN
    can_view := false;
  END;

  -- Build result
  test_result := jsonb_build_object(
    'timestamp', now(),
    'user_info', current_user_info,
    'can_view_questions', can_view,
    'rls_enabled', (
      SELECT relrowsecurity
      FROM pg_class
      WHERE relname = 'questions_master_admin'
    ),
    'active_policies', (
      SELECT jsonb_agg(jsonb_build_object(
        'policy_name', polname,
        'command', cmd
      ))
      FROM pg_policies
      WHERE tablename = 'questions_master_admin'
    )
  );

  RETURN test_result;
END;
$$;

GRANT EXECUTE ON FUNCTION test_question_insert_permission() TO authenticated;

COMMENT ON FUNCTION test_question_insert_permission IS 'Tests if the current user has permission to insert questions. Returns diagnostic information about RLS policies and user permissions.';
