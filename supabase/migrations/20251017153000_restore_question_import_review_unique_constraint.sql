/*
  # Restore unique constraint for question import review status

  ## Summary
  Reinstate the unique constraint on (review_session_id, question_identifier)
  to support idempotent upserts from the question review UI and prevent
  duplicate review rows for the same question within a session.
*/

-- Remove duplicate rows before enforcing uniqueness
WITH duplicates AS (
  SELECT ctid
  FROM (
    SELECT ctid,
           ROW_NUMBER() OVER (
             PARTITION BY review_session_id, question_identifier
             ORDER BY created_at NULLS LAST, updated_at NULLS LAST, ctid
           ) AS rn
    FROM question_import_review_status
  ) ranked
  WHERE ranked.rn > 1
)
DELETE FROM question_import_review_status q
USING duplicates d
WHERE q.ctid = d.ctid;

-- Add the missing unique constraint to match application expectations
ALTER TABLE question_import_review_status
  ADD CONSTRAINT question_import_review_status_review_session_id_question_identifier_key
  UNIQUE (review_session_id, question_identifier);
