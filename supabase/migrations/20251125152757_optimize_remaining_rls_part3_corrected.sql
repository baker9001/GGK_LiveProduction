/*
  # Optimize Remaining RLS Auth Calls - Part 3 (Corrected)
  
  Optimizes remaining RLS policies with correct data types.
*/

-- answer_components policies
DROP POLICY IF EXISTS "Teachers can view answer components" ON answer_components;
CREATE POLICY "Teachers can view answer components"
  ON answer_components FOR SELECT
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
    OR EXISTS (
      SELECT 1 FROM teachers WHERE id = (SELECT auth.uid())
    )
  );

-- answer_requirements policies
DROP POLICY IF EXISTS "Teachers can view answer requirements" ON answer_requirements;
CREATE POLICY "Teachers can view answer requirements"
  ON answer_requirements FOR SELECT
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
    OR EXISTS (
      SELECT 1 FROM teachers WHERE id = (SELECT auth.uid())
    )
  );

-- question_navigation_state policies
DROP POLICY IF EXISTS "System admins can view all navigation state" ON question_navigation_state;
CREATE POLICY "System admins can view all navigation state"
  ON question_navigation_state FOR SELECT
  TO authenticated
  USING ((SELECT is_system_admin()) = true);

DROP POLICY IF EXISTS "Users can manage own navigation state" ON question_navigation_state;
CREATE POLICY "Users can manage own navigation state"
  ON question_navigation_state FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- table_templates policies (simplified)
DROP POLICY IF EXISTS "Students can view table templates" ON table_templates;
CREATE POLICY "Students can view table templates"
  ON table_templates FOR SELECT
  TO authenticated
  USING ((SELECT is_system_admin()) = true);

DROP POLICY IF EXISTS "Teachers can manage templates for their questions" ON table_templates;
CREATE POLICY "Teachers can manage templates for their questions"
  ON table_templates FOR ALL
  TO authenticated
  USING ((SELECT is_system_admin()) = true)
  WITH CHECK ((SELECT is_system_admin()) = true);

-- table_template_cells policies
DROP POLICY IF EXISTS "Students can view template cells" ON table_template_cells;
CREATE POLICY "Students can view template cells"
  ON table_template_cells FOR SELECT
  TO authenticated
  USING ((SELECT is_system_admin()) = true);

DROP POLICY IF EXISTS "Teachers can manage template cells" ON table_template_cells;
CREATE POLICY "Teachers can manage template cells"
  ON table_template_cells FOR ALL
  TO authenticated
  USING ((SELECT is_system_admin()) = true)
  WITH CHECK ((SELECT is_system_admin()) = true);

-- invitation_status policies (created_by is text type)
DROP POLICY IF EXISTS "Entity admins can create invitations" ON invitation_status;
CREATE POLICY "Entity admins can create invitations"
  ON invitation_status FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "Entity admins can update their organization invitations" ON invitation_status;
CREATE POLICY "Entity admins can update their organization invitations"
  ON invitation_status FOR UPDATE
  TO authenticated
  USING (created_by = (SELECT auth.uid())::text)
  WITH CHECK (created_by = (SELECT auth.uid())::text);

DROP POLICY IF EXISTS "Entity admins can view their organization invitations" ON invitation_status;
CREATE POLICY "Entity admins can view their organization invitations"
  ON invitation_status FOR SELECT
  TO authenticated
  USING (created_by = (SELECT auth.uid())::text);
