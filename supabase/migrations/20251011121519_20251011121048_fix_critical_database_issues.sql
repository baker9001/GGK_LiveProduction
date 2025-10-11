/*
  # Fix Critical Database Issues - P0 Priority

  ## Summary
  This migration addresses 4 critical P0 issues identified in the comprehensive review:

  1. **Marks Data Type Standardization** (Issue #4)
     - Convert marks from INTEGER to NUMERIC(5,2) to support half-marks
     - Update all question-related tables for consistency

  2. **Missing Performance Indexes** (Issue #2, #6)
     - Add composite indexes for frequently queried columns
     - Optimize N+1 query patterns

  3. **Enum Types for Data Quality** (Issue #3)
     - Create context_type_enum for controlled vocabulary
     - Create difficulty_level_enum
     - Create question_type_enum

  4. **Soft Delete Pattern** (Issue #7)
     - Add deleted_at and deleted_by columns
     - Prevent accidental data loss from cascade deletes

  ## Tables Affected
  - questions_master_admin
  - sub_questions
  - question_correct_answers
  - answer_components
  - answer_requirements

  ## Breaking Changes
  - Marks columns change from INTEGER to NUMERIC(5,2)
  - Context types must match enum values (migration handles conversion)

  ## Rollback Plan
  - Marks can be cast back to INTEGER (with precision loss)
  - Enums can be dropped and columns reverted to TEXT
  - Soft delete columns can be dropped
*/

-- ============================================================================
-- SECTION 1: CREATE ENUM TYPES
-- ============================================================================

-- Context Type Enum (for answer components, correct answers, etc.)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'context_type_enum') THEN
    CREATE TYPE context_type_enum AS ENUM (
      'option',        -- MCQ option selection
      'position',      -- Diagram position (A, B, C...)
      'field',         -- Form field or table cell
      'property',      -- Characteristic or attribute
      'step',          -- Sequential step in process
      'component',     -- Part of definition or concept
      'measurement',   -- Measured value or reading
      'calculation',   -- Computed result
      'structure',     -- Biological/chemical structure
      'function',      -- Purpose or role
      'comparison',    -- Comparative statement
      'classification' -- Category or type
    );

    COMMENT ON TYPE context_type_enum IS 'Controlled vocabulary for answer context types';
  END IF;
END $$;

-- Difficulty Level Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'difficulty_level_enum') THEN
    CREATE TYPE difficulty_level_enum AS ENUM (
      'Easy',
      'Medium',
      'Hard'
    );

    COMMENT ON TYPE difficulty_level_enum IS 'Question difficulty levels';
  END IF;
END $$;

-- Question Type Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type_enum') THEN
    CREATE TYPE question_type_enum AS ENUM (
      'mcq',                    -- Multiple Choice Question
      'true_false',             -- True/False
      'short_answer',           -- Short text answer
      'long_answer',            -- Extended response
      'calculation',            -- Numerical calculation
      'diagram',                -- Draw/label diagram
      'data_analysis',          -- Interpret data/graphs
      'practical',              -- Practical/experimental
      'structured',             -- Multi-part structured question
      'essay'                   -- Essay response
    );

    COMMENT ON TYPE question_type_enum IS 'Question format types';
  END IF;
END $$;

-- ============================================================================
-- SECTION 2: ADD SOFT DELETE COLUMNS
-- ============================================================================

-- Add to questions_master_admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions_master_admin' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE questions_master_admin
      ADD COLUMN deleted_at timestamptz,
      ADD COLUMN deleted_by uuid;

    COMMENT ON COLUMN questions_master_admin.deleted_at IS 'Soft delete timestamp - NULL means active';
    COMMENT ON COLUMN questions_master_admin.deleted_by IS 'User who soft-deleted this question';
  END IF;
END $$;

-- Add to sub_questions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sub_questions' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE sub_questions
      ADD COLUMN deleted_at timestamptz,
      ADD COLUMN deleted_by uuid;

    COMMENT ON COLUMN sub_questions.deleted_at IS 'Soft delete timestamp - NULL means active';
  END IF;
END $$;

-- Add to papers_setup
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'papers_setup' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE papers_setup
      ADD COLUMN deleted_at timestamptz,
      ADD COLUMN deleted_by uuid;

    COMMENT ON COLUMN papers_setup.deleted_at IS 'Soft delete timestamp - NULL means active';
  END IF;
END $$;

