/*
  # Fix storage bucket RLS policies

  1. Security Updates
    - Drop existing RLS policies for subject-logos bucket
    - Create new policies with correct permissions for authenticated users
    - Ensure public read access is maintained
    - Fix policy definitions to properly handle object creation

  2. Changes
    - Replace existing storage policies with corrected versions
    - Add explicit INSERT permission for authenticated users
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to manage subject logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view subject logos" ON storage.objects;

-- Create new policy for authenticated users with explicit permissions
CREATE POLICY "authenticated users can manage subject logos"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'subject-logos')
WITH CHECK (bucket_id = 'subject-logos');

-- Create separate policy for public read access
CREATE POLICY "public can view subject logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'subject-logos');

-- Ensure RLS is enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;