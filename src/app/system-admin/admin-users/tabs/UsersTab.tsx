// /src/app/system-admin/admin-users/tabs/UsersTab.tsx
// Complete System Admin user management with ALL features

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Plus, Key, Eye, EyeOff, Edit2, Trash2, Mail, Copy, Check, FlaskConical, Loader2 } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { DataTable } from '../../../../components/shared/DataTable';
import { FilterCard } from '../../../../components/shared/FilterCard';
import { SlideInForm } from '../../../../components/shared/SlideInForm';
import { FormField, Input, Select } from '../../../../components/shared/FormField';
import { StatusBadge } from '../../../../components/shared/StatusBadge';
import { Button } from '../../../../components/shared/Button';
import { SearchableMultiSelect } from '../../../../components/shared/SearchableMultiSelect';
import { ConfirmationDialog } from '../../../../components/shared/ConfirmationDialog';
import { toast } from '../../../../components/shared/Toast';
import { startTestMode, isInTestMode, getRealAdminUser, mapUserTypeToRole } from '../../../../lib/auth';
import bcrypt from 'bcryptjs';

// ===== VALIDATION SCHEMAS =====
const adminUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  role_id: z.string().uuid('Please select a role'),
  status: z.enum(['active', 'inactive'])
});

const passwordChangeSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// ===== TYPE DEFINITIONS =====
interface AdminUser {
  id: string;
  name: string;
  email: string;
  role_id: string;
  role_name: string;
  status: 'active' | 'inactive';
  created_at: string;
  email_verified?: boolean;
}

interface Role {
  id: string;
  name: string;
}

interface FilterState {
  name: string;
  email: string;
  role: string;
  status: string[];
}

type UserRole = 'SSA' | 'SUPPORT' | 'VIEWER';

