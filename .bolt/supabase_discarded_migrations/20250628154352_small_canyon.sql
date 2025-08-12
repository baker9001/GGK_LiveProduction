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

    - `subjects`
      - `id` (uuid, primary key)
      - `name` (text, required, unique)
      - `code` (text, optional)
      - `category` (text, optional)
      - `status` (text, required: 'active' or 'inactive')
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
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

-- Subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text,
  category text,
  status text NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users on subjects"
  ON subjects
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_programs_name ON programs(name);
CREATE INDEX IF NOT EXISTS idx_providers_name ON providers(name);
CREATE INDEX IF NOT EXISTS idx_subjects_name ON subjects(name);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';