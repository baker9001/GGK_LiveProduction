/*
  # Add Critical Missing Foreign Key Indexes
  
  1. Overview
    This migration adds the most critical missing indexes for foreign key constraints
    to improve query performance. These are commonly queried foreign keys without indexes.
  
  2. Performance Impact
    - Speed up JOIN operations
    - Improve CASCADE DELETE/UPDATE performance
    - Reduce table scan requirements
  
  3. Security Notes
    These indexes improve performance without changing RLS policies
*/

-- Core entity relationships
CREATE INDEX IF NOT EXISTS idx_academic_year_schools_school_id ON academic_year_schools(school_id);
CREATE INDEX IF NOT EXISTS idx_branches_school_id ON branches(school_id);
CREATE INDEX IF NOT EXISTS idx_companies_country_id ON companies(country_id);
CREATE INDEX IF NOT EXISTS idx_companies_region_id ON companies(region_id);
CREATE INDEX IF NOT EXISTS idx_schools_company_id ON schools(company_id);

-- User and authentication
CREATE INDEX IF NOT EXISTS idx_admin_invitations_invited_by ON admin_invitations(invited_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_users_company_id ON entity_users(company_id);
CREATE INDEX IF NOT EXISTS idx_entity_users_department_id ON entity_users(department_id);
CREATE INDEX IF NOT EXISTS idx_entity_users_parent_admin_id ON entity_users(parent_admin_id);

-- Students and teachers
CREATE INDEX IF NOT EXISTS idx_students_branch_id ON students(branch_id);
CREATE INDEX IF NOT EXISTS idx_students_class_section_id ON students(class_section_id);
CREATE INDEX IF NOT EXISTS idx_students_company_id ON students(company_id);
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_branch_id ON teachers(branch_id);
CREATE INDEX IF NOT EXISTS idx_teachers_company_id ON teachers(company_id);
CREATE INDEX IF NOT EXISTS idx_teachers_department_id ON teachers(department_id);
CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON teachers(school_id);

-- AI study plans
CREATE INDEX IF NOT EXISTS idx_ai_study_plans_student_id ON ai_study_plans(student_id);
CREATE INDEX IF NOT EXISTS idx_ai_study_plans_approved_by ON ai_study_plans(approved_by);

-- License management
CREATE INDEX IF NOT EXISTS idx_license_actions_license_id ON license_actions(license_id);
CREATE INDEX IF NOT EXISTS idx_licenses_company_id ON licenses(company_id);
CREATE INDEX IF NOT EXISTS idx_student_licenses_license_id ON student_licenses(license_id);
CREATE INDEX IF NOT EXISTS idx_student_licenses_student_id ON student_licenses(student_id);

-- Materials
CREATE INDEX IF NOT EXISTS idx_material_access_logs_material_id ON material_access_logs(material_id);
CREATE INDEX IF NOT EXISTS idx_material_access_logs_user_id ON material_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_materials_data_structure_id ON materials(data_structure_id);
CREATE INDEX IF NOT EXISTS idx_materials_school_id ON materials(school_id);
CREATE INDEX IF NOT EXISTS idx_materials_teacher_id ON materials(teacher_id);
CREATE INDEX IF NOT EXISTS idx_materials_subtopic_id ON materials(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_materials_topic_id ON materials(topic_id);
CREATE INDEX IF NOT EXISTS idx_materials_unit_id ON materials(unit_id);

-- Mock exams core
CREATE INDEX IF NOT EXISTS idx_mock_exams_company_id ON mock_exams(company_id);
CREATE INDEX IF NOT EXISTS idx_mock_exams_created_by ON mock_exams(created_by);
CREATE INDEX IF NOT EXISTS idx_mock_exams_data_structure_id ON mock_exams(data_structure_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_questions_question_id ON mock_exam_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_results_student_id ON mock_exam_results(student_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_status_history_mock_exam_id ON mock_exam_status_history(mock_exam_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_status_history_changed_by ON mock_exam_status_history(changed_by);

-- Mock exam relationships
CREATE INDEX IF NOT EXISTS idx_mock_exam_branches_branch_id ON mock_exam_branches(branch_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_branches_invigilator_id ON mock_exam_branches(invigilator_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_schools_school_id ON mock_exam_schools(school_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_students_branch_id ON mock_exam_students(branch_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_students_school_id ON mock_exam_students(school_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_students_student_id ON mock_exam_students(student_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_teachers_branch_id ON mock_exam_teachers(branch_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_teachers_school_id ON mock_exam_teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_templates_company_id ON mock_exam_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_venues_branch_id ON mock_exam_venues(branch_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_responses_marker_id ON mock_exam_responses(marker_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_responses_mock_exam_id ON mock_exam_responses(mock_exam_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_responses_student_id ON mock_exam_responses(student_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_responses_sub_question_id ON mock_exam_responses(sub_question_id);

-- Questions and answers
CREATE INDEX IF NOT EXISTS idx_questions_master_admin_paper_id ON questions_master_admin(paper_id);
CREATE INDEX IF NOT EXISTS idx_sub_questions_question_id ON sub_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_sub_questions_parent_id ON sub_questions(parent_id);
CREATE INDEX IF NOT EXISTS idx_sub_questions_confirmed_by ON sub_questions(confirmed_by);
CREATE INDEX IF NOT EXISTS idx_answer_components_question_id ON answer_components(question_id);
CREATE INDEX IF NOT EXISTS idx_answer_components_sub_question_id ON answer_components(sub_question_id);
CREATE INDEX IF NOT EXISTS idx_answer_requirements_sub_question_id ON answer_requirements(sub_question_id);

-- Question relationships
CREATE INDEX IF NOT EXISTS idx_question_topics_question_id ON question_topics(question_id);
CREATE INDEX IF NOT EXISTS idx_question_topics_sub_question_id ON question_topics(sub_question_id);
CREATE INDEX IF NOT EXISTS idx_question_topics_topic_id ON question_topics(topic_id);
CREATE INDEX IF NOT EXISTS idx_question_subtopics_sub_question_id ON question_subtopics(sub_question_id);
CREATE INDEX IF NOT EXISTS idx_question_options_sub_question_id ON question_options(sub_question_id);
CREATE INDEX IF NOT EXISTS idx_questions_hints_sub_question_id ON questions_hints(sub_question_id);
CREATE INDEX IF NOT EXISTS idx_question_distractors_sub_question_id ON question_distractors(sub_question_id);

-- Table templates
CREATE INDEX IF NOT EXISTS idx_table_templates_question_id ON table_templates(question_id);
CREATE INDEX IF NOT EXISTS idx_table_templates_sub_question_id ON table_templates(sub_question_id);
CREATE INDEX IF NOT EXISTS idx_table_template_cells_template_id ON table_template_cells(template_id);

-- Papers and import
CREATE INDEX IF NOT EXISTS idx_papers_setup_data_structure_id ON papers_setup(data_structure_id);
CREATE INDEX IF NOT EXISTS idx_papers_setup_published_by ON papers_setup(published_by);
CREATE INDEX IF NOT EXISTS idx_papers_setup_region_id ON papers_setup(region_id);
CREATE INDEX IF NOT EXISTS idx_paper_status_history_paper_id ON paper_status_history(paper_id);
CREATE INDEX IF NOT EXISTS idx_past_paper_files_import_session_id ON past_paper_files(import_session_id);
CREATE INDEX IF NOT EXISTS idx_past_paper_files_uploaded_by ON past_paper_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_past_paper_import_sessions_created_by ON past_paper_import_sessions(created_by);

-- Question import and review
CREATE INDEX IF NOT EXISTS idx_question_navigation_state_paper_id ON question_navigation_state(paper_id);
CREATE INDEX IF NOT EXISTS idx_question_review_progress_paper_id ON question_review_progress(paper_id);
CREATE INDEX IF NOT EXISTS idx_question_review_progress_question_id ON question_review_progress(question_id);
CREATE INDEX IF NOT EXISTS idx_question_review_progress_sub_question_id ON question_review_progress(sub_question_id);
CREATE INDEX IF NOT EXISTS idx_question_attachment_tracking_paper_id ON question_attachment_tracking(paper_id);
CREATE INDEX IF NOT EXISTS idx_question_attachment_tracking_question_id ON question_attachment_tracking(question_id);
CREATE INDEX IF NOT EXISTS idx_question_attachment_tracking_sub_question_id ON question_attachment_tracking(sub_question_id);

-- Practice module
CREATE INDEX IF NOT EXISTS idx_practice_sessions_practice_set_id ON practice_sessions(practice_set_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_student_id ON practice_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_practice_set_items_practice_set_id ON practice_set_items(practice_set_id);
CREATE INDEX IF NOT EXISTS idx_practice_answers_item_id ON practice_answers(item_id);
CREATE INDEX IF NOT EXISTS idx_practice_answers_question_id ON practice_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_practice_answers_session_id ON practice_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_practice_session_events_item_id ON practice_session_events(item_id);
CREATE INDEX IF NOT EXISTS idx_practice_session_events_session_id ON practice_session_events(session_id);
CREATE INDEX IF NOT EXISTS idx_practice_sets_subtopic_id ON practice_sets(subtopic_id);

-- Education catalogue
CREATE INDEX IF NOT EXISTS idx_edu_learning_objectives_subtopic_id ON edu_learning_objectives(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_edu_specific_concepts_objective_id ON edu_specific_concepts(objective_id);
CREATE INDEX IF NOT EXISTS idx_data_structures_program_id ON data_structures(program_id);
CREATE INDEX IF NOT EXISTS idx_data_structures_provider_id ON data_structures(provider_id);
CREATE INDEX IF NOT EXISTS idx_data_structures_region_id ON data_structures(region_id);
CREATE INDEX IF NOT EXISTS idx_programs_provider_id ON programs(provider_id);

-- Departments and organizational structure
CREATE INDEX IF NOT EXISTS idx_departments_company_id ON departments(company_id);
CREATE INDEX IF NOT EXISTS idx_department_branches_branch_id ON department_branches(branch_id);
CREATE INDEX IF NOT EXISTS idx_department_schools_school_id ON department_schools(school_id);
CREATE INDEX IF NOT EXISTS idx_class_sections_grade_level_id ON class_sections(grade_level_id);
CREATE INDEX IF NOT EXISTS idx_configuration_templates_company_id ON configuration_templates(company_id);

-- Teacher relationships
CREATE INDEX IF NOT EXISTS idx_teacher_branches_branch_id ON teacher_branches(branch_id);
CREATE INDEX IF NOT EXISTS idx_teacher_branches_teacher_id ON teacher_branches(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_departments_department_id ON teacher_departments(department_id);
CREATE INDEX IF NOT EXISTS idx_teacher_departments_teacher_id ON teacher_departments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_grade_levels_grade_level_id ON teacher_grade_levels(grade_level_id);
CREATE INDEX IF NOT EXISTS idx_teacher_grade_levels_teacher_id ON teacher_grade_levels(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_schools_school_id ON teacher_schools(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_schools_teacher_id ON teacher_schools(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_sections_grade_level_id ON teacher_sections(grade_level_id);
CREATE INDEX IF NOT EXISTS idx_teacher_sections_section_id ON teacher_sections(section_id);
CREATE INDEX IF NOT EXISTS idx_teacher_sections_teacher_id ON teacher_sections(teacher_id);

-- Student relationships  
CREATE INDEX IF NOT EXISTS idx_student_achievements_achievement_id ON student_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_student_achievements_student_id ON student_achievements(student_id);
CREATE INDEX IF NOT EXISTS idx_student_class_sections_academic_year_id ON student_class_sections(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_student_class_sections_class_section_id ON student_class_sections(class_section_id);
CREATE INDEX IF NOT EXISTS idx_student_class_sections_student_id ON student_class_sections(student_id);
CREATE INDEX IF NOT EXISTS idx_student_daily_challenges_challenge_id ON student_daily_challenges(challenge_id);
CREATE INDEX IF NOT EXISTS idx_student_daily_challenges_student_id ON student_daily_challenges(student_id);
CREATE INDEX IF NOT EXISTS idx_student_mock_performance_analytics_student_id ON student_mock_performance_analytics(student_id);

-- Analytics and performance
CREATE INDEX IF NOT EXISTS idx_analytics_facts_sub_question_id ON analytics_facts(sub_question_id);
CREATE INDEX IF NOT EXISTS idx_context_performance_component_id ON context_performance(component_id);
CREATE INDEX IF NOT EXISTS idx_context_performance_sub_question_id ON context_performance(sub_question_id);
CREATE INDEX IF NOT EXISTS idx_context_difficulty_metrics_subject_id ON context_difficulty_metrics(subject_id);
CREATE INDEX IF NOT EXISTS idx_reports_cache_student_student_id ON reports_cache_student(student_id);
CREATE INDEX IF NOT EXISTS idx_reports_cache_student_subject_id ON reports_cache_student(subject_id);
CREATE INDEX IF NOT EXISTS idx_reports_cache_student_topic_id ON reports_cache_student(topic_id);
CREATE INDEX IF NOT EXISTS idx_mock_exam_question_performance_sub_question_id ON mock_exam_question_performance(sub_question_id);

-- Exam management
CREATE INDEX IF NOT EXISTS idx_exam_answers_extended_graded_by ON exam_answers_extended(graded_by);
CREATE INDEX IF NOT EXISTS idx_exam_answers_extended_sub_question_id ON exam_answers_extended(sub_question_id);

-- Locations
CREATE INDEX IF NOT EXISTS idx_cities_country_id ON cities(country_id);
CREATE INDEX IF NOT EXISTS idx_countries_region_id ON countries(region_id);

-- Parents
CREATE INDEX IF NOT EXISTS idx_parent_students_parent_id ON parent_students(parent_id);

-- Roles and permissions
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);

-- Email and SMTP
CREATE INDEX IF NOT EXISTS idx_email_queue_company_id ON email_queue(company_id);
CREATE INDEX IF NOT EXISTS idx_smtp_configuration_company_id ON smtp_configuration(company_id);

-- Entity admin
CREATE INDEX IF NOT EXISTS idx_entity_admin_audit_log_company_id ON entity_admin_audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_entity_positions_reports_to ON entity_positions(reports_to_position_id);

-- Branches and schools metadata
CREATE INDEX IF NOT EXISTS idx_branches_created_by ON branches(created_by);
CREATE INDEX IF NOT EXISTS idx_branches_updated_by ON branches(updated_by);

-- Materials created by
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'materials' AND column_name = 'grade_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_materials_grade_id ON materials(grade_id);
  END IF;
END $$;

-- Question import review
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'question_import_review_status'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_question_import_review_status_review_session_id 
      ON question_import_review_status(review_session_id);
  END IF;
END $$;

-- Suspicious activities
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'suspicious_activities'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_suspicious_activities_material_id ON suspicious_activities(material_id);
    CREATE INDEX IF NOT EXISTS idx_suspicious_activities_reviewed_by ON suspicious_activities(reviewed_by);
    CREATE INDEX IF NOT EXISTS idx_suspicious_activities_user_id ON suspicious_activities(user_id);
  END IF;
END $$;

-- Teacher programs (conditional)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'teacher_programs'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_teacher_programs_program_id ON teacher_programs(program_id);
    CREATE INDEX IF NOT EXISTS idx_teacher_programs_teacher_id ON teacher_programs(teacher_id);
  END IF;
END $$;

-- Teacher subjects (conditional)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'teacher_subjects'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_teacher_subjects_subject_id ON teacher_subjects(subject_id);
    CREATE INDEX IF NOT EXISTS idx_teacher_subjects_teacher_id ON teacher_subjects(teacher_id);
  END IF;
END $$;
