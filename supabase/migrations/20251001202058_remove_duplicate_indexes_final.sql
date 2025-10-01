/*
  # Remove Duplicate Indexes (Final)

  ## Overview
  Removes duplicate indexes and constraints that waste storage space.
  Handles constraint-backed indexes by dropping the constraints instead.

  ## Performance Impact
  - Reduces storage overhead
  - Improves INSERT/UPDATE/DELETE performance
  - Maintains query performance and data integrity
*/

-- ============================================================================
-- DROP NON-CONSTRAINT DUPLICATE INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_academic_years_school;
DROP INDEX IF EXISTS idx_branches_additional_branch;
DROP INDEX IF EXISTS idx_companies_additional_company;
DROP INDEX IF EXISTS idx_departments_type;
DROP INDEX IF EXISTS idx_audit_actor_id;
DROP INDEX IF EXISTS idx_audit_company_id;
DROP INDEX IF EXISTS idx_question_correct_answers_question;
DROP INDEX IF EXISTS idx_question_correct_answers_sub_question;
DROP INDEX IF EXISTS idx_question_distractors_question;
DROP INDEX IF EXISTS idx_question_distractors_sub_question;
DROP INDEX IF EXISTS idx_schools_additional_school;

-- ============================================================================
-- REMOVE DUPLICATE UNIQUE CONSTRAINTS (keeping the better-named ones)
-- ============================================================================

-- entity_users: Keep entity_users_user_id_unique, remove entity_users_user_id_key
ALTER TABLE entity_users DROP CONSTRAINT IF EXISTS entity_users_user_id_key;

-- teachers: Keep teachers_user_id_unique, remove teachers_user_id_key
ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_user_id_key;

-- questions_master_admin: Keep unique_paper_question_number, remove unique_paper_question
ALTER TABLE questions_master_admin DROP CONSTRAINT IF EXISTS unique_paper_question;
