// src/hooks/useAccessControl.ts
/**
 * PRODUCTION-READY VERSION: useAccessControl Hook
 * 
 * Security Features:
 * 1. Environment-based dev mode
 * 2. Input validation and sanitization
 * 3. Secure error handling
 * 4. Principle of least privilege
 * 5. Self-modification prevention
 * 6. Cache with TTL
 * 
 * Dependencies:
 *   - @/contexts/UserContext
 *   - @/lib/supabase
 *   - External: react
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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

// Security constants
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_RETRY_ATTEMPTS = 3;

// Environment check for development mode
const isDevelopmentMode = (): boolean => {
  // Check if we're in development and if dev mode is explicitly enabled
  return import.meta.env.MODE === 'development' && 
         (import.meta.env.VITE_ENABLE_DEV_MODE === 'true' || 
          import.meta.env.VITE_ENABLE_DEV_MODE === undefined); // Default to true in dev if not set
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

// Simple logging function (replace with proper audit logging in production)
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

  // Fetch user scope data
  const fetchUserScope = useCallback(async (userId: string) => {
    try {
      // Input validation
      if (!userId || typeof userId !== 'string') {
        throw new Error('Invalid user ID');
      }
      
      // Check cache validity
      const now = Date.now();
      if (scopeCache.current.data && 
          scopeCache.current.timestamp > now - CACHE_TTL &&
          lastUserId === userId) {
        console.log('Using cached user scope');
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
            console.error(`Attempt ${attempts} failed:`, fetchError);
            
            // If it's a UUID error and we're in dev mode, handle it gracefully
            if (fetchError.code === '22P02' && isDevelopmentMode()) {
              console.warn('UUID error in dev mode, using fallback');
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
              return devScope;
            }
            
            if (attempts < MAX_RETRY_ATTEMPTS) {
              await new Promise(resolve => setTimeout(resolve, attempts * 1000));
              continue;
            }
          } else {
            entityUserData = data;
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.error(`Attempt ${attempts} error:`, err);
          
          if (attempts < MAX_RETRY_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, attempts * 1000));
          }
        }
      }
      
      // If no entity user found, check basic user
      if (!entityUserData) {
        console.log('No entity user found, checking basic user data');
        
        const { data: basicUserData, error: basicError } = await supabase
          .from('users')
          .select('id, email, user_type, is_active')
          .eq('id', userId)
          .eq('is_active', true)
          .maybeSingle();
        
        if (basicError || !basicUserData) {
          console.error('No active user found');
          const minimalScope: CompleteUserScope = {
            userId: userId,
            userType: 'student',
            adminLevel: undefined,
            companyId: undefined,
            schoolIds: [],
            branchIds: [],
            isActive: false,
            assignedSchools: [],
            assignedBranches: []
          };
          
          scopeCache.current = { data: minimalScope, timestamp: now };
          setUserScope(minimalScope);
          setLastUserId(userId);
          setIsLoading(false);
          return minimalScope;
        }
        
        const basicScope: CompleteUserScope = {
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
        
        scopeCache.current = { data: basicScope, timestamp: now };
        setUserScope(basicScope);
        setLastUserId(userId);
        setIsLoading(false);
        return basicScope;
      }
      
      console.log('Entity user found:', {
        adminLevel: entityUserData.admin_level,
        companyId: entityUserData.company_id,
        isActive: entityUserData.is_active
      });
      
      // Fetch scope assignments for non-entity admins
      let assignedSchools: string[] = [];
      let assignedBranches: string[] = [];
      
      if (entityUserData.admin_level !== 'entity_admin' && 
          entityUserData.admin_level !== 'sub_entity_admin') {
        try {
          const { data: scopeData } = await supabase
            .from('entity_admin_scope')
            .select('scope_type, scope_id')
            .eq('user_id', userId)
            .eq('is_active', true);
          
          if (scopeData) {
            assignedSchools = scopeData
              .filter(scope => scope.scope_type === 'school')
              .map(scope => scope.scope_id);
            
            assignedBranches = scopeData
              .filter(scope => scope.scope_type === 'branch')
              .map(scope => scope.scope_id);
            
            console.log('Assigned scopes:', { schools: assignedSchools, branches: assignedBranches });
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
      
      console.log('Final user scope:', scope);
      
      scopeCache.current = { data: scope, timestamp: now };
      setUserScope(scope);
      setLastUserId(userId);
      
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
  }, [lastUserId]);

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
        scopeCache.current = { data: null, timestamp: 0 };
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
    
    if (!currentAdminLevel) {
      console.log(`canViewTab(${tabName}): No admin level`);
      return false;
    }
    
    const tabVisibilityMatrix: Record<string, AdminLevel[]> = {
      'structure': ['entity_admin', 'sub_entity_admin'],
      'schools': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin'],
      'branches': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin'],
      'admins': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin'],
      'teachers': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin'],
      'students': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin']
    };

    const allowedLevels = tabVisibilityMatrix[tabName] || [];
    const canView = allowedLevels.includes(currentAdminLevel);
    
    console.log(`canViewTab(${tabName}): adminLevel=${currentAdminLevel}, canView=${canView}`);
    
    return canView;
  }, [userScope]);

  // Action permission control
  const can = useCallback((action: string, targetUserId?: string, targetAdminLevel?: AdminLevel): boolean => {
    if (!userScope || !userScope.adminLevel) return false;
    
    // Prevent self-modification for critical actions
    if (targetUserId && targetUserId === userScope.userId) {
      const restrictedSelfActions = [
        'deactivate_user', 
        'delete_user', 
        'change_admin_level',
        'remove_permissions'
      ];
      
      if (restrictedSelfActions.some(restricted => action.includes(restricted))) {
        console.log('Self-modification blocked:', action);
        return false;
      }
    }
    
    // Prevent privilege escalation
    if (targetAdminLevel && action.includes('modify')) {
      const levelHierarchy: Record<AdminLevel, number> = {
        'entity_admin': 4,
        'sub_entity_admin': 3,
        'school_admin': 2,
        'branch_admin': 1
      };
      
      const currentLevel = levelHierarchy[userScope.adminLevel] || 0;
      const targetLevel = levelHierarchy[targetAdminLevel] || 0;
      
      // Can only modify lower levels (except entity_admin can modify all)
      if (targetLevel >= currentLevel && userScope.adminLevel !== 'entity_admin') {
        console.log('Privilege escalation blocked');
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
        modify_entity_admin: true,
        modify_sub_admin: true,
        modify_school_admin: true,
        modify_branch_admin: true,
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
        modify_entity_admin: false,
        modify_sub_admin: false,
        modify_school_admin: true,
        modify_branch_admin: true,
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
        modify_entity_admin: false,
        modify_sub_admin: false,
        modify_school_admin: false,
        modify_branch_admin: true,
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
        modify_entity_admin: false,
        modify_sub_admin: false,
        modify_school_admin: false,
        modify_branch_admin: false,
        delete_school: false,
        delete_branch: false,
        delete_teacher: false,
        delete_student: false,
        view_audit_logs: false,
        export_data: false,
        manage_settings: false
      }
    };

    const hasPermission = permissionMatrix[userScope.adminLevel]?.[action] || false;
    
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