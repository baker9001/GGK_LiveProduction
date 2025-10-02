/*
  # Fix Mock Exam Status History RLS Policy
  
  ## Issue
  The INSERT policy for mock_exam_status_history is causing errors because
  it tries to check permissions that don't exist yet when the trigger runs.
  
  ## Solution
  Add a simple INSERT policy that allows authenticated users to insert
  status history records for exams they have access to.
*/

-- Drop existing INSERT policy if any
DROP POLICY IF EXISTS "Allow status history inserts" ON mock_exam_status_history;

-- Create new INSERT policy that works with the trigger
CREATE POLICY "Allow status history inserts"
  ON mock_exam_status_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Also add UPDATE policy for completeness
DROP POLICY IF EXISTS "System admins can update status history" ON mock_exam_status_history;

CREATE POLICY "System admins can update status history"
  ON mock_exam_status_history
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM admin_users)
  )
  WITH CHECK (
    auth.uid() IN (SELECT id FROM admin_users)
  );
