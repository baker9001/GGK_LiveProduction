/*
  # Optimize RLS Auth Calls - Education Content Tables

  1. Performance Optimization
    - Wrap auth function calls in SELECT for education content tables
    - Prevents re-evaluation for each row
    - Critical performance improvement at scale

  2. Tables Optimized
    - questions_master_admin, sub_questions, question_correct_answers
    - questions_attachments, question_options
    - question_import_review_sessions, question_navigation_state
    - student_licenses
*/

-- Questions Master Admin: System admin policies
DROP POLICY IF EXISTS "System admins can create questions" ON questions_master_admin;
CREATE POLICY "System admins can create questions"
  ON questions_master_admin FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT is_system_admin()) = true
  );

DROP POLICY IF EXISTS "System admins can update questions" ON questions_master_admin;
CREATE POLICY "System admins can update questions"
  ON questions_master_admin FOR UPDATE
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
  );

DROP POLICY IF EXISTS "System admins can delete questions" ON questions_master_admin;
CREATE POLICY "System admins can delete questions"
  ON questions_master_admin FOR DELETE
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
  );

DROP POLICY IF EXISTS "System admins can view questions" ON questions_master_admin;
CREATE POLICY "System admins can view questions"
  ON questions_master_admin FOR SELECT
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
  );

-- Sub Questions: System admin policies
DROP POLICY IF EXISTS "System admins manage sub questions" ON sub_questions;
CREATE POLICY "System admins manage sub questions"
  ON sub_questions FOR ALL
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
  );

-- Question Correct Answers: System admin delete
DROP POLICY IF EXISTS "System admins can delete correct answers" ON question_correct_answers;
CREATE POLICY "System admins can delete correct answers"
  ON question_correct_answers FOR DELETE
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
  );

-- Question Import Review Sessions: User access
DROP POLICY IF EXISTS "Users can view own review sessions" ON question_import_review_sessions;
CREATE POLICY "Users can view own review sessions"
  ON question_import_review_sessions FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can create review sessions" ON question_import_review_sessions;
CREATE POLICY "Users can create review sessions"
  ON question_import_review_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Users can update own review sessions" ON question_import_review_sessions;
CREATE POLICY "Users can update own review sessions"
  ON question_import_review_sessions FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
  );

-- Question Import Review Sessions: System admin
DROP POLICY IF EXISTS "System admins manage review sessions" ON question_import_review_sessions;
CREATE POLICY "System admins manage review sessions"
  ON question_import_review_sessions FOR ALL
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
  );

-- Question Navigation State: User access
DROP POLICY IF EXISTS "Users manage own navigation state" ON question_navigation_state;
CREATE POLICY "Users manage own navigation state"
  ON question_navigation_state FOR ALL
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
  );

-- Student Licenses: Students view own
DROP POLICY IF EXISTS "Students view own licenses" ON student_licenses;
CREATE POLICY "Students view own licenses"
  ON student_licenses FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = (SELECT auth.uid())
    )
  );

-- Student Licenses: Entity admins view
DROP POLICY IF EXISTS "Entity admins view student licenses in company" ON student_licenses;
CREATE POLICY "Entity admins view student licenses in company"
  ON student_licenses FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE eu.user_id = (SELECT auth.uid())
      AND eu.is_active = true
    )
  );

-- Student Licenses: System admin
DROP POLICY IF EXISTS "System admins manage student licenses" ON student_licenses;
CREATE POLICY "System admins manage student licenses"
  ON student_licenses FOR ALL
  TO authenticated
  USING (
    (SELECT is_system_admin()) = true
  );