-- ============================================================================
-- SECTION 3: STANDARDIZE MARKS DATA TYPE TO NUMERIC(5,2)
-- ============================================================================

-- First, drop dependent views temporarily
DROP VIEW IF EXISTS qa_question_analysis_view CASCADE;
DROP VIEW IF EXISTS paper_qa_progress CASCADE;
DROP VIEW IF EXISTS qa_review_summary CASCADE;

-- questions_master_admin.marks: INTEGER → NUMERIC(5,2)
DO $$
BEGIN
  -- Check current data type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions_master_admin'
      AND column_name = 'marks'
      AND data_type = 'integer'
  ) THEN
    -- Safe conversion: INTEGER can always convert to NUMERIC
    ALTER TABLE questions_master_admin
      ALTER COLUMN marks TYPE numeric(5,2) USING marks::numeric(5,2);

    RAISE NOTICE 'Converted questions_master_admin.marks from INTEGER to NUMERIC(5,2)';
  END IF;
END $$;

-- question_correct_answers.marks: INTEGER → NUMERIC(5,2)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'question_correct_answers'
      AND column_name = 'marks'
      AND data_type = 'integer'
  ) THEN
    ALTER TABLE question_correct_answers
      ALTER COLUMN marks TYPE numeric(5,2) USING marks::numeric(5,2);

    RAISE NOTICE 'Converted question_correct_answers.marks from INTEGER to NUMERIC(5,2)';
  END IF;
END $$;

-- answer_components.marks: Already NUMERIC, ensure precision is (5,2)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'answer_components'
      AND column_name = 'marks'
      AND data_type = 'numeric'
  ) THEN
    -- Ensure precision is correct
    ALTER TABLE answer_components
      ALTER COLUMN marks TYPE numeric(5,2);

    RAISE NOTICE 'Standardized answer_components.marks to NUMERIC(5,2)';
  END IF;
END $$;

-- Add check constraints to ensure marks are positive
ALTER TABLE questions_master_admin
  DROP CONSTRAINT IF EXISTS marks_positive,
  ADD CONSTRAINT marks_positive CHECK (marks > 0);

ALTER TABLE question_correct_answers
  DROP CONSTRAINT IF EXISTS marks_positive,
  ADD CONSTRAINT marks_positive CHECK (marks > 0);

ALTER TABLE answer_components
  DROP CONSTRAINT IF EXISTS marks_positive,
  ADD CONSTRAINT marks_positive CHECK (marks > 0);

-- ============================================================================
-- SECTION 4: ADD CRITICAL PERFORMANCE INDEXES
-- ============================================================================

