/*
  # Add Missing Foreign Key Indexes (Part 1)

  ## Overview
  Adds indexes for unindexed foreign keys to improve query performance.
  Foreign key columns without indexes can cause significant performance degradation
  when querying or performing joins on these tables.

  ## Performance Impact
  - Dramatically improves JOIN performance
  - Speeds up foreign key constraint checks on INSERT/UPDATE/DELETE
  - Reduces table scan overhead for relationship queries

  ## Tables Updated (First 50 of ~85 unindexed foreign keys)
  - admin_invitations (role_id)
  - ai_study_plans (approved_by)
  - analytics_facts (data_structure_id, paper_id, question_id, sub_question_id, subject_id, subtopic_id, topic_id, unit_id)
  - answer_analytics (question_id)
  - branches (created_by, updated_by)
  - branches_additional (updated_by)
  - companies (country_id, region_id)
  - companies_additional (updated_by)
  - configuration_templates (company_id)
  - context_difficulty_metrics (topic_id, unit_id)
  - context_mastery_cache (subtopic_id, topic_id, unit_id)
  - context_performance (component_id, paper_id, question_id, sub_question_id)
  - edu_learning_objectives (subtopic_id)
  - edu_specific_concepts (objective_id)
  - edu_subtopics (topic_id)
  - edu_topics (unit_id)
  - edu_units (subject_id)
  - email_queue (company_id)
  - entity_positions (reports_to_position_id)
  - exam_answers_extended (graded_by, sub_question_id)
  - license_actions (license_id)
  - materials (created_by, data_structure_id, subtopic_id, topic_id, unit_id)
  - paper_status_history (changed_by)
  - papers_setup (data_structure_id, import_session_id, last_status_change_by, qa_completed_by, qa_started_by)
  - past_paper_files (import_session_id, uploaded_by)

  ## Index Naming Convention
  idx_[table]_[column]_fk
*/

-- ============================================================================
-- ADMIN & USER MANAGEMENT
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_admin_invitations_role_id_fk ON admin_invitations(role_id);

-- ============================================================================
-- AI & STUDY PLANS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ai_study_plans_approved_by_fk ON ai_study_plans(approved_by);

