/*
  # Add RLS to Analytics and Performance Tables

  ## Overview
  Adds RLS to analytics, context performance, and question-related tables.
  These tables contain student performance data and must be properly secured.

  ## Tables Updated
  - analytics_facts (student performance analytics)
  - context_performance (context-level student performance)
  - context_mastery_cache (student mastery tracking)
  - context_difficulty_metrics (question difficulty metrics)
  - answer_components (answer structure data)
  - answer_requirements (answer validation rules)
  - question_correct_answers (correct answer definitions)
  - question_distractors (distractor options)
  - paper_status_history (paper workflow tracking)
  - past_paper_files (uploaded paper files)

  ## Security Model
  - Students: View only their own performance data
  - Teachers: View performance data for students in their company
  - Admins: View all data in their company scope
  - System admins: Full access to question/paper tables
*/

-- ============================================================================
-- ANALYTICS TABLES
-- ============================================================================

-- analytics_facts
ALTER TABLE analytics_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own analytics"
  ON analytics_facts FOR SELECT TO authenticated
  USING (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY "Entity users view analytics in company"
  ON analytics_facts FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE eu.user_id = auth.uid() AND eu.is_active = true
    )
  );

CREATE POLICY "System admins manage analytics"
  ON analytics_facts FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

-- context_performance
ALTER TABLE context_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own context performance"
  ON context_performance FOR SELECT TO authenticated
  USING (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY "Entity users view context performance in company"
  ON context_performance FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE eu.user_id = auth.uid() AND eu.is_active = true
    )
  );

CREATE POLICY "System admins manage context performance"
  ON context_performance FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

-- context_mastery_cache
ALTER TABLE context_mastery_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own mastery cache"
  ON context_mastery_cache FOR SELECT TO authenticated
  USING (
    student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  );

CREATE POLICY "Entity users view mastery in company"
  ON context_mastery_cache FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT s.id FROM students s
      JOIN entity_users eu ON eu.company_id = s.company_id
      WHERE eu.user_id = auth.uid() AND eu.is_active = true
    )
  );

CREATE POLICY "System admins manage mastery cache"
  ON context_mastery_cache FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

-- context_difficulty_metrics (global metrics, read-only for most users)
ALTER TABLE context_difficulty_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view difficulty metrics"
  ON context_difficulty_metrics FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins manage difficulty metrics"
  ON context_difficulty_metrics FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- QUESTION/ANSWER TABLES
-- ============================================================================

-- answer_components
ALTER TABLE answer_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view answer components"
  ON answer_components FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins manage answer components"
  ON answer_components FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

-- answer_requirements
ALTER TABLE answer_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view answer requirements"
  ON answer_requirements FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins manage answer requirements"
  ON answer_requirements FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

-- question_correct_answers
ALTER TABLE question_correct_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view correct answers"
  ON question_correct_answers FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins manage correct answers"
  ON question_correct_answers FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

-- question_distractors
ALTER TABLE question_distractors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view distractors"
  ON question_distractors FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins manage distractors"
  ON question_distractors FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- PAPER MANAGEMENT TABLES
-- ============================================================================

-- paper_status_history (already has some policies, just enable RLS)
ALTER TABLE paper_status_history ENABLE ROW LEVEL SECURITY;

-- past_paper_files
ALTER TABLE past_paper_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System admins manage past paper files"
  ON past_paper_files FOR ALL TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "Authenticated view past paper files"
  ON past_paper_files FOR SELECT TO authenticated
  USING (true);
