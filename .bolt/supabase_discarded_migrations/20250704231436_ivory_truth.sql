/*
  # Fix license unique constraint

  1. Changes
    - Drop the existing unique constraint on (company_id, data_structure_id)
    - Add a new partial unique index that only applies to active licenses
    - This allows multiple licenses for the same company and data structure as long as only one is active

  2. Security
    - No changes to RLS policies needed
*/

-- Drop the existing unique constraint
ALTER TABLE licenses DROP CONSTRAINT IF EXISTS unique_company_structure;

-- Add a new partial unique index that enforces uniqueness only for active licenses
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_license_per_company_structure
ON licenses (company_id, data_structure_id)
WHERE status = 'active';

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';