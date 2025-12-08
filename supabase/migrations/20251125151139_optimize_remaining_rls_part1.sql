/*
  # Optimize Remaining RLS Auth Calls - Part 1
  
  Optimizes RLS policies for gamification and student tables by wrapping
  auth.uid() in SELECT statements to prevent per-row re-evaluation.
*/

-- student_game_stats policies  
DROP POLICY IF EXISTS "Entity admins view game stats in company" ON student_game_stats;
CREATE POLICY "Entity admins view game stats in company"
  ON student_game_stats FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE eu.user_id = (SELECT auth.uid())
      AND eu.is_active = true
    )
  );

DROP POLICY IF EXISTS "Students manage own game stats" ON student_game_stats;
CREATE POLICY "Students manage own game stats"
  ON student_game_stats FOR ALL
  TO authenticated
  USING (student_id = (SELECT auth.uid()))
  WITH CHECK (student_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Students view own game stats" ON student_game_stats;
CREATE POLICY "Students view own game stats"
  ON student_game_stats FOR SELECT
  TO authenticated
  USING (student_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "System admins full access to game stats" ON student_game_stats;
CREATE POLICY "System admins full access to game stats"
  ON student_game_stats FOR ALL
  TO authenticated
  USING ((SELECT is_system_admin()) = true)
  WITH CHECK ((SELECT is_system_admin()) = true);

-- student_achievements policies
DROP POLICY IF EXISTS "Entity admins view achievements in company" ON student_achievements;
CREATE POLICY "Entity admins view achievements in company"
  ON student_achievements FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE eu.user_id = (SELECT auth.uid())
      AND eu.is_active = true
    )
  );

DROP POLICY IF EXISTS "Students can earn achievements" ON student_achievements;
CREATE POLICY "Students can earn achievements"
  ON student_achievements FOR INSERT
  TO authenticated
  WITH CHECK (student_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Students view own achievements" ON student_achievements;
CREATE POLICY "Students view own achievements"
  ON student_achievements FOR SELECT
  TO authenticated
  USING (student_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "System admins full access to achievements" ON student_achievements;
CREATE POLICY "System admins full access to achievements"
  ON student_achievements FOR ALL
  TO authenticated
  USING ((SELECT is_system_admin()) = true)
  WITH CHECK ((SELECT is_system_admin()) = true);

-- student_daily_challenges policies
DROP POLICY IF EXISTS "Entity admins view challenges in company" ON student_daily_challenges;
CREATE POLICY "Entity admins view challenges in company"
  ON student_daily_challenges FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE eu.user_id = (SELECT auth.uid())
      AND eu.is_active = true
    )
  );

DROP POLICY IF EXISTS "Students manage own challenges" ON student_daily_challenges;
CREATE POLICY "Students manage own challenges"
  ON student_daily_challenges FOR ALL
  TO authenticated
  USING (student_id = (SELECT auth.uid()))
  WITH CHECK (student_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Students view own challenges" ON student_daily_challenges;
CREATE POLICY "Students view own challenges"
  ON student_daily_challenges FOR SELECT
  TO authenticated
  USING (student_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "System admins full access to challenges" ON student_daily_challenges;
CREATE POLICY "System admins full access to challenges"
  ON student_daily_challenges FOR ALL
  TO authenticated
  USING ((SELECT is_system_admin()) = true)
  WITH CHECK ((SELECT is_system_admin()) = true);

-- past_paper_import_sessions policies
DROP POLICY IF EXISTS "Users can create import sessions" ON past_paper_import_sessions;
CREATE POLICY "Users can create import sessions"
  ON past_paper_import_sessions FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own import sessions" ON past_paper_import_sessions;
CREATE POLICY "Users can delete own import sessions"
  ON past_paper_import_sessions FOR DELETE
  TO authenticated
  USING (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own import sessions" ON past_paper_import_sessions;
CREATE POLICY "Users can update own import sessions"
  ON past_paper_import_sessions FOR UPDATE
  TO authenticated
  USING (created_by = (SELECT auth.uid()))
  WITH CHECK (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own import sessions" ON past_paper_import_sessions;
CREATE POLICY "Users can view own import sessions"
  ON past_paper_import_sessions FOR SELECT
  TO authenticated
  USING (created_by = (SELECT auth.uid()));

-- licenses policies
DROP POLICY IF EXISTS "Entity users view company licenses" ON licenses;
CREATE POLICY "Entity users view company licenses"
  ON licenses FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT eu.company_id
      FROM entity_users eu
      WHERE eu.user_id = (SELECT auth.uid())
      AND eu.is_active = true
    )
  );

DROP POLICY IF EXISTS "Students view company licenses" ON licenses;
CREATE POLICY "Students view company licenses"
  ON licenses FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT s.company_id
      FROM students s
      WHERE s.id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Teachers view company licenses" ON licenses;
CREATE POLICY "Teachers view company licenses"
  ON licenses FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT t.company_id
      FROM teachers t
      WHERE t.id = (SELECT auth.uid())
    )
  );

-- test_mode_logs policy
DROP POLICY IF EXISTS "System can insert test mode logs" ON test_mode_logs;
CREATE POLICY "System can insert test mode logs"
  ON test_mode_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT is_system_admin()) = true
    OR test_user_id = (SELECT auth.uid())
  );

-- materials policies
DROP POLICY IF EXISTS "System admins can create materials" ON materials;
CREATE POLICY "System admins can create materials"
  ON materials FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT is_system_admin()) = true);

DROP POLICY IF EXISTS "System admins can delete materials" ON materials;
CREATE POLICY "System admins can delete materials"
  ON materials FOR DELETE
  TO authenticated
  USING ((SELECT is_system_admin()) = true);

DROP POLICY IF EXISTS "System admins can update materials" ON materials;
CREATE POLICY "System admins can update materials"
  ON materials FOR UPDATE
  TO authenticated
  USING ((SELECT is_system_admin()) = true)
  WITH CHECK ((SELECT is_system_admin()) = true);

DROP POLICY IF EXISTS "System admins can view all materials" ON materials;
CREATE POLICY "System admins can view all materials"
  ON materials FOR SELECT
  TO authenticated
  USING ((SELECT is_system_admin()) = true);
