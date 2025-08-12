/*
  # Add logo support for schools

  1. Changes
    - Add logo column to schools table
    - Create school-logos bucket in storage
    - Add storage policies for authenticated users

  2. Security
    - Enable RLS on storage bucket
    - Allow authenticated users to manage logos
    - Allow public to view logos
*/

-- Add logo column to schools table
ALTER TABLE schools
ADD COLUMN IF NOT EXISTS logo text;

-- Create storage bucket for school logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('school-logos', 'school-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to manage school logos
CREATE POLICY "Allow authenticated users to manage school logos"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'school-logos')
WITH CHECK (bucket_id = 'school-logos');

-- Allow public to view school logos
CREATE POLICY "Allow public to view school logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'school-logos');

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';