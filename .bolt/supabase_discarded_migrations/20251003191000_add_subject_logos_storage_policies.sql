/*
  # Add Storage RLS Policies for subject-logos Bucket

  1. Storage Setup
    - Ensure subject-logos bucket exists and is properly configured
    - Add storage policies for subject logos

  2. Security
    - Enable public access for viewing logos
    - Allow authenticated users to upload/manage logos
    - File size limited to 2MB
    - Only image file types allowed (JPEG, PNG, JPG, SVG)

  3. Notes
    - These policies allow system admins and authenticated users to manage subject logos
    - Public read access enables logos to display without authentication
*/

-- Create subject-logos storage bucket if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'subject-logos'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'subject-logos',
      'subject-logos',
      true,
      2097152, -- 2MB limit
      ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml']::text[]
    );
  ELSE
    UPDATE storage.buckets SET
      public = true,
      file_size_limit = 2097152,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml']::text[]
    WHERE id = 'subject-logos';
  END IF;
END $$;

-- Storage policies for subject-logos bucket
-- Allow public access to view logos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Allow public to view subject logos'
  ) THEN
    CREATE POLICY "Allow public to view subject logos"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'subject-logos');
  END IF;
END $$;

-- Allow authenticated users and anon role to upload subject logos
-- This allows both Supabase auth users and custom auth users to upload
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Allow authenticated users to upload subject logos'
  ) THEN
    CREATE POLICY "Allow authenticated users to upload subject logos"
    ON storage.objects
    FOR INSERT
    TO authenticated, anon
    WITH CHECK (bucket_id = 'subject-logos');
  END IF;
END $$;

-- Allow authenticated users and anon role to update subject logos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Allow authenticated users to update subject logos'
  ) THEN
    CREATE POLICY "Allow authenticated users to update subject logos"
    ON storage.objects
    FOR UPDATE
    TO authenticated, anon
    USING (bucket_id = 'subject-logos');
  END IF;
END $$;

-- Allow authenticated users and anon role to delete subject logos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Allow authenticated users to delete subject logos'
  ) THEN
    CREATE POLICY "Allow authenticated users to delete subject logos"
    ON storage.objects
    FOR DELETE
    TO authenticated, anon
    USING (bucket_id = 'subject-logos');
  END IF;
END $$;
