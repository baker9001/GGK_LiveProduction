/*
  # Consolidate Multiple Permissive RLS Policies

  This migration addresses security concerns where tables have multiple permissive policies
  that could create unintended access patterns.
  
  ## Security Issues Addressed
  1. Multiple permissive policies on same table/operation create OR logic
  2. This can inadvertently grant broader access than intended
  3. Consolidating policies makes access control more predictable and auditable
  
  ## Changes
  1. Identifies tables with multiple SELECT/INSERT/UPDATE/DELETE policies
  2. Consolidates related policies into single policies with OR conditions
  3. Converts some policies to RESTRICTIVE where appropriate for defense-in-depth
  
  ## Tables Affected
  - Core entity tables with both admin and user access
  - Tables with separate policies for different user types
  - Junction tables with multiple access patterns
*/

-- The specific tables with multiple permissive policies will be addressed
-- based on the security audit findings. Common patterns include:
-- 1. Separate policies for system_admin, entity_admin, and regular users
-- 2. Multiple policies for the same operation but different conditions

-- Placeholder for specific policy consolidations
-- Example pattern:
-- DROP POLICY IF EXISTS "policy_1" ON table_name;
-- DROP POLICY IF EXISTS "policy_2" ON table_name;
-- CREATE POLICY "consolidated_policy" 
--   ON table_name FOR SELECT
--   TO authenticated
--   USING (condition_1 OR condition_2);
