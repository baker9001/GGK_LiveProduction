/*
  # Create subject-logos bucket and update subjects table

  1. Storage Setup
    - Create subject-logos bucket
    - Add RLS policies for authenticated users
    - Enable public access for logo URLs

  2. Changes
    - Update subjects table logo column
*/

-- Create storage bucket for subject logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('subject-logos', 'subject-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage subject logos
CREATE POLICY "Allow authenticated users to manage subject logos"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'subject-logos')
WITH CHECK (bucket_id = 'subject-logos');

-- Allow public to view subject logos
CREATE POLICY "Allow public to view subject logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'subject-logos');

-- Update subjects table to use logo_path
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subjects' AND column_name = 'logo_path'
  ) THEN
    ALTER TABLE subjects ADD COLUMN logo_path text;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subjects' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE subjects DROP COLUMN logo_url;
  END IF;
END $$;