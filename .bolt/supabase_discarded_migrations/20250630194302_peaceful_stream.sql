/*
  # Add get_question_counts_by_paper function

  1. New Functions
    - `get_question_counts_by_paper` - Returns question counts grouped by paper ID
      - Takes an array of paper UUIDs as input
      - Returns paper_id and total_questions count
      - Used by the papers setup page to display question counts

  2. Security
    - Grant execute permissions to authenticated users
*/

CREATE OR REPLACE FUNCTION public.get_question_counts_by_paper(
    paper_ids uuid[]
)
RETURNS TABLE (
    paper_id uuid,
    total_questions bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        q.paper_id,
        COUNT(q.id) AS total_questions
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