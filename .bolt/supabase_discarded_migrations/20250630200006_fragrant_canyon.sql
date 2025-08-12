/*
  # Add question counts function for papers

  1. New Functions
    - `get_question_counts_by_paper`
      - Takes an array of paper IDs
      - Returns a table with paper_id and count of questions for each paper
      - Marked as STABLE for use with Supabase RPC

  2. Security
    - Grant execution permissions to authenticated users
*/

-- Create or replace the function to get question counts by paper
CREATE OR REPLACE FUNCTION public.get_question_counts_by_paper(
    p_paper_ids uuid[]
)
RETURNS TABLE (
    paper_id uuid,
    count bigint
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        q.paper_id,
        COUNT(q.id) AS count
    FROM
        questions_master_admin q
    WHERE
        q.paper_id = ANY(p_paper_ids)
    GROUP BY
        q.paper_id;
END;
$$;

-- Grant execution permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_question_counts_by_paper(uuid[]) TO authenticated;

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';