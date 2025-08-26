/**
 * File: /src/app/entity-module/profile/page.tsx
 * 
 * Entity Module Profile Page
 * Allows users to view and edit their profile information
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Calendar, 
  Shield, 
  Edit2, 
  Save, 
  X,
  Camera,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useUser } from '../../../contexts/UserContext';
import { Button } from '../../../components/shared/Button';
import { FormField, Input, Textarea } from '../../../components/shared/FormField';
import { ImageUpload } from '../../../components/shared/ImageUpload';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { toast } from '../../../components/shared/Toast';
import { getAuthenticatedUser } from '../../../lib/auth';

interface ProfileData {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  position?: string;
  department?: string;
  employee_id?: string;
  admin_level?: string;
  company_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  avatar_url?: string;
  company_name?: string;
  last_login_at?: string;
}

export default function ProfilePage() {
  const { user, refreshUser } = useUser();
  const queryClient = useQueryClient();
  const authenticatedUser = getAuthenticatedUser();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<ProfileData>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch user profile data
  const { 
    data: profileData, 
    isLoading, 
    error: fetchError 
  } = useQuery(
    ['user-profile', user?.id],
    async () => {
      if (!user?.id) throw new Error('User not authenticated');

      // Fetch entity user data
      const { data: entityUser, error: entityError } = await supabase
        .from('entity_users')
        .select(`
          *,
          companies (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (entityError) throw entityError;

      // Fetch user data from users table for email and other auth info
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email, last_login_at, raw_user_meta_data')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      return {
        ...entityUser,
        email: userData.email,
        last_login_at: userData.last_login_at,
        avatar_url: userData.raw_user_meta_data?.avatar_url,
        company_name: entityUser.companies?.name || 'Unknown Company'
      } as ProfileData;
    },
    {
      enabled: !!user?.id,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Initialize form data when profile data loads
  useEffect(() => {
    if (profileData && !isEditing) {
      setFormData({
        name: profileData.name || '',
        phone: profileData.phone || '',
        position: profileData.position || '',
        department: profileData.department || '',
        avatar_url: profileData.avatar_url || ''
      });
    }
  }, [profileData, isEditing]);

  // Update profile mutation
  const updateProfileMutation = useMutation(
    async (updatedData: Partial<ProfileData>) => {
      if (!user?.id || !profileData) throw new Error('User not authenticated');

      // Update entity_users table
      const { error: entityError } = await supabase
        .from('entity_users')
        .update({
          name: updatedData.name,
          phone: updatedData.phone,
          position: updatedData.position,
          department: updatedData.department,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (entityError) throw entityError;

      // Update users table metadata if avatar changed
      if (updatedData.avatar_url !== profileData.avatar_url) {
        const { error: userError } = await supabase
          .from('users')
          .update({
            raw_user_meta_data: {
              ...profileData,
              avatar_url: updatedData.avatar_url,
              name: updatedData.name
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (userError) throw userError;
      }

      return { ...profileData, ...updatedData };
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['user-profile']);
        refreshUser();
        setIsEditing(false);
        setFormErrors({});
        toast.success('Profile updated successfully');
      },
      onError: (error: any) => {
        console.error('Error updating profile:', error);
        toast.error(error.message || 'Failed to update profile');
      }
    }
  );

  const handleSave = () => {
    // Basic validation
    const errors: Record<string, string> = {};
    
    if (!formData.name?.trim()) {
      errors.name = 'Name is required';
    }
    
    if (formData.phone && !/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    updateProfileMutation.mutate(formData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormErrors({});
    // Reset form data to original values
    if (profileData) {
      setFormData({
        name: profileData.name || '',
        phone: profileData.phone || '',
        position: profileData.position || '',
        department: profileData.department || '',
        avatar_url: profileData.avatar_url || ''
      });
    }
  };

  const handleAvatarChange = (path: string | null) => {
    setFormData(prev => ({ ...prev, avatar_url: path || '' }));
  };

  // Get avatar URL for display
  const getAvatarUrl = (path: string | null) => {
    if (!path) return null;
    
    if (path.startsWith('http')) {
      return path;
    }
    
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(path);
    
    return data?.publicUrl || null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">Failed to load profile</p>
          <p className="text-sm text-gray-500 mt-1">
            {fetchError instanceof Error ? fetchError.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">Profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              {/* Avatar Display */}
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                {formData.avatar_url ? (
                  <img
                    src={getAvatarUrl(formData.avatar_url)}
                    alt="Profile avatar"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Hide broken image and show fallback
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <User className="w-10 h-10 text-gray-400" />
                )}
              </div>
              
              {/* Edit Avatar Button */}
              {isEditing && (
                <div className="absolute -bottom-2 -right-2">
                  <div className="bg-white dark:bg-gray-800 rounded-full p-1 shadow-md border border-gray-200 dark:border-gray-600">
                    <Camera className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {profileData.name || 'User Profile'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {profileData.email}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge 
                  status={profileData.is_active ? 'active' : 'inactive'} 
                  size="sm" 
                />
                {profileData.admin_level && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                    {profileData.admin_level.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={updateProfileMutation.isPending}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  loading={updateProfileMutation.isPending}
                  loadingText="Saving..."
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <User className="w-5 h-5 mr-2 text-blue-500" />
            Personal Information
          </h2>
          
          <div className="space-y-4">
            {isEditing ? (
              <>
                <FormField
                  id="avatar"
                  label="Profile Picture"
                >
                  <ImageUpload
                    id="avatar"
                    bucket="avatars"
                    value={formData.avatar_url}
                    publicUrl={formData.avatar_url ? getAvatarUrl(formData.avatar_url) : null}
                    onChange={handleAvatarChange}
                  />
                </FormField>

                <FormField
                  id="name"
                  label="Full Name"
                  required
                  error={formErrors.name}
                >
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your full name"
                    leftIcon={<User className="h-4 w-4 text-gray-400" />}
                  />
                </FormField>

                <FormField
                  id="phone"
                  label="Phone Number"
                  error={formErrors.phone}
                >
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter your phone number"
                    leftIcon={<Phone className="h-4 w-4 text-gray-400" />}
                  />
                </FormField>

                <FormField
                  id="position"
                  label="Position"
                >
                  <Input
                    id="position"
                    value={formData.position || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                    placeholder="Enter your position"
                    leftIcon={<Shield className="h-4 w-4 text-gray-400" />}
                  />
                </FormField>

                <FormField
                  id="department"
                  label="Department"
                >
                  <Input
                    id="department"
                    value={formData.department || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="Enter your department"
                    leftIcon={<Building2 className="h-4 w-4 text-gray-400" />}
                  />
                </FormField>
              </>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Full Name</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {profileData.name || 'Not provided'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {profileData.email}
                      </p>
                    </div>
                  </div>

                  {profileData.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {profileData.phone}
                        </p>
                      </div>
                    </div>
                  )}

                  {profileData.position && (
                    <div className="flex items-center gap-3">
                      <Shield className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Position</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {profileData.position}
                        </p>
                      </div>
                    </div>
                  )}

                  {profileData.department && (
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Department</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {profileData.department}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Account Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Shield className="w-5 h-5 mr-2 text-green-500" />
            Account Information
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Company</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {profileData.company_name}
                </p>
              </div>
            </div>

            {profileData.employee_id && (
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Employee ID</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {profileData.employee_id}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Member Since</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(profileData.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {profileData.last_login_at && (
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Last Login</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {new Date(profileData.last_login_at).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2 text-red-500" />
          Security Settings
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Password</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Change your account password
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                // Navigate to password change page
                window.location.href = '/app/settings/change-password';
              }}
            >
              Change Password
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}