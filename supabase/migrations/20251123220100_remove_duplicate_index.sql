/*
  # Remove Duplicate Index

  1. Index Cleanup
    - Remove duplicate index on practice_answers table
    - Keep the unique constraint, drop the redundant index
  
  2. Changes
    - Drop idx_practice_answers_session_item (duplicate)
    - Keep practice_answers_session_id_item_id_key (unique constraint)
*/

-- Drop the duplicate index (keeping the unique constraint)
DROP INDEX IF EXISTS idx_practice_answers_session_item;
