/**
 * File: /src/contexts/PermissionContext.tsx
 * 
 * PERMISSION ENFORCEMENT SYSTEM
 * Central permission management and checking
 * 
 * This context provides:
 * - Current user's permissions
 * - Permission checking functions
 * - UI element visibility control
 * - Action authorization
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { AdminPermissions, AdminLevel } from '@/app/entity-module/organisation/tabs/admins/types/admin.types';
import { permissionService } from '@/app/entity-module/organisation/tabs/admins/services/permissionService';
import { supabase } from '@/lib/supabase';
import { useUser } from './UserContext';
import { toast } from '@/components/shared/Toast';

interface PermissionContextType {
  // Current user's permissions
  permissions: AdminPermissions | null;
  adminLevel: AdminLevel | null;
  isLoading: boolean;
  
  // Permission checking functions
  hasPermission: (category: keyof AdminPermissions, permission: string) => boolean;
  hasAnyPermission: (checks: Array<{ category: keyof AdminPermissions; permission: string }>) => boolean;
  hasAllPermissions: (checks: Array<{ category: keyof AdminPermissions; permission: string }>) => boolean;
  canCreate: (resource: 'school' | 'branch' | 'teacher' | 'student' | 'admin') => boolean;
  canModify: (resource: 'school' | 'branch' | 'teacher' | 'student' | 'admin') => boolean;
  canDelete: (resource: 'school' | 'branch' | 'teacher' | 'student' | 'admin') => boolean;
  canView: (resource: 'schools' | 'branches' | 'users' | 'settings' | 'audit_logs') => boolean;
  canManageSettings: (level: 'company' | 'school' | 'branch') => boolean;
  canExportData: () => boolean;
  
  // Refresh permissions
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};

interface PermissionProviderProps {
  children: React.ReactNode;
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children }) => {
  const { user } = useUser();
  const [permissions, setPermissions] = useState<AdminPermissions | null>(null);
  const [adminLevel, setAdminLevel] = useState<AdminLevel | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user permissions
  const fetchPermissions = useCallback(async () => {
    if (!user?.id) {
      setPermissions(null);
      setAdminLevel(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Get user's admin record
      const { data: adminUser, error } = await supabase
        .from('entity_users')
        .select('admin_level, permissions, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error || !adminUser) {
        console.error('Failed to fetch admin permissions:', error);
        setPermissions(null);
        setAdminLevel(null);
        return;
      }

      // Get effective permissions (including scope-based permissions)
      const effectivePermissions = await permissionService.getEffectivePermissions(user.id);
      
      setPermissions(effectivePermissions);
      setAdminLevel(adminUser.admin_level);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions(null);
      setAdminLevel(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Initial fetch and subscription to changes
  useEffect(() => {
    fetchPermissions();

    // Subscribe to permission changes
    if (user?.id) {
      const subscription = supabase
        .channel(`permissions_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'entity_users',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            fetchPermissions();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user?.id, fetchPermissions]);

  // Permission checking functions
  const hasPermission = useCallback((category: keyof AdminPermissions, permission: string): boolean => {
    if (!permissions) return false;
    return (permissions[category] as any)?.[permission] === true;
  }, [permissions]);

  const hasAnyPermission = useCallback((checks: Array<{ category: keyof AdminPermissions; permission: string }>): boolean => {
    if (!permissions) return false;
    return checks.some(check => hasPermission(check.category, check.permission));
  }, [permissions, hasPermission]);

  const hasAllPermissions = useCallback((checks: Array<{ category: keyof AdminPermissions; permission: string }>): boolean => {
    if (!permissions) return false;
    return checks.every(check => hasPermission(check.category, check.permission));
  }, [permissions, hasPermission]);

  const canCreate = useCallback((resource: 'school' | 'branch' | 'teacher' | 'student' | 'admin'): boolean => {
    if (!permissions) return false;
    
    switch (resource) {
      case 'school':
        return permissions.organization.create_school;
      case 'branch':
        return permissions.organization.create_branch;
      case 'teacher':
        return permissions.users.create_teacher;
      case 'student':
        return permissions.users.create_student;
      case 'admin':
        return hasAnyPermission([
          { category: 'users', permission: 'create_entity_admin' },
          { category: 'users', permission: 'create_sub_admin' },
          { category: 'users', permission: 'create_school_admin' },
          { category: 'users', permission: 'create_branch_admin' }
        ]);
      default:
        return false;
    }
  }, [permissions, hasAnyPermission]);

  const canModify = useCallback((resource: 'school' | 'branch' | 'teacher' | 'student' | 'admin'): boolean => {
    if (!permissions) return false;
    
    switch (resource) {
      case 'school':
        return permissions.organization.modify_school;
      case 'branch':
        return permissions.organization.modify_branch;
      case 'teacher':
        return permissions.users.modify_teacher;
      case 'student':
        return permissions.users.modify_student;
      case 'admin':
        return hasAnyPermission([
          { category: 'users', permission: 'modify_entity_admin' },
          { category: 'users', permission: 'modify_sub_admin' },
          { category: 'users', permission: 'modify_school_admin' },
          { category: 'users', permission: 'modify_branch_admin' }
        ]);
      default:
        return false;
    }
  }, [permissions, hasAnyPermission]);

  const canDelete = useCallback((resource: 'school' | 'branch' | 'teacher' | 'student' | 'admin'): boolean => {
    if (!permissions) return false;
    
    switch (resource) {
      case 'school':
        return permissions.organization.delete_school;
      case 'branch':
        return permissions.organization.delete_branch;
      case 'teacher':
      case 'student':
      case 'admin':
        return permissions.users.delete_users;
      default:
        return false;
    }
  }, [permissions]);

  const canView = useCallback((resource: 'schools' | 'branches' | 'users' | 'settings' | 'audit_logs'): boolean => {
    if (!permissions) return false;
    
    switch (resource) {
      case 'schools':
        return permissions.organization.view_all_schools;
      case 'branches':
        return permissions.organization.view_all_branches;
      case 'users':
        return permissions.users.view_all_users;
      case 'settings':
        return hasAnyPermission([
          { category: 'settings', permission: 'manage_company_settings' },
          { category: 'settings', permission: 'manage_school_settings' },
          { category: 'settings', permission: 'manage_branch_settings' }
        ]);
      case 'audit_logs':
        return permissions.settings.view_audit_logs;
      default:
        return false;
    }
  }, [permissions, hasAnyPermission]);

  const canManageSettings = useCallback((level: 'company' | 'school' | 'branch'): boolean => {
    if (!permissions) return false;
    
    switch (level) {
      case 'company':
        return permissions.settings.manage_company_settings;
      case 'school':
        return permissions.settings.manage_school_settings;
      case 'branch':
        return permissions.settings.manage_branch_settings;
      default:
        return false;
    }
  }, [permissions]);

  const canExportData = useCallback((): boolean => {
    if (!permissions) return false;
    return permissions.settings.export_data;
  }, [permissions]);

  const refreshPermissions = useCallback(async () => {
    await fetchPermissions();
  }, [fetchPermissions]);

  const contextValue = useMemo(() => ({
    permissions,
    adminLevel,
    isLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canCreate,
    canModify,
    canDelete,
    canView,
    canManageSettings,
    canExportData,
    refreshPermissions
  }), [
    permissions,
    adminLevel,
    isLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canCreate,
    canModify,
    canDelete,
    canView,
    canManageSettings,
    canExportData,
    refreshPermissions
  ]);

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  );
};