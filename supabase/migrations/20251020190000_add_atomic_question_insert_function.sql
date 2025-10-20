/*
  # Add Atomic Question Insert Function

  ## Overview
  This migration creates an RPC function to insert questions with all related data
  in a single atomic transaction. This prevents partial data insertion if any
  operation fails.

  ## Changes
  1. Create `insert_question_atomic()` RPC function
     - Inserts question to questions_master_admin
     - Inserts all related data (options, answers, attachments, topics)
     - All operations in single transaction
     - Returns success/error with details

  2. Benefits
     - Ensures data consistency
     - Prevents orphaned records
     - Automatic rollback on any error
     - Better error reporting

  ## Usage
  ```typescript
  const result = await supabase.rpc('insert_question_atomic', {
    p_question: { paper_id: '...', question_description: '...', ... },
    p_options: [{ option_text: 'A', label: 'A', is_correct: false, order: 0 }],
    p_answers: [{ answer: 'Correct answer', marks: 1 }],
    p_attachments: [{ file_url: 'https://...', file_name: 'fig1.png' }],
    p_topics: ['topic-uuid-1', 'topic-uuid-2'],
    p_subtopics: ['subtopic-uuid-1']
  });
  ```

  ## Security
  - Function runs with caller's permissions (not SECURITY DEFINER)
  - RLS policies still apply to all operations
  - No privilege escalation
*/

-- ============================================================================
-- Create atomic question insert function
-- ============================================================================

CREATE OR REPLACE FUNCTION insert_question_atomic(
  p_question jsonb,
  p_options jsonb DEFAULT '[]'::jsonb,
  p_answers jsonb DEFAULT '[]'::jsonb,
  p_attachments jsonb DEFAULT '[]'::jsonb,
  p_topics text[] DEFAULT '{}',
  p_subtopics text[] DEFAULT '{}'
) RETURNS jsonb AS $$
DECLARE
  v_question_id uuid;
  v_result jsonb;
  v_inserted_count integer;
