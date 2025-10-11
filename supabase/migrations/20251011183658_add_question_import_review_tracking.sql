/*
  # Add Question Import Review Tracking System

  ## Summary
  This migration adds comprehensive review tracking for question import workflow,
  enabling teachers to review and validate each question before final import.

  ## Changes

  1. **New Tables**
     - `question_import_review_sessions`: Track import sessions with review metadata
     - `question_import_review_status`: Individual question review status and validation
     - `question_import_simulation_results`: Store test simulation results and performance

  2. **Features**
     - Track which questions have been reviewed and validated
     - Store simulation test results with detailed scoring
     - Record validation issues and their resolution status
     - Maintain audit trail of review process
     - Support workflow state management

  3. **Security**
     - Enable RLS on all new tables
     - Restrict access to authenticated users
     - Ensure users can only access their own review sessions
     - System admins have full access for monitoring

  ## Purpose
  Ensures data quality by requiring systematic review and testing of all questions
  before they are imported into the production question bank.
*/

-- Create question import review sessions table
CREATE TABLE IF NOT EXISTS question_import_review_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_import_session_id uuid REFERENCES past_paper_import_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  paper_id uuid,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  total_questions integer NOT NULL DEFAULT 0,
  reviewed_questions integer NOT NULL DEFAULT 0,
  questions_with_issues integer NOT NULL DEFAULT 0,
  simulation_required boolean DEFAULT false,
  simulation_completed boolean DEFAULT false,
  simulation_passed boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create indexes for review sessions
CREATE INDEX IF NOT EXISTS idx_question_import_review_sessions_paper_import
  ON question_import_review_sessions(paper_import_session_id);
CREATE INDEX IF NOT EXISTS idx_question_import_review_sessions_user
  ON question_import_review_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_question_import_review_sessions_status
  ON question_import_review_sessions(status);
CREATE INDEX IF NOT EXISTS idx_question_import_review_sessions_created
  ON question_import_review_sessions(created_at DESC);

-- Create question import review status table
CREATE TABLE IF NOT EXISTS question_import_review_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_session_id uuid NOT NULL REFERENCES question_import_review_sessions(id) ON DELETE CASCADE,
  question_identifier text NOT NULL,
  question_number text NOT NULL,
  question_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_reviewed boolean DEFAULT false,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES users(id),
  has_issues boolean DEFAULT false,
  issue_count integer DEFAULT 0,
  issues jsonb DEFAULT '[]'::jsonb,
  needs_attention boolean DEFAULT false,
  attention_reason text,
  validation_status text DEFAULT 'pending' CHECK (validation_status IN ('pending', 'passed', 'failed', 'warning')),
  validation_errors jsonb DEFAULT '[]'::jsonb,
  attachments_verified boolean DEFAULT false,
  answers_verified boolean DEFAULT false,
  metadata_verified boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(review_session_id, question_identifier)
);

-- Create indexes for review status
CREATE INDEX IF NOT EXISTS idx_question_import_review_status_session
  ON question_import_review_status(review_session_id);
CREATE INDEX IF NOT EXISTS idx_question_import_review_status_identifier
  ON question_import_review_status(question_identifier);
CREATE INDEX IF NOT EXISTS idx_question_import_review_status_reviewed
  ON question_import_review_status(is_reviewed);
CREATE INDEX IF NOT EXISTS idx_question_import_review_status_issues
  ON question_import_review_status(has_issues) WHERE has_issues = true;
CREATE INDEX IF NOT EXISTS idx_question_import_review_status_validation
  ON question_import_review_status(validation_status);

-- Create question import simulation results table
CREATE TABLE IF NOT EXISTS question_import_simulation_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_session_id uuid NOT NULL REFERENCES question_import_review_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  simulation_started_at timestamptz NOT NULL DEFAULT now(),
  simulation_completed_at timestamptz,
  total_questions integer NOT NULL,
  answered_questions integer DEFAULT 0,
  correct_answers integer DEFAULT 0,
  partially_correct integer DEFAULT 0,
  incorrect_answers integer DEFAULT 0,
  total_marks integer NOT NULL,
  earned_marks decimal(10, 2) DEFAULT 0,
  percentage decimal(5, 2) DEFAULT 0,
  time_spent_seconds integer DEFAULT 0,
  passed boolean DEFAULT false,
  pass_threshold decimal(5, 2) DEFAULT 70.0,
  question_results jsonb DEFAULT '[]'::jsonb,
  flagged_questions jsonb DEFAULT '[]'::jsonb,
  issues_identified jsonb DEFAULT '[]'::jsonb,
  recommendations jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for simulation results
