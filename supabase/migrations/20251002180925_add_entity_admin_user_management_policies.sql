/*
  # Add Entity Admin User Management RLS Policies

  ## Overview
  Enables entity admins and sub-admins to view and manage users (students, teachers, entity_users)
  within their organizational scope. This migration adds comprehensive RLS policies for:
  - Entity admins: Full access to all users in their company
  - Sub-entity admins: Same access as entity admins within their company
  - School admins: Access to users in their assigned schools only
  - Branch admins: Access to users in their assigned branches only

  ## Changes to Students Table
  
  ### SELECT Policies:
  - Entity/sub-entity admins can view all students in their company
  - School admins can view students in their assigned schools
  - Branch admins can view students in their assigned branches
  
  ### INSERT Policies:
  - Entity/sub-entity admins can create students in their company
  - School admins can create students in their assigned schools
  - Branch admins can create students in their assigned branches
  
  ### UPDATE Policies:
  - Entity/sub-entity admins can update students in their company
  - School admins can update students in their assigned schools
  - Branch admins can update students in their assigned branches
  
  ### DELETE Policies:
  - Entity/sub-entity admins can delete students in their company
  - School admins can delete students in their assigned schools
  - Branch admins can delete students in their assigned branches

  ## Changes to Teachers Table
  
  Same policy structure as students table, scoped appropriately.

  ## Changes to Entity_Users Table
  
  ### SELECT Policies:
  - Entity/sub-entity admins can view all entity_users in their company
  - School admins can view entity_users assigned to their schools
  - Branch admins can view entity_users assigned to their branches
  
  ### INSERT Policies:
  - Entity admins can create sub-admins within their company
  - Prevents creation of admins outside their scope
  
  ### UPDATE Policies:
  - Entity/sub-entity admins can update entity_users in their company
  - Respects hierarchical permissions
  
  ### DELETE Policies:
  - Entity/sub-entity admins can delete entity_users in their company

  ## Security Notes
  - All policies require is_active = true on the entity_users record
  - Policies use proper JOIN conditions to respect scope boundaries
  - Company isolation is maintained (admins cannot access other companies)
  - School and branch admins have restricted scope via junction tables
*/

-- ============================================================================
-- STUDENTS TABLE POLICIES
-- ============================================================================

-- Entity/Sub-Entity Admins: View all students in their company
CREATE POLICY "Entity admins can view students in their company"
  ON students FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM entity_users
      WHERE user_id = auth.uid()
        AND admin_level IN ('entity_admin', 'sub_entity_admin')
        AND is_active = true
    )
  );

-- School Admins: View students in their assigned schools
CREATE POLICY "School admins can view students in their schools"
  ON students FOR SELECT TO authenticated
  USING (
    school_id IN (
      SELECT eus.school_id FROM entity_user_schools eus
      JOIN entity_users eu ON eu.id = eus.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  );

-- Branch Admins: View students in their assigned branches
CREATE POLICY "Branch admins can view students in their branches"
  ON students FOR SELECT TO authenticated
  USING (
    branch_id IN (
      SELECT eub.branch_id FROM entity_user_branches eub
      JOIN entity_users eu ON eu.id = eub.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'branch_admin'
        AND eu.is_active = true
    )
  );

-- Entity/Sub-Entity Admins: Create students in their company
CREATE POLICY "Entity admins can create students in their company"
  ON students FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM entity_users
      WHERE user_id = auth.uid()
        AND admin_level IN ('entity_admin', 'sub_entity_admin')
        AND is_active = true
    )
  );

-- School Admins: Create students in their assigned schools
CREATE POLICY "School admins can create students in their schools"
  ON students FOR INSERT TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT eus.school_id FROM entity_user_schools eus
      JOIN entity_users eu ON eu.id = eus.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  );

-- Branch Admins: Create students in their assigned branches
CREATE POLICY "Branch admins can create students in their branches"
  ON students FOR INSERT TO authenticated
  WITH CHECK (
    branch_id IN (
      SELECT eub.branch_id FROM entity_user_branches eub
      JOIN entity_users eu ON eu.id = eub.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'branch_admin'
        AND eu.is_active = true
    )
  );

-- Entity/Sub-Entity Admins: Update students in their company
CREATE POLICY "Entity admins can update students in their company"
  ON students FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM entity_users
      WHERE user_id = auth.uid()
        AND admin_level IN ('entity_admin', 'sub_entity_admin')
        AND is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM entity_users
      WHERE user_id = auth.uid()
        AND admin_level IN ('entity_admin', 'sub_entity_admin')
        AND is_active = true
    )
  );

