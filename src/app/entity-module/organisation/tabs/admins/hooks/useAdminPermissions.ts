///home/project/src/app/entity-module/organisation/tabs/admins/hooks/useAdminPermissions.ts

import { useQuery } from '@tanstack/react-query';
import { permissionService } from '../services/permissionService';
import { AdminPermissions } from '../types/admin.types';

export function useAdminPermissions(userId: string) {
  const {
    data: permissions,
    isLoading,
    isError,
    error,
  } = useQuery<AdminPermissions>(
    ['adminPermissions', userId],
    () => permissionService.getEffectivePermissions(userId),
    {
      // Add options if needed, e.g., staleTime, cacheTime
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      enabled: !!userId, // Only run query if userId is available
    }
  );

  // Helper function to check specific user-related permissions
  const can = (action: keyof AdminPermissions['users']): boolean => {
    return permissions?.users?.[action] || false;
  };

  // Helper function to check if user can manage schools
  const canManageSchools = (): boolean => {
    return permissions?.organization?.create_school || 
           permissions?.organization?.modify_school || 
           permissions?.organization?.delete_school || 
           permissions?.organization?.view_all_schools || false;
  };

  // Helper function to check if user can manage branches
  const canManageBranches = (): boolean => {
    return permissions?.organization?.create_branch || 
           permissions?.organization?.modify_branch || 
           permissions?.organization?.delete_branch || 
           permissions?.organization?.view_all_branches || false;
  };

  return {
    permissions,
    isLoading,
    isError,
    error,
    can,
    canManageSchools,
    canManageBranches,
  };
}