/*
  # Fix missing education tables and columns

  1. New Tables
    - `edu_courses` table with proper structure
  
  2. Table Updates
    - Add missing `description` column to `edu_subtopics` table
  
  3. Security
    - Enable RLS on new tables
    - Add appropriate policies for authenticated users
*/

-- Create edu_courses table if it doesn't exist
CREATE TABLE IF NOT EXISTS edu_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL,
  name text NOT NULL,
  level text NOT NULL,
  status text DEFAULT 'active'::text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraint for edu_courses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'edu_courses_subject_id_fkey'
  ) THEN
    ALTER TABLE edu_courses 
    ADD CONSTRAINT edu_courses_subject_id_fkey 
    FOREIGN KEY (subject_id) REFERENCES edu_subjects(id);
  END IF;
END $$;

-- Add description column to edu_subtopics if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'edu_subtopics' AND column_name = 'description'
  ) THEN
    ALTER TABLE edu_subtopics ADD COLUMN description text;
  END IF;
END $$;

-- Enable RLS on edu_courses
ALTER TABLE edu_courses ENABLE ROW LEVEL SECURITY;

-- Create policy for edu_courses
CREATE POLICY IF NOT EXISTS "Allow full access to authenticated users on edu_courses"
  ON edu_courses
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_edu_courses_subject_id ON edu_courses(subject_id);
CREATE INDEX IF NOT EXISTS idx_edu_courses_status ON edu_courses(status);