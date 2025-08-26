/**
 * File: /src/app/entity-module/profile/page.tsx
 * 
 * Entity Module Profile Page
 * Displays user profile information with correct field sources as specified
 * 
 * Field Sources:
 * - Header: entity_users.name, entity_users.position, users.email, users.is_active, entity_users.admin_level
 * - Personal: entity_users.name, entity_users.position, entity_users.department, entity_users.phone
 * - Account: users.email, entity_users.company_id, entity_users.hire_date, entity_users.employee_id, users.created_at, users.last_login_at
 * - Assignments: entity_users.assigned_schools, entity_users.assigned_branches
 * - Security: users.email_verified, users.password_updated_at
 * - Avatar: entity_users.metadata (JSON field for image URL)
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  User, Mail, Phone, Building2, Calendar, Shield, 
  Edit2, Save, X, Camera, MapPin, School, Clock,
  CheckCircle, XCircle, Key, Briefcase, Hash,
  AlertCircle, Loader2
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
  email: string; // Also in users table
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

export default function ProfilePage() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<ProfileData>>({});

  // Fetch profile data
  const { data: profileData, isLoading, error } = useQuery(
    ['profile', user?.id],
    async () => {
      if (!user?.id) throw new Error('User not authenticated');

      // Fetch entity user data with related information
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

      // Fetch user account data
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

      // Fetch school names if assigned
      let schoolNames: string[] = [];
      if (entityUser.assigned_schools && entityUser.assigned_schools.length > 0) {
        const { data: schools } = await supabase
          .from('schools')
          .select('name')
          .in('id', entityUser.assigned_schools);
        schoolNames = schools?.map(s => s.name) || [];
      }

      // Fetch branch names if assigned
      let branchNames: string[] = [];
      if (entityUser.assigned_branches && entityUser.assigned_branches.length > 0) {
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
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Update profile mutation
  const updateProfileMutation = useMutation(
    async (updates: Partial<ProfileData>) => {
      if (!user?.id || !profileData) throw new Error('User not authenticated');

      // Prepare entity_users updates
      const entityUpdates: any = {};
      if (updates.name !== undefined) entityUpdates.name = updates.name;
      if (updates.position !== undefined) entityUpdates.position = updates.position;
      if (updates.department !== undefined) entityUpdates.department = updates.department;
      if (updates.phone !== undefined) entityUpdates.phone = updates.phone;
      if (updates.metadata !== undefined) entityUpdates.metadata = updates.metadata;

      // Update entity_users table
      if (Object.keys(entityUpdates).length > 0) {
        entityUpdates.updated_at = new Date().toISOString();
        
        const { error: entityError } = await supabase
          .from('entity_users')
          .update(entityUpdates)
          .eq('user_id', user.id);

        if (entityError) throw entityError;
      }

      // Prepare users table updates (email only)
      const userUpdates: any = {};
      if (updates.user_email !== undefined && updates.user_email !== profileData.user_email) {
        userUpdates.email = updates.user_email;
        userUpdates.updated_at = new Date().toISOString();
      }

      // Update users table if needed
      if (Object.keys(userUpdates).length > 0) {
        const { error: userError } = await supabase
          .from('users')
          .update(userUpdates)
          .eq('id', user.id);

        if (userError) throw userError;
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
        console.error('Error updating profile:', error);
        toast.error(error.message || 'Failed to update profile');
      }
    }
  );

  // Initialize edit data when entering edit mode
  useEffect(() => {
    if (isEditing && profileData) {
      setEditData({
        name: profileData.name,
        position: profileData.position,
        department: profileData.department,
        phone: profileData.phone,
        user_email: profileData.user_email,
        metadata: profileData.metadata
      });
    }
  }, [isEditing, profileData]);

  // Handle avatar update
  const handleAvatarUpdate = (avatarPath: string | null) => {
    const updatedMetadata = {
      ...(profileData?.metadata || {}),
      avatar_url: avatarPath
    };
    
    updateProfileMutation.mutate({
      metadata: updatedMetadata
    });
  };

  // Handle save changes
  const handleSave = () => {
    updateProfileMutation.mutate(editData);
  };

  // Handle cancel edit
  const handleCancel = () => {
    setIsEditing(false);
    setEditData({});
  };

  // Get admin level display
  const getAdminLevelConfig = (level: string) => {
    const configs = {
      entity_admin: { label: 'Entity Administrator', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
      sub_entity_admin: { label: 'Sub-Entity Administrator', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
      school_admin: { label: 'School Administrator', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
      branch_admin: { label: 'Branch Administrator', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' }
    };
    return configs[level as keyof typeof configs] || { label: level, color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' };
  };

  // Get avatar URL from metadata
  const getAvatarUrl = () => {
    return profileData?.metadata?.avatar_url || null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#8CC63F] mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profileData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Failed to load profile</p>
          <p className="text-sm text-gray-500 mt-2">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  const adminLevelConfig = getAdminLevelConfig(profileData.admin_level);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-[#8CC63F] to-[#7AB635] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-white shadow-lg">
                  {getAvatarUrl() ? (
                    <img
                      src={getAvatarUrl()}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          const fallback = parent.querySelector('.avatar-fallback') as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <div className={cn(
                    "w-full h-full flex items-center justify-center bg-white text-[#8CC63F]",
                    getAvatarUrl() ? "avatar-fallback hidden" : ""
                  )}>
                    <User className="w-8 h-8" />
                  </div>
                </div>
                {isEditing && (
                  <div className="absolute -bottom-2 -right-2">
                    <ImageUpload
                      id="avatar"
                      bucket="avatars"
                      value={getAvatarUrl()}
                      onChange={handleAvatarUpdate}
                      className="w-8 h-8"
                    />
                  </div>
                )}
              </div>

              {/* Header Info */}
              <div className="text-white">
                <h1 className="text-2xl font-bold">{profileData.name}</h1>
                <p className="text-white/90">{profileData.position || 'No position assigned'}</p>
                <p className="text-white/80 text-sm">{profileData.user_email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <StatusBadge 
                    status={profileData.is_active ? 'active' : 'inactive'} 
                    size="xs"
                  />
                  <span className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    'bg-white/20 text-white border border-white/30'
                  )}>
                    {adminLevelConfig.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Edit Button */}
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    loading={updateProfileMutation.isPending}
                    className="bg-white text-[#8CC63F] hover:bg-white/90"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Personal Information
            </h2>
          </div>

          <div className="space-y-4">
            {/* Full Name - entity_users.name */}
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

            {/* Position - entity_users.position */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Position
              </label>
              {isEditing ? (
                <Input
                  value={editData.position || ''}
                  onChange={(e) => setEditData({ ...editData, position: e.target.value })}
                  placeholder="Enter your position/title"
                />
              ) : (
                <p className="text-gray-900 dark:text-white">
                  {profileData.position || 'No position assigned'}
                </p>
              )}
            </div>

            {/* Department - entity_users.department */}
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
                  {profileData.department || 'No department assigned'}
                </p>
              )}
            </div>

            {/* Phone - entity_users.phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone
              </label>
              {isEditing ? (
                <Input
                  value={editData.phone || ''}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  placeholder="Enter your phone number"
                  leftIcon={<Phone className="h-4 w-4 text-gray-400" />}
                />
              ) : (
                <p className="text-gray-900 dark:text-white flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  {profileData.phone || 'No phone number'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Account Information
            </h2>
          </div>

          <div className="space-y-4">
            {/* Email - users.email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <p className="text-gray-900 dark:text-white flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-400" />
                {profileData.user_email}
                {profileData.email_verified ? (
                  <CheckCircle className="h-4 w-4 text-green-500" title="Email verified" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" title="Email not verified" />
                )}
              </p>
            </div>

            {/* Company - entity_users.company_id */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Company
              </label>
              <p className="text-gray-900 dark:text-white flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-400" />
                {profileData.company_name || 'Unknown Company'}
              </p>
            </div>

            {/* Hire Date - entity_users.hire_date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Hire Date
              </label>
              <p className="text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                {profileData.hire_date 
                  ? new Date(profileData.hire_date).toLocaleDateString()
                  : 'Not specified'
                }
              </p>
            </div>

            {/* Employee ID - entity_users.employee_id */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Employee ID
              </label>
              <p className="text-gray-900 dark:text-white flex items-center gap-2">
                <Hash className="h-4 w-4 text-gray-400" />
                {profileData.employee_id || 'Not assigned'}
              </p>
            </div>

            {/* Member Since - users.created_at */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Member Since
              </label>
              <p className="text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                {new Date(profileData.created_at).toLocaleDateString()}
              </p>
            </div>

            {/* Last Login - users.last_login_at */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Last Login
              </label>
              <p className="text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                {profileData.last_login_at 
                  ? new Date(profileData.last_login_at).toLocaleString()
                  : 'Never logged in'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Assignments Section */}
      {(profileData.school_names?.length || profileData.branch_names?.length) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Assignments
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Assigned Schools - entity_users.assigned_schools */}
            {profileData.school_names && profileData.school_names.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assigned Schools
                </label>
                <div className="flex flex-wrap gap-2">
                  {profileData.school_names.map((schoolName, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm"
                    >
                      <School className="w-3 h-3" />
                      {schoolName}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Assigned Branches - entity_users.assigned_branches */}
            {profileData.branch_names && profileData.branch_names.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assigned Branches
                </label>
                <div className="flex flex-wrap gap-2">
                  {profileData.branch_names.map((branchName, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-sm"
                    >
                      <MapPin className="w-3 h-3" />
                      {branchName}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Security Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Key className="h-5 w-5 text-red-600 dark:text-red-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Security Settings
          </h2>
        </div>

        <div className="space-y-4">
          {/* Email Verified - users.email_verified */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Email Verification</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your email address verification status
              </p>
            </div>
            <div className="flex items-center gap-2">
              {profileData.email_verified ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-green-600 dark:text-green-400 font-medium">Verified</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="text-red-600 dark:text-red-400 font-medium">Not Verified</span>
                </>
              )}
            </div>
          </div>

          {/* Password Section */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Password</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Change your account password
                {profileData.password_updated_at && (
                  <span className="block text-xs mt-1">
                    Last updated: {new Date(profileData.password_updated_at).toLocaleDateString()}
                  </span>
                )}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
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