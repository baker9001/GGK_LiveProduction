/*
  # Bulk Operations for Session Preferences

  **Purpose**: Provide system administrators with tools to manage session preferences
  at scale for multiple users.

  **Features**:
    - Bulk reset to defaults by user type
    - Bulk apply preset configurations
    - Bulk update specific fields
    - Safety checks and transaction support

  **Security**: All functions require system_admin privileges
*/

-- Function to bulk reset preferences for users of a specific type
CREATE OR REPLACE FUNCTION bulk_reset_session_preferences(
  p_user_type TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  users_affected INTEGER,
  success BOOLEAN,
  message TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER := 0;
  v_timeout INTEGER;
  v_warning_style TEXT;
  v_remember_days INTEGER;
BEGIN
  -- Check admin permission
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE auth_user_id = auth.uid()
    AND user_type = 'system_admin'
    AND is_active = TRUE
  ) THEN
    RETURN QUERY SELECT 0, FALSE, 'Access denied: System admin access required'::TEXT;
    RETURN;
  END IF;

  -- Validate user type
  IF p_user_type NOT IN ('student', 'teacher', 'entity_admin', 'system_admin') THEN
    RETURN QUERY SELECT 0, FALSE, format('Invalid user type: %s', p_user_type)::TEXT;
    RETURN;
  END IF;

  -- Determine defaults based on user type
  CASE p_user_type
    WHEN 'student' THEN
      v_timeout := 30;
      v_warning_style := 'silent';
      v_remember_days := 7;
    WHEN 'teacher' THEN
      v_timeout := 60;
      v_warning_style := 'toast';
      v_remember_days := 14;
    WHEN 'entity_admin' THEN
      v_timeout := 120;
      v_warning_style := 'banner';
      v_remember_days := 30;
    WHEN 'system_admin' THEN
      v_timeout := 240;
      v_warning_style := 'banner';
      v_remember_days := 30;
  END CASE;

  -- Update preferences for all users of this type
  WITH updated AS (
    UPDATE user_session_preferences prefs
    SET
      idle_timeout_minutes = v_timeout,
      warning_style = v_warning_style,
      remember_me_days = v_remember_days,
      warning_threshold_minutes = 2,
      auto_extend_enabled = TRUE,
      extend_on_activity = TRUE,
      sound_enabled = FALSE,
      updated_at = NOW()
    FROM users u
    WHERE prefs.user_id = u.auth_user_id
    AND u.user_type = p_user_type
    AND u.is_active = TRUE
    RETURNING prefs.user_id
  )
  SELECT COUNT(*) INTO v_count FROM updated;

  -- Log the bulk operation
  INSERT INTO user_session_preferences_history (
    user_id, changed_by, field_name, new_value, change_type, change_reason
  )
  SELECT
    u.auth_user_id,
    auth.uid(),
    'bulk_reset',
    format('Reset to %s defaults', p_user_type),
    'system_reset',
    COALESCE(p_reason, format('Bulk reset for all %s users', p_user_type))
  FROM users u
  WHERE u.user_type = p_user_type
  AND u.is_active = TRUE;

  RETURN QUERY SELECT
    v_count,
    TRUE,
    format('Successfully reset preferences for %s %s user(s)', v_count, p_user_type)::TEXT;
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT 0, FALSE, format('Error: %s', SQLERRM)::TEXT;
END;
$$;

-- Function to bulk apply a preset to specific users
CREATE OR REPLACE FUNCTION bulk_apply_preset(
  p_user_emails TEXT[],
  p_preset_config JSONB,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  users_affected INTEGER,
  users_failed INTEGER,
  success BOOLEAN,
  message TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_affected INTEGER := 0;
  v_failed INTEGER := 0;
  v_email TEXT;
BEGIN
  -- Check admin permission
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE auth_user_id = auth.uid()
    AND user_type = 'system_admin'
    AND is_active = TRUE
  ) THEN
    RETURN QUERY SELECT 0, 0, FALSE, 'Access denied: System admin access required'::TEXT;
    RETURN;
  END IF;

  -- Process each user
  FOREACH v_email IN ARRAY p_user_emails
  LOOP
    BEGIN
      -- Update preferences
      UPDATE user_session_preferences prefs
      SET
        idle_timeout_minutes = COALESCE((p_preset_config->>'idleTimeoutMinutes')::INTEGER, prefs.idle_timeout_minutes),
        warning_style = COALESCE(p_preset_config->>'warningStyle', prefs.warning_style),
        remember_me_days = COALESCE((p_preset_config->>'rememberMeDays')::INTEGER, prefs.remember_me_days),
        warning_threshold_minutes = COALESCE((p_preset_config->>'warningThresholdMinutes')::INTEGER, prefs.warning_threshold_minutes),
        auto_extend_enabled = COALESCE((p_preset_config->>'autoExtendEnabled')::BOOLEAN, prefs.auto_extend_enabled),
        sound_enabled = COALESCE((p_preset_config->>'soundEnabled')::BOOLEAN, prefs.sound_enabled),
        updated_at = NOW()
      FROM users u
      WHERE prefs.user_id = u.auth_user_id
      AND u.email = v_email;

      IF FOUND THEN
        v_affected := v_affected + 1;
        
        -- Log the change
        INSERT INTO user_session_preferences_history (
          user_id, changed_by, field_name, new_value, change_type, change_reason
        )
        SELECT
          u.auth_user_id,
          auth.uid(),
          'bulk_apply_preset',
          p_preset_config::TEXT,
          'admin_update',
          COALESCE(p_reason, 'Bulk preset application')
        FROM users u
        WHERE u.email = v_email;
      ELSE
        v_failed := v_failed + 1;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        v_failed := v_failed + 1;
        RAISE WARNING 'Failed to apply preset to %: %', v_email, SQLERRM;
    END;
  END LOOP;

  RETURN QUERY SELECT
    v_affected,
    v_failed,
    TRUE,
    format('Applied preset to %s user(s), %s failed', v_affected, v_failed)::TEXT;
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT 0, 0, FALSE, format('Error: %s', SQLERRM)::TEXT;
END;
$$;

