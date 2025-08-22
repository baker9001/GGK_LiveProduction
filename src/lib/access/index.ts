/**
 * File: /src/lib/access/index.ts
 * Core access control library for the entire GGK application
 * 
 * This library provides centralized access control for:
 * - Module access based on user type
 * - Tab visibility based on admin level
 * - Action permissions based on hierarchy
 * - Scope-based data filtering
 * - Self-action prevention
 */

import { supabase } from '@/lib/supabase';

// ============= TYPE DEFINITIONS =============

export type UserType = 'system' | 'entity' | 'teacher' | 'student' | 'parent';
export type AdminLevel = 'entity_admin' | 'sub_entity_admin' | 'school_admin' | 'branch_admin';

// User context for AccessControl
export interface UserContext {
  userId: string;
  userType: UserType;
  adminLevel?: AdminLevel;
  companyId?: string;
  isActive?: boolean;
}

// Scope definition with arrays for multi-assignment support
export interface UserScope {
  companyId?: string;
  schoolIds: string[];
  branchIds: string[];
}

// Complete user scope combining context and assignments
export interface CompleteUserScope extends UserContext {
  scope: UserScope;
}

// Permission context for action checks
export interface PermissionContext {
  user: CompleteUserScope;
  targetUserId?: string;
  targetAdminLevel?: AdminLevel;
  action: string;
  resource?: string;
}

// Permission matrix structure
export interface PermissionMatrix {
  users: {
    create_entity_admin: boolean;
    create_sub_admin: boolean;
    create_school_admin: boolean;
    create_branch_admin: boolean;
    create_teacher: boolean;
    create_student: boolean;
    modify_entity_admin: boolean;
    modify_sub_admin: boolean;
    modify_school_admin: boolean;
    modify_branch_admin: boolean;
    modify_teacher: boolean;
    modify_student: boolean;
    delete_users: boolean;
    view_all_users: boolean;
  };
  organization: {
    create_school: boolean;
    modify_school: boolean;
    delete_school: boolean;
    create_branch: boolean;
    modify_branch: boolean;
    delete_branch: boolean;
    view_all_schools: boolean;
    view_all_branches: boolean;
    manage_departments: boolean;
  };
  settings: {
    manage_company_settings: boolean;
    manage_school_settings: boolean;
    manage_branch_settings: boolean;
    view_audit_logs: boolean;
    export_data: boolean;
  };
}

// ============= ACCESS CONTROL CLASS =============

export class AccessControl {
  private static instance: AccessControl | null = null;
  private userContext?: UserContext;
  private userScope: UserScope = { schoolIds: [], branchIds: [] };
  private permissions?: PermissionMatrix;

  // Module access map based on userType
  private static readonly MODULE_ACCESS_MAP: Record<UserType, string[]> = {
    system: ['/system-admin', '/entity-module', '/teacher-module', '/student-module', '/parent-module'],
    entity: ['/entity-module'],
    teacher: ['/teacher-module'],
    student: ['/student-module'],
    parent: ['/parent-module'],
  };

  // Tab visibility matrix based on adminLevel
  private static readonly TAB_VISIBILITY_MATRIX: Record<AdminLevel, string[]> = {
    entity_admin: ['organization-structure', 'schools', 'branches', 'admins', 'teachers', 'students'],
    sub_entity_admin: ['organization-structure', 'schools', 'branches', 'admins', 'teachers', 'students'],
    school_admin: ['schools', 'branches', 'admins', 'teachers', 'students'], // No structure tab
    branch_admin: ['schools', 'branches', 'admins', 'teachers', 'students'], // No structure tab
  };

  // Admin level hierarchy for comparison
  private static readonly ADMIN_LEVEL_HIERARCHY: Record<AdminLevel, number> = {
    entity_admin: 4,
    sub_entity_admin: 3,
    school_admin: 2,
    branch_admin: 1
  };

