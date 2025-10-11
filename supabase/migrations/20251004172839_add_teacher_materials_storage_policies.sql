/*
  # Add Storage Policies for Teacher Materials

  ## Overview
  This migration creates storage bucket policies for the `materials_files_teachers` bucket
  to allow teachers to upload school-specific materials while maintaining security.

  ## Changes
  1. Create storage bucket `materials_files_teachers` if not exists
  2. Add storage policies for teachers to upload materials for their schools
  3. Add storage policies for students to download materials they have access to
  4. Add storage policies for system admins to have full access
*/

-- ============================================================================
-- STEP 1: Create storage bucket if not exists
-- ============================================================================

-- Insert bucket if it doesn't exist (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'materials_files_teachers',
  'materials_files_teachers',
  true,
  524288000, -- 500MB limit
  ARRAY[
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac',
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/epub+zip', 'application/x-mobipocket-ebook', 'application/vnd.amazon.ebook',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'text/plain', 'text/csv', 'text/markdown', 'text/html'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 2: Storage policies for system admins (full access)
-- ============================================================================

CREATE POLICY "System admins can upload teacher materials"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'materials_files_teachers'
    AND EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "System admins can update teacher materials"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'materials_files_teachers'
    AND EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "System admins can delete teacher materials"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'materials_files_teachers'
    AND EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- ============================================================================
-- STEP 3: Storage policies for teachers (school-specific access)
-- ============================================================================

CREATE POLICY "Teachers can upload materials for their school"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'materials_files_teachers'
    AND EXISTS (
      SELECT 1 FROM entity_users eu
      WHERE eu.user_id = auth.uid()
        AND eu.is_active = true
        -- Path should start with school_id
        AND storage.foldername(name)[1] IN (
          SELECT CAST(eus.school_id AS text)
          FROM entity_user_schools eus
          WHERE eus.entity_user_id = eu.id
        )
    )
  );

CREATE POLICY "Teachers can update their own school materials"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'materials_files_teachers'
    AND EXISTS (
      SELECT 1 FROM entity_users eu
      WHERE eu.user_id = auth.uid()
        AND eu.is_active = true
        AND storage.foldername(name)[1] IN (
          SELECT CAST(eus.school_id AS text)
          FROM entity_user_schools eus
          WHERE eus.entity_user_id = eu.id
        )
    )
  );

CREATE POLICY "Teachers can delete their own school materials"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'materials_files_teachers'
    AND EXISTS (
      SELECT 1 FROM entity_users eu
      WHERE eu.user_id = auth.uid()
        AND eu.is_active = true
        AND storage.foldername(name)[1] IN (
          SELECT CAST(eus.school_id AS text)
          FROM entity_user_schools eus
          WHERE eus.entity_user_id = eu.id
        )
    )
  );

-- ============================================================================
-- STEP 4: Storage policies for students (read-only access)
-- ============================================================================

CREATE POLICY "Students can download materials from their school"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'materials_files_teachers'
    AND EXISTS (
      SELECT 1 FROM students s
      WHERE s.user_id = auth.uid()
        AND s.is_active = true
        -- Check if file path starts with student's school_id
        AND storage.foldername(name)[1] = CAST(s.school_id AS text)
    )
  );

-- ============================================================================
-- STEP 5: Public read access for materials (optional - if needed)
-- ============================================================================

-- Note: Since the bucket is marked as public, files are accessible via public URLs
-- However, we still enforce RLS at the database level for the materials table records
-- This allows the storage URLs to work while the materials metadata access is controlled

-- If you want to restrict storage-level access further, you can make the bucket private
-- and generate signed URLs programmatically in the application

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON POLICY "Teachers can upload materials for their school" ON storage.objects
  IS 'Allows teachers to upload files to folders matching their school_id in the materials_files_teachers bucket';

COMMENT ON POLICY "Students can download materials from their school" ON storage.objects
  IS 'Allows students to download files from their school folder, materials table RLS further restricts based on licenses';
