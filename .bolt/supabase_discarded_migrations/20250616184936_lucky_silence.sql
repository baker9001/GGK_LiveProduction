/*
  # Update questions_attachments table schema

  1. Changes
    - Drop entity_type and entity_id columns
    - Add question_id and sub_question_id columns
    - Add foreign key constraints
    - Migrate existing data
    - Add check constraint to ensure one of the IDs is set

  2. Security
    - Maintain existing RLS policies
*/

-- First, add the new columns
ALTER TABLE questions_attachments
ADD COLUMN IF NOT EXISTS question_id uuid,
ADD COLUMN IF NOT EXISTS sub_question_id uuid;

-- Migrate data from entity_id to the appropriate column
UPDATE questions_attachments
SET question_id = entity_id
WHERE entity_type = 'question';

UPDATE questions_attachments
SET sub_question_id = entity_id
WHERE entity_type = 'sub-question';

-- Add foreign key constraints
ALTER TABLE questions_attachments
ADD CONSTRAINT questions_attachments_question_id_fkey
FOREIGN KEY (question_id) REFERENCES questions_master_admin(id) ON DELETE CASCADE;

ALTER TABLE questions_attachments
ADD CONSTRAINT questions_attachments_sub_question_id_fkey
FOREIGN KEY (sub_question_id) REFERENCES sub_questions(id) ON DELETE CASCADE;

-- Add check constraint to ensure one of the IDs is set
ALTER TABLE questions_attachments
ADD CONSTRAINT questions_attachments_id_check
CHECK (
  (question_id IS NOT NULL AND sub_question_id IS NULL) OR
  (question_id IS NULL AND sub_question_id IS NOT NULL)
);

-- Drop the old columns
ALTER TABLE questions_attachments
DROP COLUMN IF EXISTS entity_type,
DROP COLUMN IF EXISTS entity_id;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_questions_attachments_question_id ON questions_attachments(question_id);
CREATE INDEX IF NOT EXISTS idx_questions_attachments_sub_question_id ON questions_attachments(sub_question_id);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';