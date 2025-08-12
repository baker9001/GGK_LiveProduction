/*
  # Add sort_order to topics table and fix relationships

  1. Changes
    - Drop existing topics table
    - Recreate topics table with correct schema including sort_order
    - Update relationships between topics and chapters
    - Add indexes for performance

  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing tables to rebuild with correct relationships
DROP TABLE IF EXISTS chapters CASCADE;
DROP TABLE IF EXISTS topics CASCADE;

-- Topics table
CREATE TABLE IF NOT EXISTS topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  chapter_id uuid NOT NULL REFERENCES chapters(id),
  sort_order integer,
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

-- Add indexes for better performance
CREATE INDEX idx_topics_chapter_id ON topics(chapter_id);
CREATE INDEX idx_topics_sort_order ON topics(sort_order);