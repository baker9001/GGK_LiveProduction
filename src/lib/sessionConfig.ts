/**
 * File: /src/lib/sessionConfig.ts
 *
 * Centralized Session Management Configuration
 * Single source of truth for all session-related timeouts, thresholds, and durations
 */

// ============================================================================
// SESSION DURATIONS (Best Practices)
// ============================================================================

/**
 * Idle timeout: 15 minutes of inactivity
 * Industry best practice for sensitive applications
 */
export const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Absolute timeout: 8 hours regardless of activity
 * Maximum session lifetime for security
 */
export const ABSOLUTE_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours

/**
 * Remember Me duration: 30 days
 * For user convenience with stricter validation
 */
export const REMEMBER_ME_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ============================================================================
// SESSION WARNINGS AND MONITORING
// ============================================================================

/**
 * Show warning when 5 minutes remain
 */
export const WARNING_THRESHOLD_MINUTES = 5;

/**
 * Session check interval: 30 seconds
 * How often to check session status
 */
export const SESSION_CHECK_INTERVAL_MS = 30000; // 30 seconds

/**
 * Activity check interval: 30 seconds
 * How often to check for user activity
 */
export const ACTIVITY_CHECK_INTERVAL_MS = 30000; // 30 seconds

// ============================================================================
// ACTIVITY TRACKING
// ============================================================================

/**
 * Activity timeout: 2 minutes
 * Consider user inactive after 2 minutes without activity
 */
export const ACTIVITY_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Auto-extend interval: 10 minutes
 * Auto-extend session every 10 minutes during activity
 */
export const AUTO_EXTEND_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Activity heartbeat interval: 2 minutes
 * Send activity signal during long operations
 */
export const ACTIVITY_HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

// ============================================================================
// GRACE PERIODS (Security-focused, consolidated)
// ============================================================================

/**
 * Base grace period: 30 seconds
 * Default grace period for pending operations
 */
export const BASE_GRACE_PERIOD_MS = 30000; // 30 seconds

/**
 * Post-login grace period: 60 seconds
 * Skip session checks immediately after login
 */
export const POST_LOGIN_GRACE_PERIOD_MS = 60000; // 60 seconds

/**
 * Page load grace period: 60 seconds
 * Skip session checks immediately after page load
 */
export const PAGE_LOAD_GRACE_PERIOD_MS = 60000; // 60 seconds

/**
 * Deliberate reload grace period: 90 seconds (REDUCED from 180s)
 * Extended grace for user-initiated reloads (e.g., "Start New Import")
 * Security best practice: Keep under 2 minutes
 */
export const DELIBERATE_RELOAD_GRACE_PERIOD_MS = 90000; // 90 seconds

/**
 * Maximum grace period: 90 seconds (SECURITY LIMIT)
 * No grace period should exceed this duration
 */
export const MAX_GRACE_PERIOD_MS = 90000; // 90 seconds

// ============================================================================
// LONG OPERATIONS
// ============================================================================

/**
 * Long operation threshold: 2 minutes
 * Operations longer than this trigger special handling
 */
export const LONG_OPERATION_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Maximum long operation duration: 60 minutes
 * Based on user's typical longest operations
 */
export const MAX_LONG_OPERATION_DURATION_MS = 60 * 60 * 1000; // 60 minutes

/**
 * Session extension check during operation: 10 minutes
 * Check if session needs extension every 10 minutes during long operations
 */
export const OPERATION_SESSION_CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Pre-operation buffer: 10 minutes
 * Minimum session time required before starting a long operation
 */
export const PRE_OPERATION_BUFFER_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Operation state save interval: 30 seconds
 * How often to save operation progress to localStorage
 */
export const OPERATION_STATE_SAVE_INTERVAL_MS = 30000; // 30 seconds

/**
 * Critical operation flag timeout: 5 minutes (SECURITY)
 * Auto-remove critical operation flags after this duration
 * Prevents orphaned flags from blocking session checks
 */
export const CRITICAL_OPERATION_FLAG_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// SESSION STATUS THRESHOLDS
// ============================================================================

/**
 * Session status: Healthy (green)
 * More than 30 minutes remaining
 */
export const SESSION_HEALTHY_THRESHOLD_MINUTES = 30;

/**
 * Session status: Warning (yellow)
 * 10-30 minutes remaining
 */
export const SESSION_WARNING_THRESHOLD_MINUTES = 10;

/**
 * Session status: Critical (red)
 * Less than 10 minutes remaining
 */
export const SESSION_CRITICAL_THRESHOLD_MINUTES = 10;

/**
 * Session status: Urgent (flashing red)
 * Less than 1 minute remaining
 */
export const SESSION_URGENT_THRESHOLD_MINUTES = 1;

// ============================================================================
// PROACTIVE NOTIFICATIONS
// ============================================================================

/**
 * Show toast notification at 10 minutes
 */
