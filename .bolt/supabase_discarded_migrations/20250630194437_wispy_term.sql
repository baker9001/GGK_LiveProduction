/*
  # Add get_question_counts_by_paper function

  1. New Functions
    - `get_question_counts_by_paper`
      - Takes an array of paper IDs
      - Returns a table with paper_id and count of questions for each paper
      - Used by the papers setup page to display question counts

  2. Security
    - Grant execute permission to authenticated users
*/

-- Create or replace the function to get question counts by paper
CREATE OR REPLACE FUNCTION public.get_question_counts_by_paper(
    paper_ids uuid[]
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
        q.paper_id = ANY(paper_ids)
    GROUP BY
        q.paper_id;
END;
$$;

-- Grant execution permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_question_counts_by_paper(uuid[]) TO authenticated;

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';