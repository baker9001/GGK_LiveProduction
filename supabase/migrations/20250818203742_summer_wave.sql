/*
  # Add logo support for branches

  1. Changes
    - Add logo column to branches table
    - Create branch-logos storage bucket
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

-- Create branch-logos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'branch-logos', 
  'branch-logos', 
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml']::text[];

-- Storage policies for branch-logos bucket
-- Allow public access to view logos
CREATE POLICY IF NOT EXISTS "Allow public to view branch logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'branch-logos');

-- Allow authenticated users to upload branch logos
CREATE POLICY IF NOT EXISTS "Allow authenticated users to upload branch logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'branch-logos');

-- Allow authenticated users to update branch logos
CREATE POLICY IF NOT EXISTS "Allow authenticated users to update branch logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'branch-logos');

-- Allow authenticated users to delete branch logos
CREATE POLICY IF NOT EXISTS "Allow authenticated users to delete branch logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'branch-logos');

-- Notify PostgREST to refresh schema cache
NOTIFY pgrst, 'reload schema';