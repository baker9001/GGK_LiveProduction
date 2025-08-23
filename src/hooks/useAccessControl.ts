// src/hooks/useAccessControl.ts
/**
 * COMPLETE UPDATED: useAccessControl Hook
 * 
 * Fixes Applied:
 * 1. Fixed Supabase relationship ambiguity issue
 * 2. Updated queries to work without is_active columns in students/teachers tables
 * 3. Proper error handling and loading states
 * 4. Enhanced scope filtering logic
 * 
 * Dependencies:
 *   - @/contexts/UserContext
 *   - @/lib/supabase
 *   - External: react
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useUser } from '../contexts/UserContext';
import { supabase } from '../lib/supabase';

// Type definitions
export type UserType = 'system' | 'entity' | 'teacher' | 'student' | 'parent';
export type AdminLevel = 'entity_admin' | 'school_admin' | 'branch_admin' | 'sub_entity_admin';

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

export function useAccessControl(): UseAccessControlResult {
  const { user, isLoading: isUserLoading } = useUser();
  const [userScope, setUserScope] = useState<CompleteUserScope | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUserId, setLastUserId] = useState<string | null>(null);

  // Fetch user scope data
  const fetchUserScope = useCallback(async (userId: string) => {
    try {
      setIsLoading(true);
      setHasError(false);
      setError(null);

      // Cache check - avoid refetching for same user
      if (lastUserId === userId && userScope) {
        setIsLoading(false);
        return userScope;
      }

      // FIXED: Use explicit relationship specification to avoid ambiguity
      const { data: entityUserData, error: entityUserError } = await supabase
        .from('entity_users')
        .select(`
          id,
          user_id,
          admin_level,
          company_id,
          is_active,
          name,
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

      if (entityUserError) {
        console.error('Entity user fetch error:', entityUserError);
        throw new Error(`Failed to fetch entity user data: ${entityUserError.message}`);
      }

      // If no entity_users record found, check if it's a regular user
      if (!entityUserData) {
        const { data: basicUserData, error: basicUserError } = await supabase
          .from('users')
          .select('id, email, user_type, is_active')
          .eq('id', userId)
          .eq('is_active', true)
          .maybeSingle();

        if (basicUserError) {
          console.error('Basic user fetch error:', basicUserError);
          throw new Error(`Failed to fetch user data: ${basicUserError.message}`);
        }

        if (!basicUserData) {
          throw new Error('User not found or inactive');
        }

        const scope: CompleteUserScope = {
          userId: basicUserData.id,
          userType: (basicUserData.user_type as UserType) || 'student',
          adminLevel: undefined,
          companyId: undefined,
          schoolIds: [],
          branchIds: [],
          isActive: basicUserData.is_active,
          assignedSchools: [],
          assignedBranches: []
        };

        setUserScope(scope);
        setLastUserId(userId);
        return scope;
      }

      // Get assigned schools and branches for the entity user
      let assignedSchools: string[] = [];
      let assignedBranches: string[] = [];

      if (entityUserData.admin_level !== 'entity_admin' && entityUserData.admin_level !== 'sub_entity_admin') {
        try {
          const { data: scopeData, error: scopeError } = await supabase
            .from('entity_admin_scope')
            .select('scope_type, scope_id')
            .eq('user_id', userId)
            .eq('is_active', true);

          if (scopeError) {
            console.error('Scope fetch error:', scopeError);
          } else if (scopeData) {
            assignedSchools = scopeData
              .filter(scope => scope.scope_type === 'school')
              .map(scope => scope.scope_id);
            
            assignedBranches = scopeData
              .filter(scope => scope.scope_type === 'branch')
              .map(scope => scope.scope_id);
          }
        } catch (scopeError) {
          console.error('Error fetching scope assignments:', scopeError);
        }
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

      setUserScope(scope);
      setLastUserId(userId);
      return scope;

    } catch (error) {
      console.error('Error in fetchUserScope:', error);
      setHasError(true);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      setUserScope(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [lastUserId, userScope]);

  // Initialize user scope when user changes
  useEffect(() => {
    const initializeScope = async () => {
      if (isUserLoading) {
        setIsLoading(true);
        return;
      }

      if (user?.id) {
        try {
          await fetchUserScope(user.id);
        } catch (error) {
          console.error('Failed to initialize user scope:', error);
        }
      } else {
        setUserScope(null);
        setLastUserId(null);
        setIsLoading(false);
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
    const currentAdminLevel = adminLevel || userScope?.adminLevel;
    
    if (!currentAdminLevel) return false;

    const tabVisibilityMatrix: Record<string, AdminLevel[]> = {
      'organization-structure': ['entity_admin'],
      'schools': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin'],
      'branches': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin'],
      'admins': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin'],
      'teachers': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin'],
      'students': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin']
    };

    const allowedLevels = tabVisibilityMatrix[tabName] || [];
    return allowedLevels.includes(currentAdminLevel);
  }, [userScope]);

  // Action permission control
  const can = useCallback((action: string, targetUserId?: string, targetAdminLevel?: AdminLevel): boolean => {
    if (!userScope || !userScope.adminLevel) return false;

    // Self-modification prevention
    if (targetUserId && targetUserId === userScope.userId) {
      const restrictedActions = ['deactivate_user', 'delete_user', 'change_admin_level'];
      if (restrictedActions.some(restricted => action.includes(restricted))) {
        return false;
      }
    }

    const permissionMatrix: Record<AdminLevel, Record<string, boolean>> = {
      entity_admin: {
        create_school: true,
        create_branch: true,
        create_school_admin: true,
        create_branch_admin: true,
        create_teacher: true,
        create_student: true,
        modify_school: true,
        modify_branch: true,
        modify_teacher: true,
        modify_student: true,
        delete_school: true,
        delete_branch: true,
        delete_teacher: true,
        delete_student: true,
        view_audit_logs: true,
        export_data: true,
        manage_settings: true
      },
      sub_entity_admin: {
        create_school: true,
        create_branch: true,
        create_school_admin: true,
        create_branch_admin: true,
        create_teacher: true,
        create_student: true,
        modify_school: true,
        modify_branch: true,
        modify_teacher: true,
        modify_student: true,
        delete_school: false,
        delete_branch: false,
        delete_teacher: true,
        delete_student: true,
        view_audit_logs: true,
        export_data: true,
        manage_settings: false
      },
      school_admin: {
        create_school: false,
        create_branch: true,
        create_school_admin: false,
        create_branch_admin: true,
        create_teacher: true,
        create_student: true,
        modify_school: false,
        modify_branch: true,
        modify_teacher: true,
        modify_student: true,
        delete_school: false,
        delete_branch: false,
        delete_teacher: true,
        delete_student: true,
        view_audit_logs: false,
        export_data: false,
        manage_settings: false
      },
      branch_admin: {
        create_school: false,
        create_branch: false,
        create_school_admin: false,
        create_branch_admin: false,
        create_teacher: true,
        create_student: true,
        modify_school: false,
        modify_branch: false,
        modify_teacher: true,
        modify_student: true,
        delete_school: false,
        delete_branch: false,
        delete_teacher: false,
        delete_student: false,
        view_audit_logs: false,
        export_data: false,
        manage_settings: false
      }
    };

    return permissionMatrix[userScope.adminLevel]?.[action] || false;
  }, [userScope]);

  // FIXED: Scope-based query filters that work with current schema
  const getScopeFilters = useCallback((resourceType?: 'schools' | 'branches' | 'users' | 'teachers' | 'students'): Record<string, any> => {
    if (!userScope) return {};

    const { adminLevel, companyId, schoolIds, branchIds } = userScope;

    // Entity admin and sub-entity admin see everything in their company
    if (adminLevel === 'entity_admin' || adminLevel === 'sub_entity_admin') {
      return companyId ? { company_id: companyId } : {};
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
          // Return both school and branch filters for flexible querying
          return { 
            school_ids: schoolIds,
            branch_ids: branchIds.length > 0 ? branchIds : []
          };
        default:
          return { school_id: schoolIds };
      }
    }

    // Branch admin sees only their assigned branches
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

  // Memoized loading state
  const isLoadingFinal = useMemo(() => 
    isUserLoading || isLoading,
    [isUserLoading, isLoading]
  );

  // Memoized authentication state
  const isAuthenticated = useMemo(() => 
    !!user && !!userScope && userScope.isActive,
    [user, userScope]
  );

  // Memoized admin level checks
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