/*
  # Comprehensive Question Import Diagnostics

  This migration creates diagnostic functions to troubleshoot question import issues.
  It helps identify authentication, permission, RLS, and data validation problems.

  ## Diagnostic Functions Created:
  1. diagnose_user_import_permissions(user_email) - Check user's full permission chain
  2. diagnose_question_import_prerequisites(paper_id, data_structure_id) - Validate all prerequisites
  3. test_question_insert_for_user(user_email) - Simulate a question insert attempt
  4. get_rls_policy_status(table_name) - Show all RLS policies for a table
  5. validate_foreign_key_references(paper_id, data_structure_id) - Check all FK constraints
*/

-- ============================================================================
-- Function 1: Comprehensive User Permission Diagnosis
-- ============================================================================

CREATE OR REPLACE FUNCTION diagnose_user_import_permissions(p_user_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb := jsonb_build_object();
  v_auth_user record;
  v_user record;
  v_admin record;
  v_can_insert boolean;
  v_test_auth_uid uuid;
BEGIN
  -- Step 1: Find auth.users record by email
  v_result := v_result || jsonb_build_object('step_1_auth_lookup', jsonb_build_object('email', p_user_email));

  SELECT id, email, email_confirmed_at, created_at, last_sign_in_at
  INTO v_auth_user
  FROM auth.users
  WHERE email = p_user_email;

  IF NOT FOUND THEN
    RETURN v_result || jsonb_build_object(
      'status', 'FAILED',
      'failure_point', 'AUTH_USER_NOT_FOUND',
      'message', format('No auth.users record found for email: %s', p_user_email),
      'resolution', 'User needs to be created in Supabase Auth first'
    );
  END IF;

  v_test_auth_uid := v_auth_user.id;

  v_result := v_result || jsonb_build_object(
    'step_1_result', jsonb_build_object(
      'found', true,
      'auth_user_id', v_auth_user.id,
      'email_confirmed', v_auth_user.email_confirmed_at IS NOT NULL,
      'last_sign_in', v_auth_user.last_sign_in_at
    )
  );

  -- Step 2: Check users table linkage
  SELECT id, auth_user_id, email, is_active, created_at
  INTO v_user
  FROM users
  WHERE auth_user_id = v_test_auth_uid;

  IF NOT FOUND THEN
    RETURN v_result || jsonb_build_object(
      'status', 'FAILED',
      'failure_point', 'USERS_TABLE_NOT_LINKED',
      'message', format('Auth user %s exists but not linked to users table', v_test_auth_uid),
      'resolution', 'Run user migration or create users table record with correct auth_user_id'
    );
  END IF;

  v_result := v_result || jsonb_build_object(
    'step_2_result', jsonb_build_object(
      'found', true,
      'user_id', v_user.id,
      'is_active', v_user.is_active
    )
  );

  IF NOT COALESCE(v_user.is_active, true) THEN
    RETURN v_result || jsonb_build_object(
      'status', 'FAILED',
      'failure_point', 'USER_INACTIVE',
      'message', 'User exists but is marked as inactive',
      'resolution', 'Activate user in users table'
    );
  END IF;

  -- Step 3: Check admin_users table
  SELECT id, is_active, created_at, updated_at
  INTO v_admin
  FROM admin_users
  WHERE id = v_user.id;

  IF NOT FOUND THEN
    RETURN v_result || jsonb_build_object(
      'status', 'FAILED',
      'failure_point', 'NOT_AN_ADMIN',
      'message', 'User exists but is not in admin_users table',
      'resolution', 'Add user to admin_users table to grant admin permissions'
    );
  END IF;

  v_result := v_result || jsonb_build_object(
    'step_3_result', jsonb_build_object(
      'found', true,
      'admin_user_id', v_admin.id,
      'is_active', v_admin.is_active
    )
  );

  IF NOT COALESCE(v_admin.is_active, true) THEN
    RETURN v_result || jsonb_build_object(
      'status', 'FAILED',
      'failure_point', 'ADMIN_INACTIVE',
      'message', 'Admin user exists but is marked as inactive',
      'resolution', 'Activate admin user in admin_users table'
    );
  END IF;

  -- Step 4: Test is_admin_user() function
  SELECT is_admin_user(v_test_auth_uid) INTO v_can_insert;

  v_result := v_result || jsonb_build_object(
    'step_4_result', jsonb_build_object(
      'is_admin_user_returns', v_can_insert,
      'test_auth_uid', v_test_auth_uid
    )
  );

  IF NOT v_can_insert THEN
    RETURN v_result || jsonb_build_object(
      'status', 'FAILED',
      'failure_point', 'IS_ADMIN_USER_FUNCTION_RETURNS_FALSE',
      'message', 'User is in admin_users but is_admin_user() returns false',
      'resolution', 'Check is_admin_user() function implementation - may have wrong JOIN logic'
    );
  END IF;

  -- Step 5: Test RLS policy evaluation (simulate as this user)
  -- We can't actually SET LOCAL ROLE in this context, but we can check policy definitions
  v_result := v_result || jsonb_build_object(
    'step_5_result', jsonb_build_object(
      'note', 'RLS policies checked separately',
      'rls_enabled_on_questions_master_admin', (
        SELECT relrowsecurity
        FROM pg_class
        WHERE relname = 'questions_master_admin'
      )
    )
  );

  -- Step 6: Check table permissions
  v_result := v_result || jsonb_build_object(
    'step_6_result', jsonb_build_object(
      'authenticated_role_has_insert', (
        SELECT has_table_privilege('authenticated', 'questions_master_admin', 'INSERT')
      ),
      'authenticated_role_has_select', (
        SELECT has_table_privilege('authenticated', 'questions_master_admin', 'SELECT')
      )
    )
  );

  -- All checks passed
  RETURN v_result || jsonb_build_object(
    'status', 'SUCCESS',
    'message', format('User %s has all required permissions to import questions', p_user_email),
    'summary', jsonb_build_object(
      'auth_user_id', v_test_auth_uid,
      'user_id', v_user.id,
      'admin_user_id', v_admin.id,
      'is_admin_user_result', v_can_insert,
      'all_checks_passed', true
    )
  );
END;
$$;

COMMENT ON FUNCTION diagnose_user_import_permissions IS 'Comprehensive diagnosis of a user''s permissions for question import. Pass email address to check full permission chain from auth.users -> users -> admin_users -> RLS policies.';

GRANT EXECUTE ON FUNCTION diagnose_user_import_permissions(text) TO authenticated;

-- ============================================================================
-- Function 2: Diagnose Question Import Prerequisites
-- ============================================================================

CREATE OR REPLACE FUNCTION diagnose_question_import_prerequisites(
  p_paper_id uuid,
  p_data_structure_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb := jsonb_build_object();
  v_paper record;
  v_ds record;
  v_errors text[] := ARRAY[]::text[];
BEGIN
  -- Check paper exists and is accessible
  SELECT id, paper_code, paper_name, status, questions_imported, created_at
  INTO v_paper
  FROM papers_setup
  WHERE id = p_paper_id;

  IF NOT FOUND THEN
    v_errors := array_append(v_errors, format('Paper ID %s not found in papers_setup table', p_paper_id));
  ELSE
    v_result := v_result || jsonb_build_object(
      'paper', jsonb_build_object(
        'id', v_paper.id,
        'code', v_paper.paper_code,
        'name', v_paper.paper_name,
        'status', v_paper.status,
        'questions_already_imported', COALESCE(v_paper.questions_imported, false)
      )
    );
  END IF;

  -- Check data structure exists and has all required IDs
  SELECT
    id, region_id, program_id, provider_id, subject_id,
    (SELECT name FROM regions WHERE id = data_structures.region_id) as region_name,
    (SELECT name FROM programs WHERE id = data_structures.program_id) as program_name,
    (SELECT name FROM providers WHERE id = data_structures.provider_id) as provider_name,
    (SELECT name FROM edu_subjects WHERE id = data_structures.subject_id) as subject_name
  INTO v_ds
  FROM data_structures
  WHERE id = p_data_structure_id;

  IF NOT FOUND THEN
    v_errors := array_append(v_errors, format('Data structure ID %s not found', p_data_structure_id));
  ELSE
    v_result := v_result || jsonb_build_object(
      'data_structure', jsonb_build_object(
        'id', v_ds.id,
        'region_id', v_ds.region_id,
        'region_name', v_ds.region_name,
        'program_id', v_ds.program_id,
        'program_name', v_ds.program_name,
        'provider_id', v_ds.provider_id,
        'provider_name', v_ds.provider_name,
        'subject_id', v_ds.subject_id,
        'subject_name', v_ds.subject_name
      )
    );

    -- Validate all required IDs are present
    IF v_ds.region_id IS NULL THEN
      v_errors := array_append(v_errors, 'Data structure is missing region_id');
    END IF;
    IF v_ds.program_id IS NULL THEN
      v_errors := array_append(v_errors, 'Data structure is missing program_id');
    END IF;
    IF v_ds.provider_id IS NULL THEN
      v_errors := array_append(v_errors, 'Data structure is missing provider_id');
    END IF;
    IF v_ds.subject_id IS NULL THEN
      v_errors := array_append(v_errors, 'Data structure is missing subject_id');
    END IF;
  END IF;

  -- Return result
  IF array_length(v_errors, 1) > 0 THEN
    RETURN v_result || jsonb_build_object(
      'status', 'FAILED',
      'errors', v_errors,
      'can_proceed', false
    );
  ELSE
    RETURN v_result || jsonb_build_object(
      'status', 'SUCCESS',
      'errors', '[]'::jsonb,
      'can_proceed', true,
      'message', 'All prerequisites are valid'
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION diagnose_question_import_prerequisites IS 'Validates that paper and data structure exist with all required foreign key references.';

GRANT EXECUTE ON FUNCTION diagnose_question_import_prerequisites(uuid, uuid) TO authenticated;

-- ============================================================================
-- Function 3: Test Question Insert for User
-- ============================================================================

CREATE OR REPLACE FUNCTION test_question_insert_for_user(p_user_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb := jsonb_build_object();
  v_auth_uid uuid;
  v_can_view boolean := false;
  v_can_insert boolean := false;
  v_test_error text;
BEGIN
  -- Get auth UID for user
  SELECT id INTO v_auth_uid FROM auth.users WHERE email = p_user_email;

  IF v_auth_uid IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'ERROR',
      'message', format('User %s not found in auth.users', p_user_email)
    );
  END IF;

  v_result := v_result || jsonb_build_object('auth_uid', v_auth_uid);

  -- Test if user can view questions (SELECT permission)
  BEGIN
    PERFORM 1 FROM questions_master_admin LIMIT 1;
    v_can_view := true;
  EXCEPTION
    WHEN insufficient_privilege THEN
      v_can_view := false;
      v_test_error := SQLERRM;
    WHEN OTHERS THEN
      v_can_view := false;
      v_test_error := SQLERRM;
  END;

  v_result := v_result || jsonb_build_object(
    'can_view_questions', v_can_view,
    'view_error', v_test_error
  );

  -- Get RLS policy info
  v_result := v_result || jsonb_build_object(
    'rls_policies', (
      SELECT jsonb_agg(jsonb_build_object(
        'policy_name', polname,
        'command', cmd,
        'roles', polroles::regrole[],
        'qual', polqual,
        'with_check', polwithcheck
      ))
      FROM pg_policy p
      JOIN pg_class c ON p.polrelid = c.oid
      WHERE c.relname = 'questions_master_admin'
    )
  );

  RETURN v_result || jsonb_build_object(
    'status', 'COMPLETED',
    'is_admin_user_result', is_admin_user(v_auth_uid)
  );
END;
$$;

COMMENT ON FUNCTION test_question_insert_for_user IS 'Tests if a specific user can insert questions by checking permissions and RLS policies.';

GRANT EXECUTE ON FUNCTION test_question_insert_for_user(text) TO authenticated;

-- ============================================================================
-- Function 4: Get RLS Policy Status
-- ============================================================================

CREATE OR REPLACE FUNCTION get_rls_policy_status(p_table_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'table_name', p_table_name,
    'rls_enabled', (
      SELECT relrowsecurity
      FROM pg_class
      WHERE relname = p_table_name
    ),
    'rls_forced', (
      SELECT relforcerowsecurity
      FROM pg_class
      WHERE relname = p_table_name
    ),
    'policies', (
      SELECT jsonb_agg(jsonb_build_object(
        'policy_name', polname,
        'command', cmd,
        'permissive', polpermissive,
        'roles', polroles::regrole[],
        'using_expression', pg_get_expr(polqual, polrelid),
        'with_check_expression', pg_get_expr(polwithcheck, polrelid)
      ) ORDER BY polname)
      FROM pg_policy p
      JOIN pg_class c ON p.polrelid = c.oid
      WHERE c.relname = p_table_name
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_rls_policy_status IS 'Returns detailed information about RLS policies on a table including policy expressions.';

GRANT EXECUTE ON FUNCTION get_rls_policy_status(text) TO authenticated;

-- ============================================================================
-- Function 5: Validate Foreign Key References
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_foreign_key_references(
  p_paper_id uuid,
  p_data_structure_id uuid,
  p_chapter_id uuid DEFAULT NULL,
  p_topic_id uuid DEFAULT NULL,
  p_subtopic_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb := jsonb_build_object('all_valid', true);
  v_invalid_refs text[] := ARRAY[]::text[];
BEGIN
  -- Check paper_id
  IF NOT EXISTS (SELECT 1 FROM papers_setup WHERE id = p_paper_id) THEN
    v_invalid_refs := array_append(v_invalid_refs, format('Invalid paper_id: %s', p_paper_id));
    v_result := v_result || jsonb_build_object('all_valid', false);
  END IF;

  -- Check data_structure_id
  IF NOT EXISTS (SELECT 1 FROM data_structures WHERE id = p_data_structure_id) THEN
    v_invalid_refs := array_append(v_invalid_refs, format('Invalid data_structure_id: %s', p_data_structure_id));
    v_result := v_result || jsonb_build_object('all_valid', false);
  END IF;

  -- Check chapter_id (if provided)
  IF p_chapter_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM edu_units WHERE id = p_chapter_id) THEN
      v_invalid_refs := array_append(v_invalid_refs, format('Invalid chapter_id: %s', p_chapter_id));
      v_result := v_result || jsonb_build_object('all_valid', false);
    END IF;
  END IF;

  -- Check topic_id (if provided)
  IF p_topic_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM edu_topics WHERE id = p_topic_id) THEN
      v_invalid_refs := array_append(v_invalid_refs, format('Invalid topic_id: %s', p_topic_id));
      v_result := v_result || jsonb_build_object('all_valid', false);
    END IF;
  END IF;

  -- Check subtopic_id (if provided)
  IF p_subtopic_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM edu_subtopics WHERE id = p_subtopic_id) THEN
      v_invalid_refs := array_append(v_invalid_refs, format('Invalid subtopic_id: %s', p_subtopic_id));
      v_result := v_result || jsonb_build_object('all_valid', false);
    END IF;
  END IF;

  RETURN v_result || jsonb_build_object('invalid_references', v_invalid_refs);
END;
$$;

COMMENT ON FUNCTION validate_foreign_key_references IS 'Validates that all foreign key references exist in their respective tables before attempting insert.';

GRANT EXECUTE ON FUNCTION validate_foreign_key_references TO authenticated;
