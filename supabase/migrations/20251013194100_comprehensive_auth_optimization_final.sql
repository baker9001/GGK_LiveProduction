/*
  # Comprehensive Auth Call Optimization - Final Fix

  1. Problem
    - Hundreds of RLS policies have inefficient auth function calls
    - Double-wrapped: ( SELECT ( SELECT auth.uid() AS uid) AS uid)
    - Bare calls: auth.uid() without SELECT wrapper
    - Function calls with bare auth: is_admin_user(auth.uid())

  2. Solution
    - Single-wrapped optimization: (SELECT auth.uid())
    - Function calls optimized: is_admin_user((SELECT auth.uid()))
    - Systematic regex-based replacement

  3. Scope
    - All tables in public schema
    - All policies with auth.uid() or auth.jwt() calls
*/

-- Function to clean and optimize a single expression
CREATE OR REPLACE FUNCTION optimize_auth_expression(expr TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF expr IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- First, clean up double-wrapped SELECT statements
  -- Replace ( SELECT ( SELECT auth.uid() AS uid) AS uid) with temporary marker
  expr := regexp_replace(expr, '\(\s*SELECT\s+\(\s*SELECT\s+auth\.uid\(\)\s+AS\s+uid\s*\)\s+AS\s+uid\s*\)', '___OPTIMIZED_UID___', 'g');
  expr := regexp_replace(expr, '\(\s*SELECT\s+\(\s*SELECT\s+auth\.jwt\(\)\s+AS\s+jwt\s*\)\s+AS\s+jwt\s*\)', '___OPTIMIZED_JWT___', 'g');
  
  -- Replace already optimized ( SELECT auth.uid() AS uid) with marker
  expr := regexp_replace(expr, '\(\s*SELECT\s+auth\.uid\(\)\s+AS\s+uid\s*\)', '___OPTIMIZED_UID___', 'g');
  expr := regexp_replace(expr, '\(\s*SELECT\s+auth\.jwt\(\)\s+AS\s+jwt\s*\)', '___OPTIMIZED_JWT___', 'g');
  
  -- Replace already optimized (SELECT auth.uid()) with marker
  expr := regexp_replace(expr, '\(SELECT\s+auth\.uid\(\)\)', '___OPTIMIZED_UID___', 'g');
  expr := regexp_replace(expr, '\(SELECT\s+auth\.jwt\(\)\)', '___OPTIMIZED_JWT___', 'g');
  
  -- Now replace all remaining bare auth.uid() with optimized version
  expr := regexp_replace(expr, 'auth\.uid\(\)', '___OPTIMIZED_UID___', 'g');
  expr := regexp_replace(expr, 'auth\.jwt\(\)', '___OPTIMIZED_JWT___', 'g');
  
  -- Replace markers with final optimized form
  expr := replace(expr, '___OPTIMIZED_UID___', '(SELECT auth.uid())');
  expr := replace(expr, '___OPTIMIZED_JWT___', '(SELECT auth.jwt())');
  
  RETURN expr;
END;
$$;

-- Main function to optimize all policies
DO $$
DECLARE
  pol RECORD;
  new_using TEXT;
  new_with_check TEXT;
  cmd_str TEXT;
  role_name TEXT;
  optimized_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting comprehensive RLS optimization...';
  
  FOR pol IN
    SELECT 
      n.nspname::text as schema_name,
      c.relname::text as table_name,
      p.polname::text as policy_name,
      CASE p.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
      END as command_type,
      pg_get_expr(p.polqual, p.polrelid) as using_clause,
      pg_get_expr(p.polwithcheck, p.polrelid) as with_check_clause,
      CASE 
        WHEN p.polroles[1] = 0 THEN 'public'
        ELSE 'authenticated'
      END as role_type
    FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND (
        pg_get_expr(p.polqual, p.polrelid) ~ 'auth\.(uid|jwt)\(\)'
        OR COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '') ~ 'auth\.(uid|jwt)\(\)'
      )
    ORDER BY c.relname, p.polname
  LOOP
    -- Optimize the expressions
    new_using := optimize_auth_expression(pol.using_clause);
    new_with_check := optimize_auth_expression(pol.with_check_clause);
    
    -- Only proceed if something changed
    IF (new_using IS DISTINCT FROM pol.using_clause) OR (new_with_check IS DISTINCT FROM pol.with_check_clause) THEN
      BEGIN
        -- Drop the existing policy
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
          pol.policy_name, 
          pol.schema_name, 
          pol.table_name
        );
        
        -- Build CREATE POLICY statement
        cmd_str := format('CREATE POLICY %I ON %I.%I FOR %s TO %s',
          pol.policy_name,
          pol.schema_name,
          pol.table_name,
          pol.command_type,
          pol.role_type
        );
        
        -- Add USING clause if exists
        IF new_using IS NOT NULL THEN
          cmd_str := cmd_str || format(' USING (%s)', new_using);
        END IF;
        
        -- Add WITH CHECK clause if exists
        IF new_with_check IS NOT NULL THEN
          cmd_str := cmd_str || format(' WITH CHECK (%s)', new_with_check);
        END IF;
        
        -- Execute the CREATE POLICY statement
        EXECUTE cmd_str;
        
        optimized_count := optimized_count + 1;
        
        IF optimized_count % 10 = 0 THEN
          RAISE NOTICE 'Optimized % policies...', optimized_count;
        END IF;
        
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to optimize policy % on table %: %', 
          pol.policy_name, pol.table_name, SQLERRM;
      END;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Optimization complete! Total policies optimized: %', optimized_count;
END;
$$;

-- Clean up the helper function
DROP FUNCTION IF EXISTS optimize_auth_expression(TEXT);
