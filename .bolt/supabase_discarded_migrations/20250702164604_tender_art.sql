/*
  # Fix ambiguous column reference in get_question_counts_by_paper function

  1. Function Updates
    - Drop and recreate `get_question_counts_by_paper` function
    - Fix ambiguous column reference in GROUP BY clause
    - Use table-qualified column name instead of output alias

  2. Security
    - Re-grant execute permissions to authenticated users
    - Notify PostgREST to reload schema cache
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS public.get_question_counts_by_paper(uuid[]);

-- Create the corrected function
CREATE OR REPLACE FUNCTION public.get_question_counts_by_paper(
    _input_paper_ids uuid[]
)
RETURNS TABLE (
    p_paper_id_out uuid,
    count bigint
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        q.paper_id as p_paper_id_out,
        COUNT(q.id) AS count
    FROM
        questions_master_admin q
    WHERE
        q.paper_id = ANY(_input_paper_ids)
    GROUP BY
        q.paper_id;  -- Use the actual table column, not the alias
END;
$$;

-- Grant execution permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_question_counts_by_paper(uuid[]) TO authenticated;

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';