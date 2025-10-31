/*
  # Optimize RLS Auth Function Calls - Part 4

  1. Tables Updated
    - question_import_review_sessions: 4 policies
    - question_import_review_status: 4 policies
    - users: 1 policy
    - question_import_simulation_results: 3 policies
    - branches: 4 policies
    - student_class_sections: 6 policies

  2. Pattern Applied
    - Replace: auth.uid()
    - With: (select auth.uid())
*/

-- question_import_review_sessions policies
DROP POLICY IF EXISTS "System admins can view all review sessions" ON public.question_import_review_sessions;
CREATE POLICY "System admins can view all review sessions"
ON public.question_import_review_sessions
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

DROP POLICY IF EXISTS "Users can create own review sessions" ON public.question_import_review_sessions;
CREATE POLICY "Users can create own review sessions"
ON public.question_import_review_sessions
FOR INSERT
TO authenticated
WITH CHECK (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own review sessions" ON public.question_import_review_sessions;
CREATE POLICY "Users can update own review sessions"
ON public.question_import_review_sessions
FOR UPDATE
TO authenticated
USING (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own review sessions" ON public.question_import_review_sessions;
CREATE POLICY "Users can view own review sessions"
ON public.question_import_review_sessions
FOR SELECT
TO authenticated
USING (created_by = (SELECT auth.uid()));

-- question_import_review_status policies
DROP POLICY IF EXISTS "System admins can manage all question review status" ON public.question_import_review_status;
CREATE POLICY "System admins can manage all question review status"
ON public.question_import_review_status
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

DROP POLICY IF EXISTS "Users can create own question review status" ON public.question_import_review_status;
CREATE POLICY "Users can create own question review status"
ON public.question_import_review_status
FOR INSERT
TO authenticated
WITH CHECK (reviewed_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own question review status" ON public.question_import_review_status;
CREATE POLICY "Users can update own question review status"
ON public.question_import_review_status
FOR UPDATE
TO authenticated
USING (reviewed_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own question review status" ON public.question_import_review_status;
CREATE POLICY "Users can view own question review status"
ON public.question_import_review_status
FOR SELECT
TO authenticated
USING (reviewed_by = (SELECT auth.uid()));

-- users policy
DROP POLICY IF EXISTS "Users can view their own record by email" ON public.users;
CREATE POLICY "Users can view their own record by email"
ON public.users
FOR SELECT
TO authenticated
USING (
  auth_user_id = (SELECT auth.uid())
  OR email = (SELECT auth.jwt()->>'email')
);

-- question_import_simulation_results policies
DROP POLICY IF EXISTS "System admins can view all simulation results" ON public.question_import_simulation_results;
CREATE POLICY "System admins can view all simulation results"
ON public.question_import_simulation_results
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

DROP POLICY IF EXISTS "Users can create own simulation results" ON public.question_import_simulation_results;
CREATE POLICY "Users can create own simulation results"
ON public.question_import_simulation_results
FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own simulation results" ON public.question_import_simulation_results;
CREATE POLICY "Users can view own simulation results"
ON public.question_import_simulation_results
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- branches policies
DROP POLICY IF EXISTS "System admins can create branches" ON public.branches;
CREATE POLICY "System admins can create branches"
ON public.branches
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

DROP POLICY IF EXISTS "System admins can delete branches" ON public.branches;
CREATE POLICY "System admins can delete branches"
ON public.branches
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

DROP POLICY IF EXISTS "System admins can update all branches" ON public.branches;
CREATE POLICY "System admins can update all branches"
ON public.branches
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

DROP POLICY IF EXISTS "System admins can view all branches" ON public.branches;
CREATE POLICY "System admins can view all branches"
ON public.branches
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

-- student_class_sections policies
DROP POLICY IF EXISTS "Branch admins manage student_class_sections in branches" ON public.student_class_sections;
CREATE POLICY "Branch admins manage student_class_sections in branches"
ON public.student_class_sections
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.entity_users eu
    JOIN public.entity_admin_scope eas ON eas.entity_user_id = eu.id
    JOIN public.students s ON s.branch_id = eas.branch_id
    WHERE eu.user_id = (SELECT auth.uid())
    AND eas.scope_type = 'branch'
    AND s.id = student_class_sections.student_id
    AND eu.is_active = true
    AND eas.is_active = true
  )
);

DROP POLICY IF EXISTS "Entity admins manage student_class_sections in company" ON public.student_class_sections;
CREATE POLICY "Entity admins manage student_class_sections in company"
ON public.student_class_sections
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.entity_users eu
    JOIN public.students s ON s.company_id = eu.company_id
    WHERE eu.user_id = (SELECT auth.uid())
    AND s.id = student_class_sections.student_id
    AND eu.is_active = true
  )
);

DROP POLICY IF EXISTS "School admins manage student_class_sections in schools" ON public.student_class_sections;
CREATE POLICY "School admins manage student_class_sections in schools"
ON public.student_class_sections
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.entity_users eu
    JOIN public.entity_admin_scope eas ON eas.entity_user_id = eu.id
    JOIN public.students s ON s.school_id = eas.school_id
    WHERE eu.user_id = (SELECT auth.uid())
    AND eas.scope_type = 'school'
    AND s.id = student_class_sections.student_id
    AND eu.is_active = true
    AND eas.is_active = true
  )
);

DROP POLICY IF EXISTS "Students view own class section assignments" ON public.student_class_sections;
CREATE POLICY "Students view own class section assignments"
ON public.student_class_sections
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.students
    WHERE students.auth_user_id = (SELECT auth.uid())
    AND students.id = student_class_sections.student_id
  )
);

DROP POLICY IF EXISTS "System admins full access to student_class_sections" ON public.student_class_sections;
CREATE POLICY "System admins full access to student_class_sections"
ON public.student_class_sections
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

DROP POLICY IF EXISTS "Teachers view assignments for their sections" ON public.student_class_sections;
CREATE POLICY "Teachers view assignments for their sections"
ON public.student_class_sections
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.teachers t
    JOIN public.teacher_sections ts ON ts.teacher_id = t.id
    WHERE t.auth_user_id = (SELECT auth.uid())
    AND ts.section_id = student_class_sections.section_id
  )
);
