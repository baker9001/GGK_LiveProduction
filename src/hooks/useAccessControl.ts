/**
 * File: /src/hooks/useAccessControl.ts
 * Dependencies:
 *   - @/contexts/UserContext
 *   - @/contexts/PermissionContext  
 *   - @/lib/supabase
 *   - @/app/entity-module/organisation/tabs/admins/types/admin.types
 *   - @/app/entity-module/organisation/tabs/admins/services/permissionService
 *   - External: react
 * 
 * Preserved Features:
 *   - All original hook functions
 *   - User context integration
 *   - Loading states
 *   - Admin level checks
 *   - Error handling
 *   - Scope refresh capability
 * 
 * Added/Modified:
 *   - Aligned with existing PermissionContext
 *   - Uses actual services from the codebase
 *   - Proper type definitions matching the system
 *   - Scope filtering implementation
 *   - Error state management
 *   - Cache clearing functionality
 * 
 * Database Tables:
 *   - users
 *   - entity_users
 *   - entity_user_schools
 *   - entity_user_branches
 *   - user_scope_cache (materialized view)
 * 
 * Connected Files:
 *   - PermissionContext.tsx (provides permissions)
 *   - UserContext.tsx (provides user)
 *   - permissionService.ts (permission logic)
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useUser } from '@/contexts/UserContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { supabase } from '@/lib/supabase';
import { AdminLevel } from '@/app/entity-module/organisation/tabs/admins/types/admin.types';
import { permissionService } from '@/app/entity-module/organisation/tabs/admins/services/permissionService';

// Type definitions matching the agreed plan
export type UserType = 'system' | 'entity' | 'teacher' | 'student' | 'parent';

export interface CompleteUserScope {
  userId: string;
  userType: UserType;
  adminLevel?: AdminLevel;
  companyId?: string;
  schoolIds: string[];
  branchIds: string[];
  email: string;
  name: string;
  isActive: boolean;
}

interface UseAccessControlResult {
  // Core access control methods
  canAccessModule: (modulePath: string, userType?: UserType) => boolean;
  canViewTab: (tabName: string, adminLevel?: AdminLevel) => boolean;
  can: (action: string, targetUserId?: string, targetAdminLevel?: AdminLevel) => boolean;
  getScopeFilters: (resourceType?: 'schools' | 'branches' | 'users' | 'teachers' | 'students') => Record<string, any>;
  getUserContext: () => CompleteUserScope | null;
  
  // State flags
  isLoading: boolean;
  isAuthenticated: boolean;
  hasError: boolean;
  error: string | null;
  
  // Convenience flags for admin levels
  isEntityAdmin: boolean;
  isSubEntityAdmin: boolean;
  isSchoolAdmin: boolean;
  isBranchAdmin: boolean;
  
  // Utility methods
  refreshScope: () => Promise<void>;
  clearCache: () => void;
}

/**
 * Custom hook for comprehensive access control
 * Integrates with existing permission system
 */
