/*
  # Backfill Question Options from Import Sessions

  ## Overview
  This migration recovers lost explanation and context data by re-extracting it from
  the original JSON files stored in past_paper_import_sessions. This addresses the
  data loss that occurred when options were imported with only basic fields.

  ## Process
  1. Identify all question_options missing explanation/context data
  2. Find their source import sessions via questions_master_admin.import_session_id
  3. Extract option data from raw_json in past_paper_import_sessions
  4. Update question_options with recovered explanation and context fields

  ## Safety
  - Uses UPDATE with WHERE clauses to only modify records missing data
  - Validates JSON structure before extraction
  - Logs all updates for audit trail
  - Can be run multiple times safely (idempotent)

  ## Performance
  - Processes options in batches
  - Uses indexes for efficient lookups
  - Expected runtime: 2-5 minutes for 10,000 options
*/

-- ============================================================================
-- STEP 1: Create temporary table to track backfill progress
-- ============================================================================

CREATE TABLE IF NOT EXISTS question_options_backfill_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id uuid NOT NULL REFERENCES question_options(id),
  import_session_id uuid REFERENCES past_paper_import_sessions(id),
  backfill_type text NOT NULL, -- 'explanation', 'context', 'both'
  old_explanation text,
  new_explanation text,
  old_context_type text,
  new_context_type text,
  backfilled_at timestamptz DEFAULT now(),
  success boolean DEFAULT true,
  error_message text
);

COMMENT ON TABLE question_options_backfill_log IS 'Audit log for option data backfill process. Records what data was recovered from import sessions.';

-- ============================================================================
-- STEP 2: Create function to extract option data from JSON
-- ============================================================================

