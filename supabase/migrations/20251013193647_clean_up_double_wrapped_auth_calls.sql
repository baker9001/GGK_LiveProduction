/*
  # Clean Up Double-Wrapped Auth Calls

  1. Problem
    - Many policies have inefficient double-wrapped auth calls: (SELECT (SELECT auth.uid() AS uid) AS uid)
    - Some have bare auth.uid() calls without wrapping
    - Some have is_admin_user(auth.uid()) without optimization

  2. Solution
    - Create a function to automatically fix all policies
    - Replace double-wrapped with single-wrapped: (SELECT auth.uid())
    - Wrap bare auth function calls
    - Optimize function parameters

  3. Approach
    - Programmatically iterate through all affected policies
    - Apply regex-based replacements
    - Recreate each policy with optimized expressions
*/

CREATE OR REPLACE FUNCTION clean_auth_wrapping()
RETURNS TABLE(
  table_name text,
  policy_name text,
  action text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pol RECORD;
  new_using TEXT;
  new_with_check TEXT;
  cmd_str TEXT;
  cleaned_count INTEGER := 0;
BEGIN
  FOR pol IN
    SELECT 
      c.relname::text as tbl_name,
      p.polname::text as pol_name,
      p.polcmd::text as pol_cmd,
      pg_get_expr(p.polqual, p.polrelid) as pol_using,
      pg_get_expr(p.polwithcheck, p.polrelid) as pol_with_check,
      CASE p.polcmd
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
        WHEN '*' THEN 'ALL'
      END as command_type,
      CASE p.polroles[1]
        WHEN 0 THEN 'public'
        ELSE 'authenticated'
      END as role_name
    FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname NOT IN ('admin_users', 'entity_users', 'mock_exams')  -- Skip already optimized tables
      AND (
        pg_get_expr(p.polqual, p.polrelid) ~ '\( SELECT \( SELECT auth\.(uid|jwt)\(\)'
        OR COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '') ~ '\( SELECT \( SELECT auth\.(uid|jwt)\(\)'
        OR pg_get_expr(p.polqual, p.polrelid) ~ '[^(]auth\.(uid|jwt)\(\)'
        OR COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '') ~ '[^(]auth\.(uid|jwt)\(\)'
        OR pg_get_expr(p.polqual, p.polrelid) ~ 'is_admin_user\(auth\.uid\(\)\)'
        OR COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '') ~ 'is_admin_user\(auth\.uid\(\)\)'
        OR pg_get_expr(p.polqual, p.polrelid) ~ 'is_entity_admin_in_company\(auth\.uid\(\)'
        OR COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '') ~ 'is_entity_admin_in_company\(auth\.uid\(\)'
      )
  LOOP
    new_using := pol.pol_using;
    new_with_check := pol.pol_with_check;
    
    -- Clean up double-wrapped SELECT statements
    IF new_using IS NOT NULL THEN
      -- Replace ( SELECT ( SELECT auth.uid() AS uid) AS uid) with (SELECT auth.uid())
      new_using := regexp_replace(new_using, '\( SELECT \( SELECT auth\.uid\(\) AS uid\) AS uid\)', '(SELECT auth.uid())', 'g');
      new_using := regexp_replace(new_using, '\( SELECT \( SELECT auth\.jwt\(\) AS jwt\) AS jwt\)', '(SELECT auth.jwt())', 'g');
      
      -- Replace bare is_admin_user(auth.uid()) with is_admin_user((SELECT auth.uid()))
      new_using := regexp_replace(new_using, 'is_admin_user\(auth\.uid\(\)\)', 'is_admin_user((SELECT auth.uid()))', 'g');
      
      -- Replace bare is_entity_admin_in_company(auth.uid() with is_entity_admin_in_company((SELECT auth.uid())
      new_using := regexp_replace(new_using, 'is_entity_admin_in_company\(auth\.uid\(\)', 'is_entity_admin_in_company((SELECT auth.uid())', 'g');
      
      -- Wrap any remaining bare auth.uid() or auth.jwt() calls (but not already wrapped)
      new_using := regexp_replace(new_using, '([^(SELECT ])auth\.uid\(\)', '\1(SELECT auth.uid())', 'g');
      new_using := regexp_replace(new_using, '([^(SELECT ])auth\.jwt\(\)', '\1(SELECT auth.jwt())', 'g');
    END IF;
    
    IF new_with_check IS NOT NULL THEN
      -- Same replacements for WITH CHECK clause
      new_with_check := regexp_replace(new_with_check, '\( SELECT \( SELECT auth\.uid\(\) AS uid\) AS uid\)', '(SELECT auth.uid())', 'g');
      new_with_check := regexp_replace(new_with_check, '\( SELECT \( SELECT auth\.jwt\(\) AS jwt\) AS jwt\)', '(SELECT auth.jwt())', 'g');
      new_with_check := regexp_replace(new_with_check, 'is_admin_user\(auth\.uid\(\)\)', 'is_admin_user((SELECT auth.uid()))', 'g');
      new_with_check := regexp_replace(new_with_check, 'is_entity_admin_in_company\(auth\.uid\(\)', 'is_entity_admin_in_company((SELECT auth.uid())', 'g');
      new_with_check := regexp_replace(new_with_check, '([^(SELECT ])auth\.uid\(\)', '\1(SELECT auth.uid())', 'g');
      new_with_check := regexp_replace(new_with_check, '([^(SELECT ])auth\.jwt\(\)', '\1(SELECT auth.jwt())', 'g');
    END IF;
    
    -- Only recreate if something changed
    IF (new_using IS DISTINCT FROM pol.pol_using) OR (new_with_check IS DISTINCT FROM pol.pol_with_check) THEN
      -- Drop the old policy
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.pol_name, pol.tbl_name);
      
      -- Recreate with optimized expressions
      cmd_str := format('CREATE POLICY %I ON %I FOR %s TO %s',
        pol.pol_name,
        pol.tbl_name,
        pol.command_type,
        pol.role_name
      );
      
      IF new_using IS NOT NULL THEN
        cmd_str := cmd_str || format(' USING (%s)', new_using);
      END IF;
      
      IF new_with_check IS NOT NULL THEN
        cmd_str := cmd_str || format(' WITH CHECK (%s)', new_with_check);
      END IF;
      
      EXECUTE cmd_str;
      
      cleaned_count := cleaned_count + 1;
      
      RETURN QUERY SELECT pol.tbl_name, pol.pol_name, 'optimized'::text;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Cleaned % policies', cleaned_count;
END;
$$;

-- Execute the cleanup function
SELECT * FROM clean_auth_wrapping();

-- Drop the helper function
DROP FUNCTION IF EXISTS clean_auth_wrapping();