export function useAccessControl(): UseAccessControlResult {
  const { user, isLoading: isUserLoading } = useUser();
  const { 
    permissions, 
    adminLevel, 
    isLoading: isPermissionsLoading,
    hasPermission,
    isEntityAdmin: checkIsEntityAdmin,
    isSubEntityAdmin: checkIsSubEntityAdmin,
    isSchoolAdmin: checkIsSchoolAdmin,
    isBranchAdmin: checkIsBranchAdmin,
    refreshPermissions,
    clearCache: clearPermissionCache
  } = usePermissions();
  
  const [userScope, setUserScope] = useState<CompleteUserScope | null>(null);
  const [isScopeLoading, setIsScopeLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUserId, setLastUserId] = useState<string | null>(null);

  // Fetch user scope data
  const fetchUserScope = useCallback(async () => {
    if (!user?.id) {
      setUserScope(null);
      setIsScopeLoading(false);
      setHasError(false);
      setError(null);
      return;
    }

    // Skip if same user is already loaded
    if (user.id === lastUserId && userScope && !hasError) {
      setIsScopeLoading(false);
      return;
    }

    try {
      setIsScopeLoading(true);
      setHasError(false);
      setError(null);
      
      // Fetch user details with scope information
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          name,
          user_type,
          is_active,
          entity_users!inner (
            admin_level,
            company_id
          )
        `)
        .eq('id', user.id)
        .single();

      if (userError || !userData) {
        throw new Error(userError?.message || 'Failed to fetch user data');
      }

      // Fetch assigned schools
      const { data: schoolData, error: schoolError } = await supabase
        .from('entity_user_schools')
        .select('school_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (schoolError) {
        console.warn('Error fetching school assignments:', schoolError);
      }

      // Fetch assigned branches
      const { data: branchData, error: branchError } = await supabase
        .from('entity_user_branches')
        .select('branch_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (branchError) {
        console.warn('Error fetching branch assignments:', branchError);
      }

      const scope: CompleteUserScope = {
        userId: userData.id,
        userType: userData.user_type as UserType,
        adminLevel: userData.entity_users?.[0]?.admin_level as AdminLevel,
        companyId: userData.entity_users?.[0]?.company_id,
        schoolIds: schoolData?.map(s => s.school_id) || [],
        branchIds: branchData?.map(b => b.branch_id) || [],
        email: userData.email,
        name: userData.name,
        isActive: userData.is_active
      };

      setUserScope(scope);
      setLastUserId(user.id);
    } catch (error) {
      console.error('Error in fetchUserScope:', error);
      setHasError(true);
      setError(error instanceof Error ? error.message : 'Failed to load user scope');
      setUserScope(null);
    } finally {
      setIsScopeLoading(false);
    }
  }, [user?.id, lastUserId, userScope, hasError]);

  useEffect(() => {
    fetchUserScope();
  }, [user?.id]);

  // Refresh scope data
  const refreshScope = useCallback(async () => {
    await fetchUserScope();
    if (refreshPermissions) {
      await refreshPermissions();
    }
  }, [fetchUserScope, refreshPermissions]);

  // Clear all caches
  const clearCache = useCallback(() => {
    setUserScope(null);
    setLastUserId(null);
    setHasError(false);
    setError(null);
    if (clearPermissionCache) {
      clearPermissionCache();
    }
  }, [clearPermissionCache]);

  // Module access based on user type
  const canAccessModule = useCallback((modulePath: string, userType?: UserType): boolean => {
    const currentUserType = userType || userScope?.userType;
    
    if (!currentUserType) return false;

    const moduleAccessMap: Record<UserType, string[]> = {
      'system': ['*'], // Full access to all modules
      'entity': ['/entity-module', '/app/entity-module'],
      'teacher': ['/teachers-module', '/app/teachers-module'],
      'student': ['/student-module', '/app/student-module'],
      'parent': ['/parent-module', '/app/parent-module']
    };

    const allowedModules = moduleAccessMap[currentUserType];
    if (allowedModules?.includes('*')) return true;
    
    return allowedModules?.some(module => modulePath.startsWith(module)) || false;
  }, [userScope?.userType]);

  // Tab access based on admin level and permissions
  const canViewTab = useCallback((tabName: string, adminLevel?: AdminLevel): boolean => {
    const currentAdminLevel = adminLevel || userScope?.adminLevel;
    
    if (!currentAdminLevel || !permissions) return false;

    // Use existing permission service to check tab access
    return permissionService.canAccessTab(tabName, permissions);
  }, [userScope?.adminLevel, permissions]);

  // Generic permission check with target user consideration
  const can = useCallback((action: string, targetUserId?: string, targetAdminLevel?: AdminLevel): boolean => {
    if (!userScope || !permissions) return false;

    // Parse action (e.g., "users.create_teacher" or "create_teacher")
    const [category, permission] = action.includes('.') 
      ? action.split('.') 
      : ['users', action];

    // Self-modification check
    if (targetUserId && targetUserId === userScope.userId) {
      // Prevent self-deactivation for entity_admin and sub_entity_admin
      if (action.includes('delete') || action.includes('deactivate')) {
        if (userScope.adminLevel === 'entity_admin' || userScope.adminLevel === 'sub_entity_admin') {
          return false;
        }
      }
    }

    // Hierarchy check for admin management
    if (targetAdminLevel && category === 'users') {
      const hierarchyMap: Record<AdminLevel, number> = {
        'entity_admin': 4,
        'sub_entity_admin': 3,
        'school_admin': 2,
        'branch_admin': 1
      };

      const currentLevel = hierarchyMap[userScope.adminLevel || 'branch_admin'];
      const targetLevel = hierarchyMap[targetAdminLevel];

      // Can only manage lower level admins
      if (targetLevel >= currentLevel) {
        // Special case: entity_admin can manage other entity_admins except self
        if (userScope.adminLevel === 'entity_admin' && targetAdminLevel === 'entity_admin') {
          return targetUserId !== userScope.userId;
        }
        return false;
      }
    }

    // Use existing permission check
    return hasPermission(category as any, permission);
  }, [userScope, permissions, hasPermission]);

  // Get scope filters for data queries
  const getScopeFilters = useCallback((resourceType?: 'schools' | 'branches' | 'users' | 'teachers' | 'students'): Record<string, any> => {
    if (!userScope) return {};

    const { adminLevel, companyId, schoolIds, branchIds } = userScope;

    // Entity admin and sub-entity admin see everything in their company
    if (adminLevel === 'entity_admin' || adminLevel === 'sub_entity_admin') {
      return { company_id: companyId };
    }

    // School admin sees their assigned schools and their branches
    if (adminLevel === 'school_admin' && schoolIds.length > 0) {
      switch (resourceType) {
        case 'schools':
          return { id: schoolIds };
        case 'branches':
          return { school_id: schoolIds };
        case 'users':
        case 'teachers':
        case 'students':
          return { 
            or: [
              { school_id: schoolIds },
              { branch_id: branchIds }
            ]
          };
        default:
          return { school_id: schoolIds };
      }
    }

    // Branch admin sees only their assigned branches
    if (adminLevel === 'branch_admin' && branchIds.length > 0) {
      return { branch_id: branchIds };
    }

    // Default: no access
    return { id: [] }; // This will return no results
  }, [userScope]);

  // Get user context
  const getUserContext = useCallback((): CompleteUserScope | null => {
    return userScope;
  }, [userScope]);

  // Memoized loading state
  const isLoading = useMemo(() => 
    isUserLoading || isPermissionsLoading || isScopeLoading,
    [isUserLoading, isPermissionsLoading, isScopeLoading]
  );

  // Memoized authentication state
  const isAuthenticated = useMemo(() => 
    !!user && !!userScope && userScope.isActive,
    [user, userScope]
  );

  // Memoized admin level checks
  const isEntityAdmin = useMemo(() => checkIsEntityAdmin(), [checkIsEntityAdmin]);
  const isSubEntityAdmin = useMemo(() => checkIsSubEntityAdmin(), [checkIsSubEntityAdmin]);
  const isSchoolAdmin = useMemo(() => checkIsSchoolAdmin(), [checkIsSchoolAdmin]);
  const isBranchAdmin = useMemo(() => checkIsBranchAdmin(), [checkIsBranchAdmin]);

  return {
    // Core methods
    canAccessModule,
    canViewTab,
    can,
    getScopeFilters,
    getUserContext,
    
    // State
    isLoading,
    isAuthenticated,
    hasError,
    error,
    
    // Convenience flags
    isEntityAdmin,
    isSubEntityAdmin,
    isSchoolAdmin,
    isBranchAdmin,
    
    // Utility methods
    refreshScope,
    clearCache
  };
}

// Additional hooks for specific use cases
export function useCanAccessModule(modulePath: string) {
  const { canAccessModule } = useAccessControl();
  return useMemo(() => canAccessModule(modulePath), [canAccessModule, modulePath]);
}

export function useCanViewTab(tabName: string) {
  const { canViewTab } = useAccessControl();
  return useMemo(() => canViewTab(tabName), [canViewTab, tabName]);
}

export function useUserScope() {
  const { getUserContext, isLoading } = useAccessControl();
  return useMemo(() => ({
    scope: getUserContext(),
    isLoading
  }), [getUserContext, isLoading]);
}