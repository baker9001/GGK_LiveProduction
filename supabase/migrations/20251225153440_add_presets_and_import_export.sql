/*
  # Preset Templates and Import/Export for Session Preferences

  **Purpose**: Provide predefined templates and backup/restore functionality
  for session preferences.

  **Features**:
    - Preset templates table with common configurations
    - Import preferences from JSON
    - Export preferences to JSON
    - Preset application functions
    - Template sharing capabilities

  **Phase 3 Features**:
    - Quick configuration options
    - Backup and restore
    - Template library
*/

-- Create preset templates table
CREATE TABLE IF NOT EXISTS session_preference_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  
  -- Configuration
  idle_timeout_minutes INTEGER NOT NULL CHECK (idle_timeout_minutes >= 15 AND idle_timeout_minutes <= 480),
  remember_me_days INTEGER NOT NULL CHECK (remember_me_days >= 1 AND remember_me_days <= 30),
  warning_style TEXT NOT NULL CHECK (warning_style IN ('silent', 'toast', 'banner')),
  warning_threshold_minutes INTEGER NOT NULL CHECK (warning_threshold_minutes >= 1 AND warning_threshold_minutes <= 10),
  auto_extend_enabled BOOLEAN NOT NULL,
  extend_on_activity BOOLEAN NOT NULL,
  sound_enabled BOOLEAN NOT NULL,
  
  -- Metadata
  is_system_preset BOOLEAN DEFAULT FALSE, -- System presets can't be deleted
  recommended_for TEXT[], -- Array of user types this preset is good for
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default system presets
INSERT INTO session_preference_presets (
  name, description, idle_timeout_minutes, remember_me_days,
  warning_style, warning_threshold_minutes, auto_extend_enabled,
  extend_on_activity, sound_enabled, is_system_preset, recommended_for
) VALUES
  (
    'Focus Mode',
    'Extended timeout with silent warnings for deep work sessions',
    120, 14, 'silent', 5, TRUE, TRUE, FALSE,
    TRUE, ARRAY['teacher', 'entity_admin']
  ),
  (
    'Quick Sessions',
    'Short timeout for shared/public computers',
    15, 1, 'banner', 2, TRUE, TRUE, TRUE,
    TRUE, ARRAY['student', 'teacher']
  ),
  (
    'Balanced',
    'Moderate timeout with subtle notifications',
    60, 7, 'toast', 2, TRUE, TRUE, FALSE,
    TRUE, ARRAY['student', 'teacher']
  ),
  (
    'Extended Access',
    'Long timeout for administrative work',
    240, 30, 'banner', 5, TRUE, TRUE, FALSE,
    TRUE, ARRAY['entity_admin', 'system_admin']
  ),
  (
    'Maximum Security',
    'Short timeout with prominent warnings',
    30, 1, 'banner', 1, TRUE, FALSE, TRUE,
    TRUE, ARRAY['student']
  )
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE session_preference_presets ENABLE ROW LEVEL SECURITY;

-- Everyone can view presets
CREATE POLICY "Anyone can view presets"
  ON session_preference_presets
  FOR SELECT
  USING (TRUE);

-- Only system admins can modify presets
CREATE POLICY "Admins can manage presets"
  ON session_preference_presets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_user_id = auth.uid()
      AND users.user_type = 'system_admin'
      AND users.is_active = TRUE
    )
  );

-- Function to apply a preset by name
CREATE OR REPLACE FUNCTION apply_session_preset(
  p_preset_name TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_preset RECORD;
  v_target_user_id UUID;
BEGIN
  -- Determine target user
  v_target_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Users can only apply presets to themselves unless they're admins
  IF p_user_id IS NOT NULL AND p_user_id != auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND user_type = 'system_admin'
      AND is_active = TRUE
    ) THEN
      RETURN QUERY SELECT FALSE, 'Access denied: Cannot modify other users preferences'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Get preset
  SELECT * INTO v_preset
  FROM session_preference_presets
  WHERE name = p_preset_name;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, format('Preset not found: %s', p_preset_name)::TEXT;
    RETURN;
  END IF;

  -- Apply preset
  INSERT INTO user_session_preferences (
    user_id,
    idle_timeout_minutes,
    remember_me_days,
    warning_style,
    warning_threshold_minutes,
    auto_extend_enabled,
    extend_on_activity,
    sound_enabled
  ) VALUES (
    v_target_user_id,
    v_preset.idle_timeout_minutes,
    v_preset.remember_me_days,
    v_preset.warning_style,
    v_preset.warning_threshold_minutes,
    v_preset.auto_extend_enabled,
    v_preset.extend_on_activity,
    v_preset.sound_enabled
  )
  ON CONFLICT (user_id) DO UPDATE SET
    idle_timeout_minutes = EXCLUDED.idle_timeout_minutes,
    remember_me_days = EXCLUDED.remember_me_days,
    warning_style = EXCLUDED.warning_style,
    warning_threshold_minutes = EXCLUDED.warning_threshold_minutes,
    auto_extend_enabled = EXCLUDED.auto_extend_enabled,
    extend_on_activity = EXCLUDED.extend_on_activity,
    sound_enabled = EXCLUDED.sound_enabled,
    updated_at = NOW();

  RETURN QUERY SELECT TRUE, format('Applied preset: %s', p_preset_name)::TEXT;
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, format('Error: %s', SQLERRM)::TEXT;
END;
$$;

