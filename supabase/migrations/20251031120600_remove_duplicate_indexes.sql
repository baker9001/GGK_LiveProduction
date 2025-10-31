/*
  # Remove Duplicate Indexes

  1. Issue
    - Table practice_answers has identical indexes
    - idx_practice_answers_session_item and practice_answers_session_id_item_key
    - Both index the same columns (session_id, item_id)

  2. Solution
    - Drop the manually created idx_practice_answers_session_item
    - Keep the unique constraint index practice_answers_session_id_item_key
    - Unique constraint provides both uniqueness and indexing

  3. Performance Impact
    - Reduces storage overhead
    - Reduces index maintenance cost during writes
    - No impact on query performance (unique constraint index remains)
*/

-- Drop the duplicate index (keep the unique constraint index)
DROP INDEX IF EXISTS public.idx_practice_answers_session_item;

-- Verify unique constraint index still exists (this is a comment/documentation)
-- The index practice_answers_session_id_item_key is automatically maintained by the unique constraint
-- UNIQUE (session_id, item_id) and provides the same indexing functionality
