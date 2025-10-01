/*
  # Add Missing Foreign Key Indexes (Part 2)

  ## Overview
  Continues adding indexes for remaining unindexed foreign keys.

  ## Tables Updated (Remaining ~35 unindexed foreign keys)
  - past_paper_import_sessions (activated_by, subject_id, uploader_id)
  - programs (provider_id)
  - question_confirmations (performed_by)
  - question_options (question_id, sub_question_id)
  - questions_attachments (question_id, sub_question_id)
  - questions_hints (question_id, sub_question_id)
  - questions_master_admin (confirmed_by, data_structure_id, qa_reviewed_by)
  - schools_additional (updated_by)
  - sub_questions (confirmed_by, subtopic_id)
  - teacher_sections (grade_level_id)

  ## Index Naming Convention
  idx_[table]_[column]_fk
*/

-- ============================================================================
-- IMPORT SESSIONS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_past_paper_import_sessions_activated_by_fk ON past_paper_import_sessions(activated_by);
CREATE INDEX IF NOT EXISTS idx_past_paper_import_sessions_subject_id_fk ON past_paper_import_sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_past_paper_import_sessions_uploader_id_fk ON past_paper_import_sessions(uploader_id);

-- ============================================================================
-- EDUCATION PROGRAMS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_programs_provider_id_fk ON programs(provider_id);

-- ============================================================================
-- QUESTION MANAGEMENT
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_question_confirmations_performed_by_fk ON question_confirmations(performed_by);

CREATE INDEX IF NOT EXISTS idx_question_options_question_id_fk ON question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_question_options_sub_question_id_fk ON question_options(sub_question_id);

CREATE INDEX IF NOT EXISTS idx_questions_attachments_question_id_fk ON questions_attachments(question_id);
CREATE INDEX IF NOT EXISTS idx_questions_attachments_sub_question_id_fk ON questions_attachments(sub_question_id);

CREATE INDEX IF NOT EXISTS idx_questions_hints_question_id_fk ON questions_hints(question_id);
CREATE INDEX IF NOT EXISTS idx_questions_hints_sub_question_id_fk ON questions_hints(sub_question_id);

CREATE INDEX IF NOT EXISTS idx_questions_master_admin_confirmed_by_fk ON questions_master_admin(confirmed_by);
CREATE INDEX IF NOT EXISTS idx_questions_master_admin_data_structure_id_fk ON questions_master_admin(data_structure_id);
CREATE INDEX IF NOT EXISTS idx_questions_master_admin_qa_reviewed_by_fk ON questions_master_admin(qa_reviewed_by);

CREATE INDEX IF NOT EXISTS idx_sub_questions_confirmed_by_fk ON sub_questions(confirmed_by);
CREATE INDEX IF NOT EXISTS idx_sub_questions_subtopic_id_fk ON sub_questions(subtopic_id);

-- ============================================================================
-- ENTITY ADDITIONAL INFO
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_schools_additional_updated_by_fk ON schools_additional(updated_by);

-- ============================================================================
-- TEACHER ASSIGNMENTS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_teacher_sections_grade_level_id_fk ON teacher_sections(grade_level_id);
