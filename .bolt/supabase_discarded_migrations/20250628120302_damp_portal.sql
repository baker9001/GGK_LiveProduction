-- Add a migration to map subject to edu_subjects
DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  -- Check if subject_code column exists in papers_setup table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'papers_setup' AND column_name = 'subject_code'
  ) INTO column_exists;
  
  -- If subject_code column exists, we need to migrate data to subject_id
  IF column_exists THEN
    -- First, ensure all subject_codes have corresponding edu_subjects
    INSERT INTO edu_subjects (name, code, status)
    SELECT DISTINCT 
      COALESCE(
        -- Try to extract subject name from paper_code (e.g., "Physics" from "Physics/0625/41")
        CASE WHEN position('/' IN paper_code) > 1 
             THEN substring(paper_code from 1 for position('/' IN paper_code) - 1)
             ELSE subject_code END,
        -- Fallback to subject_code if no slash in paper_code
        subject_code
      ),
      subject_code, 
      'active'
    FROM papers_setup
    WHERE subject_code IS NOT NULL AND subject_code != ''
    AND NOT EXISTS (
      SELECT 1 FROM edu_subjects WHERE code = papers_setup.subject_code
    );
    
    -- Update papers_setup to use subject_id based on subject_code
    UPDATE papers_setup ps
    SET subject_id = es.id
    FROM edu_subjects es
    WHERE ps.subject_code = es.code
    AND ps.subject_id IS NULL;
    
    -- Now we can drop the subject_code column if all records have been migrated
    IF NOT EXISTS (
      SELECT 1 FROM papers_setup WHERE subject_id IS NULL AND subject_code IS NOT NULL
    ) THEN
      ALTER TABLE papers_setup DROP COLUMN IF EXISTS subject_code;
    END IF;
  END IF;
END $$;