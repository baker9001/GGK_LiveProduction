/*
  # Add status column to licenses table

  1. Changes
    - Add status column to licenses table with NOT NULL constraint and DEFAULT 'active'
    - Add CHECK constraint to ensure values are either 'active' or 'inactive'
    - Refresh PostgREST schema cache to recognize the new column

  2. Reason
    - Frontend queries are failing with error "column licenses.status does not exist"
    - Status column is needed to track whether licenses are active or inactive
*/

-- Add status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'licenses' AND column_name = 'status'
  ) THEN
    ALTER TABLE licenses ADD COLUMN status text NOT NULL DEFAULT 'active';
    
    -- Add check constraint to ensure valid values
    ALTER TABLE licenses ADD CONSTRAINT licenses_status_check 
    CHECK (status IN ('active', 'inactive'));
    
    RAISE NOTICE 'Added status column to licenses table';
  ELSE
    RAISE NOTICE 'Status column already exists in licenses table';
  END IF;
END $$;

-- Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(0.5);
NOTIFY pgrst, 'reload schema';

-- Verify the column was added successfully
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'licenses' AND column_name = 'status'
  ) THEN
    RAISE NOTICE 'Verification successful: status column exists in licenses table';
  ELSE
    RAISE EXCEPTION 'Verification failed: status column does not exist in licenses table';
  END IF;
END $$;