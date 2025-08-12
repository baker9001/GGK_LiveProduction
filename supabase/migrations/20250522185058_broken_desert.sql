/*
  # Fix regions status case sensitivity

  1. Changes
    - Update existing data to ensure status values are lowercase
    - Drop existing check constraint
    - Add new check constraint with lowercase values
*/

-- Update any existing data to ensure status values are lowercase
UPDATE regions 
SET status = LOWER(status)
WHERE status != LOWER(status);

-- Drop the existing check constraint
ALTER TABLE regions 
DROP CONSTRAINT IF EXISTS regions_status_check;

-- Add the check constraint with lowercase values
ALTER TABLE regions 
ADD CONSTRAINT regions_status_check 
CHECK (status IN ('active', 'inactive'));

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';