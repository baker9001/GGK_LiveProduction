/*
  # Add System Admin Policies to Mock Exam System Tables

  ## Overview
  Adds comprehensive system admin (admin_users) policies to all mock exam system tables.
  System admins need full access to mock exams, student registrations, responses, results,
  teaching assignments, materials, and analytics across all companies.

  ## Tables Updated
  1. **mock_exams** - Core exam records
  2. **mock_exam_schools** - School assignments
  3. **mock_exam_branches** - Branch assignments
  4. **mock_exam_grade_levels** - Grade level assignments
  5. **mock_exam_sections** - Section assignments
  6. **mock_exam_students** - Student registrations
  7. **mock_exam_responses** - Student answers
  8. **mock_exam_results** - Overall results
  9. **mock_exam_question_performance** - Question analytics
  10. **mock_exam_teachers** - Teacher assignments
  11. **mock_exam_materials** - Exam materials
  12. **mock_exam_venues** - Venue assignments
  13. **student_mock_performance_analytics** - Performance analytics
  14. **ai_study_plans** - AI-generated study plans

  ## Security Model
  - System admins get full access to all mock exam data
  - Existing company-scoped policies remain active
  - System admin policies provide platform-wide management capability
*/

-- ============================================================================
-- MOCK_EXAMS TABLE
-- ============================================================================

CREATE POLICY "System admins can view all mock exams"
  ON mock_exams FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create mock exams"
  ON mock_exams FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all mock exams"
  ON mock_exams FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete mock exams"
  ON mock_exams FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- MOCK_EXAM_SCHOOLS TABLE
-- ============================================================================

CREATE POLICY "System admins can view all mock exam schools"
  ON mock_exam_schools FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create mock exam schools"
  ON mock_exam_schools FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all mock exam schools"
  ON mock_exam_schools FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete mock exam schools"
  ON mock_exam_schools FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- MOCK_EXAM_BRANCHES TABLE
-- ============================================================================

CREATE POLICY "System admins can view all mock exam branches"
  ON mock_exam_branches FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create mock exam branches"
  ON mock_exam_branches FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all mock exam branches"
  ON mock_exam_branches FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete mock exam branches"
  ON mock_exam_branches FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- MOCK_EXAM_GRADE_LEVELS TABLE
-- ============================================================================

CREATE POLICY "System admins can view all mock exam grade levels"
  ON mock_exam_grade_levels FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create mock exam grade levels"
  ON mock_exam_grade_levels FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all mock exam grade levels"
  ON mock_exam_grade_levels FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete mock exam grade levels"
  ON mock_exam_grade_levels FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- MOCK_EXAM_SECTIONS TABLE
-- ============================================================================

CREATE POLICY "System admins can view all mock exam sections"
  ON mock_exam_sections FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create mock exam sections"
  ON mock_exam_sections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all mock exam sections"
  ON mock_exam_sections FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete mock exam sections"
  ON mock_exam_sections FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- MOCK_EXAM_STUDENTS TABLE
-- ============================================================================

CREATE POLICY "System admins can view all mock exam student registrations"
  ON mock_exam_students FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create mock exam student registrations"
  ON mock_exam_students FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all mock exam student registrations"
  ON mock_exam_students FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete mock exam student registrations"
  ON mock_exam_students FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- MOCK_EXAM_RESPONSES TABLE
-- ============================================================================

CREATE POLICY "System admins can view all mock exam responses"
  ON mock_exam_responses FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create mock exam responses"
  ON mock_exam_responses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all mock exam responses"
  ON mock_exam_responses FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete mock exam responses"
  ON mock_exam_responses FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- MOCK_EXAM_RESULTS TABLE
-- ============================================================================

CREATE POLICY "System admins can view all mock exam results"
  ON mock_exam_results FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create mock exam results"
  ON mock_exam_results FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all mock exam results"
  ON mock_exam_results FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete mock exam results"
  ON mock_exam_results FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- MOCK_EXAM_QUESTION_PERFORMANCE TABLE
-- ============================================================================

CREATE POLICY "System admins can view all mock exam question performance"
  ON mock_exam_question_performance FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create mock exam question performance"
  ON mock_exam_question_performance FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all mock exam question performance"
  ON mock_exam_question_performance FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete mock exam question performance"
  ON mock_exam_question_performance FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- MOCK_EXAM_TEACHERS TABLE
-- ============================================================================

CREATE POLICY "System admins can view all mock exam teacher assignments"
  ON mock_exam_teachers FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create mock exam teacher assignments"
  ON mock_exam_teachers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all mock exam teacher assignments"
  ON mock_exam_teachers FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete mock exam teacher assignments"
  ON mock_exam_teachers FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- MOCK_EXAM_MATERIALS TABLE
-- ============================================================================

CREATE POLICY "System admins can view all mock exam materials"
  ON mock_exam_materials FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create mock exam materials"
  ON mock_exam_materials FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all mock exam materials"
  ON mock_exam_materials FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete mock exam materials"
  ON mock_exam_materials FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- MOCK_EXAM_VENUES TABLE
-- ============================================================================

CREATE POLICY "System admins can view all mock exam venues"
  ON mock_exam_venues FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create mock exam venues"
  ON mock_exam_venues FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all mock exam venues"
  ON mock_exam_venues FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete mock exam venues"
  ON mock_exam_venues FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- STUDENT_MOCK_PERFORMANCE_ANALYTICS TABLE
-- ============================================================================

CREATE POLICY "System admins can view all student mock performance analytics"
  ON student_mock_performance_analytics FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create student mock performance analytics"
  ON student_mock_performance_analytics FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all student mock performance analytics"
  ON student_mock_performance_analytics FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete student mock performance analytics"
  ON student_mock_performance_analytics FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- AI_STUDY_PLANS TABLE
-- ============================================================================

CREATE POLICY "System admins can view all ai study plans"
  ON ai_study_plans FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create ai study plans"
  ON ai_study_plans FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all ai study plans"
  ON ai_study_plans FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete ai study plans"
  ON ai_study_plans FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));