export const TOAST_NOTIFICATION_THRESHOLD_MINUTES = 10;

/**
 * Show banner warning at 5 minutes
 */
export const BANNER_WARNING_THRESHOLD_MINUTES = 5;

/**
 * Optional audio notification at 2 minutes
 */
export const AUDIO_NOTIFICATION_THRESHOLD_MINUTES = 2;

// ============================================================================
// CROSS-TAB SYNCHRONIZATION
// ============================================================================

/**
 * BroadcastChannel message debounce: 1 second
 * Prevent message flooding across tabs
 */
export const BROADCAST_DEBOUNCE_MS = 1000; // 1 second

// ============================================================================
// STORAGE KEYS
// ============================================================================

export const STORAGE_KEYS = {
  // Authentication
  AUTH_TOKEN: 'ggk_auth_token',
  AUTHENTICATED_USER: 'ggk_authenticated_user',
  REMEMBER_SESSION: 'ggk_remember_session',

  // Session tracking
  LAST_ACTIVITY: 'ggk_last_activity',
  LAST_AUTO_EXTEND: 'ggk_last_auto_extend',
  LAST_LOGIN_TIME: 'ggk_last_login_time',
  LAST_PAGE_LOAD_TIME: 'ggk_last_page_load_time',
  SESSION_START_TIME: 'ggk_session_start_time',

  // Warnings and notices
  SESSION_WARNING_SHOWN: 'ggk_session_warning_shown',
  SESSION_EXPIRED_NOTICE: 'ggk_session_expired_notice',

  // Grace periods
  DELIBERATE_RELOAD: 'ggk_deliberate_reload',
  RELOAD_REASON: 'ggk_reload_reason',
  EXTENDED_GRACE_PERIOD: 'ggk_extended_grace_period',
  GRACE_PERIOD_START_TIME: 'ggk_grace_period_start_time',
  GRACE_PERIOD_REASON: 'ggk_grace_period_reason',

  // Long operations
  CRITICAL_OPERATION: 'ggk_critical_operation',
  CRITICAL_OPERATION_START_TIME: 'ggk_critical_operation_start_time',
  ACTIVE_OPERATION_ID: 'ggk_active_operation_id',
  OPERATION_STATE: 'ggk_operation_state',

  // Supabase
  SUPABASE_SESSION_REQUIRED: 'ggk_supabase_session_required',
  SUPABASE_SESSION_STORAGE: 'supabase.auth.token',

  // Test mode
  TEST_USER: 'test_mode_user',
  TEST_MODE_METADATA: 'test_mode_metadata',

  // User preferences
  USER_LOGOUT: 'ggk_user_logout',
  REMEMBERED_EMAIL: 'ggk_remembered_email',
  AUDIO_NOTIFICATIONS_ENABLED: 'ggk_audio_notifications_enabled'
} as const;

// ============================================================================
// EVENT NAMES
// ============================================================================

export const SESSION_EVENTS = {
  WARNING: 'ggk-session-warning',
  EXTENDED: 'ggk-session-extended',
  EXPIRED: 'ggk-session-expired',
  ACTIVITY: 'ggk-session-activity',
  OPERATION_CONFIRMATION: 'ggk-long-operation-confirmation',
  OPERATION_STARTED: 'ggk-operation-started',
  OPERATION_COMPLETED: 'ggk-operation-completed',
  OPERATION_PROGRESS: 'ggk-operation-progress',
  AUTH_CHANGE: 'auth-change'
} as const;

// ============================================================================
// BROADCAST CHANNEL
// ============================================================================

export const BROADCAST_CHANNEL_NAME = 'ggk-session-channel';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get session duration based on remember me preference
 */
export function getSessionDuration(rememberMe: boolean): number {
  return rememberMe ? REMEMBER_ME_DURATION_MS : IDLE_TIMEOUT_MS;
}

/**
 * Get grace period duration based on reason
 */
export function getGracePeriodDuration(reason?: string): number {
  switch (reason) {
    case 'start_new_import':
    case 'delete_operation':
    case 'critical_operation':
      return DELIBERATE_RELOAD_GRACE_PERIOD_MS;
    case 'refresh_session':
    case 'page_reload':
      return PAGE_LOAD_GRACE_PERIOD_MS;
    case 'post_login':
      return POST_LOGIN_GRACE_PERIOD_MS;
    default:
      return BASE_GRACE_PERIOD_MS;
  }
}

/**
 * Validate that grace period doesn't exceed maximum
 */
export function validateGracePeriod(durationMs: number): number {
  return Math.min(durationMs, MAX_GRACE_PERIOD_MS);
}

/**
 * Get session status color based on remaining time
 */
export function getSessionStatusColor(remainingMinutes: number): 'green' | 'yellow' | 'red' {
  if (remainingMinutes > SESSION_HEALTHY_THRESHOLD_MINUTES) return 'green';
  if (remainingMinutes > SESSION_CRITICAL_THRESHOLD_MINUTES) return 'yellow';
  return 'red';
}

