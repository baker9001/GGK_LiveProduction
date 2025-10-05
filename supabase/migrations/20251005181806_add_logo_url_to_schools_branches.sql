/*
  # Add logo_url to schools and branches tables

  1. Changes
    - Add logo_url column to schools table for storing school logo paths
    - Add logo_url column to branches table for storing branch logo paths
    - Both columns store paths to images in respective storage buckets

  2. Storage Buckets
    - school-logos bucket already exists (created in previous migrations)
    - branch-logos bucket already exists (created in previous migrations)

  3. Security
    - No RLS policy changes needed
    - Existing policies on schools and branches tables apply to the new columns
    - Logo uploads/deletes should go through Edge Functions for security

  4. Notes
    - Logo paths can be either storage paths (e.g., uuid.png) or full URLs
    - Use getPublicUrl helper from storageHelpers.ts to generate display URLs
    - Follows same pattern as edu_subjects.logo_url
*/

-- Add logo_url column to schools table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'schools'
    AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE schools ADD COLUMN logo_url TEXT;
    RAISE NOTICE 'Added logo_url column to schools table';
  ELSE
    RAISE NOTICE 'logo_url column already exists in schools table';
  END IF;
END $$;

-- Add logo_url column to branches table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'branches'
    AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE branches ADD COLUMN logo_url TEXT;
    RAISE NOTICE 'Added logo_url column to branches table';
  ELSE
    RAISE NOTICE 'logo_url column already exists in branches table';
  END IF;
END $$;

-- Add helpful comments
COMMENT ON COLUMN schools.logo_url IS 'Path to school logo image stored in school-logos storage bucket. Can be either a storage path (e.g., uuid.png) or a full URL.';
COMMENT ON COLUMN branches.logo_url IS 'Path to branch logo image stored in branch-logos storage bucket. Can be either a storage path (e.g., uuid.png) or a full URL.';

-- Verification query (will be logged in migration output)
DO $$
DECLARE
  schools_logo_exists BOOLEAN;
  branches_logo_exists BOOLEAN;
BEGIN
  -- Check schools.logo_url
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'schools'
    AND column_name = 'logo_url'
  ) INTO schools_logo_exists;

  -- Check branches.logo_url
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'branches'
    AND column_name = 'logo_url'
  ) INTO branches_logo_exists;

  IF schools_logo_exists THEN
    RAISE NOTICE '✓ logo_url column exists in schools table';
  ELSE
    RAISE NOTICE '✗ logo_url column missing from schools table';
  END IF;

  IF branches_logo_exists THEN
    RAISE NOTICE '✓ logo_url column exists in branches table';
  ELSE
    RAISE NOTICE '✗ logo_url column missing from branches table';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'Logo URL columns are ready for use!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. School logos can be uploaded via school management interface';
  RAISE NOTICE '  2. Branch logos can be uploaded via branch management interface';
  RAISE NOTICE '  3. Use getPublicUrl("school-logos", path) to display school logos';
  RAISE NOTICE '  4. Use getPublicUrl("branch-logos", path) to display branch logos';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;