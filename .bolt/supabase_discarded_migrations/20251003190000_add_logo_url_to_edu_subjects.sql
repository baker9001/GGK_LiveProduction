/*
  # Add logo_url column to edu_subjects table

  1. Changes
    - Add logo_url column to edu_subjects table to store subject logo image paths
    - Column stores the path to images in the subject-logos storage bucket
    - Allows null values as logos are optional

  2. Notes
    - Images will be stored in Supabase Storage bucket: subject-logos
    - The bucket should be configured as public for easy access
    - Frontend will use ImageUpload component for logo management
*/

-- Add logo_url column to edu_subjects if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'edu_subjects'
    AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE edu_subjects ADD COLUMN logo_url text;
  END IF;
END $$;

-- Add helpful comment to the column
COMMENT ON COLUMN edu_subjects.logo_url IS 'Path to subject logo image stored in subject-logos bucket';
