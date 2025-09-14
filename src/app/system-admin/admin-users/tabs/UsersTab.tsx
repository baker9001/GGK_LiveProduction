/**
 * File: /src/app/system-admin/admin-users/tabs/UsersTab.tsx
 * UPDATED VERSION - Invitation creates auth.users first
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

/**
 * Creates admin user with auth.users record first
 * This ensures every admin has a proper auth account
 */
async function createAdminUserWithAuth(data: {
  email: string;
  name: string;
  role_id: string;
  personal_message?: string;
}) {
  const currentUser = getAuthenticatedUser();
  if (!currentUser) throw new Error('Not authenticated');

  try {
    // Step 1: Generate temporary password
    const tempPassword = crypto.randomUUID() + 'Aa1!';
    
    // Step 2: Create user in Supabase Auth first
    // We need to use the service role for this, so we'll call our Edge Function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const token = getAuthToken();
    
    const response = await fetch(`${supabaseUrl}/functions/v1/create-admin-user-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
      },
      body: JSON.stringify({
        email: data.email,
        name: data.name,
        password: tempPassword,
        role_id: data.role_id
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create auth user');
    }

    const authResult = await response.json();
    const authUserId = authResult.user.id;

    console.log('Auth user created with ID:', authUserId);

    // Step 3: Create record in custom users table
    const { error: usersError } = await supabase
      .from('users')
      .insert({
        id: authUserId,
        email: data.email.toLowerCase(),
        user_type: 'system',
        is_active: true,
        email_verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        raw_user_meta_data: {
          name: data.name,
          role_id: data.role_id
        }
      });

    if (usersError) {
      console.error('Failed to create users record:', usersError);
      // Note: We should ideally rollback the auth user here
      throw usersError;
    }

    // Step 4: Create admin_users record
    const { error: adminError } = await supabase
      .from('admin_users')
      .insert({
        id: authUserId,
        name: data.name,
        email: data.email.toLowerCase(),
        role_id: data.role_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (adminError) {
      console.error('Failed to create admin_users record:', adminError);
      // Rollback users table entry
      await supabase.from('users').delete().eq('id', authUserId);
      throw adminError;
    }

    // Step 5: Create invitation record for tracking
    const inviteToken = btoa(Math.random().toString(36).substring(2) + Date.now().toString(36));
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const { data: invitation, error: inviteError } = await supabase
      .from('admin_invitations')
      .insert({
        user_id: authUserId, // Link to the auth user
        email: data.email,
        name: data.name,
        role_id: data.role_id,
        invited_by: currentUser.id,
        token: inviteToken,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
        personal_message: data.personal_message
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Failed to create invitation record:', inviteError);
      // Don't fail the whole operation if invitation fails
    }

    // Step 6: Send password reset email
    // This should be done via Edge Function to use service role
    await fetch(`${supabaseUrl}/functions/v1/send-admin-invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
      },
      body: JSON.stringify({
        email: data.email,
        name: data.name,
        invitationId: invitation?.id
      })
    });

    // Step 7: Log the action
    await supabase
      .from('audit_logs')
      .insert({
        user_id: currentUser.id,
        action: 'create_admin_user',
        entity_type: 'admin_user',
        entity_id: authUserId,
        details: {
          email: data.email,
          role_id: data.role_id,
          invited_by: currentUser.email
        }
      });

    return {
      success: true,
      userId: authUserId,
      message: 'Admin user created and invitation sent'
    };

  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
}

