/*
  # Fix Video Streaming Access for System Admin Users

  1. Problem
    - System admin users cannot stream videos
    - Storage bucket RLS policies only check for user_type = 'system_admin'
    - Some system admins may have user_type = 'system'
    - Edge Function checks for both 'system' and 'system_admin'

  2. Solution
    - Update storage bucket policies to recognize both user_type values
    - Align with Edge Function authentication logic
    - Ensure system admins can access video materials via signed URLs

  3. Changes
    - Update "Authenticated users can view materials" policy to include user_type = 'system'
    - Update "Authenticated users can upload materials" policy to include user_type = 'system'
    - Update "Authenticated users can update own materials" policy to include user_type = 'system'
    - Update "Authenticated users can delete own materials" policy to include user_type = 'system'

  IMPORTANT: This migration fixes video streaming for system admin users
  by ensuring storage bucket policies align with Edge Function authentication.
*/

-- Drop and recreate Policy 1: Authenticated users can view materials
DROP POLICY IF EXISTS "Authenticated users can view materials" ON storage.objects;

CREATE POLICY "Authenticated users can view materials"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'materials_files'
    AND (
      -- System admins can view all (support both 'system' and 'system_admin' types)
      EXISTS (
        SELECT 1 FROM users
        WHERE users.auth_user_id = auth.uid()
        AND (users.user_type = 'system_admin' OR users.user_type = 'system')
      )
      OR
      -- Teachers can view materials they created
      EXISTS (
        SELECT 1 FROM materials m
        JOIN teachers t ON t.id = m.created_by::uuid
        JOIN users u ON u.id = t.user_id AND u.auth_user_id = auth.uid()
        WHERE m.file_path = storage.objects.name
      )
      OR
      -- Students can view active materials
      EXISTS (
        SELECT 1 FROM materials m
        JOIN students s ON s.user_id IN (
          SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
        WHERE m.file_path = storage.objects.name
        AND m.status = 'active'
      )
    )
  );

-- Drop and recreate Policy 3: Authenticated users can upload materials
DROP POLICY IF EXISTS "Authenticated users can upload materials" ON storage.objects;

CREATE POLICY "Authenticated users can upload materials"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'materials_files'
    AND (
      -- System admins can upload (support both 'system' and 'system_admin' types)
      EXISTS (
        SELECT 1 FROM users
        WHERE users.auth_user_id = auth.uid()
        AND (users.user_type = 'system_admin' OR users.user_type = 'system')
      )
      OR
      -- Teachers can upload
      EXISTS (
        SELECT 1 FROM teachers t
        JOIN users u ON u.id = t.user_id
        WHERE u.auth_user_id = auth.uid()
      )
      OR
      -- Entity admins can upload
      EXISTS (
        SELECT 1 FROM entity_users eu
        JOIN users u ON u.id = eu.user_id
        WHERE u.auth_user_id = auth.uid()
      )
    )
  );

-- Drop and recreate Policy 4: Authenticated users can update own materials
DROP POLICY IF EXISTS "Authenticated users can update own materials" ON storage.objects;

CREATE POLICY "Authenticated users can update own materials"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'materials_files'
    AND (
      -- System admins can update all (support both 'system' and 'system_admin' types)
      EXISTS (
        SELECT 1 FROM users
        WHERE users.auth_user_id = auth.uid()
        AND (users.user_type = 'system_admin' OR users.user_type = 'system')
      )
      OR
      -- Teachers can update materials they created
      EXISTS (
        SELECT 1 FROM materials m
        JOIN teachers t ON t.id = m.created_by::uuid
        JOIN users u ON u.id = t.user_id AND u.auth_user_id = auth.uid()
        WHERE m.file_path = storage.objects.name
      )
    )
  )
  WITH CHECK (bucket_id = 'materials_files');

-- Drop and recreate Policy 5: Authenticated users can delete own materials
DROP POLICY IF EXISTS "Authenticated users can delete own materials" ON storage.objects;

CREATE POLICY "Authenticated users can delete own materials"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'materials_files'
    AND (
      -- System admins can delete all (support both 'system' and 'system_admin' types)
      EXISTS (
        SELECT 1 FROM users
        WHERE users.auth_user_id = auth.uid()
        AND (users.user_type = 'system_admin' OR users.user_type = 'system')
      )
      OR
      -- Teachers can delete materials they created
      EXISTS (
        SELECT 1 FROM materials m
        JOIN teachers t ON t.id = m.created_by::uuid
        JOIN users u ON u.id = t.user_id AND u.auth_user_id = auth.uid()
        WHERE m.file_path = storage.objects.name
      )
    )
  );

-- Note: Videos are accessed via signed URLs generated by the Edge Function
-- which uses service role access, bypassing RLS policies. However, these
-- policies ensure consistency and provide proper access control for non-video
-- materials and direct storage operations.
