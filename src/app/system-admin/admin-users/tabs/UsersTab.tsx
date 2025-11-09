/**
 * File: /src/app/system-admin/admin-users/tabs/UsersTab.tsx
 * FIXED VERSION - Complete Supabase Auth integration with proper data consistency
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Key, CreditCard as Edit2, Trash2, Mail, Copy, Check, CheckCircle, XCircle, FlaskConical, Loader2, RefreshCw, Shield, User, AlertCircle, Send, Phone, Building } from 'lucide-react';
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
  getAuthToken,
  dispatchAuthChange
} from '../../../../lib/auth';

// ===== CONFIGURATION =====
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// ===== ENHANCED VALIDATION SCHEMAS =====
const createUserSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  email: z.string()
    .email('Invalid email address')
    .transform(e => e.toLowerCase().trim()),
  role_id: z.string().uuid('Please select a valid role'),
  phone: z.string().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  personal_message: z.string().optional()
});

const updateUserSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  role_id: z.string().uuid('Please select a valid role'),
  status: z.enum(['active', 'inactive']),
  phone: z.string().optional(),
  position: z.string().optional(),
  department: z.string().optional()
});

type CreateAdminUserInput = z.infer<typeof createUserSchema>;
type UpdateAdminUserInput = z.infer<typeof updateUserSchema>;

// ===== TYPE DEFINITIONS =====
interface AdminUser {
  id: string;
  name: string;
  email: string;
  role_id: string;
  role_name: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at?: string;
  email_verified?: boolean;
  requires_password_change?: boolean;
  last_login_at?: string;
  invitation_status?: 'pending' | 'accepted' | 'expired';
  phone?: string;
  position?: string;
  department?: string;
  avatar_url?: string;
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
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expires_at: string;
  created_at: string;
  invited_by_name?: string;
  invited_by?: string | null;
  user_id?: string;
  token?: string | null;
  resent_at?: string | null;
}

// ===== API FUNCTIONS =====

/**
 * Check if a user with the given email already exists
 */
async function checkUserExists(email: string): Promise<{ exists: boolean; isActive?: boolean; userName?: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return { exists: false };
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, is_active, raw_user_meta_data')
      .eq('email', normalizedEmail)
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
      userName: data.raw_user_meta_data?.name || normalizedEmail
    };
  } catch (error) {
    console.error('Error checking user existence:', error);
    return { exists: false };
  }
}

/**
 * ENHANCED: Create admin user using improved Edge Function
 */
