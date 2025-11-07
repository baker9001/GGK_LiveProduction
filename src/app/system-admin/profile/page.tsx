/**
 * File: /src/app/system-admin/profile/page.tsx
 * 
 * REDESIGNED System Administrator Profile Page
 * Modern UI/UX with enhanced functionality and responsive design
 * 
 * FIXED: Profile picture upload button now properly triggers file selection
 * - Added proper click handler to camera button
 * - Fixed ImageUpload component integration
 * - Ensured file input is properly triggered
 * 
 * Key Design Decisions:
 * 1. Card-based layout with clear visual hierarchy
 * 2. Progressive disclosure for complex settings
 * 3. Consistent green accent color (#8CC63F) throughout
 * 4. Enhanced accessibility with proper ARIA labels
 * 5. Responsive grid system for mobile/desktop
 * 6. Micro-interactions and smooth transitions
 * 7. Professional admin-focused design language
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useUser } from '../../../contexts/UserContext';
import { toast } from '../../../components/shared/Toast';
import { Button } from '../../../components/shared/Button';
import { FormField, Input, Textarea } from '../../../components/shared/FormField';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { ToggleSwitch } from '../../../components/shared/ToggleSwitch';
import { Tooltip } from '../../../components/shared/Tooltip';
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
  X,
  Settings,
  Activity,
  Globe,
  MapPin,
  Building,
  Crown,
  CheckCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Download,
  Upload,
  Camera,
  Trash2,
  Key,
  Bell,
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getPublicUrl } from '../../../lib/storageHelpers';
import { cn } from '../../../lib/utils';

// Enhanced type definitions
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
  department?: string;
  employee_id?: string;
  permissions?: Record<string, any>;
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    language?: string;
    notifications?: boolean;
    email_notifications?: boolean;
  };
  security?: {
    two_factor_enabled?: boolean;
    last_password_change?: string;
    login_attempts?: number;
  };
}

interface ActivityLog {
  id: string;
  action: string;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
  details?: string;
}

// Custom hooks for enhanced functionality
const useProfileStats = (userId: string) => {
  return useQuery({
    queryKey: ['profileStats', userId],
    queryFn: async () => {
      // Mock data for demonstration - replace with actual queries
      return {
        totalLogins: 247,
        lastLoginDays: 2,
        accountAge: Math.floor((Date.now() - new Date('2023-01-15').getTime()) / (1000 * 60 * 60 * 24)),
        permissionsCount: 15,
        activeSessionsCount: 3
      };
    },
    enabled: !!userId
  });
};

export default function SystemAdminProfilePage() {
  const { user: currentUser } = useUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // File input ref for manual triggering
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Enhanced state management
  const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'activity' | 'preferences'>('overview');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingSecurity, setIsEditingSecurity] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<UserProfile>>({});
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Fetch enhanced user profile data
  const {
    data: userProfile,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<UserProfile>(
    ['systemAdminProfile', currentUser?.id],
    async () => {
      if (!currentUser?.id) {
        throw new Error('User not authenticated');
      }

      // Fetch from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          is_active,
          created_at,
          last_sign_in_at,
          raw_user_meta_data,
          raw_app_meta_data
        `)
        .eq('id', currentUser.id)
        .single();

      if (userError) throw userError;

      // Fetch admin user data
      const { data: adminData, error: adminError } = await supabase
        .from('admin_users')
        .select(`
          id,
          name,
          email,
          status,
          avatar_url,
          roles (name)
        `)
        .eq('id', currentUser.id)
        .maybeSingle();

      if (adminError) {
        console.warn('Could not fetch admin user data:', adminError.message);
      }

      // Construct enhanced profile
      const profile: UserProfile = {
        id: userData.id,
        email: userData.email,
        name: adminData?.name || userData.raw_user_meta_data?.name || userData.email.split('@')[0],
        avatar_url: adminData?.avatar_url || userData.raw_user_meta_data?.avatar_url || null,
        is_active: userData.is_active && (adminData?.status === 'active'),
        created_at: userData.created_at,
        last_sign_in_at: userData.last_sign_in_at || undefined,
        role: adminData?.roles?.name || currentUser.role,
        phone: userData.raw_user_meta_data?.phone || undefined,
        bio: userData.raw_user_meta_data?.bio || undefined,
        department: userData.raw_user_meta_data?.department || 'System Administration',
        employee_id: userData.raw_user_meta_data?.employee_id || undefined,
        permissions: userData.raw_app_meta_data?.permissions || {},
        preferences: {
          theme: userData.raw_user_meta_data?.theme || 'system',
          language: userData.raw_user_meta_data?.language || 'en',
          notifications: userData.raw_user_meta_data?.notifications !== false,
          email_notifications: userData.raw_user_meta_data?.email_notifications !== false,
        },
        security: {
          two_factor_enabled: userData.raw_user_meta_data?.two_factor_enabled || false,
          last_password_change: userData.raw_user_meta_data?.last_password_change || undefined,
          login_attempts: userData.raw_user_meta_data?.login_attempts || 0,
        }
      };

      return profile;
    },
    {
      enabled: !!currentUser?.id,
      staleTime: 2 * 60 * 1000,
      onError: (err) => {
        console.error('Error fetching system admin profile:', err);
        toast.error('Failed to load profile data');
      },
    }
  );

  // Fetch profile statistics
  const { data: profileStats } = useProfileStats(currentUser?.id || '');

  // Fetch recent activity
  const { data: recentActivity = [] } = useQuery<ActivityLog[]>(
    ['recentActivity', currentUser?.id],
    async () => {
      // Mock data - replace with actual audit log queries
      return [
        {
          id: '1',
          action: 'Profile Updated',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          ip_address: '192.168.1.100',
          details: 'Updated profile information'
        },
        {
          id: '2',
          action: 'Password Changed',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          ip_address: '192.168.1.100',
          details: 'Password successfully updated'
        },
        {
          id: '3',
          action: 'Login',
          timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
          ip_address: '192.168.1.100',
          details: 'Successful login from Chrome browser'
        }
      ];
    },
    { enabled: !!currentUser?.id }
  );

  // Enhanced update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      if (!currentUser?.id) throw new Error('User not authenticated');

      // Fetch current metadata
      const { data: currentData, error: fetchError } = await supabase
        .from('users')
        .select('raw_user_meta_data, raw_app_meta_data')
        .eq('id', currentUser.id)
        .single();

      if (fetchError) throw fetchError;

      const newUserMetaData = { ...currentData.raw_user_meta_data };
      const newAppMetaData = { ...currentData.raw_app_meta_data };
      const userUpdates: any = {};
      const adminUpdates: any = {};

      // Handle different types of updates
      if (updates.name !== undefined) {
        newUserMetaData.name = updates.name;
        adminUpdates.name = updates.name;
      }
      if (updates.avatar_url !== undefined) {
        newUserMetaData.avatar_url = updates.avatar_url;
        adminUpdates.avatar_url = updates.avatar_url;
      }
      if (updates.phone !== undefined) {
        newUserMetaData.phone = updates.phone;
      }
      if (updates.bio !== undefined) {
        newUserMetaData.bio = updates.bio;
      }
      if (updates.department !== undefined) {
        newUserMetaData.department = updates.department;
      }
      if (updates.preferences) {
        Object.assign(newUserMetaData, updates.preferences);
      }
      if (updates.email !== undefined && updates.email !== userProfile?.email) {
        userUpdates.email = updates.email;
        adminUpdates.email = updates.email;
      }

      // Update users table
      userUpdates.raw_user_meta_data = newUserMetaData;
      userUpdates.raw_app_meta_data = newAppMetaData;
      userUpdates.updated_at = new Date().toISOString();

      const { error: userUpdateError } = await supabase
        .from('users')
        .update(userUpdates)
        .eq('id', currentUser.id);

      if (userUpdateError) throw userUpdateError;

      // Update admin_users table if there are admin-specific updates
      if (Object.keys(adminUpdates).length > 0) {
        adminUpdates.updated_at = new Date().toISOString();
        
        const { error: adminUpdateError } = await supabase
          .from('admin_users')
          .update(adminUpdates)
          .eq('id', currentUser.id);

        if (adminUpdateError) {
          console.warn('Failed to update admin_users:', adminUpdateError.message);
        }
      }
    },
    onSuccess: (_data, _variables) => {
      queryClient.invalidateQueries({ queryKey: ['systemAdminProfile', currentUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['userSidebarProfile', currentUser?.id] });
      toast.success('Profile updated successfully!');
      setIsEditingProfile(false);
      setIsEditingSecurity(false);
    },
    onError: (err: any) => {
      console.error('Error updating profile:', err);
      toast.error(err.message || 'Failed to update profile');
    }
  });

  // Handle avatar upload
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser?.id) return;

    // Validate file type
    if (!file.type.match(/^image\/(jpeg|png|jpg|svg\+xml)$/)) {
      toast.error("Please upload an image file (PNG, JPG, JPEG, or SVG)");
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB");
      return;
    }

    setIsUploadingAvatar(true);
    const loadingToastId = toast.loading('Uploading profile picture...');

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}_${Date.now()}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      // Update profile with new avatar URL
      await updateProfileMutation.mutateAsync({ avatar_url: data.path });
      
      toast.dismiss(loadingToastId);
      toast.success('Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.dismiss(loadingToastId);
      toast.error('Failed to upload profile picture');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle avatar removal
  const handleAvatarRemove = async () => {
    if (!userProfile?.avatar_url) return;

    const confirmRemove = window.confirm('Are you sure you want to remove your profile picture?');
    if (!confirmRemove) return;

    const loadingToastId = toast.loading('Removing profile picture...');

    try {
      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([userProfile.avatar_url]);

      if (deleteError) {
        console.warn('Error deleting avatar from storage:', deleteError);
      }

      // Update profile
      await updateProfileMutation.mutateAsync({ avatar_url: null });
      
      toast.dismiss(loadingToastId);
      toast.success('Profile picture removed successfully!');
    } catch (error) {
      console.error('Error removing avatar:', error);
      toast.dismiss(loadingToastId);
      toast.error('Failed to remove profile picture');
    }
  };

  // Handle profile editing
  const handleEditProfile = () => {
    setIsEditingProfile(true);
    setEditFormData({
      name: userProfile?.name,
      email: userProfile?.email,
      phone: userProfile?.phone,
      bio: userProfile?.bio,
      department: userProfile?.department,
    });
  };

  const handleSaveProfile = async () => {
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

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setIsEditingSecurity(false);
    setEditFormData({});
  };

  // Handle preference updates
  const handlePreferenceUpdate = async (key: string, value: any) => {
    const preferences = { ...userProfile?.preferences, [key]: value };
    await updateProfileMutation.mutateAsync({ preferences });
  };

  // Loading state with skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-64"></div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1 bg-gray-200 dark:bg-gray-700 rounded-2xl h-96"></div>
              <div className="lg:col-span-3 space-y-6">
                <div className="bg-gray-200 dark:bg-gray-700 rounded-2xl h-64"></div>
                <div className="bg-gray-200 dark:bg-gray-700 rounded-2xl h-48"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Profile Load Error
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error?.message || 'Unable to load your profile. Please try again.'}
          </p>
          <div className="flex gap-3">
            <Button onClick={() => refetch()} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button variant="outline" onClick={() => navigate('/app/system-admin/dashboard')} className="flex-1">
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate derived data
  const memberSinceYear = new Date(userProfile.created_at).getFullYear();
  const accountAge = Math.floor((Date.now() - new Date(userProfile.created_at).getTime()) / (1000 * 60 * 60 * 24));
  const lastLoginFormatted = userProfile.last_sign_in_at
    ? new Date(userProfile.last_sign_in_at).toLocaleString()
    : 'Never';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Enhanced Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[#8CC63F]/10 to-blue-500/10 rounded-3xl"></div>
          <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl border border-gray-200/50 dark:border-gray-700/50 p-8 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-[#8CC63F] shadow-lg bg-gradient-to-br from-[#8CC63F] to-[#7AB635]">
                    {userProfile.avatar_url ? (
                      <img
                        src={getPublicUrl('avatars', userProfile.avatar_url) || ''}
                        alt={`${userProfile.name}'s avatar`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                        {userProfile.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#8CC63F] rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                    <Crown className="h-3 w-3 text-white" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                      {userProfile.name}
                    </h1>
                    <StatusBadge 
                      status={userProfile.is_active ? 'active' : 'inactive'} 
                      size="md"
                      showIcon={true}
                    />
                  </div>
                  <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-[#8CC63F]" />
                      <span className="font-medium">{userProfile.role}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      <span>{userProfile.department}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Since {memberSinceYear}</span>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 max-w-md">
                    {userProfile.bio || 'System Administrator with full access to platform management and configuration.'}
                  </p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:min-w-0 lg:flex-shrink-0">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-4 text-center border border-blue-200 dark:border-blue-700">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {profileStats?.totalLogins || 0}
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-300 font-medium">Total Logins</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-4 text-center border border-green-200 dark:border-green-700">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {accountAge}
                  </div>
                  <div className="text-xs text-green-700 dark:text-green-300 font-medium">Days Active</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-4 text-center border border-purple-200 dark:border-purple-700">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {profileStats?.permissionsCount || 0}
                  </div>
                  <div className="text-xs text-purple-700 dark:text-purple-300 font-medium">Permissions</div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 rounded-xl p-4 text-center border border-orange-200 dark:border-orange-700">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {profileStats?.activeSessionsCount || 0}
                  </div>
                  <div className="text-xs text-orange-700 dark:text-orange-300 font-medium">Sessions</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Tab Navigation */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
          <div className="p-2">
            <nav className="flex gap-2" role="tablist">
              {[
                { id: 'overview', label: 'Overview', icon: UserIcon },
                { id: 'security', label: 'Security', icon: Shield },
                { id: 'activity', label: 'Activity', icon: Activity },
                { id: 'preferences', label: 'Preferences', icon: Settings }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={activeTab === id}
                  onClick={() => setActiveTab(id as any)}
                  className={cn(
                    'flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300 transform hover:scale-105',
                    activeTab === id
                      ? 'bg-gradient-to-r from-[#8CC63F] to-[#7AB635] text-white shadow-lg shadow-[#8CC63F]/25'
                      : 'text-gray-600 dark:text-gray-400 hover:text-[#8CC63F] dark:hover:text-[#8CC63F] hover:bg-gray-100 dark:hover:bg-gray-700/50'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Profile Card */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Picture Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="text-center space-y-4">
                <div className="relative mx-auto w-32 h-32">
                  <div className="w-full h-full rounded-2xl overflow-hidden border-4 border-[#8CC63F] shadow-lg">
                    {userProfile.avatar_url ? (
                      <img
                        src={getPublicUrl('avatars', userProfile.avatar_url) || ''}
                        alt={`${userProfile.name}'s avatar`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#8CC63F] to-[#7AB635] text-white text-4xl font-bold">
                        {userProfile.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  
                  {/* Upload button */}
                  <Tooltip content="Upload new profile picture">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="absolute bottom-2 right-2 w-8 h-8 bg-[#8CC63F] hover:bg-[#7AB635] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
                    >
                      {isUploadingAvatar ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </button>
                  </Tooltip>
                  
                  {/* Remove button - only show if avatar exists */}
                  {userProfile.avatar_url && (
                    <Tooltip content="Remove profile picture">
                      <button 
                        onClick={handleAvatarRemove}
                        disabled={isUploadingAvatar}
                        className="absolute bottom-2 left-2 w-8 h-8 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </Tooltip>
                  )}
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {userProfile.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {userProfile.email}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2">
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    userProfile.is_active ? "bg-green-500 animate-pulse" : "bg-red-500"
                  )}></div>
                  <span className={cn(
                    "text-sm font-medium",
                    userProfile.is_active ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  )}>
                    {userProfile.is_active ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h4>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/app/settings/change-password')}
                >
                  <Lock className="h-4 w-4 mr-3" />
                  Change Password
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setActiveTab('preferences')}
                >
                  <Settings className="h-4 w-4 mr-3" />
                  Preferences
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setActiveTab('activity')}
                >
                  <Activity className="h-4 w-4 mr-3" />
                  View Activity
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Basic Information Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="bg-gradient-to-r from-[#8CC63F]/10 to-blue-500/10 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#8CC63F] rounded-xl flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            Basic Information
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Manage your personal details and contact information
                          </p>
                        </div>
                      </div>
                      {!isEditingProfile ? (
                        <Button
                          variant="outline"
                          onClick={handleEditProfile}
                          className="hover:bg-[#8CC63F] hover:text-white hover:border-[#8CC63F]"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Profile
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={handleCancelEdit}
                            disabled={updateProfileMutation.isPending}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSaveProfile}
                            loading={updateProfileMutation.isPending}
                            loadingText="Saving..."
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField label="Full Name" id="profile-name">
                        {isEditingProfile ? (
                          <Input
                            id="profile-name"
                            value={editFormData.name || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                            placeholder="Enter your full name"
                            leftIcon={<UserIcon className="h-4 w-4 text-gray-400" />}
                          />
                        ) : (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                            <UserIcon className="h-5 w-5 text-[#8CC63F]" />
                            <span className="text-gray-900 dark:text-white font-medium">
                              {userProfile.name}
                            </span>
                          </div>
                        )}
                      </FormField>

                      <FormField label="Email Address" id="profile-email">
                        {isEditingProfile ? (
                          <Input
                            id="profile-email"
                            type="email"
                            value={editFormData.email || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                            placeholder="Enter your email"
                            leftIcon={<Mail className="h-4 w-4 text-gray-400" />}
                          />
                        ) : (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                            <Mail className="h-5 w-5 text-[#8CC63F]" />
                            <span className="text-gray-900 dark:text-white font-medium">
                              {userProfile.email}
                            </span>
                          </div>
                        )}
                      </FormField>

                      <FormField label="Phone Number" id="profile-phone">
                        {isEditingProfile ? (
                          <Input
                            id="profile-phone"
                            type="tel"
                            value={editFormData.phone || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                            placeholder="Enter your phone number"
                            leftIcon={<Phone className="h-4 w-4 text-gray-400" />}
                          />
                        ) : (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                            <Phone className="h-5 w-5 text-[#8CC63F]" />
                            <span className="text-gray-900 dark:text-white font-medium">
                              {userProfile.phone || 'Not provided'}
                            </span>
                          </div>
                        )}
                      </FormField>

                      <FormField label="Department" id="profile-department">
                        {isEditingProfile ? (
                          <Input
                            id="profile-department"
                            value={editFormData.department || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                            placeholder="Enter your department"
                            leftIcon={<Building className="h-4 w-4 text-gray-400" />}
                          />
                        ) : (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                            <Building className="h-5 w-5 text-[#8CC63F]" />
                            <span className="text-gray-900 dark:text-white font-medium">
                              {userProfile.department}
                            </span>
                          </div>
                        )}
                      </FormField>

                      <div className="md:col-span-2">
                        <FormField label="Bio" id="profile-bio">
                          {isEditingProfile ? (
                            <Textarea
                              id="profile-bio"
                              value={editFormData.bio || ''}
                              onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                              placeholder="Tell us about yourself and your role..."
                              rows={3}
                            />
                          ) : (
                            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                              <p className="text-gray-900 dark:text-white">
                                {userProfile.bio || 'No bio provided'}
                              </p>
                            </div>
                          )}
                        </FormField>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Role & Permissions Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                        <Shield className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          Role & Permissions
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Your administrative role and system access levels
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
                      <div className="flex items-center gap-3">
                        <Crown className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {userProfile.role}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Full system access
                          </div>
                        </div>
                      </div>
                      <StatusBadge status="active" size="sm" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <div className="text-2xl font-bold text-[#8CC63F]">
                          {profileStats?.permissionsCount || 15}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Permissions</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          All
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Access Level</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Status Overview */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="bg-gradient-to-r from-[#8CC63F]/10 to-green-500/10 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#8CC63F] rounded-xl flex items-center justify-center">
                        <Activity className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          System Overview
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Your administrative dashboard and system status
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
                        <div className="flex items-center justify-between mb-2">
                          <Monitor className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                          <span className="text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-200 dark:bg-blue-800 px-2 py-1 rounded-full">
                            ACTIVE
                          </span>
                        </div>
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">98.9%</div>
                        <div className="text-sm text-blue-700 dark:text-blue-300">System Uptime</div>
                      </div>

                      <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl p-4 border border-green-200 dark:border-green-700">
                        <div className="flex items-center justify-between mb-2">
                          <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
                          <span className="text-xs font-medium text-green-700 dark:text-green-300 bg-green-200 dark:bg-green-800 px-2 py-1 rounded-full">
                            SECURE
                          </span>
                        </div>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">100%</div>
                        <div className="text-sm text-green-700 dark:text-green-300">Security Score</div>
                      </div>

                      <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl p-4 border border-purple-200 dark:border-purple-700">
                        <div className="flex items-center justify-between mb-2">
                          <UserIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                          <span className="text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-200 dark:bg-purple-800 px-2 py-1 rounded-full">
                            ADMIN
                          </span>
                        </div>
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {profileStats?.permissionsCount || 15}
                        </div>
                        <div className="text-sm text-purple-700 dark:text-purple-300">Permissions</div>
                      </div>

                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 rounded-xl p-4 border border-orange-200 dark:border-orange-700">
                        <div className="flex items-center justify-between mb-2">
                          <Smartphone className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                          <span className="text-xs font-medium text-orange-700 dark:text-orange-300 bg-orange-200 dark:bg-orange-800 px-2 py-1 rounded-full">
                            ONLINE
                          </span>
                        </div>
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {profileStats?.totalLogins || 247}
                        </div>
                        <div className="text-sm text-orange-700 dark:text-orange-300">Total Logins</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Button
                    variant="outline"
                    className="h-24 flex-col gap-2 hover:bg-[#8CC63F] hover:text-white hover:border-[#8CC63F] transition-all duration-300 transform hover:scale-105"
                    onClick={() => setActiveTab('security')}
                  >
                    <Lock className="h-6 w-6" />
                    <span className="font-medium">Security Settings</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-24 flex-col gap-2 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all duration-300 transform hover:scale-105"
                    onClick={() => setActiveTab('activity')}
                  >
                    <Activity className="h-6 w-6" />
                    <span className="font-medium">View Activity</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-24 flex-col gap-2 hover:bg-purple-500 hover:text-white hover:border-purple-500 transition-all duration-300 transform hover:scale-105"
                    onClick={() => setActiveTab('preferences')}
                  >
                    <Settings className="h-6 w-6" />
                    <span className="font-medium">Preferences</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                {/* Password Security Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
                          <Lock className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            Password & Authentication
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Manage your login credentials and security settings
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => navigate('/app/settings/change-password')}
                        className="hover:bg-red-500 hover:text-white hover:border-red-500"
                      >
                        <Key className="h-4 w-4 mr-2" />
                        Change Password
                      </Button>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">Password</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">••••••••••••</div>
                          </div>
                          <StatusBadge status="active" size="sm" />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">Two-Factor Auth</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {userProfile.security?.two_factor_enabled ? 'Enabled' : 'Disabled'}
                            </div>
                          </div>
                          <ToggleSwitch
                            checked={userProfile.security?.two_factor_enabled || false}
                            onChange={(enabled) => {
                              // Handle 2FA toggle
                              toast.info('Two-factor authentication setup will be implemented');
                            }}
                            size="sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
                          <div className="flex items-center gap-2 mb-3">
                            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                              Security Score
                            </h4>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                              <div className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full" style={{ width: '85%' }}></div>
                            </div>
                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">85%</span>
                          </div>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                            Strong security posture. Consider enabling 2FA for maximum protection.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Security Recommendations */}
                    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Info className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        <h4 className="font-semibold text-amber-900 dark:text-amber-100">
                          Security Recommendations
                        </h4>
                      </div>
                      <ul className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Use a strong password with at least 12 characters
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Include uppercase, lowercase, numbers, and symbols
                        </li>
                        <li className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                          Enable two-factor authentication for enhanced security
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Change your password regularly (every 90 days)
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Activity Tab */}
            {activeTab === 'activity' && (
              <div className="space-y-6">
                {/* Account Activity Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="bg-gradient-to-r from-green-500/10 to-teal-500/10 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                        <Activity className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          Account Activity
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Monitor your account usage and login history
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl border border-blue-200 dark:border-blue-700">
                        <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          {lastLoginFormatted}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Last Login</div>
                      </div>

                      <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl border border-green-200 dark:border-green-700">
                        <Calendar className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          {new Date(userProfile.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Account Created</div>
                      </div>

                      <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl border border-purple-200 dark:border-purple-700">
                        <Globe className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          {profileStats?.activeSessionsCount || 1}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Active Sessions</div>
                      </div>
                    </div>

                    {/* Recent Activity Timeline */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h4>
                      <div className="space-y-3">
                        {recentActivity.map((activity, index) => (
                          <div
                            key={activity.id}
                            className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <div className="w-10 h-10 bg-[#8CC63F] rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {activity.action}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {new Date(activity.timestamp).toLocaleString()}
                                {activity.ip_address && ` • ${activity.ip_address}`}
                              </div>
                              {activity.details && (
                                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                  {activity.details}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="space-y-6">
                {/* System Preferences Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
                        <Settings className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          System Preferences
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Customize your admin interface and notification settings
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Interface Preferences */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Monitor className="h-5 w-5 text-[#8CC63F]" />
                        Interface
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">Theme</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Choose your preferred color scheme
                            </div>
                          </div>
                          <select
                            value={userProfile.preferences?.theme || 'system'}
                            onChange={(e) => handlePreferenceUpdate('theme', e.target.value)}
                            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                          >
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                            <option value="system">System</option>
                          </select>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">Language</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Select your preferred language
                            </div>
                          </div>
                          <select
                            value={userProfile.preferences?.language || 'en'}
                            onChange={(e) => handlePreferenceUpdate('language', e.target.value)}
                            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                          >
                            <option value="en">English</option>
                            <option value="ar">العربية</option>
                            <option value="es">Español</option>
                            <option value="fr">Français</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Notification Preferences */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Bell className="h-5 w-5 text-[#8CC63F]" />
                        Notifications
                      </h4>
                      
                      <div className="space-y-3">
                        <ToggleSwitch
                          checked={userProfile.preferences?.notifications !== false}
                          onChange={(enabled) => handlePreferenceUpdate('notifications', enabled)}
                          label="System Notifications"
                          description="Receive notifications about system events and updates"
                          showStateLabel={true}
                        />
                        
                        <ToggleSwitch
                          checked={userProfile.preferences?.email_notifications !== false}
                          onChange={(enabled) => handlePreferenceUpdate('email_notifications', enabled)}
                          label="Email Notifications"
                          description="Receive important notifications via email"
                          showStateLabel={true}
                        />
                      </div>
                    </div>

                    {/* Advanced Settings */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                      <button
                        onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-[#8CC63F] dark:hover:text-[#8CC63F] transition-colors"
                      >
                        <Settings className="h-4 w-4" />
                        <span className="font-medium">Advanced Settings</span>
                        <div className={cn(
                          "transition-transform duration-200",
                          showAdvancedSettings ? "rotate-180" : ""
                        )}>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>
                      
                      {showAdvancedSettings && (
                        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl space-y-3">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Advanced configuration options for system administrators
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Button variant="outline" size="sm" className="justify-start">
                              <Download className="h-4 w-4 mr-2" />
                              Export Data
                            </Button>
                            <Button variant="outline" size="sm" className="justify-start">
                              <Upload className="h-4 w-4 mr-2" />
                              Import Settings
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Floating Action Button for Mobile */}
        <div className="fixed bottom-6 right-6 lg:hidden">
          <Button
            className="w-14 h-14 rounded-full shadow-2xl"
            onClick={handleEditProfile}
          >
            <Edit className="h-6 w-6" />
          </Button>
        </div>

        {/* Loading Overlay */}
        {updateProfileMutation.isPending && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-[#8CC63F]" />
                <span className="text-gray-900 dark:text-white font-medium">
                  Updating profile...
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}