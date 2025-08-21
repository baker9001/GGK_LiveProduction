/**
 * File: /src/lib/auth.ts
 * 
 * MERGED AUTHENTICATION SERVICE
 * Combines database authentication with session management and test mode
 * 
 * Dependencies:
 *   - ./supabase (database queries)
 *   - @/services/userCreationService (password verification)
 * 
 * Features:
 * ✅ Database-backed authentication with password verification
 * ✅ Test mode/impersonation for admins
 * ✅ Remember Me with extended sessions
 * ✅ Session monitoring and auto-logout
 * ✅ Password reset and change functionality
 * ✅ Role-based access control with hierarchy
 * ✅ Public pages support (no auth required)
 * ✅ Token generation and validation
 * ✅ Activity-based session extension
 */

import { supabase } from './supabase';
import { userCreationService } from '@/services/userCreationService';

// User role types
export type UserRole = 'SSA' | 'SUPPORT' | 'VIEWER' | 'TEACHER' | 'STUDENT' | 'ENTITY_ADMIN' | 'SUB_ENTITY_ADMIN' | 'SCHOOL_ADMIN' | 'BRANCH_ADMIN';

// User interface combining both versions
export interface User {
  id: string;
  email: string;
  name: string;
  role?: UserRole; // For backward compatibility with version 2
  user_type?: string;
  company_id?: string;
  entity_id?: string;
  school_id?: string;
  branch_id?: string;
  is_active: boolean;
  last_login_at?: string;
  metadata?: Record<string, any>;
  permissions?: Record<string, any>;
  admin_level?: string;
}

// Login interfaces
interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface LoginResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

// Session data interface
interface SessionData {
  user: User;
  token: string;
  expiresAt: string;
  rememberMe: boolean;
}

// Storage keys
const SESSION_KEY = 'app_session';
const TOKEN_KEY = 'app_token';
const AUTH_STORAGE_KEY = 'ggk_authenticated_user'; // Backward compatibility
const TEST_USER_KEY = 'test_mode_user';
const REMEMBER_SESSION_KEY = 'ggk_remember_session';
const SESSION_CHECK_INTERVAL_KEY = 'session_check_interval';

// Session durations
const DEFAULT_SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const REMEMBER_SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

// Pages that don't require authentication
const PUBLIC_PAGES = [
  '/',
  '/landing',
  '/signin',
  '/login',
  '/forgot-password',
  '/reset-password',
  '/about',
  '/contact',
  '/features',
  '/pricing',
  '/terms',
  '/privacy'
];

// Role hierarchy for permission checking
const ROLE_HIERARCHY: Record<UserRole, number> = {
  SSA: 10,
  SUPPORT: 8,
  ENTITY_ADMIN: 6,
  SUB_ENTITY_ADMIN: 5,
  SCHOOL_ADMIN: 4,
  BRANCH_ADMIN: 3,
  TEACHER: 2,
  STUDENT: 1,
  VIEWER: 1
};

// Session monitoring interval
let sessionCheckInterval: NodeJS.Timeout | null = null;

/**
 * Generate JWT-like token
 * In production, use a proper JWT library with RSA signing
 */
function generateToken(userId: string, rememberMe: boolean = false): string {
  const duration = rememberMe ? REMEMBER_SESSION_DURATION : DEFAULT_SESSION_DURATION;
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: userId,
    iat: Date.now(),
    exp: Date.now() + duration,
    rememberMe
  }));
  // Simplified signature - use proper signing in production
  const signature = btoa(userId + Date.now() + Math.random());
  return `${header}.${payload}.${signature}`;
}

/**
 * Verify token validity
 */
function verifyToken(token: string): { valid: boolean; userId?: string; rememberMe?: boolean } {
  try {
    const [, payloadStr] = token.split('.');
    const payload = JSON.parse(atob(payloadStr));
    
    if (payload.exp < Date.now()) {
      return { valid: false };
    }
    
    return { 
      valid: true, 
      userId: payload.sub,
      rememberMe: payload.rememberMe || false
    };
  } catch {
    return { valid: false };
  }
}

