/*
  # Add Answer Format Validation Constraint

  ## Problem
  The answer_format column in questions_master_admin and sub_questions tables
  has no CHECK constraint, allowing any string value to be inserted. This can
  lead to invalid formats being stored and runtime errors in the UI.

  ## Solution
  Add CHECK constraint to whitelist only supported answer formats.

  ## Valid Formats
  Based on DynamicAnswerField.tsx component implementation:
  - Text formats: single_word, single_line, multi_line, multi_line_labeled
  - Connected: two_items_connected
  - Code: code
  - Files: file_upload, audio
  - Tables: table_completion, table, table_creator
  - Visual: diagram, graph, structural_diagram, chemical_structure
  - Math: equation, calculation

  ## Tables Affected
  - questions_master_admin
  - sub_questions
*/

-- ============================================================================
-- STEP 1: Add Constraint to questions_master_admin
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'questions_answer_format_check'
  ) THEN
    ALTER TABLE questions_master_admin
      ADD CONSTRAINT questions_answer_format_check
      CHECK (answer_format IN (
        'single_word',
        'single_line',
        'multi_line',
        'multi_line_labeled',
        'two_items_connected',
        'code',
        'file_upload',
        'audio',
        'table_completion',
        'table',
        'table_creator',
        'diagram',
        'graph',
        'structural_diagram',
        'chemical_structure',
        'equation',
        'calculation',
        NULL
      ));

    RAISE NOTICE 'Added answer_format constraint to questions_master_admin';
  ELSE
    RAISE NOTICE 'Constraint questions_answer_format_check already exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Add Constraint to sub_questions
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sub_questions_answer_format_check'
  ) THEN
    ALTER TABLE sub_questions
      ADD CONSTRAINT sub_questions_answer_format_check
      CHECK (answer_format IN (
        'single_word',
        'single_line',
        'multi_line',
        'multi_line_labeled',
        'two_items_connected',
        'code',
        'file_upload',
        'audio',
        'table_completion',
        'table',
        'table_creator',
        'diagram',
        'graph',
        'structural_diagram',
        'chemical_structure',
        'equation',
        'calculation',
        NULL
      ));

    RAISE NOTICE 'Added answer_format constraint to sub_questions';
  ELSE
    RAISE NOTICE 'Constraint sub_questions_answer_format_check already exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Validate Existing Data
-- ============================================================================

DO $$
DECLARE
  invalid_count integer;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM questions_master_admin
  WHERE answer_format NOT IN (
    'single_word', 'single_line', 'multi_line', 'multi_line_labeled',
    'two_items_connected', 'code', 'file_upload', 'audio',
    'table_completion', 'table', 'table_creator', 'diagram', 'graph',
    'structural_diagram', 'chemical_structure', 'equation', 'calculation'
  )
  AND answer_format IS NOT NULL;

  IF invalid_count > 0 THEN
    RAISE WARNING 'Found % questions with invalid answer_format values', invalid_count;
  ELSE
    RAISE NOTICE 'All existing answer_format values are valid';
  END IF;

  SELECT COUNT(*) INTO invalid_count
  FROM sub_questions
  WHERE answer_format NOT IN (
    'single_word', 'single_line', 'multi_line', 'multi_line_labeled',
    'two_items_connected', 'code', 'file_upload', 'audio',
    'table_completion', 'table', 'table_creator', 'diagram', 'graph',
    'structural_diagram', 'chemical_structure', 'equation', 'calculation'
  )
  AND answer_format IS NOT NULL;

  IF invalid_count > 0 THEN
    RAISE WARNING 'Found % sub-questions with invalid answer_format values', invalid_count;
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Comments for Documentation
-- ============================================================================

COMMENT ON CONSTRAINT questions_answer_format_check ON questions_master_admin IS
  'Ensures only supported answer formats from DynamicAnswerField component can be stored';

COMMENT ON CONSTRAINT sub_questions_answer_format_check ON sub_questions IS
  'Ensures only supported answer formats from DynamicAnswerField component can be stored';
