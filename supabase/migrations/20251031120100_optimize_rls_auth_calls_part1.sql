/*
  # Optimize RLS Auth Function Calls - Part 1

  1. Performance Issue
    - RLS policies re-evaluate auth functions for each row
    - Causes significant performance degradation at scale
    - Solution: Wrap auth calls in subqueries for single evaluation

  2. Tables Updated (Part 1 - High Priority)
    - mock_exams: 2 policies
    - teacher_branches: 1 policy
    - teacher_schools: 1 policy
    - student_game_stats: 4 policies
    - student_achievements: 4 policies
    - student_daily_challenges: 4 policies

  3. Pattern Applied
    - Replace: auth.uid()
    - With: (select auth.uid())
    - Effect: Function evaluated once per query, not per row
*/

-- mock_exams policies
DROP POLICY IF EXISTS "Entity admins can create mock exams in their company" ON public.mock_exams;
CREATE POLICY "Entity admins can create mock exams in their company"
ON public.mock_exams
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.entity_users
    WHERE entity_users.user_id = (SELECT auth.uid())
    AND entity_users.company_id = mock_exams.company_id
    AND entity_users.is_active = true
  )
);

DROP POLICY IF EXISTS "School admins can create mock exams for their schools" ON public.mock_exams;
CREATE POLICY "School admins can create mock exams for their schools"
ON public.mock_exams
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.entity_users eu
    WHERE eu.user_id = (SELECT auth.uid())
    AND eu.is_active = true
    AND EXISTS (
      SELECT 1 FROM public.entity_admin_scope eas
      WHERE eas.entity_user_id = eu.id
      AND eas.scope_type = 'school'
      AND eas.is_active = true
    )
  )
);

-- teacher_branches policy
DROP POLICY IF EXISTS "Users can manage teacher branches in their scope" ON public.teacher_branches;
CREATE POLICY "Users can manage teacher branches in their scope"
ON public.teacher_branches
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.entity_users eu
    WHERE eu.user_id = (SELECT auth.uid())
    AND eu.company_id = (
      SELECT b.company_id FROM public.branches b WHERE b.id = teacher_branches.branch_id
    )
  )
);

-- teacher_schools policy
DROP POLICY IF EXISTS "Users can manage teacher schools in their scope" ON public.teacher_schools;
CREATE POLICY "Users can manage teacher schools in their scope"
ON public.teacher_schools
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.entity_users eu
    WHERE eu.user_id = (SELECT auth.uid())
    AND eu.company_id = (
      SELECT s.company_id FROM public.schools s WHERE s.id = teacher_schools.school_id
    )
  )
);

-- student_game_stats policies
DROP POLICY IF EXISTS "Entity admins view game stats in company" ON public.student_game_stats;
CREATE POLICY "Entity admins view game stats in company"
ON public.student_game_stats
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.entity_users eu
    JOIN public.students st ON st.company_id = eu.company_id
    WHERE eu.user_id = (SELECT auth.uid())
    AND st.id = student_game_stats.student_id
    AND eu.is_active = true
  )
);

DROP POLICY IF EXISTS "Students manage own game stats" ON public.student_game_stats;
CREATE POLICY "Students manage own game stats"
ON public.student_game_stats
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.students
    WHERE students.auth_user_id = (SELECT auth.uid())
    AND students.id = student_game_stats.student_id
  )
);

DROP POLICY IF EXISTS "Students view own game stats" ON public.student_game_stats;
CREATE POLICY "Students view own game stats"
ON public.student_game_stats
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.students
    WHERE students.auth_user_id = (SELECT auth.uid())
    AND students.id = student_game_stats.student_id
  )
);

DROP POLICY IF EXISTS "System admins full access to game stats" ON public.student_game_stats;
CREATE POLICY "System admins full access to game stats"
ON public.student_game_stats
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_user_id = (SELECT auth.uid())
    AND users.user_type = 'system_admin'
    AND users.is_active = true
  )
);

-- student_achievements policies
DROP POLICY IF EXISTS "Entity admins view achievements in company" ON public.student_achievements;
CREATE POLICY "Entity admins view achievements in company"
ON public.student_achievements
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.entity_users eu
    JOIN public.students st ON st.company_id = eu.company_id
    WHERE eu.user_id = (SELECT auth.uid())
    AND st.id = student_achievements.student_id
    AND eu.is_active = true
  )
);

DROP POLICY IF EXISTS "Students can earn achievements" ON public.student_achievements;
CREATE POLICY "Students can earn achievements"
ON public.student_achievements
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.students
    WHERE students.auth_user_id = (SELECT auth.uid())
    AND students.id = student_achievements.student_id
  )
);

DROP POLICY IF EXISTS "Students view own achievements" ON public.student_achievements;
CREATE POLICY "Students view own achievements"
ON public.student_achievements
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.students
    WHERE students.auth_user_id = (SELECT auth.uid())
    AND students.id = student_achievements.student_id
  )
);

DROP POLICY IF EXISTS "System admins full access to achievements" ON public.student_achievements;
CREATE POLICY "System admins full access to achievements"
ON public.student_achievements
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_user_id = (SELECT auth.uid())
    AND users.user_type = 'system_admin'
    AND users.is_active = true
  )
);

-- student_daily_challenges policies
DROP POLICY IF EXISTS "Entity admins view challenges in company" ON public.student_daily_challenges;
CREATE POLICY "Entity admins view challenges in company"
ON public.student_daily_challenges
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.entity_users eu
    JOIN public.students st ON st.company_id = eu.company_id
    WHERE eu.user_id = (SELECT auth.uid())
    AND st.id = student_daily_challenges.student_id
    AND eu.is_active = true
  )
);

DROP POLICY IF EXISTS "Students manage own challenges" ON public.student_daily_challenges;
CREATE POLICY "Students manage own challenges"
ON public.student_daily_challenges
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.students
    WHERE students.auth_user_id = (SELECT auth.uid())
    AND students.id = student_daily_challenges.student_id
  )
);

DROP POLICY IF EXISTS "Students view own challenges" ON public.student_daily_challenges;
CREATE POLICY "Students view own challenges"
ON public.student_daily_challenges
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.students
    WHERE students.auth_user_id = (SELECT auth.uid())
    AND students.id = student_daily_challenges.student_id
  )
);

DROP POLICY IF EXISTS "System admins full access to challenges" ON public.student_daily_challenges;
CREATE POLICY "System admins full access to challenges"
ON public.student_daily_challenges
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_user_id = (SELECT auth.uid())
    AND users.user_type = 'system_admin'
    AND users.is_active = true
  )
);
