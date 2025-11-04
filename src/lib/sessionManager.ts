/**
 * File: /src/lib/sessionManager.ts
 *
 * Comprehensive Session Management System
 * Handles session warnings, activity tracking, auto-refresh, and expiration detection
 */

import {
  getAuthToken,
  getAuthenticatedUser,
  setAuthenticatedUser,
  clearAuthenticatedUser,
  markSessionExpired,
  getSessionRemainingTime as getSessionRemainingTimeFromAuth,
  getSupabaseSessionRemainingMinutes,
  isSupabaseSessionActive,
  isSupabaseSessionRequired,
  type User
} from './auth';
import { supabase } from './supabase';

// Re-export for convenience
export {
  getSessionRemainingTimeFromAuth as getSessionRemainingTime,
  getSupabaseSessionRemainingMinutes,
  isSupabaseSessionRequired
};

// Session configuration constants
const WARNING_THRESHOLD_MINUTES = 5; // Warn user 5 minutes before expiration
const ACTIVITY_CHECK_INTERVAL = 30000; // Check activity every 30 seconds
const SESSION_CHECK_INTERVAL = 30000; // Check session every 30 seconds (more frequent than before)
const AUTO_EXTEND_INTERVAL = 15 * 60 * 1000; // Auto-extend every 15 minutes of activity
const ACTIVITY_TIMEOUT = 2 * 60 * 1000; // Consider inactive after 2 minutes without activity
const GRACE_PERIOD = 30000; // 30 second grace period before actual logout

// Event names
export const SESSION_WARNING_EVENT = 'ggk-session-warning';
export const SESSION_EXTENDED_EVENT = 'ggk-session-extended';
export const SESSION_ACTIVITY_EVENT = 'ggk-session-activity';

// Storage keys
const LAST_ACTIVITY_KEY = 'ggk_last_activity';
const SESSION_WARNING_SHOWN_KEY = 'ggk_session_warning_shown';
const LAST_AUTO_EXTEND_KEY = 'ggk_last_auto_extend';
const LAST_PAGE_LOAD_TIME_KEY = 'ggk_last_page_load_time';
const LAST_LOGIN_TIME_KEY = 'ggk_last_login_time';
const DELIBERATE_RELOAD_KEY = 'ggk_deliberate_reload';
const RELOAD_REASON_KEY = 'ggk_reload_reason';

// Activity tracking
let lastActivityTime = Date.now();
let sessionCheckInterval: NodeJS.Timeout | null = null;
let activityCheckInterval: NodeJS.Timeout | null = null;
let warningShown = false;
let isRedirecting = false;
let storageListener: ((event: StorageEvent) => void) | null = null;
let pageLoadTime = Date.now();

// BroadcastChannel for cross-tab communication
let broadcastChannel: BroadcastChannel | null = null;

/**
 * Initialize the session manager
 */
