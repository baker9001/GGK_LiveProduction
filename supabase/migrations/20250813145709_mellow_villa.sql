/*
  # Create Storage Policies for Logo Buckets
  
  1. Storage Policies
    - Create RLS policies for company-logos, logos, school-logos, and subject-logos buckets
    - Allow public access for development/testing
    - Enable all CRUD operations (SELECT, INSERT, UPDATE, DELETE)
  
  2. Security Note
    - These policies allow public access for development
    - For production, consider restricting to authenticated users only
*/

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view company logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload company logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can update company logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can delete company logos" ON storage.objects;

DROP POLICY IF EXISTS "Public can manage logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can manage school logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can manage subject logos" ON storage.objects;

-- Create policies for company-logos bucket
CREATE POLICY "Public can view company logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'company-logos');

CREATE POLICY "Public can upload company logos"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'company-logos');

CREATE POLICY "Public can update company logos"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'company-logos')
WITH CHECK (bucket_id = 'company-logos');

CREATE POLICY "Public can delete company logos"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'company-logos');

-- Create policies for other logo buckets
CREATE POLICY "Public can manage logos"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'logos')
WITH CHECK (bucket_id = 'logos');

CREATE POLICY "Public can manage school logos"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'school-logos')
WITH CHECK (bucket_id = 'school-logos');

CREATE POLICY "Public can manage subject logos"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'subject-logos')
WITH CHECK (bucket_id = 'subject-logos');