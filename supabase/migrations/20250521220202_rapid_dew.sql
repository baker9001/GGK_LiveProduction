/*
  # Add storage permissions for logos

  1. Storage Setup
    - Create logos bucket if it doesn't exist
    - Add RLS policies for authenticated users
    - Enable public access for logo URLs

  2. Changes
    - Add storage.buckets entry for logos
    - Add storage policies for authenticated users
    - Enable unauthenticated access for viewing logos
*/

-- Create storage bucket for logos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload/delete logos
CREATE POLICY "Allow authenticated users to upload logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'logos');

CREATE POLICY "Allow authenticated users to update their logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'logos');

CREATE POLICY "Allow authenticated users to delete their logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'logos');

-- Allow public access to view logos
CREATE POLICY "Allow public to view logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'logos');