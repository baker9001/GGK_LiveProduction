/*
  # Add System Admin Policies to Configuration and Junction Tables

  ## Overview
  Adds comprehensive system admin (admin_users) policies to configuration tables
  (academic years, grade levels, sections) and all junction/relationship tables.

  ## Tables Updated
  1. **academic_years** - Academic year configurations
  2. **grade_levels** - Grade/year level configurations
  3. **class_sections** - Class sections
  4. **entity_user_schools** - Entity user to school assignments
  5. **entity_user_branches** - Entity user to branch assignments
  6. **department_branches** - Department to branch mappings
  7. **department_schools** - Department to school mappings
  8. **grade_level_branches** - Grade level to branch mappings
  9. **grade_level_schools** - Grade level to school mappings
  10. **grade_level_departments** - Grade level to department mappings
  11. **class_section_departments** - Class section to department mappings
  12. **academic_year_schools** - Academic year to school mappings

  ## Security Model
  - System admins get full access to all configuration and junction data
  - Existing company-scoped policies remain active
  - System admin policies enable platform-wide configuration management
*/

-- ============================================================================
-- ACADEMIC_YEARS TABLE
-- ============================================================================

CREATE POLICY "System admins can view all academic years"
  ON academic_years FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create academic years"
  ON academic_years FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all academic years"
  ON academic_years FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete academic years"
  ON academic_years FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- GRADE_LEVELS TABLE
-- ============================================================================

CREATE POLICY "System admins can view all grade levels"
  ON grade_levels FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create grade levels"
  ON grade_levels FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all grade levels"
  ON grade_levels FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete grade levels"
  ON grade_levels FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- CLASS_SECTIONS TABLE
-- ============================================================================

CREATE POLICY "System admins can view all class sections"
  ON class_sections FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create class sections"
  ON class_sections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all class sections"
  ON class_sections FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete class sections"
  ON class_sections FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- ENTITY_USER_SCHOOLS TABLE
-- ============================================================================

CREATE POLICY "System admins can view all entity user schools"
  ON entity_user_schools FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create entity user schools"
  ON entity_user_schools FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all entity user schools"
  ON entity_user_schools FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete entity user schools"
  ON entity_user_schools FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- ENTITY_USER_BRANCHES TABLE
-- ============================================================================

CREATE POLICY "System admins can view all entity user branches"
  ON entity_user_branches FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create entity user branches"
  ON entity_user_branches FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all entity user branches"
  ON entity_user_branches FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete entity user branches"
  ON entity_user_branches FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- DEPARTMENT_BRANCHES TABLE
-- ============================================================================

CREATE POLICY "System admins can view all department branches"
  ON department_branches FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create department branches"
  ON department_branches FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all department branches"
  ON department_branches FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete department branches"
  ON department_branches FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- DEPARTMENT_SCHOOLS TABLE
-- ============================================================================

CREATE POLICY "System admins can view all department schools"
  ON department_schools FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create department schools"
  ON department_schools FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all department schools"
  ON department_schools FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete department schools"
  ON department_schools FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- GRADE_LEVEL_BRANCHES TABLE
-- ============================================================================

CREATE POLICY "System admins can view all grade level branches"
  ON grade_level_branches FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create grade level branches"
  ON grade_level_branches FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all grade level branches"
  ON grade_level_branches FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete grade level branches"
  ON grade_level_branches FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- GRADE_LEVEL_SCHOOLS TABLE
-- ============================================================================

CREATE POLICY "System admins can view all grade level schools"
  ON grade_level_schools FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create grade level schools"
  ON grade_level_schools FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all grade level schools"
  ON grade_level_schools FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete grade level schools"
  ON grade_level_schools FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- GRADE_LEVEL_DEPARTMENTS TABLE
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'grade_level_departments') THEN
    EXECUTE '
      CREATE POLICY "System admins can view all grade level departments"
        ON grade_level_departments FOR SELECT TO authenticated
        USING (auth.uid() IN (SELECT id FROM admin_users));

      CREATE POLICY "System admins can create grade level departments"
        ON grade_level_departments FOR INSERT TO authenticated
        WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

      CREATE POLICY "System admins can update all grade level departments"
        ON grade_level_departments FOR UPDATE TO authenticated
        USING (auth.uid() IN (SELECT id FROM admin_users))
        WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

      CREATE POLICY "System admins can delete grade level departments"
        ON grade_level_departments FOR DELETE TO authenticated
        USING (auth.uid() IN (SELECT id FROM admin_users));
    ';
  END IF;
END $$;

-- ============================================================================
-- CLASS_SECTION_DEPARTMENTS TABLE
-- ============================================================================

CREATE POLICY "System admins can view all class section departments"
  ON class_section_departments FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create class section departments"
  ON class_section_departments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all class section departments"
  ON class_section_departments FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete class section departments"
  ON class_section_departments FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- ACADEMIC_YEAR_SCHOOLS TABLE
-- ============================================================================

CREATE POLICY "System admins can view all academic year schools"
  ON academic_year_schools FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create academic year schools"
  ON academic_year_schools FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all academic year schools"
  ON academic_year_schools FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete academic year schools"
  ON academic_year_schools FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));
