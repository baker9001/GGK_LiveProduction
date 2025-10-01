/*
  # Add System Admin Policies to Roles and Permissions Tables

  ## Overview
  Adds comprehensive system admin (admin_users) policies to the roles and permissions
  management tables used for access control across the platform.

  ## Tables Updated
  1. **roles** - Role definitions
  2. **role_permissions** - Role to permission mappings
  3. **admin_users** - System administrator accounts

  ## Security Model
  - System admins get full access to all roles and permissions data
  - System admins can manage other admin users
  - Existing policies remain active
  - These policies enable complete access control management

  ## Important Notes
  - admin_users table policies allow system admins to manage other admins
  - Roles and permissions require system admin access for security
*/

-- ============================================================================
-- ROLES TABLE
-- ============================================================================

CREATE POLICY "System admins can view all roles"
  ON roles FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create roles"
  ON roles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all roles"
  ON roles FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete roles"
  ON roles FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- ROLE_PERMISSIONS TABLE
-- ============================================================================

CREATE POLICY "System admins can view all role permissions"
  ON role_permissions FOR SELECT TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can create role permissions"
  ON role_permissions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can update all role permissions"
  ON role_permissions FOR UPDATE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users))
  WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

CREATE POLICY "System admins can delete role permissions"
  ON role_permissions FOR DELETE TO authenticated
  USING (auth.uid() IN (SELECT id FROM admin_users));

-- ============================================================================
-- ADMIN_USERS TABLE (if exists and has RLS enabled)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'admin_users'
  ) THEN
    -- Enable RLS if not already enabled
    EXECUTE 'ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY';
    
    -- Add system admin policies for managing other admins
    EXECUTE '
      CREATE POLICY "System admins can view all admin users"
        ON admin_users FOR SELECT TO authenticated
        USING (auth.uid() IN (SELECT id FROM admin_users));

      CREATE POLICY "System admins can create admin users"
        ON admin_users FOR INSERT TO authenticated
        WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

      CREATE POLICY "System admins can update all admin users"
        ON admin_users FOR UPDATE TO authenticated
        USING (auth.uid() IN (SELECT id FROM admin_users))
        WITH CHECK (auth.uid() IN (SELECT id FROM admin_users));

      CREATE POLICY "System admins can delete admin users"
        ON admin_users FOR DELETE TO authenticated
        USING (auth.uid() IN (SELECT id FROM admin_users));
    ';
  END IF;
END $$;
