/*
  # Fix Authentication Trigger Functions - Security Definer Issue

  ## Problem
  The trigger function `sync_auth_password_change` is missing SECURITY DEFINER attribute.
  This causes it to run with the permissions of the calling user (authenticated role),
  which doesn't have permission to insert into audit_logs table.
  
  During login, when auth.users is updated, this trigger fails silently, causing
  Supabase Auth to report "Database error granting user".

  ## Root Cause
  - `sync_auth_password_change` function lacks SECURITY DEFINER
  - Function tries to INSERT into audit_logs
  - authenticated role doesn't have INSERT permission on audit_logs
  - Trigger fails during auth process
  - Supabase Auth reports generic error

  ## Solution
  Recreate ALL auth-related trigger functions with SECURITY DEFINER to ensure
  they run with sufficient privileges to modify audit_logs and other tables.

  ## Security
  - Functions run with elevated privileges but only perform specific operations
  - No user input is trusted - all values are from system tables
  - Audit logging is critical system function requiring elevated privileges
*/

-- ============================================================================
-- STEP 1: Recreate sync_auth_password_change with SECURITY DEFINER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_auth_password_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER  -- CRITICAL: This was missing
SET search_path = public, pg_temp
AS $function$
BEGIN
    -- Log password change
    INSERT INTO audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        details,
        created_at
    ) VALUES (
        NEW.id,
        'password_changed',
        'user',
        NEW.id,
        jsonb_build_object(
            'changed_at', NOW(),
            'requires_change', NEW.raw_app_meta_data->>'requires_password_change'
        ),
        NOW()
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Never block auth operations due to audit logging failures
        RAISE WARNING 'Failed to log password change for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$function$;

-- ============================================================================
-- STEP 2: Add exception handling to all auth trigger functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_password_to_admin_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  user_record RECORD;
BEGIN
  -- Check if user is a system user
  SELECT * INTO user_record 
  FROM public.users 
  WHERE id = NEW.id AND user_type = 'system';
  
  IF FOUND THEN
    -- Password was updated in auth.users, we need to mark it in audit
    INSERT INTO public.audit_logs (
      user_id,
      action,
      entity_type,
      entity_id,
      details,
      created_at
    ) VALUES (
      NEW.id,
      'password_reset',
      'user',
      NEW.id,
      jsonb_build_object(
        'method', 'supabase_auth',
        'timestamp', NOW()
      ),
      NOW()
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Never block auth operations
        RAISE WARNING 'Failed to sync password for admin user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$function$;

-- ============================================================================
-- STEP 3: Ensure handle_auth_user_changes has proper exception handling
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_auth_user_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  -- Handle both INSERT and UPDATE operations
  INSERT INTO public.users (
    id, 
    email, 
    last_sign_in_at, 
    email_confirmed_at,
    email_verified,
    updated_at
  )
  VALUES (
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.email, OLD.email),
    NEW.last_sign_in_at,
    NEW.email_confirmed_at,
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN true ELSE false END,
    NOW()
  )
  ON CONFLICT (id) 
  DO UPDATE SET
    last_sign_in_at = EXCLUDED.last_sign_in_at,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    email_verified = EXCLUDED.email_verified,
    updated_at = NOW()
  WHERE 
    users.last_sign_in_at IS DISTINCT FROM EXCLUDED.last_sign_in_at
    OR users.email_confirmed_at IS DISTINCT FROM EXCLUDED.email_confirmed_at;
    
  RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't block authentication
        RAISE WARNING 'Failed to sync auth user changes for %: %', COALESCE(NEW.id, OLD.id), SQLERRM;
        RETURN NEW;
END;
$function$;

-- ============================================================================
-- STEP 4: Update sync_email_verification with exception handling
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_email_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.email_confirmed_at IS NOT NULL THEN
      UPDATE public.users
         SET email_verified = true,
             updated_at = NOW()
       WHERE id = NEW.id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.email_confirmed_at IS NOT NULL
       AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at) THEN
      UPDATE public.users
         SET email_verified = true,
             updated_at = NOW()
       WHERE id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Don't block auth operations
        RAISE WARNING 'Failed to sync email verification for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$function$;

-- ============================================================================
-- STEP 5: Update sync_auth_to_public_users with better exception handling
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_auth_to_public_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  -- Simple upsert - if ID exists, update; if not, insert
  INSERT INTO public.users (
    id, 
    email, 
    user_type, 
    is_active, 
    email_verified, 
    created_at, 
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'entity'),
    true,
    CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN true ELSE false END,
    COALESCE(NEW.created_at, NOW()),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    email_verified = EXCLUDED.email_verified,
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- If email conflict, just update the existing record
    UPDATE public.users 
    SET updated_at = NOW()
    WHERE id = NEW.id;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but never block auth operations
    RAISE WARNING 'Failed to sync new auth user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

-- ============================================================================
-- STEP 6: Verify all functions are properly configured
-- ============================================================================

DO $$
DECLARE
  v_missing_sec_def INTEGER;
BEGIN
  -- Check that all auth trigger functions have SECURITY DEFINER
  SELECT COUNT(*) INTO v_missing_sec_def
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'sync_auth_password_change',
      'handle_auth_user_changes',
      'sync_email_verification',
      'sync_auth_to_public_users',
      'sync_password_to_admin_users'
    )
    AND p.prosecdef = false;  -- Not security definer
    
  IF v_missing_sec_def > 0 THEN
    RAISE EXCEPTION 'CRITICAL: % auth trigger functions missing SECURITY DEFINER', v_missing_sec_def;
  END IF;
  
  RAISE NOTICE '============================================';
  RAISE NOTICE 'AUTH TRIGGER FUNCTIONS FIXED';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'All auth trigger functions now have SECURITY DEFINER';
  RAISE NOTICE 'All functions have exception handling to prevent auth blocking';
  RAISE NOTICE 'Authentication should now work correctly';
  RAISE NOTICE 'This fixes the "Database error granting user" error';
END $$;
