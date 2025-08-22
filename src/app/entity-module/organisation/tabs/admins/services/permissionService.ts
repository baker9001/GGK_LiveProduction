/**
 * File: /src/app/entity-module/organisation/tabs/admins/services/permissionService.ts
 * 
 * ENHANCED VERSION - Complete Implementation
 * Full permission management with proper hierarchy and validation
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
        .single();

      if (userError) {
        throw new Error(`Failed to fetch user permissions: ${userError.message}`);
      }
      
      // Step 2: Get default permissions for admin level
      const defaultPermissions = this.getPermissionsForLevel(userData.admin_level);
      
      // Step 3: Get scope-based permissions
      const scopes = await scopeService.getScopes(userId);
      
      // Step 4: Merge permissions (higher permissions override lower)
      let effectivePermissions = { ...defaultPermissions };
      
      // Apply user-specific permissions
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
    scopeId?: string
  ): Promise<boolean> {
    try {
      const permissions = await this.getEffectivePermissions(userId);
      
      // Map action and resource to permission key
      const permissionKey = this.getPermissionKey(action, resource);
      if (!permissionKey) return false;
      
      // Check if user has the permission
      const [category, permission] = permissionKey.split('.');
      const hasPermission = permissions[category]?.[permission] || false;
      
      // If scope is specified, check scope-specific access
      if (scopeId && hasPermission) {
        const hasScope = await scopeService.hasAccessToScope(
          userId,
          this.getScopeTypeFromResource(resource),
          scopeId
        );
        return hasScope;
      }
      
      return hasPermission;
    } catch (error) {
      console.error('canPerformAction error:', error);
      return false;
    }
  },

  /**
   * Apply permission template to user
   */
  async applyPermissionTemplate(userId: string, template: AdminPermissions): Promise<void> {
    try {
      const { error } = await supabase
        .from('entity_users')
        .update({ 
          permissions: template,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        throw new Error(`Failed to apply permission template: ${error.message}`);
      }
    } catch (error) {
      console.error('applyPermissionTemplate error:', error);
      throw error;
    }
  },

  /**
   * Get permissions for specific admin level
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
   * Entity Admin - Full permissions
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
  },

  /**
   * Sub-Entity Admin - Almost full permissions except entity admin management
   */
  getSubEntityAdminPermissions(): AdminPermissions {
    return {
      users: {
        create_entity_admin: false,
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
        manage_company_settings: false,
        manage_school_settings: true,
        manage_branch_settings: true,
        view_audit_logs: true,
        export_data: true,
      },
    };
  },

  /**
   * School Admin - School-level permissions
   */
  getSchoolAdminPermissions(): AdminPermissions {
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
        view_all_users: true,
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
        manage_departments: true,
      },
      settings: {
        manage_company_settings: false,
        manage_school_settings: true,
        manage_branch_settings: true,
        view_audit_logs: true,
        export_data: true,
      },
    };
  },

  /**
   * Branch Admin - Branch-level permissions
   */
  getBranchAdminPermissions(): AdminPermissions {
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
        view_all_users: true,
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
        manage_departments: true,
      },
      settings: {
        manage_company_settings: false,
        manage_school_settings: false,
        manage_branch_settings: true,
        view_audit_logs: false,
        export_data: true,
      },
    };
  },

  /**
   * Minimal permissions - view only
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
   * Merge two permission sets (true values override false)
   */
  mergePermissions(base: AdminPermissions, override: AdminPermissions): AdminPermissions {
    const merged = JSON.parse(JSON.stringify(base)); // Deep clone
    
    Object.keys(override).forEach(category => {
      if (!merged[category]) merged[category] = {};
      Object.keys(override[category]).forEach(permission => {
        // True values always override
        if (override[category][permission] === true) {
          merged[category][permission] = true;
        } else if (merged[category][permission] === undefined) {
          merged[category][permission] = override[category][permission];
        }
      });
    });
    
    return merged;
  },

  /**
   * Map action and resource to permission key
   */
  getPermissionKey(action: PermissionAction, resource: PermissionResource): string | null {
    const mapping = {
      users: {
        create: 'users.create_teacher', // Default to teacher level
        modify: 'users.modify_teacher',
        delete: 'users.delete_users',
        view: 'users.view_all_users'
      },
      schools: {
        create: 'organization.create_school',
        modify: 'organization.modify_school',
        delete: 'organization.delete_school',
        view: 'organization.view_all_schools'
      },
      branches: {
        create: 'organization.create_branch',
        modify: 'organization.modify_branch',
        delete: 'organization.delete_branch',
        view: 'organization.view_all_branches'
      },
      settings: {
        create: 'settings.manage_company_settings',
        modify: 'settings.manage_company_settings',
        delete: 'settings.manage_company_settings',
        view: 'settings.view_audit_logs'
      }
    };
    
    return mapping[resource]?.[action] || null;
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
  }
};