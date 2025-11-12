/*
  # Add Hint and Explanation Fields to Sub-Questions Table

  ## Summary
  Add hint and explanation columns to the sub_questions table to support educational content
  at the subpart level. This ensures consistency with the questions_master_admin table and
  enables storing learning aids from JSON imports.

  ## Changes Made
  1. New Columns
    - `hint` (text, nullable) - Hints to guide students toward the correct answer
    - `explanation` (text, nullable) - Detailed explanations of the answer and concept

  ## Rationale
  - The UI already displays hint and explanation for subparts
  - The TypeScript types (SubQuestion interface) already include these fields
  - The JSON transformer already extracts these fields from imported JSON files
  - The database table was the only missing piece preventing these fields from being stored

  ## Data Safety
  - Uses IF NOT EXISTS to ensure safe execution on existing databases
  - Columns are nullable to maintain backward compatibility
  - No data loss risk as we're only adding columns
*/

-- Add hint column to sub_questions table
ALTER TABLE sub_questions
ADD COLUMN IF NOT EXISTS hint text;

-- Add explanation column to sub_questions table
ALTER TABLE sub_questions
ADD COLUMN IF NOT EXISTS explanation text;

-- Add comments for documentation
COMMENT ON COLUMN sub_questions.hint IS 'Educational hint to guide students toward the correct answer. Provides assistance without revealing the full solution.';
COMMENT ON COLUMN sub_questions.explanation IS 'Detailed explanation of the answer and underlying concepts. Helps students understand why the answer is correct and learn from their mistakes.';
