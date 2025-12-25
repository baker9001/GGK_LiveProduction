/**
 * File: /src/lib/sessionGracePeriod.ts
 *
 * Consolidated Grace Period Logic
 * Single source of truth for all grace period checks throughout the application
 *
 * REPLACES scattered grace period logic in:
 * - sessionManager.ts (3 separate checks)
 * - auth.ts (isWithinGracePeriod function)
 * - supabase.ts auth listener
 */

import {
  STORAGE_KEYS,
  getGracePeriodDuration,
  validateGracePeriod,
  MAX_GRACE_PERIOD_MS,
  MAX_TOTAL_GRACE_TIME_MS,
  MAX_GRACE_PERIODS_PER_SESSION
} from './sessionConfig';

/**
 * Grace Period Status
 */
export interface GracePeriodStatus {
  isActive: boolean;
  reason: string | null;
  startTime: number | null;
  duration: number;
  remainingMs: number;
  expiresAt: number | null;
}

/**
 * Grace Period Reason Types
 */
export type GracePeriodReason =
  | 'start_new_import'
  | 'delete_operation'
  | 'critical_operation'
  | 'refresh_session'
  | 'page_reload'
  | 'post_login'
  | 'deliberate_reload'
  | null;

/**
 * Get current grace period status
 * SINGLE SOURCE OF TRUTH for all grace period checks
 */
export function getGracePeriodStatus(): GracePeriodStatus {
  if (typeof window === 'undefined') {
    return {
      isActive: false,
      reason: null,
      startTime: null,
      duration: 0,
      remainingMs: 0,
      expiresAt: null
    };
  }

  try {
    // Check for extended grace period marker (highest priority)
    const extendedGraceStr = localStorage.getItem(STORAGE_KEYS.EXTENDED_GRACE_PERIOD);
    const extendedReason = localStorage.getItem(STORAGE_KEYS.GRACE_PERIOD_REASON);

    if (extendedGraceStr) {
      const extendedGraceTime = parseInt(extendedGraceStr, 10);

      if (!isNaN(extendedGraceTime)) {
        const timeSinceExtendedGrace = Date.now() - extendedGraceTime;
        const graceDuration = getGracePeriodDuration(extendedReason || 'deliberate_reload');

        if (timeSinceExtendedGrace < graceDuration) {
          return {
            isActive: true,
            reason: extendedReason || 'deliberate_reload',
            startTime: extendedGraceTime,
            duration: graceDuration,
            remainingMs: graceDuration - timeSinceExtendedGrace,
            expiresAt: extendedGraceTime + graceDuration
          };
        }

        // Clean up expired extended grace period
        cleanupExpiredGracePeriod();
      }
    }

    // Check for deliberate reload marker
    const deliberateReloadStr = localStorage.getItem(STORAGE_KEYS.DELIBERATE_RELOAD);
    const reloadReason = localStorage.getItem(STORAGE_KEYS.RELOAD_REASON);

    if (deliberateReloadStr) {
      const reloadTime = parseInt(deliberateReloadStr, 10);

      if (!isNaN(reloadTime)) {
        const timeSinceReload = Date.now() - reloadTime;
        const graceDuration = getGracePeriodDuration(reloadReason || 'page_reload');

        // Deliberate reload markers are valid for 5 seconds
        if (timeSinceReload < 5000) {
          return {
            isActive: true,
            reason: reloadReason || 'deliberate_reload',
            startTime: reloadTime,
            duration: graceDuration,
            remainingMs: Math.max(0, 5000 - timeSinceReload),
            expiresAt: reloadTime + 5000
          };
        }

        // Clean up expired deliberate reload marker
        localStorage.removeItem(STORAGE_KEYS.DELIBERATE_RELOAD);
        localStorage.removeItem(STORAGE_KEYS.RELOAD_REASON);
      }
    }

    // Check for page load grace period
    const pageLoadTimeStr = localStorage.getItem(STORAGE_KEYS.LAST_PAGE_LOAD_TIME);

    if (pageLoadTimeStr) {
      const pageLoadTime = parseInt(pageLoadTimeStr, 10);

      if (!isNaN(pageLoadTime)) {
        const timeSincePageLoad = Date.now() - pageLoadTime;
        const graceDuration = getGracePeriodDuration('page_reload');

        if (timeSincePageLoad < graceDuration) {
          return {
            isActive: true,
            reason: 'page_reload',
            startTime: pageLoadTime,
            duration: graceDuration,
            remainingMs: graceDuration - timeSincePageLoad,
            expiresAt: pageLoadTime + graceDuration
          };
        }
      }
    }

    // Check for post-login grace period
    const lastLoginTimeStr = localStorage.getItem(STORAGE_KEYS.LAST_LOGIN_TIME);

    if (lastLoginTimeStr) {
      const lastLoginTime = parseInt(lastLoginTimeStr, 10);

      if (!isNaN(lastLoginTime)) {
        const timeSinceLogin = Date.now() - lastLoginTime;
        const graceDuration = getGracePeriodDuration('post_login');

        if (timeSinceLogin < graceDuration) {
          return {
            isActive: true,
            reason: 'post_login',
            startTime: lastLoginTime,
            duration: graceDuration,
            remainingMs: graceDuration - timeSinceLogin,
            expiresAt: lastLoginTime + graceDuration
          };
        }
      }
    }

    // No active grace period
    return {
      isActive: false,
      reason: null,
      startTime: null,
      duration: 0,
      remainingMs: 0,
      expiresAt: null
    };
  } catch (error) {
    console.error('[GracePeriod] Error checking grace period status:', error);
    return {
      isActive: false,
      reason: null,
      startTime: null,
      duration: 0,
      remainingMs: 0,
      expiresAt: null
    };
  }
}