async function createAdminUser(data: CreateAdminUserInput) {
  const currentUser = getAuthenticatedUser();
  if (!currentUser) throw new Error('Not authenticated');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase configuration missing. Please contact support.');
  }

  try {
    const normalizedEmail = data.email.toLowerCase();

    // Check if user already exists
    const userCheck = await checkUserExists(normalizedEmail);

    if (userCheck.exists) {
      if (userCheck.isActive) {
        throw new Error(`An active user with email ${normalizedEmail} already exists in the system.`);
      } else {
        throw new Error(`A user with email ${normalizedEmail} exists but is inactive. Please reactivate from the users list.`);
      }
    }

    // Get current session for authorization
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !sessionData?.session) {
      throw new Error('Session expired. Please refresh the page and try again.');
    }

    // Call enhanced Edge Function
    const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/create-admin-user-complete`;
    
    const resetPasswordRedirectUrl = `${window.location.origin}/reset-password`

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.session.access_token}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        email: normalizedEmail,
        name: data.name,
        role_id: data.role_id,
        phone: data.phone,
        position: data.position,
        department: data.department,
        personal_message: data.personal_message,
        send_invitation: true,
        created_by: currentUser?.email,
        redirect_to: resetPasswordRedirectUrl
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
    
    if (!result.success || (!result.user?.id)) {
      throw new Error(result.error || 'Failed to create user - no ID returned from server');
    }

    console.log('User created successfully:', result.user);

    return {
      success: true,
      userId: result.user.id,
      message: result.message
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

/**
 * ENHANCED: Update admin user with complete field handling
 */
async function updateAdminUser(userId: string, updates: {
  name: string;
  role_id: string;
  status: 'active' | 'inactive';
  phone?: string;
  position?: string;
  department?: string;
}) {
  const currentUser = getAuthenticatedUser();
  if (!currentUser) throw new Error('Not authenticated');

  try {
    // Validate the updates
    const validatedData = updateUserSchema.parse(updates);

    // Step 1: Update admin_users table
    const { error: adminError } = await supabase
      .from('admin_users')
      .update({
        name: validatedData.name,
        role_id: validatedData.role_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (adminError) throw adminError;

    // Step 2: Update users table
    const { error: userError } = await supabase
      .from('users')
      .update({
        is_active: validatedData.status === 'active',
        updated_at: new Date().toISOString(),
        raw_user_meta_data: {
          name: validatedData.name,
          role_id: validatedData.role_id,
          phone: validatedData.phone,
          position: validatedData.position,
          department: validatedData.department,
          updated_by: currentUser.email,
          updated_at: new Date().toISOString()
        }
      })
      .eq('id', userId);

    if (userError) throw userError;

    // Step 3: Log the update
    try {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: currentUser.id,
          action: 'update_admin_user',
          entity_type: 'admin_user',
          entity_id: userId,
          details: {
            updates: validatedData,
            updated_by: currentUser.email
          },
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      console.warn('Failed to log update action:', logError);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error updating admin user:', error);
    throw error;
  }
}

async function resendInvitation(invitation: AdminInvitation) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase configuration missing. Please contact support.');
  }

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
    .eq('id', invitation.id);

  if (error) throw error;

  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-admin-invite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionData.session.access_token}`,
      'apikey': SUPABASE_ANON_KEY
    },
    body: JSON.stringify({
      email: invitation.email.toLowerCase(),
      name: invitation.name,
      redirect_to: `${window.location.origin}/reset-password`
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const message = errorData?.error || errorData?.message || 'Failed to resend invitation email.';
    throw new Error(message);
  }

  const result = await response.json().catch(() => ({ message: 'Invitation resent successfully' }));

  const currentUser = getAuthenticatedUser();

  // Log the action
  try {
    await supabase
      .from('audit_logs')
      .insert({
        user_id: currentUser?.id,
        action: 'resend_invitation',
        entity_type: 'admin_invitation',
        entity_id: invitation.id,
        details: {
          email: invitation.email,
          name: invitation.name
        }
      });
  } catch (logError) {
    console.warn('Failed to log action:', logError);
  }

  return { success: true, message: result?.message || 'Invitation resent successfully' };
}

