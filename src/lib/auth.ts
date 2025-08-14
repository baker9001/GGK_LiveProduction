/**
 * File: /src/lib/auth.ts
 * Dependencies: 
 *   - None (Supabase auth removed)
 * 
 * Preserved Features:
 *   - User authentication state management
 *   - Test mode functionality
 *   - Role-based access control
 * 
 * Added/Modified:
 *   - REMOVED all Supabase auth dependencies
 *   - Using localStorage for session management
 *   - JWT token generation for API calls
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

// Generate a simple JWT-like token for API calls
export function generateAuthToken(user: User): string {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };
  // Simple base64 encoding (for demo - use proper JWT in production)
  return btoa(JSON.stringify(payload));
}

// Set authenticated user and generate token
export function setAuthenticatedUser(user: User): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  const token = generateAuthToken(user);
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

// Get authenticated user
export function getAuthenticatedUser(): User | null {
  const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
  return storedUser ? JSON.parse(storedUser) : null;
}

// Get auth token for API calls
export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

// Clear all authentication data
export function clearAuthenticatedUser(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(TEST_USER_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.clear();
  console.log('User logged out, all auth data cleared');
}

// Synchronous version for backward compatibility
export function clearAuthenticatedUserSync(): void {
  clearAuthenticatedUser();
}

// Check if authenticated
export function isAuthenticated(): boolean {
  const user = getAuthenticatedUser();
  const token = getAuthToken();
  
  if (!user || !token) return false;
  
  // Check token expiry
  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp && payload.exp < Date.now()) {
      clearAuthenticatedUser();
      return false;
    }
  } catch {
    return false;
  }
  
  return true;
}

// Async version for compatibility
export async function isAuthenticatedAsync(): Promise<boolean> {
  return isAuthenticated();
}

// Test mode functions
export function startTestMode(testUser: User): void {
  localStorage.setItem(TEST_USER_KEY, JSON.stringify(testUser));
}

export function exitTestMode(): void {
  localStorage.removeItem(TEST_USER_KEY);
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
    // Regenerate token
    const newToken = generateAuthToken(user);
    localStorage.setItem(AUTH_TOKEN_KEY, newToken);
    return true;
  }
  return false;
}

// Setup periodic token refresh
export function setupSessionRefresh(): void {
  setInterval(async () => {
    if (isAuthenticated()) {
      await refreshSession();
    }
  }, 30 * 60 * 1000); // 30 minutes
}

// Initialize on app start
if (typeof window !== 'undefined') {
  setupSessionRefresh();
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