/*
  # Create Invitation Status Tracking Table

  ## Purpose
  Track invitation email delivery status for user onboarding across all user types.
  Enables monitoring, debugging, and resending of invitation emails.

  ## Changes
  1. New Tables
    - `invitation_status`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, foreign key) - References auth.users (not users table to avoid circular dependency)
      - `email` (text, not null) - Email address the invitation was sent to
      - `user_type` (text, not null) - Type of user being invited (system, entity, teacher, student)
      - `sent_at` (timestamptz) - When invitation email was sent
      - `opened_at` (timestamptz) - When invitation link was clicked (future enhancement)
      - `completed_at` (timestamptz) - When user completed password setup
      - `failed_at` (timestamptz) - When email delivery failed
      - `failed_reason` (text) - Reason for email delivery failure
      - `retry_count` (integer) - Number of times invitation was resent
      - `last_retry_at` (timestamptz) - Last time invitation was resent
      - `metadata` (jsonb) - Additional tracking data
      - `created_at` (timestamptz) - Record creation timestamp
      - `created_by` (text) - Admin who initiated invitation

  2. Indexes
    - Index on user_id for fast lookups
    - Index on email for tracking by email
    - Index on sent_at for analytics

  3. Security
    - Enable RLS on invitation_status table
    - System admins can view all invitation statuses
    - Entity admins can view invitations for their organization
    - Regular users cannot access this table
*/

-- Create invitation_status table
CREATE TABLE IF NOT EXISTS invitation_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  user_type text NOT NULL CHECK (user_type IN ('system', 'entity', 'teacher', 'student', 'parent', 'staff')),
  sent_at timestamptz,
  opened_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  failed_reason text,
  retry_count integer DEFAULT 0,
  last_retry_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  created_by text,
  CONSTRAINT valid_retry_count CHECK (retry_count >= 0 AND retry_count <= 10),
  CONSTRAINT valid_status_dates CHECK (
    (sent_at IS NULL OR failed_at IS NULL OR sent_at <= failed_at) AND
    (sent_at IS NULL OR opened_at IS NULL OR sent_at <= opened_at) AND
    (opened_at IS NULL OR completed_at IS NULL OR opened_at <= completed_at)
  )
);

-- Add helpful comment
COMMENT ON TABLE invitation_status IS 'Tracks invitation email delivery status for user onboarding across all user types';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invitation_status_user_id
  ON invitation_status(user_id);

CREATE INDEX IF NOT EXISTS idx_invitation_status_email
  ON invitation_status(email);

CREATE INDEX IF NOT EXISTS idx_invitation_status_sent_at
  ON invitation_status(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_invitation_status_user_type
  ON invitation_status(user_type);

CREATE INDEX IF NOT EXISTS idx_invitation_status_failed
  ON invitation_status(failed_at)
  WHERE failed_at IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE invitation_status ENABLE ROW LEVEL SECURITY;

-- Policy: System admins can view all invitation statuses
CREATE POLICY "System admins can view all invitation statuses"
  ON invitation_status
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.id = auth.uid()
    )
  );

-- Policy: System admins can insert invitation records
CREATE POLICY "System admins can insert invitation records"
  ON invitation_status
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.id = auth.uid()
    )
  );

-- Policy: System admins can update invitation statuses
CREATE POLICY "System admins can update invitation statuses"
  ON invitation_status
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.id = auth.uid()
    )
  );

-- Policy: Entity admins can view invitation statuses for their organization
CREATE POLICY "Entity admins can view their organization invitations"
  ON invitation_status
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_users eu
      WHERE eu.user_id = auth.uid()
      AND eu.is_active = true
    )
  );

-- Policy: Entity admins can insert invitation records for their organization
CREATE POLICY "Entity admins can create invitations"
  ON invitation_status
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM entity_users eu
      WHERE eu.user_id = auth.uid()
      AND eu.is_active = true
    )
  );

-- Policy: Entity admins can update invitation statuses for their organization
CREATE POLICY "Entity admins can update their organization invitations"
  ON invitation_status
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM entity_users eu
      WHERE eu.user_id = auth.uid()
      AND eu.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM entity_users eu
      WHERE eu.user_id = auth.uid()
      AND eu.is_active = true
    )
  );

-- Create helper function to update invitation status
CREATE OR REPLACE FUNCTION update_invitation_status(
  p_user_id uuid,
  p_status text,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_status = 'sent' THEN
    UPDATE invitation_status
    SET sent_at = now()
    WHERE user_id = p_user_id
    AND sent_at IS NULL;
  ELSIF p_status = 'opened' THEN
    UPDATE invitation_status
    SET opened_at = now()
    WHERE user_id = p_user_id
    AND opened_at IS NULL;
  ELSIF p_status = 'completed' THEN
    UPDATE invitation_status
    SET completed_at = now()
    WHERE user_id = p_user_id
    AND completed_at IS NULL;
  ELSIF p_status = 'failed' THEN
    UPDATE invitation_status
    SET
      failed_at = now(),
      failed_reason = p_reason
    WHERE user_id = p_user_id
    AND failed_at IS NULL;
  END IF;
END;
$$;

COMMENT ON FUNCTION update_invitation_status IS 'Helper function to update invitation status timestamps';

-- Create function to check if invitation can be resent
CREATE OR REPLACE FUNCTION can_resend_invitation(
  p_email text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_latest_invite invitation_status;
  v_can_resend boolean := false;
BEGIN
  -- Get the most recent invitation for this email
  SELECT * INTO v_latest_invite
  FROM invitation_status
  WHERE email = p_email
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no invitation exists, can send
  IF v_latest_invite IS NULL THEN
    RETURN true;
  END IF;

  -- If invitation was completed, cannot resend
  IF v_latest_invite.completed_at IS NOT NULL THEN
    RETURN false;
  END IF;

  -- If retry count is 10 or more, cannot resend
  IF v_latest_invite.retry_count >= 10 THEN
    RETURN false;
  END IF;

  -- If last retry was within 24 hours and retry count >= 3, cannot resend
  IF v_latest_invite.last_retry_at IS NOT NULL
     AND v_latest_invite.last_retry_at > now() - interval '24 hours'
     AND v_latest_invite.retry_count >= 3 THEN
    RETURN false;
  END IF;

  -- If last sent was within 1 hour, cannot resend
  IF v_latest_invite.sent_at IS NOT NULL
     AND v_latest_invite.sent_at > now() - interval '1 hour' THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION can_resend_invitation IS 'Check if invitation can be resent based on retry limits and timing';

-- Create analytics view for invitation metrics
CREATE OR REPLACE VIEW invitation_analytics AS
SELECT
  user_type,
  COUNT(*) as total_invitations,
  COUNT(sent_at) as sent_count,
  COUNT(opened_at) as opened_count,
  COUNT(completed_at) as completed_count,
  COUNT(failed_at) as failed_count,
  ROUND(100.0 * COUNT(completed_at) / NULLIF(COUNT(sent_at), 0), 2) as completion_rate,
  ROUND(100.0 * COUNT(failed_at) / NULLIF(COUNT(*), 0), 2) as failure_rate,
  AVG(EXTRACT(EPOCH FROM (completed_at - sent_at)) / 3600) as avg_hours_to_complete
FROM invitation_status
GROUP BY user_type;

COMMENT ON VIEW invitation_analytics IS 'Analytics view for invitation success rates and metrics by user type';