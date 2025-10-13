/*
  # Optimize All RLS Auth Function Calls - Final Fix

  1. Problem
    - Many RLS policies call auth.uid() and auth.jwt() without wrapping in SELECT
    - This causes function re-evaluation for each row instead of once per query
    - Severe performance impact on large result sets

  2. Solution
    - Wrap all bare auth.uid() calls with (SELECT auth.uid())
    - Wrap all bare auth.jwt() calls with (SELECT auth.jwt())
    - Preserve existing logic and security rules

  3. Scope
    - Fix all policies across all tables
    - Handle helper function calls like is_admin_user(auth.uid())
    - Preserve policies that are already optimized
*/

-- Admin users table
DROP POLICY IF EXISTS "Admin users can view their own record" ON admin_users;
CREATE POLICY "Admin users can view their own record"
  ON admin_users FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "System admins can create admin_users" ON admin_users;
CREATE POLICY "System admins can create admin_users"
  ON admin_users FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_user((SELECT auth.uid())));

DROP POLICY IF EXISTS "System admins can delete admin_users" ON admin_users;
CREATE POLICY "System admins can delete admin_users"
  ON admin_users FOR DELETE
  TO authenticated
  USING (is_admin_user((SELECT auth.uid())));

DROP POLICY IF EXISTS "System admins can update all admin_users" ON admin_users;
CREATE POLICY "System admins can update all admin_users"
  ON admin_users FOR UPDATE
  TO authenticated
  USING (is_admin_user((SELECT auth.uid())))
  WITH CHECK (is_admin_user((SELECT auth.uid())));

DROP POLICY IF EXISTS "System admins can view all admin_users" ON admin_users;
CREATE POLICY "System admins can view all admin_users"
  ON admin_users FOR SELECT
  TO authenticated
  USING (is_admin_user((SELECT auth.uid())));

-- Entity users table
DROP POLICY IF EXISTS "Entity admins create users in company" ON entity_users;
CREATE POLICY "Entity admins create users in company"
  ON entity_users FOR INSERT
  TO authenticated
  WITH CHECK (is_entity_admin_in_company((SELECT auth.uid()), company_id));

DROP POLICY IF EXISTS "Entity admins delete users in company" ON entity_users;
CREATE POLICY "Entity admins delete users in company"
  ON entity_users FOR DELETE
  TO authenticated
  USING (is_entity_admin_in_company((SELECT auth.uid()), company_id));

DROP POLICY IF EXISTS "Entity admins update users in company" ON entity_users;
CREATE POLICY "Entity admins update users in company"
  ON entity_users FOR UPDATE
  TO authenticated
  USING (is_entity_admin_in_company((SELECT auth.uid()), company_id))
  WITH CHECK (is_entity_admin_in_company((SELECT auth.uid()), company_id));

DROP POLICY IF EXISTS "Entity admins view users in company" ON entity_users;
CREATE POLICY "Entity admins view users in company"
  ON entity_users FOR SELECT
  TO authenticated
  USING (is_entity_admin_in_company((SELECT auth.uid()), company_id));

DROP POLICY IF EXISTS "Entity users view own record" ON entity_users;
CREATE POLICY "Entity users view own record"
  ON entity_users FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "System admins full access to entity_users" ON entity_users;
CREATE POLICY "System admins full access to entity_users"
  ON entity_users FOR ALL
  TO authenticated
  USING (is_admin_user((SELECT auth.uid())))
  WITH CHECK (is_admin_user((SELECT auth.uid())));

-- Mock exams table policies
DROP POLICY IF EXISTS "Branch admins can view exams for their branches" ON mock_exams;
CREATE POLICY "Branch admins can view exams for their branches"
  ON mock_exams FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM entity_users eu
      JOIN entity_user_branches eub ON eub.entity_user_id = eu.id
      JOIN mock_exam_branches meb ON meb.branch_id = eub.branch_id
      WHERE eu.user_id = (SELECT auth.uid())
        AND meb.mock_exam_id = mock_exams.id
        AND eu.admin_level = 'branch_admin'
        AND eu.is_active = true
    )
  );

DROP POLICY IF EXISTS "Entity admins can create mock exams in their company" ON mock_exams;
CREATE POLICY "Entity admins can create mock exams in their company"
  ON mock_exams FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM entity_users eu
      WHERE eu.user_id = (SELECT auth.uid())
        AND eu.company_id = company_id
        AND eu.admin_level = ANY(ARRAY['entity_admin', 'sub_entity_admin'])
        AND eu.is_active = true
    )
  );

