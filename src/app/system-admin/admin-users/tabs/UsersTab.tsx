// /src/app/system-admin/admin-users/tabs/UsersTab.tsx
// Standardized System Admin user management with enhanced user service

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, EyeOff, RefreshCw, Loader2 } from 'lucide-react';
import { DataTable } from '../../../../components/shared/DataTable';
import { SlideInForm } from '../../../../components/shared/SlideInForm';
import { Button } from '../../../../components/shared/Button';
import { FormField, Input, Select } from '../../../../components/shared/FormField';
import { ConfirmationDialog } from '../../../../components/shared/ConfirmationDialog';
import { toast } from '../../../../components/shared/Toast';
import { supabase } from '../../../../lib/supabase';
import { userService, systemUserSchema, UserServiceError, type UserResponse } from '../../../../services/userService';
import { z } from 'zod';

// ===== TYPE DEFINITIONS =====
interface AdminUser {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  role_id: string;
  created_at: string;
  roles?: {
    id: string;
    name: string;
  };
  email_verified?: boolean;
}

interface Role {
  id: string;
  name: string;
  description: string;
}

interface FormState {
  name: string;
  email: string;
  password?: string;
  role_id: string;
  status: 'active' | 'inactive';
}

// ===== MAIN COMPONENT =====
export default function UsersTab() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [formState, setFormState] = useState<FormState>({
    name: '',
    email: '',
    password: '',
    role_id: '',
    status: 'active'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [usersToDelete, setUsersToDelete] = useState<AdminUser[]>([]);

  // ===== QUERIES =====
  
  // Fetch admin users
  const { data: users = [], isLoading, isFetching } = useQuery(
    ['admin-users'],
    async () => {
      const { data, error } = await supabase
        .from('admin_users')
        .select(`
          id,
          name,
          email,
          status,
          role_id,
          created_at,
          roles:role_id (
            id,
            name,
            description
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Check email verification status from users table
      const userIds = data.map(u => u.id);
      const { data: verificationStatus } = await supabase
        .from('users')
        .select('id, email_verified')
        .in('id', userIds);

      const verificationMap = new Map(
        verificationStatus?.map(v => [v.id, v.email_verified])
      );

      return data.map(user => ({
        ...user,
        email_verified: verificationMap.get(user.id) || false
      }));
    }
  );

  // Fetch roles
  const { data: roles = [] } = useQuery(
    ['roles'],
    async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    }
  );

  // ===== MUTATIONS =====
  
  // Create/update user mutation using standardized service
  const userMutation = useMutation(
    async (formData: FormData) => {
      const passwordValue = formData.get('password') as string | null;
      
      const data = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        role_id: formData.get('role_id') as string,
        status: formData.get('status') as 'active' | 'inactive',
        ...(passwordValue && { password: passwordValue })
      };

      try {
        if (editingUser) {
          // UPDATE EXISTING USER
          
          // Check if email is being changed
          const emailChanged = editingUser.email !== data.email;
          
          if (emailChanged) {
            const emailAvailable = await userService.isEmailAvailable(data.email, editingUser.id);
            if (!emailAvailable) {
              throw new UserServiceError('Email already exists');
            }
          }

          // Update via API
          await userService.updateUser(editingUser.id, {
            name: data.name,
            email: data.email,
            is_active: data.status === 'active'
          });

          // Update role in admin_users table
          const { error: roleError } = await supabase
            .from('admin_users')
            .update({
              role_id: data.role_id,
              status: data.status,
              name: data.name,
              email: data.email
            })
            .eq('id', editingUser.id);

          if (roleError) throw roleError;

          return { ...editingUser, ...data, type: 'update' };
        } else {
          // CREATE NEW USER via standardized service
          
          // Validate with schema
          const validatedData = systemUserSchema.parse({
            ...data,
            user_type: 'system',
            is_active: data.status === 'active'
          });

          // Check email availability
          const emailAvailable = await userService.isEmailAvailable(validatedData.email);
          if (!emailAvailable) {
            throw new UserServiceError('Email already exists');
          }

          // Create user via API
          const newUser = await userService.createSystemAdmin({
            email: validatedData.email,
            name: validatedData.name,
            password: validatedData.password!,
            role_id: validatedData.role_id,
            is_active: validatedData.is_active
          });

          // Also create in admin_users table for backward compatibility
          const { error: adminError } = await supabase
            .from('admin_users')
            .insert({
              id: newUser.id,
              name: validatedData.name,
              email: validatedData.email,
              role_id: validatedData.role_id,
              status: data.status,
              password_hash: 'handled_by_api' // Placeholder as API handles this
            });

          if (adminError && !adminError.message?.includes('duplicate')) {
            console.error('Error creating admin_users record:', adminError);
          }

          return { ...newUser, type: 'create' };
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errors: Record<string, string> = {};
          error.errors.forEach(err => {
            if (err.path.length > 0) {
              errors[err.path[0] as string] = err.message;
            }
          });
          throw { validationErrors: errors };
        }
        throw error;
      }
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['admin-users']);
        setIsFormOpen(false);
        setEditingUser(null);
        setFormErrors({});
        setFormState({
          name: '',
          email: '',
          password: '',
          role_id: '',
          status: 'active'
        });
        
        const action = data.type === 'update' ? 'updated' : 'created';
        toast.success(`User ${action} successfully`);
      },
      onError: (error: any) => {
        if (error.validationErrors) {
          setFormErrors(error.validationErrors);
        } else if (error instanceof UserServiceError) {
          setFormErrors({ form: error.message });
          toast.error(error.message);
        } else {
          console.error('Error saving user:', error);
          setFormErrors({ form: error.message || 'Failed to save user. Please try again.' });
          toast.error('Failed to save user');
        }
      }
    }
  );

  // Resend verification email
  const resendVerificationMutation = useMutation(
    async (user: AdminUser) => {
      await userService.sendVerificationEmail(user.id);
    },
    {
      onSuccess: () => {
        toast.success('Verification email sent successfully');
      },
      onError: (error) => {
        console.error('Error sending verification:', error);
        toast.error('Failed to send verification email');
      }
    }
  );

  // Delete users mutation using standardized service
  const deleteMutation = useMutation(
    async (users: AdminUser[]) => {
      // Delete via API (handles all cleanup)
      await userService.deleteUsers(users.map(u => u.id));
      return users;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['admin-users']);
        setIsConfirmDialogOpen(false);
        setUsersToDelete([]);
        toast.success('User(s) deleted successfully');
      },
      onError: (error) => {
        console.error('Error deleting users:', error);
        toast.error('Failed to delete user(s)');
        setIsConfirmDialogOpen(false);
        setUsersToDelete([]);
      }
    }
  );

  // Password reset mutation
  const resetPasswordMutation = useMutation(
    async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      // Validate password
      const validation = userService.validatePassword(newPassword);
      if (!validation.valid) {
        throw new UserServiceError(validation.errors.join(', '));
      }

      // Update password via API
      await userService.updateUser(userId, { password: newPassword });
    },
    {
      onSuccess: () => {
        toast.success('Password updated successfully');
      },
      onError: (error) => {
        console.error('Error updating password:', error);
        if (error instanceof UserServiceError) {
          toast.error(error.message);
        } else {
          toast.error('Failed to update password');
        }
      }
    }
  );

  // ===== EFFECTS =====
  
  // Update form state when editing user changes
  useEffect(() => {
    if (editingUser) {
      setFormState({
        name: editingUser.name,
        email: editingUser.email,
        role_id: editingUser.role_id,
        status: editingUser.status
      });
    } else {
      setFormState({
        name: '',
        email: '',
        password: '',
        role_id: '',
        status: 'active'
      });
    }
  }, [editingUser]);

  // ===== HANDLERS =====
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors({});
    userMutation.mutate(new FormData(e.currentTarget));
  };

  const handleDelete = (users: AdminUser[]) => {
    setUsersToDelete(users);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(usersToDelete);
  };

  const cancelDelete = () => {
    setIsConfirmDialogOpen(false);
    setUsersToDelete([]);
  };

  const handleResendVerification = (user: AdminUser) => {
    resendVerificationMutation.mutate(user);
  };

  // ===== TABLE COLUMNS =====
  
  const columns = [
    {
      id: 'name',
      header: 'Name',
      accessorKey: 'name',
      enableSorting: true,
      cell: (row: AdminUser) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white">
            {row.name}
          </span>
          {!row.email_verified && (
            <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-full">
              Unverified
            </span>
          )}
        </div>
      )
    },
    {
      id: 'email',
      header: 'Email',
      accessorKey: 'email',
      enableSorting: true,
      cell: (row: AdminUser) => (
        <div className="flex items-center gap-2">
          <span className="text-gray-600 dark:text-gray-300">{row.email}</span>
          {!row.email_verified && (
            <button
              onClick={() => handleResendVerification(row)}
              className="p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              title="Resend verification email"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          )}
        </div>
      )
    },
    {
      id: 'role',
      header: 'Role',
      accessorKey: 'roles.name',
      enableSorting: true,
      cell: (row: AdminUser) => (
        <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded-full">
          {row.roles?.name || 'No Role'}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      enableSorting: true,
      cell: (row: AdminUser) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          row.status === 'active'
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        }`}>
          {row.status}
        </span>
      ),
    },
    {
      id: 'created_at',
      header: 'Created At',
      accessorKey: 'created_at',
      enableSorting: true,
      cell: (row: AdminUser) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  // ===== RENDER =====
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">System Users</h2>
        <Button
          onClick={() => {
            setEditingUser(null);
            setFormErrors({});
            setIsFormOpen(true);
          }}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add User
        </Button>
      </div>

      <DataTable
        data={users}
        columns={columns}
        keyField="id"
        caption="List of system administrators and their roles"
        ariaLabel="System users data table"
        loading={isLoading}
        isFetching={isFetching}
        onEdit={(user) => {
          setEditingUser(user);
          setFormErrors({});
          setIsFormOpen(true);
        }}
        onDelete={handleDelete}
        emptyMessage="No users found"
      />

      <SlideInForm
        title={editingUser ? 'Edit System User' : 'Create System User'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingUser(null);
          setFormErrors({});
        }}
        onSave={() => {
          const form = document.querySelector('form');
          if (form) form.requestSubmit();
        }}
        loading={userMutation.isLoading}
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
              placeholder="Enter name"
              value={formState.name}
              onChange={(e) => setFormState({ ...formState, name: e.target.value })}
            />
          </FormField>

          <FormField
            id="email"
            label="Email"
            required
            error={formErrors.email}
          >
            <Input
              type="email"
              id="email"
              name="email"
              placeholder="Enter email"
              value={formState.email}
              onChange={(e) => setFormState({ ...formState, email: e.target.value })}
              disabled={editingUser !== null} // Email cannot be changed after creation in this UI
            />
          </FormField>

          {!editingUser && (
            <FormField
              id="password"
              label="Password"
              required
              error={formErrors.password}
              helpText="Minimum 8 characters with uppercase, lowercase, and number"
            >
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Enter password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FormField>
          )}

          <FormField
            id="role_id"
            label="Role"
            required
            error={formErrors.role_id}
          >
            <Select
              id="role_id"
              name="role_id"
              options={roles.map(role => ({
                value: role.id,
                label: role.name
              }))}
              value={formState.role_id}
              onChange={(e) => setFormState({ ...formState, role_id: e.target.value })}
            />
          </FormField>

          <FormField
            id="status"
            label="Status"
            required
            error={formErrors.status}
          >
            <Select
              id="status"
              name="status"
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
              value={formState.status}
              onChange={(e) => setFormState({ ...formState, status: e.target.value as 'active' | 'inactive' })}
            />
          </FormField>
        </form>
      </SlideInForm>

      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        title="Delete Users"
        message={`Are you sure you want to delete ${usersToDelete.length} user(s)? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        variant="danger"
      />
    </div>
  );
}