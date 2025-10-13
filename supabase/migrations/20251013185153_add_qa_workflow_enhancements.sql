/*
  # Add QA Workflow Enhancements for Papers

  ## Summary
  Enhances the paper QA workflow by adding tracking columns and clarifying the paper lifecycle.
  Papers should remain in 'draft' status after import and only become 'active' after explicit publishing.

  ## Changes
  1. **Add QA tracking columns to papers_setup**
     - qa_status: Tracks QA review progress
     - questions_imported_at: When questions were imported
     - published_at, published_by: When paper was published to active status
  
  2. **Update existing papers with questions but wrong question status**
     - Set questions to 'draft' or 'qa_review' if paper is in draft/qa_review
     - Only questions in published papers should be 'active'

  3. **Add indexes for QA filtering**
     - Index on (status, qa_status) for efficient querying
     - Index on qa_started_at, qa_completed_at for reporting

  ## Purpose
  Ensures papers appear correctly in "Under QA" tab and establishes clear workflow:
  - Paper Setup: Creates paper with status='draft', imports questions
  - Questions Setup > Under QA: QA review happens here
  - Questions Setup > Publish: Explicitly publish to make paper active
  - Only 'active' papers are accessible to teachers/students/entities
*/

-- Add QA workflow columns to papers_setup
ALTER TABLE papers_setup
ADD COLUMN IF NOT EXISTS qa_status text DEFAULT 'pending' CHECK (qa_status IN ('pending', 'in_progress', 'completed', NULL)),
ADD COLUMN IF NOT EXISTS questions_imported boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS questions_imported_at timestamptz,
ADD COLUMN IF NOT EXISTS published_at timestamptz,
ADD COLUMN IF NOT EXISTS published_by uuid REFERENCES users(id);

-- Add comment to clarify workflow
COMMENT ON COLUMN papers_setup.status IS 'Paper lifecycle status: draft (questions imported, awaiting QA) -> qa_review (QA in progress) -> active (published, accessible to all users) -> inactive (archived)';
COMMENT ON COLUMN papers_setup.qa_status IS 'QA review progress: pending (not started) -> in_progress (reviewing) -> completed (ready to publish)';
COMMENT ON COLUMN papers_setup.published_at IS 'When paper was published to active status, making it accessible to teachers/students/entities';

-- Create indexes for efficient QA filtering
CREATE INDEX IF NOT EXISTS idx_papers_setup_status_qa_status 
  ON papers_setup(status, qa_status) 
  WHERE status IN ('draft', 'qa_review');

CREATE INDEX IF NOT EXISTS idx_papers_setup_qa_dates 
  ON papers_setup(qa_started_at, qa_completed_at);

CREATE INDEX IF NOT EXISTS idx_papers_setup_published_at 
  ON papers_setup(published_at) 
  WHERE status = 'active';

-- Update existing papers that have questions
-- Set questions_imported flag for papers with questions
UPDATE papers_setup p
SET 
  questions_imported = true,
  questions_imported_at = COALESCE(p.created_at, now())
WHERE EXISTS (
  SELECT 1 FROM questions_master_admin q
  WHERE q.paper_id = p.id
)
AND questions_imported IS NOT true;

-- Fix question status for papers in draft/qa_review
-- Questions should NOT be active if paper is not active
UPDATE questions_master_admin q
SET status = 'draft'
FROM papers_setup p
WHERE q.paper_id = p.id
  AND p.status IN ('draft', 'qa_review')
  AND q.status = 'active';

-- Update sub_questions status to match parent question
UPDATE sub_questions sq
SET status = 'draft'
FROM questions_master_admin q, papers_setup p
WHERE sq.question_id = q.id
  AND q.paper_id = p.id
  AND p.status IN ('draft', 'qa_review')
  AND sq.status = 'active';

-- Create function to sync question status with paper status
CREATE OR REPLACE FUNCTION sync_question_status_with_paper()
RETURNS TRIGGER AS $$
BEGIN
  -- When paper status changes, update all question statuses
  IF NEW.status != OLD.status THEN
    -- If paper becomes active, activate all questions
    IF NEW.status = 'active' AND OLD.status IN ('draft', 'qa_review') THEN
      UPDATE questions_master_admin
      SET status = 'active', updated_at = now()
      WHERE paper_id = NEW.id AND status != 'active';
      
      UPDATE sub_questions sq
      SET status = 'active', updated_at = now()
      FROM questions_master_admin q
      WHERE sq.question_id = q.id 
        AND q.paper_id = NEW.id 
        AND sq.status != 'active';
        
      -- Set published timestamp
      IF NEW.published_at IS NULL THEN
        NEW.published_at = now();
      END IF;
    END IF;
    
    -- If paper becomes draft/qa_review from active, deactivate questions
    IF NEW.status IN ('draft', 'qa_review') AND OLD.status = 'active' THEN
      UPDATE questions_master_admin
      SET status = 'draft', updated_at = now()
      WHERE paper_id = NEW.id AND status = 'active';
      
      UPDATE sub_questions sq
      SET status = 'draft', updated_at = now()
      FROM questions_master_admin q
      WHERE sq.question_id = q.id 
        AND q.paper_id = NEW.id 
        AND sq.status = 'active';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically sync question status
DROP TRIGGER IF EXISTS trigger_sync_question_status ON papers_setup;
CREATE TRIGGER trigger_sync_question_status
  BEFORE UPDATE ON papers_setup
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION sync_question_status_with_paper();

-- Create view for QA dashboard
CREATE OR REPLACE VIEW papers_qa_dashboard AS
SELECT 
  p.id,
  p.paper_code,
  p.status,
  p.qa_status,
  p.exam_year,
  p.exam_session,
  p.qa_started_at,
  p.qa_completed_at,
  p.questions_imported,
  p.questions_imported_at,
  p.published_at,
  COUNT(DISTINCT q.id) as total_questions,
  COUNT(DISTINCT CASE WHEN q.status = 'active' THEN q.id END) as active_questions,
  COUNT(DISTINCT sq.id) as total_sub_questions,
  subj.name as subject_name,
  prov.name as provider_name,
  prog.name as program_name
FROM papers_setup p
LEFT JOIN questions_master_admin q ON q.paper_id = p.id
LEFT JOIN sub_questions sq ON sq.question_id = q.id
LEFT JOIN data_structures ds ON ds.id = p.data_structure_id
LEFT JOIN edu_subjects subj ON subj.id = ds.subject_id
LEFT JOIN providers prov ON prov.id = ds.provider_id
LEFT JOIN programs prog ON prog.id = ds.program_id
WHERE p.status IN ('draft', 'qa_review', 'active')
GROUP BY p.id, p.paper_code, p.status, p.qa_status, p.exam_year, p.exam_session,
         p.qa_started_at, p.qa_completed_at, p.questions_imported, p.questions_imported_at,
         p.published_at, subj.name, prov.name, prog.name;

COMMENT ON VIEW papers_qa_dashboard IS 'Dashboard view for QA workflow showing papers with their question counts and status';
