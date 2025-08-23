// src/hooks/useAccessControl.ts
/**
 * SECURITY-ENHANCED VERSION: useAccessControl Hook
 * 
 * Security Features:
 * 1. Environment-based dev mode (not user ID based)
 * 2. Input validation and sanitization
 * 3. Rate limiting for database queries
 * 4. Secure error handling (no sensitive data exposure)
 * 5. Principle of least privilege
 * 6. Audit logging for sensitive operations
 * 7. Session validation
 * 8. Cache security with TTL
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
  sessionValidatedAt?: Date;
  permissionsFetchedAt?: Date;
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
const RATE_LIMIT_WINDOW = 1000; // 1 second
const SESSION_VALIDATION_INTERVAL = 60 * 1000; // 1 minute

// Environment check - SECURE: Use environment variable, not user ID pattern
const isDevelopmentMode = (): boolean => {
  return import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DEV_MODE === 'true';
};

// UUID validation with strict regex
const isValidUUID = (uuid: string): boolean => {
  if (typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Sanitize input to prevent injection attacks
const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  // Remove any potential SQL/NoSQL injection patterns
  return input.replace(/[;'"\\]/g, '').substring(0, 255); // Limit length
};

// Audit logging for sensitive operations
const auditLog = async (action: string, details: Record<string, any>) => {
  if (import.meta.env.VITE_ENABLE_AUDIT_LOGGING === 'true') {
    try {
      await supabase.from('access_control_audit_logs').insert({
        action,
        details,
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent,
        ip_hint: 'client' // Server should add actual IP
      });
    } catch (error) {
      console.error('Audit logging failed:', error);
      // Don't throw - audit failure shouldn't break the app
    }
  }
};

export function useAccessControl(): UseAccessControlResult {
  const { user, isLoading: isUserLoading } = useUser();
  const [userScope, setUserScope] = useState<CompleteUserScope | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUserId, setLastUserId] = useState<string | null>(null);
  
  // Rate limiting
  const lastFetchTime = useRef<number>(0);
  const fetchAttempts = useRef<number>(0);
  
  // Session validation
  const sessionCheckInterval = useRef<NodeJS.Timeout | null>(null);
  
  // Cache with TTL
  const scopeCache = useRef<{
    data: CompleteUserScope | null;
    timestamp: number;
  }>({ data: null, timestamp: 0 });

  // Validate session periodically
  const validateSession = useCallback(async () => {
    if (!user?.id || !isValidUUID(user.id)) return;
    
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('users')
        .select('is_active, last_sign_in_at')
        .eq('id', user.id)
        .single();
      
      if (sessionError || !sessionData?.is_active) {
        // Session invalid - clear and redirect
        setUserScope(null);
        setError('Session expired or invalid');
        window.location.href = '/signin';
      }
    } catch (error) {
      console.error('Session validation error:', error);
    }
  }, [user?.id]);

  // Fetch user scope data with security measures
  const fetchUserScope = useCallback(async (userId: string) => {
    try {
      // Input validation
      if (!userId || typeof userId !== 'string') {
        throw new Error('Invalid user ID');
      }
      
      // Sanitize user ID
      const sanitizedUserId = sanitizeInput(userId);
      
      // Rate limiting
      const now = Date.now();
      if (now - lastFetchTime.current < RATE_LIMIT_WINDOW) {
        console.warn('Rate limit: Too many fetch attempts');
        return scopeCache.current.data;
      }
      lastFetchTime.current = now;
      
      // Check cache validity
      if (scopeCache.current.data && 
          scopeCache.current.timestamp > now - CACHE_TTL &&
          lastUserId === sanitizedUserId) {
        setIsLoading(false);
        return scopeCache.current.data;
      }
      
      setIsLoading(true);
      setHasError(false);
      setError(null);
      
      console.log('Fetching user scope...');
      
      // SECURITY: Only use dev mode if explicitly enabled in environment
      if (isDevelopmentMode() && !isValidUUID(sanitizedUserId)) {
        console.warn('Development mode active - using mock data');
        
        const devScope: CompleteUserScope = {
          userId: sanitizedUserId,
          userType: 'entity',
          adminLevel: 'entity_admin',
          companyId: 'dev-company',
          schoolIds: [],
          branchIds: [],
          isActive: true,
          assignedSchools: [],
          assignedBranches: [],
          sessionValidatedAt: new Date(),
          permissionsFetchedAt: new Date()
        };
        
        scopeCache.current = { data: devScope, timestamp: now };
        setUserScope(devScope);
        setLastUserId(sanitizedUserId);
        setIsLoading(false);
        
        // Log dev mode access
        await auditLog('dev_mode_access', { userId: sanitizedUserId });
        
        return devScope;
      }
      
      // Validate UUID for production
      if (!isValidUUID(sanitizedUserId)) {
        throw new Error('Invalid user ID format');
      }
      
      // Fetch with retry logic
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
                is_active,
                last_sign_in_at
              )
            `)
            .eq('user_id', sanitizedUserId)
            .eq('is_active', true)
            .maybeSingle();
          
          if (fetchError) {
            lastError = fetchError;
            if (attempts < MAX_RETRY_ATTEMPTS) {
              await new Promise(resolve => setTimeout(resolve, attempts * 1000));
              continue;
            }
          } else {
            entityUserData = data;
            break;
          }
        } catch (err) {
          lastError = err;
          if (attempts < MAX_RETRY_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, attempts * 1000));
          }
        }
      }
      
      if (lastError && !entityUserData) {
        // Log error but don't expose sensitive details
        console.error('Failed to fetch user data after retries');
        await auditLog('fetch_user_scope_failed', { 
          userId: sanitizedUserId, 
          attempts,
          errorCode: (lastError as any)?.code 
        });
        
        // Return minimal scope with no permissions
        const minimalScope: CompleteUserScope = {
          userId: sanitizedUserId,
          userType: 'student',
          adminLevel: undefined,
          companyId: undefined,
          schoolIds: [],
          branchIds: [],
          isActive: false,
          assignedSchools: [],
          assignedBranches: [],
          sessionValidatedAt: new Date(),
          permissionsFetchedAt: new Date()
        };
        
        scopeCache.current = { data: minimalScope, timestamp: now };
        setUserScope(minimalScope);
        setLastUserId(sanitizedUserId);
        setIsLoading(false);
        return minimalScope;
      }
      
      // If no entity user, check basic user
      if (!entityUserData) {
        const { data: basicUserData } = await supabase
          .from('users')
          .select('id, email, user_type, is_active')
          .eq('id', sanitizedUserId)
          .eq('is_active', true)
          .maybeSingle();
        
        if (!basicUserData) {
          throw new Error('User not found or inactive');
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
          assignedBranches: [],
          sessionValidatedAt: new Date(),
          permissionsFetchedAt: new Date()
        };
        
        scopeCache.current = { data: basicScope, timestamp: now };
        setUserScope(basicScope);
        setLastUserId(sanitizedUserId);
        setIsLoading(false);
        return basicScope;
      }
      
      // Fetch scope assignments for non-entity admins
      let assignedSchools: string[] = [];
      let assignedBranches: string[] = [];
      
      if (entityUserData.admin_level !== 'entity_admin' && 
          entityUserData.admin_level !== 'sub_entity_admin') {
        const { data: scopeData } = await supabase
          .from('entity_admin_scope')
          .select('scope_type, scope_id')
          .eq('user_id', sanitizedUserId)
          .eq('is_active', true);
        
        if (scopeData) {
          assignedSchools = scopeData
            .filter(scope => scope.scope_type === 'school')
            .map(scope => scope.scope_id);
          
          assignedBranches = scopeData
            .filter(scope => scope.scope_type === 'branch')
            .map(scope => scope.scope_id);
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
        assignedBranches,
        sessionValidatedAt: new Date(),
        permissionsFetchedAt: new Date()
      };
      
      // Log successful access
      await auditLog('user_scope_fetched', { 
        userId: sanitizedUserId,
        adminLevel: scope.adminLevel,
        companyId: scope.companyId
      });
      
      scopeCache.current = { data: scope, timestamp: now };
      setUserScope(scope);
      setLastUserId(sanitizedUserId);
      return scope;
      
    } catch (error) {
      console.error('Error in fetchUserScope');
      setHasError(true);
      setError('Failed to load user permissions');
      setUserScope(null);
      
      // Clear cache on error
      scopeCache.current = { data: null, timestamp: 0 };
      
      throw error;
    } finally {
      setIsLoading(false);
      fetchAttempts.current = 0;
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
          console.error('Failed to initialize user scope');
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

  // Set up session validation
  useEffect(() => {
    if (user?.id && isValidUUID(user.id)) {
      // Validate immediately
      validateSession();
      
      // Set up periodic validation
      sessionCheckInterval.current = setInterval(validateSession, SESSION_VALIDATION_INTERVAL);
    }
    
    return () => {
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current);
      }
    };
  }, [user?.id, validateSession]);

  // Module access control with validation
  const canAccessModule = useCallback((modulePath: string, userType?: UserType): boolean => {
    const currentUserType = userType || userScope?.userType;
    
    if (!currentUserType) return false;
    
    // Sanitize module path
    const sanitizedPath = sanitizeInput(modulePath);
    
    const moduleMap: Record<UserType, string[]> = {
      system: ['/', '/system', '/entity-module', '/teacher', '/student', '/parent'],
      entity: ['/entity-module'],
      teacher: ['/teacher'],
      student: ['/student'],
      parent: ['/parent']
    };

    const allowedModules = moduleMap[currentUserType] || [];
    const hasAccess = allowedModules.some(module => sanitizedPath.startsWith(module));
    
    // Log sensitive access attempts
    if (sanitizedPath.includes('admin') || sanitizedPath.includes('settings')) {
      auditLog('sensitive_module_access', { 
        userId: userScope?.userId,
        module: sanitizedPath,
        granted: hasAccess 
      });
    }
    
    return hasAccess;
  }, [userScope]);

  // Tab visibility control with security checks
  const canViewTab = useCallback((tabName: string, adminLevel?: AdminLevel): boolean => {
    const currentAdminLevel = adminLevel || userScope?.adminLevel;
    
    if (!currentAdminLevel) return false;
    
    // Sanitize tab name
    const sanitizedTabName = sanitizeInput(tabName);
    
    const tabVisibilityMatrix: Record<string, AdminLevel[]> = {
      'structure': ['entity_admin', 'sub_entity_admin'],
      'schools': ['entity_admin', 'sub_entity_admin', 'school_admin'],
      'branches': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin'],
      'admins': ['entity_admin', 'sub_entity_admin'],
      'teachers': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin'],
      'students': ['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin']
    };

    const allowedLevels = tabVisibilityMatrix[sanitizedTabName] || [];
    return allowedLevels.includes(currentAdminLevel);
  }, [userScope]);

  // Action permission control with self-modification prevention
  const can = useCallback((action: string, targetUserId?: string, targetAdminLevel?: AdminLevel): boolean => {
    if (!userScope || !userScope.adminLevel) return false;
    
    // Sanitize inputs
    const sanitizedAction = sanitizeInput(action);
    const sanitizedTargetUserId = targetUserId ? sanitizeInput(targetUserId) : undefined;
    
    // SECURITY: Prevent self-modification for critical actions
    if (sanitizedTargetUserId && sanitizedTargetUserId === userScope.userId) {
      const restrictedSelfActions = [
        'deactivate_user', 
        'delete_user', 
        'change_admin_level',
        'remove_permissions',
        'modify_own_role'
      ];
      
      if (restrictedSelfActions.some(restricted => sanitizedAction.includes(restricted))) {
        auditLog('self_modification_blocked', { 
          userId: userScope.userId,
          action: sanitizedAction 
        });
        return false;
      }
    }
    
    // SECURITY: Prevent privilege escalation
    if (targetAdminLevel && sanitizedAction.includes('modify')) {
      const levelHierarchy: Record<AdminLevel, number> = {
        'entity_admin': 4,
        'sub_entity_admin': 3,
        'school_admin': 2,
        'branch_admin': 1
      };
      
      const currentLevel = levelHierarchy[userScope.adminLevel] || 0;
      const targetLevel = levelHierarchy[targetAdminLevel] || 0;
      
      if (targetLevel >= currentLevel && userScope.adminLevel !== 'entity_admin') {
        auditLog('privilege_escalation_blocked', { 
          userId: userScope.userId,
          action: sanitizedAction,
          targetLevel: targetAdminLevel 
        });
        return false;
      }
    }
    
    const permissionMatrix: Record<AdminLevel, Record<string, boolean>> = {
      entity_admin: {
        // Entity admin has all permissions
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
        // Sub-entity admin has limited admin management
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
        modify_entity_admin: false, // Cannot modify higher level
        modify_sub_admin: false, // Cannot modify same level
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
        // School admin - school level only
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
        delete_teacher: false, // Restricted
        delete_student: false, // Restricted
        view_audit_logs: false,
        export_data: false,
        manage_settings: false
      },
      branch_admin: {
        // Branch admin - most restricted
        create_school: false,
        create_branch: false,
        create_school_admin: false,
        create_branch_admin: false,
        create_teacher: false, // Restricted
        create_student: true,
        modify_school: false,
        modify_branch: false,
        modify_teacher: false,
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

    const hasPermission = permissionMatrix[userScope.adminLevel]?.[sanitizedAction] || false;
    
    // Log sensitive actions
    if (sanitizedAction.includes('delete') || sanitizedAction.includes('modify')) {
      auditLog('permission_check', { 
        userId: userScope.userId,
        action: sanitizedAction,
        targetUserId: sanitizedTargetUserId,
        granted: hasPermission 
      });
    }
    
    return hasPermission;
  }, [userScope]);

  // Scope-based query filters with validation
  const getScopeFilters = useCallback((resourceType?: 'schools' | 'branches' | 'users' | 'teachers' | 'students'): Record<string, any> => {
    if (!userScope) return { id: [] }; // Default deny all
    
    const { adminLevel, companyId, schoolIds, branchIds } = userScope;
    
    // Entity admin and sub-entity admin see everything in their company
    if (adminLevel === 'entity_admin' || adminLevel === 'sub_entity_admin') {
      return companyId ? { company_id: companyId } : { id: [] };
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

  // Get user context (read-only copy to prevent external modification)
  const getUserContext = useCallback((): CompleteUserScope | null => {
    if (!userScope) return null;
    // Return a deep copy to prevent external modification
    return JSON.parse(JSON.stringify(userScope));
  }, [userScope]);

  // Memoized values for performance
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