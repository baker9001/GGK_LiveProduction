/*
  # Fix Auth RLS Initialization for Materials Table

  1. Issue
    - The "System admins can create materials" policy re-evaluates auth.uid() for each row
    - This produces suboptimal query performance at scale
    - The auth function should be wrapped with SELECT to evaluate once per query

  2. Solution
    - Drop the problematic policy
    - Recreate it with optimized auth function call using (select auth.uid())

  3. Performance Impact
    - Significantly improves INSERT performance on materials table
    - Reduces number of auth function calls from O(n) to O(1)
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "System admins can create materials" ON public.materials;

-- Recreate with optimized auth call
CREATE POLICY "System admins can create materials"
ON public.materials
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM admin_users
    WHERE admin_users.id = (select auth.uid())
  )
);
