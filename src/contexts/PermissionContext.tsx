// src/contexts/PermissionContext.tsx
// FIXED VERSION WITH BETTER ERROR HANDLING FOR WEBCONTAINER

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase, checkSupabaseConnection } from '@/lib/supabase';
import { useUser } from './UserContext';
import { permissionService } from '@/app/entity-module/organisation/tabs/admins/services/permissionService';
import { AdminPermissions, AdminLevel } from '@/app/entity-module/organisation/tabs/admins/types/admin.types';

interface PermissionContextType {
  permissions: AdminPermissions | null;
  adminLevel: AdminLevel | null;
  isLoading: boolean;
  error: string | null;
  refreshPermissions: () => Promise<void>;
  hasPermission: (category: keyof AdminPermissions, permission: string, scopeId?: string, scopeType?: 'company' | 'school' | 'branch') => boolean;
  canCreate: (resource: string) => boolean;
  canModify: (resource: string) => boolean;
  canDelete: (resource: string) => boolean;
  canView: (resource: string) => boolean;
  retryConnection: () => Promise<void>;
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
  cacheTimeout?: number;
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
  const [retryCount, setRetryCount] = useState(0);
  
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

  // Retry connection function
  const retryConnection = useCallback(async () => {
    setError(null);
    setRetryCount(prev => prev + 1);
    const { connected, error: connectionError } = await checkSupabaseConnection();
    if (connected) {
      await fetchPermissions();
    } else {
      setError(connectionError || 'Unable to connect to database. Please check your connection.');
    }
  }, []);

