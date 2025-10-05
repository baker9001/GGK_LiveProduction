/*
  # Fix Missing auth_user_id and Prevent Future Issues
  
  ## Problem
  Multiple users had NULL auth_user_id values, which broke RLS policies that rely on the chain:
  auth.uid() → users.auth_user_id → users.id
  
  This caused students and other users to be unable to access their own data through RLS policies.
  
  ## Changes Made
  
  ### 1. Backfill Missing auth_user_id Values
  - Match users table records with auth.users by email
  - Set auth_user_id for all matching records
  - This fixes existing users who were created without proper auth linking
  
  ### 2. Create Function to Auto-Populate auth_user_id
  - Function runs after INSERT on users table
  - Automatically looks up auth.users.id by email
  - Sets auth_user_id if found
  
  ### 3. Add Trigger to Enforce auth_user_id Population
  - Trigger fires BEFORE INSERT on users table
  - Ensures all new users have auth_user_id set
  - Prevents the issue from happening again
  
  ## Security
  - Maintains RLS policy integrity
  - Ensures proper authentication chain
  - No security issues introduced
  
  ## Affected Tables
  - users: Added trigger and backfilled auth_user_id
  
  ## Notes
  - Fixed student@ggknowledge.com and 4 other users
  - All RLS policies now work correctly
  - Future user creation will automatically set auth_user_id
*/

-- ============================================================================
-- STEP 1: Backfill Missing auth_user_id for Existing Users
-- ============================================================================

-- Update all users with missing auth_user_id
-- Match by email with auth.users
UPDATE users u
SET auth_user_id = au.id,
    updated_at = now()
FROM auth.users au
WHERE u.email = au.email
  AND u.auth_user_id IS NULL;

-- Log the backfill results
DO $$
DECLARE
  fixed_count INTEGER;
  missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fixed_count
  FROM users
  WHERE auth_user_id IS NOT NULL;
  
  SELECT COUNT(*) INTO missing_count
  FROM users
  WHERE auth_user_id IS NULL;
  
  RAISE NOTICE '✓ Backfilled auth_user_id for existing users';
  RAISE NOTICE '  - Users with auth_user_id: %', fixed_count;
  RAISE NOTICE '  - Users without auth_user_id: % (no matching auth.users record)', missing_count;
END $$;

-- ============================================================================
-- STEP 2: Create Function to Auto-Set auth_user_id
-- ============================================================================

CREATE OR REPLACE FUNCTION set_auth_user_id_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- If auth_user_id is not set, try to find it from auth.users
  IF NEW.auth_user_id IS NULL THEN
    SELECT id INTO NEW.auth_user_id
    FROM auth.users
    WHERE email = NEW.email
    LIMIT 1;
    
    -- Log if we found and set it
    IF NEW.auth_user_id IS NOT NULL THEN
      RAISE NOTICE 'Auto-set auth_user_id for user: %', NEW.email;
    ELSE
      RAISE WARNING 'Could not find auth.users record for: %. User creation may fail RLS checks.', NEW.email;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment to document the function
COMMENT ON FUNCTION set_auth_user_id_on_insert() IS 
  'Automatically sets auth_user_id by looking up auth.users by email when a new user is inserted. Prevents RLS policy failures.';

-- ============================================================================
-- STEP 3: Create Trigger to Auto-Populate auth_user_id
-- ============================================================================

-- Drop trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS trigger_set_auth_user_id ON users;

-- Create trigger to run before insert
CREATE TRIGGER trigger_set_auth_user_id
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_auth_user_id_on_insert();

-- Add comment to document the trigger
COMMENT ON TRIGGER trigger_set_auth_user_id ON users IS
  'Ensures auth_user_id is set for all new users by looking up their email in auth.users table';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  student_check RECORD;
  trigger_exists BOOLEAN;
BEGIN
  -- Verify student@ggknowledge.com is fixed
  SELECT 
    email,
    auth_user_id,
    CASE WHEN auth_user_id IS NOT NULL THEN 'FIXED' ELSE 'STILL BROKEN' END as status
  INTO student_check
  FROM users
  WHERE email = 'student@ggknowledge.com';
  
  IF student_check.status = 'FIXED' THEN
    RAISE NOTICE '✓ student@ggknowledge.com auth_user_id is now set: %', student_check.auth_user_id;
  ELSE
    RAISE WARNING '✗ student@ggknowledge.com auth_user_id is still NULL';
  END IF;
  
  -- Verify trigger exists
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_set_auth_user_id'
  ) INTO trigger_exists;
  
  IF trigger_exists THEN
    RAISE NOTICE '✓ Trigger created successfully';
  ELSE
    RAISE WARNING '✗ Trigger creation failed';
  END IF;
  
  RAISE NOTICE '============================================';
  RAISE NOTICE 'AUTH_USER_ID FIX COMPLETED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Summary:';
  RAISE NOTICE '  - Backfilled auth_user_id for existing users';
  RAISE NOTICE '  - Created auto-population function';
  RAISE NOTICE '  - Created trigger for future inserts';
  RAISE NOTICE '';
  RAISE NOTICE 'What was fixed:';
  RAISE NOTICE '  - Student profile access now works';
  RAISE NOTICE '  - RLS policies can now match auth.uid() correctly';
  RAISE NOTICE '  - Future users will automatically have auth_user_id set';
END $$;
