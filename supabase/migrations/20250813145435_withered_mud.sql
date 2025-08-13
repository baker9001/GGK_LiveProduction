-- /supabase/migrations/TIMESTAMP_fix_company_logos_storage.sql

/*
  # Fix Storage Buckets for Company Logos
  
  1. Storage Setup
    - Ensure company-logos bucket exists and is public
    - Set proper configuration for the bucket
  
  2. Notes
    - Storage policies must be configured through Supabase Dashboard
    - Go to Storage > Policies to set up RLS policies
*/

-- Ensure company-logos bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos', 
  'company-logos', 
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml']::text[];

-- Create other logo buckets if they don't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('logos', 'logos', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml']::text[]),
  ('school-logos', 'school-logos', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml']::text[]),
  ('subject-logos', 'subject-logos', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml']::text[])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml']::text[];

-- Note: After running this migration, you need to set up storage policies in Supabase Dashboard:
-- 1. Go to Storage section in Supabase Dashboard
-- 2. Click on the 'company-logos' bucket
-- 3. Click on Policies tab
-- 4. Add the following policies:
--    - SELECT: Allow public access (no authentication required)
--    - INSERT: Allow public access (for development) or authenticated only (for production)
--    - UPDATE: Allow public access (for development) or authenticated only (for production)  
--    - DELETE: Allow public access (for development) or authenticated only (for production)