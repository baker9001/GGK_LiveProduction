/*
  # Add function to get data structures with relations

  1. New Functions
    - `get_data_structures_with_relations` - Returns data structures with their related entities
    - This function avoids foreign key naming issues by using explicit joins

  2. Security
    - Grant execute permissions to authenticated users
*/

-- Create or replace the function to get data structures with relations
CREATE OR REPLACE FUNCTION public.get_data_structures_with_relations()
RETURNS TABLE (
    id uuid,
    region_id uuid,
    program_id uuid,
    provider_id uuid,
    subject_id uuid,
    status text,
    regions jsonb,
    programs jsonb,
    providers jsonb,
    edu_subjects jsonb
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ds.id,
        ds.region_id,
        ds.program_id,
        ds.provider_id,
        ds.subject_id,
        ds.status,
        jsonb_build_object(
            'id', r.id,
            'name', r.name
        ) as regions,
        jsonb_build_object(
            'id', p.id,
            'name', p.name
        ) as programs,
        jsonb_build_object(
            'id', pr.id,
            'name', pr.name
        ) as providers,
        jsonb_build_object(
            'id', s.id,
            'name', s.name,
            'code', s.code
        ) as edu_subjects
    FROM
        data_structures ds
    JOIN regions r ON ds.region_id = r.id
    JOIN programs p ON ds.program_id = p.id
    JOIN providers pr ON ds.provider_id = pr.id
    JOIN edu_subjects s ON ds.subject_id = s.id
    WHERE
        ds.status = 'active';
END;
$$;

-- Grant execution permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_data_structures_with_relations() TO authenticated;

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';