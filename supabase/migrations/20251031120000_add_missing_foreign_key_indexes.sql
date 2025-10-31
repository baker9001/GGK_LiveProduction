/*
  # Add Missing Foreign Key Indexes for Performance

  1. Performance Improvements
    - Add indexes for unindexed foreign keys identified in security audit
    - Improves query performance for JOIN operations
    - Reduces table scan overhead

  2. Indexes Added
    - leaderboards_periodic: subject_id
    - practice_session_events: item_id
    - practice_sets: subtopic_id
    - reports_cache_student: subject_id, topic_id

  3. Notes
    - All indexes use IF NOT EXISTS for safe re-runs
    - Indexes named consistently: idx_{table}_{column}_fkey
*/

-- Add index for leaderboards_periodic.subject_id foreign key
CREATE INDEX IF NOT EXISTS idx_leaderboards_periodic_subject_id_fkey
ON public.leaderboards_periodic(subject_id);

-- Add index for practice_session_events.item_id foreign key
CREATE INDEX IF NOT EXISTS idx_practice_session_events_item_id_fkey
ON public.practice_session_events(item_id);

-- Add index for practice_sets.subtopic_id foreign key
CREATE INDEX IF NOT EXISTS idx_practice_sets_subtopic_id_fkey
ON public.practice_sets(subtopic_id);

-- Add index for reports_cache_student.subject_id foreign key
CREATE INDEX IF NOT EXISTS idx_reports_cache_student_subject_id_fkey
ON public.reports_cache_student(subject_id);

-- Add index for reports_cache_student.topic_id foreign key
CREATE INDEX IF NOT EXISTS idx_reports_cache_student_topic_id_fkey
ON public.reports_cache_student(topic_id);
