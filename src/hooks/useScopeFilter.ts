// /src/hooks/useScopeFilter.ts

import { supabase } from '../lib/supabase';
import { useState, useEffect, useMemo } from 'react';
import { useUser } from '../contexts/UserContext';
import { scopeService } from '../app/entity-module/organisation/tabs/admins/services/scopeService';
import { usePermissions } from '../contexts/PermissionContext';

interface ScopeFilterOptions {
  entityType: 'school' | 'branch';
  companyId: string;
  requireActiveStatus?: boolean;
}

interface ScopeFilterResult<T> {
  filteredData: T[];
  isLoading: boolean;
  hasAccess: (entityId: string) => boolean;
  canAccessAll: boolean;
  scopeInfo: {
    assignedSchools: string[];
    assignedBranches: string[];
    totalAssigned: number;
  };
}

/**
 * Hook to filter data based on user's assigned scopes
 * Returns only the entities the user has access to
 */
export function useScopeFilter<T extends { id: string }>(
  data: T[],
  options: ScopeFilterOptions
): ScopeFilterResult<T> {
  const { user } = useUser();
  const { adminLevel } = usePermissions();
  const [userScopes, setUserScopes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scopeInfo, setScopeInfo] = useState({
    assignedSchools: [] as string[],
    assignedBranches: [] as string[],
    totalAssigned: 0
  });

  // Fetch user's scopes and admin level
  useEffect(() => {
    const fetchUserScopes = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Entity admins have access to everything in their company
        if (adminLevel === 'entity_admin') {
          setUserScopes([]);
          setScopeInfo({
            assignedSchools: [],
            assignedBranches: [],
            totalAssigned: 0
          });
          setIsLoading(false);
          return;
        }
        
        // For other admin levels, fetch their assigned scopes
        const scopes = await scopeService.getScopes(user.id);
        setUserScopes(scopes);
        
        // Calculate scope info
        const assignedSchools = scopes
          .filter(scope => scope.scope_type === 'school')
          .map(scope => scope.scope_id);
        const assignedBranches = scopes
          .filter(scope => scope.scope_type === 'branch')
          .map(scope => scope.scope_id);
        
        setScopeInfo({
          assignedSchools,
          assignedBranches,
          totalAssigned: assignedSchools.length + assignedBranches.length
        });
      } catch (error) {
        console.error('Error fetching user scopes:', error);
        setUserScopes([]);
        setScopeInfo({
          assignedSchools: [],
          assignedBranches: [],
          totalAssigned: 0
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserScopes();
  }, [user?.id, adminLevel]);

  // Determine if user can access all entities (entity admin)
  const canAccessAll = useMemo(() => {
    return adminLevel === 'entity_admin';
  }, [adminLevel]);

  // Function to check if user has access to a specific entity
  const hasAccess = useMemo(() => {
    return (entityId: string): boolean => {
      // Entity admins have access to everything
      if (canAccessAll) return true;
      
      // If no scopes assigned, no access (except for entity admins)
      if (userScopes.length === 0) return false;
      
      // Check if entity is in user's assigned scopes
      const hasDirectAccess = userScopes.some(scope => 
        scope.scope_type === options.entityType && 
        scope.scope_id === entityId &&
        (!options.requireActiveStatus || scope.is_active !== false)
      );
      
      // For branches, also check if user has access to the parent school
      if (!hasDirectAccess && options.entityType === 'branch') {
        // Find the school that owns this branch
        const branchData = data.find(item => item.id === entityId) as any;
        if (branchData?.school_id) {
          return userScopes.some(scope => 
            scope.scope_type === 'school' && 
            scope.scope_id === branchData.school_id &&
            (!options.requireActiveStatus || scope.is_active !== false)
          );
        }
      }
      
      return hasDirectAccess;
    };
  }, [canAccessAll, userScopes, options.entityType]);

  // Filter data based on user's access
  const filteredData = useMemo(() => {
    if (canAccessAll) {
      return data; // Entity admins see everything
    }
    
    // Filter to only entities the user has access to
    return data.filter(item => hasAccess(item.id));
  }, [data, canAccessAll, hasAccess]);

  return {
    filteredData,
    isLoading,
    hasAccess,
    canAccessAll,
    scopeInfo
  };
}