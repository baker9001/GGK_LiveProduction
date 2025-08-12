/*
  # Create default roles if they don't exist

  1. Changes
    - Ensures the 'Super Admin' role exists
    - Adds other default roles if needed
    - Uses ON CONFLICT to avoid duplicates
*/

-- Insert default roles if they don't exist
INSERT INTO roles (name, description)
VALUES 
  ('Super Admin', 'Full system access with all permissions'),
  ('Support Admin', 'Limited administrative access'),
  ('Viewer', 'Read-only access to specific areas')
ON CONFLICT (name) DO NOTHING;

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';