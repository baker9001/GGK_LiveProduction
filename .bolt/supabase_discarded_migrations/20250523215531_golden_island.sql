-- Drop existing tables to rebuild with correct relationships
DROP TABLE IF EXISTS topics CASCADE;
DROP TABLE IF EXISTS chapters CASCADE;

-- Chapters table
CREATE TABLE chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject_id uuid NOT NULL REFERENCES subjects(id),
  sort_order integer,
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
CREATE TABLE topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  chapter_id uuid NOT NULL REFERENCES chapters(id),
  sort_order integer,
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
CREATE INDEX idx_chapters_subject_id ON chapters(subject_id);
CREATE INDEX idx_chapters_sort_order ON chapters(sort_order);
CREATE INDEX idx_topics_chapter_id ON topics(chapter_id);
CREATE INDEX idx_topics_sort_order ON topics(sort_order);

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';