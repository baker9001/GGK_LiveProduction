/*
  # Optimize RLS Auth Function Calls - Part 5 (Final)

  1. Tables Updated
    - practice_sets: 1 policy
    - practice_set_items: 1 policy
    - practice_sessions: 4 policies
    - practice_answers: 2 policies
    - practice_session_events: 2 policies
    - student_gamification: 3 policies
    - leaderboards_periodic: 1 policy
    - reports_cache_student: 2 policies
    - invitation_status: 6 policies

  2. Pattern Applied
    - Replace: auth.uid()
    - With: (select auth.uid())
*/

-- practice_sets policy
DROP POLICY IF EXISTS "practice_sets_manage_creators" ON public.practice_sets;
CREATE POLICY "practice_sets_manage_creators"
ON public.practice_sets
FOR ALL
TO authenticated
USING (created_by = (SELECT auth.uid()));

-- practice_set_items policy
DROP POLICY IF EXISTS "practice_set_items_manage_creators" ON public.practice_set_items;
CREATE POLICY "practice_set_items_manage_creators"
ON public.practice_set_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.practice_sets
    WHERE practice_sets.id = practice_set_items.practice_set_id
    AND practice_sets.created_by = (SELECT auth.uid())
  )
);

-- practice_sessions policies
DROP POLICY IF EXISTS "practice_sessions_delete_admin" ON public.practice_sessions;
CREATE POLICY "practice_sessions_delete_admin"
ON public.practice_sessions
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_user_id = (SELECT auth.uid())
    AND users.user_type = 'system_admin'
    AND users.is_active = true
  )
);

DROP POLICY IF EXISTS "practice_sessions_insert_own" ON public.practice_sessions;
CREATE POLICY "practice_sessions_insert_own"
ON public.practice_sessions
FOR INSERT
TO authenticated
WITH CHECK (student_id IN (
  SELECT id FROM public.students WHERE auth_user_id = (SELECT auth.uid())
));

DROP POLICY IF EXISTS "practice_sessions_select_own" ON public.practice_sessions;
CREATE POLICY "practice_sessions_select_own"
ON public.practice_sessions
FOR SELECT
TO authenticated
USING (student_id IN (
  SELECT id FROM public.students WHERE auth_user_id = (SELECT auth.uid())
));

DROP POLICY IF EXISTS "practice_sessions_update_own" ON public.practice_sessions;
CREATE POLICY "practice_sessions_update_own"
ON public.practice_sessions
FOR UPDATE
TO authenticated
USING (student_id IN (
  SELECT id FROM public.students WHERE auth_user_id = (SELECT auth.uid())
));

-- practice_answers policies
DROP POLICY IF EXISTS "practice_answers_mutate_own" ON public.practice_answers;
CREATE POLICY "practice_answers_mutate_own"
ON public.practice_answers
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.practice_sessions ps
    JOIN public.students s ON s.id = ps.student_id
    WHERE ps.id = practice_answers.session_id
    AND s.auth_user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "practice_answers_select_own" ON public.practice_answers;
CREATE POLICY "practice_answers_select_own"
ON public.practice_answers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.practice_sessions ps
    JOIN public.students s ON s.id = ps.student_id
    WHERE ps.id = practice_answers.session_id
    AND s.auth_user_id = (SELECT auth.uid())
  )
);

-- practice_session_events policies
DROP POLICY IF EXISTS "practice_session_events_mutate_own" ON public.practice_session_events;
CREATE POLICY "practice_session_events_mutate_own"
ON public.practice_session_events
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.practice_sessions ps
    JOIN public.students s ON s.id = ps.student_id
    WHERE ps.id = practice_session_events.session_id
    AND s.auth_user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "practice_session_events_select_own" ON public.practice_session_events;
CREATE POLICY "practice_session_events_select_own"
ON public.practice_session_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.practice_sessions ps
    JOIN public.students s ON s.id = ps.student_id
    WHERE ps.id = practice_session_events.session_id
    AND s.auth_user_id = (SELECT auth.uid())
  )
);

