/*
  # Create topics and chapters tables

  1. New Tables
    - `topics`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `subject_id` (uuid, foreign key to subjects)
      - `status` (text: active/inactive)
      - `created_at` (timestamp)
    
    - `chapters`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `topic_id` (uuid, foreign key to topics)
      - `status` (text: active/inactive)
      - `created_at` (timestamp)

  2. Foreign Keys
    - topics.subject_id references subjects(id)
    - chapters.topic_id references topics(id)

  3. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Topics table
CREATE TABLE IF NOT EXISTS topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject_id uuid NOT NULL REFERENCES subjects(id),
  status text NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users on topics"
  ON topics
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Chapters table
CREATE TABLE IF NOT EXISTS chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  topic_id uuid NOT NULL REFERENCES topics(id),
  status text NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users on chapters"
  ON chapters
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_topics_subject_id ON topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_chapters_topic_id ON chapters(topic_id);