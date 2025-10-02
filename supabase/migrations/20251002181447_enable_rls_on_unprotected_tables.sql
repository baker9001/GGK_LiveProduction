/*
  # Enable RLS on Unprotected Tables and Add Security Policies

  ## Overview
  This migration enables Row Level Security on tables that currently have no
  protection and adds appropriate policies based on their purpose.

  ## Security Strategy
  Tables are categorized and secured as follows:

  1. Reference/Configuration Tables (readable by authenticated users)
     - answer_format_templates, configuration_templates
     - edu_courses, edu_learning_objectives, edu_specific_concepts
     
  2. Student Data Tables (students view own data, admins manage)
     - achievements, student_achievements, student_daily_challenges
     - daily_challenges, student_game_stats
     
  3. System/Admin Tables (system admins only)
     - configuration_assignments, email_queue, email_templates
     - smtp_configuration, login_attempts, user_migration_log
     
  4. Analytics Tables (authenticated read, admins write)
     - answer_analytics, exam_answers_extended

  ## Tables Secured
  - achievements
  - answer_analytics
  - answer_format_templates
  - configuration_assignments
  - configuration_templates
  - daily_challenges
  - edu_courses
  - edu_learning_objectives
  - edu_specific_concepts
  - email_queue
  - email_templates
  - exam_answers_extended
  - login_attempts
  - smtp_configuration
  - student_achievements
  - student_daily_challenges
  - student_game_stats
  - user_migration_log
*/

-- ============================================================================
-- REFERENCE/CONFIGURATION TABLES (Readable by all authenticated users)
-- ============================================================================

-- Answer Format Templates
ALTER TABLE answer_format_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view answer_format_templates"
  ON answer_format_templates FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins can manage answer_format_templates"
  ON answer_format_templates FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Configuration Templates
ALTER TABLE configuration_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view configuration_templates"
  ON configuration_templates FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins can manage configuration_templates"
  ON configuration_templates FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Edu Courses
ALTER TABLE edu_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view edu_courses"
  ON edu_courses FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins can manage edu_courses"
  ON edu_courses FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Edu Learning Objectives
ALTER TABLE edu_learning_objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view edu_learning_objectives"
  ON edu_learning_objectives FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins can manage edu_learning_objectives"
  ON edu_learning_objectives FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Edu Specific Concepts
ALTER TABLE edu_specific_concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view edu_specific_concepts"
  ON edu_specific_concepts FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins can manage edu_specific_concepts"
  ON edu_specific_concepts FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- ============================================================================
-- STUDENT DATA TABLES (Students view own, admins manage)
-- ============================================================================

-- Achievements
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view achievements"
  ON achievements FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins can manage achievements"
  ON achievements FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Student Achievements
ALTER TABLE student_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own achievements"
  ON student_achievements FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System admins can view all student_achievements"
  ON student_achievements FOR SELECT TO authenticated
  USING (is_admin_user(auth.uid()));

CREATE POLICY "System admins can manage student_achievements"
  ON student_achievements FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Daily Challenges
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view daily_challenges"
  ON daily_challenges FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins can manage daily_challenges"
  ON daily_challenges FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Student Daily Challenges
ALTER TABLE student_daily_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own daily_challenges"
  ON student_daily_challenges FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System admins can view all student_daily_challenges"
  ON student_daily_challenges FOR SELECT TO authenticated
  USING (is_admin_user(auth.uid()));

CREATE POLICY "System admins can manage student_daily_challenges"
  ON student_daily_challenges FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Student Game Stats
ALTER TABLE student_game_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own game_stats"
  ON student_game_stats FOR SELECT TO authenticated
  USING (
    student_id IN (
      SELECT id FROM students WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System admins can view all student_game_stats"
  ON student_game_stats FOR SELECT TO authenticated
  USING (is_admin_user(auth.uid()));

CREATE POLICY "System admins can manage student_game_stats"
  ON student_game_stats FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- ============================================================================
-- SYSTEM/ADMIN TABLES (System admins only)
-- ============================================================================

-- Configuration Assignments
ALTER TABLE configuration_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System admins can manage configuration_assignments"
  ON configuration_assignments FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Email Queue
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System admins can manage email_queue"
  ON email_queue FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Email Templates
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System admins can manage email_templates"
  ON email_templates FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- SMTP Configuration
ALTER TABLE smtp_configuration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System admins can manage smtp_configuration"
  ON smtp_configuration FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Login Attempts
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System admins can view login_attempts"
  ON login_attempts FOR SELECT TO authenticated
  USING (is_admin_user(auth.uid()));

CREATE POLICY "Service role can manage login_attempts"
  ON login_attempts FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- User Migration Log
ALTER TABLE user_migration_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System admins can manage user_migration_log"
  ON user_migration_log FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- ============================================================================
-- ANALYTICS TABLES (Authenticated read, admins write)
-- ============================================================================

-- Answer Analytics
ALTER TABLE answer_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view answer_analytics"
  ON answer_analytics FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins can manage answer_analytics"
  ON answer_analytics FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Exam Answers Extended
ALTER TABLE exam_answers_extended ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view exam_answers_extended"
  ON exam_answers_extended FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "System admins can manage exam_answers_extended"
  ON exam_answers_extended FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- ============================================================================
-- SERVICE ROLE ACCESS (All tables)
-- ============================================================================

CREATE POLICY "Service role full access to answer_format_templates"
  ON answer_format_templates FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to configuration_templates"
  ON configuration_templates FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to edu_courses"
  ON edu_courses FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to edu_learning_objectives"
  ON edu_learning_objectives FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to edu_specific_concepts"
  ON edu_specific_concepts FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to achievements"
  ON achievements FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to student_achievements"
  ON student_achievements FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to daily_challenges"
  ON daily_challenges FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to student_daily_challenges"
  ON student_daily_challenges FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to student_game_stats"
  ON student_game_stats FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to configuration_assignments"
  ON configuration_assignments FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to email_templates"
  ON email_templates FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to smtp_configuration"
  ON smtp_configuration FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to user_migration_log"
  ON user_migration_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to answer_analytics"
  ON answer_analytics FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to exam_answers_extended"
  ON exam_answers_extended FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to email_queue"
  ON email_queue FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  rls_enabled_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- Count tables with RLS now enabled
  SELECT COUNT(*) INTO rls_enabled_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity = true
    AND c.relname IN (
      'achievements', 'answer_analytics', 'answer_format_templates',
      'configuration_assignments', 'configuration_templates', 'daily_challenges',
      'edu_courses', 'edu_learning_objectives', 'edu_specific_concepts',
      'email_queue', 'email_templates', 'exam_answers_extended',
      'login_attempts', 'smtp_configuration', 'student_achievements',
      'student_daily_challenges', 'student_game_stats', 'user_migration_log'
    );

  -- Count new policies created
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (
      'achievements', 'answer_analytics', 'answer_format_templates',
      'configuration_assignments', 'configuration_templates', 'daily_challenges',
      'edu_courses', 'edu_learning_objectives', 'edu_specific_concepts',
      'email_queue', 'email_templates', 'exam_answers_extended',
      'login_attempts', 'smtp_configuration', 'student_achievements',
      'student_daily_challenges', 'student_game_stats', 'user_migration_log'
    );

  RAISE NOTICE '============================================';
  RAISE NOTICE 'RLS ENABLED ON UNPROTECTED TABLES';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Tables with RLS enabled: %', rls_enabled_count;
  RAISE NOTICE 'Security policies created: %', policy_count;
  RAISE NOTICE 'All previously unprotected tables now secured';
END $$;