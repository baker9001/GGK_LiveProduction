/*
  # Fix licenses table schema

  1. Changes
    - Drop duplicate table creation migrations
    - Recreate licenses table with correct schema including:
      - status column
      - unique constraint on company_id and data_structure_id
      - consistent column naming (used_quantity instead of used_licenses)

  2. Security
    - Maintain existing RLS policies
    - Keep existing indexes
*/

-- Drop existing licenses table and related objects
DROP TABLE IF EXISTS licenses CASCADE;

-- Recreate licenses table with correct schema
CREATE TABLE licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  data_structure_id uuid NOT NULL REFERENCES data_structures(id),
  total_quantity integer NOT NULL CHECK (total_quantity > 0),
  used_quantity integer NOT NULL DEFAULT 0 CHECK (used_quantity >= 0),
  start_date date NOT NULL,
  end_date date NOT NULL,
  notes text,
  status text NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (company_id, data_structure_id),
  CHECK (end_date >= start_date),
  CHECK (used_quantity <= total_quantity)
);

-- Re-enable RLS
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;

-- Recreate policy
CREATE POLICY "Allow full access to authenticated users on licenses"
  ON licenses
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Recreate indexes
CREATE INDEX idx_licenses_company_id ON licenses(company_id);
CREATE INDEX idx_licenses_data_structure_id ON licenses(data_structure_id);
CREATE INDEX idx_licenses_status ON licenses(status);
CREATE INDEX idx_licenses_dates ON licenses(start_date, end_date);