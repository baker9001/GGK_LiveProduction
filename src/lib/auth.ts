// /src/lib/auth.ts

import { supabase } from './supabase';

export type UserRole = 'SSA' | 'SUPPORT' | 'VIEWER' | 'TEACHER' | 'STUDENT' | 'ENTITY_ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  userType?: string; // Original user type from database
}

const AUTH_STORAGE_KEY = 'ggk_authenticated_user';
const TEST_USER_KEY = 'test_mode_user';

// Existing authentication functions
export function setAuthenticatedUser(user: User): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

export function getAuthenticatedUser(): User | null {
  const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
  return storedUser ? JSON.parse(storedUser) : null;
}

// Updated to also clear Supabase session
export async function clearAuthenticatedUser(): Promise<void> {
  // Clear custom authentication
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(TEST_USER_KEY); // CRITICAL: Clear test mode on logout
  
  // Clear any other session data
  sessionStorage.clear();
  
  // Clear Supabase session
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out from Supabase:', error);
    } else {
      console.log('Successfully signed out from Supabase');
    }
  } catch (error) {
    console.error('Error during Supabase signout:', error);
  }
  
  console.log('User logged out, test mode cleared');
}

// Synchronous version for backward compatibility
export function clearAuthenticatedUserSync(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(TEST_USER_KEY);
  sessionStorage.clear();
  console.log('User logged out (sync), test mode cleared');
}

export function isAuthenticated(): boolean {
  return !!getAuthenticatedUser();
}

// Async version that also checks Supabase session
export async function isAuthenticatedAsync(): Promise<boolean> {
  // Check custom auth
  const customUser = getAuthenticatedUser();
  if (!customUser) {
    return false;
  }
  
  // Also check if Supabase session exists
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('Custom auth exists but no Supabase session. API calls may fail.');
      // You might want to prompt re-authentication here
    }
    return true;
  } catch (error) {
    console.error('Error checking Supabase session:', error);
    return !!customUser; // Fall back to custom auth status
  }
}

export function getUserRole(): UserRole | null {
  const user = getCurrentUser(); // Changed to use getCurrentUser
  return user?.role || null;
}

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

// Map user types from database to roles
export function mapUserTypeToRole(userType: string): UserRole {
  const typeToRoleMap: Record<string, UserRole> = {
    'teacher': 'TEACHER',
    'student': 'STUDENT',
    'entity': 'ENTITY_ADMIN',
    'entity_user': 'ENTITY_ADMIN',
    'entity_admin': 'ENTITY_ADMIN',
    'admin': 'SSA',
    'support': 'SUPPORT',
    'viewer': 'VIEWER'
  };
  
  return typeToRoleMap[userType.toLowerCase()] || 'VIEWER';
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

// NEW TEST MODE FUNCTIONS
export function startTestMode(user: User): void {
  // Only SSA can use test mode
  const currentUser = getAuthenticatedUser();
  if (!currentUser || currentUser.role !== 'SSA') {
    alert('Only Super Admins can use test mode');
    return;
  }

  localStorage.setItem(TEST_USER_KEY, JSON.stringify(user));
  
  // Log to console for debugging
  console.log('Test mode started for user:', user);
  
  // Redirect to appropriate module based on user type
  const redirectPath = getRedirectPathForUser(user);
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
  // If in test mode, return test user, otherwise return normal user
  const testUser = localStorage.getItem(TEST_USER_KEY);
  if (testUser) {
    return JSON.parse(testUser);
  }
  return getAuthenticatedUser();
}

// Function to get the real admin user (even in test mode)
export function getRealAdminUser(): User | null {
  return getAuthenticatedUser();
}

// Function to log impersonation activity (for future use)
export async function logImpersonationActivity(
  action: 'start' | 'end',
  adminId: string,
  targetUserId: string,
  reason?: string
): Promise<void> {
  // This can be implemented later to save to database
  console.log(`Impersonation ${action}:`, {
    adminId,
    targetUserId,
    reason,
    timestamp: new Date().toISOString()
  });
}

// NEW SUPABASE INTEGRATION FUNCTIONS

// Refresh Supabase session if needed
export async function refreshSession(): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('Failed to refresh session:', error);
      return false;
    }
    
    if (session) {
      console.log('Session refreshed successfully');
      return true;
    }
    
    // No session to refresh
    return false;
  } catch (error) {
    console.error('Error refreshing session:', error);
    return false;
  }
}

// Check and refresh session periodically
export function setupSessionRefresh(): void {
  // Refresh session every 30 minutes
  setInterval(async () => {
    const isAuth = await isAuthenticatedAsync();
    if (isAuth) {
      await refreshSession();
    }
  }, 30 * 60 * 1000); // 30 minutes
}

// Initialize session refresh on app start
if (typeof window !== 'undefined') {
  setupSessionRefresh();
}

// Helper function to ensure Supabase session exists
export async function ensureSupabaseSession(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.warn('No Supabase session found');
      
      // Check if we have custom auth
      const customUser = getAuthenticatedUser();
      if (customUser) {
        console.warn('Custom auth exists but no Supabase session. User may need to re-login.');
        // You could redirect to login here if needed
        // window.location.href = '/signin';
        return false;
      }
    }
    
    return !!session;
  } catch (error) {
    console.error('Error checking Supabase session:', error);
    return false;
  }
}

// Get current Supabase session
export async function getSupabaseSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch (error) {
    console.error('Error getting Supabase session:', error);
    return null;
  }
}