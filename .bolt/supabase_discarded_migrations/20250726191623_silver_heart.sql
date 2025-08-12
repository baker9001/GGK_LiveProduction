/*
  # Add 'under_review' status for questions workflow

  1. Changes
    - Add 'under_review' status to questions_master_admin table
    - Add 'under_review' status to sub_questions table
    - Update existing qa_review questions to under_review when paper is in qa_review status
    - Refresh PostgREST schema cache

  2. Security
    - No changes to RLS policies needed
*/

-- Step 1: Update questions_master_admin table status constraint
ALTER TABLE questions_master_admin DROP CONSTRAINT IF EXISTS questions_master_admin_status_check;
ALTER TABLE questions_master_admin 
ADD CONSTRAINT questions_master_admin_status_check 
CHECK (status IN ('active', 'inactive', 'qa_review', 'under_review'));

-- Step 2: Update sub_questions table status constraint
ALTER TABLE sub_questions DROP CONSTRAINT IF EXISTS sub_questions_status_check;
ALTER TABLE sub_questions 
ADD CONSTRAINT sub_questions_status_check 
CHECK (status IN ('active', 'inactive', 'qa_review', 'under_review'));

-- Step 3: Update existing qa_review questions to under_review when their paper is in qa_review status
UPDATE questions_master_admin 
SET status = 'under_review'
WHERE status = 'qa_review' 
AND paper_id IN (
  SELECT id FROM papers_setup WHERE status = 'qa_review'
);

-- Step 4: Update existing qa_review sub_questions to under_review when their parent question's paper is in qa_review status
UPDATE sub_questions 
SET status = 'under_review'
WHERE status = 'qa_review' 
AND question_id IN (
  SELECT q.id FROM questions_master_admin q
  JOIN papers_setup p ON q.paper_id = p.id
  WHERE p.status = 'qa_review'
);

-- Step 5: Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(0.5);
NOTIFY pgrst, 'reload schema';

-- Step 6: Verify the constraints were updated successfully
DO $$
BEGIN
  -- Verify questions_master_admin constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'questions_master_admin_status_check'
    AND check_clause LIKE '%under_review%'
  ) THEN
    RAISE NOTICE 'SUCCESS: questions_master_admin status constraint updated with under_review';
  ELSE
    RAISE WARNING 'WARNING: questions_master_admin status constraint may not include under_review';
  END IF;
  
  -- Verify sub_questions constraint
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'sub_questions_status_check'
    AND check_clause LIKE '%under_review%'
  ) THEN
    RAISE NOTICE 'SUCCESS: sub_questions status constraint updated with under_review';
  ELSE
    RAISE WARNING 'WARNING: sub_questions status constraint may not include under_review';
  END IF;
END $$;