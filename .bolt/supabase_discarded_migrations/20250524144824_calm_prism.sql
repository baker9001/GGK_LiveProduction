/*
  # Add notes column to companies table

  1. Changes
    - Add notes column to companies table for storing additional company information
    - Refresh PostgREST schema cache to reflect changes

  2. Details
    - Add text column for storing company notes
    - Ensure schema cache is updated to prevent 404 errors
*/

-- Add notes column to companies table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'companies'
    AND column_name = 'notes'
  ) THEN
    ALTER TABLE companies ADD COLUMN notes text;
  END IF;
END $$;

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';