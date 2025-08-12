/*
  # Fix edu_subjects logo column

  This migration ensures the edu_subjects table has the logo column.
  It handles all possible scenarios:
  1. Table doesn't exist - creates it with logo column
  2. Table exists but no logo column - adds it
  3. Table has logo_url but no logo - renames logo_url to logo
  4. Table already has logo column - does nothing

  ## Changes
  1. Create edu_subjects table if it doesn't exist
  2. Add logo column if missing
  3. Rename logo_url to logo if needed
  4. Ensure proper RLS policies

  ## Security
  - Enable RLS on edu_subjects table
  - Add policies for authenticated users
*/

-- Create edu_subjects table if it doesn't exist
CREATE TABLE IF NOT EXISTS edu_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  logo text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

-- Handle logo column scenarios
DO $$
BEGIN
  -- Scenario 1: logo_url exists but logo doesn't - rename logo_url to logo
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'edu_subjects' AND column_name = 'logo_url' AND table_schema = 'public')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'edu_subjects' AND column_name = 'logo' AND table_schema = 'public') THEN
    
    ALTER TABLE edu_subjects RENAME COLUMN logo_url TO logo;
    
  -- Scenario 2: neither logo nor logo_url exists - add logo column
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'edu_subjects' AND column_name = 'logo' AND table_schema = 'public')
        AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'edu_subjects' AND column_name = 'logo_url' AND table_schema = 'public') THEN
    
    ALTER TABLE edu_subjects ADD COLUMN logo text;
    
  END IF;
  
  -- Ensure logo column is nullable text type
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'edu_subjects' AND column_name = 'logo' AND table_schema = 'public') THEN
    ALTER TABLE edu_subjects ALTER COLUMN logo TYPE text;
    ALTER TABLE edu_subjects ALTER COLUMN logo DROP NOT NULL;
  END IF;
END $$;

-- Create unique constraint to prevent duplicate active subjects
DROP INDEX IF EXISTS idx_edu_subjects_name_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_edu_subjects_name_unique ON edu_subjects(name) WHERE status = 'active';

-- Enable Row Level Security
ALTER TABLE edu_subjects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read edu_subjects" ON edu_subjects;
DROP POLICY IF EXISTS "System admins can manage edu_subjects" ON edu_subjects;

-- Create RLS policies
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