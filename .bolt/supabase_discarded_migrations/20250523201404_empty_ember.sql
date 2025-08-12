/*
  # Create admin users table and policies

  1. New Tables
    - `admin_users`
      - `id` (uuid, primary key)
      - `name` (text)
      - `email` (text, unique)
      - `password_hash` (text)
      - `role` (text)
      - `status` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for SSA role
*/

CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('ssa', 'support')),
  status text NOT NULL CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Only SSA can read admin users
CREATE POLICY "SSA can read admin users"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'SSA');

-- Only SSA can insert admin users
CREATE POLICY "SSA can insert admin users"
  ON admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' = 'SSA');

-- Only SSA can update admin users
CREATE POLICY "SSA can update admin users"
  ON admin_users
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'SSA')
  WITH CHECK (auth.jwt() ->> 'role' = 'SSA');