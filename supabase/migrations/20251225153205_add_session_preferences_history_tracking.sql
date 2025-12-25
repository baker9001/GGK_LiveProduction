/*
  # Session Preferences History Tracking

  **Purpose**: Track all changes to user session preferences for audit and troubleshooting.

  **Features**:
    - Records all preference updates with old and new values
    - Tracks who made the change (user or admin)
    - Timestamps for change tracking
    - Automatic logging via trigger

  **Tables Created**:
    1. user_session_preferences_history - Audit log for preference changes

  **Benefits**:
    - Security: Track unauthorized changes
    - Troubleshooting: See what changed and when
    - Compliance: Audit trail for data protection regulations
    - Analytics: Understand user behavior patterns
*/

-- Create history table
CREATE TABLE IF NOT EXISTS user_session_preferences_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- User whose preferences changed
  changed_by UUID NOT NULL, -- User who made the change (might be admin)
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- What changed
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  
  -- Context
  change_type TEXT NOT NULL CHECK (change_type IN ('user_update', 'admin_update', 'system_reset', 'auto_init')),
  change_reason TEXT, -- Optional explanation
  ip_address INET, -- Track source IP for security
  user_agent TEXT, -- Track browser/device
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_preferences_history_user_id 
  ON user_session_preferences_history(user_id);

CREATE INDEX IF NOT EXISTS idx_preferences_history_changed_at 
  ON user_session_preferences_history(changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_preferences_history_changed_by 
  ON user_session_preferences_history(changed_by);

CREATE INDEX IF NOT EXISTS idx_preferences_history_field 
  ON user_session_preferences_history(field_name);

-- Enable RLS
ALTER TABLE user_session_preferences_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own history
CREATE POLICY "Users can view own preference history"
  ON user_session_preferences_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- System admins can view all history
CREATE POLICY "Admins can view all preference history"
  ON user_session_preferences_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.user_type = 'system_admin'
      AND users.is_active = TRUE
    )
  );

-- Only system can insert history records (via trigger)
CREATE POLICY "System can insert history records"
  ON user_session_preferences_history
  FOR INSERT
  WITH CHECK (true); -- Trigger runs as SECURITY DEFINER

-- Create trigger function to log changes
CREATE OR REPLACE FUNCTION log_session_preferences_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_changed_by UUID;
  v_change_type TEXT;
BEGIN
  -- Determine who made the change
  v_changed_by := auth.uid();
  IF v_changed_by IS NULL THEN
    v_changed_by := NEW.user_id; -- Fallback for system changes
  END IF;

  -- Determine change type
  IF TG_OP = 'INSERT' THEN
    v_change_type := 'auto_init';
  ELSIF v_changed_by = NEW.user_id THEN
    v_change_type := 'user_update';
  ELSE
    v_change_type := 'admin_update';
  END IF;

  -- Log changes for each field that changed
  IF TG_OP = 'INSERT' OR OLD.idle_timeout_minutes IS DISTINCT FROM NEW.idle_timeout_minutes THEN
    INSERT INTO user_session_preferences_history (
      user_id, changed_by, field_name, old_value, new_value, change_type
    ) VALUES (
      NEW.user_id,
      v_changed_by,
      'idle_timeout_minutes',
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.idle_timeout_minutes::TEXT ELSE NULL END,
      NEW.idle_timeout_minutes::TEXT,
      v_change_type
    );
  END IF;

  IF TG_OP = 'INSERT' OR OLD.remember_me_days IS DISTINCT FROM NEW.remember_me_days THEN
    INSERT INTO user_session_preferences_history (
      user_id, changed_by, field_name, old_value, new_value, change_type
    ) VALUES (
      NEW.user_id,
      v_changed_by,
      'remember_me_days',
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.remember_me_days::TEXT ELSE NULL END,
      NEW.remember_me_days::TEXT,
      v_change_type
    );
  END IF;

  IF TG_OP = 'INSERT' OR OLD.warning_style IS DISTINCT FROM NEW.warning_style THEN
    INSERT INTO user_session_preferences_history (
      user_id, changed_by, field_name, old_value, new_value, change_type
    ) VALUES (
      NEW.user_id,
      v_changed_by,
      'warning_style',
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.warning_style ELSE NULL END,
      NEW.warning_style,
      v_change_type
    );
  END IF;

  IF TG_OP = 'INSERT' OR OLD.warning_threshold_minutes IS DISTINCT FROM NEW.warning_threshold_minutes THEN
    INSERT INTO user_session_preferences_history (
      user_id, changed_by, field_name, old_value, new_value, change_type
    ) VALUES (
      NEW.user_id,
      v_changed_by,
      'warning_threshold_minutes',
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.warning_threshold_minutes::TEXT ELSE NULL END,
      NEW.warning_threshold_minutes::TEXT,
      v_change_type
    );
  END IF;

  IF TG_OP = 'INSERT' OR OLD.auto_extend_enabled IS DISTINCT FROM NEW.auto_extend_enabled THEN
    INSERT INTO user_session_preferences_history (
      user_id, changed_by, field_name, old_value, new_value, change_type
    ) VALUES (
      NEW.user_id,
      v_changed_by,
      'auto_extend_enabled',
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.auto_extend_enabled::TEXT ELSE NULL END,
      NEW.auto_extend_enabled::TEXT,
      v_change_type
    );
  END IF;

  IF TG_OP = 'INSERT' OR OLD.extend_on_activity IS DISTINCT FROM NEW.extend_on_activity THEN
    INSERT INTO user_session_preferences_history (
      user_id, changed_by, field_name, old_value, new_value, change_type
    ) VALUES (
      NEW.user_id,
      v_changed_by,
      'extend_on_activity',
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.extend_on_activity::TEXT ELSE NULL END,
      NEW.extend_on_activity::TEXT,
      v_change_type
    );
  END IF;

  IF TG_OP = 'INSERT' OR OLD.sound_enabled IS DISTINCT FROM NEW.sound_enabled THEN
    INSERT INTO user_session_preferences_history (
      user_id, changed_by, field_name, old_value, new_value, change_type
    ) VALUES (
      NEW.user_id,
      v_changed_by,
      'sound_enabled',
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.sound_enabled::TEXT ELSE NULL END,
      NEW.sound_enabled::TEXT,
      v_change_type
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the preference update
    RAISE WARNING 'Failed to log preference change: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger on INSERT and UPDATE
DROP TRIGGER IF EXISTS trigger_log_preferences_changes ON user_session_preferences;

CREATE TRIGGER trigger_log_preferences_changes
  AFTER INSERT OR UPDATE ON user_session_preferences
  FOR EACH ROW
  EXECUTE FUNCTION log_session_preferences_change();

-- Add helpful comments
COMMENT ON TABLE user_session_preferences_history IS 
  'Audit log tracking all changes to user session preferences for security, compliance, and troubleshooting';

COMMENT ON COLUMN user_session_preferences_history.changed_by IS 
  'UUID of user who made the change - may be different from user_id if admin made the change';

COMMENT ON COLUMN user_session_preferences_history.change_type IS 
  'Type of change: user_update (user changed own prefs), admin_update (admin changed user prefs), system_reset (system reset), auto_init (initial creation)';

COMMENT ON FUNCTION log_session_preferences_change() IS 
  'Automatically logs all changes to session preferences with old/new values for audit trail';
