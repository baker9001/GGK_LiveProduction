/*
  # Comprehensive Alignment Between Papers Setup and Questions Setup Stages
  
  This migration ensures complete data consistency between papers-setup (import) 
  and questions-setup (QA/management) workflows.
  
  ## Strategy
  1. Drop dependent views temporarily
  2. Modify columns and add constraints
  3. Add indexes for performance
  4. Recreate views with enhancements
  5. Add validation functions
*/

-- ==========================================
-- STEP 1: Drop dependent views temporarily
-- ==========================================

DROP VIEW IF EXISTS papers_qa_dashboard CASCADE;
DROP VIEW IF EXISTS qa_question_analysis_view CASCADE;
DROP VIEW IF EXISTS recent_context_performance CASCADE;

-- ==========================================
-- STEP 2: Data Type Standardization
-- ==========================================

-- Align marks column type to numeric
ALTER TABLE sub_questions 
  ALTER COLUMN marks TYPE numeric USING marks::numeric;

-- Standardize timestamp columns
ALTER TABLE sub_questions
  ALTER COLUMN confirmed_at TYPE timestamp with time zone USING confirmed_at AT TIME ZONE 'UTC';

ALTER TABLE questions_master_admin
  ALTER COLUMN confirmed_at TYPE timestamp with time zone USING confirmed_at AT TIME ZONE 'UTC',
  ALTER COLUMN qa_reviewed_at TYPE timestamp with time zone USING qa_reviewed_at AT TIME ZONE 'UTC';

ALTER TABLE papers_setup
  ALTER COLUMN qa_started_at TYPE timestamp with time zone USING qa_started_at AT TIME ZONE 'UTC',
  ALTER COLUMN qa_completed_at TYPE timestamp with time zone USING qa_completed_at AT TIME ZONE 'UTC',
  ALTER COLUMN last_status_change_at TYPE timestamp with time zone USING last_status_change_at AT TIME ZONE 'UTC';