/**
 * Check if we're within any grace period
 * REPLACES all isWithinGracePeriod() checks
 */
export function isWithinGracePeriod(): boolean {
  const status = getGracePeriodStatus();
  return status.isActive;
}

/**
 * Start a grace period with a specific reason
 * Includes stacking prevention to avoid security bypass
 */
export function startGracePeriod(reason: GracePeriodReason): void {
  if (typeof window === 'undefined') return;

  try {
    const now = Date.now();
    const duration = getGracePeriodDuration(reason || undefined);
    const validatedDuration = validateGracePeriod(duration);

    // SECURITY: Check cumulative grace time to prevent stacking abuse
    const totalGraceTimeStr = localStorage.getItem(STORAGE_KEYS.TOTAL_GRACE_TIME);
    const graceCountStr = localStorage.getItem(STORAGE_KEYS.GRACE_PERIOD_COUNT);

    const totalGraceTime = totalGraceTimeStr ? parseInt(totalGraceTimeStr, 10) : 0;
    const graceCount = graceCountStr ? parseInt(graceCountStr, 10) : 0;

    // Check if maximum total grace time exceeded
    if (totalGraceTime >= MAX_TOTAL_GRACE_TIME_MS) {
      console.warn(
        `[GracePeriod] BLOCKED: Maximum cumulative grace time reached (${Math.round(totalGraceTime/1000)}s >= ${Math.round(MAX_TOTAL_GRACE_TIME_MS/1000)}s)`
      );
      return;
    }

    // Check if maximum grace period count exceeded
    if (graceCount >= MAX_GRACE_PERIODS_PER_SESSION) {
      console.warn(
        `[GracePeriod] BLOCKED: Maximum grace period count reached (${graceCount} >= ${MAX_GRACE_PERIODS_PER_SESSION})`
      );
      return;
    }

    // Update cumulative tracking
    const newTotalGraceTime = totalGraceTime + validatedDuration;
    const newGraceCount = graceCount + 1;

    localStorage.setItem(STORAGE_KEYS.TOTAL_GRACE_TIME, newTotalGraceTime.toString());
    localStorage.setItem(STORAGE_KEYS.GRACE_PERIOD_COUNT, newGraceCount.toString());

    // Store grace period markers
    localStorage.setItem(STORAGE_KEYS.EXTENDED_GRACE_PERIOD, now.toString());
    localStorage.setItem(STORAGE_KEYS.GRACE_PERIOD_REASON, reason || '');
    localStorage.setItem(STORAGE_KEYS.GRACE_PERIOD_START_TIME, now.toString());

    console.log(
      `[GracePeriod] Started grace period: ${reason || 'unknown'} (${Math.round(validatedDuration / 1000)}s) ` +
      `[Total: ${Math.round(newTotalGraceTime/1000)}s/${Math.round(MAX_TOTAL_GRACE_TIME_MS/1000)}s, Count: ${newGraceCount}/${MAX_GRACE_PERIODS_PER_SESSION}]`
    );

    // Set up automatic cleanup
    setTimeout(() => {
      cleanupExpiredGracePeriod();
    }, validatedDuration);
  } catch (error) {
    console.error('[GracePeriod] Error starting grace period:', error);
  }
}

