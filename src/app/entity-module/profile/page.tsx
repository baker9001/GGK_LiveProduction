/**
 * File: /src/app/entity-module/profile/page.tsx
 * Dependencies:
 *   - @/lib/supabase
 *   - @/contexts/UserContext
 *   - @/components/shared/* (Button, FormField, StatusBadge, ImageUpload)
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
 *   - Clean, minimal design approach
 *   - Better typography and spacing
 *   - Subtle animations
 *   - Professional color scheme
 *   - Improved information architecture
 * 
 * Database Tables:
 *   - entity_users (primary profile data)
 *   - users (authentication and system data)
 *   - companies (for company name)
 *   - schools (for assigned schools)
 *   - branches (for assigned branches)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  User, Mail, Phone, Building2, Calendar, Shield, 
  Edit2, Save, X, Camera, MapPin, School, Clock,
  CheckCircle, XCircle, Key, Briefcase, Hash,
  AlertCircle, Loader2, ChevronRight, MoreHorizontal,
  UserCircle, BadgeCheck, Activity
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useUser } from '../../../contexts/UserContext';
import { Button } from '../../../components/shared/Button';
import { FormField, Input, Textarea } from '../../../components/shared/FormField';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { ImageUpload } from '../../../components/shared/ImageUpload';
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
  const [activeTab, setActiveTab] = useState('overview');

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
        phone: profileData.phone,
        metadata: profileData.metadata
      });
    }
  }, [isEditing, profileData]);

  const handleAvatarUpdate = (avatarPath: string | null) => {
    const updatedMetadata = {
      ...(profileData?.metadata || {}),
      avatar_url: avatarPath
    };
    updateProfileMutation.mutate({ metadata: updatedMetadata });
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

  const getAvatarUrl = () => profileData?.metadata?.avatar_url || null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'activity', label: 'Activity', icon: Activity }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Clean Header */}
      <div className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Avatar */}
                <div className="relative">
                  <div className="h-16 w-16 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                    {getAvatarUrl() ? (
                      <img
                        src={getAvatarUrl()}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600">
                        <span className="text-xl font-semibold text-white">
                          {profileData.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  {profileData.is_active && (
                    <span className="absolute bottom-0 right-0 h-4 w-4 bg-green-500 border-2 border-white dark:border-gray-950 rounded-full"></span>
                  )}
                </div>

                {/* Name and Info */}
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {profileData.name}
                  </h1>
                  <div className="flex items-center space-x-4 mt-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {profileData.position || 'No position'}
                    </span>
                    <span className="text-sm text-gray-400 dark:text-gray-600">•</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {profileData.company_name}
                    </span>
                    {profileData.email_verified && (
                      <>
                        <span className="text-sm text-gray-400 dark:text-gray-600">•</span>
                        <span className="flex items-center text-sm text-green-600 dark:text-green-500">
                          <BadgeCheck className="h-3.5 w-3.5 mr-1" />
                          Verified
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                {!isEditing ? (
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                    size="sm"
                    className="border-gray-300 dark:border-gray-700"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => {
                        setIsEditing(false);
                        setEditData({});
                      }}
                      variant="outline"
                      size="sm"
                      className="border-gray-300 dark:border-gray-700"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      size="sm"
                      loading={updateProfileMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-8 border-t border-gray-200 dark:border-gray-800 -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center py-3 px-1 border-b-2 text-sm font-medium transition-colors",
                    activeTab === tab.id
                      ? "border-blue-600 text-blue-600 dark:text-blue-500"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  )}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Information */}
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    Personal Information
                  </h2>
                </div>
                <div className="p-6 space-y-6">
                  {/* Avatar Upload */}
                  {isEditing && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Profile Photo
                      </label>
                      <div className="flex items-center space-x-4">
                        <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                          {getAvatarUrl() ? (
                            <img
                              src={getAvatarUrl()}
                              alt="Profile"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <UserCircle className="h-12 w-12 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <ImageUpload
                          id="avatar"
                          bucket="avatars"
                          value={getAvatarUrl()}
                          onChange={handleAvatarUpdate}
                        >
                          <Button variant="outline" size="sm">
                            <Camera className="h-4 w-4 mr-2" />
                            Change Photo
                          </Button>
                        </ImageUpload>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Full Name
                      </label>
                      {isEditing ? (
                        <Input
                          value={editData.name || ''}
                          onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                          placeholder="Enter your full name"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-white">{profileData.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email
                      </label>
                      <div className="flex items-center space-x-2">
                        <p className="text-gray-900 dark:text-white">{profileData.user_email}</p>
                        {profileData.email_verified && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Position
                      </label>
                      {isEditing ? (
                        <Input
                          value={editData.position || ''}
                          onChange={(e) => setEditData({ ...editData, position: e.target.value })}
                          placeholder="Enter your position"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-white">
                          {profileData.position || 'Not specified'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Department
                      </label>
                      {isEditing ? (
                        <Input
                          value={editData.department || ''}
                          onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                          placeholder="Enter your department"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-white">
                          {profileData.department || 'Not specified'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Phone
                      </label>
                      {isEditing ? (
                        <Input
                          value={editData.phone || ''}
                          onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                          placeholder="Enter your phone number"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-white">
                          {profileData.phone || 'Not specified'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Employee ID
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {profileData.employee_id || 'Not assigned'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assignments */}
              {(profileData.school_names?.length || profileData.branch_names?.length) ? (
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                      Assignments
                    </h2>
                  </div>
                  <div className="p-6 space-y-4">
                    {profileData.school_names?.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Schools
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {profileData.school_names.map((school, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-md text-sm"
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
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Branches
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {profileData.branch_names.map((branch, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-md text-sm"
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
              ) : null}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Account Details */}
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    Account Details
                  </h2>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400">
                      Role
                    </label>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                      {getAdminLevelLabel(profileData.admin_level)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400">
                      Company
                    </label>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                      {profileData.company_name}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400">
                      Hire Date
                    </label>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                      {profileData.hire_date 
                        ? new Date(profileData.hire_date).toLocaleDateString()
                        : 'Not specified'
                      }
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400">
                      Member Since
                    </label>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(profileData.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-500 dark:text-gray-400">
                      Last Login
                    </label>
                    <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                      {profileData.last_login_at 
                        ? new Date(profileData.last_login_at).toLocaleString()
                        : 'Never'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    Quick Actions
                  </h2>
                </div>
                <div className="p-4 space-y-1">
                  <button className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center justify-between">
                      <span>Change Password</span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </button>
                  <button className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center justify-between">
                      <span>Download Data</span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </button>
                  <button className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center justify-between">
                      <span>Privacy Settings</span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="max-w-3xl">
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Security Settings
                </h2>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {/* Email Verification */}
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
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
                      <span className="inline-flex items-center px-2.5 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-md text-xs font-medium">
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
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
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        Password
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {profileData.password_updated_at
                          ? `Last changed ${new Date(profileData.password_updated_at).toLocaleDateString()}`
                          : 'Set a strong password to secure your account'
                        }
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Change Password
                    </Button>
                  </div>
                </div>

                {/* Two-Factor Authentication */}
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
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
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
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
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="max-w-3xl">
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Recent Activity
                </h2>
              </div>
              <div className="p-6">
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Activity tracking coming soon
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}