  // Action permissions by admin level
  private static readonly ACTION_PERMISSIONS: Record<string, AdminLevel[]> = {
    // User creation
    'create_entity_admin': [],  // No one can create entity admins (except system)
    'create_sub_admin': ['entity_admin'],
    'create_school_admin': ['entity_admin', 'sub_entity_admin'],
    'create_branch_admin': ['entity_admin', 'sub_entity_admin', 'school_admin'],
    'create_teacher': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin'],
    'create_student': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin'],
    
    // User modification
    'modify_entity_admin': [],  // No one can modify entity admins
    'modify_sub_admin': ['entity_admin'],
    'modify_school_admin': ['entity_admin', 'sub_entity_admin'],
    'modify_branch_admin': ['entity_admin', 'sub_entity_admin', 'school_admin'],
    'modify_teacher': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin'],
    'modify_student': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin'],
    
    // User deactivation
    'deactivate_entity_admin': ['entity_admin'],  // Only other entity admins
    'deactivate_sub_admin': ['entity_admin'],
    'deactivate_school_admin': ['entity_admin', 'sub_entity_admin'],
    'deactivate_branch_admin': ['entity_admin', 'sub_entity_admin', 'school_admin'],
    'deactivate_teacher': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin'],
    'deactivate_student': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin'],
    
    // Organization management
    'create_school': ['entity_admin', 'sub_entity_admin'],
    'modify_school': ['entity_admin', 'sub_entity_admin'],
    'delete_school': ['entity_admin'],
    'create_branch': ['entity_admin', 'sub_entity_admin', 'school_admin'],
    'modify_branch': ['entity_admin', 'sub_entity_admin', 'school_admin'],
    'delete_branch': ['entity_admin', 'sub_entity_admin'],
    
    // View permissions
    'view_all_users': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin'],
    'view_audit_logs': ['entity_admin', 'sub_entity_admin', 'school_admin'],
    'export_data': ['entity_admin', 'sub_entity_admin', 'school_admin']
  };

  // Singleton pattern for consistent state
  static getInstance(): AccessControl {
    if (!AccessControl.instance) {
      AccessControl.instance = new AccessControl();
    }
    return AccessControl.instance;
  }

  // ============= CORE ACCESS METHODS =============

  /**
   * Initialize or update user context
   */
  async initializeUser(userId: string): Promise<CompleteUserScope | null> {
    try {
      // Get user basic info
      const { data: userData } = await supabase
        .from('users')
        .select('id, user_type, is_active')
        .eq('id', userId)
        .single();

      if (!userData || !userData.is_active) {
        return null;
      }

      this.userContext = {
        userId: userData.id,
        userType: userData.user_type as UserType,
        isActive: userData.is_active
      };

      // If entity user, get admin details and scope
      if (userData.user_type === 'entity') {
        const { data: entityData } = await supabase
          .from('entity_users')
          .select('admin_level, company_id, permissions')
          .eq('user_id', userId)
          .eq('is_active', true)
          .single();

        if (entityData) {
          this.userContext.adminLevel = entityData.admin_level as AdminLevel;
          this.userContext.companyId = entityData.company_id;
          this.permissions = entityData.permissions as PermissionMatrix;

          // Get scope using the RPC function
          const { data: scopeData } = await supabase
            .rpc('get_user_effective_scope', { p_user_id: userId });

          if (scopeData && scopeData.length > 0) {
            this.userScope = {
              companyId: scopeData[0].company_ids?.[0],
              schoolIds: scopeData[0].school_ids || [],
              branchIds: scopeData[0].branch_ids || []
            };
          }
        }
      }

      return {
        ...this.userContext,
        scope: this.userScope
      };
    } catch (error) {
      console.error('Error initializing user context:', error);
      return null;
    }
  }

  /**
   * Check if user can access a specific module
   */
  canAccessModule(modulePath: string, userType?: UserType): boolean {
    const type = userType || this.userContext?.userType;
    if (!type) return false;

    const allowedPaths = AccessControl.MODULE_ACCESS_MAP[type] || [];
    return allowedPaths.some(path => modulePath.includes(path));
  }

  /**
   * Check if user can view a specific tab
   */
  canViewTab(tabName: string, adminLevel?: AdminLevel): boolean {
    const level = adminLevel || this.userContext?.adminLevel;
    if (!level) return false;

    const allowedTabs = AccessControl.TAB_VISIBILITY_MATRIX[level] || [];
    return allowedTabs.includes(tabName);
  }

  /**
   * Check if user can perform a specific action
   */
  can(action: string, targetUserId?: string, targetAdminLevel?: AdminLevel): boolean {
    if (!this.userContext?.adminLevel) return false;

    // Self-deactivation check
    if (action.startsWith('deactivate') && targetUserId === this.userContext.userId) {
      return false; // Never allow self-deactivation
    }

    // Check if action is allowed for user's admin level
    const allowedLevels = AccessControl.ACTION_PERMISSIONS[action] || [];
    if (!allowedLevels.includes(this.userContext.adminLevel)) {
      return false;
    }

    // If target has admin level, check hierarchy
    if (targetAdminLevel) {
      return this.checkHierarchy(this.userContext.adminLevel, targetAdminLevel);
    }

    return true;
  }

  /**
   * Check hierarchy rules - can only manage lower levels
   */
  private checkHierarchy(actorLevel: AdminLevel, targetLevel: AdminLevel): boolean {
    const actorHierarchy = AccessControl.ADMIN_LEVEL_HIERARCHY[actorLevel];
    const targetHierarchy = AccessControl.ADMIN_LEVEL_HIERARCHY[targetLevel];
    
    // Special case: entity_admin cannot manage other entity_admins
    if (actorLevel === 'entity_admin' && targetLevel === 'entity_admin') {
      return false;
    }
    
    return actorHierarchy > targetHierarchy;
  }