-- Function to export preferences to JSON
CREATE OR REPLACE FUNCTION export_session_preferences(
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_target_user_id UUID;
  v_result JSONB;
BEGIN
  -- Determine target user
  v_target_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Users can only export their own unless they're admins
  IF p_user_id IS NOT NULL AND p_user_id != auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND user_type = 'system_admin'
      AND is_active = TRUE
    ) THEN
      RETURN jsonb_build_object('error', 'Access denied');
    END IF;
  END IF;

  -- Export preferences
  SELECT jsonb_build_object(
    'version', '1.0',
    'exported_at', NOW(),
    'user_id', v_target_user_id,
    'preferences', jsonb_build_object(
      'idleTimeoutMinutes', idle_timeout_minutes,
      'rememberMeDays', remember_me_days,
      'warningStyle', warning_style,
      'warningThresholdMinutes', warning_threshold_minutes,
      'autoExtendEnabled', auto_extend_enabled,
      'extendOnActivity', extend_on_activity,
      'soundEnabled', sound_enabled
    )
  ) INTO v_result
  FROM user_session_preferences
  WHERE user_id = v_target_user_id;

  RETURN COALESCE(v_result, jsonb_build_object('error', 'Preferences not found'));
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

-- Function to import preferences from JSON
CREATE OR REPLACE FUNCTION import_session_preferences(
  p_preferences_json JSONB,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_target_user_id UUID;
  v_prefs JSONB;
BEGIN
  -- Determine target user
  v_target_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Users can only import to themselves unless they're admins
  IF p_user_id IS NOT NULL AND p_user_id != auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM users
      WHERE auth_user_id = auth.uid()
      AND user_type = 'system_admin'
      AND is_active = TRUE
    ) THEN
      RETURN QUERY SELECT FALSE, 'Access denied: Cannot modify other users preferences'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Validate JSON structure
  IF NOT (p_preferences_json ? 'preferences') THEN
    RETURN QUERY SELECT FALSE, 'Invalid JSON: missing preferences object'::TEXT;
    RETURN;
  END IF;

  v_prefs := p_preferences_json->'preferences';

  -- Validate required fields
  IF NOT (
    v_prefs ? 'idleTimeoutMinutes' AND
    v_prefs ? 'warningStyle'
  ) THEN
    RETURN QUERY SELECT FALSE, 'Invalid JSON: missing required fields'::TEXT;
    RETURN;
  END IF;

  -- Import preferences
  INSERT INTO user_session_preferences (
    user_id,
    idle_timeout_minutes,
    remember_me_days,
    warning_style,
    warning_threshold_minutes,
    auto_extend_enabled,
    extend_on_activity,
    sound_enabled
  ) VALUES (
    v_target_user_id,
    (v_prefs->>'idleTimeoutMinutes')::INTEGER,
    COALESCE((v_prefs->>'rememberMeDays')::INTEGER, 7),
    v_prefs->>'warningStyle',
    COALESCE((v_prefs->>'warningThresholdMinutes')::INTEGER, 2),
    COALESCE((v_prefs->>'autoExtendEnabled')::BOOLEAN, TRUE),
    COALESCE((v_prefs->>'extendOnActivity')::BOOLEAN, TRUE),
    COALESCE((v_prefs->>'soundEnabled')::BOOLEAN, FALSE)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    idle_timeout_minutes = EXCLUDED.idle_timeout_minutes,
    remember_me_days = EXCLUDED.remember_me_days,
    warning_style = EXCLUDED.warning_style,
    warning_threshold_minutes = EXCLUDED.warning_threshold_minutes,
    auto_extend_enabled = EXCLUDED.auto_extend_enabled,
    extend_on_activity = EXCLUDED.extend_on_activity,
    sound_enabled = EXCLUDED.sound_enabled,
    updated_at = NOW();

  RETURN QUERY SELECT TRUE, 'Preferences imported successfully'::TEXT;
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, format('Error: %s', SQLERRM)::TEXT;
END;
$$;

-- Function to get recommended presets for current user
CREATE OR REPLACE FUNCTION get_recommended_presets()
RETURNS SETOF session_preference_presets
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_type TEXT;
BEGIN
  -- Get current user's type
  SELECT user_type INTO v_user_type
  FROM users
  WHERE auth_user_id = auth.uid();

  -- Return presets recommended for this user type
  RETURN QUERY
  SELECT *
  FROM session_preference_presets
  WHERE v_user_type = ANY(recommended_for)
  OR recommended_for IS NULL
  ORDER BY is_system_preset DESC, name;
END;
$$;

-- Add helpful comments
COMMENT ON TABLE session_preference_presets IS
  'Predefined session preference templates that users can quickly apply';

COMMENT ON FUNCTION apply_session_preset(TEXT, UUID) IS
  'Applies a named preset configuration to a user''s session preferences';

COMMENT ON FUNCTION export_session_preferences(UUID) IS
  'Exports user session preferences to JSON format for backup';

COMMENT ON FUNCTION import_session_preferences(JSONB, UUID) IS
  'Imports session preferences from JSON format, useful for restoration';

COMMENT ON FUNCTION get_recommended_presets() IS
  'Returns presets recommended for the current user based on their user type';
