/*
  # Optimize RLS Auth Calls - System Admin Tables

  1. Performance Optimization
    - Optimize policies for question management tables
    - Optimize school/branch management tables
    - Optimize user management tables
  
  2. Tables Optimized
    - question_options, audit_logs, schools, branches
    - question_import tables, answer_components, answer_requirements
    - table_templates, invitation_status, question_navigation_state
    - users
*/

-- Question Options
DROP POLICY IF EXISTS "System admins can create question options" ON question_options;
CREATE POLICY "System admins can create question options"
  ON question_options FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

DROP POLICY IF EXISTS "System admins can update question options" ON question_options;
CREATE POLICY "System admins can update question options"
  ON question_options FOR UPDATE
  TO authenticated
  USING (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

DROP POLICY IF EXISTS "System admins can delete question options" ON question_options;
CREATE POLICY "System admins can delete question options"
  ON question_options FOR DELETE
  TO authenticated
  USING (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

DROP POLICY IF EXISTS "System admins can view question options" ON question_options;
CREATE POLICY "System admins can view question options"
  ON question_options FOR SELECT
  TO authenticated
  USING (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

-- Audit Logs
DROP POLICY IF EXISTS "System admins can create audit_logs" ON audit_logs;
CREATE POLICY "System admins can create audit_logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
    OR user_id = (SELECT auth.uid())
  );

-- Schools
DROP POLICY IF EXISTS "System admins can create schools" ON schools;
CREATE POLICY "System admins can create schools"
  ON schools FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

DROP POLICY IF EXISTS "System admins can update all schools" ON schools;
CREATE POLICY "System admins can update all schools"
  ON schools FOR UPDATE
  TO authenticated
  USING (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

DROP POLICY IF EXISTS "System admins can delete schools" ON schools;
CREATE POLICY "System admins can delete schools"
  ON schools FOR DELETE
  TO authenticated
  USING (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

DROP POLICY IF EXISTS "System admins can view all schools" ON schools;
CREATE POLICY "System admins can view all schools"
  ON schools FOR SELECT
  TO authenticated
  USING (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

-- Branches
DROP POLICY IF EXISTS "System admins can create branches" ON branches;
CREATE POLICY "System admins can create branches"
  ON branches FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

DROP POLICY IF EXISTS "System admins can update all branches" ON branches;
CREATE POLICY "System admins can update all branches"
  ON branches FOR UPDATE
  TO authenticated
  USING (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

DROP POLICY IF EXISTS "System admins can delete branches" ON branches;
CREATE POLICY "System admins can delete branches"
  ON branches FOR DELETE
  TO authenticated
  USING (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

DROP POLICY IF EXISTS "System admins can view all branches" ON branches;
CREATE POLICY "System admins can view all branches"
  ON branches FOR SELECT
  TO authenticated
  USING (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

-- Teacher Branches
DROP POLICY IF EXISTS "Users can manage teacher branches in their scope" ON teacher_branches;
CREATE POLICY "Users can manage teacher branches in their scope"
  ON teacher_branches FOR ALL
  TO authenticated
  USING (
    teacher_id IN (
      SELECT t.id FROM teachers t
      WHERE t.company_id IN (
        SELECT eu.company_id FROM entity_users eu
        WHERE eu.user_id = (SELECT auth.uid()) AND eu.is_active = true
      )
    )
  );

-- Teacher Schools
DROP POLICY IF EXISTS "Users can manage teacher schools in their scope" ON teacher_schools;
CREATE POLICY "Users can manage teacher schools in their scope"
  ON teacher_schools FOR ALL
  TO authenticated
  USING (
    teacher_id IN (
      SELECT t.id FROM teachers t
      WHERE t.company_id IN (
        SELECT eu.company_id FROM entity_users eu
        WHERE eu.user_id = (SELECT auth.uid()) AND eu.is_active = true
      )
    )
  );

-- Teacher Departments
DROP POLICY IF EXISTS "Users can manage teacher departments in their scope" ON teacher_departments;
CREATE POLICY "Users can manage teacher departments in their scope"
  ON teacher_departments FOR ALL
  TO authenticated
  USING (
    teacher_id IN (
      SELECT t.id FROM teachers t
      WHERE t.company_id IN (
        SELECT eu.company_id FROM entity_users eu
        WHERE eu.user_id = (SELECT auth.uid()) AND eu.is_active = true
      )
    )
  );

-- Teacher Programs
DROP POLICY IF EXISTS "Users can manage teacher programs in their scope" ON teacher_programs;
CREATE POLICY "Users can manage teacher programs in their scope"
  ON teacher_programs FOR ALL
  TO authenticated
  USING (
    teacher_id IN (
      SELECT t.id FROM teachers t
      WHERE t.company_id IN (
        SELECT eu.company_id FROM entity_users eu
        WHERE eu.user_id = (SELECT auth.uid()) AND eu.is_active = true
      )
    )
  );

-- Teacher Subjects
DROP POLICY IF EXISTS "Users can manage teacher subjects in their scope" ON teacher_subjects;
CREATE POLICY "Users can manage teacher subjects in their scope"
  ON teacher_subjects FOR ALL
  TO authenticated
  USING (
    teacher_id IN (
      SELECT t.id FROM teachers t
      WHERE t.company_id IN (
        SELECT eu.company_id FROM entity_users eu
        WHERE eu.user_id = (SELECT auth.uid()) AND eu.is_active = true
      )
    )
  );

-- Teacher Grade Levels
DROP POLICY IF EXISTS "Users can manage teacher grade levels in their scope" ON teacher_grade_levels;
CREATE POLICY "Users can manage teacher grade levels in their scope"
  ON teacher_grade_levels FOR ALL
  TO authenticated
  USING (
    teacher_id IN (
      SELECT t.id FROM teachers t
      WHERE t.company_id IN (
        SELECT eu.company_id FROM entity_users eu
        WHERE eu.user_id = (SELECT auth.uid()) AND eu.is_active = true
      )
    )
  );

-- Teacher Sections
DROP POLICY IF EXISTS "Users can manage teacher sections in their scope" ON teacher_sections;
CREATE POLICY "Users can manage teacher sections in their scope"
  ON teacher_sections FOR ALL
  TO authenticated
  USING (
    teacher_id IN (
      SELECT t.id FROM teachers t
      WHERE t.company_id IN (
        SELECT eu.company_id FROM entity_users eu
        WHERE eu.user_id = (SELECT auth.uid()) AND eu.is_active = true
      )
    )
  );

-- Question Import Review Sessions
DROP POLICY IF EXISTS "System admins can view all review sessions" ON question_import_review_sessions;
CREATE POLICY "System admins can view all review sessions"
  ON question_import_review_sessions FOR SELECT
  TO authenticated
  USING (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

DROP POLICY IF EXISTS "Users can create own review sessions" ON question_import_review_sessions;
CREATE POLICY "Users can create own review sessions"
  ON question_import_review_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own review sessions" ON question_import_review_sessions;
CREATE POLICY "Users can update own review sessions"
  ON question_import_review_sessions FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own review sessions" ON question_import_review_sessions;
CREATE POLICY "Users can view own review sessions"
  ON question_import_review_sessions FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Question Import Review Status
DROP POLICY IF EXISTS "System admins can manage all question review status" ON question_import_review_status;
CREATE POLICY "System admins can manage all question review status"
  ON question_import_review_status FOR ALL
  TO authenticated
  USING (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

DROP POLICY IF EXISTS "Users can create own question review status" ON question_import_review_status;
CREATE POLICY "Users can create own question review status"
  ON question_import_review_status FOR INSERT
  TO authenticated
  WITH CHECK (
    session_id IN (
      SELECT id FROM question_import_review_sessions WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own question review status" ON question_import_review_status;
CREATE POLICY "Users can update own question review status"
  ON question_import_review_status FOR UPDATE
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM question_import_review_sessions WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own question review status" ON question_import_review_status;
CREATE POLICY "Users can view own question review status"
  ON question_import_review_status FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM question_import_review_sessions WHERE user_id = (SELECT auth.uid())
    )
  );

-- Question Import Simulation Results
DROP POLICY IF EXISTS "System admins can view all simulation results" ON question_import_simulation_results;
CREATE POLICY "System admins can view all simulation results"
  ON question_import_simulation_results FOR SELECT
  TO authenticated
  USING (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

DROP POLICY IF EXISTS "Users can create own simulation results" ON question_import_simulation_results;
CREATE POLICY "Users can create own simulation results"
  ON question_import_simulation_results FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own simulation results" ON question_import_simulation_results;
CREATE POLICY "Users can view own simulation results"
  ON question_import_simulation_results FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Answer Components
DROP POLICY IF EXISTS "System admins can manage answer components" ON answer_components;
CREATE POLICY "System admins can manage answer components"
  ON answer_components FOR ALL
  TO authenticated
  USING (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

DROP POLICY IF EXISTS "Teachers can view answer components" ON answer_components;
CREATE POLICY "Teachers can view answer components"
  ON answer_components FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teachers t WHERE t.auth_user_id = (SELECT auth.uid())
    )
  );

-- Answer Requirements
DROP POLICY IF EXISTS "System admins can manage answer requirements" ON answer_requirements;
CREATE POLICY "System admins can manage answer requirements"
  ON answer_requirements FOR ALL
  TO authenticated
  USING (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

DROP POLICY IF EXISTS "Teachers can view answer requirements" ON answer_requirements;
CREATE POLICY "Teachers can view answer requirements"
  ON answer_requirements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teachers t WHERE t.auth_user_id = (SELECT auth.uid())
    )
  );

-- Table Templates
DROP POLICY IF EXISTS "System admins have full access to table templates" ON table_templates;
CREATE POLICY "System admins have full access to table templates"
  ON table_templates FOR ALL
  TO authenticated
  USING (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

DROP POLICY IF EXISTS "Teachers can manage templates for their questions" ON table_templates;
CREATE POLICY "Teachers can manage templates for their questions"
  ON table_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teachers t WHERE t.auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Students can view table templates" ON table_templates;
CREATE POLICY "Students can view table templates"
  ON table_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students s WHERE s.auth_user_id = (SELECT auth.uid())
    )
  );

-- Table Template Cells
DROP POLICY IF EXISTS "System admins have full access to template cells" ON table_template_cells;
CREATE POLICY "System admins have full access to template cells"
  ON table_template_cells FOR ALL
  TO authenticated
  USING (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

DROP POLICY IF EXISTS "Teachers can manage template cells" ON table_template_cells;
CREATE POLICY "Teachers can manage template cells"
  ON table_template_cells FOR ALL
  TO authenticated
  USING (
    template_id IN (
      SELECT id FROM table_templates WHERE EXISTS (
        SELECT 1 FROM teachers t WHERE t.auth_user_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Students can view template cells" ON table_template_cells;
CREATE POLICY "Students can view template cells"
  ON table_template_cells FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students s WHERE s.auth_user_id = (SELECT auth.uid())
    )
  );

-- Invitation Status
DROP POLICY IF EXISTS "System admins can insert invitation records" ON invitation_status;
CREATE POLICY "System admins can insert invitation records"
  ON invitation_status FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

DROP POLICY IF EXISTS "System admins can update invitation statuses" ON invitation_status;
CREATE POLICY "System admins can update invitation statuses"
  ON invitation_status FOR UPDATE
  TO authenticated
  USING (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

DROP POLICY IF EXISTS "System admins can view all invitation statuses" ON invitation_status;
CREATE POLICY "System admins can view all invitation statuses"
  ON invitation_status FOR SELECT
  TO authenticated
  USING (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

DROP POLICY IF EXISTS "Entity admins can create invitations" ON invitation_status;
CREATE POLICY "Entity admins can create invitations"
  ON invitation_status FOR INSERT
  TO authenticated
  WITH CHECK (
    invited_by IN (
      SELECT eu.user_id FROM entity_users eu WHERE eu.is_active = true
    )
  );

DROP POLICY IF EXISTS "Entity admins can view their organization invitations" ON invitation_status;
CREATE POLICY "Entity admins can view their organization invitations"
  ON invitation_status FOR SELECT
  TO authenticated
  USING (
    invited_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM entity_users eu
      WHERE eu.user_id = (SELECT auth.uid())
      AND eu.company_id IN (
        SELECT eu2.company_id FROM entity_users eu2 WHERE eu2.user_id = invited_by
      )
    )
  );

DROP POLICY IF EXISTS "Entity admins can update their organization invitations" ON invitation_status;
CREATE POLICY "Entity admins can update their organization invitations"
  ON invitation_status FOR UPDATE
  TO authenticated
  USING (
    invited_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM entity_users eu
      WHERE eu.user_id = (SELECT auth.uid())
      AND eu.company_id IN (
        SELECT eu2.company_id FROM entity_users eu2 WHERE eu2.user_id = invited_by
      )
    )
  );

-- Question Navigation State
DROP POLICY IF EXISTS "System admins can view all navigation state" ON question_navigation_state;
CREATE POLICY "System admins can view all navigation state"
  ON question_navigation_state FOR SELECT
  TO authenticated
  USING (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

DROP POLICY IF EXISTS "Users can manage own navigation state" ON question_navigation_state;
CREATE POLICY "Users can manage own navigation state"
  ON question_navigation_state FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Test Mode Logs
DROP POLICY IF EXISTS "System can insert test mode logs" ON test_mode_logs;
CREATE POLICY "System can insert test mode logs"
  ON test_mode_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    test_admin_user_id = (SELECT auth.uid())
    OR (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

-- Users table
DROP POLICY IF EXISTS "Users can view their own record by email" ON users;
CREATE POLICY "Users can view their own record by email"
  ON users FOR SELECT
  TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR email = (SELECT auth.email())
  );

-- Student Class Sections
DROP POLICY IF EXISTS "Branch admins manage student_class_sections in branches" ON student_class_sections;
CREATE POLICY "Branch admins manage student_class_sections in branches"
  ON student_class_sections FOR ALL
  TO authenticated
  USING (
    section_id IN (
      SELECT cs.id FROM class_sections cs
      JOIN schools s ON s.id = cs.school_id
      JOIN branches b ON b.school_id = s.id
      WHERE b.id IN (
        SELECT eas.branch_id FROM entity_admin_scope eas
        WHERE eas.user_id = (SELECT auth.uid()) AND eas.is_active = true
      )
    )
  );

DROP POLICY IF EXISTS "Entity admins manage student_class_sections in company" ON student_class_sections;
CREATE POLICY "Entity admins manage student_class_sections in company"
  ON student_class_sections FOR ALL
  TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM students s
      WHERE s.company_id IN (
        SELECT eu.company_id FROM entity_users eu
        WHERE eu.user_id = (SELECT auth.uid())
        AND eu.is_company_admin = true
      )
    )
  );

DROP POLICY IF EXISTS "School admins manage student_class_sections in schools" ON student_class_sections;
CREATE POLICY "School admins manage student_class_sections in schools"
  ON student_class_sections FOR ALL
  TO authenticated
  USING (
    section_id IN (
      SELECT cs.id FROM class_sections cs
      WHERE cs.school_id IN (
        SELECT eas.school_id FROM entity_admin_scope eas
        WHERE eas.user_id = (SELECT auth.uid()) AND eas.is_active = true
      )
    )
  );

DROP POLICY IF EXISTS "Students view own class section assignments" ON student_class_sections;
CREATE POLICY "Students view own class section assignments"
  ON student_class_sections FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE auth_user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "System admins full access to student_class_sections" ON student_class_sections;
CREATE POLICY "System admins full access to student_class_sections"
  ON student_class_sections FOR ALL
  TO authenticated
  USING (
    (SELECT is_system_admin FROM users WHERE id = (SELECT auth.uid())) = true
  );

DROP POLICY IF EXISTS "Teachers view assignments for their sections" ON student_class_sections;
CREATE POLICY "Teachers view assignments for their sections"
  ON student_class_sections FOR SELECT
  TO authenticated
  USING (
    section_id IN (
      SELECT ts.section_id FROM teacher_sections ts
      JOIN teachers t ON t.id = ts.teacher_id
      WHERE t.auth_user_id = (SELECT auth.uid())
    )
  );
