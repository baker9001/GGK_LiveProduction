/*
  # Add answer_text and answer_type columns to question_correct_answers

  ## Summary
  This migration adds support for structured answer formats (like table_completion) by adding
  two new columns to the question_correct_answers table:
  - answer_text: Stores structured data (e.g., table templates, graph configurations) as JSON text
  - answer_type: Identifies the type of structured answer (e.g., "table_template", "graph_data")

  ## Changes Made

  1. New Columns Added
    - `answer_text` (text, nullable): Stores structured answer data as JSON string
      * For table_completion: Contains rows, columns, headers, cells with expectedAnswer values
      * For other complex formats: Contains format-specific structure
      * NULL for simple text answers

    - `answer_type` (varchar(50), nullable): Identifies the structured answer type
      * "table_template" for table completion questions
      * Other types can be added as needed
      * NULL for simple text answers

  2. Performance Optimization
    - Added index on answer_type for efficient filtering of structured answers
    - Index is partial (WHERE answer_type IS NOT NULL) to save space

  3. Security
    - Columns are nullable to maintain backward compatibility
    - Existing RLS policies automatically apply to new columns
    - No breaking changes to existing data

  ## Usage Examples

  ### Table Completion Answer
  ```sql
  INSERT INTO question_correct_answers (question_id, answer, answer_text, answer_type, marks)
  VALUES (
    'question-uuid',
    'Table completion answer',
    '{"rows":5,"columns":3,"headers":["Col1","Col2","Col3"],"cells":[{"rowIndex":0,"colIndex":0,"cellType":"locked","lockedValue":"Fixed"}]}',
    'table_template',
    5
  );
  ```

  ### Simple Text Answer (backward compatible)
  ```sql
  INSERT INTO question_correct_answers (question_id, answer, marks)
  VALUES (
    'question-uuid',
    'Simple text answer',
    2
  );
  -- answer_text and answer_type will be NULL
  ```

  ## Important Notes
  - Existing data is unaffected (new columns are nullable)
  - Import logic must be updated to extract these fields from working_json
  - TypeScript interfaces already include these fields (QuestionCorrectAnswer type)
  - Compatible with all existing RLS policies and triggers
*/

-- Step 1: Add answer_text column for structured answer data
ALTER TABLE question_correct_answers
ADD COLUMN IF NOT EXISTS answer_text TEXT;

-- Step 2: Add answer_type column for answer type identification
ALTER TABLE question_correct_answers
ADD COLUMN IF NOT EXISTS answer_type VARCHAR(50);

-- Step 3: Add comment documentation
COMMENT ON COLUMN question_correct_answers.answer_text IS
'Structured answer data as JSON string. Used for complex answer formats like table_completion (template structure), graph_plotter (coordinates), etc. NULL for simple text answers.';

COMMENT ON COLUMN question_correct_answers.answer_type IS
'Type identifier for structured answers. Values: "table_template" for table completion, NULL for simple text answers. Extensible for future answer formats.';

-- Step 4: Create index for efficient answer_type filtering
-- Partial index (only where answer_type is not NULL) for space efficiency
CREATE INDEX IF NOT EXISTS idx_question_correct_answers_answer_type
ON question_correct_answers(answer_type)
WHERE answer_type IS NOT NULL;

-- Step 5: Verify the changes
DO $$
BEGIN
  -- Check if columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'question_correct_answers'
    AND column_name = 'answer_text'
  ) THEN
    RAISE EXCEPTION 'Column answer_text was not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'question_correct_answers'
    AND column_name = 'answer_type'
  ) THEN
    RAISE EXCEPTION 'Column answer_type was not created';
  END IF;

  RAISE NOTICE 'Migration completed successfully: answer_text and answer_type columns added';
END $$;
