/*
  # Remove Duplicate and Unnecessary Policies

  ## Overview
  Removes duplicate policies that were created in multiple migrations.

  ## Tables Cleaned
  - audit_logs: Has 2 duplicate "Service role full access" policies
  
  ## Note
  We keep service_role policies as they are for system operations.
  We only remove exact duplicates.
*/

-- ============================================================================
-- AUDIT_LOGS - Remove Duplicate Policy
-- ============================================================================

-- Keep only one service role policy
DROP POLICY IF EXISTS "Service role full access to audit_logs" ON audit_logs;

-- The policy "Service role has full access to audit_logs" remains

-- Note: All service_role policies with USING (true) are acceptable because
-- the service_role is not accessible to authenticated users. It's used for
-- system operations and edge functions with elevated privileges.
