import React, { useState, useEffect, useRef } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { DataTable } from '../../../../components/shared/DataTable';
import { FilterCard } from '../../../../components/shared/FilterCard';
import { SlideInForm } from '../../../../components/shared/SlideInForm';
import { FormField, Input, Select, Textarea } from '../../../../components/shared/FormField';
import { StatusBadge } from '../../../../components/shared/StatusBadge';
import { Button } from '../../../../components/shared/Button';
import { PermissionsMatrix, type PermissionsMatrixRef, type Permission } from './PermissionsMatrix';
import { ConfirmationDialog } from '../../../../components/shared/ConfirmationDialog';
import { toast } from '../../../../components/shared/Toast';

const roleSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional()
});

type Role = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export default function RolesPage() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const permissionsMatrixRef = useRef<PermissionsMatrixRef>(null);
  
  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [rolesToDelete, setRolesToDelete] = useState<Role[]>([]);

  // Fetch roles with React Query
  const {
    data: roles = [],
    isLoading,
    isFetching
  } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch role permissions when editing role changes
  const { data: fetchedRolePermissions } = useQuery({
    queryKey: ['rolePermissions', editingRole?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role_id', editingRole!.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!editingRole?.id // Only run query when editing a role
  });

  // Handle side effect when data changes
  React.useEffect(() => {
    if (fetchedRolePermissions) {
      setRolePermissions(fetchedRolePermissions);
    }
  }, [fetchedRolePermissions]);

  // Create/update role mutation
  const roleMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const data = {
        name: formData.get('name') as string,
        description: formData.get('description') as string
      };

      const validatedData = roleSchema.parse(data);
      
      if (editingRole) {
        // Update existing role
        const { error } = await supabase
          .from('roles')
          .update(validatedData)
          .eq('id', editingRole.id);
          
        if (error) throw error;
        
        return { ...editingRole, ...validatedData };
      } else {
        // Create new role
        const { data: newRole, error } = await supabase
          .from('roles')
          .insert([validatedData])
          .select()
          .single();
          
        if (error) throw error;
        return newRole;
      }
    },
    onSuccess: async (data) => {
      // Get current permissions from the matrix
      const newPermissions = permissionsMatrixRef.current?.getPermissions() || [];

      try {
        // Delete existing permissions for this role
        const { error: deleteError } = await supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', data.id);

        if (deleteError) throw deleteError;

        // Insert new permissions if any exist
        if (newPermissions.length > 0) {
          const { error: insertError } = await supabase
            .from('role_permissions')
            .insert(
              newPermissions.map(p => ({
                role_id: data.id,
                path: p.path,
                can_access: p.can_access,
                can_view: p.can_view,
                can_create: p.can_create,
                can_edit: p.can_edit,
                can_delete: p.can_delete
              }))
            );

          if (insertError) throw insertError;
        }

        // Invalidate queries to refetch data
        queryClient.invalidateQueries({ queryKey: ['roles'] });
        queryClient.invalidateQueries({ queryKey: ['rolePermissions'] });

        setIsFormOpen(false);
        setEditingRole(null);
        setFormErrors({});
        toast.success(`Role ${editingRole ? 'updated' : 'created'} successfully`);
      } catch (error) {
        console.error('Error saving permissions:', error);
        toast.error('Failed to save permissions');
      }
    },
    onError: (error) => {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            errors[err.path[0]] = err.message;
          }
        });
        setFormErrors(errors);
      } else {
        console.error('Error saving role:', error);
        setFormErrors({ form: 'Failed to save role. Please try again.' });
        toast.error('Failed to save role');
      }
    }
  });

  // Delete roles mutation
  const deleteMutation = useMutation({
    mutationFn: async (roles: Role[]) => {
      const { error } = await supabase
        .from('roles')
        .delete()
        .in('id', roles.map(r => r.id));

      if (error) throw error;
      return roles;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setIsConfirmDialogOpen(false);
      setRolesToDelete([]);
      toast.success('Role(s) deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting roles:', error);
      toast.error('Failed to delete role(s)');
      setIsConfirmDialogOpen(false);
      setRolesToDelete([]);
    }
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    roleMutation.mutate(new FormData(e.currentTarget));
  };

  const handleDelete = (roles: Role[]) => {
    setRolesToDelete(roles);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(rolesToDelete);
  };

  const cancelDelete = () => {
    setIsConfirmDialogOpen(false);
    setRolesToDelete([]);
  };

  const columns = [
    {
      id: 'name',
      header: 'Name',
      accessorKey: 'name',
      enableSorting: true,
    },
    {
      id: 'description',
      header: 'Description',
      accessorKey: 'description',
      enableSorting: true,
    },
    {
      id: 'created_at',
      header: 'Created At',
      accessorKey: 'created_at',
      enableSorting: true,
      cell: (row: Role) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Roles & Permissions</h2>
        <Button
          onClick={() => {
            setEditingRole(null);
            setIsFormOpen(true);
          }}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add Role
        </Button>
      </div>

      <DataTable
        data={roles}
        columns={columns}
        keyField="id"
        caption="List of user roles with their descriptions and creation dates"
        ariaLabel="User roles data table"
        loading={isLoading}
        isFetching={isFetching}
        onEdit={(role) => {
          setEditingRole(role);
          setIsFormOpen(true);
        }}
        onDelete={handleDelete}
        emptyMessage="No roles found"
      />

      <SlideInForm
        title={editingRole ? 'Edit Role' : 'Create Role'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingRole(null);
          setFormErrors({});
        }}
        onSave={() => {
          const form = document.querySelector('form');
          if (form) form.requestSubmit();
        }}
        width="xl"
        loading={roleMutation.isLoading}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.form && (
            <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
              {formErrors.form}
            </div>
          )}

          <FormField
            id="name"
            label="Name"
            required
            error={formErrors.name}
          >
            <Input
              id="name"
              name="name"
              placeholder="Enter role name"
              defaultValue={editingRole?.name}
            />
          </FormField>

          <FormField
            id="description"
            label="Description"
            error={formErrors.description}
          >
            <Textarea
              id="description"
              name="description"
              placeholder="Enter role description"
              defaultValue={editingRole?.description || ''}
              rows={3}
            />
          </FormField>

          {(editingRole || !isFormOpen) && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Permissions Matrix</h3>
              <PermissionsMatrix
                ref={permissionsMatrixRef}
                roleId={editingRole?.id || ''}
                initialPermissions={rolePermissions}
                className="border border-gray-200 dark:border-gray-700 rounded-lg"
              />
            </div>
          )}
        </form>
      </SlideInForm>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        title="Delete Role"
        message={`Are you sure you want to delete ${rolesToDelete.length} role(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}