async function resendInvitation(invitationId: string) {
  const resendToken = btoa(Math.random().toString(36).substring(2) + Date.now().toString(36));
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const { error } = await supabase
    .from('admin_invitations')
    .update({
      token: resendToken,
      expires_at: expiresAt.toISOString(),
      resent_at: new Date().toISOString()
    })
    .eq('id', invitationId);

  if (error) throw error;

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
  
  const currentUser = getAuthenticatedUser();
  
  // Form states
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

  // Invite form state
  const [inviteFormState, setInviteFormState] = useState({
    name: '',
    email: '',
    role_id: '',
    personal_message: ''
  });

  // Edit form state
  const [editFormState, setEditFormState] = useState({
    name: '',
    email: '',
    role_id: '',
    status: 'active' as 'active' | 'inactive'
  });

  const [isEditFormOpen, setIsEditFormOpen] = useState(false);

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
    refetch: refetchUsers,
    error: usersError
  } = useQuery<AdminUser[]>(
    ['admin-users', filters],
    async () => {
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
      if (error) {
        console.error('Error fetching users:', error);
        throw error;
      }

      return data || [];
    },
    { 
      keepPreviousData: true, 
      staleTime: 30 * 1000,
      refetchInterval: 30 * 1000,
      retry: 3,
      onError: (error) => {
        console.error('Query error:', error);
        toast.error('Failed to load users. Please check your database connection.');
      }
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
  
  // Invite user mutation - now creates auth user first
  const inviteUserMutation = useMutation(
    async (data: any) => {
      const validatedData = inviteUserSchema.parse(data);
      return await createAdminUserWithAuth(validatedData);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['admin-users']);
        queryClient.invalidateQueries(['admin-invitations']);
        setIsInviteFormOpen(false);
        setInviteFormState({
          name: '',
          email: '',
          role_id: '',
          personal_message: ''
        });
        toast.success('Admin user created and invitation sent successfully');
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
          toast.error(error.message || 'Failed to create admin user');
        }
      }
    }
  );

  // Update user mutation
  const updateUserMutation = useMutation(
    async (data: { id: string; updates: any }) => {
      const { error: adminError } = await supabase
        .from('admin_users')
        .update({
          name: data.updates.name,
          role_id: data.updates.role_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id);

      if (adminError) throw adminError;

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
        setIsEditFormOpen(false);
        setEditingUser(null);
        toast.success('User updated successfully');
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to update user');
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
          if (user.id === currentUser?.id) {
            throw new Error('Cannot deactivate your own account');
          }

          const { error } = await supabase
            .from('users')
            .update({
              is_active: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
          
          if (error) throw error;
          
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
  
  const handleInviteSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors({});
    inviteUserMutation.mutate(inviteFormState);
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors({});
    
    if (editingUser) {
      updateUserMutation.mutate({
        id: editingUser.id,
        updates: editFormState
      });
    }
  };

  const handleDelete = (users: AdminUser[]) => {
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
      setEditFormState({
        name: editingUser.name,
        email: editingUser.email,
        role_id: editingUser.role_id,
        status: editingUser.status
      });
    } else {
      setEditFormState({
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
      {isSSA && !inTestMode && row.status === 'active' && row.email_verified && (
        <button
          onClick={() => handleTestAsUser(row)}
          className="text-orange-600 dark:text-orange-400 hover:text-orange-900 dark:hover:text-orange-300 p-1 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-full transition-colors"
          title="Test as this user"
        >
          <FlaskConical className="h-4 w-4" />
        </button>
      )}
      
      <button
        onClick={() => {
          setEditingUser(row);
          setIsEditFormOpen(true);
        }}
        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors"
        title="Edit"
      >
        <Edit2 className="h-4 w-4" />
      </button>
      
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

  // ===== ERROR HANDLING UI =====
  
  if (usersError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Failed to Load Users
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4 text-center max-w-md">
          There was an error loading the user data. Please check that the database view exists and try again.
        </p>
        <Button onClick={() => refetchUsers()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

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
            onClick={() => setIsInviteFormOpen(true)}
            leftIcon={<Send className="h-4 w-4" />}
          >
            Create Admin User
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

      {/* Create Admin User Form (Invitation) */}
      <SlideInForm
        key="invite"
        title="Create System Admin User"
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
              This will create the admin user account and send an invitation email with a secure link to set their password.
              The invitation will expire in 7 days.
            </p>
          </div>
        </form>
      </SlideInForm>

      {/* Edit User Form */}
      <SlideInForm
        key={editingUser?.id || 'edit'}
        title="Edit System User"
        isOpen={isEditFormOpen}
        onClose={() => {
          setIsEditFormOpen(false);
          setEditingUser(null);
          setFormErrors({});
        }}
        onSave={() => {
          const form = document.querySelector('form#edit-user-form') as HTMLFormElement;
          if (form) form.requestSubmit();
        }}
        loading={updateUserMutation.isLoading}
      >
        <form id="edit-user-form" onSubmit={handleEditSubmit} className="space-y-4">
          {formErrors.form && (
            <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
              {formErrors.form}
            </div>
          )}

          <FormField id="edit-name" label="Name" required error={formErrors.name}>
            <Input
              id="edit-name"
              name="name"
              placeholder="Enter name"
              value={editFormState.name}
              onChange={(e) => setEditFormState({ ...editFormState, name: e.target.value })}
            />
          </FormField>

          <FormField id="edit-email" label="Email" disabled>
            <Input
              id="edit-email"
              name="email"
              type="email"
              value={editFormState.email}
              disabled
              leftIcon={<Mail className="h-4 w-4 text-gray-400" />}
            />
            <p className="text-xs text-gray-500 mt-1">
              Email cannot be changed after user creation
            </p>
          </FormField>

          <FormField id="edit-role" label="Role" required error={formErrors.role_id}>
            <Select
              id="edit-role"
              name="role_id"
              options={roles.map(role => ({
                value: role.id,
                label: role.name
              }))}
              value={editFormState.role_id}
              onChange={(value) => setEditFormState({ ...editFormState, role_id: value })}
            />
          </FormField>

          <FormField id="edit-status" label="Status" required error={formErrors.status}>
            <Select
              id="edit-status"
              name="status"
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
              value={editFormState.status}
              onChange={(value) => setEditFormState({ ...editFormState, status: value as 'active' | 'inactive' })}
            />
          </FormField>
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