export function initializeSessionManager(): void {
  if (typeof window === 'undefined') return;

  console.log('[SessionManager] Initializing comprehensive session management');

  // Check if this is a deliberate reload
  let isDeliberateReload = false;
  let reloadReason = 'unknown';
  try {
    const reloadMarker = localStorage.getItem(DELIBERATE_RELOAD_KEY);
    reloadReason = localStorage.getItem(RELOAD_REASON_KEY) || 'unknown';

    if (reloadMarker) {
      const reloadTime = parseInt(reloadMarker, 10);
      const timeSinceReload = Date.now() - reloadTime;

      // If reload marker is less than 5 seconds old, this is a deliberate reload
      if (timeSinceReload < 5000) {
        isDeliberateReload = true;
        console.log(`[SessionManager] Detected deliberate reload: ${reloadReason}`);
      }

      // Clean up reload marker
      localStorage.removeItem(DELIBERATE_RELOAD_KEY);
      localStorage.removeItem(RELOAD_REASON_KEY);
    }
  } catch (error) {
    console.warn('[SessionManager] Failed to check reload marker:', error);
  }

  // Record page load time
  pageLoadTime = Date.now();
  try {
    localStorage.setItem(LAST_PAGE_LOAD_TIME_KEY, pageLoadTime.toString());

    // If this is a deliberate reload, extend the grace period
    if (isDeliberateReload) {
      console.log('[SessionManager] Extending grace period for deliberate reload');
      // Store a flag that we should use extended grace period
      localStorage.setItem('ggk_extended_grace_period', pageLoadTime.toString());
    }
  } catch (error) {
    console.warn('[SessionManager] Failed to persist page load time:', error);
  }

  // Initialize BroadcastChannel for cross-tab sync
  try {
    broadcastChannel = new BroadcastChannel('ggk-session-channel');
    broadcastChannel.onmessage = handleBroadcastMessage;
    console.log('[SessionManager] Cross-tab synchronization enabled');
  } catch (error) {
    console.warn('[SessionManager] BroadcastChannel not supported, cross-tab sync disabled');
  }

  // Set up activity tracking
  setupActivityTracking();

  // Start session monitoring
  startSessionMonitoring();

  // Load last activity from storage
  const savedActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (savedActivity) {
    lastActivityTime = parseInt(savedActivity, 10);
  }

  // Listen for Supabase session changes (cross-tab or automatic refresh failures)
  if (typeof window !== 'undefined') {
    storageListener = (event: StorageEvent) => {
      if (!event) return;
      if (event.key !== 'supabase.auth.token') return;
      if (!isSupabaseSessionRequired()) return;

      // CRITICAL FIX: Don't check Supabase session immediately after page load
      // Extended to 120 seconds if this was a deliberate reload
      const timeSincePageLoad = Date.now() - pageLoadTime;
      let gracePerioddMs = 60000; // Default 60 seconds

      // Check if we should use extended grace period
      try {
        const extendedGracePeriod = localStorage.getItem('ggk_extended_grace_period');
        if (extendedGracePeriod) {
          const extendedGraceTime = parseInt(extendedGracePeriod, 10);
          const timeSinceExtendedGrace = Date.now() - extendedGraceTime;

          if (timeSinceExtendedGrace < 120000) {
            gracePerioddMs = 120000; // Extended to 120 seconds
          } else {
            // Clean up expired extended grace period marker
            localStorage.removeItem('ggk_extended_grace_period');
          }
        }
      } catch (error) {
        console.warn('[SessionManager] Failed to check extended grace period:', error);
      }

      if (timeSincePageLoad < gracePerioddMs) {
        console.log(`[SessionManager] Skipping Supabase check - page recently loaded (${Math.round(timeSincePageLoad/1000)}s ago, grace period: ${Math.round(gracePerioddMs/1000)}s)`);
        return;
      }

      const supabaseRemaining = getSupabaseSessionRemainingMinutes();

      if (!event.newValue || supabaseRemaining === null || supabaseRemaining === 0) {
        handleSessionExpired('Your secure session has ended. Please sign in again.');
        return;
      }

      if (!warningShown && supabaseRemaining > 0 && supabaseRemaining <= WARNING_THRESHOLD_MINUTES) {
        showSessionWarning(supabaseRemaining);
      }
    };

    window.addEventListener('storage', storageListener);
  }

  console.log('[SessionManager] Initialization complete');
}

/**
 * Clean up session manager
 */
export function cleanupSessionManager(): void {
  stopSessionMonitoring();
  stopActivityTracking();

  if (broadcastChannel) {
    broadcastChannel.close();
    broadcastChannel = null;
  }

  if (typeof window !== 'undefined' && storageListener) {
    window.removeEventListener('storage', storageListener);
    storageListener = null;
  }

  console.log('[SessionManager] Cleanup complete');
}

/**
 * Set up activity tracking listeners
 */