/**
 * Check if current page is public (doesn't require auth)
 */
function isPublicPage(): boolean {
  if (typeof window === 'undefined') return false;
  
  const currentPath = window.location.pathname;
  
  return PUBLIC_PAGES.some(page => {
    // Exact match
    if (currentPath === page) return true;
    // Prefix match for nested routes
    if (page !== '/' && currentPath.startsWith(page + '/')) return true;
    return false;
  });
}

/**
 * Map user type to role
 */
export function mapUserTypeToRole(userType: string, adminLevel?: string): UserRole {
  // Handle admin levels first
  if (adminLevel) {
    switch (adminLevel) {
      case 'entity_admin':
        return 'ENTITY_ADMIN';
      case 'sub_entity_admin':
        return 'SUB_ENTITY_ADMIN';
      case 'school_admin':
        return 'SCHOOL_ADMIN';
      case 'branch_admin':
        return 'BRANCH_ADMIN';
    }
  }
  
  // Then handle user types
  switch (userType) {
    case 'system':
    case 'system_admin':
      return 'SSA';
    case 'support':
      return 'SUPPORT';
    case 'entity':
    case 'entity_admin':
      return 'ENTITY_ADMIN';
    case 'teacher':
      return 'TEACHER';
    case 'student':
      return 'STUDENT';
    default:
      return 'VIEWER';
  }
}

/**
 * Get redirect path based on user role
 */
export function getRedirectPathForUser(user: User): string {
  const role = user.role || mapUserTypeToRole(user.user_type || '', user.admin_level);
  
  const rolePathMap: Record<UserRole, string> = {
    SSA: '/app/system-admin/dashboard',
    SUPPORT: '/app/system-admin/dashboard',
    VIEWER: '/app/dashboard',
    TEACHER: '/app/teachers-module/dashboard',
    STUDENT: '/app/student-module/dashboard',
    ENTITY_ADMIN: '/app/entity-module/dashboard',
    SUB_ENTITY_ADMIN: '/app/entity-module/dashboard',
    SCHOOL_ADMIN: '/app/school-admin/dashboard',
    BRANCH_ADMIN: '/app/branch-admin/dashboard'
  };
  
  return rolePathMap[role] || '/app/dashboard';
}

/**
 * Main authentication service
 */
