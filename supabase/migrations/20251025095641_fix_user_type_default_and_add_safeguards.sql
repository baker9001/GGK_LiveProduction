/*
  # Fix user_type Column Default and Add Safeguards

  ## Problem Identified
  The `users` table has `user_type` column with a default value of `'entity'`.
  This is dangerous because:
  - System admin users should have user_type='system'
  - If the Edge Function fails or is bypassed, users default to 'entity'
  - This could cause permission and access control issues
  
  ## Analysis Results
  ✓ All existing admin users correctly have user_type='system'
  ✓ Edge Function is working correctly and overriding the default
  ✗ Default value of 'entity' is a potential hazard
  
  ## Changes Made
  
  1. **Remove Dangerous Default**
     - Change default from 'entity' to NULL
     - Force explicit user_type specification
     - Prevent accidental wrong type assignment
  
  2. **Add CHECK Constraint**
     - Enforce valid user_type values
     - Allowed values: 'system', 'entity', 'teacher', 'student', 'parent', 'staff'
     - Prevent typos and invalid values
  
  3. **Add NOT NULL Constraint**
     - Require user_type to be explicitly set
     - Prevent NULL values after initial setup
     - Ensure data integrity
  
  4. **Add Verification Function**
     - Helper function to check user_type consistency
     - Identifies mismatches between user_type and table location
     - Useful for monitoring and auditing
  
  ## Security Impact
  - Positive: Prevents accidental wrong user_type assignment
  - Positive: Enforces explicit type specification
  - Positive: Adds validation layer for data integrity
  - No negative impact: All existing data is correct
  
  ## Affected Tables
  - users: Modified user_type column constraints
  
  ## Notes
  - This is a preventive fix
  - All current admin users are correctly typed
  - Edge Function continues to work as before
  - Adds safety net for edge cases
*/

-- ============================================================================
-- STEP 1: Verify Current State
-- ============================================================================

DO $$
DECLARE
  wrong_type_count INTEGER;
  admin_users_count INTEGER;
BEGIN
  -- Count admin users with wrong type
  SELECT COUNT(*) INTO wrong_type_count
  FROM users u
  INNER JOIN admin_users au ON au.id = u.id
  WHERE u.user_type != 'system';
  
  -- Count total admin users
  SELECT COUNT(*) INTO admin_users_count
  FROM admin_users;
  
  RAISE NOTICE '=== CURRENT STATE ===';
  RAISE NOTICE 'Total admin users: %', admin_users_count;
  RAISE NOTICE 'Admin users with wrong user_type: %', wrong_type_count;
  
  IF wrong_type_count > 0 THEN
    RAISE WARNING 'Found % admin users with incorrect user_type!', wrong_type_count;
  ELSE
    RAISE NOTICE '✓ All admin users have correct user_type=system';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Add CHECK Constraint for Valid Values
-- ============================================================================

-- Drop constraint if it exists (for idempotency)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_user_type_check;

-- Add CHECK constraint to enforce valid user_type values
ALTER TABLE users
ADD CONSTRAINT users_user_type_check
CHECK (user_type IN ('system', 'entity', 'teacher', 'student', 'parent', 'staff'));

COMMENT ON CONSTRAINT users_user_type_check ON users IS
  'Enforces valid user_type values. System admins must be "system", not "entity".';

-- ============================================================================
-- STEP 3: Change Default Value to NULL (Force Explicit Setting)
-- ============================================================================

-- Remove the dangerous 'entity' default
ALTER TABLE users 
ALTER COLUMN user_type SET DEFAULT NULL;

COMMENT ON COLUMN users.user_type IS
  'Type of user: system (admin panel users), entity (company/school admins), teacher, student, parent, or staff. Must be explicitly set - no default to prevent errors.';

-- ============================================================================
-- STEP 4: Add NOT NULL Constraint (After Initial NULL Default)
-- ============================================================================

-- First, verify no NULL values exist
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM users
  WHERE user_type IS NULL;
  
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Found % users with NULL user_type. Fix these before adding NOT NULL constraint.', null_count;
  END IF;
END $$;

-- Add NOT NULL constraint
ALTER TABLE users 
ALTER COLUMN user_type SET NOT NULL;

-- ============================================================================
-- STEP 5: Create Verification Function
-- ============================================================================

CREATE OR REPLACE FUNCTION verify_user_type_consistency()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  user_type TEXT,
  in_admin_users BOOLEAN,
  in_entity_users BOOLEAN,
  issue TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.user_type,
    (au.id IS NOT NULL) as in_admin_users,
    (eu.user_id IS NOT NULL) as in_entity_users,
    CASE
      WHEN au.id IS NOT NULL AND u.user_type != 'system' THEN
        'ISSUE: In admin_users but user_type is not system'
      WHEN eu.user_id IS NOT NULL AND u.user_type = 'system' THEN
        'ISSUE: user_type is system but in entity_users table'
      WHEN au.id IS NOT NULL AND eu.user_id IS NOT NULL THEN
        'ISSUE: User exists in both admin_users AND entity_users'
      ELSE
        'OK'
    END as issue
  FROM users u
  LEFT JOIN admin_users au ON au.id = u.id
  LEFT JOIN entity_users eu ON eu.user_id = u.id
  WHERE au.id IS NOT NULL OR eu.user_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION verify_user_type_consistency() IS
  'Verifies that user_type matches the table location (admin_users vs entity_users). Use this for monitoring and auditing.';

-- ============================================================================
-- STEP 6: Run Verification
-- ============================================================================

DO $$
DECLARE
  issue_count INTEGER;
  verification_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFICATION RESULTS ===';
  
  -- Count issues
  SELECT COUNT(*) INTO issue_count
  FROM verify_user_type_consistency()
  WHERE issue != 'OK';
  
  IF issue_count > 0 THEN
    RAISE WARNING 'Found % users with inconsistent user_type!', issue_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Details:';
    
    FOR verification_record IN 
      SELECT * FROM verify_user_type_consistency() WHERE issue != 'OK'
    LOOP
      RAISE NOTICE '  - %: % (%)', 
        verification_record.email, 
        verification_record.issue,
        verification_record.user_type;
    END LOOP;
  ELSE
    RAISE NOTICE '✓ All users have consistent user_type values';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== CHANGES APPLIED ===';
  RAISE NOTICE '✓ Removed dangerous default value (was: entity, now: NULL)';
  RAISE NOTICE '✓ Added CHECK constraint for valid user_type values';
  RAISE NOTICE '✓ Added NOT NULL constraint to enforce explicit setting';
  RAISE NOTICE '✓ Created verification function for monitoring';
  RAISE NOTICE '';
  RAISE NOTICE '=== MONITORING ===';
  RAISE NOTICE 'Use this query to check for issues in the future:';
  RAISE NOTICE 'SELECT * FROM verify_user_type_consistency() WHERE issue != ''OK'';';
END $$;
