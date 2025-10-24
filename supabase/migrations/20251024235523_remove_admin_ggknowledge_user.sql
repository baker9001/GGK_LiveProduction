/*
  # Remove admin@ggknowledge.com user from all tables
  
  ## Description
  This migration removes the user "admin@ggknowledge.com" from:
  - users table (custom user data)
  - auth.users table (Supabase authentication)
  
  ## User Details
  - Email: admin@ggknowledge.com
  - ID: efda65c1-fa01-4c22-8459-771b0bd993f7
  - Type: entity (incorrectly typed)
  
  ## Safety
  - User has no related records in admin_users or entity_users
  - Safe to delete completely
*/

-- Delete from custom users table first
DELETE FROM users 
WHERE email = 'admin@ggknowledge.com' 
AND id = 'efda65c1-fa01-4c22-8459-771b0bd993f7';

-- Note: Deletion from auth.users requires admin privileges
-- This will be handled via Edge Function or manual Supabase dashboard action
-- The auth.users record should be deleted manually or via the delete-admin-user Edge Function

-- Log the deletion
DO $$
BEGIN
  RAISE NOTICE 'User admin@ggknowledge.com has been removed from users table';
  RAISE NOTICE 'User ID: efda65c1-fa01-4c22-8459-771b0bd993f7';
  RAISE NOTICE 'IMPORTANT: Also delete this user from auth.users via Supabase Dashboard';
END $$;
