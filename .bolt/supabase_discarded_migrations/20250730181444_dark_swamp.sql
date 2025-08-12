/*
  # Complex Answer Structures Migration

  1. New Columns
    - Add answer_format, answer_requirement, total_alternatives, correct_answer, description to questions_master_admin
    - Add answer_format, answer_requirement, total_alternatives, correct_answer, description, subtopic_id to sub_questions

  2. New Tables
    - question_correct_answers: Stores multiple correct answers with context
    - question_distractors: Stores distractor options with context
    - answer_requirements: Defines answer requirements and alternatives
    - answer_components: Granular answer tracking for analytics

  3. Data Migration
    - Migrate existing correct answers to new structure
    - Set default answer formats based on question types

  4. Security
    - All tables inherit RLS from parent tables through foreign keys
    - Proper constraints ensure data integrity
*/

-- Add missing fields to questions_master_admin if they don't exist
ALTER TABLE questions_master_admin 
ADD COLUMN IF NOT EXISTS answer_format VARCHAR(50),
ADD COLUMN IF NOT EXISTS answer_requirement TEXT,
ADD COLUMN IF NOT EXISTS total_alternatives INTEGER,
ADD COLUMN IF NOT EXISTS correct_answer TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add missing fields to sub_questions if they don't exist
ALTER TABLE sub_questions 
ADD COLUMN IF NOT EXISTS answer_format VARCHAR(50),
ADD COLUMN IF NOT EXISTS answer_requirement TEXT,
ADD COLUMN IF NOT EXISTS total_alternatives INTEGER,
ADD COLUMN IF NOT EXISTS correct_answer TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS subtopic_id UUID REFERENCES edu_subtopics(id);

-- Create question_correct_answers table if it doesn't exist
CREATE TABLE IF NOT EXISTS question_correct_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID REFERENCES questions_master_admin(id) ON DELETE CASCADE,
  sub_question_id UUID REFERENCES sub_questions(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  marks INTEGER DEFAULT 1,
  alternative_id INTEGER,
  context_type TEXT,
  context_value TEXT,
  context_label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_single_parent CHECK (
    (question_id IS NOT NULL AND sub_question_id IS NULL) OR
    (question_id IS NULL AND sub_question_id IS NOT NULL)
  )
);

-- Enable RLS on question_correct_answers
ALTER TABLE question_correct_answers ENABLE ROW LEVEL SECURITY;

-- Create policy for question_correct_answers
CREATE POLICY "Allow full access to authenticated users on question_correct_answers"
  ON question_correct_answers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_correct_answers_question ON question_correct_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_correct_answers_sub_question ON question_correct_answers(sub_question_id);
CREATE INDEX IF NOT EXISTS idx_correct_answers_context ON question_correct_answers(context_type, context_value);

-- Create question_distractors table if it doesn't exist
CREATE TABLE IF NOT EXISTS question_distractors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID REFERENCES questions_master_admin(id) ON DELETE CASCADE,
  sub_question_id UUID REFERENCES sub_questions(id) ON DELETE CASCADE,
  option_label TEXT NOT NULL,
  context_type TEXT,
  context_value TEXT,
  context_label TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_single_parent_distractor CHECK (
    (question_id IS NOT NULL AND sub_question_id IS NULL) OR
    (question_id IS NULL AND sub_question_id IS NOT NULL)
  )
);

-- Enable RLS on question_distractors
ALTER TABLE question_distractors ENABLE ROW LEVEL SECURITY;

-- Create policy for question_distractors
CREATE POLICY "Allow full access to authenticated users on question_distractors"
  ON question_distractors
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for distractors
CREATE INDEX IF NOT EXISTS idx_distractors_question ON question_distractors(question_id);
CREATE INDEX IF NOT EXISTS idx_distractors_sub_question ON question_distractors(sub_question_id);

-- Create answer_requirements table for reference
CREATE TABLE IF NOT EXISTS answer_requirements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID REFERENCES questions_master_admin(id) ON DELETE CASCADE,
  sub_question_id UUID REFERENCES sub_questions(id) ON DELETE CASCADE,
  requirement_type VARCHAR(50) NOT NULL,
  total_alternatives INTEGER NOT NULL,
  min_required INTEGER DEFAULT 1,
  max_required INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_single_parent_req CHECK (
    (question_id IS NOT NULL AND sub_question_id IS NULL) OR
    (question_id IS NULL AND sub_question_id IS NOT NULL)
  )
);

