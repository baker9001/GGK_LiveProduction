/**
 * File: /src/lib/auth.ts
 * Dependencies: 
 *   - None (Supabase auth removed)
 * 
 * Preserved Features:
 *   - User authentication state management
 *   - Test mode functionality
 *   - Role-based access control
 *   - Simple JWT-like token generation
 * 
 * Added/Modified:
 *   - Remember Me functionality with extended sessions
 *   - Session expiration management
 *   - Auto-logout on expiration
 *   - FIXED: Exclude landing page from automatic redirects
 * 
 * Database Tables:
 *   - None (auth managed in localStorage)
 * 
 * Connected Files:
 *   - All components that check authentication
 */

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
  '/signin',
  '/forgot-password',
  '/reset-password',
  '/about',
  '/contact',
  '/features',
  '/pricing'
];

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
}

// Get authenticated user
export function getAuthenticatedUser(): User | null {
  // First check if token is valid
  const token = getAuthToken();
  if (!token) {
    clearAuthenticatedUser();
    return null;
  }
  
  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp && payload.exp < Date.now()) {
      console.log('Session expired. Clearing authentication.');
      clearAuthenticatedUser();
      return null;
    }
  } catch {
    clearAuthenticatedUser();
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
  
  // Clear remembered email only if user explicitly logs out
  // (not on session expiration)
  if (localStorage.getItem('ggk_user_logout') === 'true') {
    localStorage.removeItem('ggk_remembered_email');
    localStorage.removeItem('ggk_user_logout');
  }
  
  sessionStorage.clear();
  console.log('User logged out, all auth data cleared');
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

// Session monitoring - check every minute
let sessionCheckInterval: NodeJS.Timeout | null = null;

export function startSessionMonitoring(): void {
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
  }
  
  sessionCheckInterval = setInterval(() => {
    // Skip monitoring for public pages
    if (isPublicPage()) {
      return; // Don't check authentication on public pages
    }
    
    const user = getAuthenticatedUser();
    if (!user) {
      // Session expired or no user, redirect to login
      // But only if we're not already on a public page
      console.log('Session expired. Redirecting to login.');
      window.location.href = '/signin';
    } else if (isSessionExpiringSoon()) {
      // Optional: Show warning to user
      console.warn('Session expiring soon. Consider extending.');
    }
  }, 60000); // Check every minute
}

export function stopSessionMonitoring(): void {
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

// Initialize on app start
if (typeof window !== 'undefined') {
  setupSessionRefresh();
  startSessionMonitoring();
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