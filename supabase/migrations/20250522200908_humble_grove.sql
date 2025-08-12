/*
  # Add description column to companies table

  1. Changes
    - Add `description` column to `companies` table
      - Optional text field for company descriptions
      - Defaults to empty string
      - Can be null

  2. Security
    - No changes to RLS policies needed
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'companies' 
    AND column_name = 'description'
  ) THEN
    ALTER TABLE companies 
    ADD COLUMN description text DEFAULT '';
  END IF;
END $$;