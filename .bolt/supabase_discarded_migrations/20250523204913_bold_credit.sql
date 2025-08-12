/*
  # Fix admin users table schema

  1. Changes
    - Drop existing admin_users table
    - Recreate admin_users table with correct schema
    - Add proper foreign key constraint to roles table
    - Enable RLS and add policies

  2. Security
    - Enable RLS
    - Add policies for SSA role
*/

-- Drop existing table
DROP TABLE IF EXISTS admin_users CASCADE;

-- Create admin_users table with correct schema
CREATE TABLE admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role_id uuid NOT NULL REFERENCES roles(id),
  status text NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "SSA can read admin users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'SSA');

CREATE POLICY "SSA can insert admin users"
  ON admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' = 'SSA');

CREATE POLICY "SSA can update admin users"
  ON admin_users
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'SSA')
  WITH CHECK (auth.jwt() ->> 'role' = 'SSA');

CREATE POLICY "SSA can delete admin users"
  ON admin_users
  FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'SSA');

-- Add indexes for better performance
CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_role_id ON admin_users(role_id);

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';