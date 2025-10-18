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

  // CRITICAL FIX: Record login time to prevent session monitoring from interfering
  lastLoginTime = Date.now();

  console.log(`[Auth] Session created with ${rememberMe ? '30-day' : '24-hour'} expiration`);
  console.log(`[Auth] Login time recorded: ${new Date(lastLoginTime).toISOString()}`);

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

export function startSessionMonitoring(): void {
  // Prevent multiple intervals
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
  }

  // Reset flags
  isRedirecting = false;

  // Don't start monitoring immediately - wait for app to initialize
  // CRITICAL FIX: Increased delay to 10 seconds to prevent interference with login flow
  setTimeout(() => {
    isMonitoringActive = true;

    sessionCheckInterval = setInterval(() => {
      // Skip if not monitoring or already redirecting
      if (!isMonitoringActive || isRedirecting) return;

      // CRITICAL FIX: Don't monitor if user just logged in (within last 30 seconds)
      const timeSinceLogin = Date.now() - lastLoginTime;
      if (timeSinceLogin < 30000) {
        console.log('[SessionMonitoring] Skipping check - user just logged in');
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
        console.log('[SessionMonitoring] Session expired. Redirecting to login.');

        // Set flags to prevent loops
        isMonitoringActive = false;
        isRedirecting = true;

        // Store a friendly notice so the sign-in page can surface the message inline
        markSessionExpired();

        // Stop the interval
        if (sessionCheckInterval) {
          clearInterval(sessionCheckInterval);
          sessionCheckInterval = null;
        }

        console.log('[SessionMonitoring] Session expired notice dispatched. Awaiting user acknowledgement.');
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

// Initialize on app start - but with delay
if (typeof window !== 'undefined') {
  // Wait for app to fully load before starting session management
  // CRITICAL FIX: Increased delay to prevent interference with initial auth state
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        setupSessionRefresh();
        startSessionMonitoring();
      }, 5000); // CRITICAL FIX: Wait 5 seconds after DOM load
    });
  } else {
    // DOM already loaded
    setTimeout(() => {
      setupSessionRefresh();
      startSessionMonitoring();
    }, 5000); // CRITICAL FIX: Wait 5 seconds (was 1 second)
  }
}

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