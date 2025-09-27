/**
 * File: /src/lib/auth.ts
 * Dependencies: 
 *   - supabase client for session management
 * 
 * SECURITY FIXES:
 *   - Added auth change events
 *   - Improved session monitoring
 *   - Prevent redirect loops
 *   - Complete session cleanup
 *   - Enhanced test mode with 5-minute timeout
 *   - Security audit logging for test mode
 */

import { supabase } from './supabase';

// Auth state change listener
let authStateListener: { data: { subscription: any } } | null = null;

export type UserRole = 'SSA' | 'SUPPORT' | 'VIEWER' | 'TEACHER' | 'STUDENT' | 'ENTITY_ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  userType?: string;
}

const AUTH_STORAGE_KEY = 'ggk_authenticated_user';
const TEST_USER_KEY = 'test_mode_user';
const AUTH_TOKEN_KEY = 'ggk_auth_token';
const REMEMBER_SESSION_KEY = 'ggk_remember_session';

// TEST MODE CONSTANTS
const TEST_MODE_EXPIRATION_KEY = 'test_mode_expiration';
const TEST_MODE_AUDIT_KEY = 'test_mode_audit';
const TEST_MODE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

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
  
  console.log(`Session created with ${rememberMe ? '30-day' : '24-hour'} expiration`);
  
  // SECURITY: Dispatch auth change event
  dispatchAuthChange();
}

// Get authenticated user
export async function getAuthenticatedUser(): Promise<User | null> {
  // Check Supabase session first
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      // Clear local storage if Supabase session is invalid
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      return null;
    }
    
    // Validate session user ID
    if (!session.user?.id || session.user.id === 'undefined' || session.user.id === 'null') {
      console.error('[auth] Invalid session user ID:', { userId: session.user?.id });
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      return null;
    }
  } catch (error) {
    console.error('Error checking Supabase session:', error);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    return null;
  }

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
    
    // Validate payload user ID
    if (!payload.id || payload.id === 'undefined' || payload.id === 'null') {
      console.error('[auth] Invalid token payload user ID:', { userId: payload.id });
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      return null;
    }
  } catch {
    return null;
  }
  
  const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!storedUser) return null;
  
  try {
    const user = JSON.parse(storedUser);
    // Validate stored user ID
    if (!user?.id || user.id === 'undefined' || user.id === 'null' || typeof user.id !== 'string') {
      console.error('[auth] Invalid stored user ID:', { userId: user?.id, userType: typeof user?.id });
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(AUTH_TOKEN_KEY);
      return null;
    }
    return user;
  } catch (error) {
    console.error('[auth] Error parsing stored user:', error);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    return null;
  }
}

