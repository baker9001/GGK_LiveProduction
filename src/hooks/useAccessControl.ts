/**
 * File: /src/hooks/useAccessControl.ts
 * 
 * COMPLETE VERSION: All original security features + permission fixes
 * FIXED: Entity admins CAN now modify other entity admins
 * SECURITY: All original security features preserved
 * 
 * Dependencies:
 *   - @/lib/supabase
 *   - @/contexts/UserContext
 * 
 * Database Tables:
 *   - entity_users
 *   - entity_admin_scope
 *   - users
 * 
 * Security Features:
 *   - UUID validation with strict regex
 *   - Development mode detection
 *   - Cache TTL (5 minutes)
 *   - Retry logic with exponential backoff (3 attempts)
 *   - Security logging
 *   - Cache invalidation on user change
 *   - LocalStorage cache removal
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';

export type UserType = 'system' | 'entity' | 'teacher' | 'student' | 'parent';
export type AdminLevel = 'entity_admin' | 'sub_entity_admin' | 'school_admin' | 'branch_admin';

export interface CompleteUserScope {
  userId: string;
  userType: UserType;
  adminLevel?: AdminLevel;
  companyId?: string;
  schoolIds: string[];
  branchIds: string[];
  isActive: boolean;
  assignedSchools?: string[];
  assignedBranches?: string[];
}

export interface UseAccessControlResult {
  canAccessModule: (modulePath: string, userType?: UserType) => boolean;
  canViewTab: (tabName: string, adminLevel?: AdminLevel) => boolean;
  can: (action: string, targetUserId?: string, targetAdminLevel?: AdminLevel) => boolean;
  getScopeFilters: (resourceType?: 'schools' | 'branches' | 'users' | 'teachers' | 'students') => Record<string, any>;
  getUserContext: () => CompleteUserScope | null;
  isLoading: boolean;
  isEntityAdmin: boolean;
  isSubEntityAdmin: boolean;
  isSchoolAdmin: boolean;
  isBranchAdmin: boolean;
  isAuthenticated: boolean;
  hasError: boolean;
  error: string | null;
}

// Security constants
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_RETRY_ATTEMPTS = 3;

// Environment check for development mode
const isDevelopmentMode = (): boolean => {
  return import.meta.env.MODE === 'development' && 
         (import.meta.env.VITE_ENABLE_DEV_MODE === 'true' || 
          import.meta.env.VITE_ENABLE_DEV_MODE === undefined);
};

// UUID validation with strict regex
const isValidUUID = (uuid: string): boolean => {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Check if this is a dev/test user
const isDevUser = (userId: string): boolean => {
  return userId?.startsWith('dev-') || userId === 'test' || !isValidUUID(userId);
};

// Simple logging function
const logAction = (action: string, details: any) => {
  if (import.meta.env.MODE === 'development') {
    console.log(`[AccessControl] ${action}:`, details);
  }
};

export function useAccessControl(): UseAccessControlResult {
  const { user, isLoading: isUserLoading } = useUser();
  const [userScope, setUserScope] = useState<CompleteUserScope | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUserId, setLastUserId] = useState<string | null>(null);
  
  // Cache with TTL
  const scopeCache = useRef<{
    data: CompleteUserScope | null;
    timestamp: number;
  }>({ data: null, timestamp: 0 });

  // SECURITY FIX: Clear cache when user changes
  useEffect(() => {
    if (user?.id !== lastUserId) {
      console.log('[Security] User changed, clearing scope cache', {
        oldUserId: lastUserId,
        newUserId: user?.id
      });
      
      // Clear the cache
      scopeCache.current = { data: null, timestamp: 0 };
      setUserScope(null);
      
      // Remove from localStorage as well
      localStorage.removeItem('user_scope_cache');
      localStorage.removeItem('last_user_id');
    }
  }, [user?.id, lastUserId]);

  // Fetch user scope data
  const fetchUserScope = useCallback(async (userId: string) => {
    try {
      // Input validation
      if (!userId || typeof userId !== 'string') {
        throw new Error('Invalid user ID');
      }
      
      // SECURITY FIX: Always verify we're fetching for the current user
      if (user?.id !== userId) {
        console.error('[Security] Attempted to fetch scope for wrong user', {
          currentUserId: user?.id,
          requestedUserId: userId
        });
        throw new Error('User ID mismatch - security violation');
      }
      
      // Check cache validity - but ONLY if user hasn't changed
      const now = Date.now();
      if (scopeCache.current.data && 
          scopeCache.current.timestamp > now - CACHE_TTL &&
          lastUserId === userId &&
          scopeCache.current.data.userId === userId) {
        console.log('Using cached user scope for:', userId);
        setUserScope(scopeCache.current.data);
        setIsLoading(false);
        return scopeCache.current.data;
      }
      
      setIsLoading(true);
      setHasError(false);
      setError(null);
      
      console.log('Fetching user scope for:', userId);
      
      // Handle development/test users
      if (isDevelopmentMode() && isDevUser(userId)) {
        console.warn('Development user detected:', userId);
        
        const devScope: CompleteUserScope = {
          userId: userId,
          userType: 'entity',
          adminLevel: 'entity_admin',
          companyId: 'dev-company-id',
          schoolIds: [],
          branchIds: [],
          isActive: true,
          assignedSchools: [],
          assignedBranches: []
        };
        
        scopeCache.current = { data: devScope, timestamp: now };
        setUserScope(devScope);
        setLastUserId(userId);
        setIsLoading(false);
        
        logAction('dev_mode_access', { userId });
        
        return devScope;
      }
      
      // Validate UUID for production users
      if (!isValidUUID(userId)) {
        throw new Error('Invalid user ID format');
      }
      
      // Fetch entity user data with retry logic
      let attempts = 0;
      let entityUserData = null;
      let lastError = null;
      
      while (attempts < MAX_RETRY_ATTEMPTS && !entityUserData) {
        attempts++;
        
        try {
          const { data, error: fetchError } = await supabase
            .from('entity_users')
            .select(`
              id,
              user_id,
              admin_level,
              company_id,
              is_active,
              name,
              permissions,
              is_company_admin,
              users!entity_users_user_id_fkey (
                id,
                email,
                user_type,
                is_active
              )
            `)
            .eq('user_id', userId)
            .eq('is_active', true)
            .maybeSingle();
          
          if (fetchError) {
            lastError = fetchError;
            if (attempts < MAX_RETRY_ATTEMPTS) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
              continue;
            }
            throw fetchError;
          }
          
          entityUserData = data;
        } catch (error) {
          lastError = error;
          if (attempts < MAX_RETRY_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            continue;
          }
        }
      }
      
      if (!entityUserData) {
        console.warn('User is not an entity admin:', userId);
        const fallbackScope: CompleteUserScope = {
          userId: userId,
          userType: 'entity',
          adminLevel: undefined,
          companyId: undefined,
          schoolIds: [],
          branchIds: [],
          isActive: false,
          assignedSchools: [],
          assignedBranches: []
        };
        
        scopeCache.current = { data: fallbackScope, timestamp: now };
        setUserScope(fallbackScope);
        setLastUserId(userId);
        setIsLoading(false);
        return fallbackScope;
      }
      
      // Fetch assigned schools and branches
      let assignedSchools: string[] = [];
      let assignedBranches: string[] = [];
      
      // Fetch assigned schools and branches from entity_admin_scope table
      const { data: scopeData } = await supabase
        .from('entity_admin_scope')
        .select('scope_type, scope_id')
        .eq('user_id', userId)
        .eq('is_active', true);
      
      if (scopeData) {
        assignedSchools = scopeData
          .filter(s => s.scope_type === 'school')
          .map(s => s.scope_id);
        
        assignedBranches = scopeData
          .filter(s => s.scope_type === 'branch')
          .map(s => s.scope_id);
      }
      
      const userScope: CompleteUserScope = {
        userId: userId,
        userType: entityUserData.users?.user_type || 'entity',
        adminLevel: entityUserData.admin_level as AdminLevel,
        companyId: entityUserData.company_id,
        schoolIds: assignedSchools,
        branchIds: assignedBranches,
        isActive: entityUserData.is_active && entityUserData.users?.is_active,
        assignedSchools,
        assignedBranches
      };
      
      // Cache the result
      scopeCache.current = { data: userScope, timestamp: now };
      setUserScope(userScope);
      setLastUserId(userId);
      setIsLoading(false);
      
      logAction('scope_fetched', { userId, adminLevel: userScope.adminLevel });
      
      return userScope;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user scope';
      console.error('fetchUserScope error:', err);
      setHasError(true);
      setError(errorMessage);
      setIsLoading(false);
      throw err;
    }
  }, [user?.id, lastUserId]);

  // Effect to fetch user scope when user changes
  useEffect(() => {
    if (user?.id && !isUserLoading) {
      fetchUserScope(user.id).catch(err => {
        console.error('Failed to fetch user scope:', err);
      });
    } else if (!user && !isUserLoading) {
      setUserScope(null);
      setIsLoading(false);
    }
  }, [user, isUserLoading, fetchUserScope]);

  // Module access check
  const canAccessModule = useCallback((modulePath: string, userType?: UserType): boolean => {
    const type = userType || userScope?.userType;
    
    if (!type) return false;
    
    const moduleAccess: Record<string, UserType[]> = {
      '/entity-module': ['entity'],
      '/system-admin': ['system'],
      '/teacher-module': ['teacher'],
      '/student-module': ['student'],
      '/parent-module': ['parent']
    };
    
    const allowedTypes = moduleAccess[modulePath];
    return allowedTypes ? allowedTypes.includes(type) : false;
  }, [userScope]);

  // Tab access check - FIXED: Aligned with hierarchy table
  const canViewTab = useCallback((tabName: string, adminLevel?: AdminLevel): boolean => {
    const level = adminLevel || userScope?.adminLevel;
    
    if (!level) return false;
    
    const tabPermissions: Record<string, AdminLevel[]> = {
      'structure': ['entity_admin', 'sub_entity_admin'], // Only entity & sub-entity admins
      'schools': ['entity_admin', 'sub_entity_admin', 'school_admin'], // school_admin can see schools
      'branches': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin'], // all can see branches
      'admins': ['entity_admin', 'sub_entity_admin'], // Only entity & sub-entity admins
      'teachers': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin'], // all levels
      'students': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin'] // all levels
    };
    
    const hasAccess = tabPermissions[tabName]?.includes(level) || false;
    
    logAction('tab_access_check', { tabName, level, hasAccess });
    
    return hasAccess;
  }, [userScope]);

  // Permission check - FIXED: Entity admins CAN modify other entity admins
  const can = useCallback((action: string, targetUserId?: string, targetAdminLevel?: AdminLevel): boolean => {
    if (!userScope) return false;
    
    // Special handling for self-actions
    const isSelfAction = targetUserId === userScope.userId;
    
    // Prevent self-deactivation for ALL admin levels
    if (action === 'deactivate' && isSelfAction) {
      logAction('self_deactivation_blocked', { userId: userScope.userId });
      return false;
    }
    
    const permissions: Record<string, boolean> = {
      // User management permissions - FIXED: Entity admin CAN manage other entity admins
      'create_admin': ['entity_admin', 'sub_entity_admin'].includes(userScope.adminLevel || ''),
      'create_entity_admin': userScope.adminLevel === 'entity_admin', // FIXED: Entity admin CAN create
      'create_sub_admin': ['entity_admin', 'sub_entity_admin'].includes(userScope.adminLevel || ''),
      'create_school_admin': ['entity_admin', 'sub_entity_admin'].includes(userScope.adminLevel || ''),
      'create_branch_admin': ['entity_admin', 'sub_entity_admin', 'school_admin'].includes(userScope.adminLevel || ''),
      'create_teacher': true,
      'create_student': true,
      
      // CRITICAL FIX: Entity admins CAN modify other entity admins (but not deactivate themselves)
      'modify_entity_admin': userScope.adminLevel === 'entity_admin', // FIXED: Changed from false to true
      'modify_sub_admin': ['entity_admin', 'sub_entity_admin'].includes(userScope.adminLevel || ''),
      'modify_school_admin': ['entity_admin', 'sub_entity_admin'].includes(userScope.adminLevel || ''),
      'modify_branch_admin': ['entity_admin', 'sub_entity_admin', 'school_admin'].includes(userScope.adminLevel || ''),
      'modify_teacher': true,
      'modify_student': true,
      
      // Deletion permissions
      'delete_users': ['entity_admin', 'sub_entity_admin'].includes(userScope.adminLevel || ''),
      'delete_entity_admin': userScope.adminLevel === 'entity_admin' && !isSelfAction,
      'delete_sub_admin': ['entity_admin'].includes(userScope.adminLevel || ''),
      'delete_school_admin': ['entity_admin', 'sub_entity_admin'].includes(userScope.adminLevel || ''),
      'delete_branch_admin': ['entity_admin', 'sub_entity_admin'].includes(userScope.adminLevel || ''),
      
      // View permissions
      'view_all_users': true,
      'view_admins': ['entity_admin', 'sub_entity_admin'].includes(userScope.adminLevel || ''),
      'view_audit_logs': ['entity_admin', 'sub_entity_admin'].includes(userScope.adminLevel || ''),
      
      // Organization management permissions - Aligned with hierarchy
      'create_school': ['entity_admin', 'sub_entity_admin'].includes(userScope.adminLevel || ''),
      'modify_school': ['entity_admin', 'sub_entity_admin', 'school_admin'].includes(userScope.adminLevel || ''),
      'delete_school': ['entity_admin', 'sub_entity_admin'].includes(userScope.adminLevel || ''),
      'view_all_schools': true,
      
      'create_branch': ['entity_admin', 'sub_entity_admin', 'school_admin'].includes(userScope.adminLevel || ''),
      'modify_branch': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin'].includes(userScope.adminLevel || ''),
      'delete_branch': ['entity_admin', 'sub_entity_admin'].includes(userScope.adminLevel || ''),
      'view_all_branches': true,
      
      // Department and settings permissions
      'manage_departments': ['entity_admin', 'sub_entity_admin', 'school_admin'].includes(userScope.adminLevel || ''),
      'manage_company_settings': userScope.adminLevel === 'entity_admin',
      'manage_school_settings': ['entity_admin', 'sub_entity_admin', 'school_admin'].includes(userScope.adminLevel || ''),
      'manage_branch_settings': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin'].includes(userScope.adminLevel || ''),
      'export_data': ['entity_admin', 'sub_entity_admin', 'school_admin'].includes(userScope.adminLevel || ''),
      
      // Edit permissions (for UI buttons)
      'edit_admin': ['entity_admin', 'sub_entity_admin'].includes(userScope.adminLevel || ''),
      'edit_school': ['entity_admin', 'sub_entity_admin', 'school_admin'].includes(userScope.adminLevel || ''),
      'edit_branch': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin'].includes(userScope.adminLevel || ''),
      'edit_teacher': true,
      'edit_student': true
    };
    
    // Check for hierarchy-based modification permissions
    if (action.startsWith('modify_') && targetAdminLevel) {
      // Entity admin can modify anyone (including other entity admins) except themselves for deactivation
      if (userScope.adminLevel === 'entity_admin') {
        // Special case: prevent self-deactivation
        if (isSelfAction && action === 'modify_entity_admin') {
          // Allow self-edit for profile updates, but not deactivation (handled above)
          return true;
        }
        return true; // Can modify everyone
      }
      
      // Sub-entity admin cannot modify entity admins
      if (userScope.adminLevel === 'sub_entity_admin' && targetAdminLevel === 'entity_admin') {
        return false;
      }
      
      // School admin can only modify branch admins and below
      if (userScope.adminLevel === 'school_admin' && 
          ['entity_admin', 'sub_entity_admin', 'school_admin'].includes(targetAdminLevel)) {
        return false;
      }
      
      // Branch admin cannot modify any admin
      if (userScope.adminLevel === 'branch_admin' && 
          ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin'].includes(targetAdminLevel)) {
        return false;
      }
    }
    
    const hasPermission = permissions[action] || false;
    
    if (!hasPermission) {
      logAction('permission_denied', { action, adminLevel: userScope.adminLevel });
    }
    
    return hasPermission;
  }, [userScope]);

  // Scope-based query filters
  const getScopeFilters = useCallback((resourceType?: 'schools' | 'branches' | 'users' | 'teachers' | 'students'): Record<string, any> => {
    if (!userScope) return {};
    
    const { adminLevel, companyId, schoolIds, branchIds } = userScope;
    
    // Entity admin and sub-entity admin see everything in their company
    if (adminLevel === 'entity_admin' || adminLevel === 'sub_entity_admin') {
      return companyId ? { company_id: companyId } : {};
    }
    
    // School admin sees their assigned schools
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
            school_ids: schoolIds,
            branch_ids: branchIds.length > 0 ? branchIds : []
          };
        default:
          return { school_id: schoolIds };
      }
    }
    
    // Branch admin sees only their branches
    if (adminLevel === 'branch_admin' && branchIds.length > 0) {
      switch (resourceType) {
        case 'users':
        case 'teachers':
        case 'students':
          return { branch_ids: branchIds };
        default:
          return { branch_id: branchIds };
      }
    }
    
    // Default: no access
    return { id: [] };
  }, [userScope]);

  // Get user context
  const getUserContext = useCallback((): CompleteUserScope | null => {
    return userScope;
  }, [userScope]);

  // Memoized values
  const isLoadingFinal = useMemo(() => 
    isUserLoading || isLoading,
    [isUserLoading, isLoading]
  );

  const isAuthenticated = useMemo(() => 
    !!user && !!userScope && userScope.isActive,
    [user, userScope]
  );

  const isEntityAdmin = useMemo(() => 
    userScope?.adminLevel === 'entity_admin',
    [userScope]
  );

  const isSubEntityAdmin = useMemo(() => 
    userScope?.adminLevel === 'sub_entity_admin',
    [userScope]
  );

  const isSchoolAdmin = useMemo(() => 
    userScope?.adminLevel === 'school_admin',
    [userScope]
  );

  const isBranchAdmin = useMemo(() => 
    userScope?.adminLevel === 'branch_admin',
    [userScope]
  );

  return {
    canAccessModule,
    canViewTab,
    can,
    getScopeFilters,
    getUserContext,
    isLoading: isLoadingFinal,
    isAuthenticated,
    isEntityAdmin,
    isSubEntityAdmin,
    isSchoolAdmin,
    isBranchAdmin,
    hasError,
    error
  };
}