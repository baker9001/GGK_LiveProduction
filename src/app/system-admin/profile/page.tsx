import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { User, Mail, Shield, Calendar, Edit2, Save, X, Eye, EyeOff, Key, Clock, MapPin } from 'lucide-react';
import { useUser } from '../../../contexts/UserContext';
import { supabase } from '../../../lib/supabase';
import { setAuthenticatedUser } from '../../../lib/auth';
import { Button } from '../../../components/shared/Button';
import { FormField, Input } from '../../../components/shared/FormField';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { ImageUpload } from '../../../components/shared/ImageUpload';
import { toast } from '../../../components/shared/Toast';
import bcrypt from 'bcryptjs';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  avatar_url: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export default function ProfilePage() {
  const { user, refreshUser } = useUser();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    avatar_url: user?.avatar_url || ''
  });

  // Profile update mutation
  const profileMutation = useMutation(
    async (formData: typeof profileData) => {
      const validatedData = profileSchema.parse(formData);

      // Check if email is being changed and if it already exists
      if (validatedData.email !== user?.email) {
        const { data: existingUser, error: queryError } = await supabase
          .from('admin_users')
          .select('id')
          .eq('email', validatedData.email)
          .neq('id', user?.id)
          .maybeSingle();

        if (queryError) {
          throw new Error('Failed to check email availability');
        }

        if (existingUser) {
          throw new Error('This email is already in use');
        }
      }
      // Update password in users table (where password_hash column exists)
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          name: validatedData.name,
          email: validatedData.email,
          password_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          requires_password_change: false
        })
        .eq('id', user?.id);

      if (error) throw error;

      // Return the updated user data
      return validatedData;
    },
    {
      onSuccess: (data) => {
        // Update local user context with new data
        if (user) {
          const updatedUser = {
            ...user,
            name: data.name,
            email: data.email,
            avatar_url: data.avatar_url
          };
          setAuthenticatedUser(updatedUser);
          refreshUser();
        }
        
        setIsEditing(false);
        toast.success('Profile updated successfully');
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
        } else if (error instanceof Error) {
          if (error.message.includes('email')) {
            setFormErrors({ email: error.message });
          } else {
            setFormErrors({ form: error.message });
          }
        } else {
          console.error('Error updating profile:', error);
          setFormErrors({ form: 'Failed to update profile. Please try again.' });
          toast.error('Failed to update profile');
        }
      }
    }
  );

  // Password change mutation
  const passwordMutation = useMutation(
    async (formData: FormData) => {
      const data = {
        currentPassword: formData.get('currentPassword') as string,
        newPassword: formData.get('newPassword') as string,
        confirmPassword: formData.get('confirmPassword') as string,
      };

      const validatedData = passwordSchema.parse(data);

      // Get current user data to verify current password
      const { data: userData, error: fetchError } = await supabase
        .from('admin_users')
        .select('password_hash')
        .eq('id', user?.id)
        .single();

      if (fetchError) throw fetchError;

      // Verify current password
      const isValidPassword = await bcrypt.compare(validatedData.currentPassword, userData.password_hash);
      if (userUpdateError) {
        throw new Error(`Failed to update password: ${userUpdateError.message}`);
      }

      // Update admin_users table with timestamp only (no password_hash)
      const { error: adminUpdateError } = await supabase
        .from('admin_users')
        .update({
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (adminUpdateError) {
        console.warn('Failed to update admin_users timestamp:', adminUpdateError);
        // Don't throw - password update succeeded
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(validatedData.newPassword, salt);

      const { error } = await supabase
        .from('admin_users')
        .update({ password_hash: hashedPassword })
        .eq('id', user?.id);

      if (error) throw error;

      return true;
    },
    {
      onSuccess: () => {
        setIsChangingPassword(false);
        setFormErrors({});
        toast.success('Password updated successfully');
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
        } else if (error instanceof Error) {
          if (error.message.includes('password')) {
            setFormErrors({ currentPassword: error.message });
          } else {
            setFormErrors({ form: error.message });
          }
        } else {
          console.error('Error updating password:', error);
          setFormErrors({ form: 'Failed to update password. Please try again.' });
          toast.error('Failed to update password');
        }
      }
    }
  );

  if (!user) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">User not found</p>
        </div>
      </div>
    );
  }

  const getAvatarUrl = (path: string | null) => {
    if (!path) return null;
    return supabase.storage
      .from('avatars')
      .getPublicUrl(path).data.publicUrl;
  };

  const handleProfileUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    profileMutation.mutate(profileData);
  };

  const handlePasswordChange = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    passwordMutation.mutate(new FormData(e.currentTarget));
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'SSA': return 'Super System Administrator';
      case 'SUPPORT': return 'Support Administrator';
      case 'VIEWER': return 'Viewer';
      default: return role;
    }
  };

  const getRoleBadgeStatus = (role: string) => {
    switch (role) {
      case 'SSA': return 'active';
      case 'SUPPORT': return 'active';
      case 'VIEWER': return 'inactive';
      default: return 'inactive';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">Manage your account information and security settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Overview Card */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/20 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="p-6">
              <div className="text-center">
                {/* Avatar */}
                <div className="mx-auto w-24 h-24 mb-4 flex items-center justify-center">
                  {profileData.avatar_url ? (
                    <img
                      src={getAvatarUrl(profileData.avatar_url)}
                      alt="Profile Avatar"
                      className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-700 shadow-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">
                        {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Avatar Upload */}
                {isEditing && (
                  <div className="mb-4 flex justify-center">
                    <ImageUpload
                      id="avatar"
                      bucket="avatars"
                      value={profileData.avatar_url}
                      publicUrl={profileData.avatar_url ? getAvatarUrl(profileData.avatar_url) : null}
                      onChange={(path) => {
                        setProfileData(prev => ({ ...prev, avatar_url: path || '' }));
                      }}
                      className="w-24 h-24"
                    />
                  </div>
                )}
                
                {/* User Info */}
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                  {user.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-3">{user.email}</p>
                
                {/* Role Badge */}
                <div className="flex justify-center mb-4">
                  <StatusBadge 
                    status={getRoleBadgeStatus(user.role)} 
                    className="px-3 py-1"
                  >
                    {getRoleDisplayName(user.role)}
                  </StatusBadge>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-1" />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Member since</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {new Date().getFullYear()}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Shield className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-1" />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Security</p>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      Active
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/20 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center">
                <User className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Basic Information</h2>
              </div>
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  leftIcon={<Edit2 className="h-4 w-4" />}
                >
                  Edit
                </Button>
              )}
            </div>

            <div className="p-6">
              {isEditing ? (
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  {formErrors.form && (
                    <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
                      {formErrors.form}
                    </div>
                  )}

                  <FormField
                    id="name"
                    label="Full Name"
                    required
                    error={formErrors.name}
                  >
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter your full name"
                    />
                  </FormField>

                  <FormField
                    id="email"
                    label="Email Address"
                    required
                    error={formErrors.email}
                  >
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter your email address"
                    />
                  </FormField>

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setProfileData({
                          name: user.name,
                          email: user.email,
                          avatar_url: user.avatar_url || ''
                        });
                        setFormErrors({});
                      }}
                      disabled={profileMutation.isLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={profileMutation.isLoading}
                      leftIcon={<Save className="h-4 w-4" />}
                    >
                      {profileMutation.isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name
                    </label>
                    <p className="text-gray-900 dark:text-white">{user.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email Address
                    </label>
                    <p className="text-gray-900 dark:text-white">{user.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Role
                    </label>
                    <p className="text-gray-900 dark:text-white">{getRoleDisplayName(user.role)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Security Settings Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/20 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center">
                <Shield className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Security Settings</h2>
              </div>
              {!isChangingPassword && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsChangingPassword(true)}
                  leftIcon={<Key className="h-4 w-4" />}
                >
                  Change Password
                </Button>
              )}
            </div>

            <div className="p-6">
              {isChangingPassword ? (
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  {formErrors.form && (
                    <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
                      {formErrors.form}
                    </div>
                  )}

                  <FormField
                    id="currentPassword"
                    label="Current Password"
                    required
                    error={formErrors.currentPassword}
                  >
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        name="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        placeholder="Enter your current password"
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormField>

                  <FormField
                    id="newPassword"
                    label="New Password"
                    required
                    error={formErrors.newPassword}
                  >
                    <div className="relative">
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Enter your new password"
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

                  <FormField
                    id="confirmPassword"
                    label="Confirm New Password"
                    required
                    error={formErrors.confirmPassword}
                  >
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your new password"
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

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsChangingPassword(false);
                        setFormErrors({});
                        setShowCurrentPassword(false);
                        setShowNewPassword(false);
                        setShowConfirmPassword(false);
                      }}
                      disabled={passwordMutation.isLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={passwordMutation.isLoading}
                      leftIcon={<Save className="h-4 w-4" />}
                    >
                      {passwordMutation.isLoading ? 'Updating...' : 'Update Password'}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Password
                    </label>
                    <p className="text-gray-900 dark:text-white">••••••••••••</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Last updated: Never
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start">
                      <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                          Security Recommendations
                        </h4>
                        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                          <li>• Use a strong password with at least 8 characters</li>
                          <li>• Include uppercase, lowercase, numbers, and symbols</li>
                          <li>• Change your password regularly</li>
                          <li>• Don't reuse passwords from other accounts</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Account Activity Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/20 border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-500 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Account Activity</h2>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Last Login</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Today at 2:30 PM</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Unknown</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Account Created</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">January 1, 2025</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                    <StatusBadge status="active" className="text-xs">
                      Active
                    </StatusBadge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Total Sessions</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">This month</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">24</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}