function setupActivityTracking(): void {
  if (typeof window === 'undefined') return;

  // Track various user activities
  const activityEvents = [
    'mousedown',
    'mousemove',
    'keydown',
    'scroll',
    'touchstart',
    'click'
  ];

  // Debounced activity handler
  let activityTimeout: NodeJS.Timeout | null = null;

  const handleActivity = () => {
    if (activityTimeout) {
      clearTimeout(activityTimeout);
    }

    activityTimeout = setTimeout(() => {
      recordActivity();
    }, 500); // Debounce for 500ms
  };

  // Add event listeners
  activityEvents.forEach(event => {
    window.addEventListener(event, handleActivity, { passive: true });
  });

  // Start activity check interval
  activityCheckInterval = setInterval(() => {
    checkActivityBasedExtension();
  }, ACTIVITY_CHECK_INTERVAL);

  console.log('[SessionManager] Activity tracking enabled');
}

/**
 * Stop activity tracking
 */
function stopActivityTracking(): void {
  if (activityCheckInterval) {
    clearInterval(activityCheckInterval);
    activityCheckInterval = null;
  }
}

/**
 * Record user activity
 */
function recordActivity(): void {
  const now = Date.now();
  lastActivityTime = now;
  localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());

  // Dispatch activity event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SESSION_ACTIVITY_EVENT, {
      detail: { timestamp: now }
    }));
  }

  // Broadcast activity to other tabs
  broadcastMessage({ type: 'activity', timestamp: now });
}

/**
 * Public function to manually record activity
 * Useful before page reloads or navigation
 */
export function recordUserActivity(): void {
  recordActivity();
}

/**
 * Check if user has been active recently
 */
export function isUserActive(): boolean {
  const timeSinceActivity = Date.now() - lastActivityTime;
  return timeSinceActivity < ACTIVITY_TIMEOUT;
}

/**
 * Check if session should be auto-extended based on activity
 */
function checkActivityBasedExtension(): void {
  if (!isUserActive()) return;

  const user = getAuthenticatedUser();
  if (!user) return;

  const lastExtend = localStorage.getItem(LAST_AUTO_EXTEND_KEY);
  const lastExtendTime = lastExtend ? parseInt(lastExtend, 10) : 0;
  const timeSinceExtend = Date.now() - lastExtendTime;

  // Auto-extend if user is active and it's been more than 15 minutes since last extension
  if (timeSinceExtend >= AUTO_EXTEND_INTERVAL) {
    extendSession();
  }
}

/**
 * Extend the current session
 */
export function extendSession(): void {
  const user = getAuthenticatedUser();
  if (!user) return;

  // Regenerate token with updated expiration
  setAuthenticatedUser(user);

  // Attempt to refresh the Supabase session token to keep parity with backend auth
  void supabase.auth.refreshSession().catch(error => {
    console.warn('[SessionManager] Failed to refresh Supabase session during extend:', error);
  });

  const now = Date.now();
  localStorage.setItem(LAST_AUTO_EXTEND_KEY, now.toString());

  // Clear warning state
  warningShown = false;
  localStorage.removeItem(SESSION_WARNING_SHOWN_KEY);

  console.log('[SessionManager] Session extended');

  // Dispatch extension event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SESSION_EXTENDED_EVENT, {
      detail: { timestamp: now, auto: false }
    }));
  }

  // Broadcast extension to other tabs
  broadcastMessage({ type: 'extended', timestamp: now });
}

/**
 * Start session monitoring
 */
function startSessionMonitoring(): void {
  // Prevent multiple intervals
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
  }

  isRedirecting = false;

  sessionCheckInterval = setInterval(() => {
    checkSessionStatus();
  }, SESSION_CHECK_INTERVAL);

  console.log('[SessionManager] Session monitoring started');
}

/**
 * Stop session monitoring
 */
export function stopSessionMonitoring(): void {
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
    sessionCheckInterval = null;
  }
}

/**
 * Check current session status
 */