  /**
   * Get scope filters for database queries
   */
  getScopeFilters(resourceType?: 'schools' | 'branches' | 'users' | 'teachers' | 'students'): Record<string, any> {
    if (!this.userContext?.adminLevel) {
      return { id: { in: [] } }; // No access
    }

    // Entity admin and sub-entity admin have full company access
    if (this.userContext.adminLevel === 'entity_admin' || 
        this.userContext.adminLevel === 'sub_entity_admin') {
      return this.userScope.companyId 
        ? { company_id: this.userScope.companyId }
        : {};
    }

    // School admin filters
    if (this.userContext.adminLevel === 'school_admin') {
      if (resourceType === 'schools' && this.userScope.schoolIds.length > 0) {
        return { id: { in: this.userScope.schoolIds } };
      }
      if (resourceType === 'branches' && this.userScope.schoolIds.length > 0) {
        return { school_id: { in: this.userScope.schoolIds } };
      }
      if ((resourceType === 'teachers' || resourceType === 'students') && this.userScope.schoolIds.length > 0) {
        return { school_id: { in: this.userScope.schoolIds } };
      }
      if (resourceType === 'users' && this.userScope.schoolIds.length > 0) {
        // For entity_users, need to join with entity_user_schools
        return { 
          _or: [
            { school_id: { in: this.userScope.schoolIds } },
            { id: { in: this.userScope.schoolIds } } // For filtering schools themselves
          ]
        };
      }
    }

    // Branch admin filters
    if (this.userContext.adminLevel === 'branch_admin') {
      if (resourceType === 'branches' && this.userScope.branchIds.length > 0) {
        return { id: { in: this.userScope.branchIds } };
      }
      if ((resourceType === 'teachers' || resourceType === 'students') && this.userScope.branchIds.length > 0) {
        return { branch_id: { in: this.userScope.branchIds } };
      }
      if (resourceType === 'users' && this.userScope.branchIds.length > 0) {
        // For entity_users, need to join with entity_user_branches
        return { 
          _or: [
            { branch_id: { in: this.userScope.branchIds } },
            { id: { in: this.userScope.branchIds } } // For filtering branches themselves
          ]
        };
      }
      // Branch admins cannot see schools table
      if (resourceType === 'schools') {
        return { id: { in: [] } }; // No access to schools
      }
    }

    // Default: no access
    return { id: { in: [] } };
  }

  /**
   * Enforce module isolation - returns redirect path if unauthorized
   */
  enforceModuleIsolation(currentPath: string): string | null {
    if (!this.userContext) {
      return '/signin';
    }

    const isAllowed = this.canAccessModule(currentPath);
    
    if (!isAllowed) {
      // Redirect to user's default module
      const defaultRedirectMap: Record<UserType, string> = {
        system: '/system-admin',
        entity: '/entity-module',
        teacher: '/teacher-module',
        student: '/student-module',
        parent: '/parent-module'
      };
      return defaultRedirectMap[this.userContext.userType] || '/signin';
    }
    
    return null; // User is authorized
  }

  /**
   * Get full permission matrix for current user
   */
  getPermissions(): PermissionMatrix | null {
    if (!this.userContext?.adminLevel) {
      return null;
    }

    // Return stored permissions or generate based on admin level
    return this.permissions || this.generatePermissions(this.userContext.adminLevel);
  }

