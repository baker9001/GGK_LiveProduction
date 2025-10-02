/*
  # Fix Grade Levels and School Associations for Mock Exam Form
  
  ## Problem Analysis
  The mock exam form cannot fetch grade levels (year groups) or class sections because:
  1. The `grade_level_schools` junction table is completely empty (0 records)
  2. Grade levels exist but are not associated with any schools
  3. Without this association, the form query returns no results
  
  ## Root Cause
  - grade_levels table: 16 records with school_id = NULL
  - grade_level_schools table: 0 records (should link grades to schools)
  - class_sections table: 80 records linked to grades
  
  ## Solution Strategy
  1. Associate all existing grade levels with all active schools
     (This allows any school to use any grade level - typical for multi-school entities)
  2. Add improved RLS policies that work with the new data structure
  3. Add helper function to simplify grade level access checks
  4. Create indexes for performance
  
  ## Data Changes
  - Populate grade_level_schools junction table
  - Update RLS policies to be non-recursive
  - Add performance indexes
  
  ## Tables Modified
  - grade_level_schools: Populate with school-grade associations
  - RLS policies: Simplified to avoid recursion
*/

-- ============================================================================
-- STEP 1: Create Helper Function for Grade Level Access
-- ============================================================================

CREATE OR REPLACE FUNCTION can_access_grade_levels_for_schools(
  check_user_id UUID,
  check_school_ids UUID[]
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  -- System admins can access all
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE id = check_user_id
  ) OR EXISTS (
    -- Entity users can access grades for schools in their company
    SELECT 1
    FROM entity_users eu
    JOIN schools s ON s.company_id = eu.company_id
    WHERE eu.user_id = check_user_id
      AND eu.is_active = true
      AND s.id = ANY(check_school_ids)
  );
$$;

GRANT EXECUTE ON FUNCTION can_access_grade_levels_for_schools(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION can_access_grade_levels_for_schools(UUID, UUID[]) TO service_role;

COMMENT ON FUNCTION can_access_grade_levels_for_schools(UUID, UUID[]) IS
  'Checks if user can access grade levels for specific schools. Uses SECURITY DEFINER to avoid RLS recursion.';

-- ============================================================================
-- STEP 2: Populate grade_level_schools Junction Table
-- ============================================================================

-- Associate all existing grade levels with all active schools
-- This is appropriate for entity-wide grade levels that any school can use
INSERT INTO grade_level_schools (grade_level_id, school_id)
SELECT DISTINCT 
  gl.id as grade_level_id,
  s.id as school_id
FROM grade_levels gl
CROSS JOIN schools s
WHERE s.status = 'active'
  AND gl.status = 'active'
  -- Only insert if the association doesn't already exist
  AND NOT EXISTS (
    SELECT 1 
    FROM grade_level_schools gls 
    WHERE gls.grade_level_id = gl.id 
      AND gls.school_id = s.id
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 3: Update RLS Policies on grade_level_schools
-- ============================================================================

-- Drop existing recursive policy
DROP POLICY IF EXISTS "Company members can manage grade level schools" ON grade_level_schools;

-- Create new simple policies
CREATE POLICY "System admins full access to grade_level_schools"
  ON grade_level_schools FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Entity users view grade_level_schools in company"
  ON grade_level_schools FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM schools s
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE s.id = grade_level_schools.school_id
        AND eu.user_id = auth.uid()
        AND eu.is_active = true
    )
  );

CREATE POLICY "Entity users manage grade_level_schools in company"
  ON grade_level_schools FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM schools s
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE s.id = grade_level_schools.school_id
        AND eu.user_id = auth.uid()
        AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
        AND eu.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM schools s
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE s.id = grade_level_schools.school_id
        AND eu.user_id = auth.uid()
        AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
        AND eu.is_active = true
    )
  );

-- ============================================================================
-- STEP 4: Update RLS Policies on grade_levels
-- ============================================================================

-- Drop existing recursive policy
DROP POLICY IF EXISTS "Entity users manage grade levels in company" ON grade_levels;

-- Create new simple policies
CREATE POLICY "System admins full access to grade_levels"
  ON grade_levels FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Entity users view grade_levels in company"
  ON grade_levels FOR SELECT TO authenticated
  USING (
    -- Can view if grade is associated with a school in their company
    EXISTS (
      SELECT 1
      FROM grade_level_schools gls
      JOIN schools s ON s.id = gls.school_id
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE gls.grade_level_id = grade_levels.id
        AND eu.user_id = auth.uid()
        AND eu.is_active = true
    )
    -- OR can view if grade has direct school_id in their company
    OR EXISTS (
      SELECT 1
      FROM schools s
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE s.id = grade_levels.school_id
        AND eu.user_id = auth.uid()
        AND eu.is_active = true
    )
  );

