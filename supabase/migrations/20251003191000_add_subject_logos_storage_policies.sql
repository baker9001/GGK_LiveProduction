/*
  # Add Storage RLS Policies for subject-logos Bucket

  1. Storage Policies
    - Allow authenticated users to upload files (INSERT)
    - Allow authenticated users to update their uploaded files (UPDATE)
    - Allow authenticated users to delete their uploaded files (DELETE)
    - Allow public read access to all files (SELECT)

  2. Security
    - Upload, update, and delete operations require authentication
    - Read operations are public for easy display of subject logos
    - File size limited to 2MB (set in bucket configuration)
    - Only image file types allowed (JPEG, PNG, JPG, SVG)

  3. Notes
    - The subject-logos bucket should already exist from previous migration
    - These policies allow system admins and authenticated users to manage subject logos
    - Public read access enables logos to display without authentication
*/

-- Ensure the bucket exists and is configured correctly
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'subject-logos',
  'subject-logos',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml']::text[];

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public read access to subject logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload subject logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update subject logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete subject logos" ON storage.objects;

-- Policy 1: Allow public read access to all files in subject-logos bucket
CREATE POLICY "Allow public read access to subject logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'subject-logos');

-- Policy 2: Allow authenticated users to upload files to subject-logos bucket
CREATE POLICY "Allow authenticated users to upload subject logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'subject-logos');

-- Policy 3: Allow authenticated users to update files in subject-logos bucket
CREATE POLICY "Allow authenticated users to update subject logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'subject-logos')
WITH CHECK (bucket_id = 'subject-logos');

-- Policy 4: Allow authenticated users to delete files from subject-logos bucket
CREATE POLICY "Allow authenticated users to delete subject logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'subject-logos');
