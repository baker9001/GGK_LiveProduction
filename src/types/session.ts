/**
 * File: /src/types/session.ts
 *
 * TypeScript types for session management
 * Includes user preferences, presets, and role-based limits
 */

/**
 * Warning style options for session expiration
 */
export type WarningStyle = 'silent' | 'toast' | 'banner';

/**
 * User Session Preferences
 * Matches the user_session_preferences database table
 */
export interface UserSessionPreferences {
  id: string;
  userId: string;
  idleTimeoutMinutes: number;
  rememberMeDays: number;
  warningStyle: WarningStyle;
  warningThresholdMinutes: number;
  autoExtendEnabled: boolean;
  extendOnActivity: boolean;
  soundEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database row format (snake_case)
 */
export interface UserSessionPreferencesRow {
  id: string;
  user_id: string;
  idle_timeout_minutes: number;
  remember_me_days: number;
  warning_style: WarningStyle;
  warning_threshold_minutes: number;
  auto_extend_enabled: boolean;
  extend_on_activity: boolean;
  sound_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Session preset types
 */
export type SessionPreset = 'minimal' | 'balanced' | 'secure' | 'custom';

/**
 * Preset configurations
 */
export const SESSION_PRESETS: Record<SessionPreset, Partial<UserSessionPreferences>> = {
  minimal: {
    idleTimeoutMinutes: 240,
    warningStyle: 'silent',
    autoExtendEnabled: true,
    extendOnActivity: true,
    warningThresholdMinutes: 1,
  },
  balanced: {
    idleTimeoutMinutes: 60,
    warningStyle: 'toast',
    autoExtendEnabled: true,
    extendOnActivity: true,
    warningThresholdMinutes: 3,
  },
  secure: {
    idleTimeoutMinutes: 15,
    warningStyle: 'banner',
    autoExtendEnabled: false,
    extendOnActivity: false,
    warningThresholdMinutes: 5,
  },
  custom: {},
};

/**
 * Role-based security limits for session preferences
 * Sensitive roles have stricter limits
 */
export interface RoleSessionLimits {
  maxIdleMinutes: number;
  maxRememberDays: number;
  canDisableAutoExtend: boolean;
}

export const ROLE_SESSION_LIMITS: Record<string, RoleSessionLimits> = {
  SSA: {
    maxIdleMinutes: 240,      // 4 hours max for system admins
    maxRememberDays: 7,       // 7 days max
    canDisableAutoExtend: false, // Must keep auto-extend for security
  },
  SUPPORT: {
    maxIdleMinutes: 240,      // 4 hours max
    maxRememberDays: 14,      // 14 days max
    canDisableAutoExtend: false,
  },
  VIEWER: {
    maxIdleMinutes: 480,      // 8 hours max
    maxRememberDays: 30,
    canDisableAutoExtend: true,
  },
  ENTITY_ADMIN: {
    maxIdleMinutes: 480,
    maxRememberDays: 30,
    canDisableAutoExtend: true,
  },
  TEACHER: {
    maxIdleMinutes: 480,
    maxRememberDays: 30,
    canDisableAutoExtend: true,
  },
  STUDENT: {
    maxIdleMinutes: 480,
    maxRememberDays: 30,
    canDisableAutoExtend: true,
  },
};

/**
 * Default session preferences
 */
export const DEFAULT_SESSION_PREFERENCES: UserSessionPreferences = {
  id: '',
  userId: '',
  idleTimeoutMinutes: 60,
  rememberMeDays: 30,
  warningStyle: 'silent',
  warningThresholdMinutes: 2,
  autoExtendEnabled: true,
  extendOnActivity: true,
  soundEnabled: false,
  createdAt: '',
  updatedAt: '',
};

/**
 * Duration options for UI
 */
export const DURATION_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 240, label: '4 hours' },
  { value: 480, label: '8 hours' },
] as const;

/**
 * Warning style options for UI
 */
export const WARNING_STYLE_OPTIONS = [
  {
    value: 'silent' as WarningStyle,
    label: 'Silent (Recommended)',
    description: 'Automatically extends your session while active. No interruptions.',
  },
  {
    value: 'toast' as WarningStyle,
    label: 'Subtle Toast',
    description: 'Shows a small notification when session is extended.',
  },
  {
    value: 'banner' as WarningStyle,
    label: 'Warning Banner',
    description: 'Shows a prominent warning before session expires.',
  },
] as const;

