/*
  # Add description column to companies table

  1. Changes
    - Add description column to companies table if it doesn't exist
    - Ensure PostgREST schema cache is refreshed
*/

-- Add description column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'companies' 
    AND column_name = 'description'
  ) THEN
    ALTER TABLE companies ADD COLUMN description text;
  END IF;
END $$;

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';