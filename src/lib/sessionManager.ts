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
  type User
} from './auth';

// Re-export for convenience
export { getSessionRemainingTimeFromAuth as getSessionRemainingTime };

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

// Activity tracking
let lastActivityTime = Date.now();
let sessionCheckInterval: NodeJS.Timeout | null = null;
let activityCheckInterval: NodeJS.Timeout | null = null;
let warningShown = false;
let isRedirecting = false;

// BroadcastChannel for cross-tab communication
let broadcastChannel: BroadcastChannel | null = null;

/**
 * Initialize the session manager
 */
export function initializeSessionManager(): void {
  if (typeof window === 'undefined') return;

  console.log('[SessionManager] Initializing comprehensive session management');

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

  const user = getAuthenticatedUser();
  if (!user) {
    handleSessionExpired('Your session has expired. Please sign in again to continue.');
    return;
  }

  const remainingMinutes = getSessionRemainingTimeFromAuth();

  // Check if session is about to expire (within 5 minutes)
  if (remainingMinutes > 0 && remainingMinutes <= WARNING_THRESHOLD_MINUTES && !warningShown) {
    showSessionWarning(remainingMinutes);
    return;
  }

  // Check if session has expired (with grace period)
  if (remainingMinutes === 0) {
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
  if (!window.location.pathname.startsWith('/signin')) {
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
