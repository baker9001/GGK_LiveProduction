import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '../../../../../../components/shared/Toast';
import { adminService } from '../services/adminService';
import { AdminUser, CreateAdminPayload, UpdateAdminPayload } from '../types/admin.types';
import { useUser } from '../../../../../../contexts/UserContext';

/**
 * Custom hooks for admin-related mutations using React Query.
 * Each hook handles success/failure toasts and query invalidation.
 */

export function useCreateAdmin(onSuccess?: (data: AdminUser) => void) {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: (payload: CreateAdminPayload) => adminService.createAdmin({
      ...payload,
      actor_id: user?.id || ''
    }),
    onSuccess: (data) => {
      toast.success('Admin created successfully!');
      queryClient.invalidateQueries({ queryKey: ['admins'] }); // Invalidate the admin list
      queryClient.invalidateQueries({ queryKey: ['adminHierarchy'] }); // Invalidate hierarchy if it depends on admin list
      onSuccess?.(data);
    },
    onError: (error: any) => {
      console.error('Error creating admin:', error);
      toast.error(error.message || 'Failed to create admin.');
    }
  });
}

export function useUpdateAdmin(onSuccess?: (data: AdminUser) => void) {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: Omit<UpdateAdminPayload, 'actor_id'> }) =>
      adminService.updateAdmin(userId, {
        ...updates,
        actor_id: user?.id || ''
      }),
    onSuccess: (data) => {
      toast.success('Admin updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['admins'] }); // Invalidate the admin list
      queryClient.invalidateQueries({ queryKey: ['admin', data.id] }); // Invalidate specific admin details
      queryClient.invalidateQueries({ queryKey: ['adminHierarchy'] }); // Invalidate hierarchy
      onSuccess?.(data);
    },
    onError: (error: any) => {
      console.error('Error updating admin:', error);
      toast.error(error.message || 'Failed to update admin.');
    }
  });
}

export function useDeleteAdmin(onSuccess?: (userId: string) => void) {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: (userId: string) => adminService.deleteAdmin(userId, user?.id || ''),
    onSuccess: (userId) => {
      toast.success('Admin deactivated successfully!');
      queryClient.invalidateQueries({ queryKey: ['admins'] }); // Invalidate the admin list
      queryClient.invalidateQueries({ queryKey: ['adminHierarchy'] }); // Invalidate hierarchy
      onSuccess?.(userId);
    },
    onError: (error: any) => {
      console.error('Error deactivating admin:', error);
      toast.error(error.message || 'Failed to deactivate admin.');
    }
  });
}

export function useRestoreAdmin(onSuccess?: (userId: string) => void) {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: (userId: string) => adminService.restoreAdmin(userId, user?.id || ''),
    onSuccess: (userId) => {
      toast.success('Admin restored successfully!');
      queryClient.invalidateQueries({ queryKey: ['admins'] }); // Invalidate the admin list
      queryClient.invalidateQueries({ queryKey: ['adminHierarchy'] }); // Invalidate hierarchy
      onSuccess?.(userId);
    },
    onError: (error: any) => {
      console.error('Error restoring admin:', error);
      toast.error(error.message || 'Failed to restore admin.');
    }
  });
}