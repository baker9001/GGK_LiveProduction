/*
  # Add Learning Objectives and Specific Concepts Tables

  1. New Tables
    - `edu_learning_objectives` - Learning objectives within subtopics
      - `id` (uuid, primary key)
      - `subtopic_id` (uuid, foreign key to edu_subtopics)
      - `description` (text, not null)
      - `sort` (integer, nullable)
      - `status` (text, default 'active')
      - `created_at` (timestamp)

    - `edu_specific_concepts` - Specific concepts within learning objectives
      - `id` (uuid, primary key)
      - `objective_id` (uuid, foreign key to edu_learning_objectives)
      - `description` (text, not null)
      - `status` (text, default 'active')
      - `created_at` (timestamp)

  2. Foreign Keys
    - edu_learning_objectives.subtopic_id references edu_subtopics(id) ON DELETE CASCADE
    - edu_specific_concepts.objective_id references edu_learning_objectives(id) ON DELETE CASCADE

  3. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create edu_learning_objectives table if it doesn't exist
CREATE TABLE IF NOT EXISTS edu_learning_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subtopic_id uuid NOT NULL REFERENCES edu_subtopics(id) ON DELETE CASCADE,
  description text NOT NULL,
  sort integer,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

-- Create edu_specific_concepts table if it doesn't exist
CREATE TABLE IF NOT EXISTS edu_specific_concepts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id uuid NOT NULL REFERENCES edu_learning_objectives(id) ON DELETE CASCADE,
  description text NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE edu_learning_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE edu_specific_concepts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for edu_learning_objectives
CREATE POLICY "Users can read edu_learning_objectives"
  ON edu_learning_objectives
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System admins can manage edu_learning_objectives"
  ON edu_learning_objectives
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS policies for edu_specific_concepts
CREATE POLICY "Users can read edu_specific_concepts"
  ON edu_specific_concepts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System admins can manage edu_specific_concepts"
  ON edu_specific_concepts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_edu_learning_objectives_subtopic_id ON edu_learning_objectives(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_edu_specific_concepts_objective_id ON edu_specific_concepts(objective_id);

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';