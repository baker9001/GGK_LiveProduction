/*
  # Add Jan/Feb option to exam_session check constraint

  1. Changes
    - Update the check constraint on past_paper_import_sessions table to include 'Jan/Feb' as a valid exam_session value
    - Ensure existing data conforms to the new constraint
    - Refresh schema cache

  2. Purpose
    - Allow users to select 'Jan/Feb' as an exam session option
    - Support additional exam periods in the system
*/

-- Drop the existing check constraint
ALTER TABLE past_paper_import_sessions 
DROP CONSTRAINT IF EXISTS past_paper_import_sessions_exam_session_check;

-- Add the updated check constraint with Jan/Feb option
ALTER TABLE past_paper_import_sessions 
ADD CONSTRAINT past_paper_import_sessions_exam_session_check 
CHECK (exam_session IN ('May/June', 'Oct/Nov', 'Jan/Feb'));

-- Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';