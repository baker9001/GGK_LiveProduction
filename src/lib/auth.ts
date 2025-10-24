/**
 * File: /src/lib/auth.ts
 * Dependencies: 
 *   - None (Supabase auth removed)
 * 
 * SECURITY FIXES:
 *   - Added auth change events
 *   - Improved session monitoring
 *   - Prevent redirect loops
 *   - Complete session cleanup
 */

export type UserRole = 'SSA' | 'SUPPORT' | 'VIEWER' | 'TEACHER' | 'STUDENT' | 'ENTITY_ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  userType?: string;
  avatarUrl?: string | null;
}

const AUTH_STORAGE_KEY = 'ggk_authenticated_user';
const TEST_USER_KEY = 'test_mode_user';
const AUTH_TOKEN_KEY = 'ggk_auth_token';
const REMEMBER_SESSION_KEY = 'ggk_remember_session';
const SESSION_EXPIRED_NOTICE_KEY = 'ggk_session_expired_notice';
const SUPABASE_SESSION_STORAGE_KEY = 'supabase.auth.token';
const SUPABASE_SESSION_REQUIRED_KEY = 'ggk_supabase_session_required';
const LAST_LOGIN_TIME_KEY = 'ggk_last_login_time';
const LAST_PAGE_LOAD_TIME_KEY = 'ggk_last_page_load_time';
export const SESSION_EXPIRED_EVENT = 'ggk-session-expired';

// Session durations
const DEFAULT_SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const REMEMBER_SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

// Pages that don't require authentication
const PUBLIC_PAGES = [
  '/',
  '/landing',
  '/signin',
  '/forgot-password',
  '/reset-password',
  '/about',
  '/contact',
  '/features',
  '/pricing',
  '/subjects',
  '/resources'
];

// SECURITY: Dispatch auth change event
export function dispatchAuthChange(): void {
  window.dispatchEvent(new Event('auth-change'));
}

// Generate a simple JWT-like token for API calls
export function generateAuthToken(user: User, rememberMe: boolean = false): string {
  const duration = rememberMe ? REMEMBER_SESSION_DURATION : DEFAULT_SESSION_DURATION;
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + duration,
    rememberMe
  };
  // Simple base64 encoding (for demo - use proper JWT in production)
  return btoa(JSON.stringify(payload));
}

// Set authenticated user and generate token
export function setAuthenticatedUser(user: User): void {
  // Check if remember me is enabled
  const rememberMe = localStorage.getItem(REMEMBER_SESSION_KEY) === 'true';

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  const token = generateAuthToken(user, rememberMe);
  localStorage.setItem(AUTH_TOKEN_KEY, token);

  // Ensure future checks validate the Supabase session (skip in test mode)
  if (!isInTestMode()) {
    localStorage.setItem(SUPABASE_SESSION_REQUIRED_KEY, 'true');
  }

  // CRITICAL FIX: Record login time to prevent session monitoring from interfering
  const loginTime = Date.now();
  persistLastLoginTime(loginTime);

  console.log(`[Auth] Session created with ${rememberMe ? '30-day' : '24-hour'} expiration`);
  console.log(`[Auth] Login time recorded: ${new Date(loginTime).toISOString()}`);

  // SECURITY: Dispatch auth change event
  dispatchAuthChange();
}