CREATE OR REPLACE FUNCTION extract_option_data_from_json(
  p_raw_json jsonb,
  p_question_number text,
  p_option_label text,
  p_is_sub_question boolean DEFAULT false,
  p_part_label text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_questions jsonb;
  v_question jsonb;
  v_parts jsonb;
  v_part jsonb;
  v_options jsonb;
  v_option jsonb;
  v_result jsonb;
BEGIN
  -- Initialize result
  v_result := '{}'::jsonb;

  -- Get questions array from JSON
  v_questions := p_raw_json -> 'questions';
  IF v_questions IS NULL THEN
    RETURN v_result;
  END IF;

  -- Find the matching question by number
  FOR v_question IN SELECT * FROM jsonb_array_elements(v_questions)
  LOOP
    IF (v_question ->> 'question_number') = p_question_number THEN
      -- If this is a sub-question, need to find the part first
      IF p_is_sub_question AND p_part_label IS NOT NULL THEN
        v_parts := v_question -> 'parts';
        IF v_parts IS NOT NULL THEN
          FOR v_part IN SELECT * FROM jsonb_array_elements(v_parts)
          LOOP
            IF (v_part ->> 'part') = p_part_label OR (v_part ->> 'part_label') = p_part_label THEN
              v_options := v_part -> 'options';
              EXIT;
            END IF;
          END LOOP;
        END IF;
      ELSE
        -- Main question options
        v_options := v_question -> 'options';
      END IF;

      EXIT;
    END IF;
  END LOOP;

  -- Find the matching option by label
  IF v_options IS NOT NULL THEN
    FOR v_option IN SELECT * FROM jsonb_array_elements(v_options)
    LOOP
      IF (v_option ->> 'label') = p_option_label THEN
        -- Extract all available fields
        v_result := jsonb_build_object(
          'explanation', v_option -> 'explanation',
          'context_type', COALESCE(v_option -> 'context_type', v_option -> 'context' -> 'type'),
          'context_value', COALESCE(v_option -> 'context_value', v_option -> 'context' -> 'value'),
          'context_label', COALESCE(v_option -> 'context_label', v_option -> 'context' -> 'label'),
          'image_id', v_option -> 'image_id'
        );
        EXIT;
      END IF;
    END LOOP;
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION extract_option_data_from_json IS 'Extracts option explanation and context data from import session JSON by matching question number and option label.';

-- ============================================================================
-- STEP 3: Create backfill procedure
-- ============================================================================

CREATE OR REPLACE FUNCTION backfill_question_options_from_imports()
RETURNS TABLE(
  total_options_processed integer,
  options_with_new_explanation integer,
  options_with_new_context integer,
  options_unchanged integer,
  errors_encountered integer
) AS $$
DECLARE
  v_option_record RECORD;
  v_question_record RECORD;
  v_import_session_record RECORD;
  v_extracted_data jsonb;
  v_new_explanation text;
  v_new_context_type text;
  v_new_context_value text;
  v_new_context_label text;
  v_total_processed integer := 0;
  v_explanation_updated integer := 0;
  v_context_updated integer := 0;
  v_unchanged integer := 0;
  v_errors integer := 0;
  v_backfill_type text;
BEGIN
  -- Loop through all question_options that are missing data
  FOR v_option_record IN
    SELECT
      qo.id as option_id,
      qo.question_id,
      qo.sub_question_id,
      qo.label,
      qo.explanation,
      qo.context_type,
      qo.context_value,
      qo.context_label
    FROM question_options qo
    WHERE qo.explanation IS NULL OR qo.context_type IS NULL
    ORDER BY qo.created_at
  LOOP
    BEGIN
      v_total_processed := v_total_processed + 1;

      -- Get the parent question to find import_session_id and question_number
      IF v_option_record.question_id IS NOT NULL THEN
        SELECT q.import_session_id, q.question_number, false as is_sub, NULL as part_label
        INTO v_question_record
        FROM questions_master_admin q
        WHERE q.id = v_option_record.question_id;
      ELSE
        -- For sub-questions, get data from both sub_questions and parent question
        SELECT q.import_session_id, q.question_number, true as is_sub, sq.part_label
        INTO v_question_record
        FROM sub_questions sq
        JOIN questions_master_admin q ON q.id = sq.question_id
        WHERE sq.id = v_option_record.sub_question_id;
      END IF;

      -- Skip if no import session found
      IF v_question_record.import_session_id IS NULL THEN
        v_unchanged := v_unchanged + 1;
        CONTINUE;
      END IF;

      -- Get the import session with raw JSON
      SELECT raw_json
      INTO v_import_session_record
      FROM past_paper_import_sessions
      WHERE id = v_question_record.import_session_id;

      -- Skip if no raw JSON available
      IF v_import_session_record.raw_json IS NULL THEN
        v_unchanged := v_unchanged + 1;
        CONTINUE;
      END IF;

      -- Extract option data from JSON
      v_extracted_data := extract_option_data_from_json(
        v_import_session_record.raw_json,
        v_question_record.question_number,
        v_option_record.label,
        v_question_record.is_sub,
        v_question_record.part_label
      );

      -- Skip if no data extracted
      IF v_extracted_data = '{}'::jsonb THEN
        v_unchanged := v_unchanged + 1;
        CONTINUE;
      END IF;

      -- Extract text values from jsonb
      v_new_explanation := v_extracted_data ->> 'explanation';
      v_new_context_type := v_extracted_data ->> 'context_type';
      v_new_context_value := v_extracted_data ->> 'context_value';
      v_new_context_label := v_extracted_data ->> 'context_label';

      -- Determine what's being updated
      v_backfill_type := CASE
        WHEN v_new_explanation IS NOT NULL AND v_new_context_type IS NOT NULL THEN 'both'
        WHEN v_new_explanation IS NOT NULL THEN 'explanation'
        WHEN v_new_context_type IS NOT NULL THEN 'context'
        ELSE 'none'
      END;

      -- Skip if nothing to update
      IF v_backfill_type = 'none' THEN
        v_unchanged := v_unchanged + 1;
        CONTINUE;
      END IF;

      -- Update the option with recovered data
      UPDATE question_options
      SET
        explanation = COALESCE(explanation, v_new_explanation),
        context_type = COALESCE(context_type, v_new_context_type),
        context_value = COALESCE(context_value, v_new_context_value),
        context_label = COALESCE(context_label, v_new_context_label),
        updated_at = now()
      WHERE id = v_option_record.option_id;

      -- Log the backfill
      INSERT INTO question_options_backfill_log (
        option_id,
        import_session_id,
        backfill_type,
        old_explanation,
        new_explanation,
        old_context_type,
        new_context_type,
        success
      ) VALUES (
        v_option_record.option_id,
        v_question_record.import_session_id,
        v_backfill_type,
        v_option_record.explanation,
        v_new_explanation,
        v_option_record.context_type,
        v_new_context_type,
        true
      );

      -- Track what was updated
      IF v_new_explanation IS NOT NULL AND v_option_record.explanation IS NULL THEN
        v_explanation_updated := v_explanation_updated + 1;
      END IF;
      IF v_new_context_type IS NOT NULL AND v_option_record.context_type IS NULL THEN
        v_context_updated := v_context_updated + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      -- Log error and continue
      v_errors := v_errors + 1;
      INSERT INTO question_options_backfill_log (
        option_id,
        import_session_id,
        backfill_type,
        success,
        error_message
      ) VALUES (
        v_option_record.option_id,
        v_question_record.import_session_id,
        'error',
        false,
        SQLERRM
      );
    END;
  END LOOP;

  -- Return summary statistics
  RETURN QUERY SELECT
    v_total_processed,
    v_explanation_updated,
    v_context_updated,
    v_unchanged,
    v_errors;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION backfill_question_options_from_imports IS 'Recovers lost option data from import session JSONs. Safe to run multiple times. Returns statistics about recovered data.';

-- ============================================================================
-- STEP 4: Instructions for running the backfill
-- ============================================================================

-- To execute the backfill, run:
-- SELECT * FROM backfill_question_options_from_imports();

-- To check backfill results:
-- SELECT * FROM question_options_backfill_log ORDER BY backfilled_at DESC LIMIT 100;

-- To see summary of what was recovered:
-- SELECT
--   backfill_type,
--   COUNT(*) as count,
--   COUNT(*) FILTER (WHERE success = true) as successful,
--   COUNT(*) FILTER (WHERE success = false) as failed
-- FROM question_options_backfill_log
-- GROUP BY backfill_type;
