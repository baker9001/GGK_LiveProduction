-- Create or replace the function to get question counts by paper
-- Fix the ambiguous column reference by renaming the input parameter
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
        q.paper_id;
END;
$$;

-- Grant execution permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_question_counts_by_paper(uuid[]) TO authenticated;

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';