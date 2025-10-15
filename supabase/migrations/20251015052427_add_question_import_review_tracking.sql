/*
  # Question Import Review Tracking System

  ## Overview
  This migration creates tables to track question review progress during the paper import workflow.
  It enables the QuestionImportReviewWorkflow component to display question cards and track review status.

  ## New Tables Created
  
  1. `question_import_review_sessions`
     - Tracks overall review sessions for paper imports
     - Links to `past_paper_import_sessions` table
     - Stores metadata about review progress and simulation requirements
  
  2. `question_import_review_status`
     - Tracks individual question review status within a session
     - Stores validation status and issues for each question
     - Records who reviewed each question and when
  
  3. `question_import_simulation_results`
     - Stores test simulation results for quality assurance
     - Tracks pass/fail status and detailed results
     - Links to review sessions for complete audit trail

  ## Security
  - All tables have RLS enabled
  - Authenticated users can only access their own review sessions
  - System admins have full access to all review data
*/

-- Create question_import_review_sessions table
CREATE TABLE IF NOT EXISTS question_import_review_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_import_session_id uuid REFERENCES past_paper_import_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  total_questions integer NOT NULL DEFAULT 0,
  questions_reviewed integer DEFAULT 0,
  simulation_required boolean DEFAULT false,
  simulation_completed boolean DEFAULT false,
  simulation_passed boolean DEFAULT false,
  status text DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_review_sessions_paper_import 
  ON question_import_review_sessions(paper_import_session_id);
CREATE INDEX IF NOT EXISTS idx_review_sessions_user 
  ON question_import_review_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_review_sessions_status 
  ON question_import_review_sessions(status);

-- Enable RLS
ALTER TABLE question_import_review_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for review sessions
CREATE POLICY "Users can view own review sessions"
  ON question_import_review_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own review sessions"
  ON question_import_review_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own review sessions"
  ON question_import_review_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System admins can view all review sessions"
  ON question_import_review_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.user_type = 'system_admin'
      AND users.is_active = true
    )
  );

-- Create question_import_review_status table
CREATE TABLE IF NOT EXISTS question_import_review_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_session_id uuid NOT NULL REFERENCES question_import_review_sessions(id) ON DELETE CASCADE,
  question_identifier text NOT NULL,
  question_number text,
  question_data jsonb,
  is_reviewed boolean DEFAULT false,
  reviewed_at timestamptz,
  reviewed_by uuid,
  has_issues boolean DEFAULT false,
  issue_count integer DEFAULT 0,
  needs_attention boolean DEFAULT false,
  validation_status text DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'invalid', 'warning')),
  validation_errors jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_review_status_session 
  ON question_import_review_status(review_session_id);
CREATE INDEX IF NOT EXISTS idx_review_status_identifier 
  ON question_import_review_status(question_identifier);
CREATE INDEX IF NOT EXISTS idx_review_status_reviewed 
  ON question_import_review_status(is_reviewed);

-- Enable RLS
ALTER TABLE question_import_review_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for review status
CREATE POLICY "Users can view own question review status"
  ON question_import_review_status
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM question_import_review_sessions
      WHERE question_import_review_sessions.id = review_session_id
      AND question_import_review_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own question review status"
  ON question_import_review_status
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM question_import_review_sessions
      WHERE question_import_review_sessions.id = review_session_id
      AND question_import_review_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own question review status"
  ON question_import_review_status
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM question_import_review_sessions
      WHERE question_import_review_sessions.id = review_session_id
      AND question_import_review_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM question_import_review_sessions
      WHERE question_import_review_sessions.id = review_session_id
      AND question_import_review_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "System admins can manage all question review status"
  ON question_import_review_status
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.user_type = 'system_admin'
      AND users.is_active = true
    )
  );

-- Create question_import_simulation_results table
CREATE TABLE IF NOT EXISTS question_import_simulation_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_session_id uuid NOT NULL REFERENCES question_import_review_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  simulation_completed_at timestamptz DEFAULT now(),
  total_questions integer NOT NULL DEFAULT 0,
  answered_questions integer DEFAULT 0,
  correct_answers integer DEFAULT 0,
  partially_correct integer DEFAULT 0,
  incorrect_answers integer DEFAULT 0,
  total_marks numeric(10,2) DEFAULT 0,
  earned_marks numeric(10,2) DEFAULT 0,
  percentage numeric(5,2) DEFAULT 0,
  time_spent_seconds integer DEFAULT 0,
  passed boolean DEFAULT false,
  pass_threshold numeric(5,2) DEFAULT 70.0,
  question_results jsonb DEFAULT '[]'::jsonb,
  issues_found jsonb DEFAULT '[]'::jsonb,
  recommendations jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_simulation_results_session 
  ON question_import_simulation_results(review_session_id);
CREATE INDEX IF NOT EXISTS idx_simulation_results_user 
  ON question_import_simulation_results(user_id);
CREATE INDEX IF NOT EXISTS idx_simulation_results_passed 
  ON question_import_simulation_results(passed);

-- Enable RLS
ALTER TABLE question_import_simulation_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for simulation results
CREATE POLICY "Users can view own simulation results"
  ON question_import_simulation_results
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own simulation results"
  ON question_import_simulation_results
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System admins can view all simulation results"
  ON question_import_simulation_results
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.user_type = 'system_admin'
      AND users.is_active = true
    )
  );

-- Add function to update review session progress
CREATE OR REPLACE FUNCTION update_review_session_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Update questions_reviewed count and updated_at
  UPDATE question_import_review_sessions
  SET 
    questions_reviewed = (
      SELECT COUNT(*) 
      FROM question_import_review_status 
      WHERE review_session_id = NEW.review_session_id 
      AND is_reviewed = true
    ),
    updated_at = now()
  WHERE id = NEW.review_session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update progress
DROP TRIGGER IF EXISTS trigger_update_review_progress ON question_import_review_status;
CREATE TRIGGER trigger_update_review_progress
  AFTER INSERT OR UPDATE OF is_reviewed
  ON question_import_review_status
  FOR EACH ROW
  EXECUTE FUNCTION update_review_session_progress();
