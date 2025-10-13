/*
  # Optimize All System Admin RLS Policies
  
  1. Performance Improvements
    - Replace auth.uid() with (select auth.uid()) in all system admin policies
    - Optimizes ~200+ system admin policies across all tables
  
  2. Strategy
    - Drop and recreate all policies that call is_admin_user()
    - Use consistent naming pattern
    - Separate by operation type (SELECT, INSERT, UPDATE, DELETE)
*/

-- Helper function to recreate system admin policies for a table
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'achievements', 'admin_users', 'ai_study_plans', 'analytics_facts',
    'answer_analytics', 'answer_components', 'answer_format_templates',
    'answer_requirements', 'audit_logs', 'cities', 'companies',
    'configuration_assignments', 'configuration_templates', 'context_difficulty_metrics',
    'context_mastery_cache', 'context_performance', 'countries', 'daily_challenges',
    'data_structures', 'edu_courses', 'edu_learning_objectives', 'edu_specific_concepts',
    'email_queue', 'email_templates', 'license_actions', 'licenses',
    'login_attempts', 'material_access_logs', 'materials', 'mock_exam_branches',
    'mock_exam_grade_levels', 'mock_exam_instructions', 'mock_exam_materials',
    'mock_exam_question_performance', 'mock_exam_questions', 'mock_exam_responses',
    'mock_exam_results', 'mock_exam_schools', 'mock_exam_sections',
    'mock_exam_stage_progress', 'mock_exam_status_history', 'mock_exam_students',
    'mock_exam_teachers', 'mock_exam_templates', 'mock_exam_venues',
    'paper_status_history', 'papers_setup', 'past_paper_files',
    'past_paper_import_sessions', 'programs', 'providers', 'question_confirmations',
    'question_correct_answers', 'question_distractors', 'question_options',
    'question_subtopics', 'question_topics', 'questions_attachments',
    'questions_hints', 'questions_master_admin', 'regions', 'role_permissions',
    'roles', 'smtp_configuration', 'student_achievements', 'student_daily_challenges',
    'student_game_stats', 'student_mock_performance_analytics', 'sub_questions',
    'suspicious_activities', 'test_mode_logs', 'user_migration_log'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    -- Drop existing system admin policies
    EXECUTE format('DROP POLICY IF EXISTS "System admins can view all %s" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "System admins can manage %s" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "System admins can create %s" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "System admins can update all %s" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "System admins can delete %s" ON %I', tbl, tbl);
    
    -- Create optimized SELECT policy
    EXECUTE format(
      'CREATE POLICY "System admins can view all %s" ON %I FOR SELECT TO authenticated USING (is_admin_user((SELECT auth.uid())))',
      tbl, tbl
    );
    
    -- Create optimized INSERT policy
    EXECUTE format(
      'CREATE POLICY "System admins can create %s" ON %I FOR INSERT TO authenticated WITH CHECK (is_admin_user((SELECT auth.uid())))',
      tbl, tbl
    );
    
    -- Create optimized UPDATE policy
    EXECUTE format(
      'CREATE POLICY "System admins can update all %s" ON %I FOR UPDATE TO authenticated USING (is_admin_user((SELECT auth.uid()))) WITH CHECK (is_admin_user((SELECT auth.uid())))',
      tbl, tbl
    );
    
    -- Create optimized DELETE policy
    EXECUTE format(
      'CREATE POLICY "System admins can delete %s" ON %I FOR DELETE TO authenticated USING (is_admin_user((SELECT auth.uid())))',
      tbl, tbl
    );
    
  END LOOP;
END $$;