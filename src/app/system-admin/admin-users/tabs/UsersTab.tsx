/**
 * File: /src/app/system-admin/admin-users/tabs/UsersTab.tsx
 * UPDATED VERSION - Using Edge Function for proper Supabase Auth integration
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

// ===== CONFIGURATION =====
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

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
  updated_at?: string;
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
  role_name?: string;
  status: 'pending' | 'accepted' | 'expired';
  expires_at: string;
  created_at: string;
  invited_by_name?: string;
  invited_by?: string;
  user_id?: string;
}

// ===== API FUNCTIONS =====

/**
 * Check if a user with the given email already exists
 */
async function checkUserExists(email: string): Promise<{ exists: boolean; isActive?: boolean; userName?: string }> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, is_active, raw_user_meta_data')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('Error checking user existence:', error);
      return { exists: false };
    }

    if (!data) {
      return { exists: false };
    }

    return { 
      exists: true, 
      isActive: data.is_active || false,
      userName: data.raw_user_meta_data?.name || email
    };
  } catch (error) {
    console.error('Error checking user existence:', error);
    return { exists: false };
  }
}

/**
 * Create admin user using Edge Function for proper Supabase Auth integration
 */
async function createAdminUser(data: {
  email: string;
  name: string;
  role_id: string;
  personal_message?: string;
}) {
  const currentUser = getAuthenticatedUser();
  if (!currentUser) throw new Error('Not authenticated');

  try {
    // Check if user already exists
    const userCheck = await checkUserExists(data.email);
    
    if (userCheck.exists) {
      if (userCheck.isActive) {
        throw new Error(`An active user with email ${data.email} already exists in the system.`);
      } else {
        throw new Error(`A user with email ${data.email} exists but is inactive. Please reactivate from the users list.`);
      }
    }

    // Get current session for authorization
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !sessionData?.session) {
      throw new Error('Session expired. Please refresh the page and try again.');
    }

    // Call Edge Function to create user in Supabase Auth
    const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/create-admin-user-auth`;
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.session.access_token}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        email: data.email.toLowerCase(),
        name: data.name,
        role_id: data.role_id,
        personal_message: data.personal_message,
        // Don't send password - let user set it via invitation email
        redirect_to: `${window.location.origin}/admin/set-password`
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error || errorData?.message || `Failed to create user: ${response.status}`;
      
      if (response.status === 401) {
        throw new Error('Authentication expired. Please refresh the page and try again.');
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    
    if (!result.userId && !result.user?.id) {
      throw new Error('Failed to create user - no ID returned from server');
    }

    const authUserId = result.userId || result.user.id;
    console.log('Auth user created with ID:', authUserId);

    // Step 2: Create record in custom users table with auth ID
    const { error: usersError } = await supabase
      .from('users')
      .insert({
        id: authUserId, // Use the auth.users ID
        email: data.email.toLowerCase(),
        user_type: 'system', // System admin user
        is_active: true,
        email_verified: false, // Will be true after email confirmation
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        raw_user_meta_data: {
          name: data.name,
          role_id: data.role_id,
          invited_by: currentUser.email,
          created_via: 'system_admin_module'
        }
      });

    if (usersError) {
      console.error('Failed to create users record:', usersError);
      
      // Note: We can't delete auth.users record without service role key
      console.warn('Auth user created but profile creation failed. Manual cleanup may be needed.');
      
      if (usersError.code === '23505') {
        // User already exists in our table - this might be okay
        console.log('User already exists in users table, continuing...');
      } else {
        throw usersError;
      }
    }

    // Step 3: Create admin_users record
    const { error: adminError } = await supabase
      .from('admin_users')
      .insert({
        id: authUserId,
        name: data.name,
        role_id: data.role_id,
        can_manage_users: false, // Default value
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (adminError) {
      console.error('Failed to create admin_users record:', adminError);
      
      // Rollback users table entry if it was created
      if (!usersError) {
        await supabase.from('users').delete().eq('id', authUserId);
      }
      
      if (adminError.code === '23505') {
        throw new Error('An admin user with this ID already exists');
      }
      
      throw adminError;
    }

    // Step 4: Log the action
    try {
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
            invited_by: currentUser.email,
            method: 'edge_function'
          }
        });
    } catch (logError) {
      console.warn('Failed to log action:', logError);
      // Don't fail the whole operation if logging fails
    }

    return {
      success: true,
      userId: authUserId,
      message: result.message || 'Admin user created successfully. An invitation email has been sent.'
    };

  } catch (error: any) {
    console.error('Error creating admin user:', error);
    
    // Provide user-friendly error messages
    if (error.message?.includes('JWT') || error.message?.includes('expired')) {
      throw new Error('Your session has expired. Please refresh the page and try again.');
    }
    if (error.message?.includes('already exists')) {
      throw new Error(error.message);
    }
    if (error.message?.includes('violates foreign key')) {
      throw new Error('Invalid role selected. Please refresh and try again.');
    }
    
    throw error;
  }
}

async function resendInvitation(invitationId: string) {
  // Get fresh session before making the request
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !sessionData?.session) {
    throw new Error('Session expired. Please refresh the page and try again.');
  }

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
  
  // Log the action
  try {
    await supabase
      .from('audit_logs')
      .insert({
        user_id: currentUser?.id,
        action: 'resend_invitation',
        entity_type: 'admin_invitation',
        entity_id: invitationId
      });
  } catch (logError) {
    console.warn('Failed to log action:', logError);
  }

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
  const [confirmAction, setConfirmAction] = useState<'deactivate' | 'delete'>('deactivate');
  const [usersToProcess, setUsersToProcess] = useState<AdminUser[]>([]);

  // Invite form state
  const [inviteFormState, setInviteFormState] = useState({
    name: '',
    email: '',
    role_id: '',
    personal_message: ''
  });

  // Email validation state
  const [emailValidation, setEmailValidation] = useState<{
    checking: boolean;
    exists: boolean;
    message?: string;
  }>({
    checking: false,
    exists: false
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

  // Fetch users using the admin_users_view
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
  const { 
    data: invitations = [],
    isLoading: invitationsLoading,
    error: invitationsError,
    refetch: refetchInvitations
  } = useQuery<AdminInvitation[]>(
    ['admin-invitations', showInvitations],
    async () => {
      if (!showInvitations) return [];
      
      // Return empty array for now as invitations table may not exist
      // In production, implement proper invitations table query
      return [];
    },
    { 
      enabled: showInvitations,
      staleTime: 30 * 1000,
      retry: 1,
    }
  );

  // ===== MUTATIONS =====
  
  // Invite user mutation - now uses Edge Function
  const inviteUserMutation = useMutation(
    async (data: any) => {
      const validatedData = inviteUserSchema.parse(data);
      return await createAdminUser(validatedData);
    },
    {
      onSuccess: (result) => {
        queryClient.invalidateQueries(['admin-users']);
        queryClient.invalidateQueries(['admin-invitations']);
        setIsInviteFormOpen(false);
        setInviteFormState({
          name: '',
          email: '',
          role_id: '',
          personal_message: ''
        });
        toast.success(result.message || 'Admin user created successfully');
      },
      onError: (error: any) => {
        console.error('Invite user error:', error);
        
        if (error instanceof z.ZodError) {
          const errors: Record<string, string> = {};
          error.errors.forEach((err) => {
            if (err.path.length > 0) {
              errors[err.path[0] as string] = err.message;
            }
          });
          setFormErrors(errors);
          toast.error('Please check the form for errors');
        } else if (error.message) {
          toast.error(error.message);
          
          // If it's a session error, suggest refreshing
          if (error.message.includes('session') || error.message.includes('expired')) {
            setTimeout(() => {
              toast.info('Try refreshing the page if the problem persists');
            }, 2000);
          }
        } else {
          toast.error('Failed to create admin user. Please try again.');
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

  // Process users mutation (deactivate or delete)
  const processUsersMutation = useMutation(
    async ({ users, action }: { users: AdminUser[], action: 'deactivate' | 'delete' }) => {
      const results = [];
      
      for (const user of users) {
        try {
          if (user.id === currentUser?.id) {
            throw new Error(`Cannot ${action} your own account`);
          }

          if (action === 'deactivate') {
            const { error } = await supabase
              .from('users')
              .update({
                is_active: false,
                updated_at: new Date().toISOString()
              })
              .eq('id', user.id);
            
            if (error) throw error;
            
          } else if (action === 'delete') {
            // Check for dependencies before deletion
            const { data: sessions } = await supabase
              .from('past_paper_import_sessions')
              .select('id')
              .eq('uploader_id', user.id)
              .limit(1);
            
            if (sessions && sessions.length > 0) {
              throw new Error(`Cannot delete user: They have uploaded past papers.`);
            }
            
            // Delete from admin_users first
            const { error: adminError } = await supabase
              .from('admin_users')
              .delete()
              .eq('id', user.id);
            
            if (adminError) throw adminError;
            
            // Delete from users table
            const { error: userError } = await supabase
              .from('users')
              .delete()
              .eq('id', user.id);
            
            if (userError) throw userError;
          }
          
          // Log the action
          try {
            await supabase
              .from('audit_logs')
              .insert({
                user_id: currentUser?.id,
                action: `${action}_admin_user`,
                entity_type: 'admin_user',
                entity_id: user.id,
                details: {
                  email: user.email,
                  action: action
                }
              });
          } catch (logError) {
            console.warn('Failed to log action:', logError);
          }
          
          results.push({ success: true });
        } catch (error: any) {
          console.error(`Error ${action}ing user:`, error);
          results.push({ success: false, error: error.message });
        }
      }
      
      return { results, action };
    },
    {
      onSuccess: ({ results, action }) => {
        queryClient.invalidateQueries(['admin-users']);
        setIsConfirmDialogOpen(false);
        setUsersToProcess([]);
        
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        
        if (failCount === 0) {
          toast.success(`${successCount} user(s) ${action}d successfully`);
        } else {
          results
            .filter(r => !r.success && r.error)
            .forEach(r => toast.error(r.error));
        }
      },
      onError: (error) => {
        console.error('Error processing users:', error);
        toast.error(`Failed to ${confirmAction} user(s)`);
      }
    }
  );

  // ===== HANDLERS =====
  
  const handleInviteSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors({});
    
    if (emailValidation.exists) {
      toast.error('Cannot create user: ' + (emailValidation.message || 'Email already exists'));
      return;
    }
    
    if (emailValidation.checking) {
      toast.info('Please wait while we validate the email...');
      return;
    }
    
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

  const handleDeactivate = (users: AdminUser[]) => {
    const validUsers = users.filter(u => u.id !== currentUser?.id);
    
    if (validUsers.length === 0) {
      toast.error('You cannot deactivate your own account');
      return;
    }
    
    setUsersToProcess(validUsers);
    setConfirmAction('deactivate');
    setIsConfirmDialogOpen(true);
  };

  const handleDelete = (users: AdminUser[]) => {
    const validUsers = users.filter(u => u.id !== currentUser?.id);
    
    if (validUsers.length === 0) {
      toast.error('You cannot delete your own account');
      return;
    }
    
    setUsersToProcess(validUsers);
    setConfirmAction('delete');
    setIsConfirmDialogOpen(true);
  };

  const confirmUserAction = () => {
    processUsersMutation.mutate({ users: usersToProcess, action: confirmAction });
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

  const handleResendVerification = async (adminUser: AdminUser) => {
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          email_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', adminUser.id);

      if (!updateError) {
        toast.success(`${adminUser.name} marked as verified`);
        queryClient.invalidateQueries(['admin-users']);
        
        try {
          await supabase
            .from('audit_logs')
            .insert({
              user_id: currentUser?.id,
              action: 'manually_verify_email',
              entity_type: 'admin_user',
              entity_id: adminUser.id,
              details: {
                email: adminUser.email
              }
            });
        } catch (logError) {
          console.warn('Failed to log action:', logError);
        }
      } else {
        throw updateError;
      }
    } catch (error: any) {
      console.error('Error marking as verified:', error);
      toast.error('Failed to mark user as verified');
    }
  };

  const handleToggleInvitations = () => {
    setShowInvitations(!showInvitations);
  };

  // ===== EFFECTS =====
  
  // Email validation effect
  useEffect(() => {
    const validateEmail = async () => {
      const email = inviteFormState.email.trim().toLowerCase();
      
      if (email.length < 5 || !email.includes('@')) {
        setEmailValidation({ checking: false, exists: false });
        return;
      }

      setEmailValidation({ checking: true, exists: false });

      try {
        const userCheck = await checkUserExists(email);
        
        if (userCheck.exists) {
          setEmailValidation({
            checking: false,
            exists: true,
            message: userCheck.isActive 
              ? `User "${userCheck.userName}" already exists and is active.`
              : `User "${userCheck.userName}" exists but is inactive. Please reactivate.`
          });
        } else {
          setEmailValidation({
            checking: false,
            exists: false,
            message: undefined
          });
        }
      } catch (error) {
        console.error('Email validation error:', error);
        setEmailValidation({ checking: false, exists: false });
      }
    };

    const timeoutId = setTimeout(validateEmail, 500);
    return () => clearTimeout(timeoutId);
  }, [inviteFormState.email]);
  
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
            <span 
              className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 rounded-full"
              title="Email not verified yet"
            >
              Unverified
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
      {row.status === 'active' && !row.email_verified && (
        <button
          onClick={() => handleResendVerification(row)}
          className="text-amber-600 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 p-1 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-full transition-colors"
          title="Mark as verified"
        >
          <CheckCircle className="h-4 w-4" />
        </button>
      )}
      
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
        <>
          <button
            onClick={() => handleDeactivate([row])}
            disabled={processUsersMutation.isLoading}
            className="text-amber-600 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 p-1 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-full transition-colors disabled:opacity-50"
            title={row.status === 'active' ? 'Deactivate user' : 'User already inactive'}
          >
            <XCircle className="h-4 w-4" />
          </button>
          
          <button
            onClick={() => handleDelete([row])}
            disabled={processUsersMutation.isLoading}
            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors disabled:opacity-50"
            title="Delete user permanently"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </>
      )}
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
          There was an error loading the user data. Please check the database connection.
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
        
        <Button
          onClick={() => setIsInviteFormOpen(true)}
          leftIcon={<Send className="h-4 w-4" />}
        >
          Create Admin User
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
        emptyMessage="No system users found"
      />

      {/* Info about email verification */}
      {users.some(u => u.status === 'active' && !u.email_verified) && (
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="text-sm text-amber-700 dark:text-amber-300">
              <p className="font-semibold mb-1">About Email Verification</p>
              <p>
                New admin users will receive an email invitation to set up their password and verify their email. 
                They can access the system after completing this process.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Create Admin User Form */}
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
          setEmailValidation({ checking: false, exists: false });
        }}
        onSave={() => {
          if (emailValidation.exists) {
            toast.error('Cannot create user: Email already exists');
            return;
          }
          const form = document.querySelector('form#invite-user-form') as HTMLFormElement;
          if (form) form.requestSubmit();
        }}
        loading={inviteUserMutation.isLoading || emailValidation.checking}
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

          <FormField 
            id="invite-email" 
            label="Email" 
            required 
            error={formErrors.email}
          >
            <div className="relative">
              <Input
                id="invite-email"
                name="email"
                type="email"
                placeholder="Enter email address"
                value={inviteFormState.email}
                onChange={(e) => setInviteFormState({ ...inviteFormState, email: e.target.value })}
                leftIcon={<Mail className="h-4 w-4 text-gray-400" />}
                className={emailValidation.exists ? 'border-red-300 dark:border-red-600' : ''}
              />
              {emailValidation.checking && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                </div>
              )}
              {!emailValidation.checking && emailValidation.exists && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                </div>
              )}
              {!emailValidation.checking && !emailValidation.exists && inviteFormState.email.includes('@') && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </div>
              )}
            </div>
            {emailValidation.exists && emailValidation.message && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {emailValidation.message}
              </p>
            )}
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
              The user will receive an email invitation with a secure link to set up their password. 
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
        title={confirmAction === 'delete' ? 'Delete User Permanently' : 'Deactivate User'}
        message={
          confirmAction === 'delete'
            ? `Are you sure you want to permanently delete ${usersToProcess.length} user(s)? This action cannot be undone.`
            : `Are you sure you want to deactivate ${usersToProcess.length} user(s)? They will not be able to log in until reactivated.`
        }
        confirmText={confirmAction === 'delete' ? 'Delete Permanently' : 'Deactivate'}
        cancelText="Cancel"
        onConfirm={confirmUserAction}
        onCancel={() => {
          setIsConfirmDialogOpen(false);
          setUsersToProcess([]);
        }}
      />
    </div>
  );
}