BEGIN
  -- Validate input
  IF p_question IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Question data is required',
      'error_code', 'INVALID_INPUT'
    );
  END IF;

  -- Insert main question
  -- Note: All columns from p_question jsonb will be inserted
  INSERT INTO questions_master_admin (
    paper_id,
    data_structure_id,
    region_id,
    program_id,
    provider_id,
    subject_id,
    chapter_id,
    topic_id,
    subtopic_id,
    category,
    type,
    question_number,
    question_header,
    question_description,
    question_content_type,
    explanation,
    hint,
    marks,
    difficulty,
    status,
    year,
    import_session_id,
    answer_format,
    answer_requirement,
    total_alternatives,
    correct_answer,
    figure_required,
    created_by,
    updated_by,
    updated_at
  )
  SELECT
    (p_question->>'paper_id')::uuid,
    (p_question->>'data_structure_id')::uuid,
    (p_question->>'region_id')::uuid,
    (p_question->>'program_id')::uuid,
    (p_question->>'provider_id')::uuid,
    (p_question->>'subject_id')::uuid,
    (p_question->>'chapter_id')::uuid,
    (p_question->>'topic_id')::uuid,
    (p_question->>'subtopic_id')::uuid,
    p_question->>'category',
    p_question->>'type',
    (p_question->>'question_number')::integer,
    p_question->>'question_header',
    p_question->>'question_description',
    p_question->>'question_content_type',
    p_question->>'explanation',
    p_question->>'hint',
    (p_question->>'marks')::numeric,
    p_question->>'difficulty',
    COALESCE(p_question->>'status', 'active'),
    (p_question->>'year')::integer,
    (p_question->>'import_session_id')::uuid,
    p_question->>'answer_format',
    p_question->>'answer_requirement',
    (p_question->>'total_alternatives')::integer,
    p_question->>'correct_answer',
    (p_question->>'figure_required')::boolean,
    (p_question->>'created_by')::uuid,
    (p_question->>'updated_by')::uuid,
    (p_question->>'updated_at')::timestamptz
  RETURNING id INTO v_question_id;

  -- Insert MCQ options if provided
  IF jsonb_array_length(p_options) > 0 THEN
    INSERT INTO question_options (
      question_id,
      option_text,
      label,
      is_correct,
      "order",
      explanation,
      image_id,
      context_type,
      context_value,
      context_label
    )
    SELECT
      v_question_id,
      opt->>'option_text',
      opt->>'label',
      COALESCE((opt->>'is_correct')::boolean, false),
      (opt->>'order')::integer,
      opt->>'explanation',
      (opt->>'image_id')::uuid,
      opt->>'context_type',
      opt->>'context_value',
      opt->>'context_label'
    FROM jsonb_array_elements(p_options) AS opt;

    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
    RAISE NOTICE 'Inserted % options', v_inserted_count;
  END IF;

  -- Insert correct answers if provided
  IF jsonb_array_length(p_answers) > 0 THEN
    INSERT INTO question_correct_answers (
      question_id,
      answer,
      marks,
      alternative_id,
      context_type,
      context_value,
      context_label
    )
    SELECT
      v_question_id,
      ans->>'answer',
      (ans->>'marks')::numeric,
      (ans->>'alternative_id')::integer,
      ans->>'context_type',
      ans->>'context_value',
      ans->>'context_label'
    FROM jsonb_array_elements(p_answers) AS ans;

    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
    RAISE NOTICE 'Inserted % answers', v_inserted_count;
  END IF;

  -- Insert attachments if provided
  IF jsonb_array_length(p_attachments) > 0 THEN
    INSERT INTO questions_attachments (
      question_id,
      file_url,
      file_name,
      file_type,
      file_size,
      uploaded_by,
      uploaded_at
    )
    SELECT
      v_question_id,
      att->>'file_url',
      att->>'file_name',
      att->>'file_type',
      (att->>'file_size')::integer,
      (att->>'uploaded_by')::uuid,
      (att->>'uploaded_at')::timestamptz
    FROM jsonb_array_elements(p_attachments) AS att
    WHERE att->>'file_url' IS NOT NULL AND trim(att->>'file_url') != '';

    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
    RAISE NOTICE 'Inserted % attachments', v_inserted_count;
  END IF;

  -- Insert additional topics if provided
  IF array_length(p_topics, 1) > 0 THEN
    INSERT INTO question_topics (question_id, topic_id)
    SELECT v_question_id, topic_id::uuid
    FROM unnest(p_topics) AS topic_id
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
    RAISE NOTICE 'Inserted % additional topics', v_inserted_count;
  END IF;

  -- Insert additional subtopics if provided
  IF array_length(p_subtopics, 1) > 0 THEN
    INSERT INTO question_subtopics (question_id, subtopic_id)
    SELECT v_question_id, subtopic_id::uuid
    FROM unnest(p_subtopics) AS subtopic_id
    ON CONFLICT DO NOTHING;

    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
    RAISE NOTICE 'Inserted % additional subtopics', v_inserted_count;
  END IF;

  -- Return success with question ID
  v_result := jsonb_build_object(
    'success', true,
    'question_id', v_question_id,
    'message', 'Question and all related data inserted successfully'
  );

  RETURN v_result;

EXCEPTION
  WHEN foreign_key_violation THEN
    -- Foreign key constraint violation (invalid UUID reference)
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid reference: ' || SQLERRM,
      'error_code', 'FOREIGN_KEY_VIOLATION',
      'details', SQLSTATE
    );

  WHEN check_violation THEN
    -- Check constraint violation (e.g., marks out of range)
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Data validation failed: ' || SQLERRM,
      'error_code', 'CHECK_VIOLATION',
      'details', SQLSTATE
    );

  WHEN unique_violation THEN
    -- Unique constraint violation (e.g., duplicate question number)
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Duplicate data: ' || SQLERRM,
      'error_code', 'UNIQUE_VIOLATION',
      'details', SQLSTATE
    );

  WHEN OTHERS THEN
    -- Any other error
    -- Transaction automatically rolls back
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', 'UNKNOWN_ERROR',
      'sqlstate', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION insert_question_atomic IS
'Atomically inserts a question with all related data (options, answers, attachments, topics). All operations succeed or all fail together. Returns jsonb with success status and question_id or error details.';

-- ============================================================================
-- Grant permissions
-- ============================================================================

-- Allow authenticated users to call this function
-- RLS policies on individual tables still apply
GRANT EXECUTE ON FUNCTION insert_question_atomic TO authenticated;

-- ============================================================================
-- Verification query
-- ============================================================================

-- Test the function (example - do not execute in migration)
-- SELECT insert_question_atomic(
--   '{"paper_id": "uuid-here", "question_description": "Test", "marks": 1}'::jsonb,
--   '[{"option_text": "A", "label": "A", "is_correct": true, "order": 0}]'::jsonb
-- );
