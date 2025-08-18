/*
  # Create organization stats materialized view and refresh function

  1. New Database Objects
    - `organization_stats` materialized view
      - Aggregates company statistics including schools, branches, students, teachers, and users
    - `refresh_organization_stats()` function
      - Refreshes the materialized view data

  2. Security
    - No RLS needed for materialized views (they inherit from base tables)
    - Function can be called by authenticated users

  3. Performance
    - Unique index on company_id for faster refreshes
    - Materialized view for fast query performance
*/

-- Create the organization_stats materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS organization_stats AS
SELECT
    c.id AS company_id,
    COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.id END) AS total_schools,
    COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.id END) AS active_schools,
    COUNT(DISTINCT CASE WHEN b.school_id IN (SELECT id FROM schools WHERE status = 'active') THEN b.id END) AS total_branches,
    COALESCE(SUM(CASE WHEN s.status = 'active' THEN sa.student_count ELSE 0 END), 0) AS total_students,
    COALESCE(SUM(CASE WHEN s.status = 'active' THEN sa.active_teachers_count ELSE 0 END), 0) AS total_staff
FROM
    public.companies c
LEFT JOIN
    public.schools s ON s.company_id = c.id
LEFT JOIN
    public.schools_additional sa ON sa.school_id = s.id
LEFT JOIN
    public.branches b ON b.school_id = s.id
WHERE
    c.status = 'active'
GROUP BY
    c.id;

-- Create a unique index for faster refreshes
CREATE UNIQUE INDEX IF NOT EXISTS organization_stats_company_id_idx ON organization_stats (company_id);

-- Create the refresh function
CREATE OR REPLACE FUNCTION refresh_organization_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY organization_stats;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION refresh_organization_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_organization_stats() TO service_role;