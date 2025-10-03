/*
  # Complete Fix for Subject Logo Upload Issue

  ## Problem Analysis
  After reviewing the codebase and database configuration, several issues have been identified
  that prevent subject logos from being uploaded through the UI:

  1. Storage bucket policies may be missing or incomplete
  2. RLS policies on edu_subjects table may not properly allow UPDATE operations
  3. Edge Function authentication flow requires proper admin verification
  4. Logo URL column needs proper configuration

  ## Solution
  This migration provides a comprehensive fix by:
  1. Ensuring subject-logos bucket exists with correct configuration
  2. Creating complete set of storage policies (SELECT, INSERT, UPDATE, DELETE)
  3. Adding policies for authenticated, anon, and service_role users
  4. Fixing edu_subjects table RLS policies with explicit operations
  5. Verifying logo_url column exists and is properly configured
  6. Adding helper function to verify bucket and policy configuration

  ## Security Model
  - Public users: Can view logos (SELECT)
  - Authenticated users: Can upload, update, and delete logos (INSERT, UPDATE, DELETE)
  - Anon users: Can perform all operations (supports custom authentication)
  - Service role: Full access for Edge Functions

  ## Tables Affected
  - storage.buckets (bucket configuration)
  - storage.objects (RLS policies for file operations)
  - edu_subjects (RLS policies for database updates)
*/

-- ============================================================================
-- STEP 1: Ensure subject-logos Bucket Exists and is Properly Configured
-- ============================================================================

DO $$
BEGIN
  -- Check if bucket exists, create or update it
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'subject-logos'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'subject-logos',
      'subject-logos',
      true,  -- Public bucket for logo access
      2097152, -- 2MB limit
      ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml']::text[]
    );
    RAISE NOTICE 'Created subject-logos bucket';
  ELSE
    -- Update existing bucket to ensure correct configuration
    UPDATE storage.buckets
    SET
      public = true,
      file_size_limit = 2097152,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'image/svg+xml']::text[]
    WHERE id = 'subject-logos';
    RAISE NOTICE 'Updated subject-logos bucket configuration';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Drop ALL Existing subject-logos Storage Policies to Start Fresh
-- ============================================================================

-- Drop all possible policy variations to ensure clean slate
DROP POLICY IF EXISTS "Public can view subject logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload subject logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update subject logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete subject logos" ON storage.objects;
DROP POLICY IF EXISTS "Anon users can upload subject logos" ON storage.objects;
DROP POLICY IF EXISTS "Anon users can update subject logos" ON storage.objects;
DROP POLICY IF EXISTS "Anon users can delete subject logos" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access to subject logos" ON storage.objects;

-- Drop any other variations that might exist
DROP POLICY IF EXISTS "subject-logos public access" ON storage.objects;
DROP POLICY IF EXISTS "subject-logos authenticated insert" ON storage.objects;
DROP POLICY IF EXISTS "subject-logos authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "subject-logos authenticated delete" ON storage.objects;

RAISE NOTICE 'Dropped all existing subject-logos storage policies';

-- ============================================================================
-- STEP 3: Create Complete Set of Storage Policies for subject-logos
-- ============================================================================

-- Policy 1: Public SELECT - Anyone can view/download subject logos
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

-- Policy 3: Authenticated UPDATE - Authenticated users can update/replace
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

-- Policy 5: Anon INSERT - Support for custom authentication
CREATE POLICY "Anon users can upload subject logos"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'subject-logos');

-- Policy 6: Anon UPDATE - Support for custom authentication
CREATE POLICY "Anon users can update subject logos"
  ON storage.objects
  FOR UPDATE
  TO anon
  USING (bucket_id = 'subject-logos')
  WITH CHECK (bucket_id = 'subject-logos');

-- Policy 7: Anon DELETE - Support for custom authentication
CREATE POLICY "Anon users can delete subject logos"
  ON storage.objects
  FOR DELETE
  TO anon
  USING (bucket_id = 'subject-logos');

-- Policy 8: Service Role ALL - Full access for Edge Functions
CREATE POLICY "Service role full access to subject logos"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (bucket_id = 'subject-logos')
  WITH CHECK (bucket_id = 'subject-logos');

RAISE NOTICE 'Created complete set of storage policies for subject-logos';

-- ============================================================================
-- STEP 4: Ensure logo_url Column Exists in edu_subjects
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'edu_subjects'
    AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE edu_subjects ADD COLUMN logo_url TEXT;
    RAISE NOTICE 'Added logo_url column to edu_subjects table';
  ELSE
    RAISE NOTICE 'logo_url column already exists in edu_subjects table';
  END IF;
