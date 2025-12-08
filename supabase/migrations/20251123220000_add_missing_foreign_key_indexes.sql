/*
  # Add Missing Foreign Key Indexes

  1. Performance Improvements
    - Add indexes for unindexed foreign keys
    - Improves query performance for joins and lookups
  
  2. Tables Affected
    - leaderboards_periodic (subject_id)
    - practice_session_events (item_id)
    - practice_sets (subtopic_id)
    - question_navigation_state (paper_id)
    - question_review_progress (reviewed_by)
    - reports_cache_student (subject_id, topic_id)
*/

-- Add index for leaderboards_periodic.subject_id
CREATE INDEX IF NOT EXISTS idx_leaderboards_periodic_subject_id 
ON leaderboards_periodic(subject_id);

-- Add index for practice_session_events.item_id
CREATE INDEX IF NOT EXISTS idx_practice_session_events_item_id 
ON practice_session_events(item_id);

-- Add index for practice_sets.subtopic_id
CREATE INDEX IF NOT EXISTS idx_practice_sets_subtopic_id 
ON practice_sets(subtopic_id);

-- Add index for question_navigation_state.paper_id
CREATE INDEX IF NOT EXISTS idx_question_navigation_state_paper_id 
ON question_navigation_state(paper_id);

-- Add index for question_review_progress.reviewed_by
CREATE INDEX IF NOT EXISTS idx_question_review_progress_reviewed_by 
ON question_review_progress(reviewed_by);

-- Add indexes for reports_cache_student
CREATE INDEX IF NOT EXISTS idx_reports_cache_student_subject_id 
ON reports_cache_student(subject_id);

CREATE INDEX IF NOT EXISTS idx_reports_cache_student_topic_id 
ON reports_cache_student(topic_id);
