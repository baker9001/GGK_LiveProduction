/*
  # Optimize RLS Auth Calls - Templates & Components (Simplified)

  1. Performance Optimization
    - Wrap auth calls in SELECT for templates and answer components
    - Prevents re-evaluation for each row

  2. Tables Optimized
    - table_templates, table_template_cells
    - invitation_status, answer_components, answer_requirements
*/

-- Table Templates: System admin access
DROP POLICY IF EXISTS "System admins have full access to table templates" ON table_templates;
CREATE POLICY "System admins have full access to table templates"
  ON table_templates FOR ALL
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
  );

-- Table Template Cells: System admin access
DROP POLICY IF EXISTS "System admins have full access to template cells" ON table_template_cells;
CREATE POLICY "System admins have full access to template cells"
  ON table_template_cells FOR ALL
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
  );

-- Invitation Status: System admin policies
DROP POLICY IF EXISTS "System admins can insert invitation records" ON invitation_status;
CREATE POLICY "System admins can insert invitation records"
  ON invitation_status FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT is_system_admin()) = true
  );

DROP POLICY IF EXISTS "System admins can update invitation statuses" ON invitation_status;
CREATE POLICY "System admins can update invitation statuses"
  ON invitation_status FOR UPDATE
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
  );

DROP POLICY IF EXISTS "System admins can view all invitation statuses" ON invitation_status;
CREATE POLICY "System admins can view all invitation statuses"
  ON invitation_status FOR SELECT
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
  );

-- Answer Components: Optimize policies
DROP POLICY IF EXISTS "System admins can manage answer components" ON answer_components;
CREATE POLICY "System admins can manage answer components"
  ON answer_components FOR ALL
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
  );

-- Answer Requirements: Optimize policies
DROP POLICY IF EXISTS "System admins can manage answer requirements" ON answer_requirements;
CREATE POLICY "System admins can manage answer requirements"
  ON answer_requirements FOR ALL
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
  );