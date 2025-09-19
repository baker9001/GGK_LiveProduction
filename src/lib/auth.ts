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

// Session durations
const DEFAULT_SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const REMEMBER_SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

// Pages that don't require authentication
const PUBLIC_PAGES = [
  '/',
  '/landing',
  '/landing/subjects',
  '/landing/resources',
  '/landing/about',
  '/landing/contact',
  '/landing/subjects',
  '/landing/resources',
  '/landing/about',
  '/forgot-password',
  '/reset-password',
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

// Test mode functions
export function startTestMode(testUser: User): void {
  const currentUser = getAuthenticatedUser();
  if (!currentUser || currentUser.role !== 'SSA') {
    alert('Only Super Admins can use test mode');
    return;
  }
  
  localStorage.setItem(TEST_USER_KEY, JSON.stringify(testUser));
  console.log('Test mode started for user:', testUser);
  
  // Redirect to appropriate module
  const redirectPath = getRedirectPathForUser(testUser);
  window.location.href = redirectPath;
}

export function exitTestMode(): void {
  localStorage.removeItem(TEST_USER_KEY);
  console.log('Test mode ended');
  window.location.href = '/app/system-admin/dashboard';
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