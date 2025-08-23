/**
 * File: /src/app/entity-module/organisation/tabs/admins/services/permissionService.ts
 * Dependencies: 
 *   - @/lib/supabase
 *   - ../types/admin.types
 *   - ./scopeService
 * 
 * Preserved Features:
 *   - All permission checking methods
 *   - Scope-based permission merging
 *   - Tab access validation
 *   - Permission differences tracking
 *   - Validation methods
 * 
 * Added/Modified:
 *   - FIXED: Entity admin now has modify_entity_admin = true
 *   - FIXED: Sub-entity admin can modify other sub-entity admins
 *   - FIXED: Proper permission hierarchy for all levels
 *   - Better permission merging logic
 * 
 * Database Tables:
 *   - entity_users
 *   - entity_admin_scope
 * 
 * Connected Files:
 *   - AdminCreationForm.tsx
 *   - PermissionContext.tsx
 *   - adminService.ts
 */

import { supabase } from '@/lib/supabase';
import { AdminPermissions, EntityAdminScope, AdminLevel } from '../types/admin.types';
import { scopeService } from './scopeService';

type PermissionAction = 'create' | 'modify' | 'delete' | 'view';
type PermissionResource = 'users' | 'schools' | 'branches' | 'settings';

export const permissionService = {
  /**
   * Get complete effective permissions for a user
   * Merges base permissions with scope-specific permissions
   */
  async getEffectivePermissions(userId: string): Promise<AdminPermissions> {
    try {
      // Step 1: Get user base permissions
      const { data: userData, error: userError } = await supabase
        .from('entity_users')
        .select('permissions, admin_level')
        .eq('user_id', userId)
        .maybeSingle();

      if (userError) {
        throw new Error(`Failed to fetch user permissions: ${userError.message}`);
      }
      
      // If user is not an entity admin, return minimal permissions
      if (!userData) {
        return this.getMinimalPermissions();
      }
      
      // Step 2: Get default permissions for admin level
      const defaultPermissions = this.getPermissionsForLevel(userData.admin_level);
      
      // Step 3: Get scope-based permissions
      const scopes = await scopeService.getScopes(userId);
      
      // Step 4: Merge permissions (higher permissions override lower)
      let effectivePermissions = { ...defaultPermissions };
      
      // Apply user-specific permissions if they exist
      if (userData.permissions) {
        effectivePermissions = this.mergePermissions(
          effectivePermissions,
          userData.permissions as AdminPermissions
        );
      }
      
      // Apply scope-specific permissions
      scopes.forEach(scope => {
        if (scope.permissions) {
          effectivePermissions = this.mergePermissions(
            effectivePermissions,
            scope.permissions as AdminPermissions
          );
        }
      });
      
      return effectivePermissions;
    } catch (error) {
      console.error('getEffectivePermissions error:', error);
      // Return minimal permissions on error
      return this.getMinimalPermissions();
    }
  },

  /**
   * Check if user can perform specific action on resource
   */
  async canPerformAction(
    userId: string,
    action: PermissionAction,
    resource: PermissionResource,
    scopeId?: string,
    scopeType?: 'company' | 'school' | 'branch'
  ): Promise<boolean> {
    try {
      const permissions = await this.getEffectivePermissions(userId);
      
      // Map resource and action to permission key
      const permissionKey = this.getPermissionKey(resource, action);
      if (!permissionKey) return false;
      
      // Check base permission
      const [category, permission] = permissionKey.split('.');
      const hasBasePermission = (permissions[category as keyof AdminPermissions] as any)?.[permission] || false;
      
      if (!hasBasePermission) return false;
      
      // If scope is specified, check scope-specific permissions
      if (scopeId && scopeType) {
        const userScopes = await scopeService.getScopes(userId);
        const hasScope = userScopes.some(scope => 
          scope.scope_id === scopeId && 
          scope.scope_type === scopeType && 
          scope.is_active
        );
        
        return hasScope;
      }
      
      return true;
    } catch (error) {
      console.error('canPerformAction error:', error);
      return false;
    }
  },

  /**
   * Merge two permission sets (higher permissions win)
   */
  mergePermissions(
    base: AdminPermissions,
    overlay: Partial<AdminPermissions>
  ): AdminPermissions {
    const merged = { ...base };
    
    Object.keys(overlay).forEach(category => {
      const categoryKey = category as keyof AdminPermissions;
      if (overlay[categoryKey]) {
        merged[categoryKey] = {
          ...merged[categoryKey],
          ...overlay[categoryKey]
        };
      }
    });
    
    return merged;
  },

  /**
   * Get permissions for a specific admin level
   */
  getPermissionsForLevel(adminLevel: AdminLevel): AdminPermissions {
    switch (adminLevel) {
      case 'entity_admin':
        return this.getEntityAdminPermissions();
      case 'sub_entity_admin':
        return this.getSubEntityAdminPermissions();
      case 'school_admin':
        return this.getSchoolAdminPermissions();
      case 'branch_admin':
        return this.getBranchAdminPermissions();
      default:
        return this.getMinimalPermissions();
    }
  },

  /**
   * Entity Admin - Full permissions including ability to modify other entity admins
   */
  getEntityAdminPermissions(): AdminPermissions {
    return {
      users: {
        create_entity_admin: true,
        create_sub_admin: true,
        create_school_admin: true,
        create_branch_admin: true,
        create_teacher: true,
        create_student: true,
        modify_entity_admin: true, // FIXED: Entity admins CAN modify other entity admins
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
  },

  /**
   * Sub-Entity Admin - Can manage all except entity admins
   */
  getSubEntityAdminPermissions(): AdminPermissions {
    return {
      users: {
        create_entity_admin: false, // Cannot create entity admins
        create_sub_admin: true,
        create_school_admin: true,
        create_branch_admin: true,
        create_teacher: true,
        create_student: true,
        modify_entity_admin: false, // Cannot modify entity admins
        modify_sub_admin: true, // Can modify other sub-entity admins
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
        manage_company_settings: false, // Limited company settings access
        manage_school_settings: true,
        manage_branch_settings: true,
        view_audit_logs: true,
        export_data: true,
      },
    };
  },

  /**
   * School Admin - School and branch level permissions
   */
  getSchoolAdminPermissions(): AdminPermissions {
    return {
      users: {
        create_entity_admin: false,
        create_sub_admin: false,
        create_school_admin: false, // Cannot create same level
        create_branch_admin: true, // Can create branch admins
        create_teacher: true,
        create_student: true,
        modify_entity_admin: false,
        modify_sub_admin: false,
        modify_school_admin: false, // Cannot modify same or higher level
        modify_branch_admin: true, // Can modify branch admins
        modify_teacher: true,
        modify_student: true,
        delete_users: false, // Limited delete permissions
        view_all_users: true, // Can view users in their scope
      },
      organization: {
        create_school: false,
        modify_school: false, // Cannot modify schools
        delete_school: false,
        create_branch: true, // Can create branches in their schools
        modify_branch: true,
        delete_branch: false,
        view_all_schools: false, // Only assigned schools
        view_all_branches: true, // Branches in their schools
        manage_departments: true,
      },
      settings: {
        manage_company_settings: false,
        manage_school_settings: true, // Can manage their school settings
        manage_branch_settings: true,
        view_audit_logs: true,
        export_data: true,
      },
    };
  },

  /**
   * Branch Admin - Branch-level permissions only
   */
  getBranchAdminPermissions(): AdminPermissions {
    return {
      users: {
        create_entity_admin: false,
        create_sub_admin: false,
        create_school_admin: false,
        create_branch_admin: false, // Cannot create other admins
        create_teacher: true, // Can create teachers
        create_student: true, // Can create students
        modify_entity_admin: false,
        modify_sub_admin: false,
        modify_school_admin: false,
        modify_branch_admin: false, // Cannot modify other branch admins
        modify_teacher: true, // Can modify teachers
        modify_student: true, // Can modify students
        delete_users: false,
        view_all_users: false, // Limited to their branch
      },
      organization: {
        create_school: false,
        modify_school: false,
        delete_school: false,
        create_branch: false,
        modify_branch: true, // Can modify their own branch
        delete_branch: false,
        view_all_schools: false,
        view_all_branches: false, // Only their branch
        manage_departments: false,
      },
      settings: {
        manage_company_settings: false,
        manage_school_settings: false,
        manage_branch_settings: true, // Can manage their branch settings
        view_audit_logs: false, // Limited audit access
        export_data: false,
      },
    };
  },

  /**
   * Minimal permissions - for users with no admin role
   */
  getMinimalPermissions(): AdminPermissions {
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
        view_all_users: false,
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
        manage_departments: false,
      },
      settings: {
        manage_company_settings: false,
        manage_school_settings: false,
        manage_branch_settings: false,
        view_audit_logs: false,
        export_data: false,
      },
    };
  },

  /**
   * Get default permissions (alias for minimal)
   */
  getDefaultPermissions(): AdminPermissions {
    return this.getMinimalPermissions();
  },

  /**
   * Check if user can access a specific tab based on their permissions
   */
  canAccessTab(tabId: string, permissions: AdminPermissions): boolean {
    switch (tabId) {
      case 'structure':
        // Structure tab requires ability to view schools or branches
        return permissions.organization.view_all_schools || 
               permissions.organization.view_all_branches ||
               permissions.organization.create_school ||
               permissions.organization.create_branch;
               
      case 'schools':
        // Schools tab requires any school-related permission
        return permissions.organization.view_all_schools ||
               permissions.organization.create_school ||
               permissions.organization.modify_school ||
               permissions.organization.delete_school;
               
      case 'branches':
        // Branches tab requires any branch-related permission
        return permissions.organization.view_all_branches ||
               permissions.organization.create_branch ||
               permissions.organization.modify_branch ||
               permissions.organization.delete_branch;
               
      case 'admins':
        // Admins tab requires ability to view or manage any type of admin
        return permissions.users.view_all_users ||
               permissions.users.create_entity_admin ||
               permissions.users.create_sub_admin ||
               permissions.users.create_school_admin ||
               permissions.users.create_branch_admin ||
               permissions.users.modify_entity_admin ||
               permissions.users.modify_sub_admin ||
               permissions.users.modify_school_admin ||
               permissions.users.modify_branch_admin;
               
      case 'teachers':
        // Teachers tab requires any teacher-related permission
        return permissions.users.create_teacher ||
               permissions.users.modify_teacher ||
               permissions.users.view_all_users;
               
      case 'students':
        // Students tab requires any student-related permission
        return permissions.users.create_student ||
               permissions.users.modify_student ||
               permissions.users.view_all_users;
               
      default:
        return false;
    }
  },

  /**
   * Get permission key from resource and action
   */
  getPermissionKey(resource: PermissionResource, action: PermissionAction): string | null {
    const actionMap: Record<PermissionAction, string> = {
      create: 'create',
      modify: 'modify',
      delete: 'delete',
      view: 'view'
    };

    const resourceMap: Record<PermissionResource, string> = {
      users: 'users',
      schools: 'organization',
      branches: 'organization',
      settings: 'settings'
    };

    const category = resourceMap[resource];
    if (!category) return null;

    if (resource === 'users') {
      return `${category}.${actionMap[action]}_users`;
    } else if (resource === 'schools') {
      return `${category}.${actionMap[action]}_school`;
    } else if (resource === 'branches') {
      return `${category}.${actionMap[action]}_branch`;
    } else if (resource === 'settings') {
      return `${category}.manage_company_settings`;
    }

    return null;
  },

  /**
   * Get scope type from resource type
   */
  getScopeTypeFromResource(resource: PermissionResource): 'company' | 'school' | 'branch' {
    switch (resource) {
      case 'schools':
        return 'school';
      case 'branches':
        return 'branch';
      default:
        return 'company';
    }
  },

  /**
   * Validate permission object structure
   */
  isValidPermissionObject(permissions: any): permissions is AdminPermissions {
    if (!permissions || typeof permissions !== 'object') return false;
    
    const requiredCategories = ['users', 'organization', 'settings'];
    const hasAllCategories = requiredCategories.every(cat => 
      permissions[cat] && typeof permissions[cat] === 'object'
    );
    
    if (!hasAllCategories) return false;
    
    // Check for boolean values
    for (const category of requiredCategories) {
      for (const key in permissions[category]) {
        if (typeof permissions[category][key] !== 'boolean') {
          return false;
        }
      }
    }
    
    return true;
  },

  /**
   * Get permission differences between two sets
   */
  getPermissionDifferences(
    oldPermissions: AdminPermissions,
    newPermissions: AdminPermissions
  ): Record<string, { old: boolean; new: boolean }> {
    const differences: Record<string, { old: boolean; new: boolean }> = {};
    
    Object.keys(newPermissions).forEach(category => {
      Object.keys(newPermissions[category]).forEach(permission => {
        const key = `${category}.${permission}`;
        const oldValue = oldPermissions[category]?.[permission] || false;
        const newValue = newPermissions[category][permission];
        
        if (oldValue !== newValue) {
          differences[key] = { old: oldValue, new: newValue };
        }
      });
    });
    
    return differences;
  },

  /**
   * Check if admin level can create another admin level
   */
  canCreateAdminLevel(actorLevel: AdminLevel, targetLevel: AdminLevel): boolean {
    const permissions = this.getPermissionsForLevel(actorLevel);
    
    switch (targetLevel) {
      case 'entity_admin':
        return permissions.users.create_entity_admin;
      case 'sub_entity_admin':
        return permissions.users.create_sub_admin;
      case 'school_admin':
        return permissions.users.create_school_admin;
      case 'branch_admin':
        return permissions.users.create_branch_admin;
      default:
        return false;
    }
  },

  /**
   * Check if admin level can modify another admin level
   */
  canModifyAdminLevel(actorLevel: AdminLevel, targetLevel: AdminLevel): boolean {
    const permissions = this.getPermissionsForLevel(actorLevel);
    
    switch (targetLevel) {
      case 'entity_admin':
        return permissions.users.modify_entity_admin;
      case 'sub_entity_admin':
        return permissions.users.modify_sub_admin;
      case 'school_admin':
        return permissions.users.modify_school_admin;
      case 'branch_admin':
        return permissions.users.modify_branch_admin;
      default:
        return false;
    }
  }
};