CREATE INDEX IF NOT EXISTS idx_question_import_simulation_results_session
  ON question_import_simulation_results(review_session_id);
CREATE INDEX IF NOT EXISTS idx_question_import_simulation_results_user
  ON question_import_simulation_results(user_id);
CREATE INDEX IF NOT EXISTS idx_question_import_simulation_results_passed
  ON question_import_simulation_results(passed);
CREATE INDEX IF NOT EXISTS idx_question_import_simulation_results_created
  ON question_import_simulation_results(created_at DESC);

-- Enable Row Level Security
ALTER TABLE question_import_review_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_import_review_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_import_simulation_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for question_import_review_sessions

-- Users can view their own review sessions
CREATE POLICY "Users can view own review sessions"
  ON question_import_review_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create review sessions
CREATE POLICY "Users can create review sessions"
  ON question_import_review_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own review sessions
CREATE POLICY "Users can update own review sessions"
  ON question_import_review_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- System admins can view all review sessions
CREATE POLICY "System admins can view all review sessions"
  ON question_import_review_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- RLS Policies for question_import_review_status

-- Users can view review status for their sessions
CREATE POLICY "Users can view review status for own sessions"
  ON question_import_review_status
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM question_import_review_sessions
      WHERE question_import_review_sessions.id = question_import_review_status.review_session_id
      AND question_import_review_sessions.user_id = auth.uid()
    )
  );

-- Users can create review status for their sessions
CREATE POLICY "Users can create review status for own sessions"
  ON question_import_review_status
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM question_import_review_sessions
      WHERE question_import_review_sessions.id = question_import_review_status.review_session_id
      AND question_import_review_sessions.user_id = auth.uid()
    )
  );

-- Users can update review status for their sessions
CREATE POLICY "Users can update review status for own sessions"
  ON question_import_review_status
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM question_import_review_sessions
      WHERE question_import_review_sessions.id = question_import_review_status.review_session_id
      AND question_import_review_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM question_import_review_sessions
      WHERE question_import_review_sessions.id = question_import_review_status.review_session_id
      AND question_import_review_sessions.user_id = auth.uid()
    )
  );

-- System admins can view all review statuses
CREATE POLICY "System admins can view all review statuses"
  ON question_import_review_status
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- RLS Policies for question_import_simulation_results

-- Users can view their own simulation results
CREATE POLICY "Users can view own simulation results"
  ON question_import_simulation_results
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create simulation results
CREATE POLICY "Users can create simulation results"
  ON question_import_simulation_results
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own simulation results
CREATE POLICY "Users can update own simulation results"
  ON question_import_simulation_results
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- System admins can view all simulation results
CREATE POLICY "System admins can view all simulation results"
  ON question_import_simulation_results
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = true
    )
  );

-- Function to update review session statistics
CREATE OR REPLACE FUNCTION update_review_session_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the review session statistics whenever a question review status changes
  UPDATE question_import_review_sessions
  SET
    reviewed_questions = (
      SELECT COUNT(*)
      FROM question_import_review_status
      WHERE review_session_id = NEW.review_session_id
      AND is_reviewed = true
    ),
    questions_with_issues = (
      SELECT COUNT(*)
      FROM question_import_review_status
      WHERE review_session_id = NEW.review_session_id
      AND has_issues = true
    ),
    updated_at = now()
  WHERE id = NEW.review_session_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically update session stats
DROP TRIGGER IF EXISTS trigger_update_review_session_stats ON question_import_review_status;
CREATE TRIGGER trigger_update_review_session_stats
  AFTER INSERT OR UPDATE ON question_import_review_status
  FOR EACH ROW
  EXECUTE FUNCTION update_review_session_stats();

-- Function to mark review session as completed
CREATE OR REPLACE FUNCTION complete_review_session(session_id uuid)
RETURNS boolean AS $$
DECLARE
  all_reviewed boolean;
BEGIN
  -- Check if all questions are reviewed
  SELECT (
    SELECT COUNT(*) FROM question_import_review_status
    WHERE review_session_id = session_id
    AND is_reviewed = true
  ) = (
    SELECT total_questions FROM question_import_review_sessions
    WHERE id = session_id
  ) INTO all_reviewed;

  IF all_reviewed THEN
    UPDATE question_import_review_sessions
    SET
      status = 'completed',
      completed_at = now(),
      updated_at = now()
    WHERE id = session_id;

    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment to explain the purpose
COMMENT ON TABLE question_import_review_sessions IS 'Tracks question import review workflow sessions with validation and simulation requirements';
COMMENT ON TABLE question_import_review_status IS 'Individual question review status and validation tracking during import process';
COMMENT ON TABLE question_import_simulation_results IS 'Stores test simulation results for quality assurance before final import';