// ===== API HELPER FUNCTIONS =====
async function makeAPICall(method: string, endpoint: string = '', body?: any) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`/api/users${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

// ===== MAIN COMPONENT =====
export default function UsersTab() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [generatePassword, setGeneratePassword] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    name: '',
    email: '',
    role: '',
    status: []
  });
  
  // Test mode checks
  const inTestMode = isInTestMode();
  const realAdmin = getRealAdminUser();
  const isSSA = realAdmin?.role === 'SSA';
  
  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [usersToDelete, setUsersToDelete] = useState<AdminUser[]>([]);

  // Form state
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    password: '',
    role_id: '',
    status: 'active' as 'active' | 'inactive'
  });

  // ===== QUERIES =====
  
  // Fetch roles
  const { data: roles = [] } = useQuery<Role[]>(
    ['roles'],
    async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    { staleTime: 10 * 60 * 1000 }
  );

  // Fetch users with filters
  const { 
    data: users = [], 
    isLoading, 
    isFetching 
  } = useQuery<AdminUser[]>(
    ['admin-users', filters],
    async () => {
      let query = supabase
        .from('admin_users')
        .select(`
          *,
          roles (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (filters.name) {
        query = query.ilike('name', `%${filters.name}%`);
      }
      if (filters.email) {
        query = query.ilike('email', `%${filters.email}%`);
      }
      if (filters.role) {
        query = query.eq('role_id', filters.role);
      }
      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Check verification status from users table
      const enhancedData = await Promise.all(
        (data || []).map(async (user) => {
          const { data: userData } = await supabase
            .from('users')
            .select('email_verified')
            .eq('id', user.id)
            .maybeSingle();

          return {
            ...user,
            role_name: user.roles?.name || 'Unknown',
            email_verified: userData?.email_verified || false
          };
        })
      );

      return enhancedData;
    },
    { keepPreviousData: true, staleTime: 5 * 60 * 1000 }
  );

  // ===== MUTATIONS =====
  
  // Create/update user mutation
  const userMutation = useMutation(
    async (formData: FormData) => {
      const name = formData.get('name') as string;
      const email = formData.get('email') as string;
      const password = formData.get('password') as string | null;
      const role_id = formData.get('role_id') as string;
      const status = formData.get('status') as 'active' | 'inactive';

      // Validate
      const validationData = {
        name,
        email,
        role_id,
        status,
        ...(password && !editingUser ? { password } : {})
      };

      const validatedData = adminUserSchema.parse(validationData);

      if (editingUser) {
        // UPDATE USER
        const response = await makeAPICall('PUT', '', {
          userId: editingUser.id,
          name: validatedData.name,
          email: validatedData.email,
          role_id: validatedData.role_id,
          is_active: validatedData.status === 'active'
        });

        // Also update admin_users table directly for backward compatibility
        const { error: adminError } = await supabase
          .from('admin_users')
          .update({
            name: validatedData.name,
            email: validatedData.email,
            role_id: validatedData.role_id,
            status: validatedData.status
          })
          .eq('id', editingUser.id);

        if (adminError && !adminError.message?.includes('duplicate')) {
          console.error('Error updating admin_users:', adminError);
        }

        return response;
      } else {
        // CREATE NEW USER
        const response = await makeAPICall('POST', '', {
          name: validatedData.name,
          email: validatedData.email,
          password: !generatePassword ? validatedData.password : undefined,
          user_type: 'system',
          role_id: validatedData.role_id,
          is_active: validatedData.status === 'active',
          send_verification: true
        });

        // Store generated password if returned
        if (response.user?.temporary_password) {
          setGeneratedPassword(response.user.temporary_password);
        }

        return response;
      }
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['admin-users']);
        
        if (!editingUser && data.user?.temporary_password) {
          // Show password modal for new users with generated password
          toast.success('User created successfully. Copy the temporary password!');
        } else {
          setIsFormOpen(false);
          setEditingUser(null);
          setFormState({
            name: '',
            email: '',
            password: '',
            role_id: '',
            status: 'active'
          });
          toast.success(data.message || `User ${editingUser ? 'updated' : 'created'} successfully`);
        }
        setFormErrors({});
      },
      onError: (error: any) => {
        if (error instanceof z.ZodError) {
          const errors: Record<string, string> = {};
          error.errors.forEach((err) => {
            if (err.path.length > 0) {
              errors[err.path[0] as string] = err.message;
            }
          });
          setFormErrors(errors);
        } else {
          console.error('Error:', error);
          setFormErrors({ form: error.message || 'Operation failed' });
          toast.error(error.message || 'Operation failed');
        }
      }
    }
  );

  // Password change mutation
  const passwordMutation = useMutation(
    async (formData: FormData) => {
      if (!editingUser) return;

      const data = {
        password: formData.get('password') as string,
        confirmPassword: formData.get('confirmPassword') as string,
      };

      const validatedData = passwordChangeSchema.parse(data);
      
      // Hash new password for admin_users table
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(validatedData.password, salt);

      // Update password in admin_users table
      const { error } = await supabase
        .from('admin_users')
        .update({ password_hash: hashedPassword })
        .eq('id', editingUser.id);

      if (error) throw error;

      // Also update via API for Supabase Auth sync
      try {
        await makeAPICall('PUT', '', {
          userId: editingUser.id,
          password: validatedData.password
        });
      } catch (error) {
        console.log('Auth password update not needed or failed:', error);
      }
      
      return editingUser;
    },
    {
      onSuccess: () => {
        setIsPasswordFormOpen(false);
        setEditingUser(null);
        setFormErrors({});
        toast.success('Password updated successfully');
      },
      onError: (error) => {
        if (error instanceof z.ZodError) {
          const errors: Record<string, string> = {};
          error.errors.forEach((err) => {
            if (err.path.length > 0) {
              errors[err.path[0] as string] = err.message;
            }
          });
          setFormErrors(errors);
        } else {
          console.error('Error updating password:', error);
          setFormErrors({ form: 'Failed to update password. Please try again.' });
          toast.error('Failed to update password');
        }
      }
    }
  );

  // Delete users mutation
  const deleteMutation = useMutation(
    async (users: AdminUser[]) => {
      for (const user of users) {
        await makeAPICall('DELETE', `?userId=${user.id}`);
      }
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

  // Resend verification mutation
  const resendVerificationMutation = useMutation(
    async (userId: string) => {
      return await makeAPICall('PATCH', '', { userId });
    },
    {
      onSuccess: () => {
        toast.success('Verification email sent successfully');
      },
      onError: (error) => {
        console.error('Error:', error);
        toast.error('Failed to send verification email');
      }
    }
  );

  // ===== HELPER FUNCTIONS =====
  
  // Test mode handler
  const handleTestAsUser = async (adminUser: AdminUser) => {
    if (!isSSA) {
      toast.error('Only Super Admins can use test mode');
      return;
    }

    if (inTestMode) {
      toast.error('Already in test mode. Exit current test mode first.');
      return;
    }

    try {
      // Check if user exists in general users table
      const { data: generalUser, error: userError } = await supabase
        .from('users')
        .select('id, email, user_type, raw_user_meta_data')
        .eq('email', adminUser.email)
        .maybeSingle();

      let testUser;
      
      if (generalUser && !userError) {
        // User exists in general users table
        const userRole = mapUserTypeToRole(generalUser.user_type || 'viewer');
        
        let userName = adminUser.name;
        if (generalUser.raw_user_meta_data?.name) {
          userName = generalUser.raw_user_meta_data.name;
        } else if (generalUser.raw_user_meta_data?.full_name) {
          userName = generalUser.raw_user_meta_data.full_name;
        }
        
        testUser = {
          id: generalUser.id,
          name: userName,
          email: generalUser.email,
          role: userRole,
          userType: generalUser.user_type
        };
      } else {
        // Admin user only - map admin role
        const roleMapping: Record<string, UserRole> = {
          'Super Admin': 'SSA',
          'Support Admin': 'SUPPORT',
          'Viewer': 'VIEWER'
        };

        testUser = {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          role: roleMapping[adminUser.role_name] || 'VIEWER',
          userType: 'system'
        };
      }

      // Start test mode
      startTestMode(testUser);
      
      toast.success(`Starting test mode as ${testUser.name}`);
    } catch (error) {
      console.error('Error starting test mode:', error);
      toast.error('Failed to start test mode');
    }
  };

  // ===== HANDLERS =====
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors({});
    userMutation.mutate(new FormData(e.currentTarget));
  };

  const handlePasswordChange = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors({});
    passwordMutation.mutate(new FormData(e.currentTarget));
  };

  const handleDelete = (users: AdminUser[]) => {
    setUsersToDelete(users);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(usersToDelete);
  };

  const copyPassword = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
      toast.success('Password copied to clipboard');
    }
  };

  const closePasswordModal = () => {
    setGeneratedPassword(null);
    setIsFormOpen(false);
    setEditingUser(null);
    setFormState({
      name: '',
      email: '',
      password: '',
      role_id: '',
      status: 'active'
    });
  };

  // ===== EFFECTS =====
  
  useEffect(() => {
    if (editingUser) {
      setFormState({
        name: editingUser.name,
        email: editingUser.email,
        password: '',
        role_id: editingUser.role_id,
        status: editingUser.status
      });
      setGeneratePassword(false);
    } else {
      setFormState({
        name: '',
        email: '',
        password: '',
        role_id: '',
        status: 'active'
      });
      setGeneratePassword(true);
    }
  }, [editingUser]);

  // ===== TABLE CONFIGURATION =====
  
  const columns = [
    {
      id: 'name',
      header: 'Name',
      accessorKey: 'name',
      enableSorting: true,
    },
    {
      id: 'email',
      header: 'Email',
      accessorKey: 'email',
      enableSorting: true,
    },
    {
      id: 'role',
      header: 'Role',
      accessorKey: 'role_name',
      enableSorting: true,
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: true,
      cell: (row: AdminUser) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={row.status} />
          {row.status === 'active' && !row.email_verified && (
            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 rounded-full">
              Unverified
            </span>
          )}
          {row.status === 'active' && row.email_verified && (
            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded-full">
              Verified
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'created_at',
      header: 'Created At',
      accessorKey: 'created_at',
      enableSorting: true,
      cell: (row: AdminUser) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  const renderActions = (row: AdminUser) => (
    <div className="flex items-center justify-end space-x-2">
      {/* Resend Verification */}
      {row.status === 'active' && !row.email_verified && (
        <button
          onClick={() => resendVerificationMutation.mutate(row.id)}
          className="text-amber-600 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 p-1 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-full transition-colors"
          title="Resend verification email"
        >
          <Mail className="h-4 w-4" />
        </button>
      )}
      
      {/* Test Mode Button */}
      {isSSA && !inTestMode && row.status === 'active' && (
        <button
          onClick={() => handleTestAsUser(row)}
          className="text-orange-600 dark:text-orange-400 hover:text-orange-900 dark:hover:text-orange-300 p-1 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-full transition-colors"
          title="Test as this user"
        >
          <FlaskConical className="h-4 w-4" />
        </button>
      )}
      
      {/* Edit */}
      <button
        onClick={() => {
          setEditingUser(row);
          setIsFormOpen(true);
        }}
        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
        title="Edit"
      >
        <Edit2 className="h-4 w-4" />
      </button>
      
      {/* Change Password */}
      <button
        onClick={() => {
          setEditingUser(row);
          setIsPasswordFormOpen(true);
        }}
        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
        title="Change Password"
      >
        <Key className="h-4 w-4" />
      </button>
      
      {/* Delete */}
      <button
        onClick={() => handleDelete([row])}
        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );

  // ===== RENDER =====
  
  return (
    <div className="space-y-6">
      <div className="flex justify-end items-center">
        <Button
          onClick={() => {
            setEditingUser(null);
            setFormErrors({});
            setGeneratePassword(true);
            setIsFormOpen(true);
          }}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add System User
        </Button>
      </div>

      {/* Filter Card */}
      <FilterCard
        title="Filters"
        onApply={() => {}}
        onClear={() => {
          setFilters({
            name: '',
            email: '',
            role: '',
            status: []
          });
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField id="filter-name" label="Name">
            <Input
              id="filter-name"
              placeholder="Search by name..."
              value={filters.name}
              onChange={(e) => setFilters({ ...filters, name: e.target.value })}
            />
          </FormField>

          <FormField id="filter-email" label="Email">
            <Input
              id="filter-email"
              placeholder="Search by email..."
              value={filters.email}
              onChange={(e) => setFilters({ ...filters, email: e.target.value })}
            />
          </FormField>

          <SearchableMultiSelect
            label="Role"
            options={roles.map(role => ({
              value: role.id,
              label: role.name
            }))}
            selectedValues={filters.role ? [filters.role] : []}
            onChange={(values) => setFilters({ ...filters, role: values[0] || '' })}
            isMulti={false}
            placeholder="Select role..."
          />

          <SearchableMultiSelect
            label="Status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
            selectedValues={filters.status}
            onChange={(values) => setFilters({ ...filters, status: values })}
            placeholder="Select status..."
          />
        </div>
      </FilterCard>

      {/* Data Table */}
      <DataTable
        data={users}
        columns={columns}
        keyField="id"
        caption="List of system users with their roles and status"
        ariaLabel="System users data table"
        loading={isLoading}
        isFetching={isFetching}
        renderActions={renderActions}
        onDelete={handleDelete}
        emptyMessage="No system users found"
      />

      {/* Create/Edit User Form */}
      <SlideInForm
        key={editingUser?.id || 'new'}
        title={editingUser ? 'Edit System User' : 'Create System User'}
        isOpen={isFormOpen && !generatedPassword}
        onClose={() => {
          setIsFormOpen(false);
          setEditingUser(null);
          setFormErrors({});
        }}
        onSave={() => {
          const form = document.querySelector('form#user-form') as HTMLFormElement;
          if (form) form.requestSubmit();
        }}
        loading={userMutation.isLoading}
      >
        <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
          {formErrors.form && (
            <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
              {formErrors.form}
            </div>
          )}

          <FormField id="name" label="Name" required error={formErrors.name}>
            <Input
              id="name"
              name="name"
              placeholder="Enter name"
              value={formState.name}
              onChange={(e) => setFormState({ ...formState, name: e.target.value })}
            />
          </FormField>

          <FormField id="email" label="Email" required error={formErrors.email}>
            <Input
              type="email"
              id="email"
              name="email"
              placeholder="Enter email"
              value={formState.email}
              onChange={(e) => setFormState({ ...formState, email: e.target.value })}
            />
          </FormField>

          {!editingUser && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="generatePassword"
                  checked={generatePassword}
                  onChange={(e) => setGeneratePassword(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <label htmlFor="generatePassword" className="text-sm text-gray-700 dark:text-gray-300">
                  Auto-generate secure password
                </label>
              </div>

              {!generatePassword && (
                <FormField 
                  id="password" 
                  label="Password" 
                  required 
                  error={formErrors.password}
                  helpText="User will receive a verification email and can change this password"
                >
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      placeholder="Enter password (min 8 characters)"
                      value={formState.password}
                      onChange={(e) => setFormState({ ...formState, password: e.target.value })}
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
            </>
          )}

          <FormField id="role_id" label="Role" required error={formErrors.role_id}>
            <Select
              id="role_id"
              name="role_id"
              options={roles.map(role => ({
                value: role.id,
                label: role.name
              }))}
              value={formState.role_id}
              onChange={(value) => setFormState({ ...formState, role_id: value })}
            />
          </FormField>

          <FormField 
            id="status" 
            label="Status" 
            required 
            error={formErrors.status}
            helpText="Active users will receive a verification email"
          >
            <Select
              id="status"
              name="status"
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
              value={formState.status}
              onChange={(value) => setFormState({ ...formState, status: value as 'active' | 'inactive' })}
            />
          </FormField>
        </form>
      </SlideInForm>

      {/* Change Password Form */}
      <SlideInForm
        key={`${editingUser?.id || 'new'}-password`}
        title={`Change Password for ${editingUser?.name}`}
        isOpen={isPasswordFormOpen}
        onClose={() => {
          setIsPasswordFormOpen(false);
          setEditingUser(null);
          setFormErrors({});
          setShowPassword(false);
          setShowConfirmPassword(false);
        }}
        onSave={() => {
          const form = document.querySelector('form[name="passwordForm"]') as HTMLFormElement;
          if (form) form.requestSubmit();
        }}
        loading={passwordMutation.isLoading}
      >
        <form name="passwordForm" onSubmit={handlePasswordChange} className="space-y-4">
          {formErrors.form && (
            <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
              {formErrors.form}
            </div>
          )}

          <FormField id="password" label="New Password" required error={formErrors.password}>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                placeholder="Enter new password"
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

          <FormField id="confirmPassword" label="Confirm Password" required error={formErrors.confirmPassword}>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Confirm new password"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </FormField>
        </form>
      </SlideInForm>

      {/* Generated Password Modal */}
      {generatedPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">User Created Successfully</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                A temporary password has been generated. Please copy and share it securely with the user.
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                The user will receive an email to verify their account and can reset this password.
              </p>
            </div>

            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md mb-4">
              <div className="flex items-center justify-between">
                <code className="text-sm font-mono">{generatedPassword}</code>
                <button
                  onClick={copyPassword}
                  className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                  title="Copy password"
                >
                  {copiedPassword ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={closePasswordModal}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        title="Delete User"
        message={`Are you sure you want to delete ${usersToDelete.length} user(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => {
          setIsConfirmDialogOpen(false);
          setUsersToDelete([]);
        }}
      />
    </div>
  );
}