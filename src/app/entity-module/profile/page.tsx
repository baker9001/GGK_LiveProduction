/**
 * File: /src/app/entity-module/profile/page.tsx
 * 
 * Entity Module Profile Management Page
 * Handles profile information, avatar upload, and account settings for entity users
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Shield, 
  Camera, 
  Save, 
  Lock,
  Bell,
  Globe,
  Palette,
  Settings,
  CheckCircle,
  AlertCircle,
  Loader2,
  Building2,
  MapPin,
  Edit,
  X
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useUser } from '../../../contexts/UserContext';
import { useAccessControl } from '../../../hooks/useAccessControl';
import { Button } from '../../../components/shared/Button';
import { FormField, Input, Select, Textarea } from '../../../components/shared/FormField';
import { ImageUpload } from '../../../components/shared/ImageUpload';
import { ToggleSwitch } from '../../../components/shared/ToggleSwitch';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { toast } from '../../../components/shared/Toast';
import { getPublicUrl } from '../../../lib/storageHelpers';

interface EntityUserProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  position?: string;
  department?: string;
  employee_id?: string;
  admin_level: string;
  company_id: string;
  company_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  metadata?: {
    avatar_url?: string;
    bio?: string;
    timezone?: string;
    language?: string;
    theme?: string;
    notifications?: {
      email: boolean;
      system: boolean;
      security: boolean;
    };
  };
  assigned_schools?: string[];
  assigned_branches?: string[];
}

export default function EntityProfilePage() {
  const { user, refreshUser } = useUser();
  const { getUserContext } = useAccessControl();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'activity' | 'preferences'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<EntityUserProfile>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Get user context
  const userContext = getUserContext();

  // Fetch entity user profile data
  const {
    data: profile,
    isLoading,
    error
  } = useQuery({
    queryKey: ['entity-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('entity_users')
        .select(`
          id,
          user_id,
          name,
          email,
          phone,
          position,
          department,
          employee_id,
          admin_level,
          company_id,
          is_active,
          created_at,
          updated_at,
          metadata,
          companies (name)
        `)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      return {
        ...data,
        company_name: data.companies?.name || 'Unknown Company',
        metadata: data.metadata || {}
      } as EntityUserProfile;
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        position: profile.position,
        department: profile.department,
        employee_id: profile.employee_id,
        metadata: {
          avatar_url: profile.metadata?.avatar_url || '',
          bio: profile.metadata?.bio || '',
          timezone: profile.metadata?.timezone || 'UTC',
          language: profile.metadata?.language || 'en',
          theme: profile.metadata?.theme || 'system',
          notifications: {
            email: profile.metadata?.notifications?.email ?? true,
            system: profile.metadata?.notifications?.system ?? true,
            security: profile.metadata?.notifications?.security ?? true,
          }
        }
      });
    }
  }, [profile]);

  // Update profile mutation
  const updateProfileMutation = useMutation(
    async (updates: Partial<EntityUserProfile>) => {
      if (!user?.id || !profile?.id) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('entity_users')
        .update({
          name: updates.name,
          email: updates.email,
          phone: updates.phone,
          position: updates.position,
          department: updates.department,
          employee_id: updates.employee_id,
          metadata: updates.metadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (error) throw error;
      return updates;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['entity-profile']);
        refreshUser();
        setIsEditing(false);
        toast.success('Profile updated successfully');
      },
      onError: (error) => {
        console.error('Error updating profile:', error);
        toast.error('Failed to update profile');
      }
    }
  );

  // Handle form submission
  const handleSubmit = () => {
    const errors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    updateProfileMutation.mutate(formData);
  };

  // Handle avatar upload
  const handleAvatarChange = (path: string | null) => {
    setFormData(prev => ({ 
      ...prev, 
      metadata: {
        ...prev.metadata,
        avatar_url: path
      }
    }));
    
    // Auto-save avatar changes
    if (profile) {
      updateProfileMutation.mutate({ 
        ...formData, 
        metadata: {
          ...formData.metadata,
          avatar_url: path
        }
      });
    }
  };

  // Handle field changes
  const updateFormData = (field: string, value: any) => {
    setFormData(prev => {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return {
          ...prev,
          [parent]: {
            ...(prev[parent as keyof EntityUserProfile] as any),
            [child]: value
          }
        };
      }
      return { ...prev, [field]: value };
    });

    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#8CC63F]" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading profile...</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-re-700 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-200">
                Error Loading Profile
              </h3>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {error?.message || 'Failed to load profile data. Please try again.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#8CC63F]/20 to-[#7AB635]/20 rounded-full flex items-center justify-center">
              <Building2 className="w-8 h-8 text-[#8CC63F]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Profile Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your account settings and preferences
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={profile.is_active ? 'active' : 'inactive'} />
            <div className="flex items-center gap-1 px-3 py-1 bg-[#8CC63F]/10 rounded-lg">
              <Shield className="w-4 h-4 text-[#8CC63F]" />
              <span className="text-sm font-medium text-[#8CC63F]">
                {profile.admin_level}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          {[
            { id: 'overview', label: 'Overview', icon: User },
            { id: 'security', label: 'Security', icon: Lock },
            { id: 'activity', label: 'Activity', icon: Calendar },
            { id: 'preferences', label: 'Preferences', icon: Settings }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 inline mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Profile Information
              </h2>
              <Button
                variant={isEditing ? "outline" : "default"}
                onClick={() => {
                  if (isEditing) {
                    setIsEditing(false);
                    setFormData({
                      name: profile.name,
                      email: profile.email,
                      phone: profile.phone,
                      position: profile.position,
                      department: profile.department,
                      employee_id: profile.employee_id,
                      metadata: profile.metadata
                    });
                    setFormErrors({});
                  } else {
                    setIsEditing(true);
                  }
                }}
                leftIcon={isEditing ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
              >
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  id="name"
                  label="Full Name"
                  required
                  error={formErrors.name}
                >
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => updateFormData('name', e.target.value)}
                    placeholder="Enter your full name"
                    disabled={!isEditing}
                    leftIcon={<User className="h-5 w-5 text-gray-400" />}
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
                    value={formData.email || ''}
                    onChange={(e) => updateFormData('email', e.target.value)}
                    placeholder="Enter your email address"
                    disabled={!isEditing}
                    leftIcon={<Mail className="h-5 w-5 text-gray-400" />}
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
                    onChange={(e) => updateFormData('phone', e.target.value)}
                    placeholder="Enter your phone number"
                    disabled={!isEditing}
                    leftIcon={<Phone className="h-5 w-5 text-gray-400" />}
                  />
                </FormField>

                <FormField
                  id="position"
                  label="Position"
                  error={formErrors.position}
                >
                  <Input
                    id="position"
                    value={formData.position || ''}
                    onChange={(e) => updateFormData('position', e.target.value)}
                    placeholder="Enter your position"
                    disabled={!isEditing}
                    leftIcon={<Building2 className="h-5 w-5 text-gray-400" />}
                  />
                </FormField>

                <FormField
                  id="department"
                  label="Department"
                  error={formErrors.department}
                >
                  <Input
                    id="department"
                    value={formData.department || ''}
                    onChange={(e) => updateFormData('department', e.target.value)}
                    placeholder="Enter your department"
                    disabled={!isEditing}
                    leftIcon={<Building2 className="h-5 w-5 text-gray-400" />}
                  />
                </FormField>

                <FormField
                  id="employee_id"
                  label="Employee ID"
                  error={formErrors.employee_id}
                >
                  <Input
                    id="employee_id"
                    value={formData.employee_id || ''}
                    onChange={(e) => updateFormData('employee_id', e.target.value)}
                    placeholder="Enter your employee ID"
                    disabled={!isEditing}
                    leftIcon={<Shield className="h-5 w-5 text-gray-400" />}
                  />
                </FormField>
              </div>

              <FormField
                id="bio"
                label="Bio"
                error={formErrors.bio}
              >
                <Textarea
                  id="bio"
                  value={formData.metadata?.bio || ''}
                  onChange={(e) => updateFormData('metadata.bio', e.target.value)}
                  placeholder="Tell us about yourself..."
                  disabled={!isEditing}
                  rows={3}
                />
              </FormField>

              {isEditing && (
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        name: profile.name,
                        email: profile.email,
                        phone: profile.phone,
                        position: profile.position,
                        department: profile.department,
                        employee_id: profile.employee_id,
                        metadata: profile.metadata
                      });
                      setFormErrors({});
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    loading={updateProfileMutation.isPending}
                    leftIcon={<Save className="h-4 w-4" />}
                  >
                    Save Changes
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Profile Picture & Quick Info */}
          <div className="space-y-6">
            {/* Avatar Upload */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Camera className="h-5 w-5 mr-2 text-[#8CC63F]" />
                Profile Picture
              </h3>
              
              <div className="text-center">
                <div className="mb-4">
                  <ImageUpload
                    id="avatar"
                    bucket="avatars"
                    value={formData.metadata?.avatar_url}
                    publicUrl={formData.metadata?.avatar_url ? getPublicUrl('avatars', formData.metadata.avatar_url) : null}
                    onChange={handleAvatarChange}
                    className="mx-auto"
                  />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Upload a profile picture to personalize your account
                </p>
              </div>
            </div>

            {/* Account Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Account Summary
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Company:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {profile.company_name}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Admin Level:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {profile.admin_level}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                  <StatusBadge status={profile.is_active ? 'active' : 'inactive'} size="sm" />
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Member Since:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Other tabs content similar to system admin but adapted for entity users */}
      {activeTab === 'preferences' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              System Preferences
            </h2>
            <Button
              onClick={handleSubmit}
              loading={updateProfileMutation.isPending}
              leftIcon={<Save className="h-4 w-4" />}
            >
              Save Preferences
            </Button>
          </div>

          <div className="space-y-6">
            {/* Interface Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <Palette className="h-5 w-5 text-[#8CC63F]" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Interface
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField id="theme" label="Theme">
                  <Select
                    id="theme"
                    value={formData.metadata?.theme || 'system'}
                    onChange={(value) => updateFormData('metadata.theme', value)}
                    options={[
                      { value: 'system', label: 'System' },
                      { value: 'light', label: 'Light' },
                      { value: 'dark', label: 'Dark' }
                    ]}
                  />
                </FormField>

                <FormField id="language" label="Language">
                  <Select
                    id="language"
                    value={formData.metadata?.language || 'en'}
                    onChange={(value) => updateFormData('metadata.language', value)}
                    options={[
                      { value: 'en', label: 'English' },
                      { value: 'ar', label: 'العربية' },
                      { value: 'es', label: 'Español' },
                      { value: 'fr', label: 'Français' }
                    ]}
                  />
                </FormField>

                <FormField id="timezone" label="Timezone">
                  <Select
                    id="timezone"
                    value={formData.metadata?.timezone || 'UTC'}
                    onChange={(value) => updateFormData('metadata.timezone', value)}
                    options={[
                      { value: 'UTC', label: 'UTC' },
                      { value: 'America/New_York', label: 'Eastern Time' },
                      { value: 'America/Chicago', label: 'Central Time' },
                      { value: 'America/Denver', label: 'Mountain Time' },
                      { value: 'America/Los_Angeles', label: 'Pacific Time' },
                      { value: 'Europe/London', label: 'London' },
                      { value: 'Europe/Paris', label: 'Paris' },
                      { value: 'Asia/Dubai', label: 'Dubai' },
                      { value: 'Asia/Kuwait', label: 'Kuwait' }
                    ]}
                  />
                </FormField>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                <Bell className="h-5 w-5 text-[#8CC63F]" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Notifications
                </h3>
              </div>

              <div className="space-y-4">
                <ToggleSwitch
                  checked={formData.metadata?.notifications?.system ?? true}
                  onChange={(checked) => updateFormData('metadata.notifications.system', checked)}
                  label="System Notifications"
                  description="Receive notifications about system events and updates"
                />

                <ToggleSwitch
                  checked={formData.metadata?.notifications?.email ?? true}
                  onChange={(checked) => updateFormData('metadata.notifications.email', checked)}
                  label="Email Notifications"
                  description="Receive important notifications via email"
                />

                <ToggleSwitch
                  checked={formData.metadata?.notifications?.security ?? true}
                  onChange={(checked) => updateFormData('metadata.notifications.security', checked)}
                  label="Security Alerts"
                  description="Get notified about security-related events"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}