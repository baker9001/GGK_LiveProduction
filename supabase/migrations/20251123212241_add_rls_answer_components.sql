/*
  # Add RLS to Answer Components Tables

  ## Problem
  The answer_components and answer_requirements tables have no RLS policies,
  allowing anyone with database access to read or modify answer data.

  ## Solution
  Enable RLS and add appropriate policies for system admins, teachers, and students.

  ## Security Model
  - System admins: Full access (read/write)
  - Teachers: Read-only access
  - Students: No direct access (access through questions only)

  ## Tables Affected
  - answer_components
  - answer_requirements
*/

-- ============================================================================
-- STEP 1: Enable RLS
-- ============================================================================

ALTER TABLE answer_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_requirements ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: System Admin Policies (Full Access)
-- ============================================================================

CREATE POLICY "System admins can manage answer components"
  ON answer_components
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
        AND users.user_type = 'system_admin'
        AND users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
        AND users.user_type = 'system_admin'
        AND users.is_active = true
    )
  );

CREATE POLICY "System admins can manage answer requirements"
  ON answer_requirements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
        AND users.user_type = 'system_admin'
        AND users.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
        AND users.user_type = 'system_admin'
        AND users.is_active = true
    )
  );

-- ============================================================================
-- STEP 3: Teacher Policies (Read-Only)
-- ============================================================================

CREATE POLICY "Teachers can view answer components"
  ON answer_components
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      INNER JOIN teachers t ON t.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
        AND u.user_type = 'teacher'
        AND u.is_active = true
        AND t.is_active = true
    )
  );

CREATE POLICY "Teachers can view answer requirements"
  ON answer_requirements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      INNER JOIN teachers t ON t.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
        AND u.user_type = 'teacher'
        AND u.is_active = true
        AND t.is_active = true
    )
  );

-- ============================================================================
-- STEP 4: Verify RLS is Working
-- ============================================================================

CREATE OR REPLACE FUNCTION test_answer_components_rls()
RETURNS TABLE(
  table_name text,
  rls_enabled boolean,
  policy_count integer,
  status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'answer_components'::text,
    relrowsecurity,
    (SELECT COUNT(*)::integer FROM pg_policies WHERE tablename = 'answer_components'),
    CASE
      WHEN relrowsecurity AND (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'answer_components') >= 2
      THEN 'OK: RLS enabled with policies'
      WHEN relrowsecurity
      THEN 'WARNING: RLS enabled but no policies'
      ELSE 'ERROR: RLS not enabled'
    END
  FROM pg_class
  WHERE relname = 'answer_components';

  RETURN QUERY
  SELECT
    'answer_requirements'::text,
    relrowsecurity,
    (SELECT COUNT(*)::integer FROM pg_policies WHERE tablename = 'answer_requirements'),
    CASE
      WHEN relrowsecurity AND (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'answer_requirements') >= 2
      THEN 'OK: RLS enabled with policies'
      WHEN relrowsecurity
      THEN 'WARNING: RLS enabled but no policies'
      ELSE 'ERROR: RLS not enabled'
    END
  FROM pg_class
  WHERE relname = 'answer_requirements';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 5: Comments for Documentation
-- ============================================================================

COMMENT ON POLICY "System admins can manage answer components" ON answer_components IS
  'System administrators have full access to manage answer components';

COMMENT ON POLICY "Teachers can view answer components" ON answer_components IS
  'Teachers can view answer components for their questions and papers';

COMMENT ON POLICY "System admins can manage answer requirements" ON answer_requirements IS
  'System administrators have full access to manage answer requirements';

COMMENT ON POLICY "Teachers can view answer requirements" ON answer_requirements IS
  'Teachers can view answer requirements for understanding marking logic';
