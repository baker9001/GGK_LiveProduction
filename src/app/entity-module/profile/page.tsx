/**
 * File: /src/app/entity-module/profile/page.tsx
 * User Profile Management Page
 * 
 * Features:
 * - Real user data from database (no mock data)
 * - Profile picture upload functionality
 * - Basic information editing
 * - Security settings
 * - Account activity tracking
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useUser } from '../../../contexts/UserContext';
import { toast } from '../../../components/shared/Toast';
import { ImageUpload } from '../../../components/shared/ImageUpload';
import { Button } from '../../../components/shared/Button';
import { FormField, Input, Textarea } from '../../../components/shared/FormField';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { getPublicUrl } from '../../../lib/storageHelpers';
import {
  User as UserIcon,
  Mail,
  Briefcase,
  Calendar,
  Clock,
  Edit,
  Lock,
  AlertCircle,
  Loader2,
  Shield,
  Phone,
  Info,
  Save,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url?: string | null;
  is_active: boolean;
  created_at: string;
  last_sign_in_at?: string;
  role?: string;
  phone?: string;
  bio?: string;
  admin_level?: string;
}

export default function ProfilePage() {
  const { user: currentUser } = useUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [isEditingBasicInfo, setIsEditingBasicInfo] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<UserProfile>>({});

  // Fetch user profile data from actual database
  const {
    data: userProfile,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<UserProfile>(
    ['userProfile', currentUser?.id],
    async () => {
      if (!currentUser?.id) {
        throw new Error('User not authenticated');
      }

      // Fetch from 'users' table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          is_active,
          created_at,
          last_sign_in_at,
          raw_user_meta_data
        `)
        .eq('id', currentUser.id)
        .single();

      if (userError) throw userError;

      // Fetch role/admin_level from entity_users
      let role: string | undefined;
      let phone: string | undefined;
      let bio: string | undefined;
      let admin_level: string | undefined;

      const { data: entityUserData, error: entityUserError } = await supabase
        .from('entity_users')
        .select('admin_level, phone, metadata')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (entityUserError) {
        console.warn('Could not fetch entity user data:', entityUserError.message);
      } else if (entityUserData) {
        admin_level = entityUserData.admin_level;
        role = entityUserData.admin_level || currentUser.userType;
        phone = entityUserData.phone || undefined;
        bio = entityUserData.metadata?.bio || undefined;
      } else {
        role = currentUser.userType;
      }

      const profile: UserProfile = {
        id: userData.id,
        email: userData.email,
        name: userData.raw_user_meta_data?.name || userData.email.split('@')[0],
        avatar_url: userData.raw_user_meta_data?.avatar_url || null,
        is_active: userData.is_active,
        created_at: userData.created_at,
        last_sign_in_at: userData.last_sign_in_at || undefined,
        role: role,
        phone: phone,
        bio: bio,
        admin_level: admin_level,
      };
      return profile;
    },
    {
      enabled: !!currentUser?.id,
      staleTime: 5 * 60 * 1000, // 5 minutes
      onError: (err) => {
        console.error('Error fetching user profile:', err);
        toast.error('Failed to load user profile data.');
      },
    }
  );

  // Mutation for updating user profile
  const updateProfileMutation = useMutation(
    async (updates: Partial<UserProfile>) => {
      if (!currentUser?.id) throw new Error('User not authenticated');

      // Fetch current raw_user_meta_data
      const { data: currentData, error: metaError } = await supabase
        .from('users')
        .select('raw_user_meta_data')
        .eq('id', currentUser.id)
        .single();

      if (metaError) throw metaError;

      const newMetaData = { ...currentData.raw_user_meta_data };
      const updatePayload: any = {};

      // Update name in raw_user_meta_data
      if (updates.name !== undefined) {
        newMetaData.name = updates.name;
      }
      // Update avatar_url in raw_user_meta_data
      if (updates.avatar_url !== undefined) {
        newMetaData.avatar_url = updates.avatar_url;
      }
      updatePayload.raw_user_meta_data = newMetaData;
      updatePayload.updated_at = new Date().toISOString();

      // Update email if changed
      if (updates.email !== undefined && updates.email !== userProfile?.email) {
        updatePayload.email = updates.email;
      }

      // Update users table
      const { error: userUpdateError } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', currentUser.id);

      if (userUpdateError) throw userUpdateError;

      // Update phone and bio in entity_users table if they exist
      const entityUserUpdates: any = {};
      if (updates.phone !== undefined) entityUserUpdates.phone = updates.phone;
      if (updates.bio !== undefined) {
        // Store bio in metadata
        const { data: currentEntityData } = await supabase
          .from('entity_users')
          .select('metadata')
          .eq('user_id', currentUser.id)
          .maybeSingle();
        
        const currentMetadata = currentEntityData?.metadata || {};
        entityUserUpdates.metadata = { ...currentMetadata, bio: updates.bio };
      }

      if (Object.keys(entityUserUpdates).length > 0) {
        entityUserUpdates.updated_at = new Date().toISOString();
        
        const { error: entityUpdateError } = await supabase
          .from('entity_users')
          .update(entityUserUpdates)
          .eq('user_id', currentUser.id);
        
        if (entityUpdateError) {
          console.warn('Failed to update entity_users data:', entityUpdateError.message);
          toast.warning('Profile updated, but some details could not be saved.');
        }
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['userProfile', currentUser?.id]);
        toast.success('Profile updated successfully!');
        setIsEditingBasicInfo(false);
      },
      onError: (err: any) => {
        console.error('Error updating profile:', err);
        toast.error(err.message || 'Failed to update profile.');
      },
    }
  );

  // Handle avatar upload/delete
  const handleAvatarChange = async (newPath: string | null) => {
    await updateProfileMutation.mutateAsync({ avatar_url: newPath });
  };

  // Handle basic info edit
  const handleEditBasicInfo = () => {
    setIsEditingBasicInfo(true);
    setEditFormData({
      name: userProfile?.name,
      email: userProfile?.email,
      phone: userProfile?.phone,
      bio: userProfile?.bio,
    });
  };

  const handleSaveBasicInfo = async () => {
    if (!editFormData.name?.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!editFormData.email?.trim()) {
      toast.error('Email is required');
      return;
    }
    
    await updateProfileMutation.mutateAsync(editFormData);
  };

  const handleCancelEditBasicInfo = () => {
    setIsEditingBasicInfo(false);
    setEditFormData({});
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#8CC63F] mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (isError || !userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Error Loading Profile
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error?.message || 'Could not load user profile data. Please try again.'}
          </p>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  const memberSinceYear = new Date(userProfile.created_at).getFullYear();
  const accountCreatedDate = new Date(userProfile.created_at).toLocaleDateString();
  const lastLoginTime = userProfile.last_sign_in_at
    ? new Date(userProfile.last_sign_in_at).toLocaleString()
    : 'Never';

  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your account information and security settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile Summary & Avatar */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center space-y-4">
          {/* Profile Picture */}
          <div className="relative w-32 h-32 mx-auto">
            {userProfile.avatar_url ? (
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#8CC63F] shadow-lg">
                <img
                  src={getPublicUrl('user-avatars', userProfile.avatar_url)}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to initials if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div class="w-full h-full bg-[#8CC63F] text-white flex items-center justify-center text-4xl font-bold">
                          ${userProfile.name.charAt(0).toUpperCase()}
                        </div>
                      `;
                    }
                  }}
                />
              </div>
            ) : (
              <div className="w-32 h-32 rounded-full bg-[#8CC63F] text-white flex items-center justify-center text-4xl font-bold border-4 border-[#8CC63F] shadow-lg">
                {userProfile.name.charAt(0).toUpperCase()}
              </div>
            )}
            
            {/* Upload overlay */}
            <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center group cursor-pointer">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <ImageUpload
                  id="profile-picture"
                  bucket="user-avatars"
                  value={userProfile.avatar_url}
                  publicUrl={userProfile.avatar_url ? getPublicUrl('user-avatars', userProfile.avatar_url) : null}
                  onChange={handleAvatarChange}
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {userProfile.name}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {userProfile.email}
            </p>
          </div>

          <StatusBadge status={userProfile.is_active ? 'active' : 'inactive'} size="md" />

          <div className="flex items-center justify-center gap-4 text-gray-600 dark:text-gray-400 text-sm">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Member since {memberSinceYear}</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              <span>Security: Active</span>
            </div>
          </div>
        </div>

        {/* Right Column: Basic Info, Security, Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-[#8CC63F]" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Basic Information
                </h3>
              </div>
              {!isEditingBasicInfo ? (
                <Button variant="outline" size="sm" onClick={handleEditBasicInfo}>
                  <Edit className="h-4 w-4 mr-2" /> Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCancelEditBasicInfo}>
                    <X className="h-4 w-4 mr-2" /> Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSaveBasicInfo} 
                    loading={updateProfileMutation.isPending}
                    loadingText="Saving..."
                  >
                    <Save className="h-4 w-4 mr-2" /> Save
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <FormField label="Full Name" id="full-name">
                {isEditingBasicInfo ? (
                  <Input
                    id="full-name"
                    value={editFormData.name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    placeholder="Enter your full name"
                    leftIcon={<UserIcon className="h-4 w-4 text-gray-400" />}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900 dark:text-white">{userProfile.name}</span>
                  </div>
                )}
              </FormField>

              <FormField label="Email Address" id="email-address">
                {isEditingBasicInfo ? (
                  <Input
                    id="email-address"
                    type="email"
                    value={editFormData.email || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    placeholder="Enter your email"
                    leftIcon={<Mail className="h-4 w-4 text-gray-400" />}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900 dark:text-white">{userProfile.email}</span>
                  </div>
                )}
              </FormField>

              <FormField label="Role" id="role">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900 dark:text-white capitalize">
                    {userProfile.admin_level?.replace(/_/g, ' ') || userProfile.role?.replace(/_/g, ' ') || 'User'}
                  </span>
                </div>
              </FormField>

              <FormField label="Phone Number" id="phone-number">
                {isEditingBasicInfo ? (
                  <Input
                    id="phone-number"
                    type="tel"
                    value={editFormData.phone || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    placeholder="Enter your phone number"
                    leftIcon={<Phone className="h-4 w-4 text-gray-400" />}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900 dark:text-white">
                      {userProfile.phone || <span className="italic text-gray-500">Not provided</span>}
                    </span>
                  </div>
                )}
              </FormField>

              <div className="md:col-span-2">
                <FormField label="Bio" id="bio">
                  {isEditingBasicInfo ? (
                    <Textarea
                      id="bio"
                      value={editFormData.bio || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                      placeholder="Tell us about yourself..."
                      rows={3}
                    />
                  ) : (
                    <div className="text-gray-900 dark:text-white">
                      {userProfile.bio || <span className="italic text-gray-500">No bio provided</span>}
                    </div>
                  )}
                </FormField>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-[#8CC63F]" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Security Settings
                </h3>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/app/settings/change-password')}>
                <Lock className="h-4 w-4 mr-2" /> Change Password
              </Button>
            </div>

            <div className="mt-6">
              <FormField label="Password" id="password-display">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">••••••••••</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Last updated: Never</p>
              </FormField>

              <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                    Security Recommendations
                  </h4>
                </div>
                <ul className="list-disc list-inside text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>Use a strong password with at least 8 characters</li>
                  <li>Include uppercase, lowercase, numbers, and symbols</li>
                  <li>Change your password regularly</li>
                  <li>Don't reuse passwords from other accounts</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Account Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 pb-4 border-b border-gray-200 dark:border-gray-700">
              <Clock className="h-5 w-5 text-[#8CC63F]" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Account Activity
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <FormField label="Last Login" id="last-login">
                <div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900 dark:text-white">{lastLoginTime}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Location: Unknown</p>
                </div>
              </FormField>

              <FormField label="Account Created" id="account-created">
                <div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900 dark:text-white">{accountCreatedDate}</span>
                  </div>
                  <div className="mt-2">
                    <StatusBadge status={userProfile.is_active ? 'active' : 'inactive'} size="sm" />
                  </div>
                </div>
              </FormField>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}