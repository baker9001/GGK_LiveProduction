/*
  # Create materials management tables

  1. New Tables
    - `materials`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `description` (text)
      - `data_structure_id` (uuid, foreign key to data_structures)
      - `chapter_id` (uuid, foreign key to chapters, optional)
      - `topic_id` (uuid, foreign key to topics, optional)
      - `type` (text: video, ebook, audio, assignment)
      - `file_path` (text, required)
      - `mime_type` (text, required)
      - `size` (bigint, required)
      - `status` (text: active/inactive)
      - `created_at` (timestamp)

  2. Foreign Keys
    - materials.data_structure_id references data_structures(id)
    - materials.chapter_id references chapters(id)
    - materials.topic_id references topics(id)

  3. Security
    - Enable RLS
    - Add policies for authenticated users
    - Create storage bucket for materials
*/

-- Create materials table
CREATE TABLE materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  data_structure_id uuid NOT NULL REFERENCES data_structures(id),
  chapter_id uuid REFERENCES chapters(id),
  topic_id uuid REFERENCES topics(id),
  type text NOT NULL CHECK (type IN ('video', 'ebook', 'audio', 'assignment')),
  file_path text NOT NULL,
  mime_type text NOT NULL,
  size bigint NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_chapter_topic CHECK (
    (chapter_id IS NULL AND topic_id IS NULL) OR
    (chapter_id IS NOT NULL AND topic_id IS NULL) OR
    (chapter_id IS NOT NULL AND topic_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow full access to authenticated users on materials" ON materials;
DROP POLICY IF EXISTS "Authenticated users can manage materials" ON materials;

-- Add updated policies with proper permissions
CREATE POLICY "Allow authenticated users to read materials"
  ON materials
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert materials"
  ON materials
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Verify data_structure exists and is active
    EXISTS (
      SELECT 1 FROM data_structures
      WHERE id = data_structure_id
      AND status = 'active'
    )
    -- If chapter_id is provided, verify it exists and belongs to the data structure
    AND (
      chapter_id IS NULL
      OR EXISTS (
        SELECT 1 FROM chapters
        WHERE id = chapter_id
        AND status = 'active'
        AND subject_id = (
          SELECT subject_id FROM data_structures
          WHERE id = data_structure_id
        )
      )
    )
    -- If topic_id is provided, verify it exists and belongs to the chapter
    AND (
      topic_id IS NULL
      OR EXISTS (
        SELECT 1 FROM topics
        WHERE id = topic_id
        AND status = 'active'
        AND chapter_id = materials.chapter_id
      )
    )
  );

CREATE POLICY "Allow authenticated users to update materials"
  ON materials
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete materials"
  ON materials
  FOR DELETE
  TO authenticated
  USING (true);

-- Create storage bucket for materials if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('materials', 'materials', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to manage materials" ON storage.objects;

-- Add updated storage policies with proper permissions
CREATE POLICY "Allow authenticated users to read materials"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'materials');

CREATE POLICY "Allow authenticated users to insert materials"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'materials'
    -- Add file size limit (100MB)
    AND LENGTH(DECODE(SUBSTRING(storage.objects.name FROM '[^.]+$'), 'base64')) <= 104857600
    -- Verify file extension
    AND SUBSTRING(storage.objects.name FROM '[^.]+$') IN ('pdf', 'epub', 'mp4', 'mp3', 'doc', 'docx')
  );

CREATE POLICY "Allow authenticated users to update materials"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'materials')
  WITH CHECK (bucket_id = 'materials');

CREATE POLICY "Allow authenticated users to delete materials"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'materials');

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_materials_data_structure_id ON materials(data_structure_id);
CREATE INDEX IF NOT EXISTS idx_materials_chapter_id ON materials(chapter_id);
CREATE INDEX IF NOT EXISTS idx_materials_topic_id ON materials(topic_id);
CREATE INDEX IF NOT EXISTS idx_materials_type ON materials(type);
CREATE INDEX IF NOT EXISTS idx_materials_status ON materials(status);