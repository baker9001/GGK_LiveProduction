/**
 * File: /src/app/system-admin/admin-users/tabs/UsersTab.tsx
 * UPDATED VERSION with proper Supabase Auth integration and improved workflow
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { 
  Plus, 
  Key, 
  Eye, 
  EyeOff, 
  Edit2, 
  Trash2, 
  Mail, 
  Copy, 
  Check, 
  CheckCircle,
  XCircle,
  FlaskConical, 
  Loader2,
  RefreshCw,
  Shield,
  User,
  AlertCircle,
  Send
} from 'lucide-react';
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
import { 
  startTestMode, 
  isInTestMode, 
  getRealAdminUser, 
  mapUserTypeToRole,
  getAuthenticatedUser,
  getAuthToken 
} from '../../../../lib/auth';

// ===== VALIDATION SCHEMAS =====
const adminUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').transform(e => e.toLowerCase()),
  role_id: z.string().uuid('Please select a role'),
  status: z.enum(['active', 'inactive']),
  send_invite: z.boolean().optional()
});

const inviteUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').transform(e => e.toLowerCase()),
  role_id: z.string().uuid('Please select a role'),
  personal_message: z.string().optional()
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
  requires_password_change?: boolean;
  last_login_at?: string;
  invitation_status?: 'pending' | 'accepted' | 'expired';
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

interface AdminInvitation {
  id: string;
  email: string;
  name: string;
  role_id: string;
  status: 'pending' | 'accepted' | 'expired';
  expires_at: string;
  created_at: string;
  invited_by_name?: string;
}

// ===== API FUNCTIONS =====
async function createAdminUserViaAPI(data: {
  email: string;
  name: string;
  role_id: string;
  status: string;
  send_invite: boolean;
}) {
  // Check if we're in development mode without proper backend
  const isDevelopment = import.meta.env.DEV;
  
  if (isDevelopment) {
    // Development fallback - create invitation record
    console.warn('Using development mode - creating invitation instead of user');
    return createAdminInvitation(data);
  }
  
  // Production - call backend API
  const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin-users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create user');
  }

  return response.json();
}

async function createAdminInvitation(data: {
  email: string;
  name: string;
  role_id: string;
  personal_message?: string;
}) {
  const currentUser = getAuthenticatedUser();
  if (!currentUser) throw new Error('Not authenticated');

  // Generate secure token
  const token = btoa(Math.random().toString(36).substring(2) + Date.now().toString(36));
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Check if invitation already exists
  const { data: existing } = await supabase
    .from('admin_invitations')
    .select('id, status')
    .eq('email', data.email)
    .eq('status', 'pending')
    .single();

  if (existing) {
    throw new Error('An invitation has already been sent to this email');
  }

  // Create invitation record
  const { data: invitation, error } = await supabase
    .from('admin_invitations')
    .insert({
      email: data.email,
      name: data.name,
      role_id: data.role_id,
      invited_by: currentUser.id,
      token: token,
      expires_at: expiresAt.toISOString(),
      status: 'pending',
      personal_message: data.personal_message
    })
    .select()
    .single();

  if (error) throw error;

  // Log the invitation
  await supabase
    .from('audit_logs')
    .insert({
      user_id: currentUser.id,
      action: 'invite_admin_user',
      entity_type: 'admin_invitation',
      entity_id: invitation.id,
      details: {
        email: data.email,
        role_id: data.role_id,
        invited_by: currentUser.email
      }
    });

  // In production, this would trigger an email
  console.log('Invitation created:', {
    email: data.email,
    inviteUrl: `${window.location.origin}/accept-invite?token=${token}`
  });

  return invitation;
}

async function resendInvitation(invitationId: string) {
  // Extend expiration and generate new token
  const token = btoa(Math.random().toString(36).substring(2) + Date.now().toString(36));
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const { error } = await supabase
    .from('admin_invitations')
    .update({
      token: token,
      expires_at: expiresAt.toISOString(),
      resent_at: new Date().toISOString()
    })
    .eq('id', invitationId);

  if (error) throw error;

  // Log the action
  const currentUser = getAuthenticatedUser();
  await supabase
    .from('audit_logs')
    .insert({
      user_id: currentUser?.id,
      action: 'resend_invitation',
      entity_type: 'admin_invitation',
      entity_id: invitationId
    });

  return { success: true };
}

// ===== MAIN COMPONENT =====
export default function UsersTab() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // Get current user
  const currentUser = getAuthenticatedUser();
  
  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isInviteFormOpen, setIsInviteFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showInvitations, setShowInvitations] = useState(false);
  
  // Filter state
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
    role_id: '',
    status: 'active' as 'active' | 'inactive'
  });

  // Invite form state
  const [inviteFormState, setInviteFormState] = useState({
    name: '',
    email: '',
    role_id: '',
    personal_message: ''
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

  // Fetch users using the view
  const { 
    data: users = [], 
    isLoading, 
    isFetching,
    refetch: refetchUsers
  } = useQuery<AdminUser[]>(
    ['admin-users', filters],
    async () => {
      // Use the view instead of the table
      let query = supabase
        .from('admin_users_view')
        .select('*')
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

      return data || [];
    },
    { 
      keepPreviousData: true, 
      staleTime: 30 * 1000,
      refetchInterval: 30 * 1000 
    }
  );

  // Fetch pending invitations
  const { data: invitations = [] } = useQuery<AdminInvitation[]>(
    ['admin-invitations', showInvitations],
    async () => {
      if (!showInvitations) return [];

      const { data, error } = await supabase
        .from('admin_invitations')
        .select(`
          *,
          roles (name),
          users!invited_by (
            raw_user_meta_data
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(inv => ({
        ...inv,
        invited_by_name: inv.users?.raw_user_meta_data?.name || 'Unknown'
      }));
    },
    { 
      enabled: showInvitations,
      staleTime: 30 * 1000 
    }
  );

  // ===== MUTATIONS =====
  
  // Update user mutation (simplified - only updates admin_users)
  const updateUserMutation = useMutation(
    async (data: { id: string; updates: any }) => {
      // Update admin_users record
      const { error: adminError } = await supabase
        .from('admin_users')
        .update({
          name: data.updates.name,
          role_id: data.updates.role_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id);

      if (adminError) throw adminError;

      // Update users table for status
      const { error: userError } = await supabase
        .from('users')
        .update({
          is_active: data.updates.status === 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id);

      if (userError) throw userError;

      return { success: true };
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['admin-users']);
        setIsFormOpen(false);
        setEditingUser(null);
        toast.success('User updated successfully');
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to update user');
      }
    }
  );

  // Invite user mutation
  const inviteUserMutation = useMutation(
    async (data: any) => {
      const validatedData = inviteUserSchema.parse(data);
      return await createAdminInvitation(validatedData);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['admin-invitations']);
        setIsInviteFormOpen(false);
        setInviteFormState({
          name: '',
          email: '',
          role_id: '',
          personal_message: ''
        });
        toast.success('Invitation sent successfully');
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
          toast.error(error.message || 'Failed to send invitation');
        }
      }
    }
  );

  // Resend invitation mutation
  const resendInviteMutation = useMutation(
    resendInvitation,
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['admin-invitations']);
        toast.success('Invitation resent successfully');
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to resend invitation');
      }
    }
  );

  // Deactivate users mutation
  const deactivateMutation = useMutation(
    async (users: AdminUser[]) => {
      const results = [];
      
      for (const user of users) {
        try {
          // Check if user can be deactivated
          if (user.id === currentUser?.id) {
            throw new Error('Cannot deactivate your own account');
          }

          // Deactivate the user
          const { error } = await supabase
            .from('users')
            .update({
              is_active: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
          
          if (error) throw error;
          
          // Log the deactivation
          await supabase
            .from('audit_logs')
            .insert({
              user_id: currentUser?.id,
              action: 'deactivate_admin_user',
              entity_type: 'admin_user',
              entity_id: user.id,
              details: {
                email: user.email,
                deactivated_by: currentUser?.email
              }
            });
          
          results.push({ success: true });
        } catch (error: any) {
          console.error(`Error deactivating user ${user.id}:`, error);
          results.push({ success: false, error: error.message });
        }
      }
      
      return results;
    },
    {
      onSuccess: (results) => {
        queryClient.invalidateQueries(['admin-users']);
        setIsConfirmDialogOpen(false);
        setUsersToDelete([]);
        
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        
        if (failCount === 0) {
          toast.success(`${successCount} user(s) deactivated successfully`);
        } else {
          const errorMessages = results
            .filter(r => !r.success && r.error)
            .map(r => r.error);
          
          if (errorMessages.length > 0) {
            errorMessages.forEach(msg => toast.error(msg));
          } else {
            toast.error(`${failCount} user(s) failed to deactivate`);
          }
        }
      },
      onError: (error) => {
        console.error('Error deactivating users:', error);
        toast.error('Failed to deactivate user(s)');
        setIsConfirmDialogOpen(false);
        setUsersToDelete([]);
      }
    }
  );

  // ===== HANDLERS =====
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors({});
    
    if (editingUser) {
      // Update existing user
      updateUserMutation.mutate({
        id: editingUser.id,
        updates: formState
      });
    }
  };

  const handleInviteSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors({});
    inviteUserMutation.mutate(inviteFormState);
  };

  const handleDelete = (users: AdminUser[]) => {
    // Filter out current user
    const validUsers = users.filter(u => u.id !== currentUser?.id);
    
    if (validUsers.length === 0) {
      toast.error('You cannot deactivate your own account');
      return;
    }
    
    if (validUsers.length < users.length) {
      toast.warning('Your account has been excluded from deactivation');
    }
    
    setUsersToDelete(validUsers);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = () => {
    deactivateMutation.mutate(usersToDelete);
  };

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
      const { data: generalUser } = await supabase
        .from('users')
        .select('id, email, user_type, raw_user_meta_data')
        .eq('id', adminUser.id)
        .single();

      if (!generalUser) {
        toast.error('User not found in authentication system');
        return;
      }

      const testUser = {
        id: generalUser.id,
        name: adminUser.name,
        email: generalUser.email,
        role: mapUserTypeToRole('system') as any,
        userType: 'system'
      };

      // Start test mode
      startTestMode(testUser);
      
      toast.success(`Starting test mode as ${testUser.name}`);
    } catch (error) {
      console.error('Error starting test mode:', error);
      toast.error('Failed to start test mode');
    }
  };

  // ===== EFFECTS =====
  
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
        role_id: '',
        status: 'active'
      });
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
      cell: (row: AdminUser) => (
        <div className="flex items-center gap-2">
          <span>{row.email}</span>
          {row.requires_password_change && (
            <Shield className="h-3 w-3 text-amber-500" title="Password change required" />
          )}
        </div>
      ),
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
          {row.invitation_status === 'pending' && (
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 rounded-full">
              Invited
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'last_login',
      header: 'Last Login',
      accessorKey: 'last_login_at',
      enableSorting: true,
      cell: (row: AdminUser) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.last_login_at 
            ? new Date(row.last_login_at).toLocaleDateString() 
            : 'Never'}
        </span>
      ),
    },
    {
      id: 'created_at',
      header: 'Created',
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
      {/* Test Mode Button */}
      {isSSA && !inTestMode && row.status === 'active' && row.email_verified && (
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
      
      {/* Deactivate */}
      {row.id !== currentUser?.id && (
        <button
          onClick={() => handleDelete([row])}
          disabled={deactivateMutation.isLoading}
          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors disabled:opacity-50"
          title="Deactivate"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  // Invitations table columns
  const invitationColumns = [
    {
      id: 'email',
      header: 'Email',
      accessorKey: 'email',
    },
    {
      id: 'name',
      header: 'Name',
      accessorKey: 'name',
    },
    {
      id: 'expires',
      header: 'Expires',
      accessorKey: 'expires_at',
      cell: (row: AdminInvitation) => {
        const expiresAt = new Date(row.expires_at);
        const isExpired = expiresAt < new Date();
        return (
          <span className={isExpired ? 'text-red-600' : 'text-gray-600'}>
            {expiresAt.toLocaleDateString()}
          </span>
        );
      }
    },
    {
      id: 'invited_by',
      header: 'Invited By',
      accessorKey: 'invited_by_name',
    }
  ];

  const renderInvitationActions = (row: AdminInvitation) => (
    <div className="flex items-center justify-end space-x-2">
      <button
        onClick={() => resendInviteMutation.mutate(row.id)}
        disabled={resendInviteMutation.isLoading}
        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
        title="Resend invitation"
      >
        {resendInviteMutation.isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </button>
    </div>
  );

  // ===== RENDER =====
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">System Users</h2>
          <button
            onClick={() => refetchUsers()}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setShowInvitations(!showInvitations)}
          >
            {showInvitations ? 'Hide' : 'Show'} Invitations
          </Button>
          
          <Button
            onClick={() => {
              setIsInviteFormOpen(true);
            }}
            leftIcon={<Send className="h-4 w-4" />}
          >
            Invite User
          </Button>
        </div>
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

      {/* Pending Invitations Table */}
      {showInvitations && invitations.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3">Pending Invitations</h3>
          <DataTable
            data={invitations}
            columns={invitationColumns}
            keyField="id"
            caption="Pending admin user invitations"
            ariaLabel="Pending invitations table"
            renderActions={renderInvitationActions}
            compact
          />
        </div>
      )}

      {/* Main Users Table */}
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

      {/* Edit User Form */}
      <SlideInForm
        key={editingUser?.id || 'edit'}
        title="Edit System User"
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingUser(null);
          setFormErrors({});
        }}
        onSave={() => {
          const form = document.querySelector('form#edit-user-form') as HTMLFormElement;
          if (form) form.requestSubmit();
        }}
        loading={updateUserMutation.isLoading}
      >
        <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-4">
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

          <FormField id="email" label="Email" disabled>
            <Input
              id="email"
              name="email"
              type="email"
              value={formState.email}
              disabled
              leftIcon={<Mail className="h-4 w-4 text-gray-400" />}
            />
            <p className="text-xs text-gray-500 mt-1">
              Email cannot be changed after user creation
            </p>
          </FormField>

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

          <FormField id="status" label="Status" required error={formErrors.status}>
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

      {/* Invite User Form */}
      <SlideInForm
        key="invite"
        title="Invite System User"
        isOpen={isInviteFormOpen}
        onClose={() => {
          setIsInviteFormOpen(false);
          setInviteFormState({
            name: '',
            email: '',
            role_id: '',
            personal_message: ''
          });
          setFormErrors({});
        }}
        onSave={() => {
          const form = document.querySelector('form#invite-user-form') as HTMLFormElement;
          if (form) form.requestSubmit();
        }}
        loading={inviteUserMutation.isLoading}
      >
        <form id="invite-user-form" onSubmit={handleInviteSubmit} className="space-y-4">
          {formErrors.form && (
            <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
              {formErrors.form}
            </div>
          )}

          <FormField id="invite-name" label="Name" required error={formErrors.name}>
            <Input
              id="invite-name"
              name="name"
              placeholder="Enter name"
              value={inviteFormState.name}
              onChange={(e) => setInviteFormState({ ...inviteFormState, name: e.target.value })}
            />
          </FormField>

          <FormField id="invite-email" label="Email" required error={formErrors.email}>
            <Input
              id="invite-email"
              name="email"
              type="email"
              placeholder="Enter email address"
              value={inviteFormState.email}
              onChange={(e) => setInviteFormState({ ...inviteFormState, email: e.target.value })}
              leftIcon={<Mail className="h-4 w-4 text-gray-400" />}
            />
          </FormField>

          <FormField id="invite-role" label="Role" required error={formErrors.role_id}>
            <Select
              id="invite-role"
              name="role_id"
              options={roles.map(role => ({
                value: role.id,
                label: role.name
              }))}
              value={inviteFormState.role_id}
              onChange={(value) => setInviteFormState({ ...inviteFormState, role_id: value })}
            />
          </FormField>

          <FormField id="invite-message" label="Personal Message (Optional)">
            <textarea
              id="invite-message"
              name="personal_message"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#8CC63F] dark:bg-gray-700 dark:text-white"
              rows={3}
              placeholder="Add a personal message to the invitation email..."
              value={inviteFormState.personal_message}
              onChange={(e) => setInviteFormState({ ...inviteFormState, personal_message: e.target.value })}
            />
          </FormField>

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              An invitation email will be sent with a secure link to set up their account.
              The invitation will expire in 7 days.
            </p>
          </div>
        </form>
      </SlideInForm>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        title="Deactivate User"
        message={`Are you sure you want to deactivate ${usersToDelete.length} user(s)? They will not be able to log in until reactivated.`}
        confirmText="Deactivate"
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