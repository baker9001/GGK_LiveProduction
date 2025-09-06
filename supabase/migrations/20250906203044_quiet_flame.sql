/*
  # Add Used Quantity to Licenses Table

  1. Changes
    - Add `used_quantity` column to `licenses` table
    - Default value of 0
    - Not nullable
    - Index for performance

  2. Purpose
    - Track how many students are currently assigned to each license
    - Enable availability calculations (total_quantity - used_quantity)
    - Support license capacity management
*/

-- Add used_quantity column to licenses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'licenses' AND column_name = 'used_quantity'
  ) THEN
    ALTER TABLE licenses ADD COLUMN used_quantity integer DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Add check constraint to ensure used_quantity doesn't exceed total_quantity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'licenses' AND constraint_name = 'licenses_used_quantity_check'
  ) THEN
    ALTER TABLE licenses ADD CONSTRAINT licenses_used_quantity_check 
    CHECK (used_quantity >= 0 AND used_quantity <= total_quantity);
  END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_licenses_used_quantity ON licenses(used_quantity);
CREATE INDEX IF NOT EXISTS idx_licenses_availability ON licenses(total_quantity, used_quantity);

-- Initialize used_quantity for existing licenses
UPDATE licenses 
SET used_quantity = 0 
WHERE used_quantity IS NULL;