/*
  # Enhance companies table with country and logo support

  1. Changes
    - Add country_id column to companies table
    - Add logo column to companies table
    - Create company-logos storage bucket
    - Add foreign key constraint to countries table
    - Add storage policies for authenticated users

  2. Security
    - Enable RLS for storage access
    - Add policies for authenticated users
*/

-- Add new columns to companies table
ALTER TABLE companies
ADD COLUMN country_id uuid REFERENCES countries(id),
ADD COLUMN logo text;

-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage company logos
CREATE POLICY "Allow authenticated users to manage company logos"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'company-logos')
WITH CHECK (bucket_id = 'company-logos');

-- Allow public to view company logos
CREATE POLICY "Allow public to view company logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'company-logos');

-- Add index for better performance
CREATE INDEX idx_companies_country_id ON companies(country_id);

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';