-- Function to bulk update a single field for all users matching criteria
CREATE OR REPLACE FUNCTION bulk_update_preference_field(
  p_field_name TEXT,
  p_new_value TEXT,
  p_user_type TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  users_affected INTEGER,
  success BOOLEAN,
  message TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER := 0;
  v_sql TEXT;
BEGIN
  -- Check admin permission
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE auth_user_id = auth.uid()
    AND user_type = 'system_admin'
    AND is_active = TRUE
  ) THEN
    RETURN QUERY SELECT 0, FALSE, 'Access denied: System admin access required'::TEXT;
    RETURN;
  END IF;

  -- Validate field name (whitelist)
  IF p_field_name NOT IN (
    'warning_style', 'warning_threshold_minutes', 
    'auto_extend_enabled', 'extend_on_activity', 'sound_enabled'
  ) THEN
    RETURN QUERY SELECT 0, FALSE, format('Invalid field name: %s', p_field_name)::TEXT;
    RETURN;
  END IF;

  -- Build and execute dynamic SQL with proper quoting
  IF p_user_type IS NOT NULL THEN
    EXECUTE format(
      'UPDATE user_session_preferences prefs
       SET %I = %L, updated_at = NOW()
       FROM users u
       WHERE prefs.user_id = u.auth_user_id
       AND u.user_type = %L
       AND u.is_active = TRUE',
      p_field_name, p_new_value, p_user_type
    );
  ELSE
    EXECUTE format(
      'UPDATE user_session_preferences prefs
       SET %I = %L, updated_at = NOW()
       FROM users u
       WHERE prefs.user_id = u.auth_user_id
       AND u.is_active = TRUE',
      p_field_name, p_new_value
    );
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Log the bulk operation
  INSERT INTO user_session_preferences_history (
    user_id, changed_by, field_name, new_value, change_type, change_reason
  )
  SELECT
    u.auth_user_id,
    auth.uid(),
    p_field_name,
    p_new_value,
    'admin_update',
    COALESCE(p_reason, format('Bulk update of %s', p_field_name))
  FROM users u
  WHERE (p_user_type IS NULL OR u.user_type = p_user_type)
  AND u.is_active = TRUE
  LIMIT 1000; -- Limit history entries to avoid excessive logging

  RETURN QUERY SELECT
    v_count,
    TRUE,
    format('Updated %s for %s user(s)', p_field_name, v_count)::TEXT;
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT 0, FALSE, format('Error: %s', SQLERRM)::TEXT;
END;
$$;

-- Function to get bulk operation statistics
CREATE OR REPLACE FUNCTION get_bulk_operations_stats(
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  operation_date DATE,
  change_type TEXT,
  total_operations INTEGER,
  unique_users INTEGER,
  changed_by_email TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check admin permission
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE auth_user_id = auth.uid()
    AND user_type = 'system_admin'
    AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Access denied: System admin access required';
  END IF;

  RETURN QUERY
  SELECT
    DATE(h.changed_at) AS operation_date,
    h.change_type,
    COUNT(*)::INTEGER AS total_operations,
    COUNT(DISTINCT h.user_id)::INTEGER AS unique_users,
    u.email AS changed_by_email
  FROM user_session_preferences_history h
  JOIN users u ON u.auth_user_id = h.changed_by
  WHERE h.changed_at >= NOW() - (p_days_back || ' days')::INTERVAL
  AND h.change_type IN ('admin_update', 'system_reset')
  GROUP BY DATE(h.changed_at), h.change_type, u.email
  ORDER BY operation_date DESC, total_operations DESC;
END;
$$;

-- Add helpful comments
COMMENT ON FUNCTION bulk_reset_session_preferences(TEXT, TEXT) IS
  'Admin function to reset all session preferences for users of a specific type to their default values';

COMMENT ON FUNCTION bulk_apply_preset(TEXT[], JSONB, TEXT) IS
  'Admin function to apply a preset configuration to multiple users by email';

COMMENT ON FUNCTION bulk_update_preference_field(TEXT, TEXT, TEXT, TEXT) IS
  'Admin function to update a single preference field for all users (optionally filtered by user type)';

COMMENT ON FUNCTION get_bulk_operations_stats(INTEGER) IS
  'Returns statistics on bulk preference operations performed by admins over the specified time period';
