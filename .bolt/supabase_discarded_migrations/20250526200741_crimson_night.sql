/*
  # Create licenses table and relationships

  1. New Tables
    - `licenses`
      - `id` (uuid, primary key)
      - `company_id` (uuid, foreign key to companies)
      - `data_structure_id` (uuid, foreign key to data_structures)
      - `total_quantity` (integer)
      - `used_licenses` (integer)
      - `start_date` (date)
      - `end_date` (date)
      - `notes` (text)
      - `status` (text: active/inactive)
      - `created_at` (timestamp)

  2. Foreign Keys
    - licenses.company_id references companies(id)
    - licenses.data_structure_id references data_structures(id)

  3. Security
    - Enable RLS
    - Add policies for authenticated users
*/

CREATE TABLE licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  data_structure_id uuid NOT NULL REFERENCES data_structures(id),
  total_quantity integer NOT NULL CHECK (total_quantity > 0),
  used_licenses integer NOT NULL DEFAULT 0 CHECK (used_licenses >= 0),
  start_date date NOT NULL,
  end_date date NOT NULL,
  notes text,
  status text NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  CHECK (end_date >= start_date),
  CHECK (used_licenses <= total_quantity)
);

ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users on licenses"
  ON licenses
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX idx_licenses_company_id ON licenses(company_id);
CREATE INDEX idx_licenses_data_structure_id ON licenses(data_structure_id);
CREATE INDEX idx_licenses_status ON licenses(status);
CREATE INDEX idx_licenses_dates ON licenses(start_date, end_date);