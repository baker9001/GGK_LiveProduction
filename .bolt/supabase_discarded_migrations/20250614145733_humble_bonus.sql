/*
  # Create questions management tables

  1. New Tables
    - `questions`
      - `id` (uuid, primary key)
      - `data_structure_id` (uuid, foreign key to data_structures)
      - `chapter_id` (uuid, foreign key to chapters, optional)
      - `topic_id` (uuid, foreign key to topics, optional)
      - `paper_id` (uuid, foreign key to papers_setup, optional)
      - `category` (text: direct/complex)
      - `type` (text: mcq/tf/descriptive, for direct questions)
      - `question_text` (text, rich text content)
      - `explanation` (text, optional rich text)
      - `tags` (text array, optional)
      - `status` (text: active/inactive)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `sub_questions`
      - `id` (uuid, primary key)
      - `question_id` (uuid, foreign key to questions)
      - `order_index` (integer)
      - `type` (text: mcq/tf/descriptive)
      - `question_text` (text, rich text content)
      - `explanation` (text, optional rich text)
      - `created_at` (timestamp)

    - `question_options`
      - `id` (uuid, primary key)
      - `question_id` (uuid, foreign key to questions, nullable)
      - `sub_question_id` (uuid, foreign key to sub_questions, nullable)
      - `option_text` (text)
      - `is_correct` (boolean)
      - `order_index` (integer)
      - `created_at` (timestamp)

  2. Foreign Keys
    - questions.data_structure_id references data_structures(id)
    - questions.chapter_id references chapters(id)
    - questions.topic_id references topics(id)
    - questions.paper_id references papers_setup(id)
    - sub_questions.question_id references questions(id) ON DELETE CASCADE
    - question_options.question_id references questions(id) ON DELETE CASCADE
    - question_options.sub_question_id references sub_questions(id) ON DELETE CASCADE

  3. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Drop existing tables if they exist to avoid conflicts
DROP TABLE IF EXISTS question_options CASCADE;
DROP TABLE IF EXISTS sub_questions CASCADE;
DROP TABLE IF EXISTS questions CASCADE;

-- Questions table
CREATE TABLE questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_structure_id uuid NOT NULL REFERENCES data_structures(id),
  chapter_id uuid REFERENCES chapters(id),
  topic_id uuid REFERENCES topics(id),
  paper_id uuid REFERENCES papers_setup(id),
  category text NOT NULL CHECK (category IN ('direct', 'complex')),
  type text CHECK (type IN ('mcq', 'tf', 'descriptive')),
  question_text text NOT NULL,
  explanation text,
  tags text[],
  status text NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_direct_question CHECK (
    (category = 'direct' AND type IS NOT NULL) OR
    (category = 'complex' AND type IS NULL)
  )
);

-- Sub-questions table
CREATE TABLE sub_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  order_index integer NOT NULL,
  type text NOT NULL CHECK (type IN ('mcq', 'tf', 'descriptive')),
  question_text text NOT NULL,
  explanation text,
  created_at timestamptz DEFAULT now()
);

-- Question options table
CREATE TABLE question_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES questions(id) ON DELETE CASCADE,
  sub_question_id uuid REFERENCES sub_questions(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_option_reference CHECK (
    (question_id IS NOT NULL AND sub_question_id IS NULL) OR
    (question_id IS NULL AND sub_question_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_options ENABLE ROW LEVEL SECURITY;

-- Add policies for authenticated users
CREATE POLICY "Allow full access to authenticated users on questions"
  ON questions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow full access to authenticated users on sub_questions"
  ON sub_questions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow full access to authenticated users on question_options"
  ON question_options
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX idx_questions_data_structure_id ON questions(data_structure_id);
CREATE INDEX idx_questions_chapter_id ON questions(chapter_id);
CREATE INDEX idx_questions_topic_id ON questions(topic_id);
CREATE INDEX idx_questions_paper_id ON questions(paper_id);
CREATE INDEX idx_questions_category ON questions(category);
CREATE INDEX idx_questions_type ON questions(type);
CREATE INDEX idx_questions_status ON questions(status);
CREATE INDEX idx_questions_tags ON questions USING gin(tags);

CREATE INDEX idx_sub_questions_question_id ON sub_questions(question_id);
CREATE INDEX idx_sub_questions_order_index ON sub_questions(order_index);

CREATE INDEX idx_question_options_question_id ON question_options(question_id);
CREATE INDEX idx_question_options_sub_question_id ON question_options(sub_question_id);
CREATE INDEX idx_question_options_order_index ON question_options(order_index);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_questions_updated_at 
    BEFORE UPDATE ON questions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO questions (data_structure_id, category, type, question_text, tags, status) 
SELECT 
  ds.id,
  'direct',
  'mcq',
  'What is the capital of France?',
  ARRAY['geography', 'capitals'],
  'active'
FROM data_structures ds
LIMIT 1;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';