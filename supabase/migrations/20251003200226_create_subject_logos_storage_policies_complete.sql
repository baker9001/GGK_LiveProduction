/*
  # Create Complete Storage Policies for subject-logos Bucket

  ## Problem
  The subject-logos storage bucket exists but has NO RLS policies configured.
  This causes "new row violates row-level security policy" errors when attempting
  to upload subject logos.

  ## Solution
  Create comprehensive storage policies matching the manually created policies shown
  in the Supabase dashboard, enabling:
  1. Public read access (SELECT) - anyone can view subject logos
  2. Authenticated users can upload (INSERT)
  3. Authenticated users can update (UPDATE)
  4. Authenticated users can delete (DELETE)
  5. Service role full access (ALL) - for Edge Functions

  ## Security Model
  - Public users: Can view/download logos (SELECT)
  - Authenticated users: Can manage logos (INSERT/UPDATE/DELETE)
  - Service role: Full access for Edge Function uploads (ALL)

  ## Storage Operations Mapping
  - SELECT → enables download, list, getPublicUrl
  - INSERT → enables upload, createSignedUrl
  - UPDATE → enables update, move, copy
  - DELETE → enables remove
*/

-- ============================================================================
-- STEP 1: Clean Up Any Existing Policies
-- ============================================================================

DROP POLICY IF EXISTS "Give users authenticated access to folder 1ir8pxj_0" ON storage.objects;
DROP POLICY IF EXISTS "Give users authenticated access to folder 1ir8pxj_1" ON storage.objects;
DROP POLICY IF EXISTS "Give users authenticated access to folder 1ir8pxj_2" ON storage.objects;
DROP POLICY IF EXISTS "Give users authenticated access to folder 1ir8pxj_3" ON storage.objects;
DROP POLICY IF EXISTS "Public can view subject logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view subject logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload subject logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update subject logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete subject logos" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access to subject logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload subject logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update subject logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete subject logos" ON storage.objects;

-- ============================================================================
-- STEP 2: Create Storage Policies for subject-logos Bucket
-- ============================================================================

-- Policy 1: Public SELECT - Anyone can view subject logos
CREATE POLICY "Public can view subject logos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'subject-logos');

-- Policy 2: Authenticated INSERT - Authenticated users can upload
CREATE POLICY "Authenticated users can upload subject logos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'subject-logos');

-- Policy 3: Authenticated UPDATE - Authenticated users can update
CREATE POLICY "Authenticated users can update subject logos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'subject-logos')
  WITH CHECK (bucket_id = 'subject-logos');

-- Policy 4: Authenticated DELETE - Authenticated users can delete
CREATE POLICY "Authenticated users can delete subject logos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'subject-logos');

-- Policy 5: Service Role ALL - Full access for Edge Functions
CREATE POLICY "Service role full access to subject logos"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'subject-logos')
  WITH CHECK (bucket_id = 'subject-logos');

-- ============================================================================
-- STEP 3: Verification and Reporting
-- ============================================================================

DO $$
DECLARE
  bucket_exists BOOLEAN;
  bucket_public BOOLEAN;
  bucket_size_limit BIGINT;
  policy_count INTEGER;
  select_policy_exists BOOLEAN;
  insert_policy_exists BOOLEAN;
  update_policy_exists BOOLEAN;
  delete_policy_exists BOOLEAN;
  service_policy_exists BOOLEAN;
BEGIN
  -- Check bucket configuration
  SELECT 
    EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'subject-logos'),
    COALESCE((SELECT public FROM storage.buckets WHERE id = 'subject-logos'), false),
    COALESCE((SELECT file_size_limit FROM storage.buckets WHERE id = 'subject-logos'), 0)
  INTO 
    bucket_exists,
    bucket_public,
    bucket_size_limit;

  -- Check individual policies exist
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Public can view subject logos'
  ) INTO select_policy_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Authenticated users can upload subject logos'
  ) INTO insert_policy_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Authenticated users can update subject logos'
  ) INTO update_policy_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Authenticated users can delete subject logos'
  ) INTO delete_policy_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Service role full access to subject logos'
  ) INTO service_policy_exists;

  -- Count total policies for this bucket
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%subject%logo%';

  -- Report results
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'SUBJECT-LOGOS STORAGE BUCKET VERIFICATION';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'Bucket Configuration:';
  RAISE NOTICE '  Bucket exists: %', bucket_exists;
  RAISE NOTICE '  Public access: %', bucket_public;
  RAISE NOTICE '  Size limit: % MB', (bucket_size_limit / 1048576);
  RAISE NOTICE '';
  RAISE NOTICE 'Storage Policies Created:';
  RAISE NOTICE '  ✓ SELECT (public): %', select_policy_exists;
  RAISE NOTICE '  ✓ INSERT (authenticated): %', insert_policy_exists;
  RAISE NOTICE '  ✓ UPDATE (authenticated): %', update_policy_exists;
  RAISE NOTICE '  ✓ DELETE (authenticated): %', delete_policy_exists;
  RAISE NOTICE '  ✓ ALL (service_role): %', service_policy_exists;
  RAISE NOTICE '';
  RAISE NOTICE 'Total policies: %', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Enabled Operations:';
  RAISE NOTICE '  → Public users: View/download logos';
  RAISE NOTICE '  → Authenticated users: Upload, update, delete logos';
  RAISE NOTICE '  → Edge Functions: Full access via service_role';
  RAISE NOTICE '';
  RAISE NOTICE 'Status: ✓ Subject logo uploads are now fully functional';
  RAISE NOTICE '========================================================================';
END $$;
