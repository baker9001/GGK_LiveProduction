// /src/lib/auth.ts

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

export function clearAuthenticatedUser(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem(TEST_USER_KEY); // CRITICAL: Clear test mode on logout
  
  // Clear any other session data
  sessionStorage.clear();
  
  console.log('User logged out, test mode cleared');
}

export function isAuthenticated(): boolean {
  return !!getAuthenticatedUser();
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