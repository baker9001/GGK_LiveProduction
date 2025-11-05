/*
  # Add Missing Fields to question_correct_answers Table

  ## Summary
  This migration adds critical fields to the question_correct_answers table that are required
  for proper handling of alternative answers, linked answers, and marking criteria.

  ## New Columns Added
  1. **alternative_type** (text) - Defines the type of alternative answer
     - Values: 'one_required', 'all_required', 'structure_function_pair', 'standalone', etc.
     - Default: 'standalone'
  
  2. **linked_alternatives** (jsonb) - Array of alternative_ids that are linked to this answer
     - Stores relationships between alternative answers
     - Default: '[]'::jsonb (empty array)
  
  3. **marking_criteria** (text) - Specific marking instructions for this answer
     - Stores detailed marking notes from mark schemes
  
  4. **working** (text) - Shows the working/calculation steps for the answer
     - Used for calculation-type questions
  
  5. **accepts_equivalent_phrasing** (boolean) - Whether equivalent phrasing is accepted
     - Default: false
  
  6. **accepts_reverse_argument** (boolean) - Whether reverse argument is acceptable
     - Default: false
  
  7. **error_carried_forward** (boolean) - Whether ECF (error carried forward) applies
     - Default: false
  
  8. **acceptable_variations** (jsonb) - Array of acceptable answer variations
     - Default: '[]'::jsonb (empty array)
  
  9. **unit** (text) - The unit for numerical answers (e.g., 'cm', 'kg', '%')

  ## Impact
  - Enables proper storage of complex marking schemes from Cambridge/Edexcel papers
  - Fixes data loss issue where alternative_type and linked_alternatives were being dropped
  - Allows proper handling of "one_required" answers (any one of multiple acceptable answers)
  - Supports sophisticated auto-marking with ECF and equivalent phrasing
*/

-- Add alternative_type column
ALTER TABLE question_correct_answers 
ADD COLUMN IF NOT EXISTS alternative_type text DEFAULT 'standalone';

-- Add linked_alternatives column (stores array of alternative_ids)
ALTER TABLE question_correct_answers 
ADD COLUMN IF NOT EXISTS linked_alternatives jsonb DEFAULT '[]'::jsonb;

-- Add marking_criteria column
ALTER TABLE question_correct_answers 
ADD COLUMN IF NOT EXISTS marking_criteria text;

-- Add working column (for calculation steps)
ALTER TABLE question_correct_answers 
ADD COLUMN IF NOT EXISTS working text;

-- Add accepts_equivalent_phrasing column
ALTER TABLE question_correct_answers 
ADD COLUMN IF NOT EXISTS accepts_equivalent_phrasing boolean DEFAULT false;

-- Add accepts_reverse_argument column
ALTER TABLE question_correct_answers 
ADD COLUMN IF NOT EXISTS accepts_reverse_argument boolean DEFAULT false;

-- Add error_carried_forward column
ALTER TABLE question_correct_answers 
ADD COLUMN IF NOT EXISTS error_carried_forward boolean DEFAULT false;

-- Add acceptable_variations column (stores array of variation strings)
ALTER TABLE question_correct_answers 
ADD COLUMN IF NOT EXISTS acceptable_variations jsonb DEFAULT '[]'::jsonb;

-- Add unit column
ALTER TABLE question_correct_answers 
ADD COLUMN IF NOT EXISTS unit text;

-- Create index on alternative_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_question_correct_answers_alternative_type 
ON question_correct_answers(alternative_type);

-- Create GIN index on linked_alternatives for faster JSONB queries
CREATE INDEX IF NOT EXISTS idx_question_correct_answers_linked_alternatives 
ON question_correct_answers USING gin(linked_alternatives);

-- Create GIN index on acceptable_variations for faster JSONB queries
CREATE INDEX IF NOT EXISTS idx_question_correct_answers_acceptable_variations 
ON question_correct_answers USING gin(acceptable_variations);

-- Add comment to table documenting the new structure
COMMENT ON COLUMN question_correct_answers.alternative_type IS 
'Type of alternative answer: one_required, all_required, structure_function_pair, standalone';

COMMENT ON COLUMN question_correct_answers.linked_alternatives IS 
'JSON array of alternative_ids that are linked to this answer';

COMMENT ON COLUMN question_correct_answers.marking_criteria IS 
'Specific marking instructions and criteria for this answer';

COMMENT ON COLUMN question_correct_answers.working IS 
'Working steps or calculations shown for this answer';

COMMENT ON COLUMN question_correct_answers.accepts_equivalent_phrasing IS 
'Whether equivalent phrasing of this answer is acceptable';

COMMENT ON COLUMN question_correct_answers.accepts_reverse_argument IS 
'Whether the reverse argument is acceptable for this answer';

COMMENT ON COLUMN question_correct_answers.error_carried_forward IS 
'Whether error carried forward (ECF) marking applies to this answer';

COMMENT ON COLUMN question_correct_answers.acceptable_variations IS 
'JSON array of acceptable variations of this answer';

COMMENT ON COLUMN question_correct_answers.unit IS 
'Unit for numerical answers (e.g., cm, kg, %, mol/dm³)';