-- student_gamification policies
DROP POLICY IF EXISTS "student_gamification_insert_own" ON public.student_gamification;
CREATE POLICY "student_gamification_insert_own"
ON public.student_gamification
FOR INSERT
TO authenticated
WITH CHECK (student_id IN (
  SELECT id FROM public.students WHERE auth_user_id = (SELECT auth.uid())
));

DROP POLICY IF EXISTS "student_gamification_select_own" ON public.student_gamification;
CREATE POLICY "student_gamification_select_own"
ON public.student_gamification
FOR SELECT
TO authenticated
USING (student_id IN (
  SELECT id FROM public.students WHERE auth_user_id = (SELECT auth.uid())
));

DROP POLICY IF EXISTS "student_gamification_update_own" ON public.student_gamification;
CREATE POLICY "student_gamification_update_own"
ON public.student_gamification
FOR UPDATE
TO authenticated
USING (student_id IN (
  SELECT id FROM public.students WHERE auth_user_id = (SELECT auth.uid())
));

-- leaderboards_periodic policy
DROP POLICY IF EXISTS "leaderboards_periodic_manage" ON public.leaderboards_periodic;
CREATE POLICY "leaderboards_periodic_manage"
ON public.leaderboards_periodic
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

-- reports_cache_student policies
DROP POLICY IF EXISTS "reports_cache_student_manage" ON public.reports_cache_student;
CREATE POLICY "reports_cache_student_manage"
ON public.reports_cache_student
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

DROP POLICY IF EXISTS "reports_cache_student_select" ON public.reports_cache_student;
CREATE POLICY "reports_cache_student_select"
ON public.reports_cache_student
FOR SELECT
TO authenticated
USING (student_id IN (
  SELECT id FROM public.students WHERE auth_user_id = (SELECT auth.uid())
));

-- invitation_status policies
DROP POLICY IF EXISTS "Entity admins can create invitations" ON public.invitation_status;
CREATE POLICY "Entity admins can create invitations"
ON public.invitation_status
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.entity_users
    WHERE entity_users.user_id = (SELECT auth.uid())
    AND entity_users.company_id = invitation_status.company_id
    AND entity_users.is_active = true
  )
);

DROP POLICY IF EXISTS "Entity admins can update their organization invitations" ON public.invitation_status;
CREATE POLICY "Entity admins can update their organization invitations"
ON public.invitation_status
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.entity_users
    WHERE entity_users.user_id = (SELECT auth.uid())
    AND entity_users.company_id = invitation_status.company_id
    AND entity_users.is_active = true
  )
);

DROP POLICY IF EXISTS "Entity admins can view their organization invitations" ON public.invitation_status;
CREATE POLICY "Entity admins can view their organization invitations"
ON public.invitation_status
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.entity_users
    WHERE entity_users.user_id = (SELECT auth.uid())
    AND entity_users.company_id = invitation_status.company_id
    AND entity_users.is_active = true
  )
);

DROP POLICY IF EXISTS "System admins can insert invitation records" ON public.invitation_status;
CREATE POLICY "System admins can insert invitation records"
ON public.invitation_status
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_user_id = (SELECT auth.uid())
    AND users.user_type = 'system_admin'
    AND users.is_active = true
  )
);

DROP POLICY IF EXISTS "System admins can update invitation statuses" ON public.invitation_status;
CREATE POLICY "System admins can update invitation statuses"
ON public.invitation_status
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_user_id = (SELECT auth.uid())
    AND users.user_type = 'system_admin'
    AND users.is_active = true
  )
);

DROP POLICY IF EXISTS "System admins can view all invitation statuses" ON public.invitation_status;
CREATE POLICY "System admins can view all invitation statuses"
ON public.invitation_status
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_user_id = (SELECT auth.uid())
    AND users.user_type = 'system_admin'
    AND users.is_active = true
  )
);
