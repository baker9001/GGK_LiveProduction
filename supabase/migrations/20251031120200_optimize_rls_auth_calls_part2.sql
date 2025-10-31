/*
  # Optimize RLS Auth Function Calls - Part 2

  1. Tables Updated
    - teachers: 4 policies
    - test_mode_logs: 1 policy
    - materials: 4 policies
    - past_paper_import_sessions: 4 policies
    - licenses: 3 policies
    - students: 3 policies

  2. Pattern Applied
    - Replace: auth.uid()
    - With: (select auth.uid())
*/

-- teachers policies
DROP POLICY IF EXISTS "Branch admins manage teachers in branches" ON public.teachers;
CREATE POLICY "Branch admins manage teachers in branches"
ON public.teachers
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.entity_users eu
    JOIN public.entity_admin_scope eas ON eas.entity_user_id = eu.id
    WHERE eu.user_id = (SELECT auth.uid())
    AND eas.scope_type = 'branch'
    AND eas.branch_id IN (
      SELECT tb.branch_id FROM public.teacher_branches tb WHERE tb.teacher_id = teachers.id
    )
    AND eu.is_active = true
    AND eas.is_active = true
  )
);

DROP POLICY IF EXISTS "Entity admins manage teachers in company" ON public.teachers;
CREATE POLICY "Entity admins manage teachers in company"
ON public.teachers
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.entity_users
    WHERE entity_users.user_id = (SELECT auth.uid())
    AND entity_users.company_id = teachers.company_id
    AND entity_users.is_active = true
  )
);

DROP POLICY IF EXISTS "School admins manage teachers in schools" ON public.teachers;
CREATE POLICY "School admins manage teachers in schools"
ON public.teachers
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.entity_users eu
    JOIN public.entity_admin_scope eas ON eas.entity_user_id = eu.id
    WHERE eu.user_id = (SELECT auth.uid())
    AND eas.scope_type = 'school'
    AND eas.school_id IN (
      SELECT ts.school_id FROM public.teacher_schools ts WHERE ts.teacher_id = teachers.id
    )
    AND eu.is_active = true
    AND eas.is_active = true
  )
);

DROP POLICY IF EXISTS "School and branch admins can view teachers" ON public.teachers;
CREATE POLICY "School and branch admins can view teachers"
ON public.teachers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.entity_users eu
    JOIN public.entity_admin_scope eas ON eas.entity_user_id = eu.id
    WHERE eu.user_id = (SELECT auth.uid())
    AND (
      (eas.scope_type = 'school' AND eas.school_id IN (
        SELECT ts.school_id FROM public.teacher_schools ts WHERE ts.teacher_id = teachers.id
      ))
      OR
      (eas.scope_type = 'branch' AND eas.branch_id IN (
        SELECT tb.branch_id FROM public.teacher_branches tb WHERE tb.teacher_id = teachers.id
      ))
    )
    AND eu.is_active = true
    AND eas.is_active = true
  )
);

-- test_mode_logs policy
DROP POLICY IF EXISTS "System can insert test mode logs" ON public.test_mode_logs;
CREATE POLICY "System can insert test mode logs"
ON public.test_mode_logs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_user_id = (SELECT auth.uid())
  )
);

-- materials policies
DROP POLICY IF EXISTS "System admins can create materials" ON public.materials;
CREATE POLICY "System admins can create materials"
ON public.materials
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

DROP POLICY IF EXISTS "System admins can delete materials" ON public.materials;
CREATE POLICY "System admins can delete materials"
ON public.materials
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

DROP POLICY IF EXISTS "System admins can update materials" ON public.materials;
CREATE POLICY "System admins can update materials"
ON public.materials
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

DROP POLICY IF EXISTS "System admins can view all materials" ON public.materials;
CREATE POLICY "System admins can view all materials"
ON public.materials
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

-- past_paper_import_sessions policies
DROP POLICY IF EXISTS "Users can create import sessions" ON public.past_paper_import_sessions;
CREATE POLICY "Users can create import sessions"
ON public.past_paper_import_sessions
FOR INSERT
TO authenticated
WITH CHECK (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own import sessions" ON public.past_paper_import_sessions;
CREATE POLICY "Users can delete own import sessions"
ON public.past_paper_import_sessions
FOR DELETE
TO authenticated
USING (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own import sessions" ON public.past_paper_import_sessions;
CREATE POLICY "Users can update own import sessions"
ON public.past_paper_import_sessions
FOR UPDATE
TO authenticated
USING (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own import sessions" ON public.past_paper_import_sessions;
CREATE POLICY "Users can view own import sessions"
ON public.past_paper_import_sessions
FOR SELECT
TO authenticated
USING (created_by = (SELECT auth.uid()));

-- licenses policies
DROP POLICY IF EXISTS "Entity users view company licenses" ON public.licenses;
CREATE POLICY "Entity users view company licenses"
ON public.licenses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.entity_users
    WHERE entity_users.user_id = (SELECT auth.uid())
    AND entity_users.company_id = licenses.company_id
    AND entity_users.is_active = true
  )
);

DROP POLICY IF EXISTS "Students view company licenses" ON public.licenses;
CREATE POLICY "Students view company licenses"
ON public.licenses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.students
    WHERE students.auth_user_id = (SELECT auth.uid())
    AND students.company_id = licenses.company_id
  )
);

DROP POLICY IF EXISTS "Teachers view company licenses" ON public.licenses;
CREATE POLICY "Teachers view company licenses"
ON public.licenses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.teachers
    WHERE teachers.auth_user_id = (SELECT auth.uid())
    AND teachers.company_id = licenses.company_id
  )
);

-- students policies
DROP POLICY IF EXISTS "Branch admins manage students in branches" ON public.students;
CREATE POLICY "Branch admins manage students in branches"
ON public.students
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.entity_users eu
    JOIN public.entity_admin_scope eas ON eas.entity_user_id = eu.id
    WHERE eu.user_id = (SELECT auth.uid())
    AND eas.scope_type = 'branch'
    AND students.branch_id = eas.branch_id
    AND eu.is_active = true
    AND eas.is_active = true
  )
);

DROP POLICY IF EXISTS "Entity admins manage students in company" ON public.students;
CREATE POLICY "Entity admins manage students in company"
ON public.students
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.entity_users
    WHERE entity_users.user_id = (SELECT auth.uid())
    AND entity_users.company_id = students.company_id
    AND entity_users.is_active = true
  )
);

DROP POLICY IF EXISTS "School admins manage students in schools" ON public.students;
CREATE POLICY "School admins manage students in schools"
ON public.students
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.entity_users eu
    JOIN public.entity_admin_scope eas ON eas.entity_user_id = eu.id
    WHERE eu.user_id = (SELECT auth.uid())
    AND eas.scope_type = 'school'
    AND students.school_id = eas.school_id
    AND eu.is_active = true
    AND eas.is_active = true
  )
);
