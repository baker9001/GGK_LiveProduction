/*
  # Add Review Tracking to Import Sessions

  1. Overview
    This migration adds review tracking fields directly to the past_paper_import_sessions table,
    eliminating the need for a separate question_import_review_sessions table.

  2. New Columns Added
    - total_questions: Total number of questions in the paper
    - questions_reviewed: Count of questions that have been reviewed
    - simulation_required: Whether test simulation is required for QA
    - simulation_completed: Whether simulation has been completed
    - simulation_passed: Whether simulation passed the threshold
    - review_status: Current status of the review process
    - review_metadata: Additional review-related data (JSONB)

  3. Purpose
    Simplify the architecture by consolidating review tracking into the import session,
    reducing complexity and eliminating the need for a separate review session table.

  4. Benefits
    - Single source of truth for session management
    - Fewer database queries (no need to lookup review session)
    - Simpler RLS policies (fewer table JOINs)
    - Better performance and maintainability
*/

-- Add review tracking columns to past_paper_import_sessions
DO $$
BEGIN
  -- Add total_questions column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'past_paper_import_sessions' AND column_name = 'total_questions'
  ) THEN
    ALTER TABLE past_paper_import_sessions
    ADD COLUMN total_questions integer DEFAULT 0 NOT NULL;

    COMMENT ON COLUMN past_paper_import_sessions.total_questions IS 'Total number of questions in the paper';
    RAISE NOTICE 'Added total_questions column';
  END IF;

  -- Add questions_reviewed column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'past_paper_import_sessions' AND column_name = 'questions_reviewed'
  ) THEN
    ALTER TABLE past_paper_import_sessions
    ADD COLUMN questions_reviewed integer DEFAULT 0 NOT NULL;

    COMMENT ON COLUMN past_paper_import_sessions.questions_reviewed IS 'Number of questions that have been reviewed';
    RAISE NOTICE 'Added questions_reviewed column';
  END IF;

  -- Add simulation_required column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'past_paper_import_sessions' AND column_name = 'simulation_required'
  ) THEN
    ALTER TABLE past_paper_import_sessions
    ADD COLUMN simulation_required boolean DEFAULT false NOT NULL;

    COMMENT ON COLUMN past_paper_import_sessions.simulation_required IS 'Whether test simulation is required for QA';
    RAISE NOTICE 'Added simulation_required column';
  END IF;

  -- Add simulation_completed column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'past_paper_import_sessions' AND column_name = 'simulation_completed'
  ) THEN
    ALTER TABLE past_paper_import_sessions
    ADD COLUMN simulation_completed boolean DEFAULT false NOT NULL;

    COMMENT ON COLUMN past_paper_import_sessions.simulation_completed IS 'Whether test simulation has been completed';
    RAISE NOTICE 'Added simulation_completed column';
  END IF;

  -- Add simulation_passed column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'past_paper_import_sessions' AND column_name = 'simulation_passed'
  ) THEN
    ALTER TABLE past_paper_import_sessions
    ADD COLUMN simulation_passed boolean DEFAULT false NOT NULL;

    COMMENT ON COLUMN past_paper_import_sessions.simulation_passed IS 'Whether simulation passed the quality threshold';
    RAISE NOTICE 'Added simulation_passed column';
  END IF;

  -- Add review_status column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'past_paper_import_sessions' AND column_name = 'review_status'
  ) THEN
    ALTER TABLE past_paper_import_sessions
    ADD COLUMN review_status text DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'in_progress', 'completed', 'abandoned'));

    COMMENT ON COLUMN past_paper_import_sessions.review_status IS 'Current status of the review process';
    RAISE NOTICE 'Added review_status column';
  END IF;

  -- Add review_metadata column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'past_paper_import_sessions' AND column_name = 'review_metadata'
  ) THEN
    ALTER TABLE past_paper_import_sessions
    ADD COLUMN review_metadata jsonb DEFAULT '{}'::jsonb;

    COMMENT ON COLUMN past_paper_import_sessions.review_metadata IS 'Additional review-related data (paper title, duration, etc.)';
    RAISE NOTICE 'Added review_metadata column';
  END IF;
END $$;

-- Create index for review_status for faster filtering
CREATE INDEX IF NOT EXISTS idx_import_sessions_review_status
  ON past_paper_import_sessions(review_status);

-- Create composite index for user + status queries
CREATE INDEX IF NOT EXISTS idx_import_sessions_user_review_status
  ON past_paper_import_sessions(created_by, review_status);

-- Add comment to table
COMMENT ON TABLE past_paper_import_sessions IS 'Stores paper import sessions with integrated review tracking';
