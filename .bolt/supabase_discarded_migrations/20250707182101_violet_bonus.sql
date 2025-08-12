/*
  # Add subtopic_id column to questions_master_admin table

  1. Changes
    - Add `subtopic_id` column to `questions_master_admin` table if it doesn't exist
    - Add foreign key constraint to `edu_subtopics` table
    - Add index for better query performance
    - Refresh schema cache to ensure PostgREST recognizes the new column

  2. Security
    - No changes to RLS policies needed
*/

-- Add subtopic_id column to questions_master_admin table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions_master_admin' AND column_name = 'subtopic_id'
  ) THEN
    -- Add the subtopic_id column
    ALTER TABLE questions_master_admin ADD COLUMN subtopic_id uuid;
    
    -- Add foreign key constraint
    ALTER TABLE questions_master_admin 
    ADD CONSTRAINT questions_master_admin_subtopic_id_fkey 
    FOREIGN KEY (subtopic_id) 
    REFERENCES edu_subtopics(id) 
    ON DELETE SET NULL;
    
    -- Add index for better performance
    CREATE INDEX idx_questions_master_admin_subtopic_id 
    ON questions_master_admin(subtopic_id);
    
    RAISE NOTICE 'Added subtopic_id column to questions_master_admin table';
  ELSE
    RAISE NOTICE 'subtopic_id column already exists in questions_master_admin table';
  END IF;
END $$;

-- Verify the column was added successfully
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions_master_admin' AND column_name = 'subtopic_id'
  ) THEN
    RAISE NOTICE 'Verification successful: subtopic_id column exists in questions_master_admin table';
  ELSE
    RAISE EXCEPTION 'Verification failed: subtopic_id column does not exist in questions_master_admin table';
  END IF;
END $$;

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';