/*
  # Create edu_chapters table and related educational catalog tables

  1. New Tables
    - `edu_chapters`
      - `id` (uuid, primary key)
      - `subject_id` (uuid, foreign key to edu_subjects)
      - `name` (text, chapter name)
      - `code` (text, chapter code)
      - `sort` (integer, sort order)
      - `status` (text, active/inactive)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `edu_chapters` table
    - Add policy for authenticated users to read data

  3. Changes
    - Creates the missing edu_chapters table that the application expects
    - Ensures proper foreign key relationships with edu_subjects
    - Adds indexes for performance
*/

-- Create edu_chapters table
CREATE TABLE IF NOT EXISTS edu_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL,
  name text NOT NULL,
  code text,
  sort integer DEFAULT 0,
  status text DEFAULT 'active' NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'edu_chapters_subject_id_fkey'
  ) THEN
    ALTER TABLE edu_chapters 
    ADD CONSTRAINT edu_chapters_subject_id_fkey 
    FOREIGN KEY (subject_id) REFERENCES edu_subjects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add status check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'edu_chapters_status_check'
  ) THEN
    ALTER TABLE edu_chapters 
    ADD CONSTRAINT edu_chapters_status_check 
    CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text]));
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_edu_chapters_subject_id ON edu_chapters(subject_id);
CREATE INDEX IF NOT EXISTS idx_edu_chapters_status ON edu_chapters(status);
CREATE INDEX IF NOT EXISTS idx_edu_chapters_sort ON edu_chapters(sort);

-- Enable RLS
ALTER TABLE edu_chapters ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow full access to authenticated users on edu_chapters"
  ON edu_chapters
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Update edu_topics table to reference edu_chapters instead of edu_units
DO $$
BEGIN
  -- Check if chapter_id column exists in edu_topics
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'edu_topics' AND column_name = 'chapter_id'
  ) THEN
    ALTER TABLE edu_topics ADD COLUMN chapter_id uuid;
    
    -- Add foreign key constraint
    ALTER TABLE edu_topics 
    ADD CONSTRAINT edu_topics_chapter_id_fkey 
    FOREIGN KEY (chapter_id) REFERENCES edu_chapters(id) ON DELETE CASCADE;
    
    -- Create index
    CREATE INDEX idx_edu_topics_chapter_id ON edu_topics(chapter_id);
  END IF;
END $$;

-- Update edu_subtopics to ensure proper relationship with edu_topics
DO $$
BEGIN
  -- Ensure edu_subtopics has proper foreign key to edu_topics
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'edu_subtopics_topic_id_fkey'
  ) THEN
    ALTER TABLE edu_subtopics 
    ADD CONSTRAINT edu_subtopics_topic_id_fkey 
    FOREIGN KEY (topic_id) REFERENCES edu_topics(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update edu_learning_objectives to ensure proper relationship with edu_subtopics
DO $$
BEGIN
  -- Ensure edu_learning_objectives has proper foreign key to edu_subtopics
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'edu_learning_objectives_subtopic_id_fkey'
  ) THEN
    ALTER TABLE edu_learning_objectives 
    ADD CONSTRAINT edu_learning_objectives_subtopic_id_fkey 
    FOREIGN KEY (subtopic_id) REFERENCES edu_subtopics(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update edu_specific_concepts to ensure proper relationship with edu_learning_objectives
DO $$
BEGIN
  -- Ensure edu_specific_concepts has proper foreign key to edu_learning_objectives
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'edu_specific_concepts_objective_id_fkey'
  ) THEN
    ALTER TABLE edu_specific_concepts 
    ADD CONSTRAINT edu_specific_concepts_objective_id_fkey 
    FOREIGN KEY (objective_id) REFERENCES edu_learning_objectives(id) ON DELETE CASCADE;
  END IF;
END $$;