// Get authenticated user
export function getAuthenticatedUser(): User | null {
  // First check if token is valid
  const token = getAuthToken();
  if (!token) {
    // Don't call clearAuthenticatedUser here to avoid loops
    return null;
  }

  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp && payload.exp < Date.now()) {
      console.log('Session expired. Clearing authentication.');
      // Clear without dispatching events to avoid loops
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      return null;
    }
  } catch {
    return null;
  }

  // CRITICAL FIX: Check if we should skip Supabase session validation during grace periods
  // This prevents session expiry issues immediately after page reload
  const shouldSkipSupabaseCheck = (() => {
    // Skip check if Supabase is still initializing
    if (supabaseInitializing) {
      console.log('[Auth] Skipping Supabase check in getAuthenticatedUser - Supabase initializing');
      return true;
    }

    // Skip check if page was recently loaded (within 60 seconds)
    const lastPageLoadTime = getPersistedLastPageLoadTime();
    const timeSincePageLoad = Date.now() - lastPageLoadTime;
    if (timeSincePageLoad < 60000) {
      console.log('[Auth] Skipping Supabase check in getAuthenticatedUser - page recently loaded');
      return true;
    }

    // Skip check if user recently logged in (within 60 seconds)
    const lastLoginTime = getPersistedLastLoginTime();
    const timeSinceLogin = Date.now() - lastLoginTime;
    if (timeSinceLogin < 60000) {
      console.log('[Auth] Skipping Supabase check in getAuthenticatedUser - user recently logged in');
      return true;
    }

    return false;
  })();

  // Ensure the Supabase auth session is still valid when required
  // Use grace period during initialization to allow Supabase session to load
  if (!shouldSkipSupabaseCheck && isSupabaseSessionRequired() && !isSupabaseSessionActive(30000)) {
    console.warn('[Auth] Supabase session is missing or expired. Clearing local auth state.');
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    return null;
  }

  const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
  return storedUser ? JSON.parse(storedUser) : null;
}

// Get auth token for API calls
export function getAuthToken(): string | null {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return null;
  
  // Validate token expiry
  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp && payload.exp < Date.now()) {
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

// Get remaining session time in minutes
export function getSessionRemainingTime(): number {
  const token = getAuthToken();
  if (!token) return 0;
  
  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp) {
      const remaining = payload.exp - Date.now();
      return Math.max(0, Math.floor(remaining / 60000)); // Convert to minutes
    }
  } catch {
    return 0;
  }
  
  return 0;
}

// Check if session is expiring soon (within 1 hour)
export function isSessionExpiringSoon(): boolean {
  const remaining = getSessionRemainingTime();
  return remaining > 0 && remaining <= 60;
}

// Extend session (for activity-based renewal)
export function extendSession(): void {
  const user = getAuthenticatedUser();
  if (user) {
    setAuthenticatedUser(user);
    console.log('Session extended');
  }
}

// Clear all authentication data
export function clearAuthenticatedUser(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(TEST_USER_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(REMEMBER_SESSION_KEY);
  localStorage.removeItem(SUPABASE_SESSION_REQUIRED_KEY);
  localStorage.removeItem(LAST_LOGIN_TIME_KEY);
  localStorage.removeItem(LAST_PAGE_LOAD_TIME_KEY);

  // SECURITY: Clear cached user scope
  localStorage.removeItem('user_scope_cache');
  localStorage.removeItem('last_user_id');

  // Clear remembered email only if user explicitly logs out
  // (not on session expiration)
  if (localStorage.getItem('ggk_user_logout') === 'true') {
    localStorage.removeItem('ggk_remembered_email');
    localStorage.removeItem('ggk_user_logout');
  }

  sessionStorage.clear();
  console.log('User logged out, all auth data cleared');

  // SECURITY: Dispatch auth change event
  dispatchAuthChange();
}

// Synchronous version for backward compatibility
export function clearAuthenticatedUserSync(): void {
  clearAuthenticatedUser();
}

// Mark that user explicitly logged out (not session expiration)
export function markUserLogout(): void {
  localStorage.setItem('ggk_user_logout', 'true');
}

// Mark that the session expired so the UI can show a friendly inline notice
export function markSessionExpired(message: string = 'Your session has expired. Please sign in again to continue.'): void {
  try {
    localStorage.setItem(SESSION_EXPIRED_NOTICE_KEY, message);

    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      const sessionExpiredEvent = new CustomEvent<{ message: string }>(SESSION_EXPIRED_EVENT, {
        detail: { message }
      });
      window.dispatchEvent(sessionExpiredEvent);
    }
  } catch (error) {
    console.warn('[Auth] Unable to persist session expiration notice:', error);
  }
}

// Determine if Supabase session validation is required for the current user
export function isSupabaseSessionRequired(): boolean {
  try {
    return localStorage.getItem(SUPABASE_SESSION_REQUIRED_KEY) === 'true';
  } catch {
    return false;
  }
}

