/*
  # Add status column to sub_questions table

  1. Changes
    - Add `status` column to `sub_questions` table if it doesn't exist
    - Set default value to 'active'
    - Add check constraint to ensure valid values
    - Update existing records to have status='active'

  2. Security
    - No changes to RLS policies needed
*/

-- Add status column to sub_questions table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sub_questions' AND column_name = 'status'
  ) THEN
    -- Add the status column with default value
    ALTER TABLE sub_questions ADD COLUMN status text DEFAULT 'active';
    
    -- Add check constraint
    ALTER TABLE sub_questions 
    ADD CONSTRAINT sub_questions_status_check 
    CHECK (status IN ('active', 'inactive'));
    
    -- Update existing records to have status='active'
    UPDATE sub_questions SET status = 'active' WHERE status IS NULL;
    
    RAISE NOTICE 'Added status column to sub_questions table';
  ELSE
    RAISE NOTICE 'status column already exists in sub_questions table';
  END IF;
END $$;

-- Force schema cache refresh multiple times with delays
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(0.5);
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(0.5);
NOTIFY pgrst, 'reload schema';

-- Update table statistics to help PostgREST
ANALYZE sub_questions;

-- Verify the column was added successfully
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sub_questions' AND column_name = 'status'
  ) THEN
    RAISE NOTICE 'Verification successful: status column exists in sub_questions table';
  ELSE
    RAISE EXCEPTION 'Verification failed: status column does not exist in sub_questions table';
  END IF;
  
  -- Also verify the check constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'sub_questions_status_check'
  ) THEN
    RAISE NOTICE 'Verification successful: Check constraint exists for status column';
  ELSE
    RAISE EXCEPTION 'Verification failed: Check constraint does not exist for status column';
  END IF;
END $$;