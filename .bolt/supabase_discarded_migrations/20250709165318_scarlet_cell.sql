/*
  # Fix Schema Cache and Storage Policy Issues

  1. Schema Cache Issue
    - PostgREST is not recognizing the 'status' column in 'sub_questions' table
    - Force PostgREST to reload its schema cache to recognize all columns

  2. Storage Policy Issue
    - Current RLS policy for 'questions-attachments' bucket is too restrictive
    - Update policy to allow authenticated users to upload files

  3. Changes
    - Force PostgREST schema cache reload
    - Update storage policies for questions-attachments bucket
    - Ensure authenticated users can upload, update, and delete their attachments
*/

-- Force PostgREST to reload its schema cache multiple times to ensure it takes effect
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(1);
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(1);
NOTIFY pgrst, 'reload schema';

-- Drop existing restrictive storage policies for questions-attachments bucket
DROP POLICY IF EXISTS "Allow authenticated users to upload question attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update their question attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their question attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view question attachments" ON storage.objects;

-- Create more permissive storage policies for questions-attachments bucket
CREATE POLICY "Allow authenticated users to upload question attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'questions-attachments');

CREATE POLICY "Allow authenticated users to update question attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'questions-attachments')
WITH CHECK (bucket_id = 'questions-attachments');

CREATE POLICY "Allow authenticated users to delete question attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'questions-attachments');

-- Allow public access to view question attachments
CREATE POLICY "Allow public to view question attachments"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'questions-attachments');

-- Force another schema cache reload after policy changes
SELECT pg_sleep(1);
NOTIFY pgrst, 'reload schema';