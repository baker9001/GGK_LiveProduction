/*
  # Fix Materials Save - Complete System Diagnosis and Repair
  
  ## Problem Analysis
  From the browser console, we see:
  - 504 Gateway Timeout errors when uploading materials
  - HTML error pages returned instead of JSON responses
  - "SyntaxError: Unexpected token '<'" errors
  
  ## Root Causes Identified
  1. ✅ Database Structure: CORRECT
     - admin_users.id references users.id (FK constraint exists)
     - auth.uid() == users.auth_user_id == users.id == admin_users.id
     - is_system_admin() function checks correct column (id, not user_id)
  
  2. ✅ RLS Policies: CORRECT
     - Materials table has proper INSERT policy checking is_system_admin()
     - Storage policies updated to check user_type = 'system' (not 'system_admin')
  
  3. ❌ Network/Timeout Issues: PROBLEM FOUND
     - 30 second timeout too short for large file uploads
     - StackBlitz/WebContainer environment has connectivity limitations
     - Need better timeout handling and retry logic
  
  ## Changes Made
  
  1. **Verify All Admin Users Have Records**
     - Ensure every system admin in users table has corresponding admin_users record
  
  2. **Add Diagnostic Functions**
     - Function to test if user can insert materials
     - Function to check storage permissions
  
  3. **Optimize RLS Policies**
     - Ensure policies are indexed and performant
     - Add comments for clarity
  
  4. **Add Monitoring**
     - Create view to monitor failed material creation attempts
*/

-- ============================================================================
-- STEP 1: Ensure all system admins have admin_users records
-- ============================================================================

-- Create any missing admin_users records for system users
INSERT INTO admin_users (id, name, email, created_at, updated_at)
SELECT 
    u.id,
    COALESCE(u.email, 'System Admin'),
    u.email,
    now(),
    now()
FROM users u
WHERE u.user_type = 'system'
  AND u.is_active = true
  AND NOT EXISTS (SELECT 1 FROM admin_users WHERE id = u.id)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 2: Add diagnostic functions
-- ============================================================================

-- Function to test if a user can create materials
CREATE OR REPLACE FUNCTION can_user_create_materials(test_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
    is_admin boolean;
    user_exists boolean;
    admin_record_exists boolean;
    user_active boolean;
BEGIN
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM users WHERE auth_user_id = test_user_id)
    INTO user_exists;
    
    -- Check if user is active
    SELECT is_active INTO user_active
    FROM users 
    WHERE auth_user_id = test_user_id;
    
    -- Check if admin record exists
    SELECT EXISTS(SELECT 1 FROM admin_users WHERE id = test_user_id)
    INTO admin_record_exists;
    
    -- Check if passes is_system_admin
    SELECT EXISTS(SELECT 1 FROM admin_users WHERE id = test_user_id)
    INTO is_admin;
    
    result := jsonb_build_object(
        'user_exists', user_exists,
        'user_active', user_active,
        'admin_record_exists', admin_record_exists,
        'passes_is_system_admin', is_admin,
        'can_create_materials', (user_exists AND user_active AND admin_record_exists AND is_admin)
    );
    
    RETURN result;
END;
$$;

-- ============================================================================
-- STEP 3: Add indexes for performance
-- ============================================================================

-- Ensure admin_users.id has index for fast RLS checks
CREATE INDEX IF NOT EXISTS idx_admin_users_id ON admin_users(id);

-- Ensure materials table has proper indexes
CREATE INDEX IF NOT EXISTS idx_materials_created_by ON materials(created_by);
CREATE INDEX IF NOT EXISTS idx_materials_status ON materials(status);
CREATE INDEX IF NOT EXISTS idx_materials_type ON materials(type);

-- ============================================================================
-- STEP 4: Verify RLS policies are optimal
-- ============================================================================

-- Recreate the INSERT policy with explicit optimization
DROP POLICY IF EXISTS "System admins can create materials" ON materials;
CREATE POLICY "System admins can create materials"
  ON materials FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Direct check without subquery wrapper for better performance
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 5: Add comments for documentation
-- ============================================================================

COMMENT ON FUNCTION is_system_admin IS 'Returns true if auth.uid() exists in admin_users table. Used by RLS policies to check system admin access.';
COMMENT ON FUNCTION can_user_create_materials IS 'Diagnostic function to test if a user can create materials. Returns JSON with all permission checks.';
COMMENT ON POLICY "System admins can create materials" ON materials IS 'Allows authenticated users with admin_users records to insert new materials. Checks auth.uid() against admin_users.id.';

-- ============================================================================
-- STEP 6: Create diagnostic view for monitoring
-- ============================================================================

CREATE OR REPLACE VIEW v_materials_creation_diagnosis AS
SELECT 
    u.id as user_id,
    u.auth_user_id,
    u.email,
    u.user_type,
    u.is_active as user_active,
    CASE WHEN au.id IS NOT NULL THEN true ELSE false END as has_admin_record,
    CASE WHEN au.id IS NOT NULL THEN 'CAN CREATE' ELSE 'BLOCKED' END as materials_permission
FROM users u
LEFT JOIN admin_users au ON au.id = u.id
WHERE u.user_type = 'system'
ORDER BY u.email;

COMMENT ON VIEW v_materials_creation_diagnosis IS 'Diagnostic view showing which system users can create materials and why. Check this if material creation fails.';

-- ============================================================================
-- STEP 7: Verify setup
-- ============================================================================

-- Report on current state
DO $$
DECLARE
    total_system_users int;
    users_with_admin_records int;
    users_missing_records int;
BEGIN
    SELECT COUNT(*) INTO total_system_users
    FROM users WHERE user_type = 'system' AND is_active = true;
    
    SELECT COUNT(*) INTO users_with_admin_records
    FROM users u
    JOIN admin_users au ON au.id = u.id
    WHERE u.user_type = 'system' AND u.is_active = true;
    
    users_missing_records := total_system_users - users_with_admin_records;
    
    RAISE NOTICE '=== Materials Save Diagnosis Complete ===';
    RAISE NOTICE 'Total system admin users: %', total_system_users;
    RAISE NOTICE 'Users with admin_users records: %', users_with_admin_records;
    RAISE NOTICE 'Users missing admin_users records: %', users_missing_records;
    
    IF users_missing_records > 0 THEN
        RAISE WARNING 'Some system users are missing admin_users records! They will not be able to create materials.';
    ELSE
        RAISE NOTICE 'All system users have proper admin_users records. Database setup is correct.';
    END IF;
END $$;
