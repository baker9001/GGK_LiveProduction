/*
  # Create education catalog tables

  1. New Tables
    - `programs`
      - `id` (uuid, primary key)
      - `name` (text, required, unique)
      - `code` (text, optional)
      - `description` (text, optional)
      - `status` (text, required: 'active' or 'inactive')
      - `created_at` (timestamp)

    - `providers`
      - `id` (uuid, primary key)
      - `name` (text, required, unique)
      - `code` (text, optional)
      - `status` (text, required: 'active' or 'inactive')
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users

  3. Foreign Key Constraints
    - Re-establish foreign key relationships for data_structures table
*/

-- Programs table
CREATE TABLE IF NOT EXISTS programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text,
  description text,
  status text NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users on programs"
  ON programs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Providers table
CREATE TABLE IF NOT EXISTS providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text,
  status text NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users on providers"
  ON providers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Re-establish foreign key constraints for data_structures table
DO $$
BEGIN
  -- Add foreign key constraint for program_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'data_structures_program_id_fkey' 
    AND table_name = 'data_structures'
  ) THEN
    ALTER TABLE data_structures 
    ADD CONSTRAINT data_structures_program_id_fkey 
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;
  END IF;

  -- Add foreign key constraint for provider_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'data_structures_provider_id_fkey' 
    AND table_name = 'data_structures'
  ) THEN
    ALTER TABLE data_structures 
    ADD CONSTRAINT data_structures_provider_id_fkey 
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_programs_name ON programs(name);
CREATE INDEX IF NOT EXISTS idx_providers_name ON providers(name);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';