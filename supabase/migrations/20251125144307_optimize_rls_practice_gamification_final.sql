/*
  # Optimize RLS Auth Calls - Practice & Gamification Final

  1. Performance Optimization
    - Wrap remaining auth calls in SELECT for practice/gamification tables
    - Prevents re-evaluation for each row

  2. Tables Optimized
    - practice_sets, practice_set_items
    - practice_sessions, practice_answers
    - practice_session_events, student_gamification
    - leaderboards_periodic, reports_cache_student
*/

-- Practice Sets: Optimize creator check
DROP POLICY IF EXISTS "practice_sets_manage_creators" ON practice_sets;
CREATE POLICY "practice_sets_manage_creators"
  ON practice_sets FOR ALL
  TO authenticated
  USING (
    created_by = (SELECT auth.uid())
  );

-- Practice Set Items: Optimize creator check
DROP POLICY IF EXISTS "practice_set_items_manage_creators" ON practice_set_items;
CREATE POLICY "practice_set_items_manage_creators"
  ON practice_set_items FOR ALL
  TO authenticated
  USING (
    practice_set_id IN (
      SELECT id FROM practice_sets WHERE created_by = (SELECT auth.uid())
    )
  );

-- Practice Sessions: Optimize all policies
DROP POLICY IF EXISTS "practice_sessions_insert_own" ON practice_sessions;
CREATE POLICY "practice_sessions_insert_own"
  ON practice_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "practice_sessions_select_own" ON practice_sessions;
CREATE POLICY "practice_sessions_select_own"
  ON practice_sessions FOR SELECT
  TO authenticated
  USING (
    student_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "practice_sessions_update_own" ON practice_sessions;
CREATE POLICY "practice_sessions_update_own"
  ON practice_sessions FOR UPDATE
  TO authenticated
  USING (
    student_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "practice_sessions_delete_admin" ON practice_sessions;
CREATE POLICY "practice_sessions_delete_admin"
  ON practice_sessions FOR DELETE
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
  );

-- Practice Answers: Optimize policies
DROP POLICY IF EXISTS "practice_answers_mutate_own" ON practice_answers;
CREATE POLICY "practice_answers_mutate_own"
  ON practice_answers FOR ALL
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM practice_sessions WHERE student_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "practice_answers_select_own" ON practice_answers;
CREATE POLICY "practice_answers_select_own"
  ON practice_answers FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM practice_sessions WHERE student_id = (SELECT auth.uid())
    )
  );

-- Practice Session Events: Optimize policies
DROP POLICY IF EXISTS "practice_session_events_mutate_own" ON practice_session_events;
CREATE POLICY "practice_session_events_mutate_own"
  ON practice_session_events FOR ALL
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM practice_sessions WHERE student_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "practice_session_events_select_own" ON practice_session_events;
CREATE POLICY "practice_session_events_select_own"
  ON practice_session_events FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM practice_sessions WHERE student_id = (SELECT auth.uid())
    )
  );

-- Student Gamification: Optimize policies
DROP POLICY IF EXISTS "student_gamification_insert_own" ON student_gamification;
CREATE POLICY "student_gamification_insert_own"
  ON student_gamification FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "student_gamification_select_own" ON student_gamification;
CREATE POLICY "student_gamification_select_own"
  ON student_gamification FOR SELECT
  TO authenticated
  USING (
    student_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "student_gamification_update_own" ON student_gamification;
CREATE POLICY "student_gamification_update_own"
  ON student_gamification FOR UPDATE
  TO authenticated
  USING (
    student_id = (SELECT auth.uid())
  );

-- Leaderboards Periodic: Optimize policies
DROP POLICY IF EXISTS "leaderboards_periodic_manage" ON leaderboards_periodic;
CREATE POLICY "leaderboards_periodic_manage"
  ON leaderboards_periodic FOR ALL
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
  );

-- Reports Cache Student: Optimize policies
DROP POLICY IF EXISTS "reports_cache_student_manage" ON reports_cache_student;
CREATE POLICY "reports_cache_student_manage"
  ON reports_cache_student FOR ALL
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
  );

DROP POLICY IF EXISTS "reports_cache_student_select" ON reports_cache_student;
CREATE POLICY "reports_cache_student_select"
  ON reports_cache_student FOR SELECT
  TO authenticated
  USING (
    student_id = (SELECT auth.uid())
  );