type SupabaseStoredSession = {
  currentSession?: {
    expires_at?: number | string;
    expiresAt?: number | string;
    expires_in?: number;
  } | null;
  expires_at?: number | string;
  expiresAt?: number | string;
};

function normalizeSupabaseExpiry(value: unknown): number | null {
  if (!value) return null;

  if (typeof value === 'number') {
    // Supabase stores seconds; convert if necessary
    return value > 1e12 ? value : value * 1000;
  }

  if (typeof value === 'string') {
    const numeric = Number(value);
    if (!Number.isNaN(numeric) && numeric !== 0) {
      return numeric > 1e12 ? numeric : numeric * 1000;
    }

    const parsedDate = Date.parse(value);
    if (!Number.isNaN(parsedDate)) {
      return parsedDate;
    }
  }

  return null;
}

function getSupabaseSessionPayload(): SupabaseStoredSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(SUPABASE_SESSION_STORAGE_KEY);
    if (!stored) return null;

    return JSON.parse(stored) as SupabaseStoredSession;
  } catch (error) {
    console.warn('[Auth] Unable to parse Supabase session storage:', error);
    return null;
  }
}

export function getSupabaseSessionExpiry(): number | null {
  const payload = getSupabaseSessionPayload();
  if (!payload) return null;

  const candidates: Array<number | null> = [
    normalizeSupabaseExpiry(payload.expiresAt),
    normalizeSupabaseExpiry(payload.expires_at)
  ];

  if (payload.currentSession) {
    candidates.push(
      normalizeSupabaseExpiry(payload.currentSession.expiresAt),
      normalizeSupabaseExpiry(payload.currentSession.expires_at)
    );

    if (typeof payload.currentSession.expires_in === 'number') {
      candidates.push(Date.now() + payload.currentSession.expires_in * 1000);
    }
  }

  for (const candidate of candidates) {
    if (candidate && candidate > 0) {
      return candidate;
    }
  }

  return null;
}

export function getSupabaseSessionRemainingMinutes(): number | null {
  const expiry = getSupabaseSessionExpiry();
  if (expiry === null) return null;

  const remainingMs = expiry - Date.now();
  return Math.max(0, Math.floor(remainingMs / 60000));
}

export function isSupabaseSessionActive(gracePeriodMs = 0): boolean {
  const expiry = getSupabaseSessionExpiry();
  if (expiry === null) {
    // Treat missing session as inactive only when monitoring is required
    return !isSupabaseSessionRequired();
  }

  return expiry - Date.now() > gracePeriodMs;
}

// Consume (read and clear) the stored session expiration notice
export function consumeSessionExpiredNotice(): string | null {
  try {
    const message = localStorage.getItem(SESSION_EXPIRED_NOTICE_KEY);
    if (message) {
      localStorage.removeItem(SESSION_EXPIRED_NOTICE_KEY);
      return message;
    }
  } catch (error) {
    console.warn('[Auth] Unable to read session expiration notice:', error);
  }
  return null;
}

// Explicitly clear any stored session expiration notice (used on manual logout)
export function clearSessionExpiredNotice(): void {
  try {
    localStorage.removeItem(SESSION_EXPIRED_NOTICE_KEY);
  } catch (error) {
    console.warn('[Auth] Unable to clear session expiration notice:', error);
  }
}

// Check if authenticated
export function isAuthenticated(): boolean {
  return !!getAuthenticatedUser();
}

// Async version for compatibility
export async function isAuthenticatedAsync(): Promise<boolean> {
  return isAuthenticated();
}

// Get user role
export function getUserRole(): UserRole | null {
  const user = getCurrentUser();
  return user?.role || null;
}