async function sendPasswordResetEmail(adminUser: AdminUser) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase configuration missing. Please contact support.');
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !sessionData?.session) {
    throw new Error('Session expired. Please refresh the page and try again.');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-admin-invite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionData.session.access_token}`,
      'apikey': SUPABASE_ANON_KEY
    },
    body: JSON.stringify({
      email: adminUser.email.toLowerCase(),
      name: adminUser.name,
      redirect_to: `${window.location.origin}/reset-password`
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const message = errorData?.error || errorData?.message || 'Failed to send password reset email.';
    throw new Error(message);
  }

  const result = await response.json().catch(() => ({ message: 'Password reset email sent successfully' }));

  const currentUser = getAuthenticatedUser();

  try {
    await supabase
      .from('audit_logs')
      .insert({
        user_id: currentUser?.id,
        action: 'send_password_reset',
        entity_type: 'admin_user',
        entity_id: adminUser.id,
        details: {
          email: adminUser.email,
          name: adminUser.name
        }
      });
  } catch (logError) {
    console.warn('Failed to log password reset action:', logError);
  }

  return { success: true, message: result?.message || 'Password reset email sent successfully' };
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

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortAscending, setSortAscending] = useState(false);
  
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
    personal_message: '',
    phone: '',
    position: '',
    department: ''
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
  const emailValidationCache = useRef<Record<string, { exists: boolean; isActive?: boolean; userName?: string }>>({});

  // Invitation helpers
  const [copiedInvitationId, setCopiedInvitationId] = useState<string | null>(null);
  const [resendingInvitationId, setResendingInvitationId] = useState<string | null>(null);

  // Password reset helper state
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);

  // Edit form state
  const [editFormState, setEditFormState] = useState({
    name: '',
    email: '',
    role_id: '',
    status: 'active' as 'active' | 'inactive',
    phone: '',
    position: '',
    department: ''
  });

  const [isEditFormOpen, setIsEditFormOpen] = useState(false);

  // ===== QUERIES =====
  
  // Fetch roles
  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000
  });

  const roleLookup = useMemo(() => {
    return roles.reduce((acc, role) => {
      acc[role.id] = role.name;
      return acc;
    }, {} as Record<string, string>);
  }, [roles]);

  // Fetch users using the admin_users_view
  const { 
    data: users = [], 
    isLoading, 
    isFetching,
    refetch: refetchUsers,
    error: usersError
  } = useQuery<AdminUser[]>({
    queryKey: ['admin-users', filters],
    queryFn: async () => {
      // ENHANCED: Fetch from admin_users with proper joins
      let query = supabase
        .from('admin_users')
        .select(`
          id,
          name,
          role_id,
          can_manage_users,
          avatar_url,
          created_at,
          updated_at,
          roles!admin_users_role_id_fkey (
            id,
            name
          ),
          users!admin_users_id_fkey (
            id,
            email,
            is_active,
            email_verified,
            last_login_at,
            last_sign_in_at,
            raw_user_meta_data
          )
        `)
        .order('created_at', { ascending: false });

      if (filters.name) {
        query = query.ilike('name', `%${filters.name}%`);
      }
      if (filters.email) {
        query = query.ilike('users.email', `%${filters.email}%`);
      }
      if (filters.role) {
        query = query.eq('role_id', filters.role);
      }
      if (filters.status.length > 0) {
        const statusBooleans = filters.status.map(s => s === 'active');
        query = query.in('users.is_active', statusBooleans);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching users:', error);
        throw error;
      }

      // Transform the data to match AdminUser interface
      return (data || []).map(user => ({
        id: user.id,
        name: user.name,
        email: user.users?.email || '',
        role_id: user.role_id,
        role_name: user.roles?.name || 'Unknown Role',
        status: user.users?.is_active ? 'active' : 'inactive',
        created_at: user.created_at,
        updated_at: user.updated_at,
        email_verified: user.users?.email_verified || false,
        requires_password_change: user.users?.raw_user_meta_data?.requires_password_change || false,
        last_login_at: user.users?.last_sign_in_at || user.users?.last_login_at,
        phone: user.users?.raw_user_meta_data?.phone,
        position: user.users?.raw_user_meta_data?.position,
        department: user.users?.raw_user_meta_data?.department,
        avatar_url: user.avatar_url
      })) as AdminUser[];
    },
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    retry: 3
  });

  // Fetch pending invitations
  const {
    data: invitations = [],
    isLoading: invitationsLoading,
    error: invitationsError,
    refetch: refetchInvitations
  } = useQuery<AdminInvitation[]>({
    queryKey: ['admin-invitations', showInvitations],
    queryFn: async () => {
      if (!showInvitations) return [];

      const { data, error } = await supabase
        .from('admin_invitations')
        .select('id, email, name, role_id, status, expires_at, created_at, invited_by, user_id, token, resent_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching invitations:', error);
        throw error;
      }

      const invitationRecords = data || [];

      let invitedByLookup: Record<string, string> = {};
      const inviterIds = Array.from(
        new Set(
          invitationRecords
            .map((invitation) => invitation.invited_by)
            .filter((id): id is string => Boolean(id))
        )
      );

      if (inviterIds.length > 0) {
        const { data: inviterData, error: inviterError } = await supabase
          .from('admin_users')
          .select('id, name')
          .in('id', inviterIds);

        if (!inviterError && inviterData) {
          invitedByLookup = inviterData.reduce((acc, inviter) => {
            acc[inviter.id] = inviter.name;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      return invitationRecords.map((invitation) => ({
        ...invitation,
        role_name: roleLookup[invitation.role_id] || 'Unknown Role',
        invited_by_name: invitation.invited_by ? invitedByLookup[invitation.invited_by] : undefined
      })) as AdminInvitation[];
    },
    enabled: showInvitations,
    staleTime: 30 * 1000,
    retry: 1
  });

  useEffect(() => {
    if (!usersError) return;
    console.error('Query error:', usersError);
    toast.error('Failed to load users. Please check your database connection.');
  }, [usersError]);

  useEffect(() => {
    if (!invitationsError) return;
    console.error('Invitations query error:', invitationsError);
    toast.error('Failed to load pending invitations.');
  }, [invitationsError]);

  const isInvitationExpired = (invitation: AdminInvitation) => {
    if (!invitation.expires_at) return false;
    const expiresAt = new Date(invitation.expires_at).getTime();
    if (Number.isNaN(expiresAt)) return false;
    return expiresAt < Date.now();
  };

  const formatInvitationExpiry = (invitation: AdminInvitation) => {
    if (!invitation.expires_at) return 'No expiration date set';
    const expires = new Date(invitation.expires_at);

    if (Number.isNaN(expires.getTime())) {
      return 'Expiration date unavailable';
    }

    const diffMs = expires.getTime() - Date.now();

    if (diffMs <= 0) {
      return `Expired ${expires.toLocaleString()}`;
    }

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 60) {
      return `Expires in ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'}`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `Expires in ${diffHours} hour${diffHours === 1 ? '' : 's'}`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `Expires in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
  };

  const formatTimestamp = (value?: string | null) => {
    if (!value) return 'Unknown';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleString();
  };

  const getInvitationStatusBadgeClass = (status: AdminInvitation['status'], expired: boolean) => {
    if (expired) {
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    }

    switch (status) {
      case 'accepted':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
      case 'expired':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    }
  };

  const pendingInvitationCount = useMemo(() => {
    return invitations.filter((invitation) => invitation.status === 'pending' && !isInvitationExpired(invitation)).length;
  }, [invitations]);

  // Handle sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortAscending(!sortAscending);
    } else {
      setSortColumn(column);
      setSortAscending(true);
    }
  };

  // Sort users
  const sortedUsers = useMemo(() => {
    const sorted = [...users];
    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'email':
          aValue = a.email?.toLowerCase() || '';
          bValue = b.email?.toLowerCase() || '';
          break;
        case 'role_name':
          aValue = a.role_name?.toLowerCase() || '';
          bValue = b.role_name?.toLowerCase() || '';
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        case 'created_at':
          aValue = new Date(a.created_at || 0).getTime();
          bValue = new Date(b.created_at || 0).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortAscending ? -1 : 1;
      if (aValue > bValue) return sortAscending ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [users, sortColumn, sortAscending]);

  // ===== MUTATIONS =====
  
  // Invite user mutation - now uses Edge Function
  const inviteUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const validatedData = createUserSchema.parse(data);
      return await createAdminUser(validatedData);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-invitations'] });
      setIsInviteFormOpen(false);
      setInviteFormState({
        name: '',
        email: '',
        role_id: '',
        personal_message: '',
        phone: '',
        position: '',
        department: ''
      });
      emailValidationCache.current = {};
      setEmailValidation({ checking: false, exists: false, message: undefined });
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
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) => {
      return await updateAdminUser(data.id, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setIsEditFormOpen(false);
      setEditingUser(null);
      toast.success('User updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update user');
    }
  });

  // Resend invitation mutation
  const resendInviteMutation = useMutation({
    mutationFn: resendInvitation,
    onMutate: (invitation) => {
      setResendingInvitationId(invitation.id);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-invitations'] });
      toast.success(result?.message || 'Invitation resent successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to resend invitation');
    },
    onSettled: () => {
      setResendingInvitationId(null);
    }
  });

  const sendPasswordResetMutation = useMutation({
    mutationFn: sendPasswordResetEmail,
    onMutate: (adminUser) => {
      setResettingUserId(adminUser.id);
    },
    onSuccess: (result) => {
      toast.success(result?.message || 'Password reset email sent successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send password reset email');
    },
    onSettled: () => {
      setResettingUserId(null);
    }
  });

  // Process users mutation (deactivate or delete)
  const processUsersMutation = useMutation({
    mutationFn: async ({ users, action }: { users: AdminUser[], action: 'deactivate' | 'delete' }) => {
      const results = [];
      let sessionToken: string | null = null;

      if (action === 'delete') {
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
          throw new Error('Supabase configuration missing. Please contact support.');
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !sessionData?.session) {
          throw new Error('Session expired. Please refresh the page and try again.');
        }

        sessionToken = sessionData.session.access_token;
      }

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

            // Log deactivation locally
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
            continue;
          }

          // Delete flow handled by Edge Function
          const { data: sessions } = await supabase
            .from('past_paper_import_sessions')
            .select('id')
            .eq('uploader_id', user.id)
            .limit(1);

          if (sessions && sessions.length > 0) {
            throw new Error(`Cannot delete user: They have uploaded past papers.`);
          }

          if (!sessionToken) {
            throw new Error('Session expired. Please refresh the page and try again.');
          }

          const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-admin-user`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionToken}`,
              'apikey': SUPABASE_ANON_KEY
            },
            body: JSON.stringify({
              user_id: user.id,
              email: user.email,
              deleted_by: currentUser?.email,
              deleted_by_name: currentUser?.name
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const message = errorData?.error || errorData?.message || 'Failed to delete admin user.';
            throw new Error(message);
          }

          results.push({ success: true });
        } catch (error: any) {
          console.error(`Error ${action}ing user:`, error);
          results.push({ success: false, error: error.message });
        }
      }

      return { results, action };
    },
    onSuccess: ({ results, action }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
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
  });

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

      // CRITICAL FIX: Skip auth dispatch to prevent race condition
      const redirectPath = startTestMode(testUser, true);

      if (redirectPath) {
        toast.success(`Starting test mode as ${testUser.name}`);
        navigate(redirectPath, { replace: true });

        // Dispatch auth change AFTER navigation
        setTimeout(() => {
          dispatchAuthChange();
        }, 50);
      } else {
        toast.error('Failed to start test mode');
      }
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
        queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        
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

  const handleCopyInvitationEmail = async (invitation: AdminInvitation) => {
    try {
      if (typeof navigator !== 'undefined' && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(invitation.email);
      } else if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea');
        textarea.value = invitation.email;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      } else {
        throw new Error('Clipboard API unavailable');
      }

      setCopiedInvitationId(invitation.id);
      toast.success('Email copied to clipboard');
    } catch (error) {
      console.error('Failed to copy invitation email:', error);
      toast.error('Failed to copy email. Please copy it manually.');
    }
  };

  // ===== EFFECTS =====

  useEffect(() => {
    if (!copiedInvitationId) return;

    const timeoutId = window.setTimeout(() => {
      setCopiedInvitationId(null);
    }, 2000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copiedInvitationId]);

  const formatExistingUserMessage = (
    check: { userName?: string; isActive?: boolean },
    email: string
  ) => {
    const displayName = check.userName || email;
    return check.isActive
      ? `User "${displayName}" already exists and is active.`
      : `User "${displayName}" exists but is inactive. Please reactivate.`;
  };

  // Email validation effect
  useEffect(() => {
    const email = inviteFormState.email.trim().toLowerCase();

    if (email.length < 5 || !email.includes('@')) {
      setEmailValidation({ checking: false, exists: false, message: undefined });
      return;
    }

    const cachedResult = emailValidationCache.current[email];
    if (cachedResult) {
      setEmailValidation({
        checking: false,
        exists: cachedResult.exists,
        message: cachedResult.exists ? formatExistingUserMessage(cachedResult, email) : undefined
      });
      return;
    }

    let isCancelled = false;

    setEmailValidation((prev) => ({ ...prev, checking: true }));

    const timeoutId = window.setTimeout(async () => {
      try {
        const userCheck = await checkUserExists(email);
        if (isCancelled) return;

        emailValidationCache.current[email] = userCheck;

        if (userCheck.exists) {
          setEmailValidation({
            checking: false,
            exists: true,
            message: formatExistingUserMessage(userCheck, email)
          });
        } else {
          setEmailValidation({ checking: false, exists: false, message: undefined });
        }
      } catch (error) {
        if (isCancelled) return;
        console.error('Email validation error:', error);
        setEmailValidation({
          checking: false,
          exists: false,
          message: 'We could not validate this email at the moment.'
        });
      }
    }, 400);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [inviteFormState.email]);
  
  useEffect(() => {
    if (editingUser) {
      setEditFormState({
        name: editingUser.name,
        email: editingUser.email,
        role_id: editingUser.role_id,
        status: editingUser.status,
        phone: editingUser.phone || '',
        position: editingUser.position || '',
        department: editingUser.department || ''
      });
    } else {
      setEditFormState({
        name: '',
        email: '',
        role_id: '',
        status: 'active',
        phone: '',
        position: '',
        department: ''
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
          <div>
            <div className="font-medium">{row.email}</div>
            {row.phone && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                📞 {row.phone}
              </div>
            )}
          </div>
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
      cell: (row: AdminUser) => (
        <div>
          <div className="font-medium">{row.role_name}</div>
          {row.position && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {row.position}
            </div>
          )}
        </div>
      ),
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
          {row.status === 'active' && row.requires_password_change && (
            <span
              className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 rounded-full"
              title="User must set their password before logging in"
            >
              Setup pending
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
        <div className="text-sm">
          {row.last_login_at ? (
            <div>
              <div className="text-gray-900 dark:text-white">
                {new Date(row.last_login_at).toLocaleDateString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(row.last_login_at).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          ) : (
            <span className="text-gray-500 dark:text-gray-400 italic">Never</span>
          )}
        </div>
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

      {row.status === 'active' && (
        <button
          onClick={() => sendPasswordResetMutation.mutate(row)}
          disabled={sendPasswordResetMutation.isLoading}
          className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 p-1 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          title="Send password reset email"
        >
          {sendPasswordResetMutation.isLoading && resettingUserId === row.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Key className="h-4 w-4" />
          )}
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
      <div className="flex flex-wrap items-center justify-between gap-3">
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

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={showInvitations ? 'outline' : 'secondary'}
            onClick={() => {
              handleToggleInvitations();
              if (!showInvitations) {
                refetchInvitations();
              }
            }}
            leftIcon={<Mail className="h-4 w-4" />}
          >
            {showInvitations
              ? 'Hide Pending Invitations'
              : pendingInvitationCount > 0
                ? `View Pending Invitations (${pendingInvitationCount})`
                : 'View Pending Invitations'}
          </Button>

          <Button
            onClick={() => setIsInviteFormOpen(true)}
            leftIcon={<Send className="h-4 w-4" />}
          >
            Create Admin User
          </Button>
        </div>
      </div>

      {!showInvitations && pendingInvitationCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
          <AlertCircle className="h-5 w-5" />
          <div>
            <p className="font-semibold">Pending admin invitations</p>
            <p className="text-xs text-blue-700/80 dark:text-blue-200/80">
              {pendingInvitationCount} invitation{pendingInvitationCount === 1 ? '' : 's'} awaiting acceptance.
            </p>
          </div>
        </div>
      )}

      {showInvitations && (
        <div className="rounded-xl border border-panel bg-panel shadow-md">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-panel px-5 py-4 bg-card-elevated">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Pending Invitations</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Monitor outstanding invitations and resend secure setup emails when needed.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => refetchInvitations()}
                className="p-2 rounded-full hover:bg-card-hover transition-colors text-gray-600 dark:text-gray-300 hover:text-[#5d7e23] dark:hover:text-[#9ed050]"
                title="Refresh invitations"
              >
                <RefreshCw className={`h-4 w-4 ${invitationsLoading ? 'animate-spin' : ''}`} />
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInvitations(false)}
              >
                Close
              </Button>
            </div>
          </div>

          <div className="space-y-3 px-5 py-4 bg-panel">
            {invitationsError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                Failed to load invitations. Please try refreshing.
              </div>
            ) : invitationsLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500 dark:text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading invitations…</span>
              </div>
            ) : invitations.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                No pending invitations found.
              </div>
            ) : (
              invitations.map((invitation) => {
                const expired = isInvitationExpired(invitation);
                const canResend = invitation.status === 'pending' || invitation.status === 'expired' || expired;

                return (
                  <div
                    key={invitation.id}
                    className="rounded-lg border border-filter bg-invitation-card px-5 py-4 shadow-sm transition-all hover:border-[#8CC63F]/50 hover:shadow-md hover:bg-invitation-hover"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{invitation.email}</span>
                          <span
                            className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getInvitationStatusBadgeClass(invitation.status, expired)}`}
                          >
                            {expired ? 'Expired' : invitation.status.replace(/^(\w)/, (m) => m.toUpperCase())}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Role: <span className="font-normal">{invitation.role_name || roleLookup[invitation.role_id] || 'Unknown Role'}</span></span>
                          <span>{formatInvitationExpiry(invitation)}</span>
                          <span>Invited: {formatTimestamp(invitation.created_at)}</span>
                          {invitation.resent_at && (
                            <span>Last resent: {formatTimestamp(invitation.resent_at)}</span>
                          )}
                          {invitation.invited_by_name && (
                            <span>Invited by {invitation.invited_by_name}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopyInvitationEmail(invitation)}
                          className="rounded-full p-2 text-gray-500 transition-colors hover:bg-card-hover hover:text-[#5d7e23] dark:text-gray-400 dark:hover:text-[#9ed050]"
                          title="Copy email"
                        >
                          {copiedInvitationId === invitation.id ? (
                            <Check className="h-4 w-4 text-[#8CC63F]" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>

                        <button
                          onClick={() => resendInviteMutation.mutate(invitation)}
                          disabled={!canResend || resendInviteMutation.isLoading}
                          className="rounded-full p-2 text-[#5d7e23] dark:text-[#9ed050] transition-colors hover:bg-[#8CC63F]/10 disabled:cursor-not-allowed disabled:opacity-50"
                          title={canResend ? 'Resend invitation email' : 'Invitation cannot be resent'}
                        >
                          {resendingInvitationId === invitation.id && resendInviteMutation.isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

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
        data={sortedUsers}
        columns={columns}
        keyField="id"
        caption="List of system users with their roles and status"
        ariaLabel="System users data table"
        loading={isLoading}
        isFetching={isFetching}
        renderActions={renderActions}
        emptyMessage="No system users found"
        sorting={{
          sort: { column: sortColumn, ascending: sortAscending },
          handleSort: handleSort
        }}
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
            personal_message: '',
            phone: '',
            position: '',
            department: ''
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
              leftIcon={<User className="h-4 w-4 text-gray-400" />}
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
                className={`transition-colors ${
                  emailValidation.exists
                    ? 'border-red-300 dark:border-red-600'
                    : !emailValidation.checking && inviteFormState.email && !emailValidation.message
                      ? 'border-emerald-300 dark:border-emerald-500'
                      : ''
                }`}
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
              {!emailValidation.checking && inviteFormState.email && !emailValidation.exists && !emailValidation.message && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <Check className="h-4 w-4 text-emerald-500" />
                </div>
              )}
            </div>
            {inviteFormState.email && (
              <p
                className={`mt-2 text-xs ${
                  emailValidation.checking
                    ? 'text-gray-500 dark:text-gray-400'
                    : emailValidation.exists
                      ? 'text-red-600 dark:text-red-400'
                      : emailValidation.message
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {emailValidation.checking
                  ? 'Checking availability…'
                  : emailValidation.exists
                    ? emailValidation.message
                    : emailValidation.message || 'Email is available for a new admin account.'}
              </p>
            )}
          </FormField>

          <FormField id="invite-phone" label="Phone Number" error={formErrors.phone}>
            <Input
              id="invite-phone"
              name="phone"
              type="tel"
              placeholder="Enter phone number"
              value={inviteFormState.phone}
              onChange={(e) => setInviteFormState({ ...inviteFormState, phone: e.target.value })}
              leftIcon={<Phone className="h-4 w-4 text-gray-400" />}
            />
          </FormField>

          <FormField id="invite-position" label="Position" error={formErrors.position}>
            <Input
              id="invite-position"
              name="position"
              placeholder="Enter job position"
              value={inviteFormState.position}
              onChange={(e) => setInviteFormState({ ...inviteFormState, position: e.target.value })}
              leftIcon={<User className="h-4 w-4 text-gray-400" />}
            />
          </FormField>

          <FormField id="invite-department" label="Department" error={formErrors.department}>
            <Input
              id="invite-department"
              name="department"
              placeholder="Enter department"
              value={inviteFormState.department}
              onChange={(e) => setInviteFormState({ ...inviteFormState, department: e.target.value })}
              leftIcon={<Building className="h-4 w-4 text-gray-400" />}
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

          <FormField id="edit-phone" label="Phone Number" error={formErrors.phone}>
            <Input
              id="edit-phone"
              name="phone"
              type="tel"
              placeholder="Enter phone number"
              value={editFormState.phone}
              onChange={(e) => setEditFormState({ ...editFormState, phone: e.target.value })}
              leftIcon={<Phone className="h-4 w-4 text-gray-400" />}
            />
          </FormField>

          <FormField id="edit-position" label="Position" error={formErrors.position}>
            <Input
              id="edit-position"
              name="position"
              placeholder="Enter job position"
              value={editFormState.position}
              onChange={(e) => setEditFormState({ ...editFormState, position: e.target.value })}
              leftIcon={<User className="h-4 w-4 text-gray-400" />}
            />
          </FormField>

          <FormField id="edit-department" label="Department" error={formErrors.department}>
            <Input
              id="edit-department"
              name="department"
              placeholder="Enter department"
              value={editFormState.department}
              onChange={(e) => setEditFormState({ ...editFormState, department: e.target.value })}
              leftIcon={<Building className="h-4 w-4 text-gray-400" />}
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