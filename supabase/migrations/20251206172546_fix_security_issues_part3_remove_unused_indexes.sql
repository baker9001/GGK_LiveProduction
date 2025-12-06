/*
  # Security Fixes Part 3: Remove Unused Indexes

  ## Summary
  Removes unused indexes to improve write performance and reduce storage overhead

  ## Changes
  - Removes 50+ unused indexes identified by database audit
  - Focuses on indexes with zero usage statistics

  ## Impact
  - MEDIUM: Improves INSERT/UPDATE performance
  - Reduces storage requirements
  - Simplifies index maintenance
*/

-- =====================================================
-- Remove Unused Indexes
-- =====================================================

-- Academic structures
DROP INDEX IF EXISTS public.idx_academic_year_schools_school_id;

-- Companies
DROP INDEX IF EXISTS public.idx_companies_country_id;
DROP INDEX IF EXISTS public.idx_companies_region_id;

-- Admin management
DROP INDEX IF EXISTS public.idx_admin_invitations_invited_by;
DROP INDEX IF EXISTS public.idx_audit_logs_entity_id;

-- Entity management
DROP INDEX IF EXISTS public.idx_entity_users_department_id;
DROP INDEX IF EXISTS public.idx_entity_users_parent_admin_id;

-- Students
DROP INDEX IF EXISTS public.idx_students_branch_id;
DROP INDEX IF EXISTS public.idx_students_class_section_id;

-- Teachers
DROP INDEX IF EXISTS public.idx_teachers_department_id;

-- AI Study Plans
DROP INDEX IF EXISTS public.idx_ai_study_plans_student_id;
DROP INDEX IF EXISTS public.idx_ai_study_plans_approved_by;

-- Licenses
DROP INDEX IF EXISTS public.idx_license_actions_license_id;
DROP INDEX IF EXISTS public.idx_licenses_company_id;
DROP INDEX IF EXISTS public.idx_student_licenses_license_id;
DROP INDEX IF EXISTS public.idx_student_licenses_student_id;

-- Materials
DROP INDEX IF EXISTS public.idx_material_access_logs_material_id;
DROP INDEX IF EXISTS public.idx_materials_data_structure_id;
DROP INDEX IF EXISTS public.idx_materials_school_id;
DROP INDEX IF EXISTS public.idx_materials_teacher_id;
DROP INDEX IF EXISTS public.idx_materials_subtopic_id;
DROP INDEX IF EXISTS public.idx_materials_topic_id;
DROP INDEX IF EXISTS public.idx_materials_unit_id;
DROP INDEX IF EXISTS public.idx_materials_grade_id;

-- Mock Exams
DROP INDEX IF EXISTS public.idx_mock_exams_company_id;
DROP INDEX IF EXISTS public.idx_mock_exams_created_by;
DROP INDEX IF EXISTS public.idx_mock_exams_data_structure_id;
DROP INDEX IF EXISTS public.idx_mock_exam_questions_question_id;
DROP INDEX IF EXISTS public.idx_mock_exam_results_student_id;
DROP INDEX IF EXISTS public.idx_mock_exam_status_history_mock_exam_id;
DROP INDEX IF EXISTS public.idx_mock_exam_status_history_changed_by;
DROP INDEX IF EXISTS public.idx_mock_exam_branches_branch_id;
DROP INDEX IF EXISTS public.idx_mock_exam_branches_invigilator_id;
DROP INDEX IF EXISTS public.idx_mock_exam_schools_school_id;
DROP INDEX IF EXISTS public.idx_mock_exam_students_branch_id;
DROP INDEX IF EXISTS public.idx_mock_exam_students_school_id;
DROP INDEX IF EXISTS public.idx_mock_exam_students_student_id;
DROP INDEX IF EXISTS public.idx_mock_exam_teachers_branch_id;
DROP INDEX IF EXISTS public.idx_mock_exam_teachers_school_id;
DROP INDEX IF EXISTS public.idx_mock_exam_venues_branch_id;
DROP INDEX IF EXISTS public.idx_mock_exam_responses_marker_id;
DROP INDEX IF EXISTS public.idx_mock_exam_responses_mock_exam_id;
DROP INDEX IF EXISTS public.idx_mock_exam_responses_student_id;
DROP INDEX IF EXISTS public.idx_mock_exam_responses_sub_question_id;