export const authService = {
  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      // Store remember me preference
      if (credentials.rememberMe) {
        localStorage.setItem(REMEMBER_SESSION_KEY, 'true');
      } else {
        localStorage.removeItem(REMEMBER_SESSION_KEY);
      }

      // Verify password using userCreationService
      const { isValid, userId } = await userCreationService.verifyPassword(
        credentials.email,
        credentials.password
      );

      if (!isValid || !userId) {
        return { 
          success: false, 
          error: 'Invalid email or password' 
        };
      }

      // Fetch complete user data with all relations
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError || !userData) {
        console.error('User fetch error:', userError);
        return { 
          success: false, 
          error: 'Failed to fetch user data' 
        };
      }

      // Check if user is active
      if (!userData.is_active) {
        return { 
          success: false, 
          error: 'Your account has been deactivated. Please contact support.' 
        };
      }

      // Fetch entity-specific data based on user type
      let entityData = null;
      let companyId = null;
      let schoolId = null;
      let branchId = null;
      let adminLevel = null;
      let permissions = null;
      
      // Check for system admin first
      if (userData.user_type === 'system' || userData.user_type === 'system_admin') {
        // System admins don't need entity data
        adminLevel = 'system_admin';
        permissions = {
          users: {
            create_entity_admin: true,
            create_sub_admin: true,
            create_school_admin: true,
            create_branch_admin: true,
            create_teacher: true,
            create_student: true,
            modify_entity_admin: true,
            modify_sub_admin: true,
            modify_school_admin: true,
            modify_branch_admin: true,
            modify_teacher: true,
            modify_student: true,
            delete_users: true,
            view_all_users: true,
          },
          organization: {
            create_school: true,
            modify_school: true,
            delete_school: true,
            create_branch: true,
            modify_branch: true,
            delete_branch: true,
            view_all_schools: true,
            view_all_branches: true,
            manage_departments: true,
          },
          settings: {
            manage_company_settings: true,
            manage_school_settings: true,
            manage_branch_settings: true,
            view_audit_logs: true,
            export_data: true,
          },
        };
      }
      // Check if user is an entity user (admin)
      else if (userData.user_type === 'entity' || userData.user_type === 'admin' || userData.user_type === 'entity_admin') {
        const { data: entityUser } = await supabase
          .from('entity_users')
          .select('*')
          .eq('user_id', userId)
          .single();
          
        if (entityUser) {
          entityData = entityUser;
          companyId = entityUser.company_id;
          adminLevel = entityUser.admin_level;
          permissions = entityUser.permissions;
          
          if (!entityUser.is_active) {
            return { 
              success: false, 
              error: 'Your admin account has been deactivated.' 
            };
          }
        }
      } 
      // Check if user is a teacher
      else if (userData.user_type === 'teacher') {
        const { data: teacher } = await supabase
          .from('teachers')
          .select('*')
          .eq('user_id', userId)
          .single();
          
        if (teacher) {
          entityData = teacher;
          companyId = teacher.company_id;
          schoolId = teacher.school_id;
          branchId = teacher.branch_id;
          
          if (!teacher.is_active) {
            return { 
              success: false, 
              error: 'Your teacher account has been deactivated.' 
            };
          }
        }
      } 
      // Check if user is a student
      else if (userData.user_type === 'student') {
        const { data: student } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', userId)
          .single();
          
        if (student) {
          entityData = student;
          schoolId = student.school_id;
          branchId = student.branch_id;
          
          // Fetch company through school
          if (student.school_id) {
            const { data: school } = await supabase
              .from('schools')
              .select('company_id')
              .eq('id', student.school_id)
              .single();
            companyId = school?.company_id;
          }
          
          if (!student.is_active) {
            return { 
              success: false, 
              error: 'Your student account has been deactivated.' 
            };
          }
        }
      }

      // Determine role
      const role = mapUserTypeToRole(
        userData.user_type || userData.primary_type || 'user',
        adminLevel
      );

      // Create user object
      const user: User = {
        id: userData.id,
        email: userData.email,
        name: userData.raw_user_meta_data?.name || userData.name || '',
        role,
        user_type: userData.user_type || userData.primary_type || 'user',
        company_id: companyId || undefined,
        entity_id: entityData?.id,
        school_id: schoolId || undefined,
        branch_id: branchId || undefined,
        is_active: userData.is_active,
        last_login_at: new Date().toISOString(),
        admin_level: adminLevel,
        permissions,
        metadata: {
          ...userData.raw_user_meta_data,
          ...entityData
        }
      };

      // Generate session token
      const token = generateToken(userId, credentials.rememberMe);

      // Store session
      const session: SessionData = {
        user,
        token,
        expiresAt: new Date(
          Date.now() + (credentials.rememberMe ? REMEMBER_SESSION_DURATION : DEFAULT_SESSION_DURATION)
        ).toISOString(),
        rememberMe: credentials.rememberMe || false
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      localStorage.setItem(TOKEN_KEY, token);
      
      // Also store in legacy format for backward compatibility
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));

      // Update last login time
      await supabase
        .from('users')
        .update({ 
          last_login_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString()
        })
        .eq('id', userId);

      // Start session monitoring
      this.startSessionMonitoring();

      console.log(`User logged in with ${credentials.rememberMe ? '30-day' : '24-hour'} session`);

      return { 
        success: true, 
        user, 
        token 
      };
    } catch (error: any) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.message || 'An error occurred during login' 
      };
    }
  },

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    try {
      // Mark explicit logout (not session expiration)
      localStorage.setItem('ggk_user_logout', 'true');
      
      // Clear all storage
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(TEST_USER_KEY);
      localStorage.removeItem(REMEMBER_SESSION_KEY);
      sessionStorage.clear();
      
      // Stop session monitoring
      this.stopSessionMonitoring();
      
      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/signin';
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  /**
   * Get current session
   */
  getSession(): SessionData | null {
    try {
      const sessionStr = localStorage.getItem(SESSION_KEY);
      if (!sessionStr) return null;

      const session: SessionData = JSON.parse(sessionStr);
      
      // Check if session is expired
      if (new Date(session.expiresAt) < new Date()) {
        this.logout();
        return null;
      }

      // Verify token
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token || !verifyToken(token).valid) {
        this.logout();
        return null;
      }

      return session;
    } catch {
      return null;
    }
  },

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    // Check for test mode first
    const testUser = this.getTestModeUser();
    if (testUser) return testUser;
    
    const session = this.getSession();
    return session?.user || null;
  },

  /**
   * Get real admin user (ignoring test mode)
   */
  getRealAdminUser(): User | null {
    const session = this.getSession();
    return session?.user || null;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.getSession() !== null;
  },

  /**
   * Get authentication token
   */
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * Refresh/extend session
   */
  refreshSession(): void {
    const session = this.getSession();
    if (session) {
      const duration = session.rememberMe ? REMEMBER_SESSION_DURATION : DEFAULT_SESSION_DURATION;
      session.expiresAt = new Date(Date.now() + duration).toISOString();
      
      // Regenerate token
      const token = generateToken(session.user.id, session.rememberMe);
      session.token = token;
      
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      localStorage.setItem(TOKEN_KEY, token);
      
      console.log('Session extended');
    }
  },

  /**
   * Get remaining session time in minutes
   */
  getSessionRemainingTime(): number {
    const session = this.getSession();
    if (!session) return 0;
    
    const remaining = new Date(session.expiresAt).getTime() - Date.now();
    return Math.max(0, Math.floor(remaining / 60000));
  },

  /**
   * Check if session is expiring soon (within 1 hour)
   */
  isSessionExpiringSoon(): boolean {
    const remaining = this.getSessionRemainingTime();
    return remaining > 0 && remaining <= 60;
  },

  /**
   * Check user permissions
   */
  hasPermission(permission: string, category?: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    // Super admin has all permissions
    if (user.role === 'SSA') return true;

    // Check permissions object
    if (user.permissions) {
      if (category) {
        return user.permissions[category]?.[permission] === true;
      }
      // Check all categories
      for (const cat in user.permissions) {
        if (user.permissions[cat][permission] === true) {
          return true;
        }
      }
    }

    // Check metadata permissions
    if (user.metadata?.permissions) {
      if (category) {
        return user.metadata.permissions[category]?.[permission] === true;
      }
      for (const cat in user.metadata.permissions) {
        if (user.metadata.permissions[cat][permission] === true) {
          return true;
        }
      }
    }

    return false;
  },

  /**
   * Check if user has specific role
   */
  hasRole(role: UserRole | string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    return user.role === role || 
           user.user_type === role || 
           user.admin_level === role ||
           user.metadata?.admin_level === role;
  },

  /**
   * Check if user has required role level
   */
  hasRequiredRole(requiredRole: UserRole): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;

    const userRole = user.role || mapUserTypeToRole(user.user_type || '', user.admin_level);
    return (ROLE_HIERARCHY[userRole] || 0) >= (ROLE_HIERARCHY[requiredRole] || 0);
  },

  /**
   * Password reset request
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if user exists
      const { data: user } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email.toLowerCase())
        .single();

      if (!user) {
        // Don't reveal if email exists for security
        return { 
          success: true, 
          message: 'If an account exists with this email, you will receive password reset instructions.' 
        };
      }

      // Generate reset token
      const resetToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store reset token
      await supabase
        .from('users')
        .update({
          verification_token: resetToken,
          verification_sent_at: new Date().toISOString()
        })
        .eq('id', user.id);

      // TODO: Send email with reset link
      // For development, log the token
      if (process.env.NODE_ENV === 'development') {
        console.log('Password reset token:', resetToken);
        console.log('Reset link:', `${window.location.origin}/reset-password?token=${resetToken}`);
      }

      return { 
        success: true, 
        message: 'Password reset instructions have been sent to your email.' 
      };
    } catch (error: any) {
      console.error('Password reset error:', error);
      return { 
        success: false, 
        message: 'Failed to process password reset request. Please try again.' 
      };
    }
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      // Find user with valid token
      const { data: user } = await supabase
        .from('users')
        .select('id, verification_sent_at')
        .eq('verification_token', token)
        .single();

      if (!user) {
        return { 
          success: false, 
          message: 'Invalid or expired reset token' 
        };
      }

      // Check if token is expired (1 hour)
      const tokenAge = Date.now() - new Date(user.verification_sent_at).getTime();
      if (tokenAge > 60 * 60 * 1000) {
        return { 
          success: false, 
          message: 'Reset token has expired. Please request a new one.' 
        };
      }

      // Update password
      await userCreationService.updatePassword(user.id, newPassword);

      // Clear reset token
      await supabase
        .from('users')
        .update({
          verification_token: null,
          verification_sent_at: null,
          verified_at: new Date().toISOString()
        })
        .eq('id', user.id);

      return { 
        success: true, 
        message: 'Password has been successfully reset. You can now login with your new password.' 
      };
    } catch (error: any) {
      console.error('Password reset error:', error);
      return { 
        success: false, 
        message: 'Failed to reset password. Please try again.' 
      };
    }
  },

  /**
   * Change password for authenticated user
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = this.getCurrentUser();
      if (!user) {
        return { 
          success: false, 
          message: 'You must be logged in to change your password.' 
        };
      }

      // Verify current password
      const { isValid } = await userCreationService.verifyPassword(user.email, currentPassword);
      if (!isValid) {
        return { 
          success: false, 
          message: 'Current password is incorrect' 
        };
      }

      // Update password
      await userCreationService.updatePassword(user.id, newPassword);

      return { 
        success: true, 
        message: 'Password changed successfully' 
      };
    } catch (error: any) {
      console.error('Change password error:', error);
      return { 
        success: false, 
        message: 'Failed to change password. Please try again.' 
      };
    }
  },

  /**
   * TEST MODE FUNCTIONS
   */
  
  /**
   * Start test mode (impersonation)
   */
  startTestMode(testUser: User): void {
    const currentUser = this.getRealAdminUser();
    if (!currentUser || !this.hasRequiredRole('SSA')) {
      alert('Only Super Admins can use test mode');
      return;
    }
    
    localStorage.setItem(TEST_USER_KEY, JSON.stringify(testUser));
    console.log('Test mode started for user:', testUser);
    
    // Log impersonation activity
    this.logImpersonationActivity('start', currentUser.id, testUser.id, 'Testing');
    
    // Redirect to appropriate module
    const redirectPath = getRedirectPathForUser(testUser);
    window.location.href = redirectPath;
  },

  /**
   * Exit test mode
   */
  exitTestMode(): void {
    const testUser = this.getTestModeUser();
    const adminUser = this.getRealAdminUser();
    
    if (testUser && adminUser) {
      this.logImpersonationActivity('end', adminUser.id, testUser.id);
    }
    
    localStorage.removeItem(TEST_USER_KEY);
    console.log('Test mode ended');
    
    // Redirect admin back to their dashboard
    if (adminUser) {
      window.location.href = getRedirectPathForUser(adminUser);
    } else {
      window.location.href = '/app/system-admin/dashboard';
    }
  },

  /**
   * Check if in test mode
   */
  isInTestMode(): boolean {
    return !!localStorage.getItem(TEST_USER_KEY);
  },

  /**
   * Get test mode user
   */
  getTestModeUser(): User | null {
    const testUser = localStorage.getItem(TEST_USER_KEY);
    return testUser ? JSON.parse(testUser) : null;
  },

  /**
   * Log impersonation activity
   */
  async logImpersonationActivity(
    action: 'start' | 'end',
    adminId: string,
    targetUserId: string,
    reason?: string
  ): Promise<void> {
    try {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: adminId,
          action: `impersonation_${action}`,
          resource_type: 'user',
          resource_id: targetUserId,
          details: {
            action,
            target_user_id: targetUserId,
            reason,
            timestamp: new Date().toISOString()
          }
        });
    } catch (error) {
      console.error('Failed to log impersonation activity:', error);
    }
  },

  /**
   * SESSION MONITORING
   */
  
  /**
   * Start session monitoring
   */
  startSessionMonitoring(): void {
    // Clear existing interval if any
    this.stopSessionMonitoring();
    
    sessionCheckInterval = setInterval(() => {
      // Skip monitoring for public pages
      if (isPublicPage()) {
        return;
      }
      
      const session = this.getSession();
      if (!session) {
        console.log('Session expired. Redirecting to login.');
        window.location.href = '/signin';
      } else if (this.isSessionExpiringSoon()) {
        // Optional: Show warning to user
        console.warn(`Session expiring in ${this.getSessionRemainingTime()} minutes`);
        
        // Could trigger a notification here
        // notificationService.showWarning('Your session will expire soon. Please save your work.');
      }
    }, 60000); // Check every minute
  },

  /**
   * Stop session monitoring
   */
  stopSessionMonitoring(): void {
    if (sessionCheckInterval) {
      clearInterval(sessionCheckInterval);
      sessionCheckInterval = null;
    }
  }
};

