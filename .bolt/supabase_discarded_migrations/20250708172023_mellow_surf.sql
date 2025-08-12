/*
  # Add subtopic_id column to questions_master_admin table

  1. Changes
    - Add `subtopic_id` column to `questions_master_admin` table if it doesn't exist
    - Set up foreign key relationship to subtopics table
    - Add index for performance

  2. Security
    - No RLS changes needed as table already has appropriate policies
*/

-- Add subtopic_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions_master_admin' AND column_name = 'subtopic_id'
  ) THEN
    ALTER TABLE questions_master_admin ADD COLUMN subtopic_id uuid;
  END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'questions_master_admin_subtopic_id_fkey'
    AND table_name = 'questions_master_admin'
  ) THEN
    ALTER TABLE questions_master_admin 
    ADD CONSTRAINT questions_master_admin_subtopic_id_fkey 
    FOREIGN KEY (subtopic_id) REFERENCES subtopics(id);
  END IF;
END $$;

-- Add index for performance if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'questions_master_admin' AND indexname = 'idx_questions_master_admin_subtopic_id'
  ) THEN
    CREATE INDEX idx_questions_master_admin_subtopic_id ON questions_master_admin(subtopic_id);
  END IF;
END $$;

-- Refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';