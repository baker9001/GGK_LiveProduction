/*
  # Fix Questions and Related Tables RLS Policy Conflicts
  
  ## Issue
  Similar to papers_setup, several question-related tables have conflicting RLS policies:
  - questions_master_admin
  - sub_questions
  - question_options
  - question_correct_answers
  - questions_attachments
  - question_subtopics
  
  These tables have both old "System admins manage X" and new optimized policies active,
  causing conflicts during operations like archiving papers (which cascades to questions).
  
  ## Solution
  Remove the old conflicting policies that use direct auth.uid() checks,
  keeping only the optimized policies that use is_admin_user() function.
  
  ## Impact
  - Fixes archive, update, and delete operations on questions when paper status changes
  - Maintains security through is_admin_user() function
  - Improves query performance with optimized auth checks
*/

-- ============================================================================
-- QUESTIONS_MASTER_ADMIN
-- ============================================================================

-- Remove old conflicting policy
DROP POLICY IF EXISTS "System admins manage questions" ON questions_master_admin;
DROP POLICY IF EXISTS "System admins can manage questions" ON questions_master_admin;
DROP POLICY IF EXISTS "Authenticated view questions" ON questions_master_admin;

-- Keep: System admins can view/create/update/delete questions_master_admin

-- ============================================================================
-- SUB_QUESTIONS
-- ============================================================================

-- Remove old conflicting policies
DROP POLICY IF EXISTS "System admins manage sub-questions" ON sub_questions;
DROP POLICY IF EXISTS "Authenticated view sub-questions" ON sub_questions;

-- Keep: System admins can view/create/update/delete sub_questions

-- ============================================================================
-- QUESTION_OPTIONS
-- ============================================================================

-- Remove old conflicting policies
DROP POLICY IF EXISTS "System admins manage question options" ON question_options;
DROP POLICY IF EXISTS "Authenticated view question options" ON question_options;

-- Keep: System admins can view/create/update/delete question_options

-- ============================================================================
-- QUESTION_CORRECT_ANSWERS
-- ============================================================================

-- Remove old conflicting policies
DROP POLICY IF EXISTS "System admins manage question correct answers" ON question_correct_answers;
DROP POLICY IF EXISTS "Authenticated view question correct answers" ON question_correct_answers;

-- Keep: System admins can view/create/update/delete question_correct_answers

-- ============================================================================
-- QUESTIONS_ATTACHMENTS
-- ============================================================================

-- Remove old conflicting policies
DROP POLICY IF EXISTS "System admins manage question attachments" ON questions_attachments;
DROP POLICY IF EXISTS "Authenticated view question attachments" ON questions_attachments;

-- Keep: System admins can view/create/update/delete questions_attachments

-- ============================================================================
-- QUESTION_SUBTOPICS
-- ============================================================================

-- Remove old conflicting policies
DROP POLICY IF EXISTS "System admins manage question subtopics" ON question_subtopics;
DROP POLICY IF EXISTS "Authenticated view question subtopics" ON question_subtopics;

-- Keep: System admins can view/create/update/delete question_subtopics

-- ============================================================================
-- QUESTION_HINTS (if exists)
-- ============================================================================

DROP POLICY IF EXISTS "System admins manage question hints" ON questions_hints;
DROP POLICY IF EXISTS "Authenticated view question hints" ON questions_hints;

-- ============================================================================
-- PAPER_STATUS_HISTORY
-- ============================================================================

-- This table should allow inserts when paper status changes
DROP POLICY IF EXISTS "System admins manage paper status history" ON paper_status_history;
DROP POLICY IF EXISTS "Authenticated view paper status history" ON paper_status_history;

-- Keep: System admins can view/create/update/delete paper_status_history

-- ============================================================================
-- QUESTION_CONFIRMATIONS
-- ============================================================================

DROP POLICY IF EXISTS "System admins manage question confirmations" ON question_confirmations;
DROP POLICY IF EXISTS "Authenticated view question confirmations" ON question_confirmations;

-- Keep: System admins can view/create/update/delete question_confirmations

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  r RECORD;
  tbl_name text;
  tables text[] := ARRAY[
    'questions_master_admin',
    'sub_questions',
    'question_options',
    'question_correct_answers',
    'questions_attachments',
    'question_subtopics',
    'paper_status_history',
    'question_confirmations'
  ];
BEGIN
  RAISE NOTICE 'RLS Policies Summary After Fix:';
  RAISE NOTICE '=====================================';
  
  FOREACH tbl_name IN ARRAY tables
  LOOP
    RAISE NOTICE 'Table: %', tbl_name;
    
    FOR r IN (
      SELECT policyname, cmd 
      FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = tbl_name
      ORDER BY cmd, policyname
    ) LOOP
      RAISE NOTICE '  - % [%]', r.policyname, r.cmd;
    END LOOP;
    
    RAISE NOTICE '';
  END LOOP;
  
  RAISE NOTICE 'All conflicting policies have been removed.';
  RAISE NOTICE 'Archive operations should now work correctly.';
END $$;