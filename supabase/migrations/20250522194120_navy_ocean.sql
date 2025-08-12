/*
  # Create tenants tables

  1. New Tables
    - `companies`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `code` (text, optional)
      - `description` (text, optional)
      - `status` (text: active/inactive)
      - `created_at` (timestamp)
    
    - `schools`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `code` (text, optional)
      - `company_id` (uuid, foreign key to companies)
      - `description` (text, optional)
      - `status` (text: active/inactive)
      - `created_at` (timestamp)

    - `branches`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `code` (text, optional)
      - `school_id` (uuid, foreign key to schools)
      - `description` (text, optional)
      - `status` (text: active/inactive)
      - `created_at` (timestamp)

  2. Foreign Keys
    - schools.company_id references companies(id)
    - branches.school_id references schools(id)

  3. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  description text,
  status text NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users on companies"
  ON companies
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Schools table
CREATE TABLE IF NOT EXISTS schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  company_id uuid NOT NULL REFERENCES companies(id),
  description text,
  status text NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users on schools"
  ON schools
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Branches table
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  school_id uuid NOT NULL REFERENCES schools(id),
  description text,
  status text NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users on branches"
  ON branches
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_schools_company_id ON schools(company_id);
CREATE INDEX IF NOT EXISTS idx_branches_school_id ON branches(school_id);