  // Fetch user permissions with enhanced error handling
  const fetchPermissions = useCallback(async () => {
    if (!user?.id || user.id === 'undefined' || user.id === 'null' || typeof user.id !== 'string' || user.id.trim() === '') {
      console.warn('[PermissionContext] Invalid user ID detected:', { userId: user?.id, userType: typeof user?.id });
      setPermissions(null);
      setAdminLevel(null);
      setError(null); // No error if no user
      setIsLoading(false);
      return;
    }

    // Check if this is a test/mock user (non-UUID format)
    const isTestUser = !user.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    
    if (isTestUser) {
      console.log('[PermissionContext] Test user detected, setting mock permissions:', { userId: user.id });
      setPermissions(permissionService.getMinimalPermissions());
      setAdminLevel('entity_admin'); // Set appropriate test admin level
      setError(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Check connection first
      const { connected: isConnected, error: connectionError } = await checkSupabaseConnection();
      if (!isConnected) {
        console.warn('Supabase connection failed, using offline mode:', connectionError);
        setPermissions(permissionService.getMinimalPermissions());
        setAdminLevel('entity_admin');
        setError(connectionError || 'Working in offline mode. Some features may be limited.');
        setIsLoading(false);
        return;
      }
      
      // Get user's admin record with retry logic
      let adminUser = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts && !adminUser) {
        try {
          const { data, error: adminError } = await supabase
            .from('entity_users')
            .select('admin_level, permissions, is_active, company_id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .maybeSingle();
          
          if (adminError && adminError.code !== 'PGRST116') {
            throw adminError;
          }
          
          adminUser = data;
          break;
        } catch (err: any) {
          attempts++;
          console.warn(`Attempt ${attempts} failed:`, err);
          
          if (attempts < maxAttempts) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
          } else {
            throw err;
          }
        }
      }

      // If user is not an entity admin, set minimal permissions
      if (!adminUser) {
        console.log('User is not an entity admin, setting minimal permissions');
        setPermissions(permissionService.getMinimalPermissions());
        setAdminLevel(null);
        setIsLoading(false);
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
      
      console.log('✅ Permissions loaded successfully');
      
    } catch (error: any) {
      console.error('Error fetching permissions:', error);
      
      // Handle specific error types
      if (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('TypeError') || 
          error?.message?.includes('NetworkError') ||
          error?.name === 'TypeError') {
        console.warn('Network error detected, falling back to offline mode');
        setPermissions(permissionService.getMinimalPermissions());
        setAdminLevel('entity_admin');
        setError('Working in offline mode. Please check your internet connection.');
      } else if (error?.code === 'PGRST116') {
        // Table doesn't exist or user doesn't have access
        setPermissions(permissionService.getMinimalPermissions());
        setAdminLevel(null);
        setError(null); // This is expected for non-admin users
      } else {
        console.warn('Unknown error, falling back to minimal permissions');
        setPermissions(permissionService.getMinimalPermissions());
        setAdminLevel(null);
        setError(error?.message || 'Failed to load permissions');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Initial fetch and subscription to changes
  useEffect(() => {
    fetchPermissions();

    // Only set up subscriptions if we have a user
    if (user?.id) {
      // Check if we can establish connection before setting up subscriptions
      checkSupabaseConnection().then(({ connected: isConnected, error: connectionError }) => {
        if (!isConnected) {
          console.warn('Skipping subscription setup due to connection failure', connectionError);
          return;
        }

        // Only proceed with subscriptions if connection is successful
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

        // Return cleanup function
        return () => {
          subscription.unsubscribe();
          scopeSubscription.unsubscribe();
        };
      });
    }
  }, [user?.id, fetchPermissions]);

  // Separate effect for cleanup when user changes
  useEffect(() => {
    return () => {
      // Cleanup any existing subscriptions when user changes
      const subscription = supabase
        .channel(`permissions_${user?.id || 'cleanup'}`)
        .unsubscribe();
      const scopeSubscription = supabase
        .channel(`scopes_${user?.id || 'cleanup'}`)
        .unsubscribe();
    };
  }, [user?.id]);

  // Permission checking functions
  const hasPermission = useCallback((
    category: keyof AdminPermissions, 
    permission: string, 
    scopeId?: string, 
    scopeType?: 'company' | 'school' | 'branch'
  ): boolean => {
    if (!permissions) return false;
    
    checkCacheValidity();
    const cacheKey = `${category}.${permission}${scopeId ? `.${scopeType}.${scopeId}` : ''}`;
    
    if (permissionCache.current.has(cacheKey)) {
      return permissionCache.current.get(cacheKey)!;
    }
    
    // Check base permission first
    const hasBasePermission = (permissions[category] as any)?.[permission] || false;
    
    // TODO: Add scope-specific permission checking if needed
    
    permissionCache.current.set(cacheKey, hasBasePermission);
    return hasBasePermission;
  }, [permissions, checkCacheValidity]);

  // Resource-based permission helpers
  const canCreate = useCallback((resource: string) => {
    return hasPermission('users', `create_${resource}`) || 
           hasPermission('schools', `create_${resource}`) ||
           hasPermission('branches', `create_${resource}`);
  }, [hasPermission]);

  const canModify = useCallback((resource: string) => {
    return hasPermission('users', `modify_${resource}`) ||
           hasPermission('schools', `modify_${resource}`) ||
           hasPermission('branches', `modify_${resource}`);
  }, [hasPermission]);

  const canDelete = useCallback((resource: string) => {
    return hasPermission('users', `delete_${resource}`) ||
           hasPermission('schools', `delete_${resource}`) ||
           hasPermission('branches', `delete_${resource}`);
  }, [hasPermission]);

  const canView = useCallback((resource: string) => {
    return hasPermission('users', `view_${resource}`) ||
           hasPermission('schools', `view_${resource}`) ||
           hasPermission('branches', `view_${resource}`) ||
           true; // Default to allowing view access
  }, [hasPermission]);

  const value: PermissionContextType = {
    permissions,
    adminLevel,
    isLoading,
    error,
    refreshPermissions: fetchPermissions,
    hasPermission,
    canCreate,
    canModify,
    canDelete,
    canView,
    retryConnection
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};