/*
  # Add sort column to edu_learning_objectives table

  1. Changes
    - Add `sort` column to `edu_learning_objectives` table if it doesn't exist
    - This fixes the error "column edu_learning_objectives.sort does not exist"
    - Ensures the column is properly typed as integer and nullable
    - Force refresh of PostgREST schema cache

  2. Security
    - No changes to RLS policies needed
*/

-- Add sort column to edu_learning_objectives table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'edu_learning_objectives' AND column_name = 'sort'
  ) THEN
    ALTER TABLE edu_learning_objectives ADD COLUMN sort INTEGER;
    
    -- Add index for better performance when sorting by this column
    CREATE INDEX IF NOT EXISTS idx_edu_learning_objectives_sort ON edu_learning_objectives(sort);
    
    RAISE NOTICE 'Added sort column to edu_learning_objectives table';
  ELSE
    RAISE NOTICE 'sort column already exists in edu_learning_objectives table';
  END IF;
END $$;

-- Force PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';