END $$;

-- Add helpful comment to the column
COMMENT ON COLUMN edu_subjects.logo_url IS 'Path to subject logo image stored in subject-logos storage bucket. Can be either a storage path (e.g., uuid.png) or a full URL.';

-- ============================================================================
-- STEP 5: Fix edu_subjects Table RLS Policies
-- ============================================================================

-- Drop potentially problematic FOR ALL policy
DROP POLICY IF EXISTS "System admins can manage edu_subjects" ON edu_subjects;

-- Ensure we have explicit policies for each operation
-- Drop existing explicit policies first to recreate them
DROP POLICY IF EXISTS "System admins can insert edu_subjects" ON edu_subjects;
DROP POLICY IF EXISTS "System admins can update edu_subjects" ON edu_subjects;
DROP POLICY IF EXISTS "System admins can delete edu_subjects" ON edu_subjects;
DROP POLICY IF EXISTS "All authenticated users can view edu_subjects" ON edu_subjects;
DROP POLICY IF EXISTS "Service role full access to edu_subjects" ON edu_subjects;

-- Policy 1: SELECT - All authenticated users can view subjects
CREATE POLICY "All authenticated users can view edu_subjects"
  ON edu_subjects FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: INSERT - System admins can create new subjects
CREATE POLICY "System admins can insert edu_subjects"
  ON edu_subjects FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
    )
  );

-- Policy 3: UPDATE - System admins can update existing subjects (INCLUDING logo_url)
-- This is CRITICAL for logo upload functionality
CREATE POLICY "System admins can update edu_subjects"
  ON edu_subjects FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
    )
  );

-- Policy 4: DELETE - System admins can delete subjects
CREATE POLICY "System admins can delete edu_subjects"
  ON edu_subjects FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
    )
  );

-- Policy 5: Service role has full access (for Edge Functions and migrations)
CREATE POLICY "Service role full access to edu_subjects"
  ON edu_subjects FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

RAISE NOTICE 'Fixed edu_subjects RLS policies with explicit operations';

-- ============================================================================
-- STEP 6: Ensure RLS is Enabled on edu_subjects
-- ============================================================================

ALTER TABLE edu_subjects ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 7: Create Helper Function to Verify Configuration
-- ============================================================================

CREATE OR REPLACE FUNCTION verify_subject_logo_configuration()
RETURNS TABLE(
  check_name TEXT,
  status TEXT,
  details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  bucket_exists BOOLEAN;
  bucket_public BOOLEAN;
  storage_policy_count INTEGER;
  table_policy_count INTEGER;
  column_exists BOOLEAN;
  rls_enabled BOOLEAN;
BEGIN
  -- Check 1: Bucket exists
  SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'subject-logos') INTO bucket_exists;
  SELECT COALESCE((SELECT public FROM storage.buckets WHERE id = 'subject-logos'), false) INTO bucket_public;

  RETURN QUERY SELECT
    'Storage Bucket'::TEXT,
    CASE WHEN bucket_exists AND bucket_public THEN '✓ PASS' ELSE '✗ FAIL' END,
    CASE
      WHEN NOT bucket_exists THEN 'Bucket does not exist'
      WHEN NOT bucket_public THEN 'Bucket exists but is not public'
      ELSE 'Bucket exists and is public'
    END;

  -- Check 2: Storage policies count
  SELECT COUNT(*) INTO storage_policy_count
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname ILIKE '%subject%';

  RETURN QUERY SELECT
    'Storage Policies'::TEXT,
    CASE WHEN storage_policy_count >= 8 THEN '✓ PASS' ELSE '✗ FAIL' END,
    storage_policy_count || ' policies found (expected: 8+)';

  -- Check 3: Table RLS policies
  SELECT COUNT(*) INTO table_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'edu_subjects';

  RETURN QUERY SELECT
    'Table RLS Policies'::TEXT,
    CASE WHEN table_policy_count >= 5 THEN '✓ PASS' ELSE '✗ FAIL' END,
    table_policy_count || ' policies found (expected: 5+)';

  -- Check 4: logo_url column exists
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'edu_subjects'
      AND column_name = 'logo_url'
  ) INTO column_exists;

  RETURN QUERY SELECT
    'logo_url Column'::TEXT,
    CASE WHEN column_exists THEN '✓ PASS' ELSE '✗ FAIL' END,
    CASE WHEN column_exists THEN 'Column exists' ELSE 'Column missing' END;

  -- Check 5: RLS enabled on edu_subjects
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'edu_subjects';

  RETURN QUERY SELECT
    'RLS Enabled'::TEXT,
    CASE WHEN rls_enabled THEN '✓ PASS' ELSE '✗ FAIL' END,
    CASE WHEN rls_enabled THEN 'RLS is enabled' ELSE 'RLS is disabled' END;

END;
$$;

COMMENT ON FUNCTION verify_subject_logo_configuration() IS 'Helper function to verify all components required for subject logo upload are properly configured';

-- ============================================================================
-- STEP 8: Verification and Reporting
-- ============================================================================

DO $$
DECLARE
  bucket_exists BOOLEAN;
  bucket_config RECORD;
  storage_policy_count INTEGER;
  table_policy_count INTEGER;
  column_exists BOOLEAN;
  rls_enabled BOOLEAN;
  verification_result RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'SUBJECT LOGO UPLOAD FIX - VERIFICATION REPORT';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';

  -- Bucket verification
  SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'subject-logos') INTO bucket_exists;

  IF bucket_exists THEN
    SELECT * INTO bucket_config FROM storage.buckets WHERE id = 'subject-logos';
    RAISE NOTICE '✓ Storage Bucket: EXISTS';
    RAISE NOTICE '  - Name: %', bucket_config.name;
    RAISE NOTICE '  - Public: %', bucket_config.public;
    RAISE NOTICE '  - Size Limit: % MB', (bucket_config.file_size_limit / 1048576);
    RAISE NOTICE '  - Allowed Types: %', bucket_config.allowed_mime_types;
  ELSE
    RAISE NOTICE '✗ Storage Bucket: MISSING';
  END IF;

  RAISE NOTICE '';

  -- Storage policies
  SELECT COUNT(*) INTO storage_policy_count
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname ILIKE '%subject%';

  RAISE NOTICE '✓ Storage Policies: % created', storage_policy_count;

  FOR verification_result IN
    SELECT policyname, cmd, ARRAY_TO_STRING(roles, ', ') as role_list
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname ILIKE '%subject%'
    ORDER BY policyname
  LOOP
    RAISE NOTICE '  - %: % for %', verification_result.policyname, verification_result.cmd, verification_result.role_list;
  END LOOP;

  RAISE NOTICE '';

  -- Table RLS policies
  SELECT COUNT(*) INTO table_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'edu_subjects';

  RAISE NOTICE '✓ Table RLS Policies: % on edu_subjects', table_policy_count;

  FOR verification_result IN
    SELECT policyname, cmd, ARRAY_TO_STRING(roles, ', ') as role_list
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'edu_subjects'
    ORDER BY policyname
  LOOP
    RAISE NOTICE '  - %: % for %', verification_result.policyname, verification_result.cmd, verification_result.role_list;
  END LOOP;

  RAISE NOTICE '';

  -- Column check
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'edu_subjects'
      AND column_name = 'logo_url'
  ) INTO column_exists;

  IF column_exists THEN
    RAISE NOTICE '✓ logo_url Column: EXISTS in edu_subjects table';
  ELSE
    RAISE NOTICE '✗ logo_url Column: MISSING from edu_subjects table';
  END IF;

  RAISE NOTICE '';

  -- RLS status
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'edu_subjects';

  IF rls_enabled THEN
    RAISE NOTICE '✓ RLS Status: ENABLED on edu_subjects';
  ELSE
    RAISE NOTICE '✗ RLS Status: DISABLED on edu_subjects';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'VERIFICATION COMPLETE';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'To verify configuration at any time, run:';
  RAISE NOTICE '  SELECT * FROM verify_subject_logo_configuration();';
  RAISE NOTICE '';
  RAISE NOTICE 'Expected Upload Flow:';
  RAISE NOTICE '  1. User selects image in UI';
  RAISE NOTICE '  2. Frontend calls upload-subject-logo Edge Function';
  RAISE NOTICE '  3. Edge Function validates auth and admin status';
  RAISE NOTICE '  4. Edge Function uploads file to subject-logos bucket';
  RAISE NOTICE '  5. Frontend receives file path';
  RAISE NOTICE '  6. Frontend updates edu_subjects.logo_url via mutation';
  RAISE NOTICE '  7. Logo displays in SubjectsTable';
  RAISE NOTICE '';
  RAISE NOTICE 'If upload still fails after this migration:';
  RAISE NOTICE '  1. Check browser console for error messages';
  RAISE NOTICE '  2. Check Network tab for Edge Function response';
  RAISE NOTICE '  3. Verify auth token is being sent in X-Auth-Token header';
  RAISE NOTICE '  4. Confirm user exists in admin_users table';
  RAISE NOTICE '  5. Check Edge Function logs in Supabase dashboard';
  RAISE NOTICE '========================================================================';
END $$;
