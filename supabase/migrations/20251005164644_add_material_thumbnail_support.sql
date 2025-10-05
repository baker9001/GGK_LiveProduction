/*
  # Add Thumbnail Support for Materials
  
  ## Changes
  - Add `thumbnail_url` column to materials table for video thumbnails and preview images
  - Add storage policies for thumbnails bucket
  - Create thumbnails bucket if it doesn't exist
  
  ## Purpose
  Enhance the user experience by showing video thumbnails and preview images
  for materials instead of generic icons.
  
  ## Security
  - Public read access for thumbnails
  - Authenticated write access for content creators
*/

-- Add thumbnail_url column to materials table
ALTER TABLE materials 
ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Add comment
COMMENT ON COLUMN materials.thumbnail_url IS 'URL or path to the thumbnail/preview image for the material';

-- Create thumbnails storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('thumbnails', 'thumbnails', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies for thumbnails bucket
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Public can view thumbnails" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload thumbnails" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can update thumbnails" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can delete thumbnails" ON storage.objects;
  DROP POLICY IF EXISTS "System admins full access to thumbnails" ON storage.objects;
END $$;

-- Allow public read access to thumbnails
CREATE POLICY "Public can view thumbnails"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'thumbnails');

-- Allow authenticated users to upload thumbnails
CREATE POLICY "Authenticated users can upload thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'thumbnails');

-- Allow authenticated users to update thumbnails
CREATE POLICY "Authenticated users can update thumbnails"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'thumbnails');

-- Allow authenticated users to delete thumbnails
CREATE POLICY "Authenticated users can delete thumbnails"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'thumbnails');
