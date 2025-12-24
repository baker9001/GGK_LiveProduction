/*
  # Add Missing Foreign Key Indexes for Performance

  1. Overview
    - Adds indexes for all unindexed foreign keys identified in security audit
    - Improves query performance for JOIN operations and foreign key constraint checks
    - Total of 14 new indexes across critical tables

  2. Tables Affected
    - admin_invitations (role_id)
    - admin_users (role_id)
    - branches_additional (updated_by)
    - companies_additional (updated_by)
    - entity_users (auth_user_id)
    - leaderboards_periodic (subject_id)
    - paper_status_history (changed_by)
    - papers_setup (last_status_change_by, qa_completed_by, qa_started_by)
    - question_navigation_state (user_id)
    - question_review_progress (reviewed_by)
    - schools_additional (updated_by)
    - users (auth_user_id)

  3. Performance Impact
    - Significant improvement for queries with JOINs on these foreign keys
    - Faster foreign key constraint validation
    - Better query planning by PostgreSQL optimizer

  4. Notes
    - All indexes use IF NOT EXISTS to prevent errors if they already exist
    - Standard B-tree indexes for foreign key columns
*/

-- admin_invitations
CREATE INDEX IF NOT EXISTS idx_admin_invitations_role_id
ON public.admin_invitations(role_id);

-- admin_users
CREATE INDEX IF NOT EXISTS idx_admin_users_role_id
ON public.admin_users(role_id);

-- branches_additional
CREATE INDEX IF NOT EXISTS idx_branches_additional_updated_by
ON public.branches_additional(updated_by);

-- companies_additional
CREATE INDEX IF NOT EXISTS idx_companies_additional_updated_by
ON public.companies_additional(updated_by);

-- entity_users
CREATE INDEX IF NOT EXISTS idx_entity_users_auth_user_id
ON public.entity_users(auth_user_id);

-- leaderboards_periodic
CREATE INDEX IF NOT EXISTS idx_leaderboards_periodic_subject_id
ON public.leaderboards_periodic(subject_id);

-- paper_status_history
CREATE INDEX IF NOT EXISTS idx_paper_status_history_changed_by
ON public.paper_status_history(changed_by);

-- papers_setup (3 foreign keys)
CREATE INDEX IF NOT EXISTS idx_papers_setup_last_status_change_by
ON public.papers_setup(last_status_change_by);

CREATE INDEX IF NOT EXISTS idx_papers_setup_qa_completed_by
ON public.papers_setup(qa_completed_by);

CREATE INDEX IF NOT EXISTS idx_papers_setup_qa_started_by
ON public.papers_setup(qa_started_by);

-- question_navigation_state
CREATE INDEX IF NOT EXISTS idx_question_navigation_state_user_id
ON public.question_navigation_state(user_id);

-- question_review_progress
CREATE INDEX IF NOT EXISTS idx_question_review_progress_reviewed_by
ON public.question_review_progress(reviewed_by);

-- schools_additional
CREATE INDEX IF NOT EXISTS idx_schools_additional_updated_by
ON public.schools_additional(updated_by);

-- users
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id
ON public.users(auth_user_id);
