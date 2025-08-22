/**
 * File: /src/contexts/PermissionContext.tsx
 * 
 * ENHANCED PERMISSION ENFORCEMENT SYSTEM
 * Central permission management with optimizations
 * 
 * Enhancements:
 * - Added caching for permission checks
 * - Better error handling
 * - Scope-based permissions support
 * - Performance optimizations with memoization
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { AdminPermissions, AdminLevel } from '@/app/entity-module/organisation/tabs/admins/types/admin.types';
import { permissionService } from '@/app/entity-module/organisation/tabs/admins/services/permissionService';
import { scopeService } from '@/app/entity-module/organisation/tabs/admins/services/scopeService';
import { supabase } from '@/lib/supabase';
import { useUser } from './UserContext';
import { toast } from '@/components/shared/Toast';

interface PermissionContextType {
  // Current user's permissions
  permissions: AdminPermissions | null;
  adminLevel: AdminLevel | null;
  isLoading: boolean;
  error: string | null;
  
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
  
  // Scope-based permissions
  hasScope: (scopeType: 'school' | 'branch', scopeId: string) => Promise<boolean>;
  getScopes: () => Promise<Array<{ type: string; id: string; name?: string }>>;
  
  // Admin level checks
  isEntityAdmin: () => boolean;
  isSubEntityAdmin: () => boolean;
  isSchoolAdmin: () => boolean;
  isBranchAdmin: () => boolean;
  
  // Refresh permissions
  refreshPermissions: () => Promise<void>;
  clearCache: () => void;
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
  cacheTimeout?: number; // Cache timeout in milliseconds (default: 5 minutes)
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ 
  children,
  cacheTimeout = 5 * 60 * 1000 // 5 minutes
}) => {
  const { user } = useUser();
  const [permissions, setPermissions] = useState<AdminPermissions | null>(null);
  const [adminLevel, setAdminLevel] = useState<AdminLevel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Cache for permission checks
  const permissionCache = useRef<Map<string, boolean>>(new Map());
  const scopeCache = useRef<Map<string, boolean>>(new Map());
  const cacheTimestamp = useRef<number>(Date.now());

  // Clear cache if timeout exceeded
  const checkCacheValidity = useCallback(() => {
    if (Date.now() - cacheTimestamp.current > cacheTimeout) {
      permissionCache.current.clear();
      scopeCache.current.clear();
      cacheTimestamp.current = Date.now();
    }
  }, [cacheTimeout]);

  // Fetch user permissions
  const fetchPermissions = useCallback(async () => {
    if (!user?.id) {
      setPermissions(null);
      setAdminLevel(null);
      setError('No user logged in');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Get user's admin record
      const { data: adminUser, error: adminError } = await supabase
        .from('entity_users')
        .select('admin_level, permissions, is_active, company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (adminError || !adminUser) {
        console.error('Failed to fetch admin permissions:', adminError);
        setPermissions(null);
        setAdminLevel(null);
        setError('User is not an active administrator');
        return;
      }

      // Get effective permissions (including scope-based permissions)
      const effectivePermissions = await permissionService.getEffectivePermissions(user.id);
      
      setPermissions(effectivePermissions);
      setAdminLevel(adminUser.admin_level);
      
      // Clear cache on permission update
      permissionCache.current.clear();
      scopeCache.current.clear();
      cacheTimestamp.current = Date.now();
      
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions(null);
      setAdminLevel(null);
      setError('Failed to load permissions');
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
            console.log('Permissions updated, refreshing...');
            fetchPermissions();
          }
        )
        .subscribe();

      // Also subscribe to scope changes
      const scopeSubscription = supabase
        .channel(`scopes_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'entity_admin_scope',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            console.log('Scopes updated, refreshing permissions...');
            fetchPermissions();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
        scopeSubscription.unsubscribe();
      };
    }
  }, [user?.id, fetchPermissions]);

  // Cached permission checking
  const hasPermission = useCallback((category: keyof AdminPermissions, permission: string): boolean => {
    if (!permissions) return false;
    
    checkCacheValidity();
    const cacheKey = `${category}.${permission}`;
    
    if (permissionCache.current.has(cacheKey)) {
      return permissionCache.current.get(cacheKey)!;
    }
    
    const result = (permissions[category] as any)?.[permission] === true;
    permissionCache.current.set(cacheKey, result);
    return result;
  }, [permissions, checkCacheValidity]);

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

  // Scope-based permissions
  const hasScope = useCallback(async (scopeType: 'school' | 'branch', scopeId: string): Promise<boolean> => {
    if (!user?.id) return false;
    
    const cacheKey = `${scopeType}.${scopeId}`;
    if (scopeCache.current.has(cacheKey)) {
      return scopeCache.current.get(cacheKey)!;
    }
    
    try {
      const result = await scopeService.hasAccessToScope(user.id, scopeType, scopeId);
      scopeCache.current.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error checking scope:', error);
      return false;
    }
  }, [user?.id]);

  const getScopes = useCallback(async (): Promise<Array<{ type: string; id: string; name?: string }>> => {
    if (!user?.id) return [];
    
    try {
      const scopes = await scopeService.getScopes(user.id);
      return scopes.map(scope => ({
        type: scope.scope_type,
        id: scope.scope_id,
        name: scope.entity_name
      }));
    } catch (error) {
      console.error('Error fetching scopes:', error);
      return [];
    }
  }, [user?.id]);

  // Admin level checks
  const isEntityAdmin = useCallback(() => adminLevel === 'entity_admin', [adminLevel]);
  const isSubEntityAdmin = useCallback(() => adminLevel === 'sub_entity_admin', [adminLevel]);
  const isSchoolAdmin = useCallback(() => adminLevel === 'school_admin', [adminLevel]);
  const isBranchAdmin = useCallback(() => adminLevel === 'branch_admin', [adminLevel]);

  const refreshPermissions = useCallback(async () => {
    await fetchPermissions();
  }, [fetchPermissions]);

  const clearCache = useCallback(() => {
    permissionCache.current.clear();
    scopeCache.current.clear();
    cacheTimestamp.current = Date.now();
  }, []);

  const contextValue = useMemo(() => ({
    permissions,
    adminLevel,
    isLoading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canCreate,
    canModify,
    canDelete,
    canView,
    canManageSettings,
    canExportData,
    hasScope,
    getScopes,
    isEntityAdmin,
    isSubEntityAdmin,
    isSchoolAdmin,
    isBranchAdmin,
    refreshPermissions,
    clearCache
  }), [
    permissions,
    adminLevel,
    isLoading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canCreate,
    canModify,
    canDelete,
    canView,
    canManageSettings,
    canExportData,
    hasScope,
    getScopes,
    isEntityAdmin,
    isSubEntityAdmin,
    isSchoolAdmin,
    isBranchAdmin,
    refreshPermissions,
    clearCache
  ]);

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  );
}