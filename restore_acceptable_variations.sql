-- =====================================================
-- RESTORE ACCEPTABLE_VARIATIONS FROM RAW_JSON TO WORKING_JSON
-- =====================================================
--
-- Purpose: One-time restoration of acceptable_variations that were
--          lost from working_json due to data stripping bug
--
-- Target Session: 03002cb1-5317-4765-843c-67d547bd16a6
--
-- Strategy: Deep traverse through questions → parts → subparts → correct_answers
--           and copy acceptable_variations arrays from raw_json to working_json
--
-- IMPORTANT: This script is IDEMPOTENT - safe to run multiple times
-- =====================================================

DO $$
DECLARE
  v_session_id TEXT := '03002cb1-5317-4765-843c-67d547bd16a6';
  v_raw_json JSONB;
  v_working_json JSONB;
  v_updated_working_json JSONB;
  v_restored_count INTEGER := 0;
  v_question JSONB;
  v_part JSONB;
  v_subpart JSONB;
  v_answer JSONB;
  v_raw_question JSONB;
  v_raw_part JSONB;
  v_raw_subpart JSONB;
  v_raw_answer JSONB;
  v_questions JSONB := '[]'::JSONB;
  v_parts JSONB;
  v_subparts JSONB;
  v_correct_answers JSONB;
  v_idx INTEGER;
  v_part_idx INTEGER;
  v_subpart_idx INTEGER;
  v_ans_idx INTEGER;
