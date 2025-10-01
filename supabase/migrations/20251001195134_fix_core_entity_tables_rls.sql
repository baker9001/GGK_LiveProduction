/*
  # Fix Core Entity Tables RLS - Remove USING (true) Policies

  ## Critical Security Fix
  Replaces overly permissive "USING (true)" policies on core entity tables
  with proper company-scoped access control through entity_users.

  ## Tables Fixed
  - companies: Now restricted to users in entity_users for that company
  - schools: Restricted to entity/school admins in their scope
  - branches: Restricted to entity/school/branch admins in their scope
  
  ## Security Model
  - Access is scoped through entity_users.company_id
  - Entity admins: Full company access
  - School admins: Their assigned schools only
  - Branch admins: Their assigned branches only
*/

-- ============================================================================
-- COMPANIES TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Allow full access to authenticated users on companies" ON companies;

CREATE POLICY "Entity users can manage their company"
  ON companies FOR ALL TO authenticated
  USING (
    id IN (SELECT company_id FROM entity_users WHERE user_id = auth.uid() AND is_active = true)
  )
  WITH CHECK (
    id IN (SELECT company_id FROM entity_users WHERE user_id = auth.uid() AND is_active = true)
  );

-- ============================================================================
-- SCHOOLS TABLE
-- ============================================================================

DROP POLICY IF EXISTS "Allow full access to authenticated users on schools" ON schools;

CREATE POLICY "Entity admins manage schools in company"
  ON schools FOR ALL TO authenticated
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

CREATE POLICY "School admins manage assigned schools"
  ON schools FOR ALL TO authenticated
  USING (
    id IN (
      SELECT eus.school_id FROM entity_user_schools eus
      JOIN entity_users eu ON eu.id = eus.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  )
  WITH CHECK (
    id IN (
      SELECT eus.school_id FROM entity_user_schools eus
      JOIN entity_users eu ON eu.id = eus.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  );

-- ============================================================================
-- BRANCHES TABLE
-- ============================================================================

-- No existing "allow full access" policy to drop

CREATE POLICY "Entity/school admins manage branches in scope"
  ON branches FOR ALL TO authenticated
  USING (
    school_id IN (
      SELECT s.id FROM schools s
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
        AND eu.is_active = true
    )
    OR school_id IN (
      SELECT eus.school_id FROM entity_user_schools eus
      JOIN entity_users eu ON eu.id = eus.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT s.id FROM schools s
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
        AND eu.is_active = true
    )
    OR school_id IN (
      SELECT eus.school_id FROM entity_user_schools eus
      JOIN entity_users eu ON eu.id = eus.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'school_admin'
        AND eu.is_active = true
    )
  );

CREATE POLICY "Branch admins manage assigned branches"
  ON branches FOR ALL TO authenticated
  USING (
    id IN (
      SELECT eub.branch_id FROM entity_user_branches eub
      JOIN entity_users eu ON eu.id = eub.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'branch_admin'
        AND eu.is_active = true
    )
  )
  WITH CHECK (
    id IN (
      SELECT eub.branch_id FROM entity_user_branches eub
      JOIN entity_users eu ON eu.id = eub.entity_user_id
      WHERE eu.user_id = auth.uid()
        AND eu.admin_level = 'branch_admin'
        AND eu.is_active = true
    )
  );