DROP POLICY IF EXISTS "Entity admins can manage all exams in their company" ON mock_exams;
CREATE POLICY "Entity admins can manage all exams in their company"
  ON mock_exams FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM entity_users eu
      WHERE eu.user_id = (SELECT auth.uid())
        AND eu.company_id = mock_exams.company_id
        AND eu.admin_level = ANY(ARRAY['entity_admin', 'sub_entity_admin'])
        AND eu.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM entity_users eu
      WHERE eu.user_id = (SELECT auth.uid())
        AND eu.company_id = mock_exams.company_id
        AND eu.admin_level = ANY(ARRAY['entity_admin', 'sub_entity_admin'])
        AND eu.is_active = true
    )
  );

DROP POLICY IF EXISTS "Entity admins can update their company mock exams" ON mock_exams;
CREATE POLICY "Entity admins can update their company mock exams"
  ON mock_exams FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT eu.company_id
      FROM entity_users eu
      WHERE eu.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT eu.company_id
      FROM entity_users eu
      WHERE eu.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Entity admins can view all company exams" ON mock_exams;
CREATE POLICY "Entity admins can view all company exams"
  ON mock_exams FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT eu.company_id
      FROM entity_users eu
      WHERE eu.user_id = (SELECT auth.uid())
        AND eu.admin_level = ANY(ARRAY['entity_admin', 'sub_entity_admin'])
        AND eu.is_active = true
    )
  );

DROP POLICY IF EXISTS "School admins can create mock exams for their schools" ON mock_exams;
CREATE POLICY "School admins can create mock exams for their schools"
  ON mock_exams FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM entity_users eu
      JOIN entity_user_schools eus ON eus.entity_user_id = eu.id
      JOIN mock_exam_schools mes ON mes.school_id = eus.school_id
      WHERE eu.user_id = (SELECT auth.uid())
        AND mes.mock_exam_id = mock_exams.id
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  );

DROP POLICY IF EXISTS "School admins can manage exams for their schools" ON mock_exams;
CREATE POLICY "School admins can manage exams for their schools"
  ON mock_exams FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM entity_users eu
      JOIN entity_user_schools eus ON eus.entity_user_id = eu.id
      JOIN mock_exam_schools mes ON mes.school_id = eus.school_id
      WHERE eu.user_id = (SELECT auth.uid())
        AND mes.mock_exam_id = mock_exams.id
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM entity_users eu
      JOIN entity_user_schools eus ON eus.entity_user_id = eu.id
      JOIN mock_exam_schools mes ON mes.school_id = eus.school_id
      WHERE eu.user_id = (SELECT auth.uid())
        AND mes.mock_exam_id = mock_exams.id
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  );

DROP POLICY IF EXISTS "School admins can update mock exams for their schools" ON mock_exams;
CREATE POLICY "School admins can update mock exams for their schools"
  ON mock_exams FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM entity_users eu
      JOIN entity_user_schools eus ON eus.entity_user_id = eu.id
      JOIN mock_exam_schools mes ON mes.school_id = eus.school_id
      WHERE eu.user_id = (SELECT auth.uid())
        AND mes.mock_exam_id = mock_exams.id
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM entity_users eu
      JOIN entity_user_schools eus ON eus.entity_user_id = eu.id
      JOIN mock_exam_schools mes ON mes.school_id = eus.school_id
      WHERE eu.user_id = (SELECT auth.uid())
        AND mes.mock_exam_id = mock_exams.id
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  );

DROP POLICY IF EXISTS "School admins can view exams for their schools" ON mock_exams;
CREATE POLICY "School admins can view exams for their schools"
  ON mock_exams FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM entity_users eu
      JOIN entity_user_schools eus ON eus.entity_user_id = eu.id
      JOIN mock_exam_schools mes ON mes.school_id = eus.school_id
      WHERE eu.user_id = (SELECT auth.uid())
        AND mes.mock_exam_id = mock_exams.id
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  );

DROP POLICY IF EXISTS "System admins can create mock exams" ON mock_exams;
CREATE POLICY "System admins can create mock exams"
  ON mock_exams FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_user((SELECT auth.uid())));

DROP POLICY IF EXISTS "System admins can delete mock exams" ON mock_exams;
CREATE POLICY "System admins can delete mock exams"
  ON mock_exams FOR DELETE
  TO authenticated
  USING (is_admin_user((SELECT auth.uid())));

DROP POLICY IF EXISTS "System admins can update all mock exams" ON mock_exams;
CREATE POLICY "System admins can update all mock exams"
  ON mock_exams FOR UPDATE
  TO authenticated
  USING (is_admin_user((SELECT auth.uid())))
  WITH CHECK (is_admin_user((SELECT auth.uid())));

DROP POLICY IF EXISTS "System admins can view all mock exams" ON mock_exams;
CREATE POLICY "System admins can view all mock exams"
  ON mock_exams FOR SELECT
  TO authenticated
  USING (is_admin_user((SELECT auth.uid())));