-- Questions
DROP INDEX IF EXISTS public.idx_sub_questions_parent_id;
DROP INDEX IF EXISTS public.idx_sub_questions_confirmed_by;
DROP INDEX IF EXISTS public.idx_answer_components_question_id;
DROP INDEX IF EXISTS public.idx_answer_components_sub_question_id;
DROP INDEX IF EXISTS public.idx_question_correct_answers_question_id;
DROP INDEX IF EXISTS public.idx_answer_requirements_sub_question_id;
DROP INDEX IF EXISTS public.idx_question_topics_question_id;
DROP INDEX IF EXISTS public.idx_question_topics_sub_question_id;
DROP INDEX IF EXISTS public.idx_question_topics_topic_id;
DROP INDEX IF EXISTS public.idx_question_subtopics_sub_question_id;
DROP INDEX IF EXISTS public.idx_question_options_sub_question_id;
DROP INDEX IF EXISTS public.idx_question_correct_answers_sub_question_id;
DROP INDEX IF EXISTS public.idx_questions_hints_sub_question_id;
DROP INDEX IF EXISTS public.idx_question_distractors_sub_question_id;

-- Table templates
DROP INDEX IF EXISTS public.idx_table_templates_question_id;
DROP INDEX IF EXISTS public.idx_table_templates_sub_question_id;
DROP INDEX IF EXISTS public.idx_table_template_cells_template_id;

-- Papers setup
DROP INDEX IF EXISTS public.idx_papers_setup_data_structure_id;
DROP INDEX IF EXISTS public.idx_papers_setup_published_by;
DROP INDEX IF EXISTS public.idx_papers_setup_region_id;
DROP INDEX IF EXISTS public.idx_paper_status_history_paper_id;
DROP INDEX IF EXISTS public.idx_question_correct_answers_question_alternative;
DROP INDEX IF EXISTS public.idx_question_correct_answers_subquestion_alternative;

-- Import tracking
DROP INDEX IF EXISTS public.idx_past_paper_files_import_session_id;
DROP INDEX IF EXISTS public.idx_past_paper_files_uploaded_by;
DROP INDEX IF EXISTS public.idx_question_navigation_state_paper_id;
DROP INDEX IF EXISTS public.idx_question_review_progress_paper_id;
DROP INDEX IF EXISTS public.idx_question_review_progress_question_id;
DROP INDEX IF EXISTS public.idx_question_review_progress_sub_question_id;
DROP INDEX IF EXISTS public.idx_question_attachment_tracking_paper_id;
DROP INDEX IF EXISTS public.idx_question_attachment_tracking_question_id;
DROP INDEX IF EXISTS public.idx_question_attachment_tracking_sub_question_id;
DROP INDEX IF EXISTS public.idx_import_sessions_review_status;
DROP INDEX IF EXISTS public.idx_import_sessions_simulation;
DROP INDEX IF EXISTS public.idx_import_sessions_working_json;
DROP INDEX IF EXISTS public.idx_import_sessions_last_synced;
DROP INDEX IF EXISTS public.idx_import_sessions_user_review_status;
DROP INDEX IF EXISTS public.idx_table_templates_import_session;
DROP INDEX IF EXISTS public.idx_table_templates_import_review_identifier;

-- Practice module
DROP INDEX IF EXISTS public.idx_practice_sessions_practice_set_id;
DROP INDEX IF EXISTS public.idx_practice_sessions_student_id;
DROP INDEX IF EXISTS public.idx_practice_set_items_practice_set_id;
DROP INDEX IF EXISTS public.idx_practice_answers_item_id;
DROP INDEX IF EXISTS public.idx_practice_answers_question_id;
DROP INDEX IF EXISTS public.idx_practice_answers_session_id;
DROP INDEX IF EXISTS public.idx_practice_session_events_item_id;
DROP INDEX IF EXISTS public.idx_practice_session_events_session_id;
DROP INDEX IF EXISTS public.idx_practice_sets_subtopic_id;

-- Education catalogue
DROP INDEX IF EXISTS public.idx_edu_learning_objectives_subtopic_id;
DROP INDEX IF EXISTS public.idx_edu_specific_concepts_objective_id;

-- Data structures
DROP INDEX IF EXISTS public.idx_data_structures_program_id;
DROP INDEX IF EXISTS public.idx_data_structures_provider_id;
DROP INDEX IF EXISTS public.idx_data_structures_region_id;
DROP INDEX IF EXISTS public.idx_programs_provider_id;

