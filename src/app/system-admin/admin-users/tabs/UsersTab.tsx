/**
 * File: /src/app/system-admin/admin-users/tabs/UsersTab.tsx
 * Dependencies: 
 *   - React, react-router-dom
 *   - @tanstack/react-query
 *   - lucide-react
 *   - zod
 *   - Custom components and lib
 * 
 * Preserved Features:
 *   - User CRUD operations
 *   - Role management
 *   - Status management
 *   - Test mode functionality
 *   - Email verification status
 *   - Filtering and search
 * 
 * Added/Modified:
 *   - Centralized authentication through users table
 *   - Email verification flow
 *   - Removed password management from admin_users
 *   - Updated API endpoints
 *   - Simplified session handling
 * 
 * Database Tables:
 *   - users (main auth table)
 *   - admin_users (profile only)
 *   - roles
 *   - email_verifications
 * 
 * Connected Files:
 *   - /src/app/api/users/route.ts
 *   - /src/app/api/auth/route.ts
 *   - /src/lib/auth.ts
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
  FlaskConical, 
  Loader2,
  RefreshCw,
  Shield 
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
  getAuthenticatedUser 
} from '../../../../lib/auth';

// ===== VALIDATION SCHEMAS =====
const adminUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').transform(e => e.toLowerCase()),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number')
    .optional(),
  role_id: z.string().uuid('Please select a role'),
  status: z.enum(['active', 'inactive'])
});

const passwordChangeSchema = z.object({
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number')
    .regex(/[!@#$%^&*]/, 'Password must contain special character'),
  sendEmail: z.boolean().optional()
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

// ===== HELPER FUNCTIONS =====
function generateComplexPassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const allChars = uppercase + lowercase + numbers + special;
  
  let password = '';
  // Ensure at least one of each required character type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// ===== API HELPER FUNCTION =====
async function makeAPICall(method: string, endpoint: string = '', body?: any) {
  try {
    // Get current session
    let { data: { session } } = await supabase.auth.getSession();
    
    let token = session?.access_token;
    
    if (!token) {
      // Try to refresh session
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshData.session?.access_token) {
        toast.error('Session expired. Please log in again.');
        window.location.href = '/signin';
        throw new Error('Not authenticated');
      }
      
      token = refreshData.session.access_token;
      session = refreshData.session;
    }

    const response = await fetch(`/api/users${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: body ? JSON.stringify(body) : undefined
    });

    // Check if response is ok before trying to parse
    if (!response.ok) {
      // Try to parse error message
      let errorMessage = 'Request failed';
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
      } else {
        // Try to get text response
        try {
          const textError = await response.text();
          if (textError) {
            errorMessage = textError;
          }
        } catch (textError) {
          console.error('Error reading error response:', textError);
        }
      }
      
      if (response.status === 401) {
        toast.error('Session expired. Please log in again.');
        window.location.href = '/signin';
      }
      
      throw new Error(errorMessage);
    }

    // Handle empty responses (204 No Content, etc.)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return { success: true };
    }

    // Check content type
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        return await response.json();
      } catch (parseError) {
        console.error('Error parsing JSON response:', parseError);
        // Return a default success response if parsing fails
        return { success: true };
      }
    }

    // If not JSON, try to return text
    try {
      const text = await response.text();
      return { success: true, data: text };
    } catch (e) {
      // If even text parsing fails, return basic success
      return { success: true };
    }
    
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// ===== MAIN COMPONENT =====
export default function UsersTab() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [generatePassword, setGeneratePassword] = useState(true);
  const [generateNewPassword, setGenerateNewPassword] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  
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
    password: '',
    role_id: '',
    status: 'active' as 'active' | 'inactive'
  });

  // Password form state
  const [passwordFormState, setPasswordFormState] = useState({
    newPassword: '',
    sendEmail: false
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
    isFetching,
    refetch: refetchUsers
  } = useQuery<AdminUser[]>(
    ['admin-users', filters],
    async () => {
      let query = supabase
        .from('admin_users')
        .select(`
          id,
          name,
          email,
          role_id,
          status,
          created_at,
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

      // Enhance with data from users table
      const enhancedData = await Promise.all(
        (data || []).map(async (adminUser) => {
          const { data: userData } = await supabase
            .from('users')
            .select('email_verified, requires_password_change, last_login_at')
            .eq('id', adminUser.id)
            .maybeSingle();

          return {
            ...adminUser,
            role_name: adminUser.roles?.name || 'Unknown',
            email_verified: userData?.email_verified || false,
            requires_password_change: userData?.requires_password_change || false,
            last_login_at: userData?.last_login_at
          };
        })
      );

      return enhancedData;
    },
    { 
      keepPreviousData: true, 
      staleTime: 30 * 1000, // Refresh every 30 seconds
      refetchInterval: 30 * 1000 
    }
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
        // UPDATE USER - only update profile data
        const response = await makeAPICall('PUT', '', {
          userId: editingUser.id,
          name: validatedData.name,
          email: validatedData.email,
          role_id: validatedData.role_id,
          is_active: validatedData.status === 'active'
        });

        return response || { success: true };
      } else {
        // CREATE NEW USER with centralized auth
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
        if (response?.user?.temporary_password) {
          setGeneratedPassword(response.user.temporary_password);
        }

        return response || { success: true };
      }
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['admin-users']);
        
        if (!editingUser && data?.user?.temporary_password) {
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
          
          const message = data?.message || `User ${editingUser ? 'updated' : 'created'} successfully`;
          toast.success(message);
          
          // Show additional info about verification
          if (!editingUser && data?.user) {
            toast.info('Verification email has been sent to the user', {
              duration: 5000
            });
          }
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
          const errorMessage = error.message || 'Operation failed';
          
          if (errorMessage.includes('already exists')) {
            setFormErrors({ email: 'This email is already registered' });
          } else {
            setFormErrors({ form: errorMessage });
          }
          
          toast.error(errorMessage);
        }
      }
    }
  );

  // Delete users mutation
  const deleteMutation = useMutation(
    async (users: AdminUser[]) => {
      const results = [];
      for (const user of users) {
        try {
          const result = await makeAPICall('DELETE', `?userId=${user.id}&hard=false`);
          results.push(result || { success: true });
        } catch (error) {
          console.error(`Error deleting user ${user.id}:`, error);
          results.push({ success: false, error });
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
        } else if (successCount > 0) {
          toast.warning(`${successCount} user(s) deactivated, ${failCount} failed`);
        } else {
          toast.error('Failed to deactivate user(s)');
        }
      },
      onError: (error) => {
        console.error('Error deleting users:', error);
        toast.error('Failed to deactivate user(s)');
        setIsConfirmDialogOpen(false);
        setUsersToDelete([]);
      }
    }
  );

  // Resend verification mutation
  const resendVerificationMutation = useMutation(
    async (userId: string) => {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        let errorMessage = 'Failed to send verification email';
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch (e) {
          // If JSON parsing fails, use default error message
        }
        throw new Error(errorMessage);
      }

      // Handle potential empty response
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return { success: true };
      }

      try {
        return await response.json();
      } catch (e) {
        return { success: true };
      }
    },
    {
      onSuccess: () => {
        toast.success('Verification email sent successfully');
        refetchUsers();
      },
      onError: (error: any) => {
        console.error('Error:', error);
        toast.error(error.message || 'Failed to send verification email');
      }
    }
  );

  // Change password mutation (direct password change by admin)
  const changePasswordMutation = useMutation(
    async (data: { userId: string; password: string; sendEmail: boolean }) => {
      // Call API to change password directly
      const response = await makeAPICall('PUT', '/change-password', {
        userId: data.userId,
        newPassword: data.password,
        requirePasswordChange: false, // Admin set password, no need to change
        sendNotification: data.sendEmail
      });

      return response || { success: true, password: data.password };
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['admin-users']);
        
        if (data.password) {
          // Show the new password to admin
          setGeneratedPassword(data.password);
          toast.success('Password changed successfully. Copy the new password!');
        } else {
          setIsPasswordFormOpen(false);
          setEditingUser(null);
          toast.success('Password changed successfully');
        }
        
        setFormErrors({});
      },
      onError: (error: any) => {
        console.error('Error changing password:', error);
        toast.error(error.message || 'Failed to change password');
      }
    }
  );

  // Reset password mutation (sends reset email)
  const resetPasswordMutation = useMutation(
    async (email: string) => {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        let errorMessage = 'Failed to send reset email';
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch (e) {
          // If JSON parsing fails, use default error message
        }
        throw new Error(errorMessage);
      }

      // Handle potential empty response
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return { success: true };
      }

      try {
        return await response.json();
      } catch (e) {
        return { success: true };
      }
    },
    {
      onSuccess: (data, email) => {
        toast.success(`Password reset email sent to ${email}`);
      },
      onError: (error: any) => {
        console.error('Error:', error);
        toast.error(error.message || 'Failed to send reset email');
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
        role: mapUserTypeToRole('system') as UserRole,
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

  // ===== HANDLERS =====
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors({});
    userMutation.mutate(new FormData(e.currentTarget));
  };

  const handlePasswordChange = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors({});
    
    if (!editingUser) return;
    
    const formData = new FormData(e.currentTarget);
    const newPassword = formData.get('newPassword') as string;
    const sendEmail = formData.get('sendEmail') === 'on';
    
    // Validate password
    try {
      passwordChangeSchema.parse({ newPassword, sendEmail });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setFormErrors(errors);
        return;
      }
    }
    
    // Use generated password if checkbox is checked
    const passwordToSet = generateNewPassword ? generateComplexPassword() : newPassword;
    
    changePasswordMutation.mutate({
      userId: editingUser.id,
      password: passwordToSet,
      sendEmail
    });
    
    // Store the password for display if generated
    if (generateNewPassword) {
      setGeneratedPassword(passwordToSet);
    }
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
    setIsPasswordFormOpen(false);
    setEditingUser(null);
    setFormState({
      name: '',
      email: '',
      password: '',
      role_id: '',
      status: 'active'
    });
    setPasswordFormState({
      newPassword: '',
      sendEmail: false
    });
    setGenerateNewPassword(true);
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
  
  useEffect(() => {
    // Reset password form when closing
    if (!isPasswordFormOpen) {
      setPasswordFormState({
        newPassword: '',
        sendEmail: false
      });
      setGenerateNewPassword(true);
      setShowNewPassword(false);
    }
  }, [isPasswordFormOpen]);

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
          {row.status === 'active' && row.email_verified && (
            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded-full">
              Verified
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
      {/* Resend Verification */}
      {row.status === 'active' && !row.email_verified && (
        <button
          onClick={() => resendVerificationMutation.mutate(row.id)}
          disabled={resendVerificationMutation.isLoading}
          className="text-amber-600 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 p-1 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-full transition-colors disabled:opacity-50"
          title="Resend verification email"
        >
          {resendVerificationMutation.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mail className="h-4 w-4" />
          )}
        </button>
      )}
      
      {/* Change Password (for SSA only) */}
      {isSSA && row.status === 'active' && (
        <button
          onClick={() => {
            setEditingUser(row);
            setIsPasswordFormOpen(true);
            setGenerateNewPassword(true);
            setPasswordFormState({
              newPassword: '',
              sendEmail: false
            });
          }}
          className="text-purple-600 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 p-1 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-full transition-colors"
          title="Change password"
        >
          <Key className="h-4 w-4" />
        </button>
      )}
      
      {/* Send Reset Email */}
      {row.status === 'active' && row.email_verified && (
        <button
          onClick={() => resetPasswordMutation.mutate(row.email)}
          disabled={resetPasswordMutation.isLoading}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors disabled:opacity-50"
          title="Send password reset email"
        >
          {resetPasswordMutation.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </button>
      )}
      
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
      
      {/* Deactivate/Delete */}
      <button
        onClick={() => handleDelete([row])}
        disabled={deleteMutation.isLoading}
        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors disabled:opacity-50"
        title={row.status === 'active' ? 'Deactivate' : 'Delete'}
      >
        <Trash2 className="h-4 w-4" />
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

          <FormField 
            id="email" 
            label="Email" 
            required 
            error={formErrors.email}
            helpText={editingUser ? "Changing email will require re-verification" : "Verification email will be sent"}
          >
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
                  helpText="Must be at least 8 characters with uppercase, lowercase, and number"
                >
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      placeholder="Enter password"
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
            helpText={!editingUser ? "Active users will receive a verification email" : "Inactive users cannot log in"}
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

          {editingUser && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Note:</strong> To change the user's password, use the password reset option from the table actions.
              </p>
            </div>
          )}
        </form>
      </SlideInForm>

      {/* Change Password Form (Admin Direct Change) */}
      <SlideInForm
        key={`${editingUser?.id || 'new'}-password`}
        title={`Change Password for ${editingUser?.name}`}
        isOpen={isPasswordFormOpen && !generatedPassword}
        onClose={() => {
          setIsPasswordFormOpen(false);
          setEditingUser(null);
          setFormErrors({});
          setShowNewPassword(false);
          setGenerateNewPassword(true);
          setPasswordFormState({
            newPassword: '',
            sendEmail: false
          });
        }}
        onSave={() => {
          const form = document.querySelector('form[name="passwordForm"]') as HTMLFormElement;
          if (form) form.requestSubmit();
        }}
        loading={changePasswordMutation.isLoading}
      >
        <form name="passwordForm" onSubmit={handlePasswordChange} className="space-y-4">
          {formErrors.form && (
            <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
              {formErrors.form}
            </div>
          )}

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              As a Super Admin, you can directly set a new password for this user.
            </p>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="generateNewPassword"
              checked={generateNewPassword}
              onChange={(e) => setGenerateNewPassword(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="generateNewPassword" className="text-sm text-gray-700 dark:text-gray-300">
              Generate secure password automatically
            </label>
          </div>

          {!generateNewPassword && (
            <FormField 
              id="newPassword" 
              label="New Password" 
              required 
              error={formErrors.newPassword}
              helpText="Must be at least 8 characters with uppercase, lowercase, number, and special character"
            >
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  id="newPassword"
                  name="newPassword"
                  placeholder="Enter new password"
                  value={passwordFormState.newPassword}
                  onChange={(e) => setPasswordFormState({ ...passwordFormState, newPassword: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FormField>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sendEmail"
              name="sendEmail"
              checked={passwordFormState.sendEmail}
              onChange={(e) => setPasswordFormState({ ...passwordFormState, sendEmail: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="sendEmail" className="text-sm text-gray-700 dark:text-gray-300">
              Send new password to user's email
            </label>
          </div>

          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              <strong>Note:</strong> The user will be able to log in immediately with this password. 
              {passwordFormState.sendEmail && " An email with the new password will be sent to the user."}
            </p>
          </div>
        </form>
      </SlideInForm>

      {/* Generated Password Modal */}
      {generatedPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {editingUser ? 'Password Changed Successfully' : 'User Created Successfully'}
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {editingUser 
                  ? `A new password has been set for ${editingUser.name}. Please copy and share it securely.`
                  : 'A temporary password has been generated. Please copy and share it securely with the user.'
                }
              </p>
              {!editingUser && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  The user will receive a verification email and must verify their email before logging in.
                </p>
              )}
            </div>

            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md mb-4">
              <div className="flex items-center justify-between">
                <code className="text-sm font-mono break-all">{generatedPassword}</code>
                <button
                  onClick={copyPassword}
                  className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded flex-shrink-0"
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

            <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md mb-4 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <strong>Important:</strong> This password will not be shown again. Make sure to copy it now.
              </p>
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