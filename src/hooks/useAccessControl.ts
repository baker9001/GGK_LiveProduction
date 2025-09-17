/**
 * File: /src/hooks/useAccessControl.ts
 * 
 * FIXED VERSION - Resolves "undefined" user.id error
 * 
 * Changes:
 * 1. Added proper validation for user.id before making Supabase requests
 * 2. Fixed timing issue where effect runs before user is loaded
 * 3. Added guards against 'undefined' string value
 * 
 * Dependencies:
 *   - @/lib/supabase
 *   - @/contexts/UserContext
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
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
}

// Security constants
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Simple logging function
const logAction = (action: string, details: any) => {
  if (import.meta.env.MODE === 'development') {
    console.log(`[useAccessControl] ${action}:`, details);
  }
};

export function useAccessControl(): UseAccessControlResult {
  const { user, isLoading: isUserLoading } = useUser();
  const [userScope, setUserScope] = useState<CompleteUserScope | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user scope with proper junction table handling
  const fetchUserScope = useCallback(async (): Promise<CompleteUserScope | null> => {
    try {
      // CRITICAL FIX: Validate user.id is a valid UUID string
      if (!user?.id || typeof user.id !== 'string' || user.id === 'undefined' || user.id.trim() === '' || user.id === 'null') {
        logAction('Invalid or missing user ID', { userId: user?.id, userObj: user });
        return null;
      }

      // Additional UUID format validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(user.id)) {
        console.error('[useAccessControl] User ID is not a valid UUID:', { userId: user.id, userType: typeof user.id });
        logAction('User ID is not a valid UUID', { userId: user.id, userType: typeof user.id });
        return null;
      }

      // Get the base user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, user_type, is_active')
        .eq('id', user.id)
        .single();

      if (userError || !userData) {
        console.error('[useAccessControl] Error fetching user data:', userError);
        throw new Error('Failed to fetch user data');
      }

      // For entity users, get additional information
      if (userData.user_type === 'entity') {
        const { data: entityUser, error: entityError } = await supabase
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
          .maybeSingle();

        if (entityError) {
          console.error('[useAccessControl] Error fetching entity user:', entityError);
          return null;
        }

        if (!entityUser) {
          console.warn('[useAccessControl] Entity user not found for user_id:', user.id);
          return null;
        }

        // Initialize arrays for assigned schools and branches
        let assignedSchools: string[] = [];
        let assignedSchoolNames: string[] = [];
        let assignedBranches: string[] = [];
        let assignedBranchNames: string[] = [];

        // For school admins, fetch assigned schools from junction table
        if (entityUser.admin_level === 'school_admin') {
          const { data: schoolAssignments, error: schoolError } = await supabase
            .from('entity_user_schools')
            .select(`
              school_id,
              schools!entity_user_schools_school_id_fkey (
                id,
                name,
                status
              )
            `)
            .eq('entity_user_id', entityUser.id); // FIXED: entity_user_id not user_id

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
              const { data: branchesData, error: branchesError } = await supabase
                .from('branches')
                .select('id, name')
                .in('school_id', assignedSchools)
                .eq('status', 'active');

              if (!branchesError && branchesData) {
                assignedBranches = branchesData.map(b => b.id);
                assignedBranchNames = branchesData.map(b => b.name);
              }
            }
          } else {
            console.warn('[useAccessControl] No school assignments found for school admin');
          }
        }

        // For branch admins, fetch assigned branches and their schools
        if (entityUser.admin_level === 'branch_admin') {
          const { data: branchAssignments, error: branchError } = await supabase
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
            .eq('entity_user_id', entityUser.id); // FIXED: entity_user_id not user_id

          if (!branchError && branchAssignments) {
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
                .map(b => b.branches?.school_id)
                .filter(Boolean)
            )];

            const schoolNames = [...new Set(
              branchAssignments
                .filter(b => b.branches?.schools?.status === 'active')
                .map(b => b.branches?.schools?.name || '')
                .filter(Boolean)
            )];

            assignedSchools = schoolIds;
            assignedSchoolNames = schoolNames;

            logAction('Branch admin assigned entities', {
              assignedBranches,
              assignedBranchNames,
              assignedSchools,
              assignedSchoolNames
            });
          }
        }

        // For entity and sub-entity admins, they have access to all schools/branches
        if (entityUser.admin_level === 'entity_admin' || entityUser.admin_level === 'sub_entity_admin') {
          // Fetch all schools in the company
          const { data: allSchools } = await supabase
            .from('schools')
            .select('id, name')
            .eq('company_id', entityUser.company_id)
            .eq('status', 'active');

          if (allSchools) {
            assignedSchools = allSchools.map(s => s.id);
            assignedSchoolNames = allSchools.map(s => s.name);
          }

          // Fetch all branches in the company
          const { data: allBranches } = await supabase
            .from('branches')
            .select(`
              id,
              name,
              schools!branches_school_id_fkey (
                company_id
              )
            `)
            .eq('schools.company_id', entityUser.company_id)
            .eq('status', 'active');

          if (allBranches) {
            assignedBranches = allBranches.map(b => b.id);
            assignedBranchNames = allBranches.map(b => b.name);
          }

          logAction('Entity/Sub-entity admin full access', {
            schoolCount: assignedSchools.length,
            branchCount: assignedBranches.length
          });
        }

        const scope: CompleteUserScope = {
          userId: userData.id,
          userType: userData.user_type as UserType,
          isActive: userData.is_active,
          adminLevel: entityUser.admin_level as AdminLevel,
          companyId: entityUser.company_id,
          permissions: entityUser.permissions || {},
          isCompanyAdmin: entityUser.is_company_admin || false,
          canCreateAdmins: entityUser.can_create_admins || false,
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
      setError(error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }, [user]);

  // Effect to fetch user scope when user changes - FIXED TIMING ISSUE
  useEffect(() => {
    const loadUserScope = async () => {
      // CRITICAL FIX: Don't proceed if user is still loading
      if (isUserLoading) {
        setIsLoading(true);
        return;
      }

      // If user is loaded but no user exists (logged out)
      if (!isUserLoading && !user?.id) {
        setUserScope(null);
        setIsLoading(false);
        setHasError(false);
        setError(null);
        return;
      }

      // CRITICAL FIX: Validate user.id before proceeding
      if (!user?.id || typeof user.id !== 'string' || user.id === 'undefined') {
        console.warn('[useAccessControl] Invalid user ID detected:', user?.id);
        setUserScope(null);
        setIsLoading(false);
        setHasError(false);
        setError('Invalid user ID');
        return;
      }

      setIsLoading(true);
      setHasError(false);
      setError(null);

      try {
        const scope = await fetchUserScope();
        setUserScope(scope);
      } catch (err) {
        console.error('Failed to fetch user scope:', err);
        setHasError(true);
        setError(err instanceof Error ? err.message : 'Failed to fetch user scope');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserScope();
  }, [user?.id, isUserLoading, fetchUserScope]);

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
  }, [userScope]);

  // Permission check
  const can = useCallback((action: string, targetUserId?: string, targetAdminLevel?: AdminLevel): boolean => {
    if (!userScope) return false;
    
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
    
    // Check for hierarchy-based modification permissions
    if (action.startsWith('modify_') && targetAdminLevel) {
      // Entity admin can modify anyone
      if (userScope.adminLevel === 'entity_admin') {
        return true;
      }
      
      // Sub-entity admin can only modify users lower than their level
      if (userScope.adminLevel === 'sub_entity_admin') {
        if (targetAdminLevel === 'entity_admin' || targetAdminLevel === 'sub_entity_admin') {
          return false;
        }
        return true;
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
          // Branch admins can see schools that contain their branches
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
    error
  };
}