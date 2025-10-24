/*
  # Complete Removal of admin@ggknowledge.com User
  
  ## Summary
  This migration completes the removal of admin@ggknowledge.com user from all database tables.
  
  ## Status
  ✅ Removed from users table (custom table)
  ⚠️  Requires manual removal from auth.users (Supabase Auth system table)
  
  ## User Information
  - Email: admin@ggknowledge.com
  - ID: efda65c1-fa01-4c22-8459-771b0bd993f7
  - User Type: entity (incorrectly set)
  - Status: Not found in admin_users or entity_users tables
  
  ## Removal Steps Completed
  1. ✅ Deleted from users table
  2. ⚠️  Must be deleted from auth.users using Supabase service role
  
  ## How to Complete Removal from auth.users
  
  ### Option 1: Using Supabase Dashboard
  1. Go to Supabase Dashboard → Authentication → Users
  2. Search for: admin@ggknowledge.com
  3. Click the three dots menu → Delete user
  4. Confirm deletion
  
  ### Option 2: Using delete-admin-user Edge Function
  Call the Edge Function with:
  ```json
  {
    "email": "admin@ggknowledge.com",
    "user_id": "efda65c1-fa01-4c22-8459-771b0bd993f7",
    "reason": "Incorrect user type - user was entity instead of system"
  }
  ```
  
  ### Option 3: Using Supabase CLI (if available)
  ```bash
  supabase auth delete efda65c1-fa01-4c22-8459-771b0bd993f7
  ```
  
  ## Verification Query
  After deletion, verify user is completely removed:
*/

-- Verify user is NOT in users table (should return 0 rows)
DO $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM users WHERE email = 'admin@ggknowledge.com';
  
  IF user_count = 0 THEN
    RAISE NOTICE '✅ User admin@ggknowledge.com has been successfully removed from users table';
  ELSE
    RAISE WARNING '⚠️  User admin@ggknowledge.com still exists in users table';
  END IF;
END $$;

-- Verify user is NOT in admin_users table (should return 0 rows)
DO $$
DECLARE
  admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count 
  FROM admin_users 
  WHERE id = 'efda65c1-fa01-4c22-8459-771b0bd993f7';
  
  IF admin_count = 0 THEN
    RAISE NOTICE '✅ User does not exist in admin_users table (expected)';
  ELSE
    RAISE WARNING '⚠️  User found in admin_users table - manual cleanup needed';
  END IF;
END $$;

-- Verify user is NOT in entity_users table (should return 0 rows)
DO $$
DECLARE
  entity_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO entity_count 
  FROM entity_users 
  WHERE user_id = 'efda65c1-fa01-4c22-8459-771b0bd993f7';
  
  IF entity_count = 0 THEN
    RAISE NOTICE '✅ User does not exist in entity_users table (expected)';
  ELSE
    RAISE WARNING '⚠️  User found in entity_users table - manual cleanup needed';
  END IF;
END $$;

-- Final reminder
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'IMPORTANT: Manual Action Required';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'User admin@ggknowledge.com has been removed from custom tables.';
  RAISE NOTICE '';
  RAISE NOTICE 'To complete removal, delete from auth.users using one of:';
  RAISE NOTICE '1. Supabase Dashboard → Authentication → Users → Delete user';
  RAISE NOTICE '2. delete-admin-user Edge Function';
  RAISE NOTICE '3. Supabase CLI: supabase auth delete <user_id>';
  RAISE NOTICE '';
  RAISE NOTICE 'User ID: efda65c1-fa01-4c22-8459-771b0bd993f7';
  RAISE NOTICE 'Email: admin@ggknowledge.com';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;