function checkSessionStatus(): void {
  // Skip if already redirecting or on public pages
  if (isRedirecting) return;

  const currentPath = window.location.pathname;
  if (isPublicPage(currentPath)) return;

  // CRITICAL FIX: Don't check session immediately after page load (60 second grace period)
  // Extended to 120 seconds if this was a deliberate reload
  const timeSincePageLoad = Date.now() - pageLoadTime;
  let gracePerioddMs = 60000; // Default 60 seconds

  // Check if we should use extended grace period
  try {
    const extendedGracePeriod = localStorage.getItem('ggk_extended_grace_period');
    if (extendedGracePeriod) {
      const extendedGraceTime = parseInt(extendedGracePeriod, 10);
      const timeSinceExtendedGrace = Date.now() - extendedGraceTime;

      if (timeSinceExtendedGrace < 120000) {
        gracePerioddMs = 120000; // Extended to 120 seconds
        console.log('[SessionManager] Using extended grace period for deliberate reload');
      } else {
        // Clean up expired extended grace period marker
        localStorage.removeItem('ggk_extended_grace_period');
      }
    }
  } catch (error) {
    console.warn('[SessionManager] Failed to check extended grace period:', error);
  }

  if (timeSincePageLoad < gracePerioddMs) {
    console.log(`[SessionManager] Skipping check - page recently loaded (${Math.round(timeSincePageLoad/1000)}s ago, grace period: ${Math.round(gracePerioddMs/1000)}s)`);
    return;
  }

  // CRITICAL FIX: Don't check session immediately after login (60 second grace period)
  try {
    const lastLoginTimeStr = localStorage.getItem(LAST_LOGIN_TIME_KEY);
    if (lastLoginTimeStr) {
      const lastLoginTime = parseInt(lastLoginTimeStr, 10);
      const timeSinceLogin = Date.now() - lastLoginTime;
      if (timeSinceLogin < 60000) {
        console.log('[SessionManager] Skipping check - user recently logged in');
        return;
      }
    }
  } catch (error) {
    console.warn('[SessionManager] Failed to check login time:', error);
  }

  const user = getAuthenticatedUser();
  if (!user) {
    handleSessionExpired('Your session has expired. Please sign in again to continue.');
    return;
  }

  // CRITICAL FIX: Add grace period for Supabase session validation (30 seconds)
  // This allows time for the Supabase session to refresh after page reload
  if (isSupabaseSessionRequired() && !isSupabaseSessionActive(30000)) {
    handleSessionExpired('Your secure session has expired. Please sign in again to continue.');
    return;
  }

  const localRemainingMinutes = getSessionRemainingTimeFromAuth();
  const supabaseRemainingMinutes = isSupabaseSessionRequired()
    ? getSupabaseSessionRemainingMinutes()
    : null;

  // Determine the most restrictive remaining time for warnings
  const activeRemainingCandidates = [
    localRemainingMinutes,
    supabaseRemainingMinutes !== null ? supabaseRemainingMinutes : undefined
  ].filter((value): value is number => typeof value === 'number' && value > 0);

  const remainingMinutes = activeRemainingCandidates.length > 0
    ? Math.min(...activeRemainingCandidates)
    : localRemainingMinutes;

  // Check if session is about to expire (within 5 minutes)
  if (remainingMinutes > 0 && remainingMinutes <= WARNING_THRESHOLD_MINUTES && !warningShown) {
    showSessionWarning(remainingMinutes);
    return;
  }

  // Check if session has expired (with grace period)
  const localExpired = localRemainingMinutes === 0;
  const supabaseExpired = supabaseRemainingMinutes !== null && supabaseRemainingMinutes === 0;

  if (localExpired || supabaseExpired) {
    // Add grace period for pending operations
    setTimeout(() => {
      const recheckUser = getAuthenticatedUser();
      if (!recheckUser) {
        handleSessionExpired('Your session has expired. Please sign in again to continue.');
      }
    }, GRACE_PERIOD);
  }
}

/**
 * Show session warning to user
 */