// Synchronous version for backward compatibility (deprecated)
export function getAuthenticatedUserSync(): User | null {
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
  const user = getAuthenticatedUserSync(); // Use sync version here to avoid async issues
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
  localStorage.removeItem(TEST_MODE_EXPIRATION_KEY);
  
  // SECURITY: Clear Supabase authentication tokens
  localStorage.removeItem('supabase.auth.token');
  
  // SECURITY: Clear cached user scope
  localStorage.removeItem('user_scope_cache');
  localStorage.removeItem('last_user_id');
  
  // Clear remembered email only if user explicitly logs out
  // (not on session expiration)
  if (localStorage.getItem('ggk_user_logout') === 'true') {
    localStorage.removeItem('ggk_remembered_email');
    localStorage.removeItem('ggk_user_logout');
  }
  
  // Stop test mode expiration checker if running
  stopTestModeExpirationChecker();
  
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

// Check if authenticated
export async function isAuthenticated(): Promise<boolean> {
  const user = await getAuthenticatedUser();
  return !!user;
}

// Async version for compatibility
export async function isAuthenticatedAsync(): Promise<boolean> {
  return await isAuthenticated();
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

// ============================================
// ENHANCED TEST MODE FUNCTIONS WITH TIMEOUT
// ============================================

// Test mode expiration checker interval
let testModeExpirationInterval: NodeJS.Timeout | null = null;

// Enhanced start test mode with security and timeout
export async function startTestMode(testUser: User): Promise<void> {
  // Use async version and await it
  const currentUser = await getAuthenticatedUser();
  
  // Security check: Only SSA can start test mode
  if (!currentUser || currentUser.role !== 'SSA') {
    console.error('[Security] Non-SSA user attempted to start test mode:', currentUser);
    // Note: Remove alert() - handled by Toast in UI
    return;
  }
  
  // Set expiration time (5 minutes from now)
  const expirationTime = Date.now() + TEST_MODE_DURATION;
  localStorage.setItem(TEST_MODE_EXPIRATION_KEY, expirationTime.toString());
  
  // Log test mode activation for audit
  const testModeEvent = {
    type: 'TEST_MODE_START',
    timestamp: new Date().toISOString(),
    expirationTime: new Date(expirationTime).toISOString(),
    adminUser: {
      id: currentUser.id,
      email: currentUser.email,
      role: currentUser.role
    },
    testUser: {
      id: testUser.id,
      email: testUser.email,
      role: testUser.role,
      userType: testUser.userType
    }
  };
  
  console.log('[TEST MODE]', testModeEvent);
  
  // Store in audit log
  const auditLog = JSON.parse(localStorage.getItem(TEST_MODE_AUDIT_KEY) || '[]');
  auditLog.push(testModeEvent);
  localStorage.setItem(TEST_MODE_AUDIT_KEY, JSON.stringify(auditLog.slice(-50)));
  
  // Store security event for general audit
  const securityEvents = JSON.parse(localStorage.getItem('security_events') || '[]');
  securityEvents.push({
    ...testModeEvent,
    severity: 'medium'
  });
  localStorage.setItem('security_events', JSON.stringify(securityEvents.slice(-100)));
  
  // Store test user
  localStorage.setItem(TEST_USER_KEY, JSON.stringify(testUser));
  console.log('Test mode started for user:', testUser);
  
  // Start expiration checker
  startTestModeExpirationChecker();
  
  // Redirect to appropriate module
  const redirectPath = getRedirectPathForUser(testUser);
  window.location.href = redirectPath;
}

// Enhanced exit test mode with audit logging
export function exitTestMode(): void {
  const testUser = getTestModeUser();
  const realAdmin = getRealAdminUser();
  
  if (testUser) {
    // Log test mode end for audit
    const testModeEvent = {
      type: 'TEST_MODE_END',
      timestamp: new Date().toISOString(),
      adminUser: realAdmin ? {
        id: realAdmin.id,
        email: realAdmin.email,
        role: realAdmin.role
      } : null,
      testUser: {
        id: testUser.id,
        email: testUser.email,
        role: testUser.role
      },
      sessionDuration: calculateTestModeDuration()
    };
    
    console.log('[TEST MODE]', testModeEvent);
    
    // Store in audit log
    const auditLog = JSON.parse(localStorage.getItem(TEST_MODE_AUDIT_KEY) || '[]');
    auditLog.push(testModeEvent);
    localStorage.setItem(TEST_MODE_AUDIT_KEY, JSON.stringify(auditLog.slice(-50)));
  }
  
  // Clear test mode data
  localStorage.removeItem(TEST_USER_KEY);
  localStorage.removeItem(TEST_MODE_EXPIRATION_KEY);
  
  // Stop expiration checker
  stopTestModeExpirationChecker();
  
  console.log('Test mode ended');
  window.location.href = '/app/system-admin/dashboard';
}

// Enhanced isInTestMode with expiration check
export function isInTestMode(): boolean {
  const hasTestUser = !!localStorage.getItem(TEST_USER_KEY);
  if (!hasTestUser) return false;
  
  // Check if expired
  const expirationTime = localStorage.getItem(TEST_MODE_EXPIRATION_KEY);
  if (!expirationTime) {
    // No expiration set, clean up
    localStorage.removeItem(TEST_USER_KEY);
    return false;
  }
  
  if (Date.now() > parseInt(expirationTime)) {
    // Expired, clean up
    localStorage.removeItem(TEST_USER_KEY);
    localStorage.removeItem(TEST_MODE_EXPIRATION_KEY);
    return false;
  }
  
  return true;
}

export function getTestModeUser(): User | null {
  if (!isInTestMode()) return null;
  
  const testUser = localStorage.getItem(TEST_USER_KEY);
  return testUser ? JSON.parse(testUser) : null;
}

// Check if test mode has expired
export function isTestModeExpired(): boolean {
  if (!isInTestMode()) return false;
  
  const expirationTime = localStorage.getItem(TEST_MODE_EXPIRATION_KEY);
  if (!expirationTime) return true;
  
  return Date.now() > parseInt(expirationTime);
}

// Get remaining time in test mode (in seconds)
export function getTestModeRemainingTime(): number {
  if (!isInTestMode()) return 0;
  
  const expirationTime = localStorage.getItem(TEST_MODE_EXPIRATION_KEY);
  if (!expirationTime) return 0;
  
  const remaining = Math.max(0, parseInt(expirationTime) - Date.now());
  return Math.floor(remaining / 1000);
}

// Calculate test mode session duration
function calculateTestModeDuration(): string {
  const startTime = getTestModeStartTime();
  if (!startTime) return 'Unknown';
  
  const duration = Date.now() - startTime;
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);
  
  return `${minutes}m ${seconds}s`;
}

// Get test mode start time
function getTestModeStartTime(): number | null {
  const expirationTime = localStorage.getItem(TEST_MODE_EXPIRATION_KEY);
  if (!expirationTime) return null;
  
  return parseInt(expirationTime) - TEST_MODE_DURATION;
}

// Start test mode expiration checker
function startTestModeExpirationChecker(): void {
  stopTestModeExpirationChecker();
  
  testModeExpirationInterval = setInterval(() => {
    if (isTestModeExpired()) {
      console.log('[TEST MODE] Session expired, forcing exit');
      
      const testUser = getTestModeUser();
      const realAdmin = getRealAdminUser();
      
      const expirationEvent = {
        type: 'TEST_MODE_EXPIRED',
        timestamp: new Date().toISOString(),
        adminUser: realAdmin ? {
          id: realAdmin.id,
          email: realAdmin.email
        } : null,
        testUser: testUser ? {
          id: testUser.id,
          email: testUser.email
        } : null
      };
      
      const auditLog = JSON.parse(localStorage.getItem(TEST_MODE_AUDIT_KEY) || '[]');
      auditLog.push(expirationEvent);
      localStorage.setItem(TEST_MODE_AUDIT_KEY, JSON.stringify(auditLog.slice(-50)));
      
      exitTestMode();
    }
  }, 5000); // Check every 5 seconds
}

// Stop test mode expiration checker
function stopTestModeExpirationChecker(): void {
  if (testModeExpirationInterval) {
    clearInterval(testModeExpirationInterval);
    testModeExpirationInterval = null;
  }
}

// Get test mode audit log
export function getTestModeAuditLog(): any[] {
  return JSON.parse(localStorage.getItem(TEST_MODE_AUDIT_KEY) || '[]');
}

// Clear test mode audit log (SSA only)
export function clearTestModeAuditLog(): void {
  const currentUser = getCurrentUser();
  if (currentUser?.role === 'SSA') {
    localStorage.removeItem(TEST_MODE_AUDIT_KEY);
    console.log('[AUDIT] Test mode audit log cleared by', currentUser.email);
  }
}

// ============================================
// END OF TEST MODE ENHANCEMENTS
// ============================================

// CRITICAL: This function returns the current active user (test mode or real)
export function getCurrentUser(): User | null {
  const testUser = localStorage.getItem(TEST_USER_KEY);
  if (testUser) {
    return JSON.parse(testUser);
  }
  return getAuthenticatedUserSync();
}

export function getRealAdminUser(): User | null {
  return getAuthenticatedUserSync();
}

// Simplified session refresh (no Supabase)
export async function refreshSession(): Promise<boolean> {
  const user = await getAuthenticatedUser();
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

export function startSessionMonitoring(): void {
  // Prevent multiple intervals
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
  }
  
  // Reset flags
  isRedirecting = false;
  
  // Don't start monitoring immediately - wait for app to initialize
  setTimeout(() => {
    isMonitoringActive = true;
    
    sessionCheckInterval = setInterval(async () => {
      // Skip if not monitoring or already redirecting
      if (!isMonitoringActive || isRedirecting) return;
      
      // Get current path
      const currentPath = window.location.pathname;
      
      // Skip monitoring for public pages AND signin page
      if (isPublicPage() || currentPath === '/signin' || currentPath.startsWith('/signin')) {
        return;
      }
      
      const user = await getAuthenticatedUser();
      if (!user) {
        // Session expired or no user
        console.log('Session expired. Redirecting to login.');
        
        // Set flags to prevent loops
        isMonitoringActive = false;
        isRedirecting = true;
        
        // Stop the interval
        if (sessionCheckInterval) {
          clearInterval(sessionCheckInterval);
          sessionCheckInterval = null;
        }
        
        // Use replace to prevent back button issues
        window.location.replace('/signin');
      } else if (isSessionExpiringSoon()) {
        // Optional: Show warning to user
        console.warn('Session expiring soon. Consider extending.');
      }
    }, 60000); // Check every minute
  }, 2000); // Wait 2 seconds before starting monitoring
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
    if (await isAuthenticated() && !isSessionExpiringSoon() && !isPublicPage()) {
      await refreshSession();
    }
  }, 30 * 60 * 1000); // 30 minutes
}