CREATE POLICY "Entity admins manage grade_levels in company"
  ON grade_levels FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM schools s
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE (s.id = grade_levels.school_id OR grade_levels.school_id IS NULL)
        AND eu.user_id = auth.uid()
        AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
        AND eu.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM schools s
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE (s.id = grade_levels.school_id OR grade_levels.school_id IS NULL)
        AND eu.user_id = auth.uid()
        AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
        AND eu.is_active = true
    )
  );

-- ============================================================================
-- STEP 5: Update RLS Policies on class_sections
-- ============================================================================

-- Drop existing recursive policy
DROP POLICY IF EXISTS "Entity users manage class sections in scope" ON class_sections;

-- Create new simple policies
CREATE POLICY "System admins full access to class_sections"
  ON class_sections FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Entity users view class_sections in company"
  ON class_sections FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM grade_levels gl
      JOIN grade_level_schools gls ON gls.grade_level_id = gl.id
      JOIN schools s ON s.id = gls.school_id
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE gl.id = class_sections.grade_level_id
        AND eu.user_id = auth.uid()
        AND eu.is_active = true
    )
  );

CREATE POLICY "Entity admins manage class_sections in company"
  ON class_sections FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM grade_levels gl
      JOIN grade_level_schools gls ON gls.grade_level_id = gl.id
      JOIN schools s ON s.id = gls.school_id
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE gl.id = class_sections.grade_level_id
        AND eu.user_id = auth.uid()
        AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
        AND eu.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM grade_levels gl
      JOIN grade_level_schools gls ON gls.grade_level_id = gl.id
      JOIN schools s ON s.id = gls.school_id
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE gl.id = class_sections.grade_level_id
        AND eu.user_id = auth.uid()
        AND eu.admin_level IN ('entity_admin', 'sub_entity_admin')
        AND eu.is_active = true
    )
  );

-- ============================================================================
-- STEP 6: Add Performance Indexes
-- ============================================================================

-- Index for grade_level_schools lookups by school
CREATE INDEX IF NOT EXISTS idx_grade_level_schools_school_id 
  ON grade_level_schools(school_id);

-- Index for grade_level_schools lookups by grade_level
CREATE INDEX IF NOT EXISTS idx_grade_level_schools_grade_level_id 
  ON grade_level_schools(grade_level_id);

-- Index for grade_levels lookups by school
CREATE INDEX IF NOT EXISTS idx_grade_levels_school_id 
  ON grade_levels(school_id) WHERE school_id IS NOT NULL;

-- Index for class_sections lookups by grade_level
CREATE INDEX IF NOT EXISTS idx_class_sections_grade_level_id 
  ON class_sections(grade_level_id);

-- ============================================================================
-- STEP 7: Service Role Bypass Policies
-- ============================================================================

CREATE POLICY "Service role full access to grade_level_schools"
  ON grade_level_schools FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to grade_levels"
  ON grade_levels FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to class_sections"
  ON class_sections FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- STEP 8: Verification
-- ============================================================================

DO $$
DECLARE
  junction_count INTEGER;
  grade_levels_count INTEGER;
  class_sections_count INTEGER;
  schools_count INTEGER;
BEGIN
  -- Count junction records
  SELECT COUNT(*) INTO junction_count FROM grade_level_schools;
  
  -- Count grades
  SELECT COUNT(*) INTO grade_levels_count FROM grade_levels;
  
  -- Count sections
  SELECT COUNT(*) INTO class_sections_count FROM class_sections;
  
  -- Count active schools
  SELECT COUNT(*) INTO schools_count FROM schools WHERE status = 'active';

  RAISE NOTICE '============================================';
  RAISE NOTICE 'GRADE LEVELS & SECTIONS FIX COMPLETED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Junction records created: %', junction_count;
  RAISE NOTICE 'Grade levels available: %', grade_levels_count;
  RAISE NOTICE 'Class sections available: %', class_sections_count;
  RAISE NOTICE 'Active schools: %', schools_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Changes Applied:';
  RAISE NOTICE '✓ Populated grade_level_schools junction table';
  RAISE NOTICE '✓ Updated RLS policies to be non-recursive';
  RAISE NOTICE '✓ Added performance indexes';
  RAISE NOTICE '✓ Created helper function for access checks';
  RAISE NOTICE '';
  RAISE NOTICE 'Mock exam form should now load grades and sections!';
END $$;
