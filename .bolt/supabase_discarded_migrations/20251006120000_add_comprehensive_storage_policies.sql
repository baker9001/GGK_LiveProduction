/*
  # Add Comprehensive Storage Policies for All Buckets

  ## Problem
  Multiple storage buckets (company-logos, school-logos, user-avatars) are missing
  proper Row Level Security (RLS) policies, causing "new row violates row-level
  security policy" errors when trying to upload files.

  ## Solution
  Create comprehensive storage policies for all buckets used in the application:
  - company-logos
  - school-logos
  - user-avatars (new bucket)
  - logos (update existing policies)

  ## Storage Operations Mapping
  Based on Supabase Storage interface, these are the 4 operation types:
  - SELECT → enables download, list, getPublicUrl
  - INSERT → enables upload, createSignedUrl, createSignedUrls
  - UPDATE → enables update, move, copy
  - DELETE → enables remove

  ## Security Model
  1. Public Access (public role):
     - SELECT: Anyone can view/download logos without authentication

  2. Authenticated Users (authenticated role):
     - INSERT: Can upload new files
     - UPDATE: Can modify, move, or copy files
     - DELETE: Can remove files

  3. Custom Auth Users (anon role):
     - INSERT: Can upload new files (supports custom authentication)
     - UPDATE: Can modify files (supports custom authentication)
     - DELETE: Can remove files (supports custom authentication)

  4. Edge Functions (service_role):
     - ALL: Full access for secure server-side operations

  ## Tables Affected
  - storage.buckets (bucket configuration)
  - storage.objects (RLS policies)
*/

-- ============================================================================
-- STEP 1: Create and Configure Storage Buckets
-- ============================================================================

-- Company Logos Bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'company-logos'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'company-logos',
      'company-logos',
      true,
      2097152, -- 2MB limit
      ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml']::text[]
    );
    RAISE NOTICE 'Created company-logos storage bucket';
  ELSE
    UPDATE storage.buckets SET
      public = true,
      file_size_limit = 2097152,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml']::text[]
    WHERE id = 'company-logos';
    RAISE NOTICE 'Updated company-logos bucket configuration';
  END IF;
END $$;

-- School Logos Bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'school-logos'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'school-logos',
      'school-logos',
      true,
      2097152, -- 2MB limit
      ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml']::text[]
    );
    RAISE NOTICE 'Created school-logos storage bucket';
  ELSE
    UPDATE storage.buckets SET
      public = true,
      file_size_limit = 2097152,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml']::text[]
    WHERE id = 'school-logos';
    RAISE NOTICE 'Updated school-logos bucket configuration';
  END IF;
END $$;

-- User Avatars Bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'user-avatars'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'user-avatars',
      'user-avatars',
      true,
      2097152, -- 2MB limit
      ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml']::text[]
    );
    RAISE NOTICE 'Created user-avatars storage bucket';
  ELSE
    UPDATE storage.buckets SET
      public = true,
      file_size_limit = 2097152,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml']::text[]
    WHERE id = 'user-avatars';
    RAISE NOTICE 'Updated user-avatars bucket configuration';
  END IF;
END $$;

-- Avatars Bucket (alternative naming used in some components)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'avatars'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'avatars',
      'avatars',
      true,
      2097152, -- 2MB limit
      ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml']::text[]
    );
    RAISE NOTICE 'Created avatars storage bucket';
  ELSE
    UPDATE storage.buckets SET
      public = true,
      file_size_limit = 2097152,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml']::text[]
    WHERE id = 'avatars';
    RAISE NOTICE 'Updated avatars bucket configuration';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Clean Up Old Policies (Conditional Drops)
-- ============================================================================

-- Drop old company-logos policies if they exist
DROP POLICY IF EXISTS "Allow public to view company logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload company logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update company logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete company logos" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access to company logos" ON storage.objects;

-- Drop old school-logos policies if they exist
DROP POLICY IF EXISTS "Allow public to view school logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload school logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update school logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete school logos" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access to school logos" ON storage.objects;

-- Drop old user-avatars policies if they exist
DROP POLICY IF EXISTS "Allow public to view user avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload user avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update user avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete user avatars" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access to user avatars" ON storage.objects;

-- Drop old avatars policies if they exist
DROP POLICY IF EXISTS "Allow public to view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access to avatars" ON storage.objects;

-- ============================================================================
-- STEP 3: Company-Logos Bucket Policies
-- ============================================================================

-- SELECT Policy: Public can view company logos
CREATE POLICY "Public can view company logos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'company-logos');

-- INSERT Policy: Authenticated users can upload
CREATE POLICY "Authenticated users can upload company logos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'company-logos');

-- INSERT Policy: Anon users can upload (custom auth support)
CREATE POLICY "Anon users can upload company logos"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'company-logos');

