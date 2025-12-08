/*
  # Fix MCQ Answer Format Constraint Mismatch
  
  ## Problem
  The database contains 40 MCQ questions with answer_format='selection', but the CHECK
  constraint on answer_format doesn't include 'selection' as a valid value. This creates
  a data integrity issue.
  
  ## Analysis
  - MCQ questions were imported with answer_format='selection'
  - The CHECK constraint was added later without 'selection'
  - The frontend code (answerOptions.ts) treats MCQ as NULL or 'not_applicable' for answer_format
  - DynamicAnswerField.tsx doesn't handle 'selection' format
  
  ## Solution
  1. Update all MCQ questions to use NULL for answer_format (MCQ don't need answer format)
  2. Add 'selection' to the constraint for backward compatibility (in case it's used elsewhere)
  3. Add migration note for future reference
  
  ## Changes
  - Update questions_master_admin: Set answer_format=NULL where type='mcq' and answer_format='selection'
  - Update CHECK constraint to include 'selection' as valid option
  - Add comment explaining MCQ format handling
*/

-- ============================================================================
-- STEP 1: Update existing MCQ questions to use NULL for answer_format
-- ============================================================================

UPDATE questions_master_admin
SET answer_format = NULL
WHERE type = 'mcq' AND answer_format = 'selection';

-- ============================================================================
-- STEP 2: Drop and recreate constraint with 'selection' included
-- ============================================================================

ALTER TABLE questions_master_admin
DROP CONSTRAINT IF EXISTS questions_answer_format_check;

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
  'selection',  -- Added for backward compatibility
  'not_applicable',  -- For contextual-only questions
  NULL
));

-- ============================================================================
-- STEP 3: Do the same for sub_questions table
-- ============================================================================

UPDATE sub_questions
SET answer_format = NULL
WHERE answer_format = 'selection';

ALTER TABLE sub_questions
DROP CONSTRAINT IF EXISTS sub_questions_answer_format_check;

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
  'selection',  -- Added for backward compatibility
  'not_applicable',  -- For contextual-only questions
  NULL
));

-- ============================================================================
-- STEP 4: Add comments for future reference
-- ============================================================================

COMMENT ON COLUMN questions_master_admin.answer_format IS 
  'Format expected for student answers. MCQ/TF questions should have NULL (format determined by question type). Descriptive/Complex questions require specific format.';

COMMENT ON COLUMN sub_questions.answer_format IS 
  'Format expected for student answers to parts/subparts. NULL means format not specified or inherited from parent.';

-- ============================================================================
-- STEP 5: Verify the fix
-- ============================================================================

DO $$
DECLARE
  mcq_with_format_count integer;
BEGIN
  SELECT COUNT(*) INTO mcq_with_format_count
  FROM questions_master_admin
  WHERE type = 'mcq' AND answer_format IS NOT NULL;
  
  IF mcq_with_format_count > 0 THEN
    RAISE WARNING 'Found % MCQ questions with non-NULL answer_format', mcq_with_format_count;
  ELSE
    RAISE NOTICE 'All MCQ questions now have NULL answer_format (correct)';
  END IF;
END $$;
