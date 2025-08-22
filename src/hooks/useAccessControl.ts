/**
 * File: /src/hooks/useAccessControl.ts
 * 
 * PHASE 2: React Hook Wrapper for AccessControl
 * Provides React-friendly interface to the AccessControl class
 * 
 * Dependencies:
 *   - /src/lib/access (Phase 1)
 *   - /src/contexts/UserContext
 *   - External: react
 * 
 * Features:
 *   - Automatic user scope loading
 *   - Loading state management
 *   - Convenience flags for admin levels
 *   - Memoized permission checks for performance
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { AccessControl, AdminLevel, UserType, CompleteUserScope } from '../lib/access';
import { useUser } from '../contexts/UserContext';

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

// Singleton instance of AccessControl
const accessControl = AccessControl.getInstance();

export function useAccessControl(): UseAccessControlResult {
  const { user, isLoading: isUserLoading } = useUser();
  const [isLoadingAccessControl, setIsLoadingAccessControl] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initializedUser, setInitializedUser] = useState<CompleteUserScope | null>(null);
  const [lastUserId, setLastUserId] = useState<string | null>(null);

  // Initialize user context when user changes
  useEffect(() => {
    const initializeUserContext = async () => {
      // Don't initialize if user is still loading
      if (isUserLoading) {
        setIsLoadingAccessControl(true);
        return;
      }

      // Clear context if no user
      if (!user?.id) {
        accessControl.clearContext();
        setInitializedUser(null);
        setLastUserId(null);
        setIsLoadingAccessControl(false);
        setHasError(false);
        setError(null);
        return;
      }

      // Skip if same user is already initialized
      if (user.id === lastUserId && initializedUser) {
        setIsLoadingAccessControl(false);
        return;
      }

      try {
        setIsLoadingAccessControl(true);
        setHasError(false);
        setError(null);

        console.log('Initializing access control for user:', user.id);
        const userContext = await accessControl.initializeUser(user.id);
        
        setInitializedUser(userContext);
        setLastUserId(user.id);
        
        console.log('Access control initialized:', userContext);
      } catch (err) {
        console.error('Failed to initialize access control:', err);
        setHasError(true);
        setError(err instanceof Error ? err.message : 'Failed to load permissions');
        setInitializedUser(null);
      } finally {
        setIsLoadingAccessControl(false);
      }
    };

    initializeUserContext();
  }, [user?.id, isUserLoading, lastUserId, initializedUser]);

  // Refresh scope data
  const refreshScope = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoadingAccessControl(true);
      setHasError(false);
      setError(null);

      const userContext = await accessControl.initializeUser(user.id);
      setInitializedUser(userContext);
    } catch (err) {
      console.error('Failed to refresh scope:', err);
      setHasError(true);
      setError(err instanceof Error ? err.message : 'Failed to refresh permissions');
    } finally {
      setIsLoadingAccessControl(false);
    }
  }, [user?.id]);

  // Clear cache
  const clearCache = useCallback(() => {
    accessControl.clearContext();
    setInitializedUser(null);
    setLastUserId(null);
    setHasError(false);
    setError(null);
  }, []);

  // Memoized values for performance
  const isAuthenticated = useMemo(() => {
    return accessControl.isAuthenticated();
  }, [initializedUser]);

  const userAdminLevel = useMemo(() => {
    return accessControl.getAdminLevel();
  }, [initializedUser]);

  const isEntityAdmin = useMemo(() => {
    return userAdminLevel === 'entity_admin';
  }, [userAdminLevel]);

  const isSubEntityAdmin = useMemo(() => {
    return userAdminLevel === 'sub_entity_admin';
  }, [userAdminLevel]);

  const isSchoolAdmin = useMemo(() => {
    return userAdminLevel === 'school_admin';
  }, [userAdminLevel]);

  const isBranchAdmin = useMemo(() => {
    return userAdminLevel === 'branch_admin';
  }, [userAdminLevel]);

  // Memoized bound methods to prevent unnecessary re-renders
  const canAccessModule = useCallback((modulePath: string, userType?: UserType) => {
    return accessControl.canAccessModule(modulePath, userType);
  }, [initializedUser]);

  const canViewTab = useCallback((tabName: string, adminLevel?: AdminLevel) => {
    return accessControl.canViewTab(tabName, adminLevel);
  }, [initializedUser]);

  const can = useCallback((action: string, targetUserId?: string, targetAdminLevel?: AdminLevel) => {
    return accessControl.can(action, targetUserId, targetAdminLevel);
  }, [initializedUser]);

  const getScopeFilters = useCallback((resourceType?: 'schools' | 'branches' | 'users' | 'teachers' | 'students') => {
    return accessControl.getScopeFilters(resourceType);
  }, [initializedUser]);

  const getUserContext = useCallback(() => {
    return accessControl.getUserContext();
  }, [initializedUser]);

  return {
    // Core methods
    canAccessModule,
    canViewTab,
    can,
    getScopeFilters,
    getUserContext,
    
    // State
    isLoading: isLoadingAccessControl,
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