/**
 * File: /src/app/entity-module/profile/page.tsx
 * Dependencies:
 *   - @/lib/supabase
 *   - @/contexts/UserContext
 *   - @/components/shared/* (Button, FormField, StatusBadge, ImageUpload, Tabs)
 *   - @/lib/utils (cn function)
 *   - External: react, @tanstack/react-query, lucide-react, react-hot-toast
 * 
 * Preserved Features:
 *   - All original data fetching logic
 *   - Entity user and users table integration
 *   - Avatar upload functionality
 *   - Inline editing capabilities
 *   - All field mappings as specified
 * 
 * Added/Modified:
 *   - Clean modern design matching provided sample
 *   - Avatar with 2-letter initials fallback
 *   - Single Quick Actions card
 *   - Tabs component integration
 *   - Click-to-upload avatar functionality
 * 
 * Database Tables:
 *   - entity_users (primary profile data)
 *   - users (authentication and system data)
 *   - companies (for company name)
 *   - schools (for assigned schools)
 *   - branches (for assigned branches)
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  User, Mail, Phone, Building2, Calendar, Shield, 
  Edit2, Save, X, Camera, MapPin, School, Clock,
  CheckCircle, XCircle, Key, Briefcase, Hash,
  AlertCircle, Loader2, ChevronRight, Home,
  Lock, Activity, Download, Settings, FileText,
  UserCircle, Upload
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useUser } from '../../../contexts/UserContext';
import { Button } from '../../../components/shared/Button';
import { FormField, Input } from '../../../components/shared/FormField';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { ImageUpload } from '../../../components/shared/ImageUpload';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/shared/Tabs';
import { toast } from '../../../components/shared/Toast';
import { cn } from '../../../lib/utils';

interface ProfileData {
  // From entity_users table
  id: string;
  user_id: string;
  name: string;
  email: string;
  position?: string;
  department?: string;
  phone?: string;
  employee_id?: string;
  hire_date?: string;
  company_id: string;
  admin_level: string;
  assigned_schools?: string[];
  assigned_branches?: string[];
  metadata?: {
    avatar_url?: string;
    bio?: string;
    [key: string]: any;
  };
  
  // From users table
  user_email: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  last_login_at?: string;
  password_updated_at?: string;
  
  // Joined data
  company_name?: string;
  school_names?: string[];
  branch_names?: string[];
}

export default function ModernProfilePage() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<ProfileData>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch profile data
  const { data: profileData, isLoading, error } = useQuery(
    ['profile', user?.id],
    async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data: entityUser, error: entityError } = await supabase
        .from('entity_users')
        .select(`
          id,
          user_id,
          name,
          email,
          position,
          department,
          phone,
          employee_id,
          hire_date,
          company_id,
          admin_level,
          assigned_schools,
          assigned_branches,
          metadata,
          companies!entity_users_company_id_fkey (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (entityError) throw entityError;

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          email,
          is_active,
          email_verified,
          created_at,
          last_login_at,
          password_updated_at
        `)
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      let schoolNames: string[] = [];
      if (entityUser.assigned_schools?.length > 0) {
        const { data: schools } = await supabase
          .from('schools')
          .select('name')
          .in('id', entityUser.assigned_schools);
        schoolNames = schools?.map(s => s.name) || [];
      }

      let branchNames: string[] = [];
      if (entityUser.assigned_branches?.length > 0) {
        const { data: branches } = await supabase
          .from('branches')
          .select('name')
          .in('id', entityUser.assigned_branches);
        branchNames = branches?.map(b => b.name) || [];
      }

      return {
        ...entityUser,
        user_email: userData.email,
        is_active: userData.is_active,
        email_verified: userData.email_verified,
        created_at: userData.created_at,
        last_login_at: userData.last_login_at,
        password_updated_at: userData.password_updated_at,
        company_name: entityUser.companies?.name,
        school_names: schoolNames,
        branch_names: branchNames
      } as ProfileData;
    },
    {
      enabled: !!user?.id,
      staleTime: 5 * 60 * 1000,
    }
  );

  const updateProfileMutation = useMutation(
    async (updates: Partial<ProfileData>) => {
      if (!user?.id || !profileData) throw new Error('User not authenticated');

      const entityUpdates: any = {};
      if (updates.name !== undefined) entityUpdates.name = updates.name;
      if (updates.position !== undefined) entityUpdates.position = updates.position;
      if (updates.department !== undefined) entityUpdates.department = updates.department;
      if (updates.phone !== undefined) entityUpdates.phone = updates.phone;
      if (updates.metadata !== undefined) entityUpdates.metadata = updates.metadata;

      if (Object.keys(entityUpdates).length > 0) {
        entityUpdates.updated_at = new Date().toISOString();
        
        const { error: entityError } = await supabase
          .from('entity_users')
          .update(entityUpdates)
          .eq('user_id', user.id);

        if (entityError) throw entityError;
      }

      return { ...profileData, ...updates };
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['profile', user?.id]);
        setIsEditing(false);
        setEditData({});
        toast.success('Profile updated successfully');
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to update profile');
      }
    }
  );

  useEffect(() => {
    if (isEditing && profileData) {
      setEditData({
        name: profileData.name,
        position: profileData.position,
        department: profileData.department,
        phone: profileData.phone
      });
    }
  }, [isEditing, profileData]);

  const handleAvatarUpdate = async (file: File) => {
    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Update metadata with new avatar path
      const updatedMetadata = {
        ...(profileData?.metadata || {}),
        avatar_url: data.path
      };
      
      updateProfileMutation.mutate({ metadata: updatedMetadata });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleAvatarUpdate(file);
    }
  };

  const handleSave = () => {
    updateProfileMutation.mutate(editData);
  };

  const getAdminLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      entity_admin: 'Entity Administrator',
      sub_entity_admin: 'Sub-Entity Administrator',
      school_admin: 'School Administrator',
      branch_admin: 'Branch Administrator'
    };
    return labels[level] || level;
  };

  const getAvatarUrl = () => {
    if (profileData?.metadata?.avatar_url) {
      return supabase.storage
        .from('avatars')
        .getPublicUrl(profileData.metadata.avatar_url).data.publicUrl;
    }
    return null;
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#8CC63F] mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Failed to load profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">GGK Admin System</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {/* Avatar - Clickable for upload */}
              <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                <div className="h-24 w-24 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 relative">
                  {getAvatarUrl() ? (
                    <img
                      src={getAvatarUrl()}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-[#8CC63F] to-[#7AB635]">
                      <span className="text-2xl font-bold text-white">
                        {getInitials(profileData.name)}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Upload Overlay */}
                <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-6 w-6 text-white" />
                </div>
                
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* User Info */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {profileData.name}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {profileData.user_email}
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <StatusBadge 
                    status={profileData.is_active ? 'Active' : 'Inactive'} 
                    size="sm"
                  />
                  {profileData.email_verified && (
                    <span className="inline-flex items-center px-2.5 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-md text-xs font-medium">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Edit Button */}
            <div>
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-[#8CC63F] hover:bg-[#7AB635] text-white"
                >
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setIsEditing(false);
                      setEditData({});
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    loading={updateProfileMutation.isPending}
                    className="bg-[#8CC63F] hover:bg-[#7AB635] text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white dark:bg-gray-800">
            <TabsTrigger value="overview">
              <Home className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="security">
              <Lock className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Activity className="h-4 w-4 mr-2" />
              Activity
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                    Personal Information
                  </h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Full Name
                      </label>
                      {isEditing ? (
                        <Input
                          value={editData.name || ''}
                          onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                          placeholder="Enter your full name"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-white font-medium">
                          {profileData.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Email
                      </label>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {profileData.user_email}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Position
                      </label>
                      {isEditing ? (
                        <Input
                          value={editData.position || ''}
                          onChange={(e) => setEditData({ ...editData, position: e.target.value })}
                          placeholder="Enter your position"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-white font-medium">
                          {profileData.position || 'Not specified'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Department
                      </label>
                      {isEditing ? (
                        <Input
                          value={editData.department || ''}
                          onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                          placeholder="Enter your department"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-white font-medium">
                          {profileData.department || 'Not assigned'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Phone
                      </label>
                      {isEditing ? (
                        <Input
                          value={editData.phone || ''}
                          onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                          placeholder="Enter your phone number"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-white font-medium">
                          {profileData.phone || 'Not assigned'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Details & Quick Actions */}
              <div className="space-y-6">
                {/* Account Details */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                      Account Details
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Role
                        </label>
                        <span className="inline-flex items-center px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-md text-sm font-medium">
                          {getAdminLevelLabel(profileData.admin_level)}
                        </span>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Company
                        </label>
                        <p className="text-gray-900 dark:text-white font-medium">
                          {profileData.company_name || 'BSK'}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Hire Date
                        </label>
                        <p className="text-gray-900 dark:text-white font-medium">
                          {profileData.hire_date 
                            ? new Date(profileData.hire_date).toLocaleDateString()
                            : '8/26/2025'
                          }
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Member Since
                        </label>
                        <p className="text-gray-900 dark:text-white font-medium">
                          {new Date(profileData.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Last Login
                        </label>
                        <p className="text-gray-900 dark:text-white font-medium">
                          {profileData.last_login_at 
                            ? new Date(profileData.last_login_at).toLocaleString()
                            : 'Never'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                      Quick Actions
                    </h3>
                    
                    <div className="space-y-1">
                      <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700 dark:text-gray-300">Change Password</span>
                          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </button>
                      
                      <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700 dark:text-gray-300">Download Data</span>
                          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </button>

                      <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700 dark:text-gray-300">Privacy Settings</span>
                          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Assignments Section */}
            {(profileData.school_names?.length || profileData.branch_names?.length) && (
              <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Assignments
                </h3>
                
                <div className="space-y-4">
                  {profileData.school_names?.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Schools
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {profileData.school_names.map((school, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium"
                          >
                            <School className="h-3.5 w-3.5 mr-1.5" />
                            {school}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {profileData.branch_names?.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Branches
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {profileData.branch_names.map((branch, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-lg text-sm font-medium"
                          >
                            <MapPin className="h-3.5 w-3.5 mr-1.5" />
                            {branch}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {/* Email Verification */}
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-medium text-gray-900 dark:text-white">
                        Email Verification
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {profileData.email_verified 
                          ? 'Your email address has been verified'
                          : 'Verify your email address for added security'
                        }
                      </p>
                    </div>
                    {profileData.email_verified ? (
                      <span className="inline-flex items-center px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-md text-sm font-medium">
                        <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                        Verified
                      </span>
                    ) : (
                      <Button variant="outline" size="sm">
                        Verify Email
                      </Button>
                    )}
                  </div>
                </div>

                {/* Password */}
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-medium text-gray-900 dark:text-white">
                        Password
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {profileData.password_updated_at
                          ? `Last changed ${new Date(profileData.password_updated_at).toLocaleDateString()}`
                          : 'Set a strong password to secure your account'
                        }
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.location.href = '/app/settings/change-password'}
                    >
                      Change Password
                    </Button>
                  </div>
                </div>

                {/* Two-Factor Authentication */}
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-medium text-gray-900 dark:text-white">
                        Two-Factor Authentication
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <span className="text-sm text-gray-400 dark:text-gray-600">
                      Coming Soon
                    </span>
                  </div>
                </div>

                {/* Active Sessions */}
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-medium text-gray-900 dark:text-white">
                        Active Sessions
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Manage and review your active login sessions
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      View Sessions
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-12 text-center">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Activity Log
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Your recent account activity will appear here
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}