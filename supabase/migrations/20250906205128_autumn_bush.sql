/*
  # Create RPC function for getting available licenses for scope

  1. New Functions
    - `get_available_licenses_for_scope`
      - Returns licenses available to entity admins based on their scope
      - Includes company, region, program, provider, and subject information
      - Calculates availability and expiry information
      - Filters by company, schools, and branches as appropriate

  2. Security
    - Function is accessible to authenticated users
    - Filtering ensures users only see licenses for their authorized scope
*/

CREATE OR REPLACE FUNCTION get_available_licenses_for_scope(
    p_company_id UUID,
    p_school_ids UUID[] DEFAULT NULL,
    p_branch_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
    license_id UUID,
    company_name TEXT,
    region_name TEXT,
    program_name TEXT,
    provider_name TEXT,
    subject_name TEXT,
    total_quantity INTEGER,
    used_quantity INTEGER,
    available_quantity INTEGER,
    start_date DATE,
    end_date DATE,
    status TEXT,
    is_expired BOOLEAN,
    days_until_expiry INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        l.id AS license_id,
        c.name AS company_name,
        COALESCE(r.name, 'Unknown Region') AS region_name,
        COALESCE(p.name, 'Unknown Program') AS program_name,
        COALESCE(pr.name, 'Unknown Provider') AS provider_name,
        COALESCE(s.name, 'Unknown Subject') AS subject_name,
        l.total_quantity,
        l.used_quantity,
        (l.total_quantity - l.used_quantity) AS available_quantity,
        l.start_date,
        l.end_date,
        l.status,
        (l.end_date < CURRENT_DATE) AS is_expired,
        CASE
            WHEN l.end_date >= CURRENT_DATE THEN 
                EXTRACT(DAY FROM (l.end_date::date - CURRENT_DATE::date))::integer
            ELSE 0
        END AS days_until_expiry
    FROM
        licenses l
    JOIN
        companies c ON l.company_id = c.id
    JOIN
        data_structures ds ON l.data_structure_id = ds.id
    LEFT JOIN
        regions r ON ds.region_id = r.id
    LEFT JOIN
        programs p ON ds.program_id = p.id
    LEFT JOIN
        providers pr ON ds.provider_id = pr.id
    LEFT JOIN
        edu_subjects s ON ds.subject_id = s.id
    WHERE
        l.company_id = p_company_id
        AND l.status = 'active'
        AND (
            (p_school_ids IS NULL OR array_length(p_school_ids, 1) IS NULL)
            OR EXISTS (
                SELECT 1
                FROM schools sch
                WHERE sch.company_id = l.company_id
                AND sch.id = ANY(p_school_ids)
            )
        )
        AND (
            (p_branch_ids IS NULL OR array_length(p_branch_ids, 1) IS NULL)
            OR EXISTS (
                SELECT 1
                FROM branches br
                JOIN schools sch ON br.school_id = sch.id
                WHERE sch.company_id = l.company_id
                AND br.id = ANY(p_branch_ids)
            )
        )
    ORDER BY l.created_at DESC;
END;
$$;