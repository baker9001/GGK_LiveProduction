/*
  # Create get_available_licenses_for_scope RPC Function

  This function retrieves licenses available to entity admins based on their scope (company, schools, branches).
  It joins licenses with data_structures and related entities to provide comprehensive license information.
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
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id as license_id,
    c.name as company_name,
    r.name as region_name,
    p.name as program_name,
    pr.name as provider_name,
    s.name as subject_name,
    l.total_quantity,
    l.used_quantity,
    (l.total_quantity - l.used_quantity) as available_quantity,
    l.start_date,
    l.end_date,
    l.status,
    (l.end_date < CURRENT_DATE) as is_expired,
    CASE 
      WHEN l.end_date < CURRENT_DATE THEN 0
      ELSE EXTRACT(DAY FROM (l.end_date - CURRENT_DATE))::integer
    END as days_until_expiry
  FROM licenses l
  JOIN companies c ON l.company_id = c.id
  JOIN data_structures ds ON l.data_structure_id = ds.id
  JOIN regions r ON ds.region_id = r.id
  JOIN programs p ON ds.program_id = p.id
  JOIN providers pr ON ds.provider_id = pr.id
  JOIN edu_subjects s ON ds.subject_id = s.id
  WHERE l.company_id = p_company_id
    AND l.status = 'active'
    AND (
      -- If no specific scope filters, show all company licenses (entity_admin)
      (p_school_ids IS NULL AND p_branch_ids IS NULL)
      OR
      -- If school_ids provided, filter by schools that use this data structure
      (p_school_ids IS NOT NULL AND EXISTS (
        SELECT 1 FROM schools sch 
        WHERE sch.id = ANY(p_school_ids) 
        AND sch.company_id = l.company_id
      ))
      OR
      -- If branch_ids provided, filter by branches that use this data structure
      (p_branch_ids IS NOT NULL AND EXISTS (
        SELECT 1 FROM branches br
        JOIN schools sch ON br.school_id = sch.id
        WHERE br.id = ANY(p_branch_ids)
        AND sch.company_id = l.company_id
      ))
    )
  ORDER BY l.created_at DESC;
END;
$$;