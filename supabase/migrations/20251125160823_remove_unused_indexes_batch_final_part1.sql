/*
  # Remove Unused Indexes - Final Batch Part 1
  
  1. Changes
    - Remove first 100 unused indexes from audit report
    
  2. Performance Impact
    - Reduces database bloat
    - Improves write performance
*/

DO $$
DECLARE
  idx_name text;
  idx_array text[] := ARRAY[
    'idx_entity_users_auth_user_id',
    'idx_entity_users_is_company_admin',
    'idx_mock_exam_question_performance_sub_question_id',
    'idx_student_licenses_status',
    'idx_student_licenses_pending',
    'idx_student_licenses_validity',
    'idx_students_student_code',
    'idx_students_enrollment_number',
    'idx_teachers_teacher_code',
    'idx_entity_users_user_id',
    'idx_audit_logs_created_at',
    'idx_papers_setup_published_by',
    'idx_student_achievements_achievement_id',
    'idx_student_daily_challenges_challenge_id',
    'idx_suspicious_activities_reviewed_by',
    'idx_teacher_departments_department_id',
    'idx_departments_head_id',
    'idx_teacher_grade_levels_grade_level_id',
    'idx_entity_users_department_id',
    'idx_teacher_programs_program_id',
    'idx_teacher_sections_section_id',
    'idx_teacher_subjects_subject_id',
    'idx_question_distractors_sub_question_id',
    'idx_question_correct_answers_sub_question_id',
    'idx_answer_components_question',
    'idx_answer_components_sub_question',
    'idx_answer_components_context',
    'idx_answer_requirements_sub_question',
    'idx_analytics_facts_student',
    'idx_analytics_facts_context',
    'idx_analytics_facts_date',
    'idx_context_performance_student',
    'idx_context_performance_context',
    'idx_context_mastery_student',
    'idx_context_mastery_context',
    'idx_student_class_sections_academic_year',
    'idx_student_class_sections_student_active',
    'idx_audit_created_at',
    'idx_exam_answers_extended_attempt',
    'idx_exam_answers_extended_format',
    'idx_entity_users_email',
    'idx_entity_users_is_active',
    'idx_test_mode_logs_test_user',
    'idx_test_mode_logs_created',
    'idx_test_mode_logs_session',
    'idx_materials_school_id',
    'idx_materials_grade_id',
    'idx_entity_users_parent_admin_id',
    'idx_materials_teacher_id',
    'idx_materials_student_access',
    'idx_admin_invitations_token',
    'idx_admin_invitations_expires_at',
    'idx_materials_school_subject',
    'idx_materials_teacher_active',
    'idx_materials_visibility',
    'idx_sessions_json_hash',
    'idx_companies_additional_ceo_email',
    'idx_paper_status_history_paper_id',
    'idx_paper_status_history_changed_at',
    'idx_question_confirmations_question_id',
    'idx_question_confirmations_performed_at',
    'idx_teacher_branches_branch_id',
    'idx_import_sessions_user_hash',
    'idx_teacher_schools_teacher_id',
    'idx_teacher_schools_school_id',
    'idx_teacher_branches_teacher_id',
    'idx_teachers_status',
    'idx_material_access_logs_user_id',
    'idx_students_company_id',
    'idx_students_status',
    'idx_students_grade_level',
    'idx_material_access_logs_material_id',
    'idx_material_access_logs_access_type',
    'idx_material_access_logs_accessed_at',
    'idx_suspicious_activities_user_id',
    'idx_suspicious_activities_material_id',
    'idx_suspicious_activities_severity',
    'idx_suspicious_activities_reviewed',
    'idx_suspicious_activities_detected_at',
    'idx_students_school_branch',
    'idx_students_birthday',
    'idx_students_gender',
    'idx_email_queue_status',
    'idx_email_queue_created_at',
    'idx_email_queue_scheduled_for',
    'idx_email_verifications_token',
    'idx_email_verifications_expires_at',
    'idx_mock_exam_templates_company',
    'idx_mock_exam_templates_shared',
    'idx_login_attempts_email',
    'idx_login_attempts_ip',
    'idx_login_attempts_attempted_at',
    'idx_smtp_configuration_active',
    'idx_password_reset_tokens_token',
    'idx_password_reset_tokens_expires',
    'idx_password_reset_tokens_user',
    'idx_smtp_configuration_company',
    'idx_teachers_is_active',
    'idx_teachers_updated_at',
    'idx_countries_region_id',
    'idx_parents_email',
    'idx_email_templates_code',
    'idx_email_templates_active'
  ];
BEGIN
  FOREACH idx_name IN ARRAY idx_array
  LOOP
    BEGIN
      EXECUTE format('DROP INDEX IF EXISTS %I', idx_name);
      RAISE NOTICE 'Dropped index: %', idx_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not drop index %: %', idx_name, SQLERRM;
    END;
  END LOOP;
END $$;