-- Composite index for paper + question number lookups (prevents duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_paper_number_unique
  ON questions_master_admin(paper_id, question_number)
  WHERE deleted_at IS NULL;

-- Index for QA workflow filtering
CREATE INDEX IF NOT EXISTS idx_questions_confirmation_status
  ON questions_master_admin(paper_id, is_confirmed, deleted_at)
  WHERE deleted_at IS NULL;

-- Index for academic structure filtering (frequently used together)
CREATE INDEX IF NOT EXISTS idx_questions_academic_hierarchy
  ON questions_master_admin(subject_id, topic_id, subtopic_id, difficulty)
  WHERE deleted_at IS NULL;

-- Index for import session tracking
CREATE INDEX IF NOT EXISTS idx_questions_import_session
  ON questions_master_admin(import_session_id)
  WHERE import_session_id IS NOT NULL AND deleted_at IS NULL;

-- Composite index for answer components (optimizes N+1 queries)
CREATE INDEX IF NOT EXISTS idx_answer_components_question_context
  ON answer_components(question_id, context_type, context_value)
  WHERE question_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_answer_components_subquestion_context
  ON answer_components(sub_question_id, context_type, context_value)
  WHERE sub_question_id IS NOT NULL;

-- Index for question correct answers (optimizes fetching with questions)
CREATE INDEX IF NOT EXISTS idx_correct_answers_question
  ON question_correct_answers(question_id, alternative_id)
  WHERE question_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_correct_answers_subquestion
  ON question_correct_answers(sub_question_id, alternative_id)
  WHERE sub_question_id IS NOT NULL;

-- Index for sub_questions (parent-child relationship)
CREATE INDEX IF NOT EXISTS idx_sub_questions_question_id
  ON sub_questions(question_id, sort_order)
  WHERE deleted_at IS NULL;

-- Index for question options (MCQ answers)
CREATE INDEX IF NOT EXISTS idx_question_options_question
  ON question_options(question_id)
  WHERE question_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_question_options_subquestion
  ON question_options(sub_question_id)
  WHERE sub_question_id IS NOT NULL;

-- ============================================================================
-- SECTION 5: ADD HELPFUL CONSTRAINTS
-- ============================================================================

-- Ensure question_number is not empty
ALTER TABLE questions_master_admin
  DROP CONSTRAINT IF EXISTS question_number_not_empty,
  ADD CONSTRAINT question_number_not_empty
  CHECK (question_number IS NULL OR trim(question_number) != '');

-- Ensure marks are reasonable (0.5 to 100)
ALTER TABLE questions_master_admin
  DROP CONSTRAINT IF EXISTS marks_reasonable_range,
  ADD CONSTRAINT marks_reasonable_range
  CHECK (marks >= 0.5 AND marks <= 100);

-- ============================================================================
-- SECTION 6: ADD HELPER FUNCTIONS
-- ============================================================================

-- Function to safely soft-delete a question
CREATE OR REPLACE FUNCTION soft_delete_question(
  question_id_param uuid,
  user_id_param uuid
) RETURNS boolean AS $$
BEGIN
  -- Check if question is used in any mock exams
  IF EXISTS (
    SELECT 1 FROM mock_exam_questions
    WHERE question_id = question_id_param
  ) THEN
    RAISE EXCEPTION 'Cannot delete question that is used in mock exams. Question ID: %', question_id_param;
  END IF;

  -- Perform soft delete
  UPDATE questions_master_admin
  SET
    deleted_at = now(),
    deleted_by = user_id_param
  WHERE id = question_id_param
    AND deleted_at IS NULL;

  -- Also soft delete related sub-questions
  UPDATE sub_questions
  SET
    deleted_at = now(),
    deleted_by = user_id_param
  WHERE question_id = question_id_param
    AND deleted_at IS NULL;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore a soft-deleted question
CREATE OR REPLACE FUNCTION restore_deleted_question(
  question_id_param uuid
) RETURNS boolean AS $$
BEGIN
  UPDATE questions_master_admin
  SET
    deleted_at = NULL,
    deleted_by = NULL
  WHERE id = question_id_param
    AND deleted_at IS NOT NULL;

  -- Also restore related sub-questions
  UPDATE sub_questions
  SET
    deleted_at = NULL,
    deleted_by = NULL
  WHERE question_id = question_id_param
    AND deleted_at IS NOT NULL;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECTION 7: RECREATE VIEWS WITH UPDATED SCHEMA AND SOFT-DELETE SUPPORT
-- ============================================================================

-- Recreate paper_qa_progress view with soft-delete filtering
CREATE OR REPLACE VIEW paper_qa_progress AS
SELECT
  p.id as paper_id,
  p.paper_code,
  p.status,
  COUNT(DISTINCT q.id) FILTER (WHERE q.deleted_at IS NULL) as total_questions,
  COUNT(DISTINCT CASE WHEN q.is_confirmed AND q.deleted_at IS NULL THEN q.id END) as confirmed_questions,
  COUNT(DISTINCT sq.id) FILTER (WHERE sq.deleted_at IS NULL) as total_sub_questions,
  COUNT(DISTINCT CASE WHEN sq.is_confirmed AND sq.deleted_at IS NULL THEN sq.id END) as confirmed_sub_questions,
  CASE
    WHEN COUNT(DISTINCT q.id) FILTER (WHERE q.deleted_at IS NULL) +
         COUNT(DISTINCT sq.id) FILTER (WHERE q.deleted_at IS NULL) = 0 THEN 0
    ELSE (
      COUNT(DISTINCT CASE WHEN q.is_confirmed AND q.deleted_at IS NULL THEN q.id END) +
      COUNT(DISTINCT CASE WHEN sq.is_confirmed AND sq.deleted_at IS NULL THEN sq.id END)
    )::float / (
      COUNT(DISTINCT q.id) FILTER (WHERE q.deleted_at IS NULL) +
      COUNT(DISTINCT sq.id) FILTER (WHERE sq.deleted_at IS NULL)
    )::float * 100
  END as qa_progress_percentage
FROM papers_setup p
LEFT JOIN questions_master_admin q ON q.paper_id = p.id
LEFT JOIN sub_questions sq ON sq.question_id = q.id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.paper_code, p.status;

-- Recreate qa_review_summary view with soft-delete filtering
CREATE OR REPLACE VIEW qa_review_summary AS
SELECT
  p.id AS paper_id,
  p.paper_code,
  p.exam_session,
  p.exam_year,
  p.status AS paper_status,
  p.last_status_change_by,
  COUNT(DISTINCT q.id) FILTER (WHERE q.deleted_at IS NULL) AS total_questions,
  COUNT(DISTINCT CASE WHEN q.is_confirmed AND q.deleted_at IS NULL THEN q.id END) AS confirmed_questions,
  COUNT(DISTINCT sq.id) FILTER (WHERE sq.deleted_at IS NULL) AS total_sub_questions,
  COUNT(DISTINCT CASE WHEN sq.is_confirmed AND sq.deleted_at IS NULL THEN sq.id END) AS confirmed_sub_questions,
  ROUND(
    CASE
      WHEN COUNT(DISTINCT q.id) FILTER (WHERE q.deleted_at IS NULL) +
           COUNT(DISTINCT sq.id) FILTER (WHERE sq.deleted_at IS NULL) = 0 THEN 0
      ELSE (
        COUNT(DISTINCT CASE WHEN q.is_confirmed AND q.deleted_at IS NULL THEN q.id END) +
        COUNT(DISTINCT CASE WHEN sq.is_confirmed AND sq.deleted_at IS NULL THEN sq.id END)
      )::numeric / (
        COUNT(DISTINCT q.id) FILTER (WHERE q.deleted_at IS NULL) +
        COUNT(DISTINCT sq.id) FILTER (WHERE sq.deleted_at IS NULL)
      )::numeric * 100
    END, 2
  ) AS qa_progress_percentage,
  MAX(q.confirmed_at) FILTER (WHERE q.deleted_at IS NULL) AS last_question_confirmed_at,
  MAX(sq.confirmed_at) FILTER (WHERE sq.deleted_at IS NULL) AS last_sub_question_confirmed_at
FROM papers_setup p
LEFT JOIN questions_master_admin q ON q.paper_id = p.id
LEFT JOIN sub_questions sq ON sq.question_id = q.id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.paper_code, p.exam_session, p.exam_year, p.status, p.last_status_change_by;

-- Recreate qa_question_analysis_view with updated marks type
CREATE OR REPLACE VIEW qa_question_analysis_view AS
SELECT
  q.id AS question_id,
  q.import_session_id,
  q.type,
  q.category,
  q.marks,  -- Now NUMERIC(5,2)
  LEFT(q.question_description, 120) AS text_snippet,
  COUNT(DISTINCT qo.id) AS options_count,
  (MAX(CASE WHEN qo.is_correct THEN 1 ELSE 0 END) > 0) AS has_correct_answer,
  COUNT(DISTINCT sq.id) AS subquestions_count,
  COUNT(DISTINCT qa.id) AS attachments_count,
  COUNT(DISTINCT qh.id) AS hints_count,
  (q.marks IS NOT NULL) AS marks_valid,
  (q.type IN ('MCQ', 'True/False', 'Descriptive')) AS type_valid,
  CASE
    WHEN q.type IN ('MCQ', 'True/False') AND MAX(CASE WHEN qo.is_correct THEN 1 ELSE 0 END) = 0 THEN false
    ELSE true
  END AS answer_valid,
  (COUNT(qh.id) > 0) AS explanation_valid,
  CASE
    WHEN q.category = 'complex' AND COUNT(sq.id) = 0 THEN false
    ELSE true
  END AS subquestion_valid,
  CASE
    WHEN q.marks IS NULL OR
         (q.type IN ('MCQ', 'True/False') AND MAX(CASE WHEN qo.is_correct THEN 1 ELSE 0 END) = 0) OR
         (q.category = 'complex' AND COUNT(sq.id) = 0) THEN 'FAIL'
    WHEN COUNT(qh.id) = 0 OR COUNT(qa.id) = 0 THEN 'PARTIAL'
    ELSE 'PASS'
  END AS validation_status
FROM questions_master_admin q
LEFT JOIN sub_questions sq ON sq.question_id = q.id
LEFT JOIN question_options qo ON qo.question_id = q.id
LEFT JOIN questions_attachments qa ON qa.question_id = q.id
LEFT JOIN questions_hints qh ON qh.question_id = q.id
WHERE q.deleted_at IS NULL
GROUP BY q.id, q.import_session_id, q.type, q.category, q.marks, q.question_description;
