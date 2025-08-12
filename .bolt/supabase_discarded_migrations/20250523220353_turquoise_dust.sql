/*
  # Create chapters and topics tables with proper sorting

  1. New Tables
    - chapters table with sort_order
    - topics table with sort_order
  
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
  
  3. Performance
    - Add indexes for better query performance
*/

-- Chapters table
CREATE TABLE IF NOT EXISTS chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject_id uuid NOT NULL REFERENCES subjects(id),
  sort_order integer DEFAULT 0,
  status text NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Allow full access to authenticated users on chapters"
  ON chapters
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Topics table
CREATE TABLE IF NOT EXISTS topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  chapter_id uuid NOT NULL REFERENCES chapters(id),
  sort_order integer DEFAULT 0,
  status text NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Allow full access to authenticated users on topics"
  ON topics
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chapters_subject_id ON chapters(subject_id);
CREATE INDEX IF NOT EXISTS idx_chapters_sort_order ON chapters(sort_order);
CREATE INDEX IF NOT EXISTS idx_topics_chapter_id ON topics(chapter_id);
CREATE INDEX IF NOT EXISTS idx_topics_sort_order ON topics(sort_order);

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';