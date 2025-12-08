/*
  # Fix Function Search Path Vulnerabilities
  
  1. Changes
    - Add explicit search_path to all functions with role mutable search_path
    - Prevents SQL injection via search_path manipulation
    
  2. Security Impact
    - Functions will only operate on public schema objects
    - Protects against malicious schema injection attacks
*/

-- Fix all vulnerable functions
DO $$
DECLARE
  func_record RECORD;
  func_signature text;
  func_array text[] := ARRAY[
    'create_user_with_profile',
    'get_email_stats',
    'calculate_percentage_score',
    'get_available_licenses_for_scope',
    'generate_ai_study_plan',
    'validate_marks_allocation',
    'get_student_counts_by_org',
    'update_context_mastery_cache',
    'detect_answer_format',
    'validate_password_reset_user',
    'validate_org_hierarchy',
    'get_question_counts_by_paper',
    'auto_populate_question_display_flags',
    'is_question_ready_for_qa',
    'batch_update_question_display_flags'
  ];
BEGIN
  -- Try to alter each function with various possible signatures
  FOREACH func_signature IN ARRAY func_array
  LOOP
    BEGIN
      -- Try without parameters
      EXECUTE format('ALTER FUNCTION IF EXISTS %I() SET search_path = public, pg_temp', func_signature);
      RAISE NOTICE 'Set search_path for function: %', func_signature;
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        -- Try with uuid parameter
        EXECUTE format('ALTER FUNCTION IF EXISTS %I(uuid) SET search_path = public, pg_temp', func_signature);
        RAISE NOTICE 'Set search_path for function (uuid): %', func_signature;
      EXCEPTION WHEN OTHERS THEN
        BEGIN
          -- Try with text parameter
          EXECUTE format('ALTER FUNCTION IF EXISTS %I(text) SET search_path = public, pg_temp', func_signature);
          RAISE NOTICE 'Set search_path for function (text): %', func_signature;
        EXCEPTION WHEN OTHERS THEN
          BEGIN
            -- Try with multiple parameters
            EXECUTE format('ALTER FUNCTION IF EXISTS %I(uuid, text) SET search_path = public, pg_temp', func_signature);
            RAISE NOTICE 'Set search_path for function (uuid, text): %', func_signature;
          EXCEPTION WHEN OTHERS THEN
            BEGIN
              -- Try with jsonb parameter
              EXECUTE format('ALTER FUNCTION IF EXISTS %I(jsonb) SET search_path = public, pg_temp', func_signature);
              RAISE NOTICE 'Set search_path for function (jsonb): %', func_signature;
            EXCEPTION WHEN OTHERS THEN
              BEGIN
                -- Try with numeric parameters
                EXECUTE format('ALTER FUNCTION IF EXISTS %I(numeric, numeric) SET search_path = public, pg_temp', func_signature);
                RAISE NOTICE 'Set search_path for function (numeric, numeric): %', func_signature;
              EXCEPTION WHEN OTHERS THEN
                BEGIN
                  -- Try with integer parameters  
                  EXECUTE format('ALTER FUNCTION IF EXISTS %I(integer) SET search_path = public, pg_temp', func_signature);
                  RAISE NOTICE 'Set search_path for function (integer): %', func_signature;
                EXCEPTION WHEN OTHERS THEN
                  RAISE NOTICE 'Could not set search_path for function %', func_signature;
                END;
              END;
            END;
          END;
        END;
      END;
    END;
  END LOOP;

  -- Also try to set search_path by querying pg_proc for exact signatures
  FOR func_record IN 
    SELECT 
      p.proname,
      pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
    AND p.proname = ANY(func_array)
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER FUNCTION %I(%s) SET search_path = public, pg_temp',
        func_record.proname,
        func_record.args
      );
      RAISE NOTICE 'Set search_path for % with args: %', func_record.proname, func_record.args;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not set search_path for %(%): %', func_record.proname, func_record.args, SQLERRM;
    END;
  END LOOP;
END $$;