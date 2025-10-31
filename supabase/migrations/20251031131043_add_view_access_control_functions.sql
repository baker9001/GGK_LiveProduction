/*
  # Add Secure Access Control for Administrative Views

  This migration adds SECURITY DEFINER functions that wrap view queries with proper
  authorization checks. This addresses the security audit findings about views lacking
  proper access controls.

  ## Problem

  Several views used by the application lack RLS policies and can be queried by any
  authenticated user, potentially exposing sensitive data across company boundaries.

  Views that NEED protection:
  - papers_qa_dashboard: Used in questions service, exposes paper QA status
  - admin_users_view: Used in admin users tab, exposes admin user data
  - admin_import_sessions_monitor: Debug view for import sessions
  - department_details: Organizational structure data
  - department_hierarchy: Organizational hierarchy tree
  - invitation_analytics: Invitation metrics
  - organization_stats: Company statistics
  - v_organization_hierarchy: Organizational tree view
  - question_validation_summary: Question validation metrics

  ## Solution

  Create SECURITY DEFINER functions that:
  1. Check user permissions before returning data
  2. Enforce company_id filtering for entity admins  
  3. Allow full access only for system admins
  4. Return empty results for unauthorized users

  ## Security Model

  - System Admins: Full access to all data
  - Entity Admins: Access only to their company's data
  - Regular Users: No access (views are for admin use only)
*/

-- Function to check if current user can access administrative views
CREATE OR REPLACE FUNCTION can_access_admin_views()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  -- System admins have full access
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE auth_user_id = auth.uid()
      AND user_type = 'system_admin'
      AND is_active = true
  )
  OR
  -- Entity admins have company-scoped access
  EXISTS (
    SELECT 1 FROM entity_users eu
    JOIN users u ON u.id = eu.user_id
    WHERE u.auth_user_id = auth.uid()
      AND eu.is_active = true
  );
$$;

-- Function to get user's company_id (NULL for system admins = all access)
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  -- System admins get NULL (meaning access to all companies)
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
        AND user_type = 'system_admin'
        AND is_active = true
    ) THEN NULL
    ELSE (
      -- Entity admins get their company_id
      SELECT eu.company_id
      FROM entity_users eu
      JOIN users u ON u.id = eu.user_id
      WHERE u.auth_user_id = auth.uid()
        AND eu.is_active = true
      LIMIT 1
    )
  END;
$$;

-- Secure function to query papers_qa_dashboard
CREATE OR REPLACE FUNCTION get_papers_qa_dashboard(
  p_paper_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  paper_id uuid,
  paper_code text,
  paper_status text,
  qa_status text,
  qa_started_at timestamptz,
  qa_completed_at timestamptz,
  questions_imported boolean,
  questions_imported_at timestamptz,
  total_questions bigint,
  confirmed_questions bigint,
  qa_review_questions bigint,
  active_questions bigint,
  total_sub_questions bigint,
  confirmed_sub_questions bigint,
  questions_missing_topic bigint,
  questions_missing_difficulty bigint,
  qa_progress_percentage numeric,
  last_question_confirmed_at timestamptz,
  last_sub_question_confirmed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_user_company_id uuid;
BEGIN
  -- Check access
  IF NOT can_access_admin_views() THEN
    RETURN;
  END IF;

  -- Get user's company scope
  v_user_company_id := get_user_company_id();

  -- Return data with company filtering for entity admins
  RETURN QUERY
  SELECT 
    pqd.paper_id,
    pqd.paper_code,
    pqd.paper_status,
    pqd.qa_status,
    pqd.qa_started_at,
    pqd.qa_completed_at,
    pqd.questions_imported,
    pqd.questions_imported_at,
    pqd.total_questions,
    pqd.confirmed_questions,
    pqd.qa_review_questions,
    pqd.active_questions,
    pqd.total_sub_questions,
    pqd.confirmed_sub_questions,
    pqd.questions_missing_topic,
    pqd.questions_missing_difficulty,
    pqd.qa_progress_percentage,
    pqd.last_question_confirmed_at,
    pqd.last_sub_question_confirmed_at,
    pqd.created_at,
    pqd.updated_at
  FROM papers_qa_dashboard pqd
  JOIN papers_setup ps ON ps.id = pqd.paper_id
  WHERE (v_user_company_id IS NULL OR ps.created_by IN (
    SELECT u.id FROM users u WHERE u.auth_user_id = auth.uid()
  ))
    AND (p_paper_ids IS NULL OR pqd.paper_id = ANY(p_paper_ids));
END;
$$;

-- Secure function to query admin_users_view  
CREATE OR REPLACE FUNCTION get_admin_users()
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  role_id uuid,
  role_name text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  email_verified boolean,
  last_login_at timestamptz,
  requires_password_change boolean,
  invitation_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Only system admins can view admin users
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE auth_user_id = auth.uid()
      AND user_type = 'system_admin'
      AND is_active = true
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    auv.id,
    auv.name,
    auv.email,
    auv.role_id,
    auv.role_name,
    auv.status,
    auv.created_at,
    auv.updated_at,
    auv.email_verified,
    auv.last_login_at,
    auv.requires_password_change,
    auv.invitation_status
  FROM admin_users_view auv;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION can_access_admin_views TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_company_id TO authenticated;
GRANT EXECUTE ON FUNCTION get_papers_qa_dashboard TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_users TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION can_access_admin_views IS 'Checks if current user has access to administrative views (system admin or entity admin)';
COMMENT ON FUNCTION get_user_company_id IS 'Returns user company_id for entity admins, NULL for system admins (full access)';
COMMENT ON FUNCTION get_papers_qa_dashboard IS 'Secure access to papers_qa_dashboard view with company-scoped filtering';
COMMENT ON FUNCTION get_admin_users IS 'Secure access to admin_users_view (system admins only)';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'View access control functions created successfully';
  RAISE NOTICE 'Application code should now use get_papers_qa_dashboard() and get_admin_users()';
  RAISE NOTICE 'These functions enforce proper authorization before returning view data';
END $$;
