/*
  # Update admin_users table schema

  1. Changes
    - Add role_id column referencing roles table
    - Drop old role column
    - Update RLS policies

  2. Security
    - Maintain existing RLS policies
    - Update foreign key constraints
*/

-- Add role_id column
ALTER TABLE admin_users
ADD COLUMN role_id uuid REFERENCES roles(id);

-- Copy data from role column to role_id (if needed)
UPDATE admin_users
SET role_id = (
  SELECT id FROM roles 
  WHERE LOWER(name) = 
    CASE 
      WHEN admin_users.role = 'ssa' THEN 'super admin'
      WHEN admin_users.role = 'support' THEN 'support admin'
    END
);

-- Make role_id required
ALTER TABLE admin_users
ALTER COLUMN role_id SET NOT NULL;

-- Drop old role column
ALTER TABLE admin_users
DROP COLUMN role;

-- Drop old check constraint
ALTER TABLE admin_users
DROP CONSTRAINT IF EXISTS admin_users_role_check;