// Initialize on app start - but with delay
if (typeof window !== 'undefined') {
  // Check on load if test mode is active
  if (isInTestMode()) {
    if (isTestModeExpired()) {
      console.log('[TEST MODE] Expired session detected on load, cleaning up');
      exitTestMode();
    } else {
      // Restart the expiration checker
      startTestModeExpirationChecker();
    }
  }
  
  // Setup Supabase auth state listener
  const setupAuthStateListener = () => {
    if (authStateListener) {
      authStateListener.data.subscription.unsubscribe();
    }
    
    authStateListener = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Supabase auth state change:', event, session?.user?.id);
      
      // Handle auth state changes that indicate session is invalid
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED' || event === 'TOKEN_REFRESHED') {
        if (event === 'TOKEN_REFRESHED' && !session) {
          // Token refresh failed
          console.log('Token refresh failed, clearing auth data');
          clearAuthenticatedUser();
          
          // Only redirect if not on public page
          if (!isPublicPage()) {
            window.location.replace('/signin');
          }
        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          console.log('User signed out or deleted, clearing auth data');
          clearAuthenticatedUser();
          
          // Only redirect if not on public page
          if (!isPublicPage()) {
            window.location.replace('/signin');
          }
        }
      }
    });
  };
  
  // Wait for app to fully load before starting session management
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupAuthStateListener();
      setupSessionRefresh();
      startSessionMonitoring();
    });
  } else {
    // DOM already loaded
    setTimeout(() => {
      setupAuthStateListener();
      setupSessionRefresh();
      startSessionMonitoring();
    }, 1000);
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

// Log impersonation activity (for future use)
export async function logImpersonationActivity(
  action: 'start' | 'end',
  adminId: string,
  targetUserId: string,
  reason?: string
): Promise<void> {
  console.log(`Impersonation ${action}:`, {
    adminId,
    targetUserId,
    reason,
    timestamp: new Date().toISOString()
  });
}