-- Departments and associations
DROP INDEX IF EXISTS public.idx_department_branches_branch_id;
DROP INDEX IF EXISTS public.idx_department_schools_school_id;
DROP INDEX IF EXISTS public.idx_configuration_templates_company_id;

-- Teacher associations
DROP INDEX IF EXISTS public.idx_teacher_branches_branch_id;
DROP INDEX IF EXISTS public.idx_teacher_branches_teacher_id;
DROP INDEX IF EXISTS public.idx_teacher_departments_department_id;
DROP INDEX IF EXISTS public.idx_teacher_departments_teacher_id;
DROP INDEX IF EXISTS public.idx_teacher_grade_levels_grade_level_id;
DROP INDEX IF EXISTS public.idx_teacher_grade_levels_teacher_id;
DROP INDEX IF EXISTS public.idx_teacher_schools_school_id;
DROP INDEX IF EXISTS public.idx_teacher_schools_teacher_id;
DROP INDEX IF EXISTS public.idx_teacher_sections_grade_level_id;
DROP INDEX IF EXISTS public.idx_teacher_sections_section_id;
DROP INDEX IF EXISTS public.idx_teacher_sections_teacher_id;
DROP INDEX IF EXISTS public.idx_teacher_programs_program_id;
DROP INDEX IF EXISTS public.idx_teacher_programs_teacher_id;
DROP INDEX IF EXISTS public.idx_teacher_subjects_subject_id;
DROP INDEX IF EXISTS public.idx_teacher_subjects_teacher_id;

-- Student associations
DROP INDEX IF EXISTS public.idx_student_achievements_achievement_id;
DROP INDEX IF EXISTS public.idx_student_achievements_student_id;
DROP INDEX IF EXISTS public.idx_student_class_sections_academic_year_id;
DROP INDEX IF EXISTS public.idx_student_class_sections_class_section_id;
DROP INDEX IF EXISTS public.idx_student_class_sections_student_id;
DROP INDEX IF EXISTS public.idx_student_daily_challenges_challenge_id;
DROP INDEX IF EXISTS public.idx_student_daily_challenges_student_id;
DROP INDEX IF EXISTS public.idx_student_mock_performance_analytics_student_id;

-- Analytics
DROP INDEX IF EXISTS public.idx_analytics_facts_sub_question_id;
DROP INDEX IF EXISTS public.idx_context_performance_component_id;
DROP INDEX IF EXISTS public.idx_context_performance_sub_question_id;
DROP INDEX IF EXISTS public.idx_reports_cache_student_student_id;
DROP INDEX IF EXISTS public.idx_reports_cache_student_subject_id;
DROP INDEX IF EXISTS public.idx_reports_cache_student_topic_id;
DROP INDEX IF EXISTS public.idx_mock_exam_question_performance_sub_question_id;
DROP INDEX IF EXISTS public.idx_exam_answers_extended_graded_by;
DROP INDEX IF EXISTS public.idx_exam_answers_extended_sub_question_id;

-- Locations
DROP INDEX IF EXISTS public.idx_cities_country_id;
DROP INDEX IF EXISTS public.idx_countries_region_id;

-- Miscellaneous
DROP INDEX IF EXISTS public.idx_parent_students_parent_id;
DROP INDEX IF EXISTS public.idx_role_permissions_role_id;
DROP INDEX IF EXISTS public.idx_email_queue_company_id;
DROP INDEX IF EXISTS public.idx_smtp_configuration_company_id;
DROP INDEX IF EXISTS public.idx_entity_admin_audit_log_company_id;
DROP INDEX IF EXISTS public.idx_entity_positions_reports_to;
DROP INDEX IF EXISTS public.idx_branches_created_by;
DROP INDEX IF EXISTS public.idx_branches_updated_by;
DROP INDEX IF EXISTS public.idx_suspicious_activities_material_id;
DROP INDEX IF EXISTS public.idx_suspicious_activities_reviewed_by;
DROP INDEX IF EXISTS public.idx_suspicious_activities_user_id;
DROP INDEX IF EXISTS public.idx_question_correct_answers_answer_type;
DROP INDEX IF EXISTS public.idx_question_correct_answers_template_gin;
