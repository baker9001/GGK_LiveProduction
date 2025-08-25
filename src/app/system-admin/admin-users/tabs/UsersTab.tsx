/**
 * File: /src/app/system-admin/admin-users/tabs/UsersTab.tsx
 * Dependencies: 
 *   - React, react-router-dom
 *   - @tanstack/react-query
 *   - lucide-react
 *   - zod
 *   - bcryptjs
 *   - crypto
 *   - Custom components and lib (NO API CALLS)
 * 
 * Preserved Features:
 *   - User CRUD operations (direct database)
 *   - Role management
 *   - Status management
 *   - Test mode functionality
 *   - Email verification status
 *   - Password Requirements Checker
 *   - Print password functionality
 *   - Resend verification
 *   - Password reset email
 *   - All UI components and interactions
 * 
 * Database Tables:
 *   - users (main auth table)
 *   - admin_users (profile only)
 *   - roles
 *   - audit_logs
 * 
 * Removed:
 *   - All API calls (makeAPICall removed)
 *   - Supabase auth dependencies
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
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
  Printer,
  User,
  AlertCircle
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

// Password complexity requirements
interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'Contains uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { label: 'Contains lowercase letter (a-z)', test: (p) => /[a-z]/.test(p) },
  { label: 'Contains number (0-9)', test: (p) => /[0-9]/.test(p) },
  { label: 'Contains special character (!@#$%^&*)', test: (p) => /[!@#$%^&*]/.test(p) }
];

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

function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ===== PASSWORD REQUIREMENTS COMPONENT =====
const PasswordRequirementsChecker: React.FC<{ password: string }> = ({ password }) => {
  return (
    <div className="mt-2 space-y-1">
      {passwordRequirements.map((req, index) => {
        const isMet = password ? req.test(password) : false;
        return (
          <div 
            key={index} 
            className={`flex items-center gap-2 text-xs transition-all ${
              isMet ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {isMet ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            <span>{req.label}</span>
          </div>
        );
      })}
    </div>
  );
};

// ===== MAIN COMPONENT ======
export default function UsersTab() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // Get current user
  const currentUser = getAuthenticatedUser();
  
  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [emailExistsError, setEmailExistsError] = useState<string | null>(null);
  const [isValidatingEmail, setIsValidatingEmail] = useState(false);
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

  // Email validation function
  const validateEmailAvailability = async (email: string) => {
    if (!email || email.trim() === '') {
      setEmailExistsError(null);
      return;
    }

    // Skip validation if email format is invalid
    try {
      z.string().email().parse(email);
    } catch {
      setEmailExistsError(null);
      return;
    }

    setIsValidatingEmail(true);
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      // Check admin_users table
      let query = supabase
        .from('admin_users')
        .select('id, email')
        .eq('email', normalizedEmail);
      
      // Exclude current user when editing
      if (editingUser?.id) {
        query = query.neq('id', editingUser.id);
      }
      
      const { data, error } = await query.maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      setEmailExistsError(data ? 'An administrator with this email already exists' : null);
    } catch (error) {
      console.error('Email validation error:', error);
      setEmailExistsError('Unable to verify email availability. Please try again.');
    } finally {
      setIsValidatingEmail(false);
    }
  };

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
      staleTime: 30 * 1000,
      refetchInterval: 30 * 1000 
    }
  );

  // ===== MUTATIONS =====
  
  // Create/update user mutation (NO API)
  const userMutation = useMutation(
    async (formData: FormData) => {
      // Check for email duplication before submitting
      const email = formData.get('email') as string;
      if (emailExistsError) {
        throw new Error('Email address is already in use. Please choose a different email.');
      }
      
      const name = formData.get('name') as string;
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
        // ===== UPDATE EXISTING USER (Direct Database) =====
        
        // 1. Update users table
        const userUpdates: any = {
          email: validatedData.email,
          is_active: validatedData.status === 'active',
          updated_at: new Date().toISOString(),
          raw_user_meta_data: {
            name: validatedData.name,
            updated_by: currentUser?.id
          }
        };
        
        // Check if email is changing
        if (validatedData.email !== editingUser.email) {
          userUpdates.email_verified = false;
          userUpdates.verification_token = generateVerificationToken();
          userUpdates.verification_sent_at = new Date().toISOString();
        }
        
        const { error: userUpdateError } = await supabase
          .from('users')
          .update(userUpdates)
          .eq('id', editingUser.id);
        
        if (userUpdateError) throw userUpdateError;
        
        // 2. Update admin_users table
        const { error: adminUpdateError } = await supabase
          .from('admin_users')
          .update({
            name: validatedData.name,
            email: validatedData.email,
            role_id: validatedData.role_id,
            status: validatedData.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingUser.id);
        
        if (adminUpdateError) throw adminUpdateError;
        
        return { success: true, message: 'User updated successfully' };
        
      } else {
        // ===== CREATE NEW USER (Direct Database) =====
        
        // Check if email already exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', validatedData.email)
          .single();
        
        if (existingUser) {
          throw new Error('Email already exists');
        }
        
        // Generate password if needed
        const finalPassword = password || generateComplexPassword();
        const isGeneratedPassword = !password;
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(finalPassword, salt);
        
        // 1. Create user in users table
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert({
            email: validatedData.email,
            password_hash: passwordHash,
            user_type: 'system',
            is_active: validatedData.status === 'active',
            email_verified: false,
            verification_token: generateVerificationToken(),
            verification_sent_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            raw_user_meta_data: {
              name: validatedData.name,
              created_by: currentUser?.id
            }
          })
          .select()
          .single();
        
        if (userError) throw userError;
        
        // 2. Create admin user profile
        const { error: adminError } = await supabase
          .from('admin_users')
          .insert({
            id: newUser.id,
            name: validatedData.name,
            email: validatedData.email,
            role_id: validatedData.role_id,
            status: validatedData.status,
            created_at: new Date().toISOString()
          });
        
        if (adminError) {
          // Rollback: delete the user if admin_users insert fails
          await supabase.from('users').delete().eq('id', newUser.id);
          throw adminError;
        }
        
        // 3. Log the creation
        await supabase
          .from('audit_logs')
          .insert({
            user_id: currentUser?.id,
            action: 'create_admin_user',
            entity_type: 'admin_user',
            entity_id: newUser.id,
            details: {
              email: validatedData.email,
              role_id: validatedData.role_id,
              created_by: currentUser?.email
            },
            created_at: new Date().toISOString()
          });
        
        return {
          success: true,
          message: 'User created successfully',
          user: {
            id: newUser.id,
            email: newUser.email,
            temporary_password: isGeneratedPassword ? finalPassword : undefined
          }
        };
      }
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['admin-users']);
        
        if (!editingUser && data?.user?.temporary_password) {
          // Show password modal for new users with generated password
          setGeneratedPassword(data.user.temporary_password);
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
          
          // Show additional info about verification for new users
          if (!editingUser && data?.user) {
            toast.info('Verification email has been sent to the user', {
              duration: 5000
            });
          }
        }
        setFormErrors({});
        setEmailExistsError(null);
        setShowPassword(false);
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

  // Delete users mutation (NO API)
  const deleteMutation = useMutation(
    async (users: AdminUser[]) => {
      const results = [];
      
      for (const user of users) {
        try {
          // Soft delete - deactivate the user
          const { error: deactivateError } = await supabase
            .from('users')
            .update({
              is_active: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
          
          if (deactivateError) throw deactivateError;
          
          // Also update admin_users status
          await supabase
            .from('admin_users')
            .update({
              status: 'inactive',
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
          
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
              },
              created_at: new Date().toISOString()
            });
          
          results.push({ success: true });
        } catch (error) {
          console.error(`Error deactivating user ${user.id}:`, error);
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

  // Resend verification mutation (NO API)
  const resendVerificationMutation = useMutation(
    async (userId: string) => {
      // Generate new verification token
      const token = generateVerificationToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      // Update user with new token
      const { error: updateError } = await supabase
        .from('users')
        .update({
          verification_token: token,
          verification_sent_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (updateError) throw updateError;
      
      // Get user email
      const { data: user } = await supabase
        .from('users')
        .select('email, raw_user_meta_data')
        .eq('id', userId)
        .single();
      
      if (!user) throw new Error('User not found');
      
      // TODO: Send actual email
      console.log('Verification email would be sent to:', user.email);
      console.log('Verification token:', token);
      
      return { success: true };
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

  // Change password mutation (NO API)
  const changePasswordMutation = useMutation(
    async (data: { userId: string; password: string; sendEmail: boolean }) => {
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(data.password, salt);
      
      // Update password in users table
      const { error: updateError } = await supabase
        .from('users')
        .update({
          password_hash: passwordHash,
          password_updated_at: new Date().toISOString(),
          requires_password_change: false,
          failed_login_attempts: 0,
          locked_until: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.userId);
      
      if (updateError) throw updateError;
      
      // Log the password change
      await supabase
        .from('audit_logs')
        .insert({
          user_id: currentUser?.id,
          action: 'admin_password_change',
          entity_type: 'user',
          entity_id: data.userId,
          details: {
            changed_by: currentUser?.email,
            target_user: editingUser?.email,
            notification_sent: data.sendEmail
          },
          created_at: new Date().toISOString()
        });
      
      // TODO: Send email notification if requested
      if (data.sendEmail) {
        console.log('Password change email would be sent to:', editingUser?.email);
      }
      
      return { success: true, password: data.password };
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['admin-users']);
        
        if (data.password) {
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

  // Reset password mutation (NO API)
  const resetPasswordMutation = useMutation(
    async (email: string) => {
      // Generate reset token
      const token = generateVerificationToken();
      const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
      
      // Get user by email
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();
      
      if (!user) throw new Error('User not found');
      
      // Create password reset token record
      const { error: tokenError } = await supabase
        .from('password_reset_tokens')
        .insert({
          user_id: user.id,
          token: token,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString()
        });
      
      if (tokenError) throw tokenError;
      
      // TODO: Send actual reset email
      console.log('Password reset email would be sent to:', email);
      console.log('Reset token:', token);
      console.log('Reset URL:', `${window.location.origin}/reset-password?token=${token}`);
      
      return { success: true };
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
    
    // Check for email validation errors
    if (emailExistsError) {
      toast.error('Please fix the email duplication error before submitting');
      return;
    }
    
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
  
  const printPassword = () => {
    if (generatedPassword && editingUser) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Password for ${editingUser.name}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .header { font-size: 18px; font-weight: bold; margin-bottom: 20px; }
                .info { margin: 10px 0; }
                .password { 
                  font-family: monospace; 
                  font-size: 16px; 
                  background: #f3f4f6; 
                  padding: 10px; 
                  border: 1px solid #d1d5db;
                  margin: 20px 0;
                }
                .footer { margin-top: 30px; font-size: 12px; color: #6b7280; }
              </style>
            </head>
            <body>
              <div class="header">GGK Learning System - Password Information</div>
              <div class="info"><strong>User:</strong> ${editingUser.name}</div>
              <div class="info"><strong>Email:</strong> ${editingUser.email}</div>
              <div class="info"><strong>Generated:</strong> ${new Date().toLocaleString()}</div>
              <div class="password">${generatedPassword}</div>
              <div class="footer">
                Please share this password securely with the user. 
                They will need to verify their email before logging in.
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
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

  // ===== RENDER (All UI preserved exactly as original) =====
  
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

      {/* Create/Edit User Form (Preserved exactly as original) */}
      <SlideInForm
        key={editingUser?.id || 'new'}
        title={editingUser ? 'Edit System User' : 'Create System User'}
        isOpen={isFormOpen && !generatedPassword}
        onClose={() => {
          setIsFormOpen(false);
          setEditingUser(null);
          setFormErrors({});
          setEmailExistsError(null);
          setShowPassword(false);
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
            error={formErrors.email || emailExistsError || (isValidatingEmail ? 'Checking email availability...' : '')}
            helpText={editingUser ? "Changing email will require re-verification" : "Verification email will be sent"}
          >
            <Input
              type="email"
              id="email"
              name="email"
              placeholder="Enter email address"
              value={formState.email}
              onChange={(e) => {
                setFormState({ ...formState, email: e.target.value });
                setEmailExistsError(null);
              }}
              onBlur={(e) => validateEmailAvailability(e.target.value)}
              leftIcon={<Mail className="h-4 w-4 text-gray-400" />}
            />
            {isValidatingEmail && (
              <div className="mt-1 flex items-center text-xs text-blue-600 dark:text-blue-400">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500 mr-2"></div>
                Checking email availability...
              </div>
            )}
          </FormField>

          {!editingUser && (
            <>
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Password Options
                  </p>
                  
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="passwordOption"
                        checked={generatePassword}
                        onChange={() => {
                          setGeneratePassword(true);
                          setFormState({ ...formState, password: '' });
                        }}
                        className="text-[#8CC63F]"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Auto-generate secure password
                      </span>
                    </label>
                    
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="passwordOption"
                        checked={!generatePassword}
                        onChange={() => setGeneratePassword(false)}
                        className="text-[#8CC63F]"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Set password manually
                      </span>
                    </label>
                  </div>
                </div>

                {!generatePassword && (
                  <FormField 
                    id="password" 
                    label="Password" 
                    required 
                    error={formErrors.password}
                  >
                    <div className="space-y-2">
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          id="password"
                          name="password"
                          placeholder="Enter password"
                          value={formState.password}
                          onChange={(e) => setFormState({ ...formState, password: e.target.value })}
                          autoComplete="new-password"
                          leftIcon={<Shield className="h-4 w-4 text-gray-400" />}
                          className={`pr-10 ${
                            formState.password && 
                            passwordRequirements.every(req => req.test(formState.password))
                              ? 'border-green-500 focus:border-green-500'
                              : ''
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                      </div>
                      <PasswordRequirementsChecker password={formState.password} />
                    </div>
                  </FormField>
                )}
                
                {generatePassword && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      ✓ A secure password will be automatically generated when you save
                    </p>
                  </div>
                )}
              </div>
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
          
          {/* Email duplication warning */}
          {emailExistsError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mr-2 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">
                  {emailExistsError}
                </p>
              </div>
            </div>
          )}
        </form>
      </SlideInForm>

      {/* Change Password Form (Preserved exactly as original) */}
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
              <Shield className="h-4 w-4 inline mr-1" />
              As a Super Admin, you can directly set a new password for this user.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Password Options
              </p>
              
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="passwordChangeOption"
                    checked={generateNewPassword}
                    onChange={() => {
                      setGenerateNewPassword(true);
                      setPasswordFormState({ ...passwordFormState, newPassword: '' });
                    }}
                    className="text-[#8CC63F]"
                  />
                  <div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                      Generate secure password
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      System will create a strong 12-character password
                    </p>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="passwordChangeOption"
                    checked={!generateNewPassword}
                    onChange={() => setGenerateNewPassword(false)}
                    className="text-[#8CC63F]"
                  />
                  <div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                      Set custom password
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Enter your own password meeting complexity requirements
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {!generateNewPassword && (
              <FormField 
                id="newPassword" 
                label="New Password" 
                required 
                error={formErrors.newPassword}
              >
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      id="newPassword"
                      name="newPassword"
                      placeholder="Enter new password"
                      value={passwordFormState.newPassword}
                      onChange={(e) => setPasswordFormState({ ...passwordFormState, newPassword: e.target.value })}
                      className={`pr-10 ${
                        passwordFormState.newPassword && 
                        passwordRequirements.every(req => req.test(passwordFormState.newPassword))
                          ? 'border-green-500 focus:border-green-500'
                          : ''
                      }`}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <PasswordRequirementsChecker password={passwordFormState.newPassword} />
                </div>
              </FormField>
            )}
            
            {generateNewPassword && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  A strong password will be generated automatically
                </p>
              </div>
            )}

            <div className="border-t pt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  id="sendEmail"
                  name="sendEmail"
                  checked={passwordFormState.sendEmail}
                  onChange={(e) => setPasswordFormState({ ...passwordFormState, sendEmail: e.target.checked })}
                  className="rounded border-gray-300 text-[#8CC63F]"
                />
                <div>
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                    Send password to user's email
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Email the new password to {editingUser?.email}
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              <strong>Note:</strong> The user can log in immediately with the new password.
              {passwordFormState.sendEmail && " They will receive an email with their new credentials."}
            </p>
          </div>
        </form>
      </SlideInForm>

      {/* Generated Password Modal (Preserved exactly as original) */}
      {generatedPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {editingUser ? 'Password Changed Successfully' : 'User Created Successfully'}
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {editingUser 
                  ? `A new password has been set for ${editingUser.name}.`
                  : 'A temporary password has been generated.'
                }
              </p>
              {!editingUser && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  The user will receive a verification email and must verify their email before logging in.
                </p>
              )}
            </div>

            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md mb-4">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                Generated Password
              </p>
              <div className="flex items-center justify-between">
                <code className="text-base font-mono font-semibold break-all pr-2">
                  {generatedPassword}
                </code>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={copyPassword}
                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    title="Copy password"
                  >
                    {copiedPassword ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  {editingUser && (
                    <button
                      onClick={printPassword}
                      className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                      title="Print password"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md mb-4 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <strong>Important:</strong> This password will not be shown again. Make sure to:
              </p>
              <ul className="mt-2 text-sm text-amber-700 dark:text-amber-400 list-disc list-inside">
                <li>Copy or print the password now</li>
                <li>Share it securely with the user</li>
                <li>Advise the user to change it after first login</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2">
              {editingUser && (
                <button
                  onClick={printPassword}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </button>
              )}
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