/*
  # Fix Missing figure_required Column
  
  ## Problem
  Migration 20251012180000_add_figure_required_toggle.sql exists but column not present in database.
  This critical column controls whether figure attachments are mandatory for questions.
  
  ## Solution
  Re-apply the column addition with proper checks and indexes.
  
  ## Changes
  1. Add figure_required to questions_master_admin (if not exists)
  2. Add figure_required to sub_questions (if not exists)
  3. Create indexes for performance
  4. Add helpful comments
*/

-- Add figure_required to questions_master_admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'questions_master_admin'
      AND column_name = 'figure_required'
  ) THEN
    ALTER TABLE questions_master_admin
      ADD COLUMN figure_required boolean DEFAULT true NOT NULL;
    
    RAISE NOTICE 'Added figure_required column to questions_master_admin';
  ELSE
    RAISE NOTICE 'figure_required column already exists in questions_master_admin';
  END IF;
END $$;

-- Add figure_required to sub_questions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sub_questions'
      AND column_name = 'figure_required'
  ) THEN
    ALTER TABLE sub_questions
      ADD COLUMN figure_required boolean DEFAULT true NOT NULL;
    
    RAISE NOTICE 'Added figure_required column to sub_questions';
  ELSE
    RAISE NOTICE 'figure_required column already exists in sub_questions';
  END IF;
END $$;

-- Create indexes for filtering questions by figure requirement
CREATE INDEX IF NOT EXISTS idx_questions_master_admin_figure_required
  ON questions_master_admin(figure_required)
  WHERE figure_required = true;

CREATE INDEX IF NOT EXISTS idx_sub_questions_figure_required
  ON sub_questions(figure_required)
  WHERE figure_required = true;

-- Add comments to document purpose
COMMENT ON COLUMN questions_master_admin.figure_required IS 
'Whether a figure attachment is mandatory for this question. Can be toggled by users during paper setup. Auto-detected during import but user-overridable.';

COMMENT ON COLUMN sub_questions.figure_required IS 
'Whether a figure attachment is mandatory for this sub-question. Can be toggled by users during paper setup. Auto-detected during import but user-overridable.';
