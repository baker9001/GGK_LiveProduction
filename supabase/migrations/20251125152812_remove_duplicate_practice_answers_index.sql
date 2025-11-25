/*
  # Remove Duplicate Index on practice_answers
  
  Removes the duplicate index idx_practice_answers_session_item since
  practice_answers_session_id_item_id_key already provides the same indexing.
  
  ## Benefits
  - Reduces storage overhead
  - Improves INSERT/UPDATE/DELETE performance
  - Simplifies index maintenance
*/

DROP INDEX IF EXISTS idx_practice_answers_session_item;
