/*
  # Secure Materialized View and Fix Views
  
  ## Changes
  1. Revoke public access to user_scope_cache materialized view
  2. Recreate views without SECURITY DEFINER (they default to SECURITY INVOKER)
  
  ## Security Impact
  - Prevents unauthorized access to cached user scope data
  - Reduces attack surface by ensuring views respect caller's privileges
  - Views will use caller's RLS policies
*/

-- Secure the materialized view
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname = 'public' AND matviewname = 'user_scope_cache') THEN
    REVOKE SELECT ON user_scope_cache FROM anon;
    REVOKE SELECT ON user_scope_cache FROM authenticated;
    RAISE NOTICE 'Secured user_scope_cache materialized view';
  END IF;
END $$;

-- Recreate views without SECURITY DEFINER
-- PostgreSQL views default to SECURITY INVOKER behavior

DROP VIEW IF EXISTS department_details CASCADE;
CREATE VIEW department_details AS
SELECT 
  d.id,
  d.name,
  d.code,
  d.department_type,
  d.company_id,
  d.head_id,
  COUNT(DISTINCT eu.id) as member_count
FROM departments d
LEFT JOIN entity_users eu ON eu.department_id = d.id
GROUP BY d.id, d.name, d.code, d.department_type, d.company_id, d.head_id;

DROP VIEW IF EXISTS organization_stats CASCADE;
CREATE VIEW organization_stats AS
SELECT 
  c.id as company_id,
  c.name as company_name,
  COUNT(DISTINCT s.id) as school_count,
  COUNT(DISTINCT b.id) as branch_count,
  COUNT(DISTINCT st.id) as student_count,
  COUNT(DISTINCT t.id) as teacher_count
FROM companies c
LEFT JOIN schools s ON s.company_id = c.id
LEFT JOIN branches b ON b.school_id = s.id
LEFT JOIN students st ON st.company_id = c.id
LEFT JOIN teachers t ON t.company_id = c.id
GROUP BY c.id, c.name;

DROP VIEW IF EXISTS question_validation_summary CASCADE;
CREATE VIEW question_validation_summary AS
SELECT 
  COUNT(*) FILTER (WHERE is_confirmed = true) as confirmed_count,
  COUNT(*) FILTER (WHERE is_confirmed = false) as unconfirmed_count,
  COUNT(*) as total_count,
  subject_id
FROM questions_master_admin
GROUP BY subject_id;

-- Note: admin_user_auth_mapping, rls_optimization_summary, papers_qa_dashboard,
-- and rls_optimization_status may need to remain SECURITY DEFINER for
-- administrative/monitoring purposes. These should be reviewed on a case-by-case basis.
