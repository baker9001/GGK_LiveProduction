/*
  # Create roles and permissions tables

  1. New Tables
    - `roles`
      - `id` (uuid, primary key)
      - `name` (text, required, unique)
      - `description` (text, optional)
      - `created_at` (timestamp)

    - `role_permissions`
      - `id` (uuid, primary key)
      - `role_id` (uuid, foreign key to roles)
      - `path` (text, required)
      - `can_access` (boolean)
      - `can_view` (boolean)
      - `can_create` (boolean)
      - `can_edit` (boolean)
      - `can_delete` (boolean)
      - `created_at` (timestamp)

  2. Foreign Keys
    - role_permissions.role_id references roles(id)

  3. Security
    - Enable RLS on all tables
    - Add policies for SSA role
*/

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Only SSA can manage roles
CREATE POLICY "SSA can manage roles"
  ON roles
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'SSA')
  WITH CHECK (auth.jwt() ->> 'role' = 'SSA');

-- Role permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  path text NOT NULL,
  can_access boolean DEFAULT false,
  can_view boolean DEFAULT false,
  can_create boolean DEFAULT false,
  can_edit boolean DEFAULT false,
  can_delete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(role_id, path)
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Only SSA can manage role permissions
CREATE POLICY "SSA can manage role permissions"
  ON role_permissions
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'SSA')
  WITH CHECK (auth.jwt() ->> 'role' = 'SSA');

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_path ON role_permissions(path);

-- Insert default roles
INSERT INTO roles (name, description)
VALUES 
  ('Super Admin', 'Full system access with all permissions'),
  ('Support Admin', 'Limited administrative access'),
  ('Viewer', 'Read-only access to specific areas')
ON CONFLICT (name) DO NOTHING;