  /**
   * Generate permissions based on admin level
   */
  private generatePermissions(adminLevel: AdminLevel): PermissionMatrix {
    switch (adminLevel) {
      case 'entity_admin':
      case 'sub_entity_admin':
        return {
          users: {
            create_entity_admin: adminLevel === 'entity_admin',
            create_sub_admin: true,
            create_school_admin: true,
            create_branch_admin: true,
            create_teacher: true,
            create_student: true,
            modify_entity_admin: false,
            modify_sub_admin: true,
            modify_school_admin: true,
            modify_branch_admin: true,
            modify_teacher: true,
            modify_student: true,
            delete_users: true,
            view_all_users: true
          },
          organization: {
            create_school: true,
            modify_school: true,
            delete_school: adminLevel === 'entity_admin',
            create_branch: true,
            modify_branch: true,
            delete_branch: true,
            view_all_schools: true,
            view_all_branches: true,
            manage_departments: true
          },
          settings: {
            manage_company_settings: true,
            manage_school_settings: true,
            manage_branch_settings: true,
            view_audit_logs: true,
            export_data: true
          }
        };

      case 'school_admin':
        return {
          users: {
            create_entity_admin: false,
            create_sub_admin: false,
            create_school_admin: false,
            create_branch_admin: true,
            create_teacher: true,
            create_student: true,
            modify_entity_admin: false,
            modify_sub_admin: false,
            modify_school_admin: false,
            modify_branch_admin: true,
            modify_teacher: true,
            modify_student: true,
            delete_users: false,
            view_all_users: true
          },
          organization: {
            create_school: false,
            modify_school: false,
            delete_school: false,
            create_branch: true,
            modify_branch: true,
            delete_branch: false,
            view_all_schools: false,
            view_all_branches: true,
            manage_departments: true
          },
          settings: {
            manage_company_settings: false,
            manage_school_settings: true,
            manage_branch_settings: true,
            view_audit_logs: true,
            export_data: true
          }
        };

      case 'branch_admin':
        return {
          users: {
            create_entity_admin: false,
            create_sub_admin: false,
            create_school_admin: false,
            create_branch_admin: false,
            create_teacher: true,
            create_student: true,
            modify_entity_admin: false,
            modify_sub_admin: false,
            modify_school_admin: false,
            modify_branch_admin: false,
            modify_teacher: true,
            modify_student: true,
            delete_users: false,
            view_all_users: false
          },
          organization: {
            create_school: false,
            modify_school: false,
            delete_school: false,
            create_branch: false,
            modify_branch: false,
            delete_branch: false,
            view_all_schools: false,
            view_all_branches: false,
            manage_departments: false
          },
          settings: {
            manage_company_settings: false,
            manage_school_settings: false,
            manage_branch_settings: true,
            view_audit_logs: false,
            export_data: false
          }
        };

      default:
        return this.getMinimalPermissions();
    }
  }

  /**
   * Get minimal permissions (no access)
   */
  private getMinimalPermissions(): PermissionMatrix {
    return {
      users: {
        create_entity_admin: false,
        create_sub_admin: false,
        create_school_admin: false,
        create_branch_admin: false,
        create_teacher: false,
        create_student: false,
        modify_entity_admin: false,
        modify_sub_admin: false,
        modify_school_admin: false,
        modify_branch_admin: false,
        modify_teacher: false,
        modify_student: false,
        delete_users: false,
        view_all_users: false
      },
      organization: {
        create_school: false,
        modify_school: false,
        delete_school: false,
        create_branch: false,
        modify_branch: false,
        delete_branch: false,
        view_all_schools: false,
        view_all_branches: false,
        manage_departments: false
      },
      settings: {
        manage_company_settings: false,
        manage_school_settings: false,
        manage_branch_settings: false,
        view_audit_logs: false,
        export_data: false
      }
    };
  }

  // ============= UTILITY METHODS =============

  /**
   * Clear cached user context (for logout)
   */
  clearContext(): void {
    this.userContext = undefined;
    this.userScope = { schoolIds: [], branchIds: [] };
    this.permissions = undefined;
  }

  /**
   * Get current user context
   */
  getUserContext(): CompleteUserScope | null {
    if (!this.userContext) return null;
    
    return {
      ...this.userContext,
      scope: this.userScope
    };
  }

  /**
   * Check if user is authenticated and active
   */
  isAuthenticated(): boolean {
    return !!(this.userContext?.userId && this.userContext?.isActive);
  }

  /**
   * Get user's admin level
   */
  getAdminLevel(): AdminLevel | undefined {
    return this.userContext?.adminLevel;
  }

  /**
   * Get user type
   */
  getUserType(): UserType | undefined {
    return this.userContext?.userType;
  }
}

// ============= EXPORT SINGLETON INSTANCE =============

const accessControl = AccessControl.getInstance();

// Export convenience functions
export const initializeUser = (userId: string) => accessControl.initializeUser(userId);
export const canAccessModule = (path: string, userType?: UserType) => accessControl.canAccessModule(path, userType);
export const canViewTab = (tab: string, adminLevel?: AdminLevel) => accessControl.canViewTab(tab, adminLevel);
export const can = (action: string, targetUserId?: string, targetAdminLevel?: AdminLevel) => accessControl.can(action, targetUserId, targetAdminLevel);
export const getScopeFilters = (resourceType?: 'schools' | 'branches' | 'users' | 'teachers' | 'students') => accessControl.getScopeFilters(resourceType);
export const enforceModuleIsolation = (path: string) => accessControl.enforceModuleIsolation(path);
export const getPermissions = () => accessControl.getPermissions();
export const getUserContext = () => accessControl.getUserContext();
export const clearContext = () => accessControl.clearContext();
export const isAuthenticated = () => accessControl.isAuthenticated();
export const getAdminLevel = () => accessControl.getAdminLevel();
export const getUserType = () => accessControl.getUserType();

// Export the class for type checking and testing
export default accessControl;