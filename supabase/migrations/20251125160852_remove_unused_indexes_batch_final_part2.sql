/*
  # Remove Unused Indexes - Final Batch Part 2
  
  1. Changes
    - Remove next 100 unused indexes from audit report
*/

DO $$
DECLARE
  idx_name text;
  idx_array text[] := ARRAY[
    'idx_parent_students_parent',
    'idx_cities_country_id',
    'idx_companies_name',
    'idx_data_structures_program_id',
    'idx_data_structures_provider_id',
    'idx_data_structures_region_id',
    'idx_question_subtopics_sub_question_id',
    'idx_role_permissions_path',
    'idx_role_permissions_role_id',
    'idx_schools_company_id',
    'idx_papers_setup_year',
    'idx_sub_questions_parent_id',
    'idx_context_performance_recent',
    'idx_context_performance_created',
    'idx_academic_year_schools_school',
    'idx_department_schools_school',
    'idx_config_assignments_type',
    'idx_config_assignments_school',
    'idx_config_assignments_branch',
    'idx_entity_admin_scope_active',
    'idx_entity_admin_audit_log_company',
    'idx_entity_admin_audit_log_actor',
    'idx_entity_admin_audit_log_created',
    'idx_entity_users_created_by',
    'idx_entity_admin_hierarchy_active',
    'idx_students_is_active',
    'idx_students_updated_at',
    'idx_admin_users_role_id',
    'idx_grade_level_branches_active',
    'idx_mock_exam_teachers_school',
    'idx_mock_exam_teachers_branch',
    'idx_mock_exam_teachers_role',
    'idx_mock_exam_teachers_confirmed',
    'idx_mock_exam_materials_type',
    'idx_mock_exam_materials_active',
    'idx_mock_exam_venues_branch',
    'idx_mock_exam_venues_status',
    'idx_departments_department_type',
    'idx_department_branches_branch',
    'idx_departments_name',
    'idx_departments_code',
    'idx_question_correct_answers_alternative_type',
    'idx_question_topics_question_id',
    'idx_question_topics_sub_question_id',
    'idx_question_topics_sub_question_topic',
    'idx_question_correct_answers_linked_alternatives',
    'idx_question_correct_answers_acceptable_variations',
    'idx_departments_contact_phone',
    'idx_simulation_results_user',
    'idx_simulation_results_passed',
    'idx_student_licenses_expires',
    'idx_licenses_used_quantity',
    'idx_licenses_availability',
    'idx_users_auth_user_id',
    'idx_mock_exams_data_structure_id',
    'idx_mock_exams_status',
    'idx_mock_exams_exam_window',
    'idx_mock_exams_created_by',
    'idx_mock_exam_schools_school',
    'idx_mock_exam_schools_coordinating',
    'idx_mock_exam_branches_branch',
    'idx_mock_exam_branches_invigilator',
    'idx_mock_exam_students_student',
    'idx_mock_exam_students_school',
    'idx_mock_exam_students_branch',
    'idx_mock_exam_students_status',
    'idx_mock_exam_students_submission',
    'idx_mock_exam_responses_exam',
    'idx_mock_exam_responses_student',
    'idx_mock_exam_responses_question',
    'idx_mock_exam_responses_sub_question',
    'idx_mock_exam_responses_marker',
    'idx_mock_exam_results_student',
    'idx_mock_exam_results_flagged',
    'idx_mock_exam_results_priority',
    'idx_mock_exam_results_grade',
    'idx_mock_exam_question_performance_question',
    'idx_mock_exam_question_performance_difficulty',
    'idx_licenses_status',
    'idx_licenses_total_allocated',
    'idx_licenses_allocation_usage',
    'idx_papers_setup_published_at',
    'idx_student_analytics_student',
    'idx_ai_study_plans_student',
    'idx_ai_study_plans_status',
    'idx_ai_study_plans_type',
    'idx_admin_invitations_role_id_fk',
    'idx_ai_study_plans_approved_by_fk',
    'idx_analytics_facts_sub_question_id_fk',
    'idx_context_performance_component_id_fk',
    'idx_context_performance_sub_question_id_fk',
    'idx_branches_created_by_fk',
    'idx_branches_updated_by_fk',
    'idx_branches_additional_updated_by_fk',
    'idx_companies_country_id_fk',
    'idx_companies_region_id_fk',
    'idx_companies_additional_updated_by_fk',
    'idx_configuration_templates_company_id_fk',
    'idx_entity_positions_reports_to_position_id_fk',
    'idx_edu_learning_objectives_subtopic_id_fk',
    'idx_edu_specific_concepts_objective_id_fk'
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