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

-- Add policies
CREATE POLICY "Allow full access to authenticated users on materials"
  ON materials
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create storage bucket for materials
INSERT INTO storage.buckets (id, name, public)
VALUES ('materials', 'materials', false)
ON CONFLICT (id) DO NOTHING;

-- Add storage policies
CREATE POLICY "Allow authenticated users to manage materials"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'materials')
WITH CHECK (bucket_id = 'materials');

-- Add indexes for better performance
CREATE INDEX idx_materials_data_structure_id ON materials(data_structure_id);
CREATE INDEX idx_materials_chapter_id ON materials(chapter_id);
CREATE INDEX idx_materials_topic_id ON materials(topic_id);
CREATE INDEX idx_materials_type ON materials(type);
CREATE INDEX idx_materials_status ON materials(status);