/**
 * Preset options for UI
 */
export const PRESET_OPTIONS = [
  { key: 'minimal' as SessionPreset, label: 'Minimal', description: '4 hours, silent' },
  { key: 'balanced' as SessionPreset, label: 'Balanced', description: '1 hour, toast' },
  { key: 'secure' as SessionPreset, label: 'Secure', description: '15 min, banner' },
] as const;

/**
 * Map database row to TypeScript interface
 */
export function mapDbToPreferences(data: UserSessionPreferencesRow): UserSessionPreferences {
  return {
    id: data.id,
    userId: data.user_id,
    idleTimeoutMinutes: data.idle_timeout_minutes,
    rememberMeDays: data.remember_me_days,
    warningStyle: data.warning_style,
    warningThresholdMinutes: data.warning_threshold_minutes,
    autoExtendEnabled: data.auto_extend_enabled,
    extendOnActivity: data.extend_on_activity,
    soundEnabled: data.sound_enabled,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Map TypeScript interface to database format
 */
export function mapPreferencesToDb(
  preferences: Partial<UserSessionPreferences>,
  userId: string
): Partial<UserSessionPreferencesRow> {
  const result: Partial<UserSessionPreferencesRow> = {
    user_id: userId,
  };

  if (preferences.idleTimeoutMinutes !== undefined) {
    result.idle_timeout_minutes = preferences.idleTimeoutMinutes;
  }
  if (preferences.rememberMeDays !== undefined) {
    result.remember_me_days = preferences.rememberMeDays;
  }
  if (preferences.warningStyle !== undefined) {
    result.warning_style = preferences.warningStyle;
  }
  if (preferences.warningThresholdMinutes !== undefined) {
    result.warning_threshold_minutes = preferences.warningThresholdMinutes;
  }
  if (preferences.autoExtendEnabled !== undefined) {
    result.auto_extend_enabled = preferences.autoExtendEnabled;
  }
  if (preferences.extendOnActivity !== undefined) {
    result.extend_on_activity = preferences.extendOnActivity;
  }
  if (preferences.soundEnabled !== undefined) {
    result.sound_enabled = preferences.soundEnabled;
  }

  return result;
}

/**
 * Apply role-based limits to preferences
 */
export function applyRoleLimits(
  preferences: UserSessionPreferences,
  role: string
): UserSessionPreferences {
  const limits = ROLE_SESSION_LIMITS[role] || ROLE_SESSION_LIMITS.STUDENT;

  return {
    ...preferences,
    idleTimeoutMinutes: Math.min(preferences.idleTimeoutMinutes, limits.maxIdleMinutes),
    rememberMeDays: Math.min(preferences.rememberMeDays, limits.maxRememberDays),
    autoExtendEnabled: limits.canDisableAutoExtend ? preferences.autoExtendEnabled : true,
  };
}

/**
 * Validate preferences against constraints
 */
export function validatePreferences(
  preferences: Partial<UserSessionPreferences>,
  role: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const limits = ROLE_SESSION_LIMITS[role] || ROLE_SESSION_LIMITS.STUDENT;

  if (preferences.idleTimeoutMinutes !== undefined) {
    if (preferences.idleTimeoutMinutes < 15) {
      errors.push('Session duration must be at least 15 minutes');
    }
    if (preferences.idleTimeoutMinutes > limits.maxIdleMinutes) {
      errors.push(`Session duration cannot exceed ${limits.maxIdleMinutes / 60} hours for your role`);
    }
  }

  if (preferences.rememberMeDays !== undefined) {
    if (preferences.rememberMeDays < 1) {
      errors.push('Remember me duration must be at least 1 day');
    }
    if (preferences.rememberMeDays > limits.maxRememberDays) {
      errors.push(`Remember me duration cannot exceed ${limits.maxRememberDays} days for your role`);
    }
  }

  if (preferences.autoExtendEnabled === false && !limits.canDisableAutoExtend) {
    errors.push('Your role requires auto-extend to remain enabled for security');
  }

  if (preferences.warningThresholdMinutes !== undefined) {
    if (preferences.warningThresholdMinutes < 1 || preferences.warningThresholdMinutes > 10) {
      errors.push('Warning threshold must be between 1 and 10 minutes');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
