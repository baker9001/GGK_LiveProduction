// /src/hooks/useScopeFilter.ts

import { supabase } from '../lib/supabase';
import { useState, useEffect, useMemo } from 'react';
import { usePermissions } from '../contexts/PermissionContext';

interface ScopeFilterOptions {
  entityType: 'school' | 'branch';
  companyId: string;
}

interface ScopeFilterResult<T> {
  filteredData: T[];
  isLoading: boolean;
  hasAccess: (entityId: string) => boolean;
  canAccessAll: boolean;
}

/**
 * Hook to filter data based on user's assigned scopes
 * Returns only the entities the user has access to
 */
export function useScopeFilter<T extends { id: string }>(
  data: T[],
  options: ScopeFilterOptions
): ScopeFilterResult<T> {
  const { userScopes, adminLevel, isLoading } = usePermissions();

  // Determine if user can access all entities (entity admin)
  const canAccessAll = useMemo(() => {
    return adminLevel === 'entity_admin';
  }, [adminLevel]);

  // Function to check if user has access to a specific entity
  const hasAccess = useMemo(() => {
    return (entityId: string): boolean => {
      // Entity admins have access to everything
      if (canAccessAll) return true;
      
      // Check if entity is in user's assigned scopes
      return userScopes.some(scope => 
        scope.scope_type === options.entityType && scope.scope_id === entityId
      );
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
    canAccessAll
  };
}