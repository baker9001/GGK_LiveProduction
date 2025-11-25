/*
  # Remove Duplicate RLS Policies on questions_master_admin
  
  ## Problem
  The questions_master_admin table has duplicate RLS policies for INSERT, UPDATE, DELETE,
  and SELECT operations. This creates unnecessary overhead during RLS policy evaluation.
  
  ## Duplicate Policies Found
  - INSERT: "System admins can create questions" + "System admins can create questions_master_admin"
  - UPDATE: "System admins can update questions" + "System admins can update all questions_master_admin"
  - DELETE: "System admins can delete questions" + "System admins can delete questions_master_admin"
  - SELECT: Multiple policies for viewing questions
  
  ## Solution
  Keep the more descriptive/specific policy names and remove the generic ones.
  Consolidate overlapping policies where one is redundant.
*/

-- ============================================================================
-- STEP 1: Remove duplicate INSERT policies
-- ============================================================================

DROP POLICY IF EXISTS "System admins can create questions" ON questions_master_admin;

-- Keep: "System admins can create questions_master_admin" (more specific name)

-- ============================================================================
-- STEP 2: Remove duplicate UPDATE policies  
-- ============================================================================

DROP POLICY IF EXISTS "System admins can update questions" ON questions_master_admin;

-- Keep: "System admins can update all questions_master_admin" (more descriptive)

-- ============================================================================
-- STEP 3: Remove duplicate DELETE policies
-- ============================================================================

DROP POLICY IF EXISTS "System admins can delete questions" ON questions_master_admin;

-- Keep: "System admins can delete questions_master_admin" (more specific name)

-- ============================================================================
-- STEP 4: Consolidate SELECT policies
-- ============================================================================

-- Remove generic policy, keep specific ones
DROP POLICY IF EXISTS "System admins can view questions" ON questions_master_admin;

-- Keep: "System admins can view all questions_master_admin" (admin access)
-- Keep: "Authenticated users can view questions" (allows any authenticated user to query)
-- Keep: "Authenticated users can view active questions" (filters to active status)

-- Note: Having multiple SELECT policies is OK as they are ORed together,
-- but "Authenticated users can view questions" with USING (true) makes 
-- "Authenticated users can view active questions" redundant

DROP POLICY IF EXISTS "Authenticated users can view active questions" ON questions_master_admin;

-- ============================================================================
-- STEP 5: Verify policy consolidation
-- ============================================================================

DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policy
  WHERE polrelid = 'questions_master_admin'::regclass;
  
  RAISE NOTICE 'questions_master_admin now has % RLS policies', policy_count;
END $$;