/**
 * Mark a deliberate reload (for backward compatibility)
 */
export function markDeliberateReload(reason: string): void {
  if (typeof window === 'undefined') return;

  try {
    const now = Date.now();

    localStorage.setItem(STORAGE_KEYS.DELIBERATE_RELOAD, now.toString());
    localStorage.setItem(STORAGE_KEYS.RELOAD_REASON, reason);

    console.log(`[GracePeriod] Marked deliberate reload: ${reason}`);

    // This will trigger extended grace period on next page load
    startGracePeriod(reason as GracePeriodReason);
  } catch (error) {
    console.error('[GracePeriod] Error marking deliberate reload:', error);
  }
}

/**
 * Clean up expired grace period markers
 */
export function cleanupExpiredGracePeriod(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEYS.EXTENDED_GRACE_PERIOD);
    localStorage.removeItem(STORAGE_KEYS.GRACE_PERIOD_REASON);
    localStorage.removeItem(STORAGE_KEYS.GRACE_PERIOD_START_TIME);

    console.log('[GracePeriod] Cleaned up expired grace period markers');
  } catch (error) {
    console.warn('[GracePeriod] Error cleaning up grace period:', error);
  }
}

/**
 * Get remaining grace period time in milliseconds
 */
export function getGracePeriodRemaining(): number {
  const status = getGracePeriodStatus();
  return status.remainingMs;
}

/**
 * Get human-readable grace period status message
 */
export function getGracePeriodMessage(): string {
  const status = getGracePeriodStatus();

  if (!status.isActive) {
    return 'No grace period active';
  }

  const remainingSeconds = Math.ceil(status.remainingMs / 1000);
  const reasonText = formatGracePeriodReason(status.reason);

  return `Grace period active: ${reasonText} (${remainingSeconds}s remaining)`;
}

/**
 * Format grace period reason for display
 */
function formatGracePeriodReason(reason: string | null): string {
  switch (reason) {
    case 'start_new_import':
      return 'Starting new import';
    case 'delete_operation':
      return 'Delete operation';
    case 'critical_operation':
      return 'Critical operation';
    case 'refresh_session':
      return 'Session refresh';
    case 'page_reload':
      return 'Page reload';
    case 'post_login':
      return 'Post-login';
    case 'deliberate_reload':
      return 'User-initiated reload';
    default:
      return 'Unknown reason';
  }
}

/**
 * Check if session checks should be skipped (used by session manager)
 */
export function shouldSkipSessionCheck(): boolean {
  const status = getGracePeriodStatus();

  if (!status.isActive) {
    return false;
  }

  // Log why we're skipping
  if (status.reason) {
    const remainingSeconds = Math.ceil(status.remainingMs / 1000);
    console.log(
      `[GracePeriod] Skipping session check - ${formatGracePeriodReason(status.reason)} ` +
        `(${remainingSeconds}s/${Math.ceil(status.duration / 1000)}s remaining)`
    );
  }

  return true;
}

/**
 * Clean up all grace period markers on logout
 * Also resets cumulative tracking for security
 */
