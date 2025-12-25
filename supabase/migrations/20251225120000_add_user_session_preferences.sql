-- Migration: Add User Session Preferences Table
-- Date: December 25, 2025
-- Description: Creates table for storing user session preferences
--              including idle timeout, warning style, and notification settings

-- Create user session preferences table
CREATE TABLE IF NOT EXISTS user_session_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session Duration (minutes)
  idle_timeout_minutes INTEGER NOT NULL DEFAULT 60
    CHECK (idle_timeout_minutes >= 15 AND idle_timeout_minutes <= 480),

  -- Remember Me Duration (days)
  remember_me_days INTEGER NOT NULL DEFAULT 30
    CHECK (remember_me_days >= 1 AND remember_me_days <= 30),

  -- Warning Style: 'silent', 'toast', or 'banner'
  warning_style VARCHAR(20) NOT NULL DEFAULT 'silent'
    CHECK (warning_style IN ('silent', 'toast', 'banner')),

  -- Warning Threshold (minutes before expiry to warn)
  warning_threshold_minutes INTEGER NOT NULL DEFAULT 2
    CHECK (warning_threshold_minutes >= 1 AND warning_threshold_minutes <= 10),

  -- Behavior Settings
  auto_extend_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  extend_on_activity BOOLEAN NOT NULL DEFAULT TRUE,

  -- Notification Settings
  sound_enabled BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one preference record per user
  UNIQUE(user_id)
);

-- Index for fast lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_session_preferences_user_id
  ON user_session_preferences(user_id);

-- Enable Row Level Security
ALTER TABLE user_session_preferences ENABLE ROW LEVEL SECURITY;

-- Users can manage their own session preferences
CREATE POLICY "Users can manage own session preferences"
  ON user_session_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all preferences (for support purposes)
CREATE POLICY "Admins can view all preferences"
  ON user_session_preferences
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('SSA', 'SUPPORT')
    )
  );

-- Create trigger function for auto-updating timestamp
CREATE OR REPLACE FUNCTION update_session_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_user_session_preferences_timestamp
  BEFORE UPDATE ON user_session_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_session_preferences_timestamp();

-- Add comment for documentation
COMMENT ON TABLE user_session_preferences IS 'Stores user preferences for session management including timeout duration, warning style, and notification settings';
COMMENT ON COLUMN user_session_preferences.idle_timeout_minutes IS 'Session idle timeout in minutes (15-480)';
COMMENT ON COLUMN user_session_preferences.warning_style IS 'How to warn user: silent (no warning, auto-extend), toast (subtle notification), banner (prominent warning)';
COMMENT ON COLUMN user_session_preferences.auto_extend_enabled IS 'Whether to automatically extend session while user is active';
COMMENT ON COLUMN user_session_preferences.extend_on_activity IS 'Whether activity should extend the session';
