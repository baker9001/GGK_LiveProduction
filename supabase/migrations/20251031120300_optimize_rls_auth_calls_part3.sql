/*
  # Optimize RLS Auth Function Calls - Part 3

  1. Tables Updated
    - question_options: 4 policies
    - audit_logs: 1 policy
    - schools: 4 policies
    - teacher_programs: 1 policy
    - teacher_subjects: 1 policy
    - teacher_departments: 1 policy
    - teacher_grade_levels: 1 policy
    - teacher_sections: 1 policy

  2. Pattern Applied
    - Replace: auth.uid()
    - With: (select auth.uid())
*/

-- question_options policies
DROP POLICY IF EXISTS "System admins can create question options" ON public.question_options;
CREATE POLICY "System admins can create question options"
ON public.question_options
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

DROP POLICY IF EXISTS "System admins can delete question options" ON public.question_options;
CREATE POLICY "System admins can delete question options"
ON public.question_options
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

DROP POLICY IF EXISTS "System admins can update question options" ON public.question_options;
CREATE POLICY "System admins can update question options"
ON public.question_options
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

DROP POLICY IF EXISTS "System admins can view question options" ON public.question_options;
CREATE POLICY "System admins can view question options"
ON public.question_options
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

-- audit_logs policy
DROP POLICY IF EXISTS "System admins can create audit_logs" ON public.audit_logs;
CREATE POLICY "System admins can create audit_logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.auth_user_id = (SELECT auth.uid())
    AND users.user_type = 'system_admin'
  )
);

-- schools policies
DROP POLICY IF EXISTS "System admins can create schools" ON public.schools;
CREATE POLICY "System admins can create schools"
ON public.schools
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

DROP POLICY IF EXISTS "System admins can delete schools" ON public.schools;
CREATE POLICY "System admins can delete schools"
ON public.schools
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

DROP POLICY IF EXISTS "System admins can update all schools" ON public.schools;
CREATE POLICY "System admins can update all schools"
ON public.schools
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

DROP POLICY IF EXISTS "System admins can view all schools" ON public.schools;
CREATE POLICY "System admins can view all schools"
ON public.schools
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

-- teacher junction table policies
DROP POLICY IF EXISTS "Users can manage teacher programs in their scope" ON public.teacher_programs;
CREATE POLICY "Users can manage teacher programs in their scope"
ON public.teacher_programs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.entity_users eu
    JOIN public.teachers t ON t.company_id = eu.company_id
    WHERE eu.user_id = (SELECT auth.uid())
    AND t.id = teacher_programs.teacher_id
    AND eu.is_active = true
  )
);

DROP POLICY IF EXISTS "Users can manage teacher subjects in their scope" ON public.teacher_subjects;
CREATE POLICY "Users can manage teacher subjects in their scope"
ON public.teacher_subjects
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.entity_users eu
    JOIN public.teachers t ON t.company_id = eu.company_id
    WHERE eu.user_id = (SELECT auth.uid())
    AND t.id = teacher_subjects.teacher_id
    AND eu.is_active = true
  )
);

DROP POLICY IF EXISTS "Users can manage teacher departments in their scope" ON public.teacher_departments;
CREATE POLICY "Users can manage teacher departments in their scope"
ON public.teacher_departments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.entity_users eu
    JOIN public.teachers t ON t.company_id = eu.company_id
    WHERE eu.user_id = (SELECT auth.uid())
    AND t.id = teacher_departments.teacher_id
    AND eu.is_active = true
  )
);

DROP POLICY IF EXISTS "Users can manage teacher grade levels in their scope" ON public.teacher_grade_levels;
CREATE POLICY "Users can manage teacher grade levels in their scope"
ON public.teacher_grade_levels
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.entity_users eu
    JOIN public.teachers t ON t.company_id = eu.company_id
    WHERE eu.user_id = (SELECT auth.uid())
    AND t.id = teacher_grade_levels.teacher_id
    AND eu.is_active = true
  )
);

DROP POLICY IF EXISTS "Users can manage teacher sections in their scope" ON public.teacher_sections;
CREATE POLICY "Users can manage teacher sections in their scope"
ON public.teacher_sections
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.entity_users eu
    JOIN public.teachers t ON t.company_id = eu.company_id
    WHERE eu.user_id = (SELECT auth.uid())
    AND t.id = teacher_sections.teacher_id
    AND eu.is_active = true
  )
);
