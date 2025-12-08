/*
  # Add working_json Column to Import Sessions

  ## Overview
  This migration adds a `working_json` column to track editable question data during the review process.
  This solves the critical data loss issue where all review edits were lost on page refresh.

  ## Problem Statement
  Previously, only `raw_json` existed (immutable original). All review edits lived in React state only.
  When users refreshed the page, all edits were lost because they were never persisted to database.

  ## Solution
  1. New Tables/Columns
     - Add `working_json` column to `past_paper_import_sessions`
       - Stores editable copy of JSON that gets updated during review
       - Initialized from raw_json for existing sessions
     - Add `last_synced_at` timestamp to track when working_json was last updated
  
  2. Data Flow
     - `raw_json`: Original uploaded JSON (immutable audit trail)
     - `working_json`: Live editable copy updated during review
     - Import process uses `working_json`, not `raw_json`

  ## Changes Made
  1. Add working_json column (JSONB type, indexed for performance)
  2. Add last_synced_at column (timestamp tracking)
  3. Initialize working_json from raw_json for existing sessions
  4. Create GIN index on working_json for fast queries
  5. Add helpful comments for future developers

  ## Security
  - RLS policies remain unchanged (inherited from table)
  - working_json follows same access rules as raw_json

  ## Performance
  - GIN index on working_json enables fast JSON queries
  - Debounced auto-save prevents excessive writes
*/

-- Add working_json column to store editable copy of questions
ALTER TABLE past_paper_import_sessions
ADD COLUMN IF NOT EXISTS working_json jsonb;

-- Add last_synced_at to track when working_json was last updated
ALTER TABLE past_paper_import_sessions
ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

-- Initialize working_json from raw_json for all existing sessions
-- This ensures backwards compatibility
UPDATE past_paper_import_sessions
SET working_json = raw_json,
    last_synced_at = COALESCE(updated_at, created_at)
WHERE working_json IS NULL 
  AND raw_json IS NOT NULL;

-- Create GIN index on working_json for efficient JSON queries
-- This enables fast searches within the JSON structure
CREATE INDEX IF NOT EXISTS idx_import_sessions_working_json
ON past_paper_import_sessions
USING gin(working_json);

-- Create index on last_synced_at for sorting/filtering
CREATE INDEX IF NOT EXISTS idx_import_sessions_last_synced
ON past_paper_import_sessions(last_synced_at)
WHERE last_synced_at IS NOT NULL;

-- Add helpful comments
COMMENT ON COLUMN past_paper_import_sessions.raw_json IS
'Original uploaded JSON (immutable). Preserved as audit trail and for rollback.';

COMMENT ON COLUMN past_paper_import_sessions.working_json IS
'Editable copy of JSON that gets updated during review process. Used for test simulation and final import.';

COMMENT ON COLUMN past_paper_import_sessions.last_synced_at IS
'Timestamp when working_json was last updated. Used to track review progress and detect stale data.';
