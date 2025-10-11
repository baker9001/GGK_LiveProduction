/*
  # Video Security Audit and Access Control Tables

  1. New Tables
    - `video_access_tokens` - Tracks signed URL generation and usage
      - `id` (uuid, primary key)
      - `material_id` (uuid, references materials)
      - `user_id` (uuid, references auth.users)
      - `token_hash` (text, unique hash of the signed URL)
      - `expires_at` (timestamptz)
      - `created_at` (timestamptz)
      - `used_at` (timestamptz, nullable)
      - `ip_address` (text)
      - `user_agent` (text)
      - `is_revoked` (boolean)
      - `revoked_at` (timestamptz, nullable)
      - `revoked_reason` (text, nullable)

    - `video_access_audit` - Comprehensive video access logging
      - `id` (uuid, primary key)
      - `material_id` (uuid, references materials)
      - `user_id` (uuid, references auth.users)
      - `student_id` (uuid, references students, nullable)
      - `teacher_id` (uuid, references teachers, nullable)
      - `access_type` (text) - 'stream_request', 'stream_start', 'stream_end', 'token_generated'
      - `session_id` (uuid) - Groups related access events
      - `ip_address` (text)
      - `user_agent` (text)
      - `duration_seconds` (integer, nullable)
      - `video_quality` (text, nullable)
      - `accessed_at` (timestamptz)
      - `metadata` (jsonb) - Additional tracking data

    - `suspicious_video_activity` - Tracks potential security violations
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `material_id` (uuid, references materials, nullable)
      - `activity_type` (text) - 'excessive_replays', 'rapid_token_requests', 'download_attempt', 'devtools_detected', 'suspicious_pattern'
      - `severity` (text) - 'low', 'medium', 'high', 'critical'
      - `details` (jsonb)
      - `ip_address` (text)
      - `user_agent` (text)
      - `detected_at` (timestamptz)
      - `investigated` (boolean)
      - `investigated_at` (timestamptz, nullable)
      - `investigation_notes` (text, nullable)
      - `action_taken` (text, nullable)

    - `video_session_tokens` - Active video viewing sessions
      - `id` (uuid, primary key)
      - `session_id` (uuid, unique)
      - `material_id` (uuid, references materials)
      - `user_id` (uuid, references auth.users)
      - `token_hash` (text)
      - `started_at` (timestamptz)
      - `last_heartbeat` (timestamptz)
      - `ended_at` (timestamptz, nullable)
      - `is_active` (boolean)
      - `ip_address` (text)
      - `device_fingerprint` (text, nullable)

  2. Security
    - Enable RLS on all tables
    - System admins can view all records
    - Users can only view their own audit records
    - Service role has full access for edge function operations

  3. Indexes
    - Add indexes on foreign keys and frequently queried columns
    - Add indexes for audit queries and reporting
*/

-- Create video_access_tokens table
CREATE TABLE IF NOT EXISTS video_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  used_at timestamptz,
  ip_address text NOT NULL,
  user_agent text NOT NULL,
  is_revoked boolean DEFAULT false NOT NULL,
  revoked_at timestamptz,
  revoked_reason text,
  CONSTRAINT token_expiry_check CHECK (expires_at > created_at)
);

-- Create video_access_audit table
CREATE TABLE IF NOT EXISTS video_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE SET NULL,
  teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
  access_type text NOT NULL CHECK (access_type IN ('stream_request', 'stream_start', 'stream_end', 'token_generated', 'token_used', 'playback_error')),
  session_id uuid NOT NULL,
  ip_address text NOT NULL,
  user_agent text NOT NULL,
  duration_seconds integer,
  video_quality text,
  accessed_at timestamptz DEFAULT now() NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create suspicious_video_activity table
CREATE TABLE IF NOT EXISTS suspicious_video_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id uuid REFERENCES materials(id) ON DELETE SET NULL,
  activity_type text NOT NULL CHECK (activity_type IN ('excessive_replays', 'rapid_token_requests', 'download_attempt', 'devtools_detected', 'suspicious_pattern', 'window_hidden_while_playing', 'multiple_concurrent_sessions')),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text NOT NULL,
  user_agent text NOT NULL,
  detected_at timestamptz DEFAULT now() NOT NULL,
  investigated boolean DEFAULT false NOT NULL,
  investigated_at timestamptz,
  investigation_notes text,
  action_taken text
);