/**
 * HELPER FUNCTIONS FOR BACKWARD COMPATIBILITY
 */

export function getAuthenticatedUser(): User | null {
  return authService.getCurrentUser();
}

export function setAuthenticatedUser(user: User | null): void {
  if (!user) {
    authService.logout();
  } else {
    // Update session with new user data
    const session = authService.getSession();
    if (session) {
      session.user = user;
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    }
  }
}

export function getCurrentUser(): User | null {
  return authService.getCurrentUser();
}

export function isAuthenticated(): boolean {
  return authService.isAuthenticated();
}

export async function isAuthenticatedAsync(): Promise<boolean> {
  return authService.isAuthenticated();
}

export function logout(): Promise<void> {
  return authService.logout();
}

export function clearAuthenticatedUser(): void {
  authService.logout();
}

export function clearAuthenticatedUserSync(): void {
  authService.logout();
}

export function getAuthToken(): string | null {
  return authService.getToken();
}

export function getUserRole(): UserRole | null {
  const user = authService.getCurrentUser();
  if (!user) return null;
  return user.role || mapUserTypeToRole(user.user_type || '', user.admin_level);
}

export function hasRequiredRole(requiredRole: UserRole): boolean {
  return authService.hasRequiredRole(requiredRole);
}

export function refreshSession(): void {
  return authService.refreshSession();
}

