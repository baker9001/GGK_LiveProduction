/*
  # Create past-paper-imports bucket and update policies

  1. Changes
    - Create a new storage bucket with the correct name 'past-paper-imports'
    - Add appropriate RLS policies for the new bucket
    - Ensure public access is enabled

  2. Security
    - Enable RLS on storage.objects
    - Add policies for authenticated users
    - Allow public access for viewing files
*/

-- Create storage bucket with the correct name (with hyphens instead of underscores)
INSERT INTO storage.buckets (id, name, public)
VALUES ('past-paper-imports', 'past-paper-imports', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Add storage policies for the new bucket
CREATE POLICY "Allow authenticated users to manage past-paper-imports"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'past-paper-imports')
WITH CHECK (bucket_id = 'past-paper-imports');

-- Allow public to view files in the bucket
CREATE POLICY "Allow public to view past-paper-imports"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'past-paper-imports');

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';