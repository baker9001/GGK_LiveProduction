/*
  # Add Question Navigation State Tracking

  1. New Tables
    - `question_navigation_state` - Tracks user navigation preferences and last position
    - `question_review_progress` - Tracks review and completion status per question/part/subpart
    - `question_attachment_tracking` - Dedicated tracking for attachment requirements and uploads

  2. Security
    - Enable RLS on all new tables with appropriate policies

  3. Indexes
    - Add indexes on foreign keys and lookup columns
*/

-- Question Navigation State table
CREATE TABLE IF NOT EXISTS question_navigation_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paper_id uuid NOT NULL REFERENCES papers_setup(id) ON DELETE CASCADE,
  current_position_id uuid,
  current_position_type text CHECK (current_position_type IN ('question', 'part', 'subpart')),
  expanded_items jsonb DEFAULT '[]'::jsonb,
  filter_settings jsonb DEFAULT '{
    "showCompleted": true,
    "showIncomplete": true,
    "showNeedsAttachment": true,
    "showErrors": true
  }'::jsonb,
  last_accessed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Question Review Progress table
CREATE TABLE IF NOT EXISTS question_review_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id uuid NOT NULL REFERENCES papers_setup(id) ON DELETE CASCADE,
  question_id uuid REFERENCES questions_master_admin(id) ON DELETE CASCADE,
  sub_question_id uuid REFERENCES sub_questions(id) ON DELETE CASCADE,
  is_complete boolean DEFAULT false,
  needs_attachment boolean DEFAULT false,
  has_error boolean DEFAULT false,
  in_progress boolean DEFAULT false,
  validation_issues jsonb DEFAULT '[]'::jsonb,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT check_question_or_subquestion CHECK (
    (question_id IS NOT NULL AND sub_question_id IS NULL) OR
    (question_id IS NULL AND sub_question_id IS NOT NULL)
  )
);

-- Question Attachment Tracking table
CREATE TABLE IF NOT EXISTS question_attachment_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id uuid NOT NULL REFERENCES papers_setup(id) ON DELETE CASCADE,
  question_id uuid REFERENCES questions_master_admin(id) ON DELETE CASCADE,
  sub_question_id uuid REFERENCES sub_questions(id) ON DELETE CASCADE,
  attachments_required integer DEFAULT 0,
  attachments_uploaded integer DEFAULT 0,
  figure_required boolean DEFAULT false,
  last_upload_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT check_question_or_subquestion_attachment CHECK (
    (question_id IS NOT NULL AND sub_question_id IS NULL) OR
    (question_id IS NULL AND sub_question_id IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_question_navigation_state_user_paper 
  ON question_navigation_state(user_id, paper_id);

CREATE INDEX IF NOT EXISTS idx_question_review_progress_paper 
  ON question_review_progress(paper_id);

CREATE INDEX IF NOT EXISTS idx_question_review_progress_question 
  ON question_review_progress(question_id) WHERE question_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_question_review_progress_sub_question 
  ON question_review_progress(sub_question_id) WHERE sub_question_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_question_attachment_tracking_paper 
  ON question_attachment_tracking(paper_id);

CREATE INDEX IF NOT EXISTS idx_question_attachment_tracking_question 
  ON question_attachment_tracking(question_id) WHERE question_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_question_attachment_tracking_sub_question 
  ON question_attachment_tracking(sub_question_id) WHERE sub_question_id IS NOT NULL;

-- Enable RLS
ALTER TABLE question_navigation_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_review_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_attachment_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for question_navigation_state
CREATE POLICY "Users can manage own navigation state"
  ON question_navigation_state
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System admins can view all navigation state"
  ON question_navigation_state
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
        AND users.user_type = 'system_admin'
    )
  );

-- RLS Policies for question_review_progress
CREATE POLICY "Authenticated users can view review progress"
  ON question_review_progress
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage review progress"
  ON question_review_progress
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for question_attachment_tracking
CREATE POLICY "Authenticated users can view attachment tracking"
  ON question_attachment_tracking
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage attachment tracking"
  ON question_attachment_tracking
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to update navigation state timestamp
CREATE OR REPLACE FUNCTION update_navigation_state_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_accessed_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_navigation_state_timestamp ON question_navigation_state;
CREATE TRIGGER trigger_update_navigation_state_timestamp
  BEFORE UPDATE ON question_navigation_state
  FOR EACH ROW
  EXECUTE FUNCTION update_navigation_state_timestamp();

-- Function to update review progress timestamp
CREATE OR REPLACE FUNCTION update_review_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  
  IF NEW.is_complete = true AND (OLD.is_complete IS NULL OR OLD.is_complete = false) THEN
    NEW.completed_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_review_progress_timestamp ON question_review_progress;
CREATE TRIGGER trigger_update_review_progress_timestamp
  BEFORE UPDATE ON question_review_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_review_progress_timestamp();
