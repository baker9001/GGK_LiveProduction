/*
  # Add Search Path to Remaining Functions
  
  Adds explicit search_path to all remaining functions with mutable search paths.
  This prevents search path injection attacks, especially for SECURITY DEFINER functions.
*/

DO $$
DECLARE
  func_list text[] := ARRAY[
    'update_navigation_state_timestamp()',
    'update_review_progress_timestamp()',
    'update_table_templates_updated_at()',
    'check_teacher_availability()',
    'create_user_with_profile()',
    'validate_venue_capacity()',
    'sync_admin_users_to_users()',
    'sync_student_active_status()',
    'track_paper_status_change()',
    'check_admin_hierarchy_circular_reference()',
    'update_review_session_progress()',
    'update_student_counts()',
    'trigger_update_student_counts()',
    'get_email_stats()',
    'update_mock_exam_student_counts()',
    'calculate_percentage_score(integer,integer)',
    'update_smtp_configuration_updated_at()',
    'reset_smtp_counters()',
    'get_grade_level_schools(uuid)',
    'get_academic_year_schools(uuid)',
    'get_department_schools(uuid)',
    'update_organization_counts()',
    'update_email_templates_updated_at()',
    'get_available_licenses_for_scope(uuid,text,uuid)',
    'calculate_mock_exam_readiness(uuid)',
    'generate_ai_study_plan(uuid,uuid,text)',
    'sync_teacher_active_status()',
    'sync_user_active_status()',
    'get_question_counts_by_paper(uuid)',
    'validate_marks_allocation(uuid)',
    'get_student_counts_by_org()',
    'refresh_context_analytics_views()',
    'update_context_mastery_cache(uuid,uuid)',
    'update_updated_at_column()',
    'sync_license_total_allocated()',
    'update_paper_status_timestamp()',
    'detect_answer_format(jsonb)',
    'validate_password_reset_user(uuid)',
    'cleanup_expired_tokens()',
    'get_organization_stats(uuid)',
    'validate_org_hierarchy(uuid,uuid,text)',
    'auto_populate_question_display_flags()',
    'get_department_hierarchy(uuid)',
    'get_department_member_count(uuid)',
    'get_department_members(uuid)',
    'auto_verify_dev_emails()',
    'is_question_ready_for_qa(uuid)',
    'sync_admin_user_changes()',
    'get_school_departments(uuid)',
    'clone_department_structure(uuid,uuid)',
    'is_paper_ready_for_publishing(uuid)',
    'log_paper_status_change()',
    'log_status_change()',
    'validate_status_transition(text,text)',
    'batch_update_question_display_flags()',
    'test_answer_components_rls()',
    'migrate_existing_users_to_auth()',
    'prevent_self_deactivation()'
  ];
  func_name text;
BEGIN
  FOREACH func_name IN ARRAY func_list
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', func_name);
      RAISE NOTICE 'Fixed search_path for function: %', func_name;
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'Function % does not exist, skipping', func_name;
    WHEN OTHERS THEN
      RAISE WARNING 'Could not fix search_path for function %: %', func_name, SQLERRM;
    END;
  END LOOP;
END $$;