-- ============================================================================
-- ANALYTICS & PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_analytics_facts_data_structure_id_fk ON analytics_facts(data_structure_id);
CREATE INDEX IF NOT EXISTS idx_analytics_facts_paper_id_fk ON analytics_facts(paper_id);
CREATE INDEX IF NOT EXISTS idx_analytics_facts_question_id_fk ON analytics_facts(question_id);
CREATE INDEX IF NOT EXISTS idx_analytics_facts_sub_question_id_fk ON analytics_facts(sub_question_id);
CREATE INDEX IF NOT EXISTS idx_analytics_facts_subject_id_fk ON analytics_facts(subject_id);
CREATE INDEX IF NOT EXISTS idx_analytics_facts_subtopic_id_fk ON analytics_facts(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_analytics_facts_topic_id_fk ON analytics_facts(topic_id);
CREATE INDEX IF NOT EXISTS idx_analytics_facts_unit_id_fk ON analytics_facts(unit_id);

CREATE INDEX IF NOT EXISTS idx_answer_analytics_question_id_fk ON answer_analytics(question_id);

CREATE INDEX IF NOT EXISTS idx_context_difficulty_metrics_topic_id_fk ON context_difficulty_metrics(topic_id);
CREATE INDEX IF NOT EXISTS idx_context_difficulty_metrics_unit_id_fk ON context_difficulty_metrics(unit_id);

CREATE INDEX IF NOT EXISTS idx_context_mastery_cache_subtopic_id_fk ON context_mastery_cache(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_context_mastery_cache_topic_id_fk ON context_mastery_cache(topic_id);
CREATE INDEX IF NOT EXISTS idx_context_mastery_cache_unit_id_fk ON context_mastery_cache(unit_id);

CREATE INDEX IF NOT EXISTS idx_context_performance_component_id_fk ON context_performance(component_id);
CREATE INDEX IF NOT EXISTS idx_context_performance_paper_id_fk ON context_performance(paper_id);
CREATE INDEX IF NOT EXISTS idx_context_performance_question_id_fk ON context_performance(question_id);
CREATE INDEX IF NOT EXISTS idx_context_performance_sub_question_id_fk ON context_performance(sub_question_id);

-- ============================================================================
-- ENTITY MANAGEMENT
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_branches_created_by_fk ON branches(created_by);
CREATE INDEX IF NOT EXISTS idx_branches_updated_by_fk ON branches(updated_by);
CREATE INDEX IF NOT EXISTS idx_branches_additional_updated_by_fk ON branches_additional(updated_by);

CREATE INDEX IF NOT EXISTS idx_companies_country_id_fk ON companies(country_id);
CREATE INDEX IF NOT EXISTS idx_companies_region_id_fk ON companies(region_id);
CREATE INDEX IF NOT EXISTS idx_companies_additional_updated_by_fk ON companies_additional(updated_by);

CREATE INDEX IF NOT EXISTS idx_configuration_templates_company_id_fk ON configuration_templates(company_id);

CREATE INDEX IF NOT EXISTS idx_entity_positions_reports_to_position_id_fk ON entity_positions(reports_to_position_id);

-- ============================================================================
-- EDUCATION CATALOGUE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_edu_learning_objectives_subtopic_id_fk ON edu_learning_objectives(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_edu_specific_concepts_objective_id_fk ON edu_specific_concepts(objective_id);
CREATE INDEX IF NOT EXISTS idx_edu_subtopics_topic_id_fk ON edu_subtopics(topic_id);
CREATE INDEX IF NOT EXISTS idx_edu_topics_unit_id_fk ON edu_topics(unit_id);
CREATE INDEX IF NOT EXISTS idx_edu_units_subject_id_fk ON edu_units(subject_id);

-- ============================================================================
-- COMMUNICATION & NOTIFICATIONS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_email_queue_company_id_fk ON email_queue(company_id);

-- ============================================================================
-- EXAM & ASSESSMENT
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_exam_answers_extended_graded_by_fk ON exam_answers_extended(graded_by);
CREATE INDEX IF NOT EXISTS idx_exam_answers_extended_sub_question_id_fk ON exam_answers_extended(sub_question_id);

-- ============================================================================
-- LICENSING
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_license_actions_license_id_fk ON license_actions(license_id);

-- ============================================================================
-- MATERIALS & CONTENT
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_materials_created_by_fk ON materials(created_by);
CREATE INDEX IF NOT EXISTS idx_materials_data_structure_id_fk ON materials(data_structure_id);
CREATE INDEX IF NOT EXISTS idx_materials_subtopic_id_fk ON materials(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_materials_topic_id_fk ON materials(topic_id);
CREATE INDEX IF NOT EXISTS idx_materials_unit_id_fk ON materials(unit_id);

-- ============================================================================
-- PAPERS & QUESTIONS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_paper_status_history_changed_by_fk ON paper_status_history(changed_by);

CREATE INDEX IF NOT EXISTS idx_papers_setup_data_structure_id_fk ON papers_setup(data_structure_id);
CREATE INDEX IF NOT EXISTS idx_papers_setup_import_session_id_fk ON papers_setup(import_session_id);
CREATE INDEX IF NOT EXISTS idx_papers_setup_last_status_change_by_fk ON papers_setup(last_status_change_by);
CREATE INDEX IF NOT EXISTS idx_papers_setup_qa_completed_by_fk ON papers_setup(qa_completed_by);
CREATE INDEX IF NOT EXISTS idx_papers_setup_qa_started_by_fk ON papers_setup(qa_started_by);

CREATE INDEX IF NOT EXISTS idx_past_paper_files_import_session_id_fk ON past_paper_files(import_session_id);
CREATE INDEX IF NOT EXISTS idx_past_paper_files_uploaded_by_fk ON past_paper_files(uploaded_by);
