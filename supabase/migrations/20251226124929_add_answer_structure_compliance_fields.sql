/*
  # Add Answer Structure Requirements Guide v1.0 Compliance Fields

  ## Summary
  This migration adds fields required for full compliance with Answer Structure Requirements Guide v1.0.

  ## Changes

  ### 1. Add marking_components to question_correct_answers
  - Adds `marking_components` jsonb column for component-based marking
  - Enables multi-step answer marking with individual component marks
  - Example: [{component: "mole_calculations", marks: 1}, {component: "empirical_formula", marks: 1}]

  ### 2. Add alternative_type to sub_questions table
  - Adds `alternative_type` text column for part/subpart level alternative type indicators
  - Required per guide for all answer-containing parts/subparts
  - Values: 'standalone', 'one_required', 'all_required', 'structure_function_pair', 'two_required', 'three_required'

  ### 3. Create indexes for performance
  - Index on marking_components for faster JSONB queries
  - Index on alternative_type for filtering

  ## Security
  - RLS policies inherited from existing table policies
  - No new security changes needed
*/

-- =====================================================
-- Add marking_components to question_correct_answers
-- =====================================================

-- Add marking_components column (stores array of marking component objects)
ALTER TABLE question_correct_answers
ADD COLUMN IF NOT EXISTS marking_components jsonb DEFAULT '[]'::jsonb;

-- Add comment explaining the column
COMMENT ON COLUMN question_correct_answers.marking_components IS
'Array of marking components for multi-step answers. Each component has: component (string), marks (number), description (optional string). Example: [{"component": "mole_calculations", "marks": 1, "description": "Calculate moles correctly"}, {"component": "empirical_formula", "marks": 1, "description": "Derive correct empirical formula"}]';

-- Create GIN index on marking_components for faster JSONB queries
CREATE INDEX IF NOT EXISTS idx_question_correct_answers_marking_components
ON question_correct_answers USING gin(marking_components);

-- =====================================================
-- Add alternative_type to sub_questions (parts/subparts)
-- =====================================================

-- Check if sub_questions table exists and add column
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sub_questions') THEN
    -- Add alternative_type column
    ALTER TABLE sub_questions
    ADD COLUMN IF NOT EXISTS alternative_type text;

    -- Add comment explaining the column
    COMMENT ON COLUMN sub_questions.alternative_type IS
    'Part/subpart level alternative type indicator. Required per Answer Structure Requirements Guide v1.0. Values: standalone, one_required, all_required, structure_function_pair, two_required, three_required';

    -- Create index on alternative_type for faster filtering
    CREATE INDEX IF NOT EXISTS idx_sub_questions_alternative_type
    ON sub_questions(alternative_type) WHERE alternative_type IS NOT NULL;
  END IF;
END $$;

-- =====================================================
-- Add constraint to validate alternative_type values
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sub_questions') THEN
    -- Add check constraint for valid alternative_type values
    ALTER TABLE sub_questions
    DROP CONSTRAINT IF EXISTS sub_questions_alternative_type_check;

    ALTER TABLE sub_questions
    ADD CONSTRAINT sub_questions_alternative_type_check
    CHECK (
      alternative_type IS NULL OR
      alternative_type IN (
        'standalone',
        'one_required',
        'all_required',
        'structure_function_pair',
        'two_required',
        'three_required'
      )
    );
  END IF;
END $$;

-- =====================================================
-- Update statistics for query planner
-- =====================================================

ANALYZE question_correct_answers;

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sub_questions') THEN
    ANALYZE sub_questions;
  END IF;
END $$;
