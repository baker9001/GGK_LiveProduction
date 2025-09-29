/**
 * File: /src/hooks/useAccessControl.ts
 * 
 * FIXED VERSION - Enhanced error handling for WebContainer environments
 * Fixed: Network failures, retry logic, and graceful degradation
 * 
 * Dependencies:
 *   - @/lib/supabase
 *   - @/contexts/UserContext
 * 
 * Changes:
 *   - Added retry logic with exponential backoff
 *   - Implemented graceful degradation for network failures
 *   - Added connection state monitoring
 *   - Enhanced error recovery mechanisms
 *   - Added fallback data for offline mode
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase, checkSupabaseConnection } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';

export type UserType = 'system' | 'entity' | 'teacher' | 'student' | 'parent';
export type AdminLevel = 'entity_admin' | 'sub_entity_admin' | 'school_admin' | 'branch_admin';

export interface CompleteUserScope {
  userId: string;
  userType: UserType;
  adminLevel?: AdminLevel | null;
  companyId: string;
  schoolIds: string[];
  branchIds: string[];
  isActive: boolean;
  assignedSchools?: string[];
  assignedBranches?: string[];
  permissions?: Record<string, any>;
  isCompanyAdmin?: boolean;
  canCreateAdmins?: boolean;
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
  isOffline: boolean;
  retryConnection: () => Promise<void>;
}

// Security constants
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 1000; // 1 second base delay

// Simple logging function
const logAction = (action: string, details: any) => {
  if (import.meta.env.MODE === 'development') {
    console.log(`[useAccessControl] ${action}:`, details);
  }
};

// Default fallback scope for offline mode
const getDefaultScope = (userId: string, userEmail?: string): CompleteUserScope => ({
  userId,
  userType: 'entity',
  adminLevel: 'entity_admin',
  companyId: 'offline-mode',
  schoolIds: [],
  branchIds: [],
  isActive: true,
  assignedSchools: [],
  assignedBranches: [],
  permissions: {
    users: { view_all_users: true },
    schools: { view_all_schools: true },
    branches: { view_all_branches: true }
  },
  isCompanyAdmin: false,
  canCreateAdmins: false,
});

export function useAccessControl(): UseAccessControlResult {
  const { user, isLoading: isUserLoading } = useUser();
  const [userScope, setUserScope] = useState<CompleteUserScope | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Retry connection function
  const retryConnection = useCallback(async () => {
    setError(null);
    setHasError(false);
    setRetryCount(0);
    await fetchUserScope();
  }, []);

  // Execute query with retry logic
  const executeWithRetry = useCallback(async <T,>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    context: string
  ): Promise<{ data: T | null; error: any }> => {
    let lastError = null;
    
    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        const result = await queryFn();
        
        if (!result.error) {
          return result;
        }
        
        // Check if it's a network error
        if (result.error?.message?.includes('Failed to fetch') ||
            result.error?.message?.includes('TypeError') ||
            result.error?.message?.includes('NetworkError')) {
          lastError = result.error;
          
          if (attempt < MAX_RETRY_ATTEMPTS) {
            const delay = RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
            console.warn(`[useAccessControl] ${context} - Attempt ${attempt} failed, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        // Non-network error, don't retry
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt < MAX_RETRY_ATTEMPTS) {
          const delay = RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
          console.warn(`[useAccessControl] ${context} - Attempt ${attempt} failed with exception, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    return { data: null, error: lastError };
  }, []);

  // Fetch user scope with proper error handling and retry logic
  const fetchUserScope = useCallback(async (): Promise<CompleteUserScope | null> => {
    try {
      if (!user?.id) {
        logAction('No user found', null);
        return null;
      }

      // Check connection first
      const { connected: isConnected, error: connectionError } = await checkSupabaseConnection();

      if (!isConnected) {
        console.warn('[useAccessControl] Supabase connection failed, using offline mode');
        setIsOffline(true);
        const fallbackScope = getDefaultScope(user.id, user.email);
        setUserScope(fallbackScope);
        setError(connectionError || 'Working in offline mode. Limited functionality available.');
        setHasError(false); // Not a critical error
        return fallbackScope;
      }
      
      setIsOffline(false);

      // Get the base user data with retry
      const { data: userData, error: userError } = await executeWithRetry(
        () => supabase
          .from('users')
          .select('id, email, user_type, is_active')
          .eq('id', user.id)
          .single(),
        'Fetching user data'
      );

      if (userError || !userData) {
        // If network error, use fallback
        if (userError?.message?.includes('Failed to fetch') ||
            userError?.message?.includes('TypeError')) {
          console.warn('[useAccessControl] Network error, using fallback scope');
          setIsOffline(true);
          const fallbackScope = getDefaultScope(user.id, user.email);
          setUserScope(fallbackScope);
          setError('Connection issue detected. Using limited offline mode.');
          setHasError(false);
          return fallbackScope;
        }
        
        console.error('[useAccessControl] Error fetching user data:', userError);
        throw new Error('Failed to fetch user data');
      }

      // For entity users, get additional information with retry
      if (userData.user_type === 'entity') {
        const { data: entityUser, error: entityError } = await executeWithRetry(
          () => supabase
            .from('entity_users')
            .select(`
              id,
              user_id,
              company_id,
              admin_level,
              permissions,
              is_company_admin,
              can_create_admins
            `)
            .eq('user_id', user.id)
            .maybeSingle(),
          'Fetching entity user data'
        );

        if (entityError && !entityUser) {
          // Network error - use fallback with entity type
          if (entityError?.message?.includes('Failed to fetch')) {
            console.warn('[useAccessControl] Entity user fetch failed, using fallback');
            const fallbackScope = getDefaultScope(user.id, user.email);
            fallbackScope.userType = 'entity';
            setUserScope(fallbackScope);
            setIsOffline(true);
            setError('Connection issue. Using limited functionality.');
            return fallbackScope;
          }
          
          console.error('[useAccessControl] Entity user not found:', entityError);
          return null;
        }

        // Initialize arrays for assigned schools and branches
        let assignedSchools: string[] = [];
        let assignedSchoolNames: string[] = [];
        let assignedBranches: string[] = [];
        let assignedBranchNames: string[] = [];

        // For school admins, fetch assigned schools from junction table
        if (entityUser?.admin_level === 'school_admin') {
          const { data: schoolAssignments, error: schoolError } = await executeWithRetry(
            () => supabase
              .from('entity_user_schools')
              .select(`
                school_id,
                schools!entity_user_schools_school_id_fkey (
                  id,
                  name,
                  status
                )
              `)
              .eq('entity_user_id', entityUser.id),
            'Fetching school assignments'
          );

          if (!schoolError && schoolAssignments) {
            assignedSchools = schoolAssignments
              .filter(s => s.schools?.status === 'active')
              .map(s => s.school_id);
            assignedSchoolNames = schoolAssignments
              .filter(s => s.schools?.status === 'active')
              .map(s => s.schools?.name || '')
              .filter(Boolean);

            logAction('School admin assigned schools', {
              assignedSchools,
              assignedSchoolNames
            });

            // Also fetch branches for those schools
            if (assignedSchools.length > 0) {
              const { data: branchesData } = await executeWithRetry(
                () => supabase
                  .from('branches')
                  .select('id, name')
                  .in('school_id', assignedSchools)
                  .eq('status', 'active'),
                'Fetching branches for schools'
              );

              if (branchesData) {
                assignedBranches = branchesData.map(b => b.id);
                assignedBranchNames = branchesData.map(b => b.name);
              }
            }
          }
        }

        // For branch admins, fetch assigned branches and their schools
        if (entityUser?.admin_level === 'branch_admin') {
          const { data: branchAssignments } = await executeWithRetry(
            () => supabase
              .from('entity_user_branches')
              .select(`
                branch_id,
                branches!entity_user_branches_branch_id_fkey (
                  id,
                  name,
                  school_id,
                  status,
                  schools!branches_school_id_fkey (
                    id,
                    name,
                    status
                  )
                )
              `)
              .eq('entity_user_id', entityUser.id),
            'Fetching branch assignments'
          );

          if (branchAssignments) {
            assignedBranches = branchAssignments
              .filter(b => b.branches?.status === 'active')
              .map(b => b.branch_id);
            assignedBranchNames = branchAssignments
              .filter(b => b.branches?.status === 'active')
              .map(b => b.branches?.name || '')
              .filter(Boolean);

            // Get unique school IDs from the branches
            const schoolIds = [...new Set(
              branchAssignments
                .filter(b => b.branches?.schools?.status === 'active')
                .map(b => b.branches?.schools?.id)
                .filter(Boolean)
            )];

            const schoolNames = [...new Set(
              branchAssignments
                .filter(b => b.branches?.schools?.status === 'active')
                .map(b => b.branches?.schools?.name || '')
                .filter(Boolean)
            )];

            assignedSchools = schoolIds as string[];
            assignedSchoolNames = schoolNames;
          }
        }

        // For entity and sub-entity admins, they have access to all schools/branches
        if (entityUser?.admin_level === 'entity_admin' || entityUser?.admin_level === 'sub_entity_admin') {
          // Fetch all schools in the company
          const { data: allSchools } = await executeWithRetry(
            () => supabase
              .from('schools')
              .select('id, name')
              .eq('company_id', entityUser.company_id)
              .eq('status', 'active'),
            'Fetching all schools'
          );

          if (allSchools) {
            assignedSchools = allSchools.map(s => s.id);
            assignedSchoolNames = allSchools.map(s => s.name);
          }

          // Fetch all branches in the company
          const { data: allBranches } = await executeWithRetry(
            () => supabase
              .from('branches')
              .select(`
                id,
                name,
                schools!branches_school_id_fkey (
                  company_id
                )
              `)
              .eq('schools.company_id', entityUser.company_id)
              .eq('status', 'active'),
            'Fetching all branches'
          );

          if (allBranches) {
            assignedBranches = allBranches.map(b => b.id);
            assignedBranchNames = allBranches.map(b => b.name);
          }
        }

        const scope: CompleteUserScope = {
          userId: userData.id,
          userType: userData.user_type as UserType,
          isActive: userData.is_active,
          adminLevel: entityUser?.admin_level as AdminLevel || null,
          companyId: entityUser?.company_id || '',
          permissions: entityUser?.permissions || {},
          isCompanyAdmin: entityUser?.is_company_admin || false,
          canCreateAdmins: entityUser?.can_create_admins || false,
          schoolIds: assignedSchools,
          branchIds: assignedBranches,
          assignedSchools: assignedSchoolNames,
          assignedBranches: assignedBranchNames,
        };

        logAction('Final user scope', scope);
        return scope;
      }

      // For non-entity users (teachers, students, etc.)
      const scope: CompleteUserScope = {
        userId: userData.id,
        userType: userData.user_type as UserType,
        isActive: userData.is_active,
        adminLevel: null,
        companyId: '',
        permissions: {},
        isCompanyAdmin: false,
        canCreateAdmins: false,
        schoolIds: [],
        branchIds: [],
        assignedSchools: [],
        assignedBranches: [],
      };

      return scope;
    } catch (error) {
      console.error('[useAccessControl] Error in fetchUserScope:', error);
      
      // For network errors, try to use a fallback
      if (error instanceof Error && 
          (error.message.includes('Failed to fetch') || 
           error.message.includes('NetworkError') ||
           error.message.includes('TypeError'))) {
        
        if (user?.id) {
          console.warn('[useAccessControl] Using fallback scope due to network error');
          const fallbackScope = getDefaultScope(user.id, user.email);
          setUserScope(fallbackScope);
          setIsOffline(true);
          setError('Connection issues detected. Some features may be limited.');
          setHasError(false); // Not critical
          return fallbackScope;
        }
      }
      
      setError(error instanceof Error ? error.message : 'Unknown error');
      setHasError(true);
      return null;
    }
  }, [user, executeWithRetry]);

  // Effect to fetch user scope when user changes
  useEffect(() => {
    const loadUserScope = async () => {
      if (!user?.id || isUserLoading) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setHasError(false);
      setError(null);

      try {
        const scope = await fetchUserScope();
        setUserScope(scope);
        setRetryCount(0); // Reset retry count on success
      } catch (err) {
        console.error('Failed to fetch user scope:', err);
        setHasError(true);
        setError(err instanceof Error ? err.message : 'Failed to fetch user scope');
        
        // Schedule retry if it's a network error and we haven't exceeded retry limit
        if (err instanceof Error && 
            (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) &&
            retryCount < 3) {
          
          const retryDelay = 5000 * Math.pow(2, retryCount); // Exponential backoff
          console.log(`[useAccessControl] Scheduling retry ${retryCount + 1} in ${retryDelay}ms`);
          
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
          }
          
          retryTimeoutRef.current = setTimeout(() => {
            setRetryCount(prev => prev + 1);
            loadUserScope();
          }, retryDelay);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadUserScope();
    
    // Cleanup on unmount or user change
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [user?.id, isUserLoading, fetchUserScope, retryCount]);

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

  // Tab access check
  const canViewTab = useCallback((tabName: string, adminLevel?: AdminLevel): boolean => {
    const level = adminLevel || userScope?.adminLevel;
    
    // In offline mode, allow basic viewing
    if (isOffline) {
      return true;
    }
    
    if (!level) return false;
    
    const tabPermissions: Record<string, AdminLevel[]> = {
      'structure': ['entity_admin', 'sub_entity_admin'],
      'schools': ['entity_admin', 'sub_entity_admin', 'school_admin'],
      'branches': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin'],
      'admins': ['entity_admin', 'sub_entity_admin'],
      'teachers': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin'],
      'students': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin'],
      'license-management': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin']
    };
    
    const hasAccess = tabPermissions[tabName]?.includes(level) || false;
    
    logAction('tab_access_check', { tabName, level, hasAccess });
    
    return hasAccess;
  }, [userScope, isOffline]);

  // Permission check
  const can = useCallback((action: string, targetUserId?: string, targetAdminLevel?: AdminLevel): boolean => {
    if (!userScope) return false;
    
    // In offline mode, allow read-only operations
    if (isOffline) {
      return action.startsWith('view_');
    }
    
    const isSelfAction = targetUserId && targetUserId === userScope.userId;
    
    // Define permissions based on admin level
    const permissions: Record<string, boolean> = {
      // Creation permissions
      'create_entity_admin': userScope.adminLevel === 'entity_admin',
      'create_sub_admin': userScope.adminLevel === 'entity_admin',
      'create_school_admin': ['entity_admin', 'sub_entity_admin'].includes(userScope.adminLevel || ''),
      'create_branch_admin': ['entity_admin', 'sub_entity_admin', 'school_admin'].includes(userScope.adminLevel || ''),
      'create_teacher': true,
      'create_student': true,
      
      // Modification permissions
      'modify_entity_admin': userScope.adminLevel === 'entity_admin' || isSelfAction,
      'modify_sub_admin': ['entity_admin'].includes(userScope.adminLevel || '') || isSelfAction,
      'modify_school_admin': ['entity_admin', 'sub_entity_admin'].includes(userScope.adminLevel || '') || isSelfAction,
      'modify_branch_admin': ['entity_admin', 'sub_entity_admin', 'school_admin'].includes(userScope.adminLevel || ''),
      'modify_teacher': true,
      'modify_student': true,
      
      // Deletion permissions
      'delete_users': ['entity_admin', 'sub_entity_admin'].includes(userScope.adminLevel || ''),
      'delete_entity_admin': userScope.adminLevel === 'entity_admin' && !isSelfAction,
      'delete_sub_admin': ['entity_admin'].includes(userScope.adminLevel || ''),
      'delete_school_admin': ['entity_admin', 'sub_entity_admin'].includes(userScope.adminLevel || ''),
      'delete_branch_admin': ['entity_admin', 'sub_entity_admin', 'school_admin'].includes(userScope.adminLevel || ''),
      
      // View permissions
      'view_all_users': true,
      'view_admins': ['entity_admin', 'sub_entity_admin'].includes(userScope.adminLevel || ''),
      'view_audit_logs': ['entity_admin', 'sub_entity_admin'].includes(userScope.adminLevel || ''),
      
      // Organization management permissions
      'create_school': ['entity_admin', 'sub_entity_admin'].includes(userScope.adminLevel || ''),
      'modify_school': ['entity_admin', 'sub_entity_admin', 'school_admin'].includes(userScope.adminLevel || ''),
      'delete_school': ['entity_admin', 'sub_entity_admin'].includes(userScope.adminLevel || ''),
      'view_all_schools': true,
      
      'create_branch': ['entity_admin', 'sub_entity_admin', 'school_admin'].includes(userScope.adminLevel || ''),
      'modify_branch': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin'].includes(userScope.adminLevel || ''),
      'delete_branch': ['entity_admin', 'sub_entity_admin', 'school_admin'].includes(userScope.adminLevel || ''),
      'view_all_branches': true,
      
      // License management permissions
      'view_licenses': ['entity_admin', 'sub_entity_admin', 'school_admin'].includes(userScope.adminLevel || ''),
      'assign_license': ['entity_admin', 'sub_entity_admin', 'school_admin'].includes(userScope.adminLevel || ''),
      'revoke_license': ['entity_admin', 'sub_entity_admin', 'school_admin'].includes(userScope.adminLevel || ''),
      'manage_license_assignments': ['entity_admin', 'sub_entity_admin', 'school_admin'].includes(userScope.adminLevel || ''),
    };
    
    const hasPermission = permissions[action] || false;
    
    if (!hasPermission) {
      logAction('permission_denied', { action, adminLevel: userScope.adminLevel, isOffline });
    }
    
    return hasPermission;
  }, [userScope, isOffline]);

  // Scope-based query filters
  const getScopeFilters = useCallback((resourceType?: 'schools' | 'branches' | 'users' | 'teachers' | 'students'): Record<string, any> => {
    if (!userScope) return { school_ids: [], branch_ids: [] };
    
    const { adminLevel, companyId, schoolIds, branchIds } = userScope;
    
    // Entity admin and sub-entity admin see everything in their company
    if (adminLevel === 'entity_admin' || adminLevel === 'sub_entity_admin') {
      return companyId ? { company_id: companyId, school_ids: schoolIds || [], branch_ids: branchIds || [] } : { school_ids: [], branch_ids: [] };
    }
    
    // School admin sees their assigned schools
    if (adminLevel === 'school_admin' && schoolIds.length > 0) {
      switch (resourceType) {
        case 'schools':
          return { id: schoolIds, school_ids: schoolIds, branch_ids: branchIds || [] };
        case 'branches':
          return { school_id: schoolIds, school_ids: schoolIds, branch_ids: branchIds || [] };
        case 'users':
        case 'teachers':
        case 'students':
          return { 
            school_ids: schoolIds || [],
            branch_ids: branchIds || []
          };
        default:
          return { school_id: schoolIds, school_ids: schoolIds || [], branch_ids: branchIds || [] };
      }
    }
    
    // Branch admin sees only their branches
    if (adminLevel === 'branch_admin' && branchIds.length > 0) {
      switch (resourceType) {
        case 'schools':
          return { id: schoolIds || [], school_ids: schoolIds || [], branch_ids: branchIds || [] };
        case 'branches':
          return { id: branchIds, school_ids: schoolIds || [], branch_ids: branchIds || [] };
        case 'users':
        case 'teachers':
        case 'students':
          return { school_ids: schoolIds || [], branch_ids: branchIds || [] };
        default:
          return { branch_id: branchIds, school_ids: schoolIds || [], branch_ids: branchIds || [] };
      }
    }
    
    // Default: no access
    return { id: [], school_ids: [], branch_ids: [] };
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
    error,
    isOffline,
    retryConnection
  };
}