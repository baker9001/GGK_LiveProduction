/*
  # Fix Countries Status Case Sensitivity
  
  1. Problem
    - Countries table has CHECK constraint requiring 'Active' or 'Inactive' (capitalized)
    - Frontend components expect lowercase 'active' or 'inactive'
    - This causes countries not to appear in dropdowns
  
  2. Solution
    - Update existing data to use lowercase status values
    - Update CHECK constraint to use lowercase values
    - This standardizes with other tables in the system
*/

-- First, update existing data to use lowercase
UPDATE countries 
SET status = LOWER(status) 
WHERE status IN ('Active', 'Inactive');

-- Drop the existing CHECK constraint
ALTER TABLE countries 
DROP CONSTRAINT IF EXISTS countries_status_check;

-- Add new CHECK constraint with lowercase values
ALTER TABLE countries 
ADD CONSTRAINT countries_status_check 
CHECK (status IN ('active', 'inactive'));

-- Do the same for cities table if it exists and has the same issue
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'cities'
  ) THEN
    -- Update existing data
    UPDATE cities 
    SET status = LOWER(status) 
    WHERE status IN ('Active', 'Inactive');
    
    -- Drop existing constraint
    ALTER TABLE cities 
    DROP CONSTRAINT IF EXISTS cities_status_check;
    
    -- Add new constraint
    ALTER TABLE cities 
    ADD CONSTRAINT cities_status_check 
    CHECK (status IN ('active', 'inactive'));
  END IF;
END $$;

-- Ensure indexes are still valid
REINDEX TABLE countries;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';