/*
  # Material Access Logging System

  1. New Tables
    - `material_access_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `material_id` (uuid, references materials)
      - `access_type` (text - 'view', 'download', 'video_stream', 'screenshot_attempt')
      - `ip_address` (text)
      - `user_agent` (text)
      - `accessed_at` (timestamptz)
      - `session_duration` (integer - seconds, nullable)
      - `metadata` (jsonb - additional tracking data)

    - `suspicious_activities`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `material_id` (uuid, references materials, nullable)
      - `activity_type` (text)
      - `severity` (text - 'low', 'medium', 'high', 'critical')
      - `details` (jsonb)
      - `ip_address` (text)
      - `detected_at` (timestamptz)

  2. Indexes
    - Fast lookups by user_id, material_id, access_type
    - Time-based queries optimization

  3. Security
    - Enable RLS on both tables
    - Only authenticated users can read their own logs
    - System admins can read all logs
    - Service role can insert logs
*/

-- Create material_access_logs table
CREATE TABLE IF NOT EXISTS material_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  material_id uuid REFERENCES materials(id) ON DELETE CASCADE,
  access_type text NOT NULL CHECK (access_type IN ('view', 'download', 'video_stream', 'screenshot_attempt', 'preview')),
  ip_address text,
  user_agent text,
  accessed_at timestamptz DEFAULT now(),
  session_duration integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create suspicious_activities table
CREATE TABLE IF NOT EXISTS suspicious_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  material_id uuid REFERENCES materials(id) ON DELETE SET NULL,
  activity_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  detected_at timestamptz DEFAULT now(),
  reviewed boolean DEFAULT false,
  reviewed_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  notes text
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_material_access_logs_user_id ON material_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_material_access_logs_material_id ON material_access_logs(material_id);
CREATE INDEX IF NOT EXISTS idx_material_access_logs_access_type ON material_access_logs(access_type);
CREATE INDEX IF NOT EXISTS idx_material_access_logs_accessed_at ON material_access_logs(accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_material_access_logs_user_material ON material_access_logs(user_id, material_id);

CREATE INDEX IF NOT EXISTS idx_suspicious_activities_user_id ON suspicious_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_material_id ON suspicious_activities(material_id);
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_severity ON suspicious_activities(severity);
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_reviewed ON suspicious_activities(reviewed) WHERE NOT reviewed;
CREATE INDEX IF NOT EXISTS idx_suspicious_activities_detected_at ON suspicious_activities(detected_at DESC);

-- Enable RLS
ALTER TABLE material_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspicious_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for material_access_logs

-- Users can view their own access logs
CREATE POLICY "Users can view own access logs"
  ON material_access_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = material_access_logs.user_id
      AND users.auth_user_id = auth.uid()
    )
  );

-- System admins can view all access logs (check via users table)
CREATE POLICY "System admins can view all access logs"
  ON material_access_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.user_type = 'system_admin'
    )
  );

-- Service role can insert access logs
CREATE POLICY "Service role can insert access logs"
  ON material_access_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Authenticated users can insert their own logs (for client-side tracking)
CREATE POLICY "Users can insert own access logs"
  ON material_access_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = material_access_logs.user_id
      AND users.auth_user_id = auth.uid()
    )
  );

-- RLS Policies for suspicious_activities

-- System admins can view all suspicious activities
CREATE POLICY "System admins can view all suspicious activities"
  ON suspicious_activities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.user_type = 'system_admin'
    )
  );

-- Service role can insert suspicious activities
CREATE POLICY "Service role can insert suspicious activities"
  ON suspicious_activities
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Authenticated users can insert suspicious activity reports
CREATE POLICY "Users can report suspicious activities"
  ON suspicious_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = suspicious_activities.user_id
      AND users.auth_user_id = auth.uid()
    )
  );

-- System admins can update suspicious activities (review them)
CREATE POLICY "System admins can update suspicious activities"
  ON suspicious_activities
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

-- Create helper function to get user access statistics
CREATE OR REPLACE FUNCTION get_user_material_access_stats(p_user_id uuid, p_material_id uuid)
RETURNS TABLE (
  total_accesses bigint,
  last_accessed timestamptz,
  access_types jsonb
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_accesses,
    MAX(accessed_at) as last_accessed,
    jsonb_object_agg(access_type, count) as access_types
  FROM (
    SELECT 
      access_type,
      COUNT(*) as count
    FROM material_access_logs
    WHERE user_id = p_user_id 
    AND material_id = p_material_id
    GROUP BY access_type
  ) stats;
END;
$$;

-- Create helper function to detect suspicious patterns
CREATE OR REPLACE FUNCTION detect_suspicious_video_access()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_recent_access_count integer;
  v_different_ips integer;
BEGIN
  -- Check for rapid repeated access (more than 10 times in 1 hour)
  SELECT COUNT(*) INTO v_recent_access_count
  FROM material_access_logs
  WHERE user_id = NEW.user_id
  AND material_id = NEW.material_id
  AND access_type = 'video_stream'
  AND accessed_at > NOW() - INTERVAL '1 hour';

  IF v_recent_access_count > 10 THEN
    INSERT INTO suspicious_activities (
      user_id,
      material_id,
      activity_type,
      severity,
      details,
      ip_address
    ) VALUES (
      NEW.user_id,
      NEW.material_id,
      'excessive_video_access',
      'medium',
      jsonb_build_object(
        'access_count', v_recent_access_count,
        'timeframe', '1 hour'
      ),
      NEW.ip_address
    );
  END IF;

  -- Check for access from multiple IPs in short time
  SELECT COUNT(DISTINCT ip_address) INTO v_different_ips
  FROM material_access_logs
  WHERE user_id = NEW.user_id
  AND accessed_at > NOW() - INTERVAL '30 minutes';

  IF v_different_ips > 3 THEN
    INSERT INTO suspicious_activities (
      user_id,
      material_id,
      activity_type,
      severity,
      details,
      ip_address
    ) VALUES (
      NEW.user_id,
      NEW.material_id,
      'multiple_ip_access',
      'high',
      jsonb_build_object(
        'ip_count', v_different_ips,
        'timeframe', '30 minutes'
      ),
      NEW.ip_address
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for suspicious activity detection
DROP TRIGGER IF EXISTS trigger_detect_suspicious_access ON material_access_logs;
CREATE TRIGGER trigger_detect_suspicious_access
  AFTER INSERT ON material_access_logs
  FOR EACH ROW
  WHEN (NEW.access_type IN ('video_stream', 'download'))
  EXECUTE FUNCTION detect_suspicious_video_access();
