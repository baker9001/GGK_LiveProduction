/*
  # Create Storage Policies for subject-logos Bucket

  ## Problem
  The subject-logos storage bucket exists but has NO policies configured.
  This causes "new row violates row-level security policy" errors when trying to upload logos.

  ## Solution
  Create comprehensive storage policies for the subject-logos bucket:
  1. Public read access (SELECT) - anyone can view subject logos
  2. Service role full access - for Edge Functions to handle secure uploads/deletes
  3. Block direct uploads from anon/authenticated roles for security

  ## Security Model
  - Frontend users CANNOT upload directly to storage
  - All uploads go through Edge Functions with server-side validation
  - Edge Functions use service_role credentials to bypass RLS
  - This prevents unauthorized uploads and ensures proper access control

  ## Tables Affected
  - storage.objects (RLS policies)
  - storage.buckets (configuration)
*/

-- ============================================================================
-- STEP 1: Ensure the subject-logos bucket exists and is properly configured
-- ============================================================================

DO $$
BEGIN
  -- Check if bucket exists, if not create it
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

    RAISE NOTICE 'Created subject-logos storage bucket';
  ELSE
    -- Update existing bucket to ensure correct configuration
    UPDATE storage.buckets SET
      public = true,
      file_size_limit = 2097152,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml']::text[]
    WHERE id = 'subject-logos';

    RAISE NOTICE 'Updated subject-logos bucket configuration';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Drop any existing policies (clean slate)
-- ============================================================================

DROP POLICY IF EXISTS "Allow public to view subject logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload subject logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update subject logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete subject logos" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access to subject logos" ON storage.objects;

-- ============================================================================
-- STEP 3: Create New Secure Storage Policies
-- ============================================================================

-- Policy 1: Public read access for viewing logos
-- Anyone can view subject logos (no authentication required)
CREATE POLICY "Public can view subject logos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'subject-logos');

-- Policy 2: Service role full access for Edge Functions
-- Only service_role can INSERT, UPDATE, DELETE
-- This ensures all uploads go through our secure Edge Functions
CREATE POLICY "Service role full access to subject logos"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'subject-logos')
  WITH CHECK (bucket_id = 'subject-logos');

-- ============================================================================
-- STEP 4: Verification and Logging
-- ============================================================================

DO $$
DECLARE
  bucket_exists BOOLEAN;
  select_policy_exists BOOLEAN;
  service_policy_exists BOOLEAN;
  policy_count INTEGER;
BEGIN
  -- Check bucket exists
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'subject-logos'
  ) INTO bucket_exists;

  -- Check SELECT policy exists
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Public can view subject logos'
  ) INTO select_policy_exists;

  -- Check service role policy exists
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
  AND policyname LIKE '%subject logo%';

  -- Log results
  RAISE NOTICE '========================================================';
  RAISE NOTICE 'SUBJECT LOGOS STORAGE POLICIES CREATED';
  RAISE NOTICE '========================================================';
  RAISE NOTICE 'Bucket exists: %', bucket_exists;
  RAISE NOTICE 'Public SELECT policy: %', select_policy_exists;
  RAISE NOTICE 'Service role policy: %', service_policy_exists;
  RAISE NOTICE 'Total policies: %', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Security Model:';
  RAISE NOTICE '  ✓ Public users can VIEW subject logos';
  RAISE NOTICE '  ✓ Service role can perform ALL operations';
  RAISE NOTICE '  ✗ Direct uploads from frontend are BLOCKED';
  RAISE NOTICE '  → All uploads must go through Edge Functions';
  RAISE NOTICE '========================================================';
END $$;

-- Add helpful comment
COMMENT ON TABLE storage.objects IS
  'Storage objects table. subject-logos bucket uses service_role-only access for uploads via Edge Functions.';
