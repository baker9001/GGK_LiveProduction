/*
  # Add Remaining Missing Foreign Key Indexes

  This migration adds indexes for the 7 unindexed foreign keys identified in the security audit.
  
  ## Performance Impact
  - Improves JOIN performance on foreign key columns
  - Speeds up CASCADE operations
  - Reduces query planning time for referential integrity checks
  
  ## Indexes Added
  1. leaderboards_periodic.subject_id
  2. practice_session_events.item_id
  3. practice_sets.subtopic_id
  4. question_navigation_state.paper_id
  5. question_review_progress.reviewed_by
  6. reports_cache_student.subject_id
  7. reports_cache_student.topic_id
*/

-- Add missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_leaderboards_periodic_subject_id 
  ON leaderboards_periodic(subject_id);

CREATE INDEX IF NOT EXISTS idx_practice_session_events_item_id 
  ON practice_session_events(item_id);

CREATE INDEX IF NOT EXISTS idx_practice_sets_subtopic_id 
  ON practice_sets(subtopic_id);

CREATE INDEX IF NOT EXISTS idx_question_navigation_state_paper_id 
  ON question_navigation_state(paper_id);

CREATE INDEX IF NOT EXISTS idx_question_review_progress_reviewed_by 
  ON question_review_progress(reviewed_by);

CREATE INDEX IF NOT EXISTS idx_reports_cache_student_subject_id 
  ON reports_cache_student(subject_id);

CREATE INDEX IF NOT EXISTS idx_reports_cache_student_topic_id 
  ON reports_cache_student(topic_id);
