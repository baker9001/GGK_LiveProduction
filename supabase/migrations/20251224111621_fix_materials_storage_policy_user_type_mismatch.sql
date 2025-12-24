/*
  # Fix Materials Storage Policy - User Type Mismatch

  ## Problem
  The storage policies for `materials_files` bucket check for `users.user_type = 'system_admin'`
  but the actual value stored in the users table is `users.user_type = 'system'`.
  This prevents system admins from uploading materials.

  ## Changes
  1. Drop existing materials_files storage policies
  2. Recreate them with correct user_type check (`system` instead of `system_admin`)

  ## Affected Policies
  - "Admins and teachers can upload materials" (INSERT)
  - "Admins and teachers can view materials" (SELECT)
  - "Admins and creators can update materials" (UPDATE)
  - "Admins and creators can delete materials" (DELETE)

  ## Security
  - Maintains same access patterns as before
  - System admins (user_type = 'system') can upload, view, update, delete
  - Entity users (teachers) can upload and view
  - Creators can update/delete their own materials
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins and teachers can upload materials" ON storage.objects;
DROP POLICY IF EXISTS "Admins and teachers can view materials" ON storage.objects;
DROP POLICY IF EXISTS "Admins and creators can update materials" ON storage.objects;
DROP POLICY IF EXISTS "Admins and creators can delete materials" ON storage.objects;

-- Recreate INSERT policy with correct user_type
CREATE POLICY "Admins and teachers can upload materials"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'materials_files'
  AND (
    -- System admins (user_type = 'system') can upload
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.user_type = 'system'
    )
    OR
    -- Active entity users (teachers) can upload
    EXISTS (
      SELECT 1 FROM entity_users eu
      JOIN users u ON u.id = eu.user_id
      WHERE u.auth_user_id = auth.uid()
      AND eu.is_active = true
    )
  )
);

-- Recreate SELECT policy with correct user_type
CREATE POLICY "Admins and teachers can view materials"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'materials_files'
  AND (
    -- System admins can view all
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.user_type = 'system'
    )
    OR
    -- Active entity users can view
    EXISTS (
      SELECT 1 FROM entity_users eu
      JOIN users u ON u.id = eu.user_id
      WHERE u.auth_user_id = auth.uid()
      AND eu.is_active = true
    )
    OR
    -- Material creators can view their materials
    EXISTS (
      SELECT 1 FROM materials m
      JOIN entity_users eu ON eu.id = m.teacher_id
      JOIN users u ON u.id = eu.user_id
      WHERE u.auth_user_id = auth.uid()
      AND m.file_path = objects.name
    )
    OR
    -- Students can view active materials
    EXISTS (
      SELECT 1 FROM materials m
      JOIN students s ON s.user_id IN (
        SELECT users.id FROM users WHERE users.auth_user_id = auth.uid()
      )
      WHERE m.file_path = objects.name
      AND m.status = 'active'
    )
  )
);

-- Recreate UPDATE policy with correct user_type
CREATE POLICY "Admins and creators can update materials"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'materials_files'
  AND (
    -- System admins can update all
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.user_type = 'system'
    )
    OR
    -- Creators can update their own
    EXISTS (
      SELECT 1 FROM materials m
      JOIN entity_users eu ON eu.id = m.teacher_id
      JOIN users u ON u.id = eu.user_id
      WHERE u.auth_user_id = auth.uid()
      AND m.file_path = objects.name
    )
  )
)
WITH CHECK (bucket_id = 'materials_files');

-- Recreate DELETE policy with correct user_type
CREATE POLICY "Admins and creators can delete materials"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'materials_files'
  AND (
    -- System admins can delete all
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.user_type = 'system'
    )
    OR
    -- Creators can delete their own
    EXISTS (
      SELECT 1 FROM materials m
      JOIN entity_users eu ON eu.id = m.teacher_id
      JOIN users u ON u.id = eu.user_id
      WHERE u.auth_user_id = auth.uid()
      AND m.file_path = objects.name
    )
  )
);