// Check if user has required role
export function hasRequiredRole(requiredRole: UserRole): boolean {
  const userRole = getUserRole();
  if (!userRole) return false;

  const roleHierarchy: Record<UserRole, number> = {
    SSA: 3,
    SUPPORT: 2,
    VIEWER: 1,
    TEACHER: 1,
    STUDENT: 1,
    ENTITY_ADMIN: 2,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

// Check if user can deactivate target user (prevent self-deactivation)
export function canDeactivateUser(targetUserId: string): boolean {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;
  
  // Prevent self-deactivation
  if (currentUser.id === targetUserId) {
    return false;
  }
  
  return true;
}

// Validate deactivation request with detailed error message
export function validateDeactivationRequest(targetUserId: string): { 
  canDeactivate: boolean; 
  reason?: string; 
} {
  const currentUser = getCurrentUser();
  
  if (!currentUser) {
    return { 
      canDeactivate: false, 
      reason: 'You must be logged in to perform this action' 
    };
  }
  
  if (currentUser.id === targetUserId) {
    return { 
      canDeactivate: false, 
      reason: 'You cannot deactivate your own account for security reasons. Please ask another administrator to deactivate your account if needed.' 
    };
  }
  
  return { canDeactivate: true };
}

// Test mode functions
export function startTestMode(testUser: User, skipAuthDispatch: boolean = false): string | null {
  const currentUser = getAuthenticatedUser();
  if (!currentUser || currentUser.role !== 'SSA') {
    alert('Only Super Admins can use test mode');
    return null;
  }

  // Store test mode data
  localStorage.setItem(TEST_USER_KEY, JSON.stringify(testUser));

  // Store test mode metadata for audit
  const testModeMetadata = {
    realAdminId: currentUser.id,
    realAdminEmail: currentUser.email,
    testUserId: testUser.id,
    testUserEmail: testUser.email,
    testUserRole: testUser.role,
    startTime: Date.now(),
    expirationTime: Date.now() + (5 * 60 * 1000)
  };
  localStorage.setItem('test_mode_metadata', JSON.stringify(testModeMetadata));

  console.log('[TestMode] Started for user:', testUser.email, '(', testUser.role, ')');
  console.log('[TestMode] Real admin:', currentUser.email);

  // Get redirect path BEFORE any context updates
  const redirectPath = getRedirectPathForUser(testUser);

  // CRITICAL FIX: Only dispatch auth change if caller requests it
  // This allows navigation to complete BEFORE contexts update
  if (!skipAuthDispatch) {
    dispatchAuthChange();
  }

  // Return the redirect path for the caller to handle navigation
  return redirectPath;
}

export function exitTestMode(): void {
  const metadata = getTestModeMetadata();

  localStorage.removeItem(TEST_USER_KEY);
  localStorage.removeItem('test_mode_metadata');
  localStorage.removeItem('test_mode_expiration');

  console.log('[TestMode] Ended');
  if (metadata) {
    const duration = Math.round((Date.now() - metadata.startTime) / 1000);
    console.log('[TestMode] Duration:', duration, 'seconds');
    console.log('[TestMode] Test user:', metadata.testUserEmail);
  }

  // Dispatch auth change event to restore real admin context
  dispatchAuthChange();

  // Small delay to let contexts update
  setTimeout(() => {
    window.location.href = '/app/system-admin/dashboard';
  }, 100);
}

export function isInTestMode(): boolean {
  return !!localStorage.getItem(TEST_USER_KEY);
}

export function getTestModeUser(): User | null {
  const testUser = localStorage.getItem(TEST_USER_KEY);
  return testUser ? JSON.parse(testUser) : null;
}

// CRITICAL: This function returns the current active user (test mode or real)
export function getCurrentUser(): User | null {
  const testUser = localStorage.getItem(TEST_USER_KEY);
  if (testUser) {
    return JSON.parse(testUser);
  }
  return getAuthenticatedUser();
}

export function getRealAdminUser(): User | null {
  return getAuthenticatedUser();
}

// Simplified session refresh (no Supabase)
export async function refreshSession(): Promise<boolean> {
  const user = getAuthenticatedUser();
  if (user) {
    // Regenerate token with same remember me setting
    const token = getAuthToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token));
        const newToken = generateAuthToken(user, payload.rememberMe || false);
        localStorage.setItem(AUTH_TOKEN_KEY, newToken);
        return true;
      } catch {
        return false;
      }
    }
  }
  return false;
}