export function cleanupAllGracePeriods(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEYS.EXTENDED_GRACE_PERIOD);
    localStorage.removeItem(STORAGE_KEYS.GRACE_PERIOD_REASON);
    localStorage.removeItem(STORAGE_KEYS.GRACE_PERIOD_START_TIME);
    localStorage.removeItem(STORAGE_KEYS.DELIBERATE_RELOAD);
    localStorage.removeItem(STORAGE_KEYS.RELOAD_REASON);

    // Also clear cumulative tracking (reset on logout)
    localStorage.removeItem(STORAGE_KEYS.TOTAL_GRACE_TIME);
    localStorage.removeItem(STORAGE_KEYS.GRACE_PERIOD_COUNT);

    console.log('[GracePeriod] Cleaned up all grace period markers and reset cumulative tracking');
  } catch (error) {
    console.warn('[GracePeriod] Error cleaning up all grace periods:', error);
  }
}

/**
 * Initialize grace period system on page load
 */
export function initializeGracePeriod(): void {
  if (typeof window === 'undefined') return;

  try {
    // Check if this is a deliberate reload
    const deliberateReload = localStorage.getItem(STORAGE_KEYS.DELIBERATE_RELOAD);
    const reloadReason = localStorage.getItem(STORAGE_KEYS.RELOAD_REASON);

    if (deliberateReload) {
      const reloadTime = parseInt(deliberateReload, 10);
      const timeSinceReload = Date.now() - reloadTime;

      // If reload marker is recent (< 5 seconds), activate extended grace period
      if (!isNaN(reloadTime) && timeSinceReload < 5000) {
        console.log(`[GracePeriod] Detected deliberate reload: ${reloadReason || 'unknown'}`);
        startGracePeriod(reloadReason as GracePeriodReason);
      }

      // Clean up reload marker
      localStorage.removeItem(STORAGE_KEYS.DELIBERATE_RELOAD);
      localStorage.removeItem(STORAGE_KEYS.RELOAD_REASON);
    }

    // Record page load time for page load grace period
    localStorage.setItem(STORAGE_KEYS.LAST_PAGE_LOAD_TIME, Date.now().toString());

    // Log current status
    const status = getGracePeriodStatus();
    if (status.isActive) {
      console.log(`[GracePeriod] ${getGracePeriodMessage()}`);
    }
  } catch (error) {
    console.error('[GracePeriod] Error initializing grace period:', error);
  }
}

/**
 * Cleanup orphaned grace period markers (older than max grace period)
 */
export function cleanupOrphanedGracePeriods(): void {
  if (typeof window === 'undefined') return;

  try {
    const now = Date.now();

    // Check extended grace period
    const extendedGraceStr = localStorage.getItem(STORAGE_KEYS.EXTENDED_GRACE_PERIOD);
    if (extendedGraceStr) {
      const extendedGraceTime = parseInt(extendedGraceStr, 10);
      if (!isNaN(extendedGraceTime)) {
        const age = now - extendedGraceTime;
        if (age > MAX_GRACE_PERIOD_MS) {
          console.log('[GracePeriod] Cleaning up orphaned extended grace period');
          cleanupExpiredGracePeriod();
        }
      }
    }

    // Check deliberate reload marker
    const deliberateReloadStr = localStorage.getItem(STORAGE_KEYS.DELIBERATE_RELOAD);
    if (deliberateReloadStr) {
      const reloadTime = parseInt(deliberateReloadStr, 10);
      if (!isNaN(reloadTime)) {
        const age = now - reloadTime;
        if (age > 10000) { // 10 seconds max age for reload markers
          console.log('[GracePeriod] Cleaning up orphaned deliberate reload marker');
          localStorage.removeItem(STORAGE_KEYS.DELIBERATE_RELOAD);
          localStorage.removeItem(STORAGE_KEYS.RELOAD_REASON);
        }
      }
    }
  } catch (error) {
    console.warn('[GracePeriod] Error cleaning up orphaned grace periods:', error);
  }
}

// Initialize on module load
if (typeof window !== 'undefined') {
  // Clean up any orphaned markers first
  cleanupOrphanedGracePeriods();

  // Then initialize
  initializeGracePeriod();
}
