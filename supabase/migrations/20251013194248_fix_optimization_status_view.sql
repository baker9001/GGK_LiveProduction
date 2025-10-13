/*
  # Fix RLS Optimization Status View

  1. Issue
    - Policies with "( SELECT auth.uid() AS uid)" are incorrectly flagged
    - These ARE properly optimized (subquery evaluates once)
    - The space after opening paren is PostgreSQL's standard formatting

  2. Solution
    - Update view to correctly identify optimized patterns
    - Include variations: (SELECT, ( SELECT
    - With or without AS alias
*/

CREATE OR REPLACE VIEW rls_optimization_status AS
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE 
    -- Properly optimized - subquery with SELECT (evaluates once per query)
    -- Matches: (SELECT auth.uid()), ( SELECT auth.uid()), (SELECT auth.uid() AS uid), etc.
    WHEN (qual ~ '\(\s*SELECT\s+auth\.(uid|jwt)\(\)' OR with_check ~ '\(\s*SELECT\s+auth\.(uid|jwt)\(\)')
      AND qual !~ 'SELECT\s+\(\s*SELECT\s+auth\.(uid|jwt)\(\)'  -- Exclude double-wrapped
      AND with_check !~ 'SELECT\s+\(\s*SELECT\s+auth\.(uid|jwt)\(\)'
    THEN 'Optimized'
    
    -- Has auth calls but no SELECT wrapper (bare calls that evaluate per row)
    WHEN (qual ~ '[^S][^E][^L][^E][^C][^T]\s+auth\.(uid|jwt)\(\)' 
      OR with_check ~ '[^S][^E][^L][^E][^C][^T]\s+auth\.(uid|jwt)\(\)')
    THEN 'Needs Optimization'
    
    -- No auth function calls
    ELSE 'No Auth Calls'
  END as optimization_status,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY 
  tablename, 
  policyname;

COMMENT ON VIEW rls_optimization_status IS 
  'View to monitor RLS policy optimization. Optimized policies use subqueries like (SELECT auth.uid()) or ( SELECT auth.uid() AS uid) which evaluate once per query instead of per row.';

-- Summary statistics
CREATE OR REPLACE VIEW rls_optimization_summary AS
SELECT 
  optimization_status,
  COUNT(*) as policy_count,
  COUNT(DISTINCT tablename) as affected_tables,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) as percentage
FROM rls_optimization_status
GROUP BY optimization_status
ORDER BY 
  CASE optimization_status
    WHEN 'Needs Optimization' THEN 1
    WHEN 'Optimized' THEN 2
    ELSE 3
  END;

COMMENT ON VIEW rls_optimization_summary IS 
  'Summary view showing overall RLS optimization status across all policies.';