BEGIN
  -- Fetch session data
  SELECT raw_json, working_json
  INTO v_raw_json, v_working_json
  FROM past_paper_import_sessions
  WHERE id = v_session_id;

  IF v_raw_json IS NULL THEN
    RAISE EXCEPTION 'Session % not found or has no raw_json', v_session_id;
  END IF;

  -- Initialize working_json if it doesn't exist
  IF v_working_json IS NULL THEN
    v_working_json := v_raw_json;
  END IF;

  RAISE NOTICE 'Starting restoration for session: %', v_session_id;
  RAISE NOTICE 'Questions in raw_json: %', jsonb_array_length(v_raw_json->'questions');
  RAISE NOTICE 'Questions in working_json: %', jsonb_array_length(v_working_json->'questions');

  -- Process each question
  FOR v_idx IN 0..(jsonb_array_length(v_working_json->'questions') - 1) LOOP
    v_question := (v_working_json->'questions')->v_idx;
    v_raw_question := (v_raw_json->'questions')->v_idx;

    -- Restore direct correct_answers
    IF v_question ? 'correct_answers' THEN
      v_correct_answers := '[]'::JSONB;
      FOR v_ans_idx IN 0..(jsonb_array_length(v_question->'correct_answers') - 1) LOOP
        v_answer := (v_question->'correct_answers')->v_ans_idx;
        v_raw_answer := (v_raw_question->'correct_answers')->v_ans_idx;

        -- Restore acceptable_variations if missing in working but exists in raw
        IF NOT (v_answer ? 'acceptable_variations') AND (v_raw_answer ? 'acceptable_variations') THEN
          v_answer := v_answer || jsonb_build_object('acceptable_variations', v_raw_answer->'acceptable_variations');
          v_restored_count := v_restored_count + 1;
          RAISE NOTICE 'Restored variations for Q% direct answer %', v_idx + 1, v_ans_idx + 1;
        END IF;

        v_correct_answers := v_correct_answers || jsonb_build_array(v_answer);
      END LOOP;
      v_question := jsonb_set(v_question, '{correct_answers}', v_correct_answers);
    END IF;

    -- Process parts
    IF v_question ? 'parts' THEN
      v_parts := '[]'::JSONB;
      FOR v_part_idx IN 0..(jsonb_array_length(v_question->'parts') - 1) LOOP
        v_part := (v_question->'parts')->v_part_idx;
        v_raw_part := (v_raw_question->'parts')->v_part_idx;

        -- Restore part correct_answers
        IF v_part ? 'correct_answers' THEN
          v_correct_answers := '[]'::JSONB;
          FOR v_ans_idx IN 0..(jsonb_array_length(v_part->'correct_answers') - 1) LOOP
            v_answer := (v_part->'correct_answers')->v_ans_idx;
            v_raw_answer := (v_raw_part->'correct_answers')->v_ans_idx;

            IF NOT (v_answer ? 'acceptable_variations') AND (v_raw_answer ? 'acceptable_variations') THEN
              v_answer := v_answer || jsonb_build_object('acceptable_variations', v_raw_answer->'acceptable_variations');
              v_restored_count := v_restored_count + 1;
              RAISE NOTICE 'Restored variations for Q% Part % answer %', v_idx + 1, v_part_idx + 1, v_ans_idx + 1;
            END IF;

            v_correct_answers := v_correct_answers || jsonb_build_array(v_answer);
          END LOOP;
          v_part := jsonb_set(v_part, '{correct_answers}', v_correct_answers);
        END IF;

        -- Process subparts
        IF v_part ? 'subparts' THEN
          v_subparts := '[]'::JSONB;
          FOR v_subpart_idx IN 0..(jsonb_array_length(v_part->'subparts') - 1) LOOP
            v_subpart := (v_part->'subparts')->v_subpart_idx;
            v_raw_subpart := (v_raw_part->'subparts')->v_subpart_idx;

            -- Restore subpart correct_answers
            IF v_subpart ? 'correct_answers' THEN
              v_correct_answers := '[]'::JSONB;
              FOR v_ans_idx IN 0..(jsonb_array_length(v_subpart->'correct_answers') - 1) LOOP
                v_answer := (v_subpart->'correct_answers')->v_ans_idx;
                v_raw_answer := (v_raw_subpart->'correct_answers')->v_ans_idx;

                IF NOT (v_answer ? 'acceptable_variations') AND (v_raw_answer ? 'acceptable_variations') THEN
                  v_answer := v_answer || jsonb_build_object('acceptable_variations', v_raw_answer->'acceptable_variations');
                  v_restored_count := v_restored_count + 1;
                  RAISE NOTICE 'Restored variations for Q% Part % Subpart % answer %',
                    v_idx + 1, v_part_idx + 1, v_subpart_idx + 1, v_ans_idx + 1;
                END IF;

                v_correct_answers := v_correct_answers || jsonb_build_array(v_answer);
              END LOOP;
              v_subpart := jsonb_set(v_subpart, '{correct_answers}', v_correct_answers);
            END IF;

            v_subparts := v_subparts || jsonb_build_array(v_subpart);
          END LOOP;
          v_part := jsonb_set(v_part, '{subparts}', v_subparts);
        END IF;

        v_parts := v_parts || jsonb_build_array(v_part);
      END LOOP;
      v_question := jsonb_set(v_question, '{parts}', v_parts);
    END IF;

    -- Add updated question to result
    v_questions := v_questions || jsonb_build_array(v_question);
  END LOOP;

  -- Build final working_json
  v_updated_working_json := jsonb_set(v_working_json, '{questions}', v_questions);

  -- Update database
  UPDATE past_paper_import_sessions
  SET
    working_json = v_updated_working_json,
    last_synced_at = NOW(),
    updated_at = NOW()
  WHERE id = v_session_id;

  RAISE NOTICE '✅ Restoration complete!';
  RAISE NOTICE 'Total acceptable_variations restored: %', v_restored_count;
  RAISE NOTICE 'Updated session: %', v_session_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Restoration failed: %', SQLERRM;
END $$;

-- Verification Query
-- Run this to confirm acceptable_variations are restored
SELECT
  id,
  (working_json->'questions'->1->'parts'->1->'correct_answers'->0->>'acceptable_variations') as part_b_answer_1_variations,
  last_synced_at
FROM past_paper_import_sessions
WHERE id = '03002cb1-5317-4765-843c-67d547bd16a6';
