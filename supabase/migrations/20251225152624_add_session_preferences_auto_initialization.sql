/*
  # Add Auto-Initialization for Session Preferences

  **Issue**: Users don't get default session preferences automatically when their account is created.
  This causes the application to always fall back to hardcoded defaults instead of using
  database-stored preferences.

  **Impact**:
    - Users cannot customize their session behavior until they manually save preferences
    - No role-based default differentiation (students vs teachers vs admins)
    - Unnecessary database queries that return no results

  **Solution**:
    - Create a trigger function on the `users` table (which we control)
    - Automatically populate role-based default preferences when user record is created
    - Different defaults for students, teachers, and admins

  **Role-Based Defaults**:
    - Students: 30min timeout, auto-extend enabled, silent warnings
    - Teachers: 60min timeout, auto-extend enabled, toast warnings  
    - Entity Admins: 120min timeout, auto-extend enabled, banner warnings
    - System Admins: 240min timeout, full control, banner warnings
*/

-- Create trigger function to auto-initialize preferences
CREATE OR REPLACE FUNCTION auto_initialize_session_preferences()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_idle_timeout INTEGER;
  v_warning_style TEXT;
  v_remember_days INTEGER;
  v_auth_id UUID;
BEGIN
  -- Get the auth user ID
  v_auth_id := NEW.auth_user_id;
  
  -- If no auth_user_id yet, skip initialization (will be done on update)
  IF v_auth_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Set role-based defaults based on user_type
  CASE NEW.user_type
    WHEN 'student' THEN
      v_idle_timeout := 30;
      v_warning_style := 'silent';
      v_remember_days := 7;
    WHEN 'teacher' THEN
      v_idle_timeout := 60;
      v_warning_style := 'toast';
      v_remember_days := 14;
    WHEN 'entity_admin' THEN
      v_idle_timeout := 120;
      v_warning_style := 'banner';
      v_remember_days := 30;
    WHEN 'system_admin' THEN
      v_idle_timeout := 240;
      v_warning_style := 'banner';
      v_remember_days := 30;
    ELSE
      -- Default fallback for any other user types
      v_idle_timeout := 60;
      v_warning_style := 'silent';
      v_remember_days := 7;
  END CASE;

  -- Create preferences record with role-based defaults
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
    v_auth_id,
    v_idle_timeout,
    v_remember_days,
    v_warning_style,
    2, -- Standard 2-minute warning threshold
    TRUE, -- Auto-extend enabled by default
    TRUE, -- Extend on activity enabled
    FALSE -- Sound disabled by default
  )
  ON CONFLICT (user_id) DO NOTHING; -- Don't overwrite if already exists

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Failed to auto-initialize session preferences for user %: %', v_auth_id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger on users table for INSERT
DROP TRIGGER IF EXISTS trigger_auto_init_session_preferences_insert ON users;

CREATE TRIGGER trigger_auto_init_session_preferences_insert
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_initialize_session_preferences();

-- Create trigger on users table for UPDATE (in case auth_user_id is added later)
DROP TRIGGER IF EXISTS trigger_auto_init_session_preferences_update ON users;

CREATE TRIGGER trigger_auto_init_session_preferences_update
  AFTER UPDATE OF auth_user_id ON users
  FOR EACH ROW
  WHEN (OLD.auth_user_id IS NULL AND NEW.auth_user_id IS NOT NULL)
  EXECUTE FUNCTION auto_initialize_session_preferences();

-- Add helpful comments
COMMENT ON FUNCTION auto_initialize_session_preferences() IS
  'Automatically creates session preference records with role-based defaults when a user record is created or auth_user_id is assigned. Students get 30min timeout, teachers 60min, entity admins 120min, system admins 240min.';

COMMENT ON TRIGGER trigger_auto_init_session_preferences_insert ON users IS
  'Ensures every new user gets appropriate session preferences based on their user_type';

COMMENT ON TRIGGER trigger_auto_init_session_preferences_update ON users IS
  'Ensures session preferences are created when auth_user_id is assigned to existing user record';
