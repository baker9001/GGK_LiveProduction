/*
  # Fix Roles and Role Permissions Table RLS for Authentication

  ## Problem
  System administrators need to read their role and permissions during login.
  The signin process fetches the role from the roles table joined with admin_users.
  Current RLS policies may block this critical lookup.

  ## Solution
  Add policies to allow authenticated users to read roles and permissions that are
  associated with their account. This enables role determination during login.

  ## Tables Updated
  - roles: Add policy for users to read their own role
  - role_permissions: Add policy for users to read their role's permissions

  ## Security Model
  - Authenticated users can SELECT their own role (via admin_users join)
  - Authenticated users can SELECT permissions for their role
  - System admins can manage all roles and permissions (existing policy)
  - Service role has full access

  ## Impact
  - Fixes role lookup during system admin login
  - Enables permission checking during authentication
  - Maintains security by restricting to user's own role only
*/

-- ============================================================================
-- ROLES TABLE - Add Self-Access Policy
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'roles'
  ) THEN
    -- Enable RLS if not already enabled
    EXECUTE 'ALTER TABLE roles ENABLE ROW LEVEL SECURITY';

    -- Allow authenticated users to read their own role
    -- Join through admin_users to determine which role belongs to the user
    EXECUTE '
      CREATE POLICY "Users can view their own role"
        ON roles FOR SELECT TO authenticated
        USING (
          id IN (
            SELECT role_id FROM admin_users WHERE id = auth.uid()
          )
        )
    ';

    -- Allow service role full access
    EXECUTE '
      CREATE POLICY "Service role has full access to roles"
        ON roles FOR ALL TO service_role
        USING (true)
        WITH CHECK (true)
    ';

    RAISE NOTICE 'Roles table RLS policies updated';
  ELSE
    RAISE NOTICE 'Roles table does not exist - skipping';
  END IF;
END $$;

-- ============================================================================
-- ROLE_PERMISSIONS TABLE - Add Self-Access Policy
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'role_permissions'
  ) THEN
    -- Enable RLS if not already enabled
    EXECUTE 'ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY';

    -- Allow authenticated users to read permissions for their own role
    EXECUTE '
      CREATE POLICY "Users can view their role permissions"
        ON role_permissions FOR SELECT TO authenticated
        USING (
          role_id IN (
            SELECT role_id FROM admin_users WHERE id = auth.uid()
          )
        )
    ';

    -- Allow service role full access
    EXECUTE '
      CREATE POLICY "Service role has full access to role_permissions"
        ON role_permissions FOR ALL TO service_role
        USING (true)
        WITH CHECK (true)
    ';

    RAISE NOTICE 'Role permissions table RLS policies updated';
  ELSE
    RAISE NOTICE 'Role permissions table does not exist - skipping';
  END IF;
END $$;

-- ============================================================================
-- FINAL NOTICE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Authentication RLS Fix Complete';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'All authentication-critical tables now have self-access policies';
  RAISE NOTICE 'Users should be able to login successfully';
  RAISE NOTICE 'Please test with all user types:';
  RAISE NOTICE '  - System Admin (SSA)';
  RAISE NOTICE '  - Support Admin';
  RAISE NOTICE '  - Entity Admin';
  RAISE NOTICE '  - Teacher';
  RAISE NOTICE '  - Student';
END $$;