-- ==========================================
-- STEP 3: Status Constraints
-- ==========================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'questions_master_admin_status_check') THEN
    ALTER TABLE questions_master_admin
      ADD CONSTRAINT questions_master_admin_status_check
      CHECK (status IN ('draft', 'qa_review', 'active', 'inactive', 'archived'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sub_questions_status_check') THEN
    ALTER TABLE sub_questions
      ADD CONSTRAINT sub_questions_status_check
      CHECK (status IN ('draft', 'qa_review', 'active', 'inactive', 'archived'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'papers_setup_status_check') THEN
    ALTER TABLE papers_setup
      ADD CONSTRAINT papers_setup_status_check
      CHECK (status IN ('draft', 'qa_review', 'active', 'inactive', 'archived', 'completed', 'failed'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'papers_setup_qa_status_check') THEN
    ALTER TABLE papers_setup
      ADD CONSTRAINT papers_setup_qa_status_check
      CHECK (qa_status IN ('pending', 'in_progress', 'completed', 'failed'));
  END IF;
END $$;

-- Set default status values
ALTER TABLE questions_master_admin ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE sub_questions ALTER COLUMN status SET DEFAULT 'draft';

-- ==========================================
-- STEP 4: Performance Indexes
-- ==========================================

-- Questions table indexes
CREATE INDEX IF NOT EXISTS idx_questions_paper_status ON questions_master_admin(paper_id, status);
CREATE INDEX IF NOT EXISTS idx_questions_topic_status ON questions_master_admin(topic_id, status) WHERE topic_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_questions_subject_status ON questions_master_admin(subject_id, status);
CREATE INDEX IF NOT EXISTS idx_questions_provider_status ON questions_master_admin(provider_id, status);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions_master_admin(difficulty) WHERE difficulty IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_questions_confirmed ON questions_master_admin(is_confirmed, status);
CREATE INDEX IF NOT EXISTS idx_questions_import_session ON questions_master_admin(import_session_id) WHERE import_session_id IS NOT NULL;

-- Sub-questions indexes
CREATE INDEX IF NOT EXISTS idx_sub_questions_question_order ON sub_questions(question_id, sort_order, order_index, "order");
CREATE INDEX IF NOT EXISTS idx_sub_questions_parent_level ON sub_questions(parent_id, level) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sub_questions_status ON sub_questions(status);

-- Papers indexes
CREATE INDEX IF NOT EXISTS idx_papers_setup_data_structure ON papers_setup(data_structure_id, status);
CREATE INDEX IF NOT EXISTS idx_papers_setup_subject ON papers_setup(subject_id, status);
CREATE INDEX IF NOT EXISTS idx_papers_setup_import_session ON papers_setup(import_session_id) WHERE import_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_papers_setup_qa_status ON papers_setup(qa_status, status);

-- Answer tables indexes
CREATE INDEX IF NOT EXISTS idx_question_correct_answers_question ON question_correct_answers(question_id) WHERE question_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_question_correct_answers_sub_question ON question_correct_answers(sub_question_id) WHERE sub_question_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_question_options_question ON question_options(question_id) WHERE question_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_question_options_sub_question ON question_options(sub_question_id) WHERE sub_question_id IS NOT NULL;

-- Attachment indexes
CREATE INDEX IF NOT EXISTS idx_questions_attachments_question ON questions_attachments(question_id) WHERE question_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_questions_attachments_sub_question ON questions_attachments(sub_question_id) WHERE sub_question_id IS NOT NULL;

-- Junction table indexes
CREATE INDEX IF NOT EXISTS idx_question_topics_question ON question_topics(question_id);
CREATE INDEX IF NOT EXISTS idx_question_topics_topic ON question_topics(topic_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_question_topics_unique ON question_topics(question_id, topic_id);

CREATE INDEX IF NOT EXISTS idx_question_subtopics_question_main ON question_subtopics(question_id) WHERE question_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_question_subtopics_sub_question ON question_subtopics(sub_question_id) WHERE sub_question_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_question_subtopics_subtopic ON question_subtopics(subtopic_id);

-- QA workflow indexes
CREATE INDEX IF NOT EXISTS idx_questions_confirmation_status ON questions_master_admin(is_confirmed, confirmed_at) WHERE is_confirmed = true;
CREATE INDEX IF NOT EXISTS idx_sub_questions_confirmation_status ON sub_questions(is_confirmed, confirmed_at) WHERE is_confirmed = true;
CREATE INDEX IF NOT EXISTS idx_question_confirmations_question ON question_confirmations(question_id, performed_at);
CREATE INDEX IF NOT EXISTS idx_paper_status_history_paper ON paper_status_history(paper_id, changed_at);

-- Import session indexes
CREATE INDEX IF NOT EXISTS idx_past_paper_import_sessions_status ON past_paper_import_sessions(status, created_at);
CREATE INDEX IF NOT EXISTS idx_past_paper_import_sessions_json_hash ON past_paper_import_sessions(json_hash) WHERE json_hash IS NOT NULL;

-- ==========================================
-- STEP 5: Validation Functions
-- ==========================================

CREATE OR REPLACE FUNCTION is_question_ready_for_qa(question_row questions_master_admin)
RETURNS boolean AS $$
BEGIN
  RETURN (
    question_row.question_description IS NOT NULL AND 
    TRIM(question_row.question_description) != '' AND
    question_row.marks > 0 AND
    question_row.difficulty IS NOT NULL AND
    question_row.topic_id IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION is_paper_ready_for_publishing(paper_uuid uuid)
RETURNS TABLE(
  is_ready boolean,
  total_questions integer,
  confirmed_questions integer,
  missing_fields_count integer,
  validation_message text
) AS $$
DECLARE
  v_total_questions integer;
  v_confirmed_questions integer;
  v_invalid_questions integer;
BEGIN
  SELECT COUNT(*) INTO v_total_questions
  FROM questions_master_admin
  WHERE paper_id = paper_uuid AND deleted_at IS NULL;
  
  SELECT COUNT(*) INTO v_confirmed_questions
  FROM questions_master_admin
  WHERE paper_id = paper_uuid AND is_confirmed = true AND deleted_at IS NULL;
  
  SELECT COUNT(*) INTO v_invalid_questions
  FROM questions_master_admin q
  WHERE q.paper_id = paper_uuid 
    AND q.deleted_at IS NULL
    AND (
      q.question_description IS NULL OR 
      TRIM(q.question_description) = '' OR
      q.marks <= 0 OR
      q.difficulty IS NULL OR
      q.topic_id IS NULL
    );
  
  RETURN QUERY SELECT
    (v_invalid_questions = 0 AND v_total_questions = v_confirmed_questions AND v_total_questions > 0)::boolean,
    v_total_questions,
    v_confirmed_questions,
    v_invalid_questions,
    CASE
      WHEN v_total_questions = 0 THEN 'No questions found in paper'
      WHEN v_invalid_questions > 0 THEN format('%s question(s) have missing required fields', v_invalid_questions)
      WHEN v_confirmed_questions < v_total_questions THEN format('%s question(s) not yet confirmed', v_total_questions - v_confirmed_questions)
      ELSE 'Paper is ready for publishing'
    END;
END;
$$ LANGUAGE plpgsql STABLE;

-- ==========================================
-- STEP 6: Recreate Enhanced Views
-- ==========================================

CREATE OR REPLACE VIEW papers_qa_dashboard AS
SELECT 
  p.id as paper_id,
  p.paper_code,
  p.status as paper_status,
  p.qa_status,
  p.qa_started_at,
  p.qa_completed_at,
  p.questions_imported,
  p.questions_imported_at,
  COUNT(DISTINCT q.id) as total_questions,
  COUNT(DISTINCT CASE WHEN q.is_confirmed THEN q.id END) as confirmed_questions,
  COUNT(DISTINCT CASE WHEN q.status = 'qa_review' THEN q.id END) as qa_review_questions,
  COUNT(DISTINCT CASE WHEN q.status = 'active' THEN q.id END) as active_questions,
  COUNT(DISTINCT sq.id) as total_sub_questions,
  COUNT(DISTINCT CASE WHEN sq.is_confirmed THEN sq.id END) as confirmed_sub_questions,
  COUNT(DISTINCT CASE WHEN q.topic_id IS NULL THEN q.id END) as questions_missing_topic,
  COUNT(DISTINCT CASE WHEN q.difficulty IS NULL THEN q.id END) as questions_missing_difficulty,
  CASE 
    WHEN COUNT(DISTINCT q.id) + COUNT(DISTINCT sq.id) = 0 THEN 0
    ELSE ROUND(
      (COUNT(DISTINCT CASE WHEN q.is_confirmed THEN q.id END) + 
       COUNT(DISTINCT CASE WHEN sq.is_confirmed THEN sq.id END))::numeric / 
      (COUNT(DISTINCT q.id) + COUNT(DISTINCT sq.id))::numeric * 100, 2
    )
  END as qa_progress_percentage,
  MAX(q.confirmed_at) as last_question_confirmed_at,
  MAX(sq.confirmed_at) as last_sub_question_confirmed_at,
  p.created_at,
  p.updated_at
FROM papers_setup p
LEFT JOIN questions_master_admin q ON q.paper_id = p.id AND q.deleted_at IS NULL
LEFT JOIN sub_questions sq ON sq.question_id = q.id AND sq.deleted_at IS NULL
GROUP BY p.id;

CREATE OR REPLACE VIEW question_validation_summary AS
SELECT 
  q.id as question_id,
  q.paper_id,
  q.question_number,
  q.status,
  q.is_confirmed,
  q.difficulty,
  q.topic_id,
  q.marks,
  (q.question_description IS NOT NULL AND TRIM(q.question_description) != '') as has_description,
  (q.marks > 0) as has_valid_marks,
  (q.difficulty IS NOT NULL) as has_difficulty,
  (q.topic_id IS NOT NULL) as has_topic,
  EXISTS(SELECT 1 FROM question_correct_answers WHERE question_id = q.id) as has_correct_answers,
  EXISTS(SELECT 1 FROM questions_attachments WHERE question_id = q.id) as has_attachments,
  EXISTS(SELECT 1 FROM question_subtopics WHERE question_id = q.id) as has_subtopics,
  (
    q.question_description IS NOT NULL AND 
    TRIM(q.question_description) != '' AND
    q.marks > 0 AND
    q.difficulty IS NOT NULL AND
    q.topic_id IS NOT NULL
  ) as is_valid_for_qa
FROM questions_master_admin q
WHERE q.deleted_at IS NULL;

CREATE OR REPLACE VIEW recent_context_performance AS
SELECT * FROM context_performance 
WHERE created_at >= NOW() - INTERVAL '30 days';

-- ==========================================
-- STEP 7: Status Change Trigger
-- ==========================================

CREATE OR REPLACE FUNCTION log_paper_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO paper_status_history (
      paper_id,
      previous_status,
      new_status,
      changed_by,
      changed_at,
      reason,
      metadata
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      NEW.last_status_change_by,
      NEW.last_status_change_at,
      format('Status changed from %s to %s', OLD.status, NEW.status),
      jsonb_build_object(
        'qa_status', NEW.qa_status,
        'questions_imported', NEW.questions_imported,
        'timestamp', NEW.last_status_change_at
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_paper_status_change ON papers_setup;

CREATE TRIGGER trigger_log_paper_status_change
  AFTER UPDATE OF status ON papers_setup
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_paper_status_change();

-- ==========================================
-- STEP 8: Helpful Comments
-- ==========================================

COMMENT ON COLUMN questions_master_admin.marks IS 'Question marks - numeric type supports fractional marks (0.5, 1.5)';
COMMENT ON COLUMN sub_questions.marks IS 'Sub-question marks - numeric type supports fractional marks (0.5, 1.5)';
COMMENT ON COLUMN questions_master_admin.status IS 'Status workflow: draft → qa_review → active (published)';
COMMENT ON COLUMN sub_questions.status IS 'Status workflow: draft → qa_review → active (published)';
COMMENT ON COLUMN papers_setup.status IS 'Paper status: draft → qa_review → active (published)';
COMMENT ON COLUMN papers_setup.qa_status IS 'QA status: pending → in_progress → completed';
COMMENT ON TABLE question_correct_answers IS 'Canonical answer storage - use instead of correct_answer text column';
COMMENT ON COLUMN questions_master_admin.correct_answer IS 'DEPRECATED - use question_correct_answers table';
COMMENT ON COLUMN sub_questions.correct_answer IS 'DEPRECATED - use question_correct_answers table';
COMMENT ON VIEW papers_qa_dashboard IS 'QA progress tracking - used by both papers-setup and questions-setup';
COMMENT ON VIEW question_validation_summary IS 'Question validation status - identifies missing fields';
COMMENT ON FUNCTION is_question_ready_for_qa IS 'Validates question has required fields for QA';
COMMENT ON FUNCTION is_paper_ready_for_publishing IS 'Checks if paper is ready for publishing';
