/*
  # Add Figure Required Toggle Support

  ## Overview
  Add `figure_required` column to questions to allow users to control whether
  a figure attachment is mandatory for each question during paper setup.

  ## Changes
  1. New Columns
     - `questions_master_admin.figure_required` (boolean, default true)
       - Controls whether a figure attachment is mandatory for this question
       - Defaults to true to maintain existing behavior

     - `sub_questions.figure_required` (boolean, default true)
       - Controls whether a figure attachment is mandatory for sub-questions
       - Defaults to true to maintain existing behavior

  2. Benefits
     - Allows override of auto-detected figure requirements
     - Gives users fine-grained control over attachment validation
     - Maintains backward compatibility (defaults to true)

  ## Notes
  - This column works in conjunction with auto-detection logic
  - Users can toggle this off in the Questions Review stage
  - Does not affect already imported questions
*/

-- Add figure_required to questions_master_admin
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions_master_admin' AND column_name = 'figure_required'
  ) THEN
    ALTER TABLE questions_master_admin
      ADD COLUMN figure_required boolean DEFAULT true NOT NULL;

    COMMENT ON COLUMN questions_master_admin.figure_required IS 'Whether a figure attachment is mandatory for this question. Can be toggled by users during paper setup.';
  END IF;
END $$;

-- Add figure_required to sub_questions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sub_questions' AND column_name = 'figure_required'
  ) THEN
    ALTER TABLE sub_questions
      ADD COLUMN figure_required boolean DEFAULT true NOT NULL;

    COMMENT ON COLUMN sub_questions.figure_required IS 'Whether a figure attachment is mandatory for this sub-question. Can be toggled by users during paper setup.';
  END IF;
END $$;

-- Create index for filtering questions by figure requirement
CREATE INDEX IF NOT EXISTS idx_questions_master_admin_figure_required
  ON questions_master_admin(figure_required)
  WHERE figure_required = true;

CREATE INDEX IF NOT EXISTS idx_sub_questions_figure_required
  ON sub_questions(figure_required)
  WHERE figure_required = true;
