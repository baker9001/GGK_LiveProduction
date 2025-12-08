/*
  # Add Missing Foreign Key Indexes on question_correct_answers
  
  ## Problem
  The question_correct_answers table has foreign keys to questions_master_admin
  and sub_questions but lacks indexes on these columns. This causes slow
  query performance when fetching correct answers for questions.
  
  ## Impact
  - Slow loading of question review interfaces
  - Poor performance during test simulation
  - Inefficient joins in answer validation queries
  
  ## Solution
  Add indexes on question_id and sub_question_id columns
*/

-- Add index on question_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_question_correct_answers_question_id 
  ON question_correct_answers(question_id) 
  WHERE question_id IS NOT NULL;

-- Add index on sub_question_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_question_correct_answers_sub_question_id 
  ON question_correct_answers(sub_question_id) 
  WHERE sub_question_id IS NOT NULL;

-- Add composite index for common query pattern (get all answers for a question with alternatives)
CREATE INDEX IF NOT EXISTS idx_question_correct_answers_question_alternative 
  ON question_correct_answers(question_id, alternative_id) 
  WHERE question_id IS NOT NULL;

-- Add composite index for sub-question answers with alternatives
CREATE INDEX IF NOT EXISTS idx_question_correct_answers_subquestion_alternative 
  ON question_correct_answers(sub_question_id, alternative_id) 
  WHERE sub_question_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON INDEX idx_question_correct_answers_question_id IS 
  'Optimizes queries fetching correct answers for main questions';

COMMENT ON INDEX idx_question_correct_answers_sub_question_id IS 
  'Optimizes queries fetching correct answers for sub-questions/parts';
