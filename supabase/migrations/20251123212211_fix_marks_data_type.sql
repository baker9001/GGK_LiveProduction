/*
  # Fix Marks Column Data Type for Partial Credit

  ## Problem
  The marks column in question_correct_answers table is INTEGER type, but
  the questions_master_admin and sub_questions tables use NUMERIC type.
  This prevents storing partial credit marks like 0.5, 1.5, 2.25, etc.

  ## Solution
  Change marks column from INTEGER to NUMERIC to match other tables and
  support fractional marks.

  ## Tables Affected
  - question_correct_answers (marks column)
*/

-- ============================================================================
-- STEP 1: Change marks Column Type
-- ============================================================================

ALTER TABLE question_correct_answers
  ALTER COLUMN marks TYPE numeric USING marks::numeric;

ALTER TABLE question_correct_answers
  ALTER COLUMN marks SET DEFAULT 1;

COMMENT ON COLUMN question_correct_answers.marks IS
  'Marks allocated to this answer alternative. Supports fractional marks for partial credit (e.g., 0.5, 1.5, 2.25)';

-- ============================================================================
-- STEP 2: Verify Data Type Consistency
-- ============================================================================

DO $$
DECLARE
  q_type text;
  sq_type text;
  qca_type text;
BEGIN
  SELECT data_type INTO q_type
  FROM information_schema.columns
  WHERE table_name = 'questions_master_admin' AND column_name = 'marks';

  SELECT data_type INTO sq_type
  FROM information_schema.columns
  WHERE table_name = 'sub_questions' AND column_name = 'marks';

  SELECT data_type INTO qca_type
  FROM information_schema.columns
  WHERE table_name = 'question_correct_answers' AND column_name = 'marks';

  IF q_type = 'numeric' AND sq_type = 'numeric' AND qca_type = 'numeric' THEN
    RAISE NOTICE 'Success: All marks columns are now NUMERIC type';
  ELSE
    RAISE WARNING 'Type mismatch detected: questions=%, sub_questions=%, correct_answers=%',
      q_type, sq_type, qca_type;
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Add Validation Function
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_marks_allocation(
  p_question_id uuid,
  p_sub_question_id uuid
)
RETURNS TABLE(
  is_valid boolean,
  total_marks numeric,
  expected_marks numeric,
  difference numeric,
  message text
) AS $$
DECLARE
  v_total_marks numeric;
  v_expected_marks numeric;
BEGIN
  IF p_question_id IS NOT NULL THEN
    SELECT marks INTO v_expected_marks
    FROM questions_master_admin
    WHERE id = p_question_id;
  ELSIF p_sub_question_id IS NOT NULL THEN
    SELECT marks INTO v_expected_marks
    FROM sub_questions
    WHERE id = p_sub_question_id;
  END IF;

  SELECT COALESCE(SUM(marks), 0) INTO v_total_marks
  FROM question_correct_answers
  WHERE (question_id = p_question_id OR sub_question_id = p_sub_question_id);

  RETURN QUERY SELECT
    (v_total_marks = v_expected_marks)::boolean,
    v_total_marks,
    v_expected_marks,
    v_total_marks - v_expected_marks,
    CASE
      WHEN v_total_marks = v_expected_marks THEN 'Marks allocation is correct'
      WHEN v_total_marks > v_expected_marks THEN 'Over-allocated: ' || (v_total_marks - v_expected_marks)::text || ' extra marks'
      ELSE 'Under-allocated: ' || (v_expected_marks - v_total_marks)::text || ' marks missing'
    END;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION validate_marks_allocation IS
  'Validates that marks allocated to answer alternatives sum to the question total marks';