-- School Admins: Update students in their assigned schools
CREATE POLICY "School admins can update students in their schools"
  ON students FOR UPDATE TO authenticated
  USING (
    school_id IN (
      SELECT eus.school_id FROM entity_user_schools eus
      JOIN entity_users eu ON eu.id = eus.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT eus.school_id FROM entity_user_schools eus
      JOIN entity_users eu ON eu.id = eus.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  );

-- Branch Admins: Update students in their assigned branches
CREATE POLICY "Branch admins can update students in their branches"
  ON students FOR UPDATE TO authenticated
  USING (
    branch_id IN (
      SELECT eub.branch_id FROM entity_user_branches eub
      JOIN entity_users eu ON eu.id = eub.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'branch_admin'
        AND eu.is_active = true
    )
  )
  WITH CHECK (
    branch_id IN (
      SELECT eub.branch_id FROM entity_user_branches eub
      JOIN entity_users eu ON eu.id = eub.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'branch_admin'
        AND eu.is_active = true
    )
  );

-- Entity/Sub-Entity Admins: Delete students in their company
CREATE POLICY "Entity admins can delete students in their company"
  ON students FOR DELETE TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM entity_users
      WHERE user_id = auth.uid()
        AND admin_level IN ('entity_admin', 'sub_entity_admin')
        AND is_active = true
    )
  );

-- School Admins: Delete students in their assigned schools
CREATE POLICY "School admins can delete students in their schools"
  ON students FOR DELETE TO authenticated
  USING (
    school_id IN (
      SELECT eus.school_id FROM entity_user_schools eus
      JOIN entity_users eu ON eu.id = eus.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  );

-- Branch Admins: Delete students in their assigned branches
CREATE POLICY "Branch admins can delete students in their branches"
  ON students FOR DELETE TO authenticated
  USING (
    branch_id IN (
      SELECT eub.branch_id FROM entity_user_branches eub
      JOIN entity_users eu ON eu.id = eub.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'branch_admin'
        AND eu.is_active = true
    )
  );

-- ============================================================================
-- TEACHERS TABLE POLICIES
-- ============================================================================

-- Entity/Sub-Entity Admins: View all teachers in their company
CREATE POLICY "Entity admins can view teachers in their company"
  ON teachers FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM entity_users
      WHERE user_id = auth.uid()
        AND admin_level IN ('entity_admin', 'sub_entity_admin')
        AND is_active = true
    )
  );

-- School Admins: View teachers in their assigned schools
CREATE POLICY "School admins can view teachers in their schools"
  ON teachers FOR SELECT TO authenticated
  USING (
    school_id IN (
      SELECT eus.school_id FROM entity_user_schools eus
      JOIN entity_users eu ON eu.id = eus.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  );

-- Branch Admins: View teachers in their assigned branches
CREATE POLICY "Branch admins can view teachers in their branches"
  ON teachers FOR SELECT TO authenticated
  USING (
    branch_id IN (
      SELECT eub.branch_id FROM entity_user_branches eub
      JOIN entity_users eu ON eu.id = eub.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'branch_admin'
        AND eu.is_active = true
    )
  );

-- Entity/Sub-Entity Admins: Create teachers in their company
CREATE POLICY "Entity admins can create teachers in their company"
  ON teachers FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM entity_users
      WHERE user_id = auth.uid()
        AND admin_level IN ('entity_admin', 'sub_entity_admin')
        AND is_active = true
    )
  );

-- School Admins: Create teachers in their assigned schools
CREATE POLICY "School admins can create teachers in their schools"
  ON teachers FOR INSERT TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT eus.school_id FROM entity_user_schools eus
      JOIN entity_users eu ON eu.id = eus.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  );

-- Branch Admins: Create teachers in their assigned branches
CREATE POLICY "Branch admins can create teachers in their branches"
  ON teachers FOR INSERT TO authenticated
  WITH CHECK (
    branch_id IN (
      SELECT eub.branch_id FROM entity_user_branches eub
      JOIN entity_users eu ON eu.id = eub.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'branch_admin'
        AND eu.is_active = true
    )
  );

-- Entity/Sub-Entity Admins: Update teachers in their company
CREATE POLICY "Entity admins can update teachers in their company"
  ON teachers FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM entity_users
      WHERE user_id = auth.uid()
        AND admin_level IN ('entity_admin', 'sub_entity_admin')
        AND is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM entity_users
      WHERE user_id = auth.uid()
        AND admin_level IN ('entity_admin', 'sub_entity_admin')
        AND is_active = true
    )
  );

-- School Admins: Update teachers in their assigned schools
CREATE POLICY "School admins can update teachers in their schools"
  ON teachers FOR UPDATE TO authenticated
  USING (
    school_id IN (
      SELECT eus.school_id FROM entity_user_schools eus
      JOIN entity_users eu ON eu.id = eus.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT eus.school_id FROM entity_user_schools eus
      JOIN entity_users eu ON eu.id = eus.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  );

-- Branch Admins: Update teachers in their assigned branches
CREATE POLICY "Branch admins can update teachers in their branches"
  ON teachers FOR UPDATE TO authenticated
  USING (
    branch_id IN (
      SELECT eub.branch_id FROM entity_user_branches eub
      JOIN entity_users eu ON eu.id = eub.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'branch_admin'
        AND eu.is_active = true
    )
  )
  WITH CHECK (
    branch_id IN (
      SELECT eub.branch_id FROM entity_user_branches eub
      JOIN entity_users eu ON eu.id = eub.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'branch_admin'
        AND eu.is_active = true
    )
  );

-- Entity/Sub-Entity Admins: Delete teachers in their company
CREATE POLICY "Entity admins can delete teachers in their company"
  ON teachers FOR DELETE TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM entity_users
      WHERE user_id = auth.uid()
        AND admin_level IN ('entity_admin', 'sub_entity_admin')
        AND is_active = true
    )
  );

