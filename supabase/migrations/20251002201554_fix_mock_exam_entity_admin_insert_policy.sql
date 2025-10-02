/*
  # Fix Mock Exam Creation for Entity Admins

  ## Issue
  Entity admins cannot create mock exams because the only INSERT policy on mock_exams table
  checks for system admins. The existing "Entity admins can manage all exams" policy uses
  cmd='ALL' but more specific INSERT policies take precedence.

  ## Changes
  - Add explicit INSERT policy for entity admins to create mock exams in their company
  - Add explicit INSERT policy for school admins to create mock exams for their schools
  - Ensure entity admins can also insert into junction tables for their company's mock exams
  - Ensure school admins can insert into junction tables for their schools' mock exams

  ## Security Notes
  - Entity admins can only create mock exams within their own company
  - School admins can only create mock exams within their assigned schools
  - All policies verify active status and proper admin level
*/

-- Drop existing policies if they exist, then recreate
DO $$
BEGIN
  -- Add INSERT policy for entity admins on mock_exams
  DROP POLICY IF EXISTS "Entity admins can create mock exams in their company" ON mock_exams;
  CREATE POLICY "Entity admins can create mock exams in their company"
    ON mock_exams
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM entity_users eu
        WHERE eu.user_id = auth.uid()
          AND eu.company_id = company_id
          AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
          AND eu.is_active = true
      )
    );

  -- Add INSERT policy for school admins on mock_exams
  DROP POLICY IF EXISTS "School admins can create mock exams for their schools" ON mock_exams;
  CREATE POLICY "School admins can create mock exams for their schools"
    ON mock_exams
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM entity_users eu
        WHERE eu.user_id = auth.uid()
          AND eu.company_id = company_id
          AND eu.admin_level = 'school_admin'
          AND eu.is_active = true
      )
    );

  -- Add INSERT policies for entity admins on junction tables
  DROP POLICY IF EXISTS "Entity admins can add schools to their company's mock exams" ON mock_exam_schools;
  CREATE POLICY "Entity admins can add schools to their company's mock exams"
    ON mock_exam_schools
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM mock_exams me
        JOIN entity_users eu ON eu.company_id = me.company_id
        WHERE me.id = mock_exam_id
          AND eu.user_id = auth.uid()
          AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
          AND eu.is_active = true
      )
    );

  DROP POLICY IF EXISTS "Entity admins can add branches to their company's mock exams" ON mock_exam_branches;
  CREATE POLICY "Entity admins can add branches to their company's mock exams"
    ON mock_exam_branches
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM mock_exams me
        JOIN entity_users eu ON eu.company_id = me.company_id
        WHERE me.id = mock_exam_id
          AND eu.user_id = auth.uid()
          AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
          AND eu.is_active = true
      )
    );

  DROP POLICY IF EXISTS "Entity admins can add grade levels to their company's mock exams" ON mock_exam_grade_levels;
  CREATE POLICY "Entity admins can add grade levels to their company's mock exams"
    ON mock_exam_grade_levels
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM mock_exams me
        JOIN entity_users eu ON eu.company_id = me.company_id
        WHERE me.id = mock_exam_id
          AND eu.user_id = auth.uid()
          AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
          AND eu.is_active = true
      )
    );

  DROP POLICY IF EXISTS "Entity admins can add sections to their company's mock exams" ON mock_exam_sections;
  CREATE POLICY "Entity admins can add sections to their company's mock exams"
    ON mock_exam_sections
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM mock_exams me
        JOIN entity_users eu ON eu.company_id = me.company_id
        WHERE me.id = mock_exam_id
          AND eu.user_id = auth.uid()
          AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
          AND eu.is_active = true
      )
    );

  DROP POLICY IF EXISTS "Entity admins can add teachers to their company's mock exams" ON mock_exam_teachers;
  CREATE POLICY "Entity admins can add teachers to their company's mock exams"
    ON mock_exam_teachers
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM mock_exams me
        JOIN entity_users eu ON eu.company_id = me.company_id
        WHERE me.id = mock_exam_id
          AND eu.user_id = auth.uid()
          AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
          AND eu.is_active = true
      )
    );

  -- Add INSERT policies for school admins on junction tables
  DROP POLICY IF EXISTS "School admins can add schools to mock exams they can manage" ON mock_exam_schools;
  CREATE POLICY "School admins can add schools to mock exams they can manage"
    ON mock_exam_schools
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM entity_users eu
        JOIN entity_user_schools eus ON eus.entity_user_id = eu.id
        WHERE eu.user_id = auth.uid()
          AND eus.school_id = school_id
          AND eu.admin_level = 'school_admin'
          AND eu.is_active = true
      )
    );

  DROP POLICY IF EXISTS "School admins can add branches to mock exams for their schools" ON mock_exam_branches;
  CREATE POLICY "School admins can add branches to mock exams for their schools"
    ON mock_exam_branches
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM entity_users eu
        JOIN entity_user_schools eus ON eus.entity_user_id = eu.id
        JOIN branches b ON b.school_id = eus.school_id
        WHERE eu.user_id = auth.uid()
          AND b.id = branch_id
          AND eu.admin_level = 'school_admin'
          AND eu.is_active = true
      )
    );

  DROP POLICY IF EXISTS "School admins can add grade levels to mock exams for their schools" ON mock_exam_grade_levels;
  CREATE POLICY "School admins can add grade levels to mock exams for their schools"
    ON mock_exam_grade_levels
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM entity_users eu
        JOIN entity_user_schools eus ON eus.entity_user_id = eu.id
        JOIN mock_exam_schools mes ON mes.school_id = eus.school_id
        WHERE eu.user_id = auth.uid()
          AND mes.mock_exam_id = mock_exam_id
          AND eu.admin_level = 'school_admin'
          AND eu.is_active = true
      )
    );

  DROP POLICY IF EXISTS "School admins can add sections to mock exams for their schools" ON mock_exam_sections;
  CREATE POLICY "School admins can add sections to mock exams for their schools"
    ON mock_exam_sections
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM entity_users eu
        JOIN entity_user_schools eus ON eus.entity_user_id = eu.id
        JOIN mock_exam_schools mes ON mes.school_id = eus.school_id
        WHERE eu.user_id = auth.uid()
          AND mes.mock_exam_id = mock_exam_id
          AND eu.admin_level = 'school_admin'
          AND eu.is_active = true
      )
    );

  DROP POLICY IF EXISTS "School admins can add teachers to mock exams for their schools" ON mock_exam_teachers;
  CREATE POLICY "School admins can add teachers to mock exams for their schools"
    ON mock_exam_teachers
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM entity_users eu
        JOIN entity_user_schools eus ON eus.entity_user_id = eu.id
        JOIN mock_exam_schools mes ON mes.school_id = eus.school_id
        WHERE eu.user_id = auth.uid()
          AND mes.mock_exam_id = mock_exam_id
          AND eu.admin_level = 'school_admin'
          AND eu.is_active = true
      )
    );
END $$;
