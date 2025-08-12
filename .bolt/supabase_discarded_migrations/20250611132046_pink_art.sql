/*
  # Create avatars storage bucket

  1. Storage Setup
    - Create avatars bucket for user profile pictures
    - Add RLS policies for authenticated users
    - Enable public access for avatar URLs

  2. Security
    - Allow authenticated users to manage their own avatars
    - Allow public read access for displaying avatars
*/

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage avatars
CREATE POLICY "Allow authenticated users to manage avatars"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

-- Allow public to view avatars
CREATE POLICY "Allow public to view avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');