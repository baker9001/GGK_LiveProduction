/*
  # Add Contextual Answer Logic Fields

  This migration adds support for distinguishing between contextual/introductory questions
  and questions that require direct answers. This is essential for complex questions where
  main questions or parts may only provide context for sub-questions.

  ## Changes

  1. Add to `questions_master_admin` table:
     - `has_direct_answer` (boolean): Indicates if this question expects a direct answer
     - `is_contextual_only` (boolean): Indicates if the question text is purely contextual
     
  2. Add to `sub_questions` table:
     - `has_direct_answer` (boolean): Indicates if this part/subpart expects a direct answer
     - `is_contextual_only` (boolean): Indicates if the part text is purely contextual

  ## Business Rules

  - Main questions without direct answers MUST have parts/subparts
  - Parts without direct answers MUST have subparts
  - Subparts (level 3+) ALWAYS require answers
  - If has_direct_answer = false, then correct_answers should be empty/null
  - Default values ensure backward compatibility (existing questions treated as answerable)
*/

-- Add fields to questions_master_admin
ALTER TABLE questions_master_admin
ADD COLUMN IF NOT EXISTS has_direct_answer boolean DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS is_contextual_only boolean DEFAULT false NOT NULL;

-- Add fields to sub_questions
ALTER TABLE sub_questions
ADD COLUMN IF NOT EXISTS has_direct_answer boolean DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS is_contextual_only boolean DEFAULT false NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN questions_master_admin.has_direct_answer IS 
  'Indicates whether this main question expects a direct answer. False for questions that only provide context for parts/subparts.';

COMMENT ON COLUMN questions_master_admin.is_contextual_only IS 
  'Indicates whether the question text is purely contextual/introductory with no answer expected.';

COMMENT ON COLUMN sub_questions.has_direct_answer IS 
  'Indicates whether this part/subpart expects a direct answer. False for parts that only provide context for subparts.';

COMMENT ON COLUMN sub_questions.is_contextual_only IS 
  'Indicates whether the part text is purely contextual/introductory with no answer expected.';

-- Create index for filtering questions by answer requirement
CREATE INDEX IF NOT EXISTS idx_questions_master_has_direct_answer 
  ON questions_master_admin(has_direct_answer) WHERE has_direct_answer = false;

CREATE INDEX IF NOT EXISTS idx_sub_questions_has_direct_answer 
  ON sub_questions(has_direct_answer) WHERE has_direct_answer = false;

-- Add check constraint: if contextual_only is true, has_direct_answer must be false
ALTER TABLE questions_master_admin
DROP CONSTRAINT IF EXISTS chk_contextual_answer_logic;

ALTER TABLE questions_master_admin
ADD CONSTRAINT chk_contextual_answer_logic 
  CHECK (
    (is_contextual_only = false) OR 
    (is_contextual_only = true AND has_direct_answer = false)
  );

ALTER TABLE sub_questions
DROP CONSTRAINT IF EXISTS chk_sub_contextual_answer_logic;

ALTER TABLE sub_questions
ADD CONSTRAINT chk_sub_contextual_answer_logic 
  CHECK (
    (is_contextual_only = false) OR 
    (is_contextual_only = true AND has_direct_answer = false)
  );
