/*
  # Create Education Catalogue Tables

  1. New Tables
    - `topics`
      - `id` (uuid, primary key)
      - `unit_id` (uuid, foreign key to edu_units)
      - `name` (text)
      - `sort` (integer, optional)
      - `status` (text, active/inactive)
      - `created_at` (timestamp)

    - `subtopics`
      - `id` (uuid, primary key)
      - `topic_id` (uuid, foreign key to topics)
      - `name` (text)
      - `description` (text, optional)
      - `sort` (integer, optional)
      - `status` (text, active/inactive)
      - `created_at` (timestamp)

    - `concepts`
      - `id` (uuid, primary key)
      - `topic_id` (uuid, foreign key to topics)
      - `name` (text)
      - `description` (text)
      - `sort` (integer, optional)
      - `status` (text, active/inactive)
      - `created_at` (timestamp)

    - `objectives`
      - `id` (uuid, primary key)
      - `subtopic_id` (uuid, foreign key to subtopics)
      - `description` (text)
      - `sort` (integer, optional)
      - `status` (text, active/inactive)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their data

  3. Indexes
    - Add indexes on foreign key columns for better performance
*/

-- Create topics table
CREATE TABLE IF NOT EXISTS topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES edu_units(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort integer DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT topics_status_check CHECK (status IN ('active', 'inactive')),
  CONSTRAINT topics_unit_name_unique UNIQUE (unit_id, name)
);

-- Create subtopics table
CREATE TABLE IF NOT EXISTS subtopics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sort integer DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT subtopics_status_check CHECK (status IN ('active', 'inactive')),
  CONSTRAINT subtopics_topic_name_unique UNIQUE (topic_id, name)
);

-- Create concepts table
CREATE TABLE IF NOT EXISTS concepts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL,
  sort integer DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT concepts_status_check CHECK (status IN ('active', 'inactive')),
  CONSTRAINT concepts_topic_name_unique UNIQUE (topic_id, name)
);

-- Create objectives table
CREATE TABLE IF NOT EXISTS objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subtopic_id uuid NOT NULL REFERENCES subtopics(id) ON DELETE CASCADE,
  description text NOT NULL,
  sort integer DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT objectives_status_check CHECK (status IN ('active', 'inactive'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_topics_unit_id ON topics(unit_id);
CREATE INDEX IF NOT EXISTS idx_topics_status ON topics(status);
CREATE INDEX IF NOT EXISTS idx_subtopics_topic_id ON subtopics(topic_id);
CREATE INDEX IF NOT EXISTS idx_subtopics_status ON subtopics(status);
CREATE INDEX IF NOT EXISTS idx_concepts_topic_id ON concepts(topic_id);
CREATE INDEX IF NOT EXISTS idx_concepts_status ON concepts(status);
CREATE INDEX IF NOT EXISTS idx_objectives_subtopic_id ON objectives(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_objectives_status ON objectives(status);

-- Enable RLS
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow full access to authenticated users on topics"
  ON topics
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow full access to authenticated users on subtopics"
  ON subtopics
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow full access to authenticated users on concepts"
  ON concepts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow full access to authenticated users on objectives"
  ON objectives
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);