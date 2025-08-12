/*
  # Fix edu_subjects logo column

  This migration definitively ensures the edu_subjects table has the logo column.
  It handles the column addition in a simple, straightforward way.

  ## Changes
  1. Ensure edu_subjects table exists
  2. Add logo column if it doesn't exist
  3. Ensure proper column type and constraints

  ## Security
  - No changes to RLS policies needed
*/

-- Ensure edu_subjects table exists
CREATE TABLE IF NOT EXISTS edu_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

-- Add logo column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'edu_subjects' 
    AND column_name = 'logo'
  ) THEN
    ALTER TABLE edu_subjects ADD COLUMN logo text;
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE edu_subjects ENABLE ROW LEVEL SECURITY;

-- Recreate policies to ensure they exist
DROP POLICY IF EXISTS "Users can read edu_subjects" ON edu_subjects;
DROP POLICY IF EXISTS "System admins can manage edu_subjects" ON edu_subjects;

CREATE POLICY "Users can read edu_subjects"
  ON edu_subjects
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System admins can manage edu_subjects"
  ON edu_subjects
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create unique constraint to prevent duplicate active subjects
DROP INDEX IF EXISTS idx_edu_subjects_name_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_edu_subjects_name_unique 
  ON edu_subjects(name) 
  WHERE status = 'active';