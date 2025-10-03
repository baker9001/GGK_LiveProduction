/*
  # Add logo_url Column to edu_subjects Table

  ## Problem
  The edu_subjects table is missing the logo_url column, preventing subject logos
  from being saved to the database. The original migration file exists but was never
  applied to the database.

  ## Changes
  1. Add logo_url column to edu_subjects table
     - Column type: TEXT (stores file path in storage bucket)
     - Nullable: YES (logos are optional)
     - No default value (NULL by default)

  2. Add column comment for documentation
     - Describes the column's purpose and storage location

  3. Verification
     - Query information_schema to confirm column was created
     - Log success message with column details

  ## Security
  - RLS policies already exist for edu_subjects table (applied in previous migration)
  - System admins can update logo_url via existing UPDATE policies
  - Storage policies for subject-logos bucket handle file upload security

  ## Related Files
  - Storage bucket: subject-logos
  - Edge Function: upload-subject-logo
  - Frontend component: SubjectsTable.tsx, ImageUpload.tsx
*/

-- ============================================================================
-- STEP 1: Add logo_url Column to edu_subjects Table
-- ============================================================================

-- Add logo_url column if it doesn't exist
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

-- ============================================================================
-- STEP 2: Add Column Documentation
-- ============================================================================

-- Add helpful comment to the column
COMMENT ON COLUMN edu_subjects.logo_url IS 'Path to subject logo image stored in subject-logos storage bucket. Example: 550e8400-e29b-41d4-a716-446655440000.png';

-- ============================================================================
-- STEP 3: Verification and Reporting
-- ============================================================================

DO $$
DECLARE
  column_exists BOOLEAN;
  column_type TEXT;
  column_nullable TEXT;
  table_row_count INTEGER;
BEGIN
  -- Check if column exists and get its properties
  SELECT 
    TRUE,
    data_type,
    is_nullable
  INTO 
    column_exists,
    column_type,
    column_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'edu_subjects'
    AND column_name = 'logo_url';

  -- Count existing records
  SELECT COUNT(*) INTO table_row_count FROM edu_subjects;

  -- Report results
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'EDU_SUBJECTS TABLE - LOGO_URL COLUMN VERIFICATION';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'Column exists: %', COALESCE(column_exists::text, 'false');
  RAISE NOTICE 'Column type: %', COALESCE(column_type, 'N/A');
  RAISE NOTICE 'Nullable: %', COALESCE(column_nullable, 'N/A');
  RAISE NOTICE 'Existing records: %', table_row_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Status: ✓ logo_url column is ready for use';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Upload subject logos through the frontend';
  RAISE NOTICE '  2. Logo files will be stored in subject-logos storage bucket';
  RAISE NOTICE '  3. Logo paths will be saved in edu_subjects.logo_url column';
  RAISE NOTICE '  4. Logos will display in the SubjectsTable component';
  RAISE NOTICE '========================================================================';
END $$;
