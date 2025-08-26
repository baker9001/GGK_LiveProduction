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
 *   - Modern gradient hero section
 *   - Enhanced visual hierarchy
 *   - Improved card layouts
 *   - Better responsive design
 *   - Micro-interactions and animations
 *   - Profile completion tracking
 *   - Enhanced security section
 * 
 * Database Tables:
 *   - entity_users (primary profile data)
 *   - users (authentication and system data)
 *   - companies (for company name)
 *   - schools (for assigned schools)
 *   - branches (for assigned branches)
 * 
 * Connected Files:
 *   - UserContext.tsx (user state management)
 *   - supabase.ts (database client)
 *   - All shared components
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  User, Mail, Phone, Building2, Calendar, Shield, 
  Edit2, Save, X, Camera, MapPin, School, Clock,
  CheckCircle, XCircle, Key, Briefcase, Hash,
  AlertCircle, Loader2, Award, TrendingUp,
  Bell, Settings, Download, Share2, MoreVertical,
  Activity, Lock, Unlock, ChevronRight, Info,
  UserCheck, Globe, Target, Sparkles
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
    location?: string;
    timezone?: string;
    linkedin?: string;
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
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<ProfileData>>({});
  const [showMoreActions, setShowMoreActions] = useState(false);

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
      if (entityUser.assigned_schools?.length > 0) {
        const { data: schools } = await supabase
          .from('schools')
          .select('name')
          .in('id', entityUser.assigned_schools);
        schoolNames = schools?.map(s => s.name) || [];
      }

      // Fetch branch names if assigned
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

  // Calculate profile completion
  const profileCompletion = useMemo(() => {
    if (!profileData) return 0;
    
    const fields = [
      profileData.name,
      profileData.position,
      profileData.department,
      profileData.phone,
      profileData.employee_id,
      profileData.metadata?.avatar_url,
      profileData.metadata?.bio,
      profileData.email_verified
    ];
    
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  }, [profileData]);

  // Calculate security score
  const securityScore = useMemo(() => {
    if (!profileData) return 0;
    
    let score = 0;
    if (profileData.email_verified) score += 50;
    if (profileData.password_updated_at) {
      const lastUpdate = new Date(profileData.password_updated_at);
      const daysSinceUpdate = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceUpdate < 90) score += 30;
      else if (daysSinceUpdate < 180) score += 15;
    }
    // Reserve 20 points for 2FA when implemented
    return score;
  }, [profileData]);

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

      return { ...profileData, ...updates };
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['profile', user?.id]);
        setEditingSection(null);
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
    if (editingSection && profileData) {
      setEditData({
        name: profileData.name,
        position: profileData.position,
        department: profileData.department,
        phone: profileData.phone,
        metadata: profileData.metadata
      });
    }
  }, [editingSection, profileData]);

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

  // Handle section save
  const handleSaveSection = () => {
    updateProfileMutation.mutate(editData);
  };

  // Get admin level configuration
  const getAdminLevelConfig = (level: string) => {
    const configs: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      entity_admin: { 
        label: 'Entity Administrator', 
        color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
        icon: <Shield className="w-3 h-3" />
      },
      sub_entity_admin: { 
        label: 'Sub-Entity Administrator', 
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        icon: <UserCheck className="w-3 h-3" />
      },
      school_admin: { 
        label: 'School Administrator', 
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        icon: <School className="w-3 h-3" />
      },
      branch_admin: { 
        label: 'Branch Administrator', 
        color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
        icon: <MapPin className="w-3 h-3" />
      }
    };
    return configs[level as keyof typeof configs] || { 
      label: level, 
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      icon: <User className="w-3 h-3" />
    };
  };

  // Get avatar URL
  const getAvatarUrl = () => profileData?.metadata?.avatar_url || null;

  // Format date
  const formatDate = (date: string | undefined) => {
    if (!date) return 'Not specified';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format date time
  const formatDateTime = (date: string | undefined) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
        </div>
      </div>
    );
  }

  const adminLevelConfig = getAdminLevelConfig(profileData.admin_level);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section with Gradient Background */}
      <div className="relative">
        {/* Background Gradient */}
        <div className="absolute inset-0 h-72 bg-gradient-to-br from-[#8CC63F] via-[#7AB635] to-[#6BA52E] dark:from-[#6BA52E] dark:via-[#5A8E27] dark:to-[#4A7520]">
          {/* Pattern Overlay */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <pattern id="hero-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width="40" height="40" fill="none" stroke="white" strokeWidth="0.5" opacity="0.3" />
                <circle cx="20" cy="20" r="2" fill="white" opacity="0.2" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#hero-pattern)" />
            </svg>
          </div>
        </div>

        {/* Profile Header Content */}
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-32">
          {/* Top Actions Bar */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2">
              {/* Profile Completion */}
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-2">
                <Target className="w-4 h-4 text-white/80" />
                <span className="text-sm text-white/90">Profile {profileCompletion}% Complete</span>
              </div>
              
              {/* Security Score */}
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 flex items-center gap-2">
                <Shield className="w-4 h-4 text-white/80" />
                <span className="text-sm text-white/90">Security {securityScore}%</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                onClick={() => window.print()}
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Export</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline ml-2">Share</span>
              </Button>
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                  onClick={() => setShowMoreActions(!showMoreActions)}
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
                {showMoreActions && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-1 z-10">
                    <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                      <Activity className="w-4 h-4 inline mr-2" />
                      View Activity Log
                    </button>
                    <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                      <Settings className="w-4 h-4 inline mr-2" />
                      Account Settings
                    </button>
                    <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                      <Bell className="w-4 h-4 inline mr-2" />
                      Notification Preferences
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
            {/* Avatar with Upload */}
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-white shadow-xl ring-4 ring-white/50">
                {getAvatarUrl() ? (
                  <img
                    src={getAvatarUrl()}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#8CC63F] to-[#6BA52E] flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">
                      {profileData.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Upload Overlay */}
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <ImageUpload
                  id="avatar"
                  bucket="avatars"
                  value={getAvatarUrl()}
                  onChange={handleAvatarUpdate}
                  className="w-full h-full"
                >
                  <div className="flex flex-col items-center text-white">
                    <Camera className="w-6 h-6 mb-1" />
                    <span className="text-xs">Update</span>
                  </div>
                </ImageUpload>
              </div>

              {/* Profile Completion Ring */}
              <svg className="absolute -inset-2 w-36 h-36 transform -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r="70"
                  stroke="white"
                  strokeWidth="2"
                  fill="none"
                  opacity="0.2"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="70"
                  stroke="white"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray={`${profileCompletion * 4.4} 440`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
            </div>

            {/* Name and Basic Info */}
            <div className="flex-1 text-center sm:text-left text-white">
              <h1 className="text-3xl font-bold mb-1">{profileData.name}</h1>
              <p className="text-lg text-white/90 mb-2">
                {profileData.position || 'No position assigned'}
              </p>
              <p className="text-white/80 flex items-center justify-center sm:justify-start gap-2 mb-3">
                <Mail className="w-4 h-4" />
                {profileData.user_email}
                {profileData.email_verified && (
                  <CheckCircle className="w-4 h-4 text-white" title="Email verified" />
                )}
              </p>
              
              {/* Status Badges */}
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                {profileData.is_active ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/20 backdrop-blur-sm text-white rounded-full text-sm font-medium">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/20 backdrop-blur-sm text-white rounded-full text-sm font-medium">
                    <XCircle className="w-3 h-3" />
                    Inactive
                  </span>
                )}
                
                <span className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm',
                  'bg-white/20 text-white'
                )}>
                  {adminLevelConfig.icon}
                  {adminLevelConfig.label}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 pb-12">
        {/* Quick Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Member Since</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatDate(profileData.created_at)}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Last Login</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {profileData.last_login_at ? 
                    new Date(profileData.last_login_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) 
                    : 'Never'
                  }
                </p>
              </div>
              <Activity className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Assignments</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {(profileData.school_names?.length || 0) + (profileData.branch_names?.length || 0)}
                </p>
              </div>
              <MapPin className="w-8 h-8 text-purple-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Security Score</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {securityScore}%
                </p>
              </div>
              <Shield className="w-8 h-8 text-orange-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Information Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Personal Information
                  </h2>
                </div>
                {editingSection !== 'personal' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingSection('personal')}
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingSection(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveSection}
                      loading={updateProfileMutation.isPending}
                    >
                      Save
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Full Name */}
              <div>
                <label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1 block">
                  Full Name
                </label>
                {editingSection === 'personal' ? (
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

              {/* Position and Department Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1 block">
                    Position
                  </label>
                  {editingSection === 'personal' ? (
                    <Input
                      value={editData.position || ''}
                      onChange={(e) => setEditData({ ...editData, position: e.target.value })}
                      placeholder="Your position"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white font-medium">
                      {profileData.position || 'Not assigned'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1 block">
                    Department
                  </label>
                  {editingSection === 'personal' ? (
                    <Input
                      value={editData.department || ''}
                      onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                      placeholder="Your department"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white font-medium">
                      {profileData.department || 'Not assigned'}
                    </p>
                  )}
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1 block">
                  Phone Number
                </label>
                {editingSection === 'personal' ? (
                  <Input
                    value={editData.phone || ''}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    leftIcon={<Phone className="h-4 w-4 text-gray-400" />}
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    {profileData.phone || 'Not provided'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Account Information Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Account Information
                </h2>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Email */}
              <div>
                <label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1 block">
                  Email Address
                </label>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <p className="text-gray-900 dark:text-white font-medium">
                    {profileData.user_email}
                  </p>
                  {profileData.email_verified ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                      <CheckCircle className="w-3 h-3" />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full text-xs font-medium">
                      <AlertCircle className="w-3 h-3" />
                      Not Verified
                    </span>
                  )}
                </div>
              </div>

              {/* Company and Employee ID Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1 block">
                    Company
                  </label>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900 dark:text-white font-medium">
                      {profileData.company_name || 'Unknown'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1 block">
                    Employee ID
                  </label>
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900 dark:text-white font-medium">
                      {profileData.employee_id || 'Not assigned'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dates Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1 block">
                    Hire Date
                  </label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900 dark:text-white font-medium">
                      {formatDate(profileData.hire_date)}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1 block">
                    Member Since
                  </label>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <p className="text-gray-900 dark:text-white font-medium">
                      {formatDate(profileData.created_at)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Last Login */}
              <div>
                <label className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1 block">
                  Last Login
                </label>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-gray-400" />
                  <p className="text-gray-900 dark:text-white font-medium">
                    {formatDateTime(profileData.last_login_at)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Assignments Section */}
        {(profileData.school_names?.length || profileData.branch_names?.length) ? (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 border-dashed border-gray-300 dark:border-gray-600 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Assignments
                </h2>
                <span className="ml-auto text-sm text-gray-600 dark:text-gray-400">
                  {(profileData.school_names?.length || 0) + (profileData.branch_names?.length || 0)} total
                </span>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Schools */}
                {profileData.school_names && profileData.school_names.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <School className="w-4 h-4" />
                      Assigned Schools ({profileData.school_names.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {profileData.school_names.map((schoolName, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 text-green-800 dark:text-green-300 rounded-lg text-sm font-medium border border-green-200 dark:border-green-700 hover:shadow-md transition-shadow cursor-default"
                        >
                          <School className="w-3 h-3" />
                          {schoolName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Branches */}
                {profileData.branch_names && profileData.branch_names.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Assigned Branches ({profileData.branch_names.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {profileData.branch_names.map((branchName, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 text-purple-800 dark:text-purple-300 rounded-lg text-sm font-medium border border-purple-200 dark:border-purple-700 hover:shadow-md transition-shadow cursor-default"
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
          </div>
        ) : (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 border-dashed border-gray-300 dark:border-gray-600 p-12">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                No schools or branches assigned
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                Contact your administrator to request access to schools or branches
              </p>
            </div>
          </div>
        )}

        {/* Security Settings */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-200 dark:border-red-900 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-b border-red-200 dark:border-red-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Security Settings
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Security Score
                </span>
                <div className="relative w-12 h-12">
                  <svg className="w-12 h-12 transform -rotate-90">
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="#FEE2E2"
                      strokeWidth="4"
                      fill="none"
                    />
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="#EF4444"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray={`${securityScore * 1.26} 126`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900 dark:text-white">
                    {securityScore}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Email Verification */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  profileData.email_verified 
                    ? "bg-green-100 dark:bg-green-900/30" 
                    : "bg-orange-100 dark:bg-orange-900/30"
                )}>
                  {profileData.email_verified ? (
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Email Verification
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {profileData.email_verified 
                      ? 'Your email address has been verified' 
                      : 'Please verify your email address'
                    }
                  </p>
                </div>
              </div>
              {!profileData.email_verified && (
                <Button variant="outline" size="sm">
                  Resend Verification
                </Button>
              )}
            </div>

            {/* Password Security */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Password Security
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {profileData.password_updated_at 
                      ? `Last updated ${formatDate(profileData.password_updated_at)}`
                      : 'Update your password regularly for security'
                    }
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/app/settings/change-password'}
              >
                <Key className="w-4 h-4 mr-1" />
                Change Password
              </Button>
            </div>

            {/* Two-Factor Authentication (Future) */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Two-Factor Authentication
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Add an extra layer of security to your account
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                disabled
                className="opacity-50 cursor-not-allowed"
              >
                Coming Soon
              </Button>
            </div>
          </div>
        </div>

        {/* Profile Completion Tips */}
        {profileCompletion < 100 && (
          <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  Complete Your Profile
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Your profile is {profileCompletion}% complete. Add the following information to reach 100%:
                </p>
                <div className="space-y-2">
                  {!profileData.position && (
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" disabled />
                      <span>Add your position/title</span>
                    </label>
                  )}
                  {!profileData.department && (
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" disabled />
                      <span>Add your department</span>
                    </label>
                  )}
                  {!profileData.phone && (
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" disabled />
                      <span>Add your phone number</span>
                    </label>
                  )}
                  {!profileData.metadata?.avatar_url && (
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" disabled />
                      <span>Upload a profile photo</span>
                    </label>
                  )}
                  {!profileData.email_verified && (
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" className="rounded" disabled />
                      <span>Verify your email address</span>
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}