-- Create video_session_tokens table
CREATE TABLE IF NOT EXISTS video_session_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  started_at timestamptz DEFAULT now() NOT NULL,
  last_heartbeat timestamptz DEFAULT now() NOT NULL,
  ended_at timestamptz,
  is_active boolean DEFAULT true NOT NULL,
  ip_address text NOT NULL,
  device_fingerprint text
);

-- Create indexes for video_access_tokens
CREATE INDEX IF NOT EXISTS idx_video_access_tokens_material_id ON video_access_tokens(material_id);
CREATE INDEX IF NOT EXISTS idx_video_access_tokens_user_id ON video_access_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_video_access_tokens_expires_at ON video_access_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_video_access_tokens_created_at ON video_access_tokens(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_access_tokens_is_revoked ON video_access_tokens(is_revoked) WHERE is_revoked = false;

-- Create indexes for video_access_audit
CREATE INDEX IF NOT EXISTS idx_video_access_audit_material_id ON video_access_audit(material_id);
CREATE INDEX IF NOT EXISTS idx_video_access_audit_user_id ON video_access_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_video_access_audit_session_id ON video_access_audit(session_id);
CREATE INDEX IF NOT EXISTS idx_video_access_audit_accessed_at ON video_access_audit(accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_access_audit_access_type ON video_access_audit(access_type);

-- Create indexes for suspicious_video_activity
CREATE INDEX IF NOT EXISTS idx_suspicious_video_activity_user_id ON suspicious_video_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_video_activity_material_id ON suspicious_video_activity(material_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_video_activity_detected_at ON suspicious_video_activity(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_suspicious_video_activity_severity ON suspicious_video_activity(severity);
CREATE INDEX IF NOT EXISTS idx_suspicious_video_activity_investigated ON suspicious_video_activity(investigated) WHERE investigated = false;

-- Create indexes for video_session_tokens
CREATE INDEX IF NOT EXISTS idx_video_session_tokens_session_id ON video_session_tokens(session_id);
CREATE INDEX IF NOT EXISTS idx_video_session_tokens_material_id ON video_session_tokens(material_id);
CREATE INDEX IF NOT EXISTS idx_video_session_tokens_user_id ON video_session_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_video_session_tokens_is_active ON video_session_tokens(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_video_session_tokens_last_heartbeat ON video_session_tokens(last_heartbeat DESC);

-- Enable RLS on all tables
ALTER TABLE video_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_access_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspicious_video_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_session_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_access_tokens
CREATE POLICY "Service role has full access to video access tokens"
  ON video_access_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "System admins can view all video access tokens"
  ON video_access_tokens
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.user_type = 'system_admin'
    )
  );

-- RLS Policies for video_access_audit
CREATE POLICY "Service role has full access to video access audit"
  ON video_access_audit
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "System admins can view all video access audit logs"
  ON video_access_audit
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.user_type = 'system_admin'
    )
  );

CREATE POLICY "Users can view their own video access audit logs"
  ON video_access_audit
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for suspicious_video_activity
CREATE POLICY "Service role has full access to suspicious video activity"
  ON suspicious_video_activity
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "System admins can view all suspicious video activity"
  ON suspicious_video_activity
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.user_type = 'system_admin'
    )
  );

CREATE POLICY "System admins can update suspicious video activity investigations"
  ON suspicious_video_activity
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.user_type = 'system_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.user_type = 'system_admin'
    )
  );

-- RLS Policies for video_session_tokens
CREATE POLICY "Service role has full access to video session tokens"
  ON video_session_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "System admins can view all video session tokens"
  ON video_session_tokens
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.user_type = 'system_admin'
    )
  );

-- Create a function to automatically expire old tokens
CREATE OR REPLACE FUNCTION expire_old_video_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE video_access_tokens
  SET is_revoked = true,
      revoked_at = now(),
      revoked_reason = 'Automatic expiration'
  WHERE expires_at < now()
    AND is_revoked = false;
END;
$$;

-- Create a function to clean up inactive sessions
CREATE OR REPLACE FUNCTION cleanup_inactive_video_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE video_session_tokens
  SET is_active = false,
      ended_at = now()
  WHERE last_heartbeat < now() - INTERVAL '10 minutes'
    AND is_active = true;
END;
$$;
