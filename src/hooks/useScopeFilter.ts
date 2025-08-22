// /src/hooks/useScopeFilter.ts

import { supabase } from '../lib/supabase';
import { useState, useEffect, useMemo } from 'react';
import { useUser } from '../contexts/UserContext';
import { scopeService } from '../app/entity-module/organisation/tabs/admins/services/scopeService';

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
  const { user } = useUser();
  const [userScopes, setUserScopes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adminLevel, setAdminLevel] = useState<string | null>(null);

  // Fetch user's scopes and admin level
  useEffect(() => {
    const fetchUserScopes = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        
        // Get user's admin level
        const { data: userData } = await supabase
          .from('entity_users')
          .select('admin_level')
          .eq('user_id', user.id)
          .maybeSingle();
        
        setAdminLevel(userData?.admin_level || null);
        
        // Entity admins have access to everything in their company
        if (userData?.admin_level === 'entity_admin') {
          setUserScopes([]);
          setIsLoading(false);
          return;
        }
        
        // For other admin levels, fetch their assigned scopes
        const scopes = await scopeService.getScopes(user.id);
        setUserScopes(scopes);
      } catch (error) {
        console.error('Error fetching user scopes:', error);
        setUserScopes([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserScopes();
  }, [user?.id]);

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