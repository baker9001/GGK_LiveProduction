/*
  # Add RLS policies for education catalogue tables

  1. Security Updates
    - Enable RLS on education catalogue tables
    - Add policies for authenticated users to access education catalogue data
    - Ensure proper access control for courses, units, topics, subtopics, learning objectives, and specific concepts

  2. Tables Updated
    - `edu_courses` - Enable RLS and add access policies
    - `edu_units` - Enable RLS and add access policies  
    - `edu_topics` - Enable RLS and add access policies
    - `edu_subtopics` - Enable RLS and add access policies
    - `edu_learning_objectives` - Enable RLS and add access policies
    - `edu_specific_concepts` - Enable RLS and add access policies
    - `edu_subjects` - Enable RLS and add access policies
*/

-- Enable RLS on education catalogue tables
ALTER TABLE edu_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_learning_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_specific_concepts ENABLE ROW LEVEL SECURITY;

-- Add policies for edu_subjects
CREATE POLICY "Allow full access to authenticated users on edu_subjects"
  ON edu_subjects
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add policies for edu_courses
CREATE POLICY "Allow full access to authenticated users on edu_courses"
  ON edu_courses
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add policies for edu_units
CREATE POLICY "Allow full access to authenticated users on edu_units"
  ON edu_units
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add policies for edu_topics
CREATE POLICY "Allow full access to authenticated users on edu_topics"
  ON edu_topics
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add policies for edu_subtopics
CREATE POLICY "Allow full access to authenticated users on edu_subtopics"
  ON edu_subtopics
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add policies for edu_learning_objectives
CREATE POLICY "Allow full access to authenticated users on edu_learning_objectives"
  ON edu_learning_objectives
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add policies for edu_specific_concepts
CREATE POLICY "Allow full access to authenticated users on edu_specific_concepts"
  ON edu_specific_concepts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Enable RLS on materials table if not already enabled
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- Update materials policies to allow proper access
DROP POLICY IF EXISTS "Allow authenticated users to create materials" ON materials;
DROP POLICY IF EXISTS "Enable insert for anonymous users" ON materials;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON materials;

-- Add comprehensive policies for materials
CREATE POLICY "Allow full access to authenticated users on materials"
  ON materials
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Enable RLS on programs and providers if not already enabled
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

-- Add policies for programs
CREATE POLICY "Allow full access to authenticated users on programs"
  ON programs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add policies for providers
CREATE POLICY "Allow full access to authenticated users on providers"
  ON providers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);