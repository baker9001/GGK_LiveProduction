/**
 * File: /src/app/entity-module/organisation/tabs/admins/hooks/useAdminScope.ts
 * 
 * Admin Scope Management Hooks
 * Custom React Query hooks for managing admin scope assignments
 * 
 * Dependencies:
 *   - @tanstack/react-query
 *   - ../services/scopeService
 *   - ../types/admin.types
 *   - @/components/shared/Toast
 * 
 * Hooks:
 *   - useAdminScope: Fetch admin's assigned scopes
 *   - useAssignScope: Assign new scope to admin
 *   - useRemoveScope: Remove scope from admin
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scopeService } from '../services/scopeService';
import { EntityAdminScope } from '../types/admin.types';
import { toast } from '@/components/shared/Toast';

/**
 * Hook to fetch an admin's assigned scopes.
 * @param userId The ID of the admin user.
 */
export function useAdminScope(userId: string) {
  return useQuery<EntityAdminScope[]>(
    ['adminScopes', userId],
    () => scopeService.getScopes(userId),
    {
      enabled: !!userId, // Only run the query if userId is provided
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    }
  );
}

/**
 * Hook to assign a new scope to an admin.
 * @param userId The ID of the admin user.
 * @param onSuccess Optional callback to run on successful assignment.
 */
export function useAssignScope(userId: string, onSuccess?: () => void) {
  const queryClient = useQueryClient();
  
  return useMutation(
    (scope: Omit<EntityAdminScope, 'id' | 'user_id' | 'assigned_at'>) =>
      scopeService.assignScope(userId, scope),
    {
      onSuccess: () => {
        toast.success('Scope assigned successfully!');
        queryClient.invalidateQueries(['adminScopes', userId]); // Invalidate assigned scopes
        onSuccess?.();
      },
      onError: (error: any) => {
        console.error('Error assigning scope:', error);
        toast.error(error.message || 'Failed to assign scope.');
      },
    }
  );
}

/**
 * Hook to remove an existing scope from an admin.
 * @param userId The ID of the admin user.
 * @param onSuccess Optional callback to run on successful removal.
 */
export function useRemoveScope(userId: string, onSuccess?: () => void) {
  const queryClient = useQueryClient();
  
  return useMutation(
    (scopeId: string) => scopeService.removeScope(userId, scopeId),
    {
      onSuccess: () => {
        toast.success('Scope removed successfully!');
        queryClient.invalidateQueries(['adminScopes', userId]); // Invalidate assigned scopes
        onSuccess?.();
      },
      onError: (error: any) => {
        console.error('Error removing scope:', error);
        toast.error(error.message || 'Failed to remove scope.');
      },
    }
  );
}