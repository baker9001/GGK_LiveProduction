/*
  # Add logo column to branches table

  1. Changes
    - Add logo column to branches table if it doesn't exist
    - Create branch-logos storage bucket if it doesn't exist
    - Add storage policies for branch logos

  2. Security
    - Enable public access for viewing logos
    - Allow authenticated users to upload/manage logos
*/

-- Add logo column to branches table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'branches' AND column_name = 'logo'
  ) THEN
    ALTER TABLE branches ADD COLUMN logo text;
  END IF;
END $$;

-- Create branch-logos storage bucket if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'branch-logos'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'branch-logos', 
      'branch-logos', 
      true,
      2097152, -- 2MB limit
      ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml']::text[]
    );
  ELSE
    UPDATE storage.buckets SET
      public = true,
      file_size_limit = 2097152,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml']::text[]
    WHERE id = 'branch-logos';
  END IF;
END $$;

-- Storage policies for branch-logos bucket
-- Allow public access to view logos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow public to view branch logos'
  ) THEN
    CREATE POLICY "Allow public to view branch logos"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'branch-logos');
  END IF;
END $$;

-- Allow authenticated users to upload branch logos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow authenticated users to upload branch logos'
  ) THEN
    CREATE POLICY "Allow authenticated users to upload branch logos"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'branch-logos');
  END IF;
END $$;

-- Allow authenticated users to update branch logos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow authenticated users to update branch logos'
  ) THEN
    CREATE POLICY "Allow authenticated users to update branch logos"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'branch-logos');
  END IF;
END $$;

-- Allow authenticated users to delete branch logos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Allow authenticated users to delete branch logos'
  ) THEN
    CREATE POLICY "Allow authenticated users to delete branch logos"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'branch-logos');
  END IF;
END $$;