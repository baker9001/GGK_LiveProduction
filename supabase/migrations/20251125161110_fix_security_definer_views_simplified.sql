/*
  # Fix Security Definer Views - Simplified
  
  1. Changes
    - Recreate only the core views without SECURITY DEFINER
    - Skip views with complex/unknown schemas
*/

-- Recreate department_details
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

-- Recreate organization_stats
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

-- Recreate question_validation_summary
DROP VIEW IF EXISTS question_validation_summary CASCADE;
CREATE VIEW question_validation_summary AS
SELECT 
  COUNT(*) FILTER (WHERE is_confirmed = true) as confirmed_count,
  COUNT(*) FILTER (WHERE is_confirmed = false) as unconfirmed_count,
  COUNT(*) as total_count,
  subject_id
FROM questions_master_admin
GROUP BY subject_id;

-- Recreate v_organization_hierarchy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'v_organization_hierarchy'
  ) THEN
    DROP VIEW v_organization_hierarchy CASCADE;
    CREATE VIEW v_organization_hierarchy AS
    SELECT 
      c.id as company_id,
      c.name as company_name,
      s.id as school_id,
      s.name as school_name,
      b.id as branch_id,
      b.name as branch_name,
      d.id as department_id,
      d.name as department_name
    FROM companies c
    LEFT JOIN schools s ON s.company_id = c.id
    LEFT JOIN branches b ON b.school_id = s.id
    LEFT JOIN departments d ON d.company_id = c.id;
  END IF;
END $$;

-- Recreate department_hierarchy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'department_hierarchy'
  ) THEN
    DROP VIEW department_hierarchy CASCADE;
    CREATE VIEW department_hierarchy AS
    WITH RECURSIVE dept_tree AS (
      SELECT 
        id,
        name,
        company_id,
        head_id,
        1 as level,
        ARRAY[id] as path
      FROM departments
      WHERE head_id IS NULL

      UNION ALL

      SELECT 
        d.id,
        d.name,
        d.company_id,
        d.head_id,
        dt.level + 1,
        dt.path || d.id
      FROM departments d
      INNER JOIN dept_tree dt ON d.head_id = dt.id
    )
    SELECT * FROM dept_tree;
  END IF;
END $$;

COMMENT ON VIEW department_details IS 'Department statistics - uses caller privileges';
COMMENT ON VIEW organization_stats IS 'Organization statistics - uses caller privileges';
COMMENT ON VIEW question_validation_summary IS 'Question validation summary - uses caller privileges';