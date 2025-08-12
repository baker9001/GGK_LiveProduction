/*
  # Create locations tables

  1. New Tables
    - `countries`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `region_id` (uuid, foreign key to regions)
      - `status` (text: Active/Inactive)
      - `created_at` (timestamp)
    
    - `cities`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `country_id` (uuid, foreign key to countries)
      - `status` (text: Active/Inactive)
      - `created_at` (timestamp)

  2. Foreign Keys
    - countries.region_id references regions(id) ON DELETE CASCADE
    - cities.country_id references countries(id) ON DELETE CASCADE

  3. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Countries table
CREATE TABLE IF NOT EXISTS countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  region_id uuid NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('Active', 'Inactive')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users on countries"
  ON countries
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Cities table
CREATE TABLE IF NOT EXISTS cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country_id uuid NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('Active', 'Inactive')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow full access to authenticated users on cities"
  ON cities
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_countries_region_id ON countries(region_id);
CREATE INDEX IF NOT EXISTS idx_cities_country_id ON cities(country_id);