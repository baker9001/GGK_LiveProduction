/*
  # Remove Unused Indexes on question_correct_answers
  
  1. Overview
    This migration removes duplicate and unused indexes on the question_correct_answers table
    to improve write performance and reduce storage overhead.
  
  2. Indexes Being Removed
    The security audit identified 4 unused indexes on question_correct_answers:
    - idx_question_correct_answers_answer_format
    - idx_question_correct_answers_answer_requirement
    - idx_question_correct_answers_combined
    - idx_question_correct_answers_question_sub_question
  
  3. Impact Analysis
    - These indexes are not being used by any queries
    - Removing them will improve INSERT/UPDATE/DELETE performance
    - Reduce storage overhead
    - Foreign key indexes (question_id, sub_question_id) are retained as they are actively used
  
  4. Safety
    Only removing truly unused indexes based on query analysis
*/

-- Remove unused indexes on question_correct_answers
DROP INDEX IF EXISTS idx_question_correct_answers_answer_format;
DROP INDEX IF EXISTS idx_question_correct_answers_answer_requirement;
DROP INDEX IF EXISTS idx_question_correct_answers_combined;
DROP INDEX IF EXISTS idx_question_correct_answers_question_sub_question;