/**
 * Check if session is healthy
 */
export function isSessionHealthy(remainingMinutes: number): boolean {
  return remainingMinutes > SESSION_HEALTHY_THRESHOLD_MINUTES;
}

/**
 * Check if session is in warning state
 */
export function isSessionWarning(remainingMinutes: number): boolean {
  return remainingMinutes <= SESSION_WARNING_THRESHOLD_MINUTES && remainingMinutes > SESSION_URGENT_THRESHOLD_MINUTES;
}

/**
 * Check if session is in critical state
 */
export function isSessionCritical(remainingMinutes: number): boolean {
  return remainingMinutes <= SESSION_CRITICAL_THRESHOLD_MINUTES && remainingMinutes > 0;
}

/**
 * Check if session is in urgent state
 */
export function isSessionUrgent(remainingMinutes: number): boolean {
  return remainingMinutes <= SESSION_URGENT_THRESHOLD_MINUTES && remainingMinutes > 0;
}

/**
 * Format remaining time for display
 */
export function formatRemainingTime(remainingMinutes: number): string {
  if (remainingMinutes === 0) return 'Expired';
  if (remainingMinutes < 1) return 'Less than 1 minute';
  if (remainingMinutes === 1) return '1 minute';
  if (remainingMinutes < 60) return `${remainingMinutes} minutes`;

  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;

  if (minutes === 0) return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  return `${hours}h ${minutes}m`;
}

// ============================================================================
// CONFIGURATION VALIDATION
// ============================================================================

/**
 * Validate configuration on module load
 * Ensures all timeouts and thresholds make logical sense
 */
function validateConfiguration(): void {
  const validations = [
    {
      condition: IDLE_TIMEOUT_MS > WARNING_THRESHOLD_MINUTES * 60 * 1000,
      message: 'IDLE_TIMEOUT_MS must be greater than WARNING_THRESHOLD'
    },
    {
      condition: ABSOLUTE_TIMEOUT_MS > IDLE_TIMEOUT_MS,
      message: 'ABSOLUTE_TIMEOUT_MS must be greater than IDLE_TIMEOUT_MS'
    },
    {
      condition: ACTIVITY_TIMEOUT_MS < AUTO_EXTEND_INTERVAL_MS,
      message: 'ACTIVITY_TIMEOUT_MS should be less than AUTO_EXTEND_INTERVAL_MS'
    },
    {
      condition: DELIBERATE_RELOAD_GRACE_PERIOD_MS <= MAX_GRACE_PERIOD_MS,
      message: 'DELIBERATE_RELOAD_GRACE_PERIOD_MS must not exceed MAX_GRACE_PERIOD_MS'
    },
    {
      condition: CRITICAL_OPERATION_FLAG_TIMEOUT_MS >= LONG_OPERATION_THRESHOLD_MS,
      message: 'CRITICAL_OPERATION_FLAG_TIMEOUT_MS should be >= LONG_OPERATION_THRESHOLD_MS'
    },
    {
      condition: SESSION_HEALTHY_THRESHOLD_MINUTES > SESSION_WARNING_THRESHOLD_MINUTES,
      message: 'SESSION_HEALTHY_THRESHOLD must be > SESSION_WARNING_THRESHOLD'
    }
  ];

  const failures = validations.filter(v => !v.condition);

  if (failures.length > 0) {
    console.error('[SessionConfig] Configuration validation failed:');
    failures.forEach(f => console.error(`  - ${f.message}`));
    throw new Error('Invalid session configuration');
  }

  console.log('[SessionConfig] Configuration validated successfully');
}

// Run validation on module load
if (typeof window !== 'undefined') {
  validateConfiguration();
}

export default {
  IDLE_TIMEOUT_MS,
  ABSOLUTE_TIMEOUT_MS,
  REMEMBER_ME_DURATION_MS,
  WARNING_THRESHOLD_MINUTES,
  SESSION_CHECK_INTERVAL_MS,
  ACTIVITY_CHECK_INTERVAL_MS,
  ACTIVITY_TIMEOUT_MS,
  AUTO_EXTEND_INTERVAL_MS,
  BASE_GRACE_PERIOD_MS,
  POST_LOGIN_GRACE_PERIOD_MS,
  PAGE_LOAD_GRACE_PERIOD_MS,
  DELIBERATE_RELOAD_GRACE_PERIOD_MS,
  MAX_GRACE_PERIOD_MS,
  LONG_OPERATION_THRESHOLD_MS,
  MAX_LONG_OPERATION_DURATION_MS,
  OPERATION_SESSION_CHECK_INTERVAL_MS,
  PRE_OPERATION_BUFFER_MS,
  CRITICAL_OPERATION_FLAG_TIMEOUT_MS,
  STORAGE_KEYS,
  SESSION_EVENTS,
  BROADCAST_CHANNEL_NAME
};
