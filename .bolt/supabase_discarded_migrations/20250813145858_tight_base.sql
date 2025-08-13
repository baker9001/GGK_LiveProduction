/*
  # Fix Storage Policies for Company Logos - Authenticated Users
  
  1. Problem
    - Storage uploads failing with RLS policy violation
    - Need proper policies for authenticated users
  
  2. Solution
    - Create policies that allow authenticated users to upload/manage logos
    - Ensure public can view the logos since buckets are public
*/

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies for logo buckets to start fresh
DROP POLICY IF EXISTS "Public can upload company logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can update company logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can delete company logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view company logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can manage logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can manage school logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can manage subject logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to manage company logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view company logos" ON storage.objects;

-- Create policies for company-logos bucket
CREATE POLICY "Authenticated users can upload company logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-logos');

CREATE POLICY "Authenticated users can update company logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'company-logos')
WITH CHECK (bucket_id = 'company-logos');

CREATE POLICY "Authenticated users can delete company logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'company-logos');

CREATE POLICY "Public can view company logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'company-logos');

-- Create policies for other logo buckets
CREATE POLICY "Authenticated users can manage logos"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'logos')
WITH CHECK (bucket_id = 'logos');

CREATE POLICY "Public can view logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'logos');

CREATE POLICY "Authenticated users can manage school logos"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'school-logos')
WITH CHECK (bucket_id = 'school-logos');

CREATE POLICY "Public can view school logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'school-logos');

CREATE POLICY "Authenticated users can manage subject logos"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'subject-logos')
WITH CHECK (bucket_id = 'subject-logos');

CREATE POLICY "Public can view subject logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'subject-logos');