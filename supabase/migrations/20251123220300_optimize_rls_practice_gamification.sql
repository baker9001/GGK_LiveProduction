/*
  # Optimize RLS Auth Calls - Practice & Gamification Tables

  1. Performance Optimization
    - Wrap auth.uid() calls in SELECT for practice tables
    - Optimize gamification and leaderboard policies
  
  2. Tables Optimized
    - practice_sets, practice_sessions, practice_answers
    - practice_session_events, student_gamification
    - leaderboards_periodic, reports_cache_student
    - student_game_stats, student_achievements, student_daily_challenges
*/

-- Practice Sets
DROP POLICY IF EXISTS "practice_sets_manage_creators" ON practice_sets;
CREATE POLICY "practice_sets_manage_creators"
  ON practice_sets FOR ALL
  TO authenticated
  USING (created_by = (SELECT auth.uid()));

-- Practice Set Items
DROP POLICY IF EXISTS "practice_set_items_manage_creators" ON practice_set_items;
CREATE POLICY "practice_set_items_manage_creators"
  ON practice_set_items FOR ALL
  TO authenticated
  USING (
    set_id IN (
      SELECT id FROM practice_sets WHERE created_by = (SELECT auth.uid())
    )
  );

-- Practice Sessions
DROP POLICY IF EXISTS "practice_sessions_insert_own" ON practice_sessions;
CREATE POLICY "practice_sessions_insert_own"
  ON practice_sessions FOR INSERT
  TO authenticated
  WITH CHECK (student_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "practice_sessions_select_own" ON practice_sessions;
CREATE POLICY "practice_sessions_select_own"
  ON practice_sessions FOR SELECT
  TO authenticated
  USING (student_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "practice_sessions_update_own" ON practice_sessions;
CREATE POLICY "practice_sessions_update_own"
  ON practice_sessions FOR UPDATE
  TO authenticated
  USING (student_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "practice_sessions_delete_admin" ON practice_sessions;
CREATE POLICY "practice_sessions_delete_admin"
  ON practice_sessions FOR DELETE
  TO authenticated
  USING (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

-- Practice Answers
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

-- Practice Session Events
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

-- Student Gamification
DROP POLICY IF EXISTS "student_gamification_insert_own" ON student_gamification;
CREATE POLICY "student_gamification_insert_own"
  ON student_gamification FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT id FROM students WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "student_gamification_select_own" ON student_gamification;
CREATE POLICY "student_gamification_select_own"
  ON student_gamification FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "student_gamification_update_own" ON student_gamification;
CREATE POLICY "student_gamification_update_own"
  ON student_gamification FOR UPDATE
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE auth_user_id = (SELECT auth.uid())
    )
  );

-- Leaderboards Periodic
DROP POLICY IF EXISTS "leaderboards_periodic_manage" ON leaderboards_periodic;
CREATE POLICY "leaderboards_periodic_manage"
  ON leaderboards_periodic FOR ALL
  TO authenticated
  USING (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

-- Reports Cache Student
DROP POLICY IF EXISTS "reports_cache_student_manage" ON reports_cache_student;
CREATE POLICY "reports_cache_student_manage"
  ON reports_cache_student FOR ALL
  TO authenticated
  USING (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

DROP POLICY IF EXISTS "reports_cache_student_select" ON reports_cache_student;
CREATE POLICY "reports_cache_student_select"
  ON reports_cache_student FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE auth_user_id = (SELECT auth.uid())
    )
  );

-- Student Game Stats
DROP POLICY IF EXISTS "Students manage own game stats" ON student_game_stats;
CREATE POLICY "Students manage own game stats"
  ON student_game_stats FOR ALL
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Students view own game stats" ON student_game_stats;
CREATE POLICY "Students view own game stats"
  ON student_game_stats FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Entity admins view game stats in company" ON student_game_stats;
CREATE POLICY "Entity admins view game stats in company"
  ON student_game_stats FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE eu.user_id = (SELECT auth.uid())
      AND eu.is_company_admin = true
    )
  );

DROP POLICY IF EXISTS "System admins full access to game stats" ON student_game_stats;
CREATE POLICY "System admins full access to game stats"
  ON student_game_stats FOR ALL
  TO authenticated
  USING (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

-- Student Achievements
DROP POLICY IF EXISTS "Students view own achievements" ON student_achievements;
CREATE POLICY "Students view own achievements"
  ON student_achievements FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Students can earn achievements" ON student_achievements;
CREATE POLICY "Students can earn achievements"
  ON student_achievements FOR INSERT
  TO authenticated
  WITH CHECK (
    student_id IN (
      SELECT id FROM students WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Entity admins view achievements in company" ON student_achievements;
CREATE POLICY "Entity admins view achievements in company"
  ON student_achievements FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE eu.user_id = (SELECT auth.uid())
      AND eu.is_company_admin = true
    )
  );

DROP POLICY IF EXISTS "System admins full access to achievements" ON student_achievements;
CREATE POLICY "System admins full access to achievements"
  ON student_achievements FOR ALL
  TO authenticated
  USING (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

-- Student Daily Challenges
DROP POLICY IF EXISTS "Students view own challenges" ON student_daily_challenges;
CREATE POLICY "Students view own challenges"
  ON student_daily_challenges FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Students manage own challenges" ON student_daily_challenges;
CREATE POLICY "Students manage own challenges"
  ON student_daily_challenges FOR ALL
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Entity admins view challenges in company" ON student_daily_challenges;
CREATE POLICY "Entity admins view challenges in company"
  ON student_daily_challenges FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE eu.user_id = (SELECT auth.uid())
      AND eu.is_company_admin = true
    )
  );

DROP POLICY IF EXISTS "System admins full access to challenges" ON student_daily_challenges;
CREATE POLICY "System admins full access to challenges"
  ON student_daily_challenges FOR ALL
  TO authenticated
  USING (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );
