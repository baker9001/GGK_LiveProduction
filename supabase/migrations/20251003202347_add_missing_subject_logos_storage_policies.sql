/*
  # Add Missing Storage Policies for subject-logos Bucket

  ## Current State
  The subject-logos bucket exists and is properly configured with:
  - Bucket ID: subject-logos
  - Public access: enabled
  - File size limit: 2MB
  - Allowed MIME types: image/jpeg, image/png, image/jpg, image/svg+xml
  
  However, only 2 out of 7 required policies are present:
  - ✓ Public can view subject logos (SELECT)
  - ✓ Service role full access to subject logos (ALL)
  
  Missing policies:
  - ✗ Authenticated users INSERT policy
  - ✗ Authenticated users UPDATE policy
  - ✗ Authenticated users DELETE policy
  - ✗ Anon users INSERT policy (custom auth support)
  - ✗ Anon users UPDATE policy (custom auth support)
  - ✗ Anon users DELETE policy (custom auth support)

  ## Solution
  Add the 6 missing storage policies to enable:
  1. Authenticated users to upload subject logos (INSERT)
  2. Authenticated users to update subject logos (UPDATE)
  3. Authenticated users to delete subject logos (DELETE)
  4. Anon users to upload subject logos (INSERT - custom auth)
  5. Anon users to update subject logos (UPDATE - custom auth)
  6. Anon users to delete subject logos (DELETE - custom auth)

  ## Security Model
  - Public users: Can view/download logos (SELECT) ✓ Already exists
  - Authenticated users: Can manage logos (INSERT/UPDATE/DELETE)
  - Anon users: Can manage logos (INSERT/UPDATE/DELETE - custom auth)
  - Service role: Full access for Edge Functions (ALL) ✓ Already exists

  ## Storage Operations Mapping
  - SELECT → enables download, list, getPublicUrl ✓ Already enabled
  - INSERT → enables upload, createSignedUrl
  - UPDATE → enables update, move, copy
  - DELETE → enables remove
*/

-- ============================================================================
-- Add Missing Authenticated User Policies
-- ============================================================================

-- Policy: Authenticated users can upload subject logos
CREATE POLICY "Authenticated users can upload subject logos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'subject-logos');

-- Policy: Authenticated users can update subject logos
CREATE POLICY "Authenticated users can update subject logos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'subject-logos')
  WITH CHECK (bucket_id = 'subject-logos');

-- Policy: Authenticated users can delete subject logos
CREATE POLICY "Authenticated users can delete subject logos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'subject-logos');

-- ============================================================================
-- Add Missing Anon User Policies (Custom Auth Support)
-- ============================================================================

-- Policy: Anon users can upload subject logos
CREATE POLICY "Anon users can upload subject logos"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'subject-logos');

-- Policy: Anon users can update subject logos
CREATE POLICY "Anon users can update subject logos"
  ON storage.objects
  FOR UPDATE
  TO anon
  USING (bucket_id = 'subject-logos')
  WITH CHECK (bucket_id = 'subject-logos');

-- Policy: Anon users can delete subject logos
CREATE POLICY "Anon users can delete subject logos"
  ON storage.objects
  FOR DELETE
  TO anon
  USING (bucket_id = 'subject-logos');

-- ============================================================================
-- Verification Report
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
  select_policy BOOLEAN;
  insert_auth_policy BOOLEAN;
  insert_anon_policy BOOLEAN;
  update_auth_policy BOOLEAN;
  update_anon_policy BOOLEAN;
  delete_auth_policy BOOLEAN;
  delete_anon_policy BOOLEAN;
  service_policy BOOLEAN;
BEGIN
  -- Count total policies for subject-logos
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE '%subject%logo%';

  -- Check each policy exists
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Public can view subject logos'
  ) INTO select_policy;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Authenticated users can upload subject logos'
  ) INTO insert_auth_policy;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Anon users can upload subject logos'
  ) INTO insert_anon_policy;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Authenticated users can update subject logos'
  ) INTO update_auth_policy;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Anon users can update subject logos'
  ) INTO update_anon_policy;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Authenticated users can delete subject logos'
  ) INTO delete_auth_policy;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Anon users can delete subject logos'
  ) INTO delete_anon_policy;

  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Service role full access to subject logos'
  ) INTO service_policy;

  -- Report results
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'SUBJECT-LOGOS STORAGE POLICIES VERIFICATION';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Total Policies: %', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Policy Status:';
  RAISE NOTICE '  ✓ SELECT (public): %', CASE WHEN select_policy THEN 'EXISTS' ELSE 'MISSING' END;
  RAISE NOTICE '  ✓ INSERT (authenticated): %', CASE WHEN insert_auth_policy THEN 'EXISTS' ELSE 'MISSING' END;
  RAISE NOTICE '  ✓ INSERT (anon): %', CASE WHEN insert_anon_policy THEN 'EXISTS' ELSE 'MISSING' END;
  RAISE NOTICE '  ✓ UPDATE (authenticated): %', CASE WHEN update_auth_policy THEN 'EXISTS' ELSE 'MISSING' END;
  RAISE NOTICE '  ✓ UPDATE (anon): %', CASE WHEN update_anon_policy THEN 'EXISTS' ELSE 'MISSING' END;
  RAISE NOTICE '  ✓ DELETE (authenticated): %', CASE WHEN delete_auth_policy THEN 'EXISTS' ELSE 'MISSING' END;
  RAISE NOTICE '  ✓ DELETE (anon): %', CASE WHEN delete_anon_policy THEN 'EXISTS' ELSE 'MISSING' END;
  RAISE NOTICE '  ✓ ALL (service_role): %', CASE WHEN service_policy THEN 'EXISTS' ELSE 'MISSING' END;
  RAISE NOTICE '';
  RAISE NOTICE 'Enabled Operations:';
  RAISE NOTICE '  → Public users: View/download subject logos';
  RAISE NOTICE '  → Authenticated users: Upload, update, delete subject logos';
  RAISE NOTICE '  → Anon users: Upload, update, delete subject logos (custom auth)';
  RAISE NOTICE '  → Edge Functions: Full access via service_role';
  RAISE NOTICE '';
  
  IF policy_count >= 8 THEN
    RAISE NOTICE 'Status: ✓ All storage policies successfully created';
    RAISE NOTICE '        ✓ Subject logo uploads are now fully functional';
  ELSE
    RAISE WARNING 'Status: Some policies may be missing. Expected 8, found %', policy_count;
  END IF;
  
  RAISE NOTICE '========================================================================';
END $$;