// Check if current page is public (doesn't require auth)
function isPublicPage(): boolean {
  const currentPath = window.location.pathname;
  
  // Check exact matches and prefix matches
  return PUBLIC_PAGES.some(page => {
    // Exact match
    if (currentPath === page) return true;
    // Prefix match for nested routes (e.g., /landing/something)
    if (page !== '/' && currentPath.startsWith(page + '/')) return true;
    return false;
  });
}

// Session monitoring - check every minute (FIXED VERSION)
let sessionCheckInterval: NodeJS.Timeout | null = null;
let isMonitoringActive = false;
let isRedirecting = false;
let lastLoginTime: number = 0;

// Helper functions to persist login and page load times
function persistLastLoginTime(time: number): void {
  lastLoginTime = time;
  try {
    localStorage.setItem(LAST_LOGIN_TIME_KEY, time.toString());
  } catch (error) {
    console.warn('[Auth] Failed to persist login time:', error);
  }
}

function getPersistedLastLoginTime(): number {
  try {
    const stored = localStorage.getItem(LAST_LOGIN_TIME_KEY);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

function persistLastPageLoadTime(): void {
  try {
    localStorage.setItem(LAST_PAGE_LOAD_TIME_KEY, Date.now().toString());
  } catch (error) {
    console.warn('[Auth] Failed to persist page load time:', error);
  }
}

function getPersistedLastPageLoadTime(): number {
  try {
    const stored = localStorage.getItem(LAST_PAGE_LOAD_TIME_KEY);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

// Track if Supabase is initializing (to prevent premature session checks)
let supabaseInitializing = true;
let supabaseSessionReady = false;

// Initialize login time from storage on module load
if (typeof window !== 'undefined') {
  lastLoginTime = getPersistedLastLoginTime();
  persistLastPageLoadTime(); // Record page load time

  // Listen for Supabase session initialization
  // This is a more robust approach than just using a timer
  import('./supabase').then(({ supabase }) => {
    // Check if session is already available
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabaseSessionReady = true;
        supabaseInitializing = false;
        console.log('[Auth] Supabase session found and ready');
      } else {
        // Session not available yet, but still mark as initialized after checking
        setTimeout(() => {
          supabaseInitializing = false;
          console.log('[Auth] Supabase initialization period complete (no session found)');
        }, 5000);
      }
    }).catch(() => {
      // Error checking session, use fallback timer
      setTimeout(() => {
        supabaseInitializing = false;
        console.log('[Auth] Supabase initialization period complete (error checking session)');
      }, 5000);
    });

    // Listen for auth state changes to update session ready flag
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        supabaseSessionReady = true;
        supabaseInitializing = false;
        console.log('[Auth] Supabase session ready after event:', event);
      }
    });
  }).catch(() => {
    // Fallback: mark as initialized after delay
    setTimeout(() => {
      supabaseInitializing = false;
      console.log('[Auth] Supabase initialization period complete (fallback)');
    }, 5000);
  });
}

export function startSessionMonitoring(): void {
  // Prevent multiple intervals
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
  }

  // Reset flags
  isRedirecting = false;

  // Load persisted times
  lastLoginTime = getPersistedLastLoginTime();
  const lastPageLoadTime = getPersistedLastPageLoadTime();

  // Don't start monitoring immediately - wait for app to initialize
  // CRITICAL FIX: Increased delay to 10 seconds to prevent interference with login flow
  setTimeout(() => {
    isMonitoringActive = true;

    sessionCheckInterval = setInterval(() => {
      // Skip if not monitoring or already redirecting
      if (!isMonitoringActive || isRedirecting) return;

      // CRITICAL FIX: Don't monitor if user just logged in (within last 60 seconds)
      const timeSinceLogin = Date.now() - lastLoginTime;
      if (timeSinceLogin < 60000) {
        console.log('[SessionMonitoring] Skipping check - user recently logged in');
        return;
      }

      // CRITICAL FIX: Don't monitor if page just loaded (within last 60 seconds)
      // This prevents session expiry issues after page reload
      const timeSincePageLoad = Date.now() - lastPageLoadTime;
      if (timeSincePageLoad < 60000) {
        console.log('[SessionMonitoring] Skipping check - page recently loaded');
        return;
      }

      // Get current path
      const currentPath = window.location.pathname;

      // Skip monitoring for public pages AND signin page
      if (isPublicPage() || currentPath === '/signin' || currentPath.startsWith('/signin')) {
        return;
      }

      const user = getAuthenticatedUser();
      if (!user) {
        // Session expired or no user
        console.log('[SessionMonitoring] Session expired. Clearing auth and redirecting to login.');

        // Set flags to prevent loops
        isMonitoringActive = false;
        isRedirecting = true;

        // Stop the interval
        if (sessionCheckInterval) {
          clearInterval(sessionCheckInterval);
          sessionCheckInterval = null;
        }

        // Clear all authentication data
        clearAuthenticatedUser();

        // Store a friendly notice so the sign-in page can show the message
        markSessionExpired();

        // Redirect to login
        window.location.replace('/signin');
      } else if (isSessionExpiringSoon()) {
        // Optional: Show warning to user
        console.warn('[SessionMonitoring] Session expiring soon. Consider extending.');
      }
    }, 60000); // Check every minute
  }, 10000); // CRITICAL FIX: Wait 10 seconds before starting monitoring (was 2 seconds)
}

