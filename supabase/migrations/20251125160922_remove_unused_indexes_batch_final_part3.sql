/*
  # Remove Unused Indexes - Final Batch Part 3
  
  1. Changes
    - Remove remaining 120+ unused indexes from audit report
*/

DO $$
DECLARE
  idx_name text;
  idx_array text[] := ARRAY[
    'idx_email_queue_company_id_fk',
    'idx_exam_answers_extended_graded_by_fk',
    'idx_exam_answers_extended_sub_question_id_fk',
    'idx_license_actions_license_id_fk',
    'idx_materials_created_by_fk',
    'idx_materials_data_structure_id_fk',
    'idx_materials_subtopic_id_fk',
    'idx_materials_topic_id_fk',
    'idx_materials_unit_id_fk',
    'idx_paper_status_history_changed_by_fk',
    'idx_past_paper_files_import_session_id_fk',
    'idx_past_paper_files_uploaded_by_fk',
    'idx_programs_provider_id_fk',
    'idx_question_options_sub_question_id_fk',
    'idx_questions_hints_sub_question_id_fk',
    'idx_papers_setup_data_structure_id_fk',
    'idx_papers_setup_import_session_id_fk',
    'idx_schools_additional_updated_by_fk',
    'idx_teacher_sections_grade_level_id_fk',
    'idx_sub_questions_confirmed_by_fk',
    'idx_students_class_section_id',
    'idx_student_class_sections_student',
    'idx_student_class_sections_section',
    'idx_student_class_sections_active',
    'idx_mock_exam_status_history_date',
    'idx_mock_exam_stage_progress_exam_stage',
    'idx_practice_set_items_set',
    'idx_practice_set_items_order',
    'idx_practice_sessions_student',
    'idx_entity_user_branches_entity_user_branch',
    'idx_mock_exam_schools_exam_school',
    'idx_practice_sessions_set',
    'idx_practice_answers_session',
    'idx_practice_answers_item',
    'idx_practice_answers_correct_true',
    'idx_practice_session_events_session',
    'idx_student_gamification_activity',
    'idx_answer_components_subquestion_context',
    'idx_correct_answers_question',
    'idx_correct_answers_subquestion',
    'idx_questions_master_admin_is_confirmed',
    'idx_questions_import_session',
    'idx_table_templates_question_id',
    'idx_table_templates_sub_question_id',
    'idx_papers_setup_status',
    'idx_papers_setup_structure',
    'idx_papers_setup_last_status_change_by_fk',
    'idx_papers_setup_qa_completed_by_fk',
    'idx_papers_setup_qa_started_by_fk',
    'idx_papers_setup_qa_dates',
    'idx_table_template_cells_template_id',
    'idx_questions_subject_status',
    'idx_questions_provider_status',
    'idx_questions_difficulty',
    'idx_sub_questions_parent_level',
    'idx_papers_setup_data_structure',
    'idx_papers_setup_subject',
    'idx_papers_setup_qa_status',
    'idx_question_correct_answers_sub_question',
    'idx_question_options_sub_question',
    'idx_question_topics_question',
    'idx_question_subtopics_question_main',
    'idx_question_subtopics_sub_question',
    'idx_sub_questions_confirmation_status',
    'idx_questions_master_admin_figure_required',
    'idx_sub_questions_figure_required',
    'idx_questions_master_has_direct_answer',
    'idx_table_template_cells_position',
    'idx_sub_questions_has_direct_answer',
    'idx_questions_master_admin_is_container',
    'idx_questions_master_admin_has_direct_answer',
    'idx_sub_questions_is_container',
    'idx_invitation_status_sent_at',
    'idx_invitation_status_failed',
    'idx_leaderboards_periodic_subject_id',
    'idx_practice_session_events_item_id',
    'idx_practice_sets_subtopic_id',
    'idx_question_navigation_state_paper_id',
    'idx_question_review_progress_reviewed_by',
    'idx_reports_cache_student_subject_id',
    'idx_reports_cache_student_topic_id',
    'idx_question_navigation_state_user_paper',
    'idx_question_review_progress_paper',
    'idx_question_review_progress_question',
    'idx_question_review_progress_sub_question',
    'idx_question_attachment_tracking_paper',
    'idx_question_attachment_tracking_question',
    'idx_question_attachment_tracking_sub_question'
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