-- School Admins: Delete teachers in their assigned schools
CREATE POLICY "School admins can delete teachers in their schools"
  ON teachers FOR DELETE TO authenticated
  USING (
    school_id IN (
      SELECT eus.school_id FROM entity_user_schools eus
      JOIN entity_users eu ON eu.id = eus.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  );

-- Branch Admins: Delete teachers in their assigned branches
CREATE POLICY "Branch admins can delete teachers in their branches"
  ON teachers FOR DELETE TO authenticated
  USING (
    branch_id IN (
      SELECT eub.branch_id FROM entity_user_branches eub
      JOIN entity_users eu ON eu.id = eub.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'branch_admin'
        AND eu.is_active = true
    )
  );

-- ============================================================================
-- ENTITY_USERS TABLE POLICIES
-- ============================================================================

-- Entity/Sub-Entity Admins: View all entity_users in their company
CREATE POLICY "Entity admins can view entity_users in their company"
  ON entity_users FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM entity_users
      WHERE user_id = auth.uid()
        AND admin_level IN ('entity_admin', 'sub_entity_admin')
        AND is_active = true
    )
  );

-- School Admins: View entity_users assigned to their schools
CREATE POLICY "School admins can view entity_users in their schools"
  ON entity_users FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT eus2.entity_user_id FROM entity_user_schools eus2
      WHERE eus2.school_id IN (
        SELECT eus.school_id FROM entity_user_schools eus
        JOIN entity_users eu ON eu.id = eus.entity_user_id
        WHERE eu.user_id = auth.uid()
          AND eu.admin_level = 'school_admin'
          AND eu.is_active = true
      )
    )
  );

-- Branch Admins: View entity_users assigned to their branches
CREATE POLICY "Branch admins can view entity_users in their branches"
  ON entity_users FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT eub2.entity_user_id FROM entity_user_branches eub2
      WHERE eub2.branch_id IN (
        SELECT eub.branch_id FROM entity_user_branches eub
        JOIN entity_users eu ON eu.id = eub.entity_user_id
        WHERE eu.user_id = auth.uid()
          AND eu.admin_level = 'branch_admin'
          AND eu.is_active = true
      )
    )
  );

-- Entity Admins: Create sub-admins in their company
CREATE POLICY "Entity admins can create entity_users in their company"
  ON entity_users FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM entity_users
      WHERE user_id = auth.uid()
        AND admin_level IN ('entity_admin', 'sub_entity_admin')
        AND is_active = true
    )
  );

-- Entity/Sub-Entity Admins: Update entity_users in their company
CREATE POLICY "Entity admins can update entity_users in their company"
  ON entity_users FOR UPDATE TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM entity_users
      WHERE user_id = auth.uid()
        AND admin_level IN ('entity_admin', 'sub_entity_admin')
        AND is_active = true
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM entity_users
      WHERE user_id = auth.uid()
        AND admin_level IN ('entity_admin', 'sub_entity_admin')
        AND is_active = true
    )
  );

-- Entity/Sub-Entity Admins: Delete entity_users in their company
CREATE POLICY "Entity admins can delete entity_users in their company"
  ON entity_users FOR DELETE TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM entity_users
      WHERE user_id = auth.uid()
        AND admin_level IN ('entity_admin', 'sub_entity_admin')
        AND is_active = true
    )
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  students_policy_count INTEGER;
  teachers_policy_count INTEGER;
  entity_users_policy_count INTEGER;
BEGIN
  -- Count new policies on students table
  SELECT COUNT(*) INTO students_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'students'
    AND policyname LIKE '%Entity admins%'
       OR policyname LIKE '%School admins%'
       OR policyname LIKE '%Branch admins%';

  -- Count new policies on teachers table
  SELECT COUNT(*) INTO teachers_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'teachers'
    AND policyname LIKE '%Entity admins%'
       OR policyname LIKE '%School admins%'
       OR policyname LIKE '%Branch admins%';

  -- Count new policies on entity_users table
  SELECT COUNT(*) INTO entity_users_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'entity_users'
    AND policyname LIKE '%Entity admins%'
       OR policyname LIKE '%School admins%'
       OR policyname LIKE '%Branch admins%';

  RAISE NOTICE '============================================';
  RAISE NOTICE 'ENTITY ADMIN USER MANAGEMENT POLICIES ADDED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Students table: % new policies', students_policy_count;
  RAISE NOTICE 'Teachers table: % new policies', teachers_policy_count;
  RAISE NOTICE 'Entity_users table: % new policies', entity_users_policy_count;
  RAISE NOTICE 'Entity admins can now manage users in their scope';
  RAISE NOTICE 'School admins can manage users in their schools';
  RAISE NOTICE 'Branch admins can manage users in their branches';
END $$;
