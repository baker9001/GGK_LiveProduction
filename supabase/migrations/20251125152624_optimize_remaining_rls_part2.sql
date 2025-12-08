/*
  # Optimize Remaining RLS Auth Calls - Part 2
  
  Continues optimizing RLS policies for system admin tables and question management.
*/

-- question_options policies
DROP POLICY IF EXISTS "System admins can create question options" ON question_options;
CREATE POLICY "System admins can create question options"
  ON question_options FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT is_system_admin()) = true);

DROP POLICY IF EXISTS "System admins can delete question options" ON question_options;
CREATE POLICY "System admins can delete question options"
  ON question_options FOR DELETE
  TO authenticated
  USING ((SELECT is_system_admin()) = true);

DROP POLICY IF EXISTS "System admins can update question options" ON question_options;
CREATE POLICY "System admins can update question options"
  ON question_options FOR UPDATE
  TO authenticated
  USING ((SELECT is_system_admin()) = true)
  WITH CHECK ((SELECT is_system_admin()) = true);

DROP POLICY IF EXISTS "System admins can view question options" ON question_options;
CREATE POLICY "System admins can view question options"
  ON question_options FOR SELECT
  TO authenticated
  USING ((SELECT is_system_admin()) = true);

-- audit_logs policy
DROP POLICY IF EXISTS "System admins can create audit_logs" ON audit_logs;
CREATE POLICY "System admins can create audit_logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT is_system_admin()) = true);

-- schools policies
DROP POLICY IF EXISTS "System admins can create schools" ON schools;
CREATE POLICY "System admins can create schools"
  ON schools FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT is_system_admin()) = true);

DROP POLICY IF EXISTS "System admins can delete schools" ON schools;
CREATE POLICY "System admins can delete schools"
  ON schools FOR DELETE
  TO authenticated
  USING ((SELECT is_system_admin()) = true);

DROP POLICY IF EXISTS "System admins can update all schools" ON schools;
CREATE POLICY "System admins can update all schools"
  ON schools FOR UPDATE
  TO authenticated
  USING ((SELECT is_system_admin()) = true)
  WITH CHECK ((SELECT is_system_admin()) = true);

DROP POLICY IF EXISTS "System admins can view all schools" ON schools;
CREATE POLICY "System admins can view all schools"
  ON schools FOR SELECT
  TO authenticated
  USING ((SELECT is_system_admin()) = true);

-- question_import_review_sessions policies
DROP POLICY IF EXISTS "System admins can view all review sessions" ON question_import_review_sessions;
CREATE POLICY "System admins can view all review sessions"
  ON question_import_review_sessions FOR SELECT
  TO authenticated
  USING ((SELECT is_system_admin()) = true);

DROP POLICY IF EXISTS "Users can create own review sessions" ON question_import_review_sessions;
CREATE POLICY "Users can create own review sessions"
  ON question_import_review_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- question_import_review_status policies
DROP POLICY IF EXISTS "System admins can manage all question review status" ON question_import_review_status;
CREATE POLICY "System admins can manage all question review status"
  ON question_import_review_status FOR ALL
  TO authenticated
  USING ((SELECT is_system_admin()) = true)
  WITH CHECK ((SELECT is_system_admin()) = true);

DROP POLICY IF EXISTS "Users can create own question review status" ON question_import_review_status;
CREATE POLICY "Users can create own question review status"
  ON question_import_review_status FOR INSERT
  TO authenticated
  WITH CHECK (
    review_session_id IN (
      SELECT id FROM question_import_review_sessions 
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own question review status" ON question_import_review_status;
CREATE POLICY "Users can update own question review status"
  ON question_import_review_status FOR UPDATE
  TO authenticated
  USING (
    review_session_id IN (
      SELECT id FROM question_import_review_sessions 
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    review_session_id IN (
      SELECT id FROM question_import_review_sessions 
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own question review status" ON question_import_review_status;
CREATE POLICY "Users can view own question review status"
  ON question_import_review_status FOR SELECT
  TO authenticated
  USING (
    review_session_id IN (
      SELECT id FROM question_import_review_sessions 
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- users table policy
DROP POLICY IF EXISTS "Users can view their own record by email" ON users;
CREATE POLICY "Users can view their own record by email"
  ON users FOR SELECT
  TO authenticated
  USING (
    email = (SELECT (auth.jwt()->>'email')::text)
    OR auth_user_id = (SELECT auth.uid())
  );

-- question_import_simulation_results policies (check if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'question_import_simulation_results') THEN
    EXECUTE 'DROP POLICY IF EXISTS "System admins can view all simulation results" ON question_import_simulation_results';
    EXECUTE 'CREATE POLICY "System admins can view all simulation results"
      ON question_import_simulation_results FOR SELECT
      TO authenticated
      USING ((SELECT is_system_admin()) = true)';
    
    EXECUTE 'DROP POLICY IF EXISTS "Users can create own simulation results" ON question_import_simulation_results';
    EXECUTE 'CREATE POLICY "Users can create own simulation results"
      ON question_import_simulation_results FOR INSERT
      TO authenticated
      WITH CHECK (
        review_session_id IN (
          SELECT id FROM question_import_review_sessions 
          WHERE user_id = (SELECT auth.uid())
        )
      )';
    
    EXECUTE 'DROP POLICY IF EXISTS "Users can view own simulation results" ON question_import_simulation_results';
    EXECUTE 'CREATE POLICY "Users can view own simulation results"
      ON question_import_simulation_results FOR SELECT
      TO authenticated
      USING (
        review_session_id IN (
          SELECT id FROM question_import_review_sessions 
          WHERE user_id = (SELECT auth.uid())
        )
      )';
  END IF;
END $$;

-- branches policies
DROP POLICY IF EXISTS "System admins can create branches" ON branches;
CREATE POLICY "System admins can create branches"
  ON branches FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT is_system_admin()) = true);

DROP POLICY IF EXISTS "System admins can delete branches" ON branches;
CREATE POLICY "System admins can delete branches"
  ON branches FOR DELETE
  TO authenticated
  USING ((SELECT is_system_admin()) = true);

DROP POLICY IF EXISTS "System admins can update all branches" ON branches;
CREATE POLICY "System admins can update all branches"
  ON branches FOR UPDATE
  TO authenticated
  USING ((SELECT is_system_admin()) = true)
  WITH CHECK ((SELECT is_system_admin()) = true);

DROP POLICY IF EXISTS "System admins can view all branches" ON branches;
CREATE POLICY "System admins can view all branches"
  ON branches FOR SELECT
  TO authenticated
  USING ((SELECT is_system_admin()) = true);

-- student_class_sections policies
DROP POLICY IF EXISTS "Students view own class section assignments" ON student_class_sections;
CREATE POLICY "Students view own class section assignments"
  ON student_class_sections FOR SELECT
  TO authenticated
  USING (student_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "System admins full access to student_class_sections" ON student_class_sections;
CREATE POLICY "System admins full access to student_class_sections"
  ON student_class_sections FOR ALL
  TO authenticated
  USING ((SELECT is_system_admin()) = true)
  WITH CHECK ((SELECT is_system_admin()) = true);

DROP POLICY IF EXISTS "Teachers view assignments for their sections" ON student_class_sections;
CREATE POLICY "Teachers view assignments for their sections"
  ON student_class_sections FOR SELECT
  TO authenticated
  USING (
    class_section_id IN (
      SELECT section_id FROM teacher_sections
      WHERE teacher_id = (SELECT auth.uid())
    )
  );
