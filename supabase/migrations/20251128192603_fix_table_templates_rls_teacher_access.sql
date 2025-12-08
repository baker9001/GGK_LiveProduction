/*
  # Fix Table Templates RLS Policies for Teacher Access

  ## Problem
  Previous optimization migration incorrectly restricted table_templates and
  table_template_cells access to ONLY system admins, breaking teacher access.

  Teachers need to create and manage table completion templates for their questions.

  ## Changes
  1. Restore proper RLS policies for teachers on table_templates
  2. Restore proper RLS policies for teachers on table_template_cells
  3. Fix student view policies

  ## Security
  - System admins: Full access (unchanged)
  - Teachers: Can create/update/delete templates (RESTORED)
  - Students: Can view templates for answering questions (FIXED)
*/

-- ============================================================================
-- table_templates RLS Policies
-- ============================================================================

-- Drop broken policies
DROP POLICY IF EXISTS "Students can view table templates" ON table_templates;
DROP POLICY IF EXISTS "Teachers can manage templates for their questions" ON table_templates;

-- System admin policy (already correct, recreate for consistency)
DROP POLICY IF EXISTS "System admins have full access to table templates" ON table_templates;
CREATE POLICY "System admins have full access to table templates"
  ON table_templates FOR ALL
  TO authenticated
  USING ((SELECT is_system_admin()) = true)
  WITH CHECK ((SELECT is_system_admin()) = true);

-- FIXED: Teachers can create/manage templates
CREATE POLICY "Teachers can manage templates for their questions"
  ON table_templates FOR ALL
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
    OR EXISTS (
      SELECT 1 FROM users u
      INNER JOIN teachers t ON t.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
      AND u.is_active = true
      AND t.is_active = true
    )
  )
  WITH CHECK (
    (SELECT is_system_admin()) = true
    OR EXISTS (
      SELECT 1 FROM users u
      INNER JOIN teachers t ON t.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
      AND u.is_active = true
      AND t.is_active = true
    )
  );

-- FIXED: Students can view templates (for answering questions)
CREATE POLICY "Students can view table templates"
  ON table_templates FOR SELECT
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
    OR EXISTS (
      SELECT 1 FROM users u
      INNER JOIN students s ON s.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
      AND u.is_active = true
    )
  );

-- ============================================================================
-- table_template_cells RLS Policies
-- ============================================================================

-- Drop broken policies
DROP POLICY IF EXISTS "Students can view template cells" ON table_template_cells;
DROP POLICY IF EXISTS "Teachers can manage template cells" ON table_template_cells;

-- System admin policy (already correct, recreate for consistency)
DROP POLICY IF EXISTS "System admins have full access to template cells" ON table_template_cells;
CREATE POLICY "System admins have full access to template cells"
  ON table_template_cells FOR ALL
  TO authenticated
  USING ((SELECT is_system_admin()) = true)
  WITH CHECK ((SELECT is_system_admin()) = true);

-- FIXED: Teachers can create/manage template cells
CREATE POLICY "Teachers can manage template cells"
  ON table_template_cells FOR ALL
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
    OR EXISTS (
      SELECT 1 FROM users u
      INNER JOIN teachers t ON t.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
      AND u.is_active = true
      AND t.is_active = true
    )
  )
  WITH CHECK (
    (SELECT is_system_admin()) = true
    OR EXISTS (
      SELECT 1 FROM users u
      INNER JOIN teachers t ON t.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
      AND u.is_active = true
      AND t.is_active = true
    )
  );

-- FIXED: Students can view template cells (for answering questions)
CREATE POLICY "Students can view template cells"
  ON table_template_cells FOR SELECT
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
    OR EXISTS (
      SELECT 1 FROM users u
      INNER JOIN students s ON s.user_id = u.id
      WHERE u.auth_user_id = (SELECT auth.uid())
      AND u.is_active = true
    )
  );
