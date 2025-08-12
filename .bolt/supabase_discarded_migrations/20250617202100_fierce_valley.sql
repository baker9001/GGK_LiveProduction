/*
  # Create default system roles

  1. New Tables
    - Ensures required roles exist in the system
    
  2. Default Roles
    - `Super Admin` - Full system access (SSA role)
    - `Support Admin` - Limited administrative access
    - `Viewer` - Read-only access
    
  3. Security
    - No RLS changes needed as roles table already has proper policies
*/

-- Insert default roles if they don't exist
INSERT INTO roles (name, description) 
VALUES 
  ('Super Admin', 'Full system administrator with complete access to all features and settings'),
  ('Support Admin', 'Administrative user with limited access to support functions'),
  ('Viewer', 'Read-only access to system data and reports')
ON CONFLICT (name) DO NOTHING;