function showSessionWarning(remainingMinutes: number): void {
  warningShown = true;
  localStorage.setItem(SESSION_WARNING_SHOWN_KEY, 'true');

  console.log(`[SessionManager] Warning: Session expires in ${remainingMinutes} minutes`);

  // Dispatch warning event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SESSION_WARNING_EVENT, {
      detail: { remainingMinutes }
    }));
  }

  // Broadcast warning to other tabs
  broadcastMessage({ type: 'warning', remainingMinutes });
}

/**
 * Handle session expiration
 */
function handleSessionExpired(message: string): void {
  if (isRedirecting) return;

  console.log('[SessionManager] Session expired, initiating logout');

  isRedirecting = true;
  stopSessionMonitoring();
  stopActivityTracking();

  // Clear all auth data
  clearAuthenticatedUser();

  // Mark session as expired
  markSessionExpired(message);

  // Broadcast expiration to other tabs
  broadcastMessage({ type: 'expired' });

  // Redirect to login (always go to dashboard after re-auth)
  if (
    !window.location.pathname.startsWith('/signin') &&
    !window.location.pathname.startsWith('/login')
  ) {
    window.location.replace('/signin');
  }
}

/**
 * Check if current page is public
 */
function isPublicPage(path: string): boolean {
  const publicPaths = [
    '/',
    '/landing',
    '/signin',
    '/login',
    '/forgot-password',
    '/reset-password',
    '/about',
    '/contact',
    '/subjects',
    '/resources',
    '/pricing',
    '/privacy',
    '/terms',
    '/cookies'
  ];

  return publicPaths.some(publicPath =>
    path === publicPath || (publicPath !== '/' && path.startsWith(publicPath + '/'))
  );
}

/**
 * Broadcast message to other tabs
 */
function broadcastMessage(message: any): void {
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(message);
    } catch (error) {
      console.warn('[SessionManager] Failed to broadcast message:', error);
    }
  }
}

/**
 * Handle broadcast messages from other tabs
 */
function handleBroadcastMessage(event: MessageEvent): void {
  const { type, timestamp, remainingMinutes } = event.data;

  switch (type) {
    case 'activity':
      // Update last activity time from other tab
      if (timestamp && timestamp > lastActivityTime) {
        lastActivityTime = timestamp;
        localStorage.setItem(LAST_ACTIVITY_KEY, timestamp.toString());
      }
      break;

    case 'extended':
      // Session was extended in another tab
      console.log('[SessionManager] Session extended in another tab');
      warningShown = false;
      localStorage.removeItem(SESSION_WARNING_SHOWN_KEY);

      if (timestamp) {
        localStorage.setItem(LAST_AUTO_EXTEND_KEY, timestamp.toString());
      }

      // Dispatch extension event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(SESSION_EXTENDED_EVENT, {
          detail: { timestamp, auto: false, fromOtherTab: true }
        }));
      }
      break;

    case 'warning':
      // Warning shown in another tab
      if (remainingMinutes && !warningShown) {
        showSessionWarning(remainingMinutes);
      }
      break;

    case 'expired':
      // Session expired in another tab
      if (!isRedirecting) {
        handleSessionExpired('Your session has expired in another tab. Please sign in again.');
      }
      break;
  }
}

/**
 * Get time until session expiration in milliseconds
 */
export function getTimeUntilExpiration(): number {
  const token = getAuthToken();
  if (!token) return 0;

  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp) {
      return Math.max(0, payload.exp - Date.now());
    }
  } catch {
    return 0;
  }

  return 0;
}

/**
 * Check if session warning should be shown
 */
export function shouldShowWarning(): boolean {
  const remainingMinutes = getSessionRemainingTimeFromAuth();
  return remainingMinutes > 0 && remainingMinutes <= WARNING_THRESHOLD_MINUTES;
}

/**
 * Force session expiration (for testing)
 */
export function forceExpireSession(): void {
  console.log('[SessionManager] Force expiring session');
  handleSessionExpired('Session expired (testing)');
}
