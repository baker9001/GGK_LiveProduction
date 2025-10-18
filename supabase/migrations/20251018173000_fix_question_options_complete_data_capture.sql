/*
  # Fix Question Options Data Capture - Complete Implementation

  ## Overview
  This migration addresses the critical data loss issue where only 47% of question_options
  columns are populated during import. It consolidates duplicate columns, adds constraints,
  and prepares the table for complete data capture.

  ## Changes

  1. Schema Optimization
     - Migrate data from duplicate `text` column to `option_text`
     - Drop redundant `text` column
     - Add NOT NULL constraint on `option_text`
     - Add check constraint for label format

  2. Indexes for Performance
     - Add index on (question_id, label) for fast option lookup
     - Add index on (sub_question_id, label) for sub-question options
     - Add index on is_correct for filtering correct answers
     - Add index on context fields for analytics queries

  3. Data Validation
     - Ensure all existing options have valid option_text
     - Add constraints to prevent future data quality issues

  ## Security
  - No RLS changes (already enabled)
  - Maintains existing policies
*/

-- ============================================================================
-- STEP 1: Data Migration and Cleanup
-- ============================================================================

-- Migrate any data from 'text' column to 'option_text' if needed
UPDATE question_options
SET option_text = text
WHERE (option_text IS NULL OR option_text = '') AND text IS NOT NULL AND text != '';

-- Ensure option_text is populated (use label as fallback if both are empty)
UPDATE question_options
SET option_text = COALESCE(NULLIF(option_text, ''), NULLIF(text, ''), 'Option ' || label)
WHERE option_text IS NULL OR option_text = '';

-- ============================================================================
-- STEP 2: Drop Duplicate Column
-- ============================================================================

-- Drop the duplicate 'text' column
ALTER TABLE question_options DROP COLUMN IF EXISTS text;

-- ============================================================================
-- STEP 3: Add Constraints
-- ============================================================================

-- Ensure option_text is never NULL or empty
ALTER TABLE question_options
ALTER COLUMN option_text SET NOT NULL;

-- Add check constraint for option_text minimum length
ALTER TABLE question_options
ADD CONSTRAINT check_option_text_not_empty
CHECK (length(trim(option_text)) > 0);

-- Add check constraint for label format (A-Z, AA-ZZ)
ALTER TABLE question_options
ADD CONSTRAINT check_option_label_format
CHECK (label ~ '^[A-Z]{1,2}$');

-- Add check constraint: either question_id or sub_question_id must be set
ALTER TABLE question_options
ADD CONSTRAINT check_option_parent_exists
CHECK (
  (question_id IS NOT NULL AND sub_question_id IS NULL) OR
  (question_id IS NULL AND sub_question_id IS NOT NULL)
);

-- ============================================================================
-- STEP 4: Add Performance Indexes
-- ============================================================================

-- Index for fast option lookup by question and label
CREATE INDEX IF NOT EXISTS idx_question_options_question_label
ON question_options(question_id, label)
WHERE question_id IS NOT NULL;

-- Index for fast option lookup by sub-question and label
CREATE INDEX IF NOT EXISTS idx_question_options_sub_question_label
ON question_options(sub_question_id, label)
WHERE sub_question_id IS NOT NULL;

-- Index for filtering correct answers
CREATE INDEX IF NOT EXISTS idx_question_options_is_correct
ON question_options(is_correct)
WHERE is_correct = true;

-- Index for analytics queries on context fields
CREATE INDEX IF NOT EXISTS idx_question_options_context
ON question_options(context_type, context_value)
WHERE context_type IS NOT NULL;

-- Index for image-based options
CREATE INDEX IF NOT EXISTS idx_question_options_image_id
ON question_options(image_id)
WHERE image_id IS NOT NULL;

-- ============================================================================
-- STEP 5: Add Comments for Documentation
-- ============================================================================

COMMENT ON TABLE question_options IS 'Stores all answer options for MCQ and True/False questions. Each question should have 2-6 options with exactly one marked as correct.';

COMMENT ON COLUMN question_options.option_text IS 'The text content of this answer option. Required field, minimum 1 character.';
COMMENT ON COLUMN question_options.label IS 'The option label (A, B, C, D, etc.). Must match pattern ^[A-Z]{1,2}$';
COMMENT ON COLUMN question_options.is_correct IS 'Boolean flag indicating if this is the correct answer. Exactly one option per question should be true.';
COMMENT ON COLUMN question_options.explanation IS 'Educational content explaining why this option is correct or incorrect. Highly recommended for learning value.';
COMMENT ON COLUMN question_options.image_id IS 'Optional reference to questions_attachments table if this option includes an image.';
COMMENT ON COLUMN question_options.context_type IS 'Analytics metadata: type of context (e.g., "concept", "calculation", "definition")';
COMMENT ON COLUMN question_options.context_value IS 'Analytics metadata: specific value identifier for tracking';
COMMENT ON COLUMN question_options.context_label IS 'Analytics metadata: human-readable label for reporting';
COMMENT ON COLUMN question_options.order IS 'Display order of this option (0-based index). Used for randomization tracking.';