export function stopSessionMonitoring(): void {
  isMonitoringActive = false;
  isRedirecting = false;
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
    sessionCheckInterval = null;
  }
}

// Setup periodic token refresh
export function setupSessionRefresh(): void {
  setInterval(async () => {
    // Only refresh if authenticated and not on public page
    if (isAuthenticated() && !isSessionExpiringSoon() && !isPublicPage()) {
      await refreshSession();
    }
  }, 30 * 60 * 1000); // 30 minutes
}

// NOTE: Session monitoring is now handled by sessionManager.ts
// The old monitoring system is disabled to prevent conflicts
// Keeping these functions for backward compatibility but not auto-starting them

// Helper to map user types to roles
export function mapUserTypeToRole(userType: string): UserRole {
  switch (userType) {
    case 'system':
      return 'SSA'; // Default, should be overridden by actual role
    case 'entity':
      return 'ENTITY_ADMIN';
    case 'teacher':
      return 'TEACHER';
    case 'student':
      return 'STUDENT';
    default:
      return 'VIEWER';
  }
}

// Get redirect path based on user type/role
export function getRedirectPathForUser(user: User): string {
  const rolePathMap: Record<UserRole, string> = {
    SSA: '/app/system-admin/dashboard',
    SUPPORT: '/app/system-admin/dashboard',
    VIEWER: '/app/system-admin/dashboard',
    TEACHER: '/app/teachers-module/dashboard',
    STUDENT: '/app/student-module/dashboard',
    ENTITY_ADMIN: '/app/entity-module/dashboard'
  };
  
  return rolePathMap[user.role] || '/app/system-admin/dashboard';
}

// Get test mode metadata
export function getTestModeMetadata(): {
  realAdminId: string;
  realAdminEmail: string;
  testUserId: string;
  testUserEmail: string;
  testUserRole: string;
  startTime: number;
  expirationTime: number;
} | null {
  const metadataStr = localStorage.getItem('test_mode_metadata');
  if (!metadataStr) return null;

  try {
    return JSON.parse(metadataStr);
  } catch {
    return null;
  }
}

// Check if test mode has expired
export function isTestModeExpired(): boolean {
  const metadata = getTestModeMetadata();
  if (!metadata) return false;

  return Date.now() >= metadata.expirationTime;
}

// Log impersonation activity (for future use)
export async function logImpersonationActivity(
  action: 'start' | 'end',
  adminId: string,
  targetUserId: string,
  reason?: string
): Promise<void> {
  const logEntry = {
    action,
    adminId,
    targetUserId,
    reason,
    timestamp: new Date().toISOString()
  };

  console.log(`[TestMode] ${action}:`, logEntry);

  // Store in local log
  const logs = JSON.parse(localStorage.getItem('test_mode_logs') || '[]');
  logs.push(logEntry);
  // Keep only last 100 logs
  localStorage.setItem('test_mode_logs', JSON.stringify(logs.slice(-100)));
}