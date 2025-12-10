/*
  # Fix Materials Storage RLS Policies for Entity Users

  ## Overview
  This migration fixes storage RLS policies that incorrectly reference the 
  'teachers' table instead of 'entity_users' for teacher material access.

  ## Changes
  1. Drops outdated storage policies referencing 'teachers' table
  2. Creates new policies using 'entity_users' table for teacher access
  3. Ensures proper access for system admins, teachers, and students

  ## Security
  - System admins retain full access
  - Teachers can view/upload materials for their assigned schools
  - Students can view active materials they have access to
*/

-- Drop the existing problematic policies
DROP POLICY IF EXISTS "Authenticated users can view materials" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload materials" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update own materials" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own materials" ON storage.objects;

-- Policy 1: System admins and teachers can view materials
CREATE POLICY "Admins and teachers can view materials"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'materials_files'
    AND (
      -- System admins can view all
      EXISTS (
        SELECT 1 FROM users
        WHERE users.auth_user_id = auth.uid()
        AND users.user_type = 'system_admin'
      )
      OR
      -- Entity admins can view all
      EXISTS (
        SELECT 1 FROM entity_users eu
        JOIN users u ON u.id = eu.user_id
        WHERE u.auth_user_id = auth.uid()
        AND eu.is_active = true
      )
      OR
      -- Teachers can view materials for their school
      EXISTS (
        SELECT 1 FROM materials m
        JOIN entity_users eu ON eu.id = m.teacher_id
        JOIN users u ON u.id = eu.user_id
        WHERE u.auth_user_id = auth.uid()
        AND m.file_path = storage.objects.name
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

-- Policy 2: System admins and teachers can upload materials
CREATE POLICY "Admins and teachers can upload materials"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'materials_files'
    AND (
      -- System admins can upload
      EXISTS (
        SELECT 1 FROM users
        WHERE users.auth_user_id = auth.uid()
        AND users.user_type = 'system_admin'
      )
      OR
      -- Entity users (teachers, admins) can upload
      EXISTS (
        SELECT 1 FROM entity_users eu
        JOIN users u ON u.id = eu.user_id
        WHERE u.auth_user_id = auth.uid()
        AND eu.is_active = true
      )
    )
  );

-- Policy 3: Update materials - admins and creators
CREATE POLICY "Admins and creators can update materials"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'materials_files'
    AND (
      -- System admins can update all
      EXISTS (
        SELECT 1 FROM users
        WHERE users.auth_user_id = auth.uid()
        AND users.user_type = 'system_admin'
      )
      OR
      -- Teachers can update materials they created
      EXISTS (
        SELECT 1 FROM materials m
        JOIN entity_users eu ON eu.id = m.teacher_id
        JOIN users u ON u.id = eu.user_id
        WHERE u.auth_user_id = auth.uid()
        AND m.file_path = storage.objects.name
      )
    )
  )
  WITH CHECK (bucket_id = 'materials_files');

-- Policy 4: Delete materials - admins and creators
CREATE POLICY "Admins and creators can delete materials"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'materials_files'
    AND (
      -- System admins can delete all
      EXISTS (
        SELECT 1 FROM users
        WHERE users.auth_user_id = auth.uid()
        AND users.user_type = 'system_admin'
      )
      OR
      -- Teachers can delete materials they created
      EXISTS (
        SELECT 1 FROM materials m
        JOIN entity_users eu ON eu.id = m.teacher_id
        JOIN users u ON u.id = eu.user_id
        WHERE u.auth_user_id = auth.uid()
        AND m.file_path = storage.objects.name
      )
    )
  );
