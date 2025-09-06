/*
  # Fix get_available_licenses_for_scope function

  1. Database Function Fix
    - Replace incorrect EXTRACT usage with proper date arithmetic
    - Fix days_until_expiry calculation to use standard PostgreSQL date operations

  2. Changes Made
    - Changed EXTRACT(DAY FROM (l.end_date::date - CURRENT_DATE::date)) to (l.end_date::date - CURRENT_DATE::date)
    - This returns the number of days as an integer directly
*/

CREATE OR REPLACE FUNCTION get_available_licenses_for_scope(
    p_company_id uuid,
    p_school_ids uuid[] DEFAULT NULL,
    p_branch_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
    license_id uuid,
    company_name text,
    region_name text,
    program_name text,
    provider_name text,
    subject_name text,
    total_quantity integer,
    used_quantity integer,
    available_quantity integer,
    start_date date,
    end_date date,
    status text,
    is_expired boolean,
    days_until_expiry integer
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
                (l.end_date::date - CURRENT_DATE::date)::integer
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