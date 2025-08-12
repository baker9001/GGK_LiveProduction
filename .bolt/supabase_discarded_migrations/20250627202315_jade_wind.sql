/*
  # Create edu_chapters table

  1. New Tables
    - `edu_chapters`
      - `id` (uuid, primary key)
      - `name` (text, chapter name)
      - `subject_id` (uuid, foreign key to edu_subjects)
      - `sort` (integer, for ordering)
      - `status` (text, active/inactive)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `edu_chapters` table
    - Add policy for authenticated users to read chapters

  3. Indexes
    - Add index on subject_id for better query performance
    - Add index on status for filtering
*/

-- Create edu_chapters table
CREATE TABLE IF NOT EXISTS edu_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject_id uuid NOT NULL REFERENCES edu_subjects(id) ON DELETE CASCADE,
  sort integer DEFAULT 0,
  status text DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_edu_chapters_subject_id ON edu_chapters(subject_id);
CREATE INDEX IF NOT EXISTS idx_edu_chapters_status ON edu_chapters(status);
CREATE INDEX IF NOT EXISTS idx_edu_chapters_sort ON edu_chapters(sort);

-- Enable RLS
ALTER TABLE edu_chapters ENABLE ROW LEVEL SECURITY;

-- Add policy for authenticated users to read chapters
CREATE POLICY "Allow authenticated users to read chapters"
  ON edu_chapters
  FOR SELECT
  TO authenticated
  USING (true);

-- Add policy for authenticated users to manage chapters
CREATE POLICY "Allow authenticated users to manage chapters"
  ON edu_chapters
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Update edu_topics to reference chapters instead of units
DO $$
BEGIN
  -- Check if chapter_id column exists in edu_topics
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'edu_topics' AND column_name = 'chapter_id'
  ) THEN
    -- Add chapter_id column to edu_topics
    ALTER TABLE edu_topics ADD COLUMN chapter_id uuid REFERENCES edu_chapters(id) ON DELETE CASCADE;
    
    -- Create index on chapter_id
    CREATE INDEX IF NOT EXISTS idx_edu_topics_chapter_id ON edu_topics(chapter_id);
  END IF;
END $$;

-- Insert some sample chapters for existing subjects
INSERT INTO edu_chapters (name, subject_id, sort, status) 
SELECT 
  'Chapter ' || generate_series(1, 5) as name,
  id as subject_id,
  generate_series(1, 5) as sort,
  'active' as status
FROM edu_subjects 
WHERE status = 'active'
ON CONFLICT DO NOTHING;