/*
  # Fix Materials Table RLS and is_admin_user Function
  
  ## Overview
  This migration fixes critical issues preventing system admins from saving/creating materials:
  1. Corrects the is_admin_user function to properly check auth.uid()
  2. Simplifies RLS policies to work with current schema
  3. Ensures system admins have full access to materials table
  
  ## Issues Fixed
  - is_admin_user function was checking wrong column (admin_users.id instead of users.auth_user_id)
  - RLS policies were not properly allowing INSERT operations
  - Missing proper WITH CHECK clauses for system admin inserts
  
  ## Security
  - System admins maintain full access to materials table
  - Authenticated users can view active materials
  - Proper RLS enforcement maintained
*/

-- ============================================================================
-- STEP 1: Fix is_admin_user function to check correct column
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin_user(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Check if user_id matches an admin user through the users table
  RETURN EXISTS (
    SELECT 1 
    FROM admin_users au
    JOIN users u ON u.id = au.id
    WHERE u.auth_user_id = user_id
      AND u.is_active = true
  );
END;
$$;

COMMENT ON FUNCTION is_admin_user IS 'Checks if a given auth user ID belongs to an active admin user. Links through users.auth_user_id to admin_users.id.';

-- ============================================================================
-- STEP 2: Drop existing materials policies
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view materials" ON materials;
DROP POLICY IF EXISTS "System admins can create materials" ON materials;
DROP POLICY IF EXISTS "System admins can delete materials" ON materials;
DROP POLICY IF EXISTS "System admins can update all materials" ON materials;
DROP POLICY IF EXISTS "System admins can view all materials" ON materials;
DROP POLICY IF EXISTS "System admins have full access to all materials" ON materials;

-- ============================================================================
-- STEP 3: Create simplified, working RLS policies
-- ============================================================================

-- System admin SELECT policy
CREATE POLICY "System admins can view all materials"
  ON materials
  FOR SELECT
  TO authenticated
  USING (
    is_admin_user(auth.uid())
  );

-- System admin INSERT policy
CREATE POLICY "System admins can create materials"
  ON materials
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin_user(auth.uid())
  );

-- System admin UPDATE policy
CREATE POLICY "System admins can update materials"
  ON materials
  FOR UPDATE
  TO authenticated
  USING (
    is_admin_user(auth.uid())
  )
  WITH CHECK (
    is_admin_user(auth.uid())
  );

-- System admin DELETE policy
CREATE POLICY "System admins can delete materials"
  ON materials
  FOR DELETE
  TO authenticated
  USING (
    is_admin_user(auth.uid())
  );

-- Authenticated users can view active materials (for students/teachers)
CREATE POLICY "Authenticated users can view active materials"
  ON materials
  FOR SELECT
  TO authenticated
  USING (
    status = 'active'
  );

-- ============================================================================
-- STEP 4: Ensure RLS is enabled
-- ============================================================================

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: Grant necessary permissions
-- ============================================================================

-- Ensure authenticated role can access the table
GRANT SELECT, INSERT, UPDATE, DELETE ON materials TO authenticated;

-- ============================================================================
-- STEP 6: Add helpful comments
-- ============================================================================

COMMENT ON TABLE materials IS 'Stores educational learning materials (videos, ebooks, audio, assignments). System admins have full access via RLS policies.';
COMMENT ON POLICY "System admins can view all materials" ON materials IS 'Allows system admins to view all materials regardless of status';
COMMENT ON POLICY "System admins can create materials" ON materials IS 'Allows system admins to create new materials';
COMMENT ON POLICY "System admins can update materials" ON materials IS 'Allows system admins to update any material';
COMMENT ON POLICY "System admins can delete materials" ON materials IS 'Allows system admins to delete any material';
COMMENT ON POLICY "Authenticated users can view active materials" ON materials IS 'Allows all authenticated users to view active materials for learning';