-- UPDATE Policy: Authenticated users can update
CREATE POLICY "Authenticated users can update company logos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'company-logos')
  WITH CHECK (bucket_id = 'company-logos');

-- UPDATE Policy: Anon users can update (custom auth support)
CREATE POLICY "Anon users can update company logos"
  ON storage.objects
  FOR UPDATE
  TO anon
  USING (bucket_id = 'company-logos')
  WITH CHECK (bucket_id = 'company-logos');

-- DELETE Policy: Authenticated users can delete
CREATE POLICY "Authenticated users can delete company logos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'company-logos');

-- DELETE Policy: Anon users can delete (custom auth support)
CREATE POLICY "Anon users can delete company logos"
  ON storage.objects
  FOR DELETE
  TO anon
  USING (bucket_id = 'company-logos');

-- Service Role Policy: Full access for Edge Functions
CREATE POLICY "Service role full access to company logos"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'company-logos')
  WITH CHECK (bucket_id = 'company-logos');

-- ============================================================================
-- STEP 4: School-Logos Bucket Policies
-- ============================================================================

-- SELECT Policy: Public can view school logos
CREATE POLICY "Public can view school logos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'school-logos');

-- INSERT Policy: Authenticated users can upload
CREATE POLICY "Authenticated users can upload school logos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'school-logos');

-- INSERT Policy: Anon users can upload (custom auth support)
CREATE POLICY "Anon users can upload school logos"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'school-logos');

-- UPDATE Policy: Authenticated users can update
CREATE POLICY "Authenticated users can update school logos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'school-logos')
  WITH CHECK (bucket_id = 'school-logos');

-- UPDATE Policy: Anon users can update (custom auth support)
CREATE POLICY "Anon users can update school logos"
  ON storage.objects
  FOR UPDATE
  TO anon
  USING (bucket_id = 'school-logos')
  WITH CHECK (bucket_id = 'school-logos');

-- DELETE Policy: Authenticated users can delete
CREATE POLICY "Authenticated users can delete school logos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'school-logos');

-- DELETE Policy: Anon users can delete (custom auth support)
CREATE POLICY "Anon users can delete school logos"
  ON storage.objects
  FOR DELETE
  TO anon
  USING (bucket_id = 'school-logos');

-- Service Role Policy: Full access for Edge Functions
CREATE POLICY "Service role full access to school logos"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'school-logos')
  WITH CHECK (bucket_id = 'school-logos');

-- ============================================================================
-- STEP 5: User-Avatars Bucket Policies
-- ============================================================================

-- SELECT Policy: Public can view user avatars
CREATE POLICY "Public can view user avatars"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'user-avatars');

-- INSERT Policy: Authenticated users can upload
CREATE POLICY "Authenticated users can upload user avatars"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'user-avatars');

-- INSERT Policy: Anon users can upload (custom auth support)
CREATE POLICY "Anon users can upload user avatars"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'user-avatars');

-- UPDATE Policy: Authenticated users can update
CREATE POLICY "Authenticated users can update user avatars"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'user-avatars')
  WITH CHECK (bucket_id = 'user-avatars');

-- UPDATE Policy: Anon users can update (custom auth support)
CREATE POLICY "Anon users can update user avatars"
  ON storage.objects
  FOR UPDATE
  TO anon
  USING (bucket_id = 'user-avatars')
  WITH CHECK (bucket_id = 'user-avatars');

-- DELETE Policy: Authenticated users can delete
CREATE POLICY "Authenticated users can delete user avatars"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'user-avatars');

-- DELETE Policy: Anon users can delete (custom auth support)
CREATE POLICY "Anon users can delete user avatars"
  ON storage.objects
  FOR DELETE
  TO anon
  USING (bucket_id = 'user-avatars');

-- Service Role Policy: Full access for Edge Functions
CREATE POLICY "Service role full access to user avatars"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'user-avatars')
  WITH CHECK (bucket_id = 'user-avatars');

-- ============================================================================
-- STEP 6: Avatars Bucket Policies (Alternative Naming)
-- ============================================================================

-- SELECT Policy: Public can view avatars
CREATE POLICY "Public can view avatars"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- INSERT Policy: Authenticated users can upload
CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

-- INSERT Policy: Anon users can upload (custom auth support)
CREATE POLICY "Anon users can upload avatars"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'avatars');

-- UPDATE Policy: Authenticated users can update
CREATE POLICY "Authenticated users can update avatars"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars')
  WITH CHECK (bucket_id = 'avatars');

-- UPDATE Policy: Anon users can update (custom auth support)
CREATE POLICY "Anon users can update avatars"
  ON storage.objects
  FOR UPDATE
  TO anon
  USING (bucket_id = 'avatars')
  WITH CHECK (bucket_id = 'avatars');

