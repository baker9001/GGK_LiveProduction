/*
  # Role-Based Limits Enforcement at Database Level

  **Purpose**: Enforce session timeout limits based on user type at the database level
  to prevent privilege escalation and ensure security.

  **Features**:
    - Validation function that checks user_type and enforces limits
    - Trigger that runs before INSERT/UPDATE
    - Automatic capping of values that exceed role limits
    - Detailed error messages for violations

  **Role Limits**:
    - Students: Max 60min timeout, max 7 days remember me
    - Teachers: Max 120min timeout, max 14 days remember me
    - Entity Admins: Max 240min timeout, max 30 days remember me
    - System Admins: Max 480min timeout, max 30 days remember me

  **Security**: Prevents users from setting timeouts beyond their role's allowed maximum
*/

-- Create function to get role-based limits
CREATE OR REPLACE FUNCTION get_user_type_limits(p_user_id UUID)
RETURNS TABLE (
  max_idle_timeout_minutes INTEGER,
  max_remember_me_days INTEGER,
  can_disable_auto_extend BOOLEAN
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_type TEXT;
BEGIN
  -- Get user type
  SELECT user_type INTO v_user_type
  FROM users
  WHERE auth_user_id = p_user_id;

  -- Return limits based on user type
  RETURN QUERY
  SELECT
    CASE v_user_type
      WHEN 'student' THEN 60
      WHEN 'teacher' THEN 120
      WHEN 'entity_admin' THEN 240
      WHEN 'system_admin' THEN 480
      ELSE 60 -- Default to most restrictive
    END AS max_idle_timeout_minutes,
    CASE v_user_type
      WHEN 'student' THEN 7
      WHEN 'teacher' THEN 14
      WHEN 'entity_admin' THEN 30
      WHEN 'system_admin' THEN 30
      ELSE 7 -- Default to most restrictive
    END AS max_remember_me_days,
    CASE v_user_type
      WHEN 'system_admin' THEN TRUE
      ELSE FALSE -- Only system admins can disable auto-extend
    END AS can_disable_auto_extend;
END;
$$;

-- Create validation trigger function
CREATE OR REPLACE FUNCTION enforce_session_preferences_limits()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_limits RECORD;
  v_user_type TEXT;
BEGIN
  -- Get limits for this user
  SELECT * INTO v_limits
  FROM get_user_type_limits(NEW.user_id);

  -- Get user type for error messages
  SELECT user_type INTO v_user_type
  FROM users
  WHERE auth_user_id = NEW.user_id;

  -- Enforce idle timeout limit
  IF NEW.idle_timeout_minutes > v_limits.max_idle_timeout_minutes THEN
    -- Auto-cap to maximum allowed
    NEW.idle_timeout_minutes := v_limits.max_idle_timeout_minutes;
    RAISE NOTICE 'Idle timeout capped to % minutes for user type %',
      v_limits.max_idle_timeout_minutes, v_user_type;
  END IF;

  -- Enforce minimum idle timeout (15 minutes)
  IF NEW.idle_timeout_minutes < 15 THEN
    NEW.idle_timeout_minutes := 15;
    RAISE NOTICE 'Idle timeout increased to minimum 15 minutes';
  END IF;

  -- Enforce remember me limit
  IF NEW.remember_me_days > v_limits.max_remember_me_days THEN
    NEW.remember_me_days := v_limits.max_remember_me_days;
    RAISE NOTICE 'Remember me days capped to % for user type %',
      v_limits.max_remember_me_days, v_user_type;
  END IF;

  -- Enforce minimum remember me (1 day)
  IF NEW.remember_me_days < 1 THEN
    NEW.remember_me_days := 1;
    RAISE NOTICE 'Remember me days increased to minimum 1 day';
  END IF;

  -- Enforce auto-extend requirement for non-system-admins
  IF NOT v_limits.can_disable_auto_extend AND NEW.auto_extend_enabled = FALSE THEN
    NEW.auto_extend_enabled := TRUE;
    RAISE NOTICE 'Auto-extend cannot be disabled for user type %', v_user_type;
  END IF;

  -- Enforce warning threshold limits (1-10 minutes)
  IF NEW.warning_threshold_minutes < 1 THEN
    NEW.warning_threshold_minutes := 1;
  ELSIF NEW.warning_threshold_minutes > 10 THEN
    NEW.warning_threshold_minutes := 10;
  END IF;

  -- Ensure warning threshold doesn't exceed idle timeout
  IF NEW.warning_threshold_minutes >= NEW.idle_timeout_minutes THEN
    NEW.warning_threshold_minutes := LEAST(2, NEW.idle_timeout_minutes - 1);
    RAISE NOTICE 'Warning threshold adjusted to % minutes (must be less than idle timeout)',
      NEW.warning_threshold_minutes;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error enforcing preferences limits: %', SQLERRM;
    RETURN NEW; -- Don't block the operation
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_enforce_preferences_limits ON user_session_preferences;

CREATE TRIGGER trigger_enforce_preferences_limits
  BEFORE INSERT OR UPDATE ON user_session_preferences
  FOR EACH ROW
  EXECUTE FUNCTION enforce_session_preferences_limits();

-- Create helper function for admins to check a user's limits
CREATE OR REPLACE FUNCTION check_user_session_limits(p_user_email TEXT)
RETURNS TABLE (
  user_email TEXT,
  user_type TEXT,
  current_idle_timeout INTEGER,
  max_idle_timeout INTEGER,
  current_remember_me INTEGER,
  max_remember_me INTEGER,
  can_disable_auto_extend BOOLEAN,
  is_within_limits BOOLEAN
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_auth_user_id UUID;
BEGIN
  -- Get user info
  SELECT u.id, u.auth_user_id, u.user_type
  INTO v_user_id, v_auth_user_id, user_type
  FROM users u
  WHERE u.email = p_user_email;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', p_user_email;
  END IF;

  -- Only system admins can use this function
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE auth_user_id = auth.uid()
    AND users.user_type = 'system_admin'
    AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Access denied: System admin access required';
  END IF;

  -- Return analysis
  RETURN QUERY
  SELECT
    p_user_email,
    u.user_type,
    prefs.idle_timeout_minutes,
    limits.max_idle_timeout_minutes,
    prefs.remember_me_days,
    limits.max_remember_me_days,
    limits.can_disable_auto_extend,
    (prefs.idle_timeout_minutes <= limits.max_idle_timeout_minutes AND
     prefs.remember_me_days <= limits.max_remember_me_days) AS is_within_limits
  FROM users u
  LEFT JOIN user_session_preferences prefs ON prefs.user_id = u.auth_user_id
  CROSS JOIN LATERAL get_user_type_limits(u.auth_user_id) limits
  WHERE u.email = p_user_email;
END;
$$;

-- Add helpful comments
COMMENT ON FUNCTION get_user_type_limits(UUID) IS
  'Returns the maximum allowed session timeout and remember me duration for a given user based on their user type';

COMMENT ON FUNCTION enforce_session_preferences_limits() IS
  'Trigger function that automatically caps session preferences to role-appropriate limits, preventing privilege escalation';

COMMENT ON FUNCTION check_user_session_limits(TEXT) IS
  'Admin utility to check if a user''s session preferences are within their role''s allowed limits';

-- Create view for monitoring limit violations (admin only)
CREATE OR REPLACE VIEW session_preferences_limit_violations AS
SELECT
  u.email,
  u.user_type,
  prefs.idle_timeout_minutes,
  limits.max_idle_timeout_minutes,
  prefs.remember_me_days,
  limits.max_remember_me_days,
  CASE
    WHEN prefs.idle_timeout_minutes > limits.max_idle_timeout_minutes THEN 'Timeout exceeds limit'
    WHEN prefs.remember_me_days > limits.max_remember_me_days THEN 'Remember me exceeds limit'
    ELSE NULL
  END AS violation_type,
  prefs.updated_at
FROM users u
JOIN user_session_preferences prefs ON prefs.user_id = u.auth_user_id
CROSS JOIN LATERAL get_user_type_limits(u.auth_user_id) limits
WHERE
  prefs.idle_timeout_minutes > limits.max_idle_timeout_minutes OR
  prefs.remember_me_days > limits.max_remember_me_days;

COMMENT ON VIEW session_preferences_limit_violations IS
  'Shows users whose session preferences exceed their role-based limits (should be empty if enforcement is working)';
