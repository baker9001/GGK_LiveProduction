/*
  # Remove Unused Indexes
  
  This migration removes indexes that have been identified as unused,
  which saves storage space and improves write performance.

  ## Unused Indexes Being Removed:
  - idx_branches_additional_updated_by (branches_additional)
  - idx_companies_additional_updated_by (companies_additional)
  - idx_entity_users_auth_user_id (entity_users)
  - idx_leaderboards_periodic_subject_id (leaderboards_periodic)
  - idx_materials_created_by (materials)
  - idx_paper_status_history_changed_by (paper_status_history)
  - idx_papers_setup_last_status_change_by (papers_setup)
  - idx_papers_setup_qa_completed_by (papers_setup)
  - idx_admin_invitations_role_id (admin_invitations)
  - idx_admin_users_role_id (admin_users)
  - idx_papers_setup_qa_started_by (papers_setup)
  - idx_question_navigation_state_user_id (question_navigation_state)
  - idx_question_review_progress_reviewed_by (question_review_progress)
  - idx_schools_additional_updated_by (schools_additional)
  - idx_users_auth_user_id (users)

  ## Security:
  - No RLS changes
  - Removing unused indexes improves write performance
*/

-- Remove unused indexes (using IF EXISTS to handle cases where they may not exist)

DROP INDEX IF EXISTS public.idx_branches_additional_updated_by;
DROP INDEX IF EXISTS public.idx_companies_additional_updated_by;
DROP INDEX IF EXISTS public.idx_entity_users_auth_user_id;
DROP INDEX IF EXISTS public.idx_leaderboards_periodic_subject_id;
DROP INDEX IF EXISTS public.idx_materials_created_by;
DROP INDEX IF EXISTS public.idx_paper_status_history_changed_by;
DROP INDEX IF EXISTS public.idx_papers_setup_last_status_change_by;
DROP INDEX IF EXISTS public.idx_papers_setup_qa_completed_by;
DROP INDEX IF EXISTS public.idx_admin_invitations_role_id;
DROP INDEX IF EXISTS public.idx_admin_users_role_id;
DROP INDEX IF EXISTS public.idx_papers_setup_qa_started_by;
DROP INDEX IF EXISTS public.idx_question_navigation_state_user_id;
DROP INDEX IF EXISTS public.idx_question_review_progress_reviewed_by;
DROP INDEX IF EXISTS public.idx_schools_additional_updated_by;
DROP INDEX IF EXISTS public.idx_users_auth_user_id;
