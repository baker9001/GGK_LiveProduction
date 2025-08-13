/*
  # Fix Storage Policies for Company Logos
  
  1. Storage Setup
    - Ensure company-logos bucket exists and is public
    - Update RLS policies to allow uploads without authentication
    - Allow public viewing of logos
  
  2. Changes
    - Drop existing restrictive policies
    - Add more permissive policies for company-logos bucket
*/

-- Ensure company-logos bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos', 
  'company-logos', 
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml'];

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for company-logos bucket
DROP POLICY IF EXISTS "Allow authenticated users to manage company logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view company logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload company logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can update company logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can delete company logos" ON storage.objects;

-- Create new permissive policies for company-logos bucket

-- Allow anyone to upload company logos (for development/testing)
CREATE POLICY "Public can upload company logos"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'company-logos');

-- Allow anyone to update company logos (for development/testing)
CREATE POLICY "Public can update company logos"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'company-logos')
WITH CHECK (bucket_id = 'company-logos');

-- Allow anyone to delete company logos (for development/testing)
CREATE POLICY "Public can delete company logos"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'company-logos');

-- Allow public to view company logos
CREATE POLICY "Public can view company logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'company-logos');

-- Note: For production, you should restrict these policies to authenticated users only:
-- TO authenticated instead of TO public

-- Create similar policies for other logo buckets if they exist
DO $$
BEGIN
  -- Check and create policies for 'logos' bucket
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'logos') THEN
    DROP POLICY IF EXISTS "Public can manage logos" ON storage.objects;
    CREATE POLICY "Public can manage logos"
    ON storage.objects
    FOR ALL
    TO public
    USING (bucket_id = 'logos')
    WITH CHECK (bucket_id = 'logos');
  END IF;

  -- Check and create policies for 'school-logos' bucket
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'school-logos') THEN
    DROP POLICY IF EXISTS "Public can manage school logos" ON storage.objects;
    CREATE POLICY "Public can manage school logos"
    ON storage.objects
    FOR ALL
    TO public
    USING (bucket_id = 'school-logos')
    WITH CHECK (bucket_id = 'school-logos');
  END IF;

  -- Check and create policies for 'subject-logos' bucket
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'subject-logos') THEN
    DROP POLICY IF EXISTS "Public can manage subject logos" ON storage.objects;
    CREATE POLICY "Public can manage subject logos"
    ON storage.objects
    FOR ALL
    TO public
    USING (bucket_id = 'subject-logos')
    WITH CHECK (bucket_id = 'subject-logos');
  END IF;
END $$;