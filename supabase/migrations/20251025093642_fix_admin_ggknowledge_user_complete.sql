/*
  # Fix admin@ggknowledge.com User - Complete Incomplete Creation

  ## Problem
  User admin@ggknowledge.com exists in users table but:
  - Has incorrect user_type='entity' (should be 'system')
  - Missing from admin_users table (no admin profile)
  - Cannot function as system administrator
  - Blocks new admin user creation with same email

  ## Solution
  1. Update user_type from 'entity' to 'system' in users table
  2. Create missing admin_users record
  3. Link to Super Admin role
  4. Update metadata to reflect system admin status

  ## Safety
  - User ID: 543cfb13-31b6-4dbc-a235-998375d884bb
  - Email: admin@ggknowledge.com
  - No existing admin_users record (safe to insert)
  - No related records in entity_users (confirmed)
*/

DO $$
DECLARE
  v_user_id uuid := '543cfb13-31b6-4dbc-a235-998375d884bb';
  v_role_id uuid;
  v_user_exists boolean;
  v_admin_exists boolean;
BEGIN
  -- Verify user exists and get current state
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = v_user_id AND email = 'admin@ggknowledge.com'
  ) INTO v_user_exists;

  IF NOT v_user_exists THEN
    RAISE EXCEPTION 'User admin@ggknowledge.com not found in users table';
  END IF;

  -- Check if admin_users record already exists
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE id = v_user_id
  ) INTO v_admin_exists;

  IF v_admin_exists THEN
    RAISE NOTICE 'Admin user record already exists, skipping insert';
  ELSE
    -- Get Super Admin role ID
    SELECT id INTO v_role_id
    FROM roles
    WHERE name = 'Super Admin'
    LIMIT 1;

    IF v_role_id IS NULL THEN
      RAISE EXCEPTION 'Super Admin role not found in roles table';
    END IF;

    RAISE NOTICE 'Found Super Admin role ID: %', v_role_id;

    -- Step 1: Update user_type in users table
    UPDATE users
    SET 
      user_type = 'system',
      raw_app_meta_data = jsonb_set(
        COALESCE(raw_app_meta_data, '{}'::jsonb),
        '{user_type}',
        '"system"'
      ),
      raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{user_type}',
        '"system"'
      ),
      updated_at = now()
    WHERE id = v_user_id
      AND email = 'admin@ggknowledge.com';

    RAISE NOTICE 'Updated user_type to system for user %', v_user_id;

    -- Step 2: Create admin_users record
    INSERT INTO admin_users (
      id,
      name,
      role_id,
      can_manage_users,
      created_at,
      updated_at
    )
    VALUES (
      v_user_id,
      'Baker',
      v_role_id,
      true,
      now(),
      now()
    );

    RAISE NOTICE 'Created admin_users record for user %', v_user_id;

    -- Step 3: Create audit log entry
    INSERT INTO audit_logs (
      user_id,
      action,
      entity_type,
      entity_id,
      details,
      created_at
    )
    VALUES (
      v_user_id,
      'fix_incomplete_admin_user',
      'admin_user',
      v_user_id,
      jsonb_build_object(
        'email', 'admin@ggknowledge.com',
        'previous_user_type', 'entity',
        'new_user_type', 'system',
        'role_id', v_role_id,
        'role_name', 'Super Admin',
        'fix_applied_at', now(),
        'reason', 'Complete incomplete user creation from failed Edge Function'
      ),
      now()
    );

    RAISE NOTICE 'Fix completed successfully';
  END IF;

  -- Display final state
  RAISE NOTICE '=== Final User State ===';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Email: admin@ggknowledge.com';
  RAISE NOTICE 'User Type: system';
  RAISE NOTICE 'Admin Record: EXISTS';
  RAISE NOTICE 'Role: Super Admin';
  RAISE NOTICE 'Can Manage Users: true';
  RAISE NOTICE '========================';

END $$;

-- Verify the fix was applied correctly
DO $$
DECLARE
  v_user_record record;
  v_admin_record record;
BEGIN
  -- Get user record
  SELECT 
    id, 
    email, 
    user_type, 
    is_active, 
    email_verified
  INTO v_user_record
  FROM users
  WHERE email = 'admin@ggknowledge.com';

  -- Get admin_users record
  SELECT 
    au.id,
    au.name,
    r.name as role_name,
    au.can_manage_users
  INTO v_admin_record
  FROM admin_users au
  JOIN roles r ON r.id = au.role_id
  WHERE au.id = v_user_record.id;

  -- Verification checks
  IF v_user_record.user_type != 'system' THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: user_type is % instead of system', v_user_record.user_type;
  END IF;

  IF v_admin_record.id IS NULL THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: admin_users record does not exist';
  END IF;

  IF v_admin_record.role_name != 'Super Admin' THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: role is % instead of Super Admin', v_admin_record.role_name;
  END IF;

  IF v_admin_record.can_manage_users != true THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: can_manage_users is false';
  END IF;

  RAISE NOTICE '✓ All verification checks passed';
  RAISE NOTICE '✓ User admin@ggknowledge.com is now properly configured as system admin';

END $$;
