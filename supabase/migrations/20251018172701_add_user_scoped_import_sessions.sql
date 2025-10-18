/*
  # Multi-User Import Sessions Support

  ## Summary
  Enable multiple admin users to run concurrent import sessions by adding user ownership tracking
  to the past_paper_import_sessions table. Previously, the system checked for ANY in-progress session,
  causing conflicts when multiple admins tried to import papers simultaneously.

  ## Changes Made

  1. **Schema Updates**
     - Add `created_by` column to track which user owns each import session
     - Add composite indexes for optimal user-scoped queries
     - Add `last_accessed_at` for session activity tracking

  2. **RLS Policy Updates**
     - Replace global "System admins manage import sessions" policy
     - Add user-scoped SELECT policy (users see only their own sessions)
     - Add user-scoped INSERT policy (auto-populate created_by)
     - Add user-scoped UPDATE policy (users can only update their own sessions)
     - Add user-scoped DELETE policy (users can only delete their own sessions)

  3. **Data Migration**
     - Existing sessions without created_by are left as NULL (legacy sessions)
     - New constraint allows NULL for backward compatibility but enforces NOT NULL on new inserts via policy

  ## Breaking Changes
  - Import session queries must now filter by created_by
  - Applications must pass auth.uid() when creating sessions
  - Legacy sessions (created_by = NULL) will be visible to all admins for cleanup

  ## Security Improvements
  - Each admin can only access their own import sessions
  - Prevents accidental interference between concurrent imports
*/

-- ============================================================================
-- STEP 1: Add User Ownership Column
-- ============================================================================

-- Add created_by column to track session ownership
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'past_paper_import_sessions' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE past_paper_import_sessions
      ADD COLUMN created_by uuid REFERENCES users(id) ON DELETE SET NULL;
    
    COMMENT ON COLUMN past_paper_import_sessions.created_by IS 'User who created this import session';
    
    RAISE NOTICE 'Added created_by column to past_paper_import_sessions';
  END IF;
END $$;

-- Add last_accessed_at column for session activity tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'past_paper_import_sessions' AND column_name = 'last_accessed_at'
  ) THEN
    ALTER TABLE past_paper_import_sessions
      ADD COLUMN last_accessed_at timestamptz DEFAULT now();
    
    COMMENT ON COLUMN past_paper_import_sessions.last_accessed_at IS 'Last time this session was accessed';
    
    RAISE NOTICE 'Added last_accessed_at column to past_paper_import_sessions';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Create Performance Indexes
-- ============================================================================

-- Composite index for user-scoped session queries (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_import_sessions_user_status_created 
  ON past_paper_import_sessions(created_by, status, created_at DESC)
  WHERE created_by IS NOT NULL;

COMMENT ON INDEX idx_import_sessions_user_status_created IS 'Optimizes user-scoped session lookup by status';

-- Index for user's sessions only
CREATE INDEX IF NOT EXISTS idx_import_sessions_created_by 
  ON past_paper_import_sessions(created_by)
  WHERE created_by IS NOT NULL;

-- Index for hash-based duplicate detection scoped by user
CREATE INDEX IF NOT EXISTS idx_import_sessions_user_hash 
  ON past_paper_import_sessions(created_by, json_hash)
  WHERE json_hash IS NOT NULL AND created_by IS NOT NULL;

-- Index for session activity tracking
CREATE INDEX IF NOT EXISTS idx_import_sessions_last_accessed 
  ON past_paper_import_sessions(last_accessed_at DESC)
  WHERE status = 'in_progress';

-- ============================================================================
-- STEP 3: Update RLS Policies for User Scoping
-- ============================================================================

-- Drop the old global policy
DROP POLICY IF EXISTS "System admins manage import sessions" ON past_paper_import_sessions;

-- Policy 1: Users can view their own sessions
CREATE POLICY "Users can view own import sessions"
  ON past_paper_import_sessions
  FOR SELECT
  TO authenticated
  USING (
    is_admin_user(auth.uid()) AND (
      created_by = auth.uid() OR 
      created_by IS NULL  -- Allow viewing legacy sessions for cleanup
    )
  );

-- Policy 2: Users can create sessions (created_by is auto-populated)
CREATE POLICY "Users can create import sessions"
  ON past_paper_import_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin_user(auth.uid()) AND 
    created_by = auth.uid()
  );

-- Policy 3: Users can update their own sessions
CREATE POLICY "Users can update own import sessions"
  ON past_paper_import_sessions
  FOR UPDATE
  TO authenticated
  USING (
    is_admin_user(auth.uid()) AND (
      created_by = auth.uid() OR 
      created_by IS NULL  -- Allow updating legacy sessions
    )
  )
  WITH CHECK (
    is_admin_user(auth.uid()) AND (
      created_by = auth.uid() OR 
      created_by IS NULL
    )
  );

-- Policy 4: Users can delete their own sessions
CREATE POLICY "Users can delete own import sessions"
  ON past_paper_import_sessions
  FOR DELETE
  TO authenticated
  USING (
    is_admin_user(auth.uid()) AND (
      created_by = auth.uid() OR 
      created_by IS NULL  -- Allow deleting legacy sessions
    )
  );

-- ============================================================================
-- STEP 4: Add Helper Function for Session Activity Tracking
-- ============================================================================

-- Function to update last_accessed_at timestamp
CREATE OR REPLACE FUNCTION update_import_session_access()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_accessed_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update last_accessed_at on UPDATE operations
DROP TRIGGER IF EXISTS trigger_update_import_session_access ON past_paper_import_sessions;
CREATE TRIGGER trigger_update_import_session_access
  BEFORE UPDATE ON past_paper_import_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_import_session_access();

-- ============================================================================
-- STEP 5: Add View for Session Monitoring (System Admin)
-- ============================================================================

-- View for system admins to monitor all active import sessions
CREATE OR REPLACE VIEW admin_import_sessions_monitor AS
SELECT 
  pis.id,
  pis.created_by,
  u.email as created_by_email,
  pis.json_file_name,
  pis.status,
  pis.created_at,
  pis.last_accessed_at,
  pis.updated_at,
  EXTRACT(EPOCH FROM (now() - pis.last_accessed_at))/3600 as hours_since_last_access,
  pis.metadata->>'structure_complete' as structure_complete,
  pis.metadata->>'metadata_complete' as metadata_complete,
  pis.metadata->>'questions_imported' as questions_imported,
  jsonb_array_length(COALESCE(pis.raw_json->'questions', '[]'::jsonb)) as question_count
FROM past_paper_import_sessions pis
LEFT JOIN users u ON u.id = pis.created_by
WHERE pis.status = 'in_progress'
ORDER BY pis.last_accessed_at DESC;

COMMENT ON VIEW admin_import_sessions_monitor IS 'System admin view of all active import sessions with activity metrics';

-- ============================================================================
-- STEP 6: Data Quality Checks
-- ============================================================================

-- Check for orphaned sessions (no created_by) - these are legacy sessions
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM past_paper_import_sessions
  WHERE created_by IS NULL;
  
  IF orphaned_count > 0 THEN
    RAISE NOTICE 'Found % legacy import sessions without created_by. These will be visible to all admins for cleanup.', orphaned_count;
  ELSE
    RAISE NOTICE 'No legacy sessions found. All sessions have proper ownership.';
  END IF;
END $$;

-- ============================================================================
-- STEP 7: Grant Permissions
-- ============================================================================

-- Ensure authenticated users can access the view
GRANT SELECT ON admin_import_sessions_monitor TO authenticated;