-- ============================================================================
-- STEP 6: Create Validation View
-- ============================================================================

CREATE OR REPLACE VIEW question_options_validation AS
SELECT
  qo.id,
  qo.question_id,
  qo.sub_question_id,
  qo.label,
  qo.option_text,
  qo.is_correct,
  qo.explanation IS NOT NULL as has_explanation,
  qo.image_id IS NOT NULL as has_image,
  qo.context_type IS NOT NULL as has_context,
  length(qo.option_text) as text_length,
  CASE
    WHEN qo.explanation IS NULL THEN 'Missing explanation - reduces learning value'
    WHEN length(qo.explanation) < 10 THEN 'Explanation too short - should be more detailed'
    ELSE 'OK'
  END as explanation_quality,
  CASE
    WHEN qo.context_type IS NULL THEN 'Missing context metadata - analytics incomplete'
    ELSE 'OK'
  END as analytics_status
FROM question_options qo;

COMMENT ON VIEW question_options_validation IS 'Quality assurance view showing data completeness for each option. Use this to identify options missing explanations or context metadata.';

-- ============================================================================
-- STEP 7: Create Helper Function for Option Validation
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_question_options(p_question_id uuid)
RETURNS TABLE(
  validation_status text,
  total_options integer,
  correct_options integer,
  options_with_explanation integer,
  options_with_context integer,
  missing_data_fields text[]
) AS $$
BEGIN
  RETURN QUERY
  WITH option_stats AS (
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE is_correct = true) as correct_count,
      COUNT(*) FILTER (WHERE explanation IS NOT NULL) as with_explanation,
      COUNT(*) FILTER (WHERE context_type IS NOT NULL) as with_context
    FROM question_options
    WHERE question_id = p_question_id
  )
  SELECT
    CASE
      WHEN s.correct_count = 0 THEN 'ERROR: No correct answer marked'
      WHEN s.correct_count > 1 THEN 'ERROR: Multiple correct answers marked'
      WHEN s.total < 2 THEN 'ERROR: Less than 2 options'
      WHEN s.with_explanation < s.total THEN 'WARNING: Missing explanations'
      WHEN s.with_context < s.total THEN 'WARNING: Missing context metadata'
      ELSE 'OK'
    END as validation_status,
    s.total::integer,
    s.correct_count::integer,
    s.with_explanation::integer,
    s.with_context::integer,
    ARRAY[
      CASE WHEN s.with_explanation < s.total THEN 'explanation' END,
      CASE WHEN s.with_context < s.total THEN 'context_metadata' END,
      CASE WHEN s.correct_count != 1 THEN 'is_correct' END
    ]::text[] as missing_data_fields
  FROM option_stats s;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_question_options IS 'Validates that a question has proper options setup with correct answer marked and complete metadata. Returns validation status and completeness metrics.';

-- ============================================================================
-- STEP 8: Create Aggregate Statistics View
-- ============================================================================

CREATE OR REPLACE VIEW question_options_completeness_stats AS
SELECT
  COUNT(DISTINCT qo.question_id) as total_questions_with_options,
  COUNT(*) as total_options,
  COUNT(*) FILTER (WHERE qo.explanation IS NOT NULL) as options_with_explanation,
  COUNT(*) FILTER (WHERE qo.image_id IS NOT NULL) as options_with_image,
  COUNT(*) FILTER (WHERE qo.context_type IS NOT NULL) as options_with_context,
  ROUND(100.0 * COUNT(*) FILTER (WHERE qo.explanation IS NOT NULL) / COUNT(*), 2) as explanation_completion_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE qo.context_type IS NOT NULL) / COUNT(*), 2) as context_completion_pct,
  ROUND(AVG(length(qo.option_text)), 0) as avg_option_text_length,
  ROUND(AVG(length(qo.explanation)) FILTER (WHERE qo.explanation IS NOT NULL), 0) as avg_explanation_length
FROM question_options qo;

COMMENT ON VIEW question_options_completeness_stats IS 'Aggregate statistics showing data completeness across all question options. Use to monitor import quality and identify data gaps.';
