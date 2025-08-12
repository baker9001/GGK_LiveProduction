/*
  # Fix foreign key cascade constraints

  1. Problem
    - Deleting regions fails because countries reference them without CASCADE
    - Deleting countries fails because cities reference them without CASCADE
    - Current constraints don't properly handle cascading deletes

  2. Solution
    - Drop existing foreign key constraints
    - Re-add them with ON DELETE CASCADE
    - This ensures when a region is deleted, all its countries are deleted
    - When a country is deleted, all its cities are deleted

  3. Changes
    - Update countries.region_id foreign key to CASCADE
    - Update cities.country_id foreign key to CASCADE
*/

-- First, drop existing foreign key constraints
DO $$
BEGIN
  -- Drop foreign key constraint on countries.region_id if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'countries_region_id_fkey' 
    AND table_name = 'countries'
  ) THEN
    ALTER TABLE countries DROP CONSTRAINT countries_region_id_fkey;
  END IF;

  -- Drop foreign key constraint on cities.country_id if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'cities_country_id_fkey' 
    AND table_name = 'cities'
  ) THEN
    ALTER TABLE cities DROP CONSTRAINT cities_country_id_fkey;
  END IF;
END $$;

-- Re-add foreign key constraints with CASCADE
ALTER TABLE countries 
ADD CONSTRAINT countries_region_id_fkey 
FOREIGN KEY (region_id) REFERENCES regions(id) ON DELETE CASCADE;

ALTER TABLE cities 
ADD CONSTRAINT cities_country_id_fkey 
FOREIGN KEY (country_id) REFERENCES countries(id) ON DELETE CASCADE;