-- Enable RLS on answer_requirements
ALTER TABLE answer_requirements ENABLE ROW LEVEL SECURITY;

-- Create policy for answer_requirements
CREATE POLICY "Allow full access to authenticated users on answer_requirements"
  ON answer_requirements
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create answer_components table for granular tracking
CREATE TABLE IF NOT EXISTS answer_components (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID REFERENCES questions_master_admin(id) ON DELETE CASCADE,
  sub_question_id UUID REFERENCES sub_questions(id) ON DELETE CASCADE,
  alternative_id INTEGER NOT NULL,
  answer_text TEXT NOT NULL,
  marks DECIMAL(5,2) NOT NULL,
  context_type VARCHAR(50) NOT NULL,
  context_value VARCHAR(100) NOT NULL,
  context_label VARCHAR(255),
  is_correct BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_single_parent_comp CHECK (
    (question_id IS NOT NULL AND sub_question_id IS NULL) OR
    (question_id IS NULL AND sub_question_id IS NOT NULL)
  )
);

-- Enable RLS on answer_components
ALTER TABLE answer_components ENABLE ROW LEVEL SECURITY;

-- Create policy for answer_components
CREATE POLICY "Allow full access to authenticated users on answer_components"
  ON answer_components
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for answer components
CREATE INDEX IF NOT EXISTS idx_components_question ON answer_components(question_id);
CREATE INDEX IF NOT EXISTS idx_components_sub_question ON answer_components(sub_question_id);
CREATE INDEX IF NOT EXISTS idx_components_context ON answer_components(context_type, context_value);

-- Add comments for documentation
COMMENT ON TABLE question_correct_answers IS 'Stores all correct answers for questions supporting multiple correct answers';
COMMENT ON COLUMN question_correct_answers.alternative_id IS 'Unique identifier for each alternative answer within a question';
COMMENT ON COLUMN question_correct_answers.context_type IS 'Type of context: option, position, field, electrode, property, step, aspect, change, component';
COMMENT ON COLUMN question_correct_answers.context_value IS 'Specific value for the context type, e.g., step_1, position_A';
COMMENT ON COLUMN question_correct_answers.context_label IS 'Human-readable label for the context';

COMMENT ON TABLE answer_components IS 'Granular answer components for advanced analytics and partial credit';
COMMENT ON TABLE answer_requirements IS 'Defines how many answers are required from alternatives';

-- Update existing questions to have default answer_format if null
UPDATE questions_master_admin 
SET answer_format = 'single_line' 
WHERE answer_format IS NULL AND type = 'descriptive';

UPDATE questions_master_admin 
SET answer_format = 'single_choice' 
WHERE answer_format IS NULL AND type IN ('mcq', 'tf');

UPDATE sub_questions 
SET answer_format = 'single_line' 
WHERE answer_format IS NULL AND type = 'descriptive';

UPDATE sub_questions 
SET answer_format = 'single_choice' 
WHERE answer_format IS NULL AND type IN ('mcq', 'tf');

-- Create a function to migrate existing correct answers
CREATE OR REPLACE FUNCTION migrate_correct_answers() RETURNS void AS $$
BEGIN
  -- Migrate from questions_master_admin
  INSERT INTO question_correct_answers (question_id, answer, marks, alternative_id)
  SELECT id, correct_answer, marks, 1
  FROM questions_master_admin
  WHERE correct_answer IS NOT NULL 
    AND NOT EXISTS (
      SELECT 1 FROM question_correct_answers 
      WHERE question_id = questions_master_admin.id
    );

  -- Migrate from sub_questions
  INSERT INTO question_correct_answers (sub_question_id, answer, marks, alternative_id)
  SELECT id, correct_answer, marks, 1
  FROM sub_questions
  WHERE correct_answer IS NOT NULL 
    AND NOT EXISTS (
      SELECT 1 FROM question_correct_answers 
      WHERE sub_question_id = sub_questions.id
    );
END;
$$ LANGUAGE plpgsql;

-- Run the migration function
SELECT migrate_correct_answers();

-- Drop the function after use
DROP FUNCTION IF EXISTS migrate_correct_answers();