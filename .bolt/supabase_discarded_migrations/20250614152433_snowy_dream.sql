/*
  # Fix questions table relationships

  1. Ensure proper foreign key relationships exist
  2. Refresh schema cache to resolve relationship detection issues
  3. Add missing constraints if needed

  This migration ensures that the questions table properly references
  data_structures and other related tables.
*/

-- First, let's ensure the questions table exists with proper structure
DO $$
BEGIN
  -- Check if questions table exists, if not create it
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'questions') THEN
    -- Create questions table with proper foreign key relationships
    CREATE TABLE questions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      data_structure_id uuid NOT NULL,
      chapter_id uuid,
      topic_id uuid,
      paper_id uuid,
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
  END IF;

  -- Ensure foreign key constraints exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'questions_data_structure_id_fkey'
  ) THEN
    ALTER TABLE questions 
    ADD CONSTRAINT questions_data_structure_id_fkey 
    FOREIGN KEY (data_structure_id) REFERENCES data_structures(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'questions_chapter_id_fkey'
  ) THEN
    ALTER TABLE questions 
    ADD CONSTRAINT questions_chapter_id_fkey 
    FOREIGN KEY (chapter_id) REFERENCES chapters(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'questions_topic_id_fkey'
  ) THEN
    ALTER TABLE questions 
    ADD CONSTRAINT questions_topic_id_fkey 
    FOREIGN KEY (topic_id) REFERENCES topics(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'questions_paper_id_fkey'
  ) THEN
    ALTER TABLE questions 
    ADD CONSTRAINT questions_paper_id_fkey 
    FOREIGN KEY (paper_id) REFERENCES papers_setup(id);
  END IF;
END $$;

-- Ensure sub_questions table exists with proper relationships
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sub_questions') THEN
    CREATE TABLE sub_questions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      question_id uuid NOT NULL,
      order_index integer NOT NULL,
      type text NOT NULL CHECK (type IN ('mcq', 'tf', 'descriptive')),
      question_text text NOT NULL,
      explanation text,
      created_at timestamptz DEFAULT now()
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'sub_questions_question_id_fkey'
  ) THEN
    ALTER TABLE sub_questions 
    ADD CONSTRAINT sub_questions_question_id_fkey 
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure question_options table exists with proper relationships
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'question_options') THEN
    CREATE TABLE question_options (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      question_id uuid,
      sub_question_id uuid,
      option_text text NOT NULL,
      is_correct boolean NOT NULL DEFAULT false,
      order_index integer NOT NULL,
      created_at timestamptz DEFAULT now(),
      CONSTRAINT valid_option_reference CHECK (
        (question_id IS NOT NULL AND sub_question_id IS NULL) OR
        (question_id IS NULL AND sub_question_id IS NOT NULL)
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'question_options_question_id_fkey'
  ) THEN
    ALTER TABLE question_options 
    ADD CONSTRAINT question_options_question_id_fkey 
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'question_options_sub_question_id_fkey'
  ) THEN
    ALTER TABLE question_options 
    ADD CONSTRAINT question_options_sub_question_id_fkey 
    FOREIGN KEY (sub_question_id) REFERENCES sub_questions(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable RLS on all tables
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_options ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Allow full access to authenticated users on questions" ON questions;
DROP POLICY IF EXISTS "Allow full access to authenticated users on sub_questions" ON sub_questions;
DROP POLICY IF EXISTS "Allow full access to authenticated users on question_options" ON question_options;

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_questions_data_structure_id ON questions(data_structure_id);
CREATE INDEX IF NOT EXISTS idx_questions_chapter_id ON questions(chapter_id);
CREATE INDEX IF NOT EXISTS idx_questions_topic_id ON questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_paper_id ON questions(paper_id);
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_tags ON questions USING gin(tags);

CREATE INDEX IF NOT EXISTS idx_sub_questions_question_id ON sub_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_sub_questions_order_index ON sub_questions(order_index);

CREATE INDEX IF NOT EXISTS idx_question_options_question_id ON question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_question_options_sub_question_id ON question_options(sub_question_id);
CREATE INDEX IF NOT EXISTS idx_question_options_order_index ON question_options(order_index);

-- Create or replace trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists and recreate it
DROP TRIGGER IF EXISTS update_questions_updated_at ON questions;
CREATE TRIGGER update_questions_updated_at 
    BEFORE UPDATE ON questions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';