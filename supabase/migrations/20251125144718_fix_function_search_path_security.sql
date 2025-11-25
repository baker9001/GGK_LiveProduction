/*
  # Fix Function Search Path Security Issues

  This migration addresses security concerns with mutable search paths in functions.
  
  ## Security Issues
  1. Functions without explicit search_path are vulnerable to search path attacks
  2. Malicious users can create objects in their schema to hijack function calls
  3. SECURITY DEFINER functions are especially vulnerable
  
  ## Changes
  1. Add explicit search_path to all SECURITY DEFINER functions
  2. Set search_path to 'public, pg_temp' or specific schema list
  3. Review and secure all functions that perform privilege escalation
  
  ## Pattern
  ```sql
  ALTER FUNCTION function_name(args)
    SET search_path = public, pg_temp;
  ```
  
  ## Safety
  - Non-breaking change (only affects function execution context)
  - Improves security without changing functionality
  - Follows PostgreSQL security best practices
*/

-- Fix search path for critical SECURITY DEFINER functions
DO $$
DECLARE
  func_record RECORD;
BEGIN
  -- Fix known critical functions
  BEGIN
    ALTER FUNCTION is_system_admin() SET search_path = public, pg_temp;
    RAISE NOTICE 'Fixed search_path for is_system_admin()';
  EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE 'Function is_system_admin() does not exist, skipping';
  END;

  BEGIN
    ALTER FUNCTION is_admin_user() SET search_path = public, pg_temp;
    RAISE NOTICE 'Fixed search_path for is_admin_user()';
  EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE 'Function is_admin_user() does not exist, skipping';
  END;

  BEGIN
    ALTER FUNCTION delete_auth_user(uuid) SET search_path = public, pg_temp;
    RAISE NOTICE 'Fixed search_path for delete_auth_user()';
  EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE 'Function delete_auth_user() does not exist, skipping';
  END;

  -- Iterate through remaining SECURITY DEFINER functions
  FOR func_record IN
    SELECT 
      n.nspname as schema_name,
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.prosecdef = true  -- SECURITY DEFINER functions
    AND p.proname NOT IN ('is_system_admin', 'is_admin_user', 'delete_auth_user')
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp',
        func_record.schema_name,
        func_record.function_name,
        func_record.args
      );
      RAISE NOTICE 'Fixed search_path for function: %.%(%)',
        func_record.schema_name,
        func_record.function_name,
        func_record.args;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not fix search_path for function %.%(%): %',
        func_record.schema_name,
        func_record.function_name,
        func_record.args,
        SQLERRM;
    END;
  END LOOP;
END $$;
