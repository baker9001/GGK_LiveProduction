/**
 * File: /src/hooks/useAccessControl.ts
 * 
 * SECURITY FIX: Properly invalidate cache on user change
 * Prevent loading wrong user's permissions
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
          throw error;
        }
      }
      
      if (!entityUserData) {
        if (lastError) throw lastError;
        throw new Error('User permissions not found');
      }
      
      console.log('Entity user found:', entityUserData);
      
      // Fetch scope assignments
      let assignedSchools: string[] = [];
      let assignedBranches: string[] = [];
      
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
      
      const scope: CompleteUserScope = {
        userId: entityUserData.user_id,
        userType: (entityUserData.users?.user_type as UserType) || 'entity',
        adminLevel: entityUserData.admin_level as AdminLevel,
        companyId: entityUserData.company_id,
        schoolIds: assignedSchools,
        branchIds: assignedBranches,
        isActive: entityUserData.is_active && entityUserData.users?.is_active,
        assignedSchools,
        assignedBranches
      };
      
      console.log('Final user scope:', scope);
      
      // SECURITY: Verify scope is for correct user
      if (scope.userId !== userId) {
        console.error('[Security] Scope user ID mismatch', {
          expected: userId,
          received: scope.userId
        });
        throw new Error('Security violation: User ID mismatch in scope');
      }
      
      scopeCache.current = { data: scope, timestamp: now };
      setUserScope(scope);
      setLastUserId(userId);
      
      // Store in localStorage for debugging
      localStorage.setItem('user_scope_cache', JSON.stringify(scope));
      localStorage.setItem('last_user_id', userId);
      
      logAction('user_scope_fetched', { 
        userId,
        adminLevel: scope.adminLevel,
        companyId: scope.companyId
      });
      
      return scope;
      
    } catch (error: any) {
      console.error('Error in fetchUserScope:', error);
      setHasError(true);
      setError(error?.message || 'Failed to load user permissions');
      
      // Set minimal scope on error
      const minimalScope: CompleteUserScope = {
        userId: userId || '',
        userType: 'student',
        adminLevel: undefined,
        companyId: undefined,
        schoolIds: [],
        branchIds: [],
        isActive: false,
        assignedSchools: [],
        assignedBranches: []
      };
      
      setUserScope(minimalScope);
      scopeCache.current = { data: null, timestamp: 0 };
      
      return minimalScope;
    } finally {
      setIsLoading(false);
    }
  }, [lastUserId, user]);

  // Initialize user scope when user changes
  useEffect(() => {
    const initializeScope = async () => {
      if (isUserLoading) {
        setIsLoading(true);
        return;
      }

      if (user?.id) {
        // SECURITY: Only fetch if user has actually changed
        if (user.id !== lastUserId) {
          try {
            await fetchUserScope(user.id);
          } catch (error) {
            console.error('Failed to initialize user scope:', error);
          }
        }
      } else {
        // No user - clear everything
        setUserScope(null);
        setLastUserId(null);
        setIsLoading(false);
        scopeCache.current = { data: null, timestamp: 0 };
        localStorage.removeItem('user_scope_cache');
        localStorage.removeItem('last_user_id');
      }
    };

    initializeScope();
  }, [user, isUserLoading, fetchUserScope]);

  // Module access control
  const canAccessModule = useCallback((modulePath: string, userType?: UserType): boolean => {
    const currentUserType = userType || userScope?.userType;
    
    if (!currentUserType) return false;
    
    const moduleMap: Record<UserType, string[]> = {
      system: ['/', '/system', '/entity-module', '/teacher', '/student', '/parent'],
      entity: ['/entity-module'],
      teacher: ['/teacher'],
      student: ['/student'],
      parent: ['/parent']
    };

    const allowedModules = moduleMap[currentUserType] || [];
    return allowedModules.some(module => modulePath.startsWith(module));
  }, [userScope]);

  // Tab visibility control
  const canViewTab = useCallback((tabName: string, adminLevel?: AdminLevel): boolean => {
    const level = adminLevel || userScope?.adminLevel;
    
    if (!level) return false;
    
    const tabPermissions: Record<string, AdminLevel[]> = {
      'structure': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin'],
      'schools': ['entity_admin', 'sub_entity_admin', 'school_admin'],
      'branches': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin'],
      'admins': ['entity_admin', 'sub_entity_admin'],
      'teachers': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin'],
      'students': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin']
    };
    
    return tabPermissions[tabName]?.includes(level) || false;
  }, [userScope]);

  // Permission check
  const can = useCallback((action: string, targetUserId?: string, targetAdminLevel?: AdminLevel): boolean => {
    if (!userScope) return false;
    
    // Prevent self-modification for certain actions
    if (action === 'deactivate' && targetUserId === userScope.userId) {
      return false;
    }
    
    const permissions: Record<string, boolean> = {
      'create_entity_admin': userScope.adminLevel === 'entity_admin',
      'create_sub_admin': ['entity_admin', 'sub_entity_admin'].includes(userScope.adminLevel || ''),
      'create_school_admin': ['entity_admin', 'sub_entity_admin'].includes(userScope.adminLevel || ''),
      'create_branch_admin': ['entity_admin', 'sub_entity_admin', 'school_admin'].includes(userScope.adminLevel || ''),
      'create_teacher': true,
      'create_student': true,
      'modify_entity_admin': userScope.adminLevel === 'entity_admin',
      'modify_sub_admin': ['entity_admin', 'sub_entity_admin'].includes(userScope.adminLevel || ''),
      'modify_school_admin': ['entity_admin', 'sub_entity_admin'].includes(userScope.adminLevel || ''),
      'modify_branch_admin': ['entity_admin', 'sub_entity_admin', 'school_admin'].includes(userScope.adminLevel || ''),
      'modify_teacher': true,
      'modify_student': true,
      'delete_users': ['entity_admin', 'sub_entity_admin'].includes(userScope.adminLevel || ''),
      'view_all_users': true
    };
    
    const hasPermission = permissions[action] || false;
    
    if (!hasPermission) {
      console.log(`Permission denied: ${action} for ${userScope.adminLevel}`);
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