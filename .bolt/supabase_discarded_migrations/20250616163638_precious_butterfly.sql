/*
  # Add created_by and updated_by columns to questions_master_admin table

  1. Changes
    - Add created_by column to questions_master_admin table
    - Add updated_by column to questions_master_admin table
    - Set default values for existing records
    - Add NOT NULL constraint to created_by column

  2. Security
    - No changes to RLS policies needed
*/

-- Add created_by and updated_by columns if they don't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'questions_master_admin' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE questions_master_admin ADD COLUMN created_by uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'questions_master_admin' 
    AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE questions_master_admin ADD COLUMN updated_by uuid;
  END IF;
END $$;

-- Get a default admin user ID to use for existing records
DO $$
DECLARE
  default_admin_id uuid;
BEGIN
  -- Try to get a Super Admin user
  SELECT id INTO default_admin_id FROM admin_users 
  WHERE role_id = (SELECT id FROM roles WHERE name = 'Super Admin' LIMIT 1)
  LIMIT 1;
  
  -- If no Super Admin found, try any admin user
  IF default_admin_id IS NULL THEN
    SELECT id INTO default_admin_id FROM admin_users LIMIT 1;
  END IF;
  
  -- Update existing records with the default admin ID
  IF default_admin_id IS NOT NULL THEN
    UPDATE questions_master_admin
    SET created_by = default_admin_id
    WHERE created_by IS NULL;
  END IF;
END $$;

-- Add NOT NULL constraint to created_by column
ALTER TABLE questions_master_admin
ALTER COLUMN created_by SET NOT NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_questions_master_admin_created_by ON questions_master_admin(created_by);
CREATE INDEX IF NOT EXISTS idx_questions_master_admin_updated_by ON questions_master_admin(updated_by);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';