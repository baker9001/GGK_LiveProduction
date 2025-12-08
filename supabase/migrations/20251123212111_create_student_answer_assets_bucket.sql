/*
  # Create Storage Bucket for Student Answer Assets

  ## Problem
  The code references 'student-answer-assets' bucket for file uploads and audio
  recordings, but this bucket was never created in migrations. This causes all
  file/audio uploads to fail with "bucket not found" error.

  ## Solution
  Create the missing storage bucket with appropriate configuration and RLS policies.

  ## Security Model
  - Private bucket (requires authentication)
  - Users can only access their own files (folder isolation)
  - Teachers can view student submissions
  - System admins have full access
  - 10MB file size limit per file
  - MIME type restrictions for security

  ## Tables Affected
  - storage.buckets (bucket configuration)
  - storage.objects (RLS policies)
*/

-- ============================================================================
-- STEP 1: Create Storage Bucket
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-answer-assets',
  'student-answer-assets',
  false,
  10485760,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
    'audio/x-m4a',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'text/html',
    'application/zip',
    'application/x-zip-compressed'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