-- DELETE Policy: Authenticated users can delete
CREATE POLICY "Authenticated users can delete avatars"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars');

-- DELETE Policy: Anon users can delete (custom auth support)
CREATE POLICY "Anon users can delete avatars"
  ON storage.objects
  FOR DELETE
  TO anon
  USING (bucket_id = 'avatars');

-- Service Role Policy: Full access for Edge Functions
CREATE POLICY "Service role full access to avatars"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'avatars')
  WITH CHECK (bucket_id = 'avatars');

-- ============================================================================
-- STEP 7: Update Existing Logos Bucket Policies
-- ============================================================================

-- Add missing anon policies for logos bucket
DO $$
BEGIN
  -- INSERT Policy for anon
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Anon users can upload logos'
  ) THEN
    CREATE POLICY "Anon users can upload logos"
      ON storage.objects
      FOR INSERT
      TO anon
      WITH CHECK (bucket_id = 'logos');
    RAISE NOTICE 'Created anon INSERT policy for logos bucket';
  END IF;

  -- UPDATE Policy for authenticated
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Authenticated users can update logos'
  ) THEN
    CREATE POLICY "Authenticated users can update logos"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (bucket_id = 'logos')
      WITH CHECK (bucket_id = 'logos');
    RAISE NOTICE 'Created authenticated UPDATE policy for logos bucket';
  END IF;

  -- UPDATE Policy for anon
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Anon users can update logos'
  ) THEN
    CREATE POLICY "Anon users can update logos"
      ON storage.objects
      FOR UPDATE
      TO anon
      USING (bucket_id = 'logos')
      WITH CHECK (bucket_id = 'logos');
    RAISE NOTICE 'Created anon UPDATE policy for logos bucket';
  END IF;

  -- DELETE Policy for anon
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Anon users can delete logos'
  ) THEN
    CREATE POLICY "Anon users can delete logos"
      ON storage.objects
      FOR DELETE
      TO anon
      USING (bucket_id = 'logos');
    RAISE NOTICE 'Created anon DELETE policy for logos bucket';
  END IF;

  -- Service Role Policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Service role full access to logos'
  ) THEN
    CREATE POLICY "Service role full access to logos"
      ON storage.objects
      FOR ALL
      TO service_role
      USING (bucket_id = 'logos')
      WITH CHECK (bucket_id = 'logos');
    RAISE NOTICE 'Created service_role policy for logos bucket';
  END IF;
END $$;

-- ============================================================================
-- STEP 8: Verification and Summary
-- ============================================================================

DO $$
DECLARE
  bucket_record RECORD;
  policy_count INTEGER;
  total_buckets INTEGER := 0;
  total_policies INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'STORAGE BUCKETS AND POLICIES VERIFICATION';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';

  -- Verify buckets
  FOR bucket_record IN
    SELECT id, public, file_size_limit
    FROM storage.buckets
    WHERE id IN ('company-logos', 'school-logos', 'user-avatars', 'avatars', 'logos', 'branch-logos', 'subject-logos')
    ORDER BY id
  LOOP
    total_buckets := total_buckets + 1;

    -- Count policies for this bucket
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE '%' || bucket_record.id || '%';

    total_policies := total_policies + policy_count;

    RAISE NOTICE 'Bucket: % | Public: % | Size Limit: % | Policies: %',
      RPAD(bucket_record.id, 20),
      bucket_record.public,
      CASE
        WHEN bucket_record.file_size_limit IS NOT NULL
        THEN (bucket_record.file_size_limit / 1048576)::text || 'MB'
        ELSE 'unlimited'
      END,
      policy_count;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'SUMMARY';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'Total Buckets Configured: %', total_buckets;
  RAISE NOTICE 'Total Storage Policies: %', total_policies;
  RAISE NOTICE '';
  RAISE NOTICE 'Security Model:';
  RAISE NOTICE '  ✓ Public users can VIEW all logos (SELECT)';
  RAISE NOTICE '  ✓ Authenticated users can upload/update/delete files (INSERT/UPDATE/DELETE)';
  RAISE NOTICE '  ✓ Anon users can upload/update/delete files (custom auth support)';
  RAISE NOTICE '  ✓ Service role has full access (Edge Functions support)';
  RAISE NOTICE '';
  RAISE NOTICE 'Operations Enabled:';
  RAISE NOTICE '  → SELECT: download, list, getPublicUrl';
  RAISE NOTICE '  → INSERT: upload, createSignedUrl';
  RAISE NOTICE '  → UPDATE: update, move, copy';
  RAISE NOTICE '  → DELETE: remove';
  RAISE NOTICE '========================================================================';
END $$;
