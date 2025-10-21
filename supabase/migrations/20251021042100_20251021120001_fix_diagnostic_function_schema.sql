/*
  # Fix Diagnostic Function Schema

  Removes is_active check from admin_users table since that column doesn't exist.
*/

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

  -- Step 3: Check admin_users table (no is_active column on this table)
  SELECT id, name, email, created_at, updated_at
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
      'admin_name', v_admin.name
    )
  );

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

  -- Step 5: Test RLS policy evaluation
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