export function getSessionRemainingTime(): number {
  return authService.getSessionRemainingTime();
}

export function isSessionExpiringSoon(): boolean {
  return authService.isSessionExpiringSoon();
}

export function extendSession(): void {
  return authService.refreshSession();
}

export function startTestMode(testUser: User): void {
  return authService.startTestMode(testUser);
}

export function exitTestMode(): void {
  return authService.exitTestMode();
}

export function isInTestMode(): boolean {
  return authService.isInTestMode();
}

export function getTestModeUser(): User | null {
  return authService.getTestModeUser();
}

export function getRealAdminUser(): User | null {
  return authService.getRealAdminUser();
}

export function markUserLogout(): void {
  localStorage.setItem('ggk_user_logout', 'true');
}

/**
 * Setup automatic session refresh
 */
export function setupSessionRefresh(): void {
  setInterval(() => {
    // Only refresh if authenticated and not expiring soon
    if (authService.isAuthenticated() && !authService.isSessionExpiringSoon() && !isPublicPage()) {
      authService.refreshSession();
    }
  }, 30 * 60 * 1000); // Every 30 minutes
}

/**
 * Initialize authentication service on app start
 */
if (typeof window !== 'undefined') {
  setupSessionRefresh();
  authService.startSessionMonitoring();
}

// Export service as default
export default authService;