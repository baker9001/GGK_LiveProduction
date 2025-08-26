///home/project/src/app/entity-module/profile/page.tsx

import React, { useState, useEffect } from 'react';
import { 
  User, Shield, Calendar, MapPin, Clock, Activity, 
  Edit2, Save, X, Camera, Mail, Phone, Building,
  Key, AlertCircle, CheckCircle, LogIn, Hash, Users,
  Lock, Globe, Briefcase
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { getAuthenticatedUser } from '@/lib/auth';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { toast } from 'react-hot-toast';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  adminLevel?: string;
  companyName?: string;
  companyId?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  department?: string;
  position?: string;
  bio?: string;
  location?: string;
  timezone?: string;
  language?: string;
}

interface SessionData {
  totalSessions: number;
  currentMonth: number;
  lastLocation?: string;
  lastDevice?: string;
}

export default function ProfilePage() {
  const { user } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<SessionData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  useEffect(() => {
    fetchUserProfile();
    fetchSessionData();
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      const authenticatedUser = getAuthenticatedUser();
      const userId = authenticatedUser?.id || user?.id;

      if (!userId) {
        toast.error('No authenticated user found');
        return;
      }

      // Fetch user base data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Fetch entity user data for admin users
      let adminData = null;
      let companyData = null;
      
      const { data: entityUser } = await supabase
        .from('entity_users')
        .select(`
          *,
          companies:company_id (
            id,
            name,
            code
          )
        `)
        .eq('user_id', userId)
        .single();

      if (entityUser) {
        adminData = entityUser;
        companyData = entityUser.companies;
      }

      // Construct profile object
      const profileData: UserProfile = {
        id: userData.id,
        email: userData.email,
        name: adminData?.name || userData.raw_user_meta_data?.name || userData.email.split('@')[0],
        phone: userData.raw_user_meta_data?.phone || adminData?.phone,
        role: userData.user_type || 'user',
        adminLevel: adminData?.admin_level,
        companyName: companyData?.name,
        companyId: companyData?.id,
        avatar: userData.raw_user_meta_data?.avatar_url || adminData?.avatar,
        isActive: userData.is_active,
        createdAt: userData.created_at,
        lastLoginAt: userData.last_login_at,
        department: userData.raw_user_meta_data?.department,
        position: userData.raw_user_meta_data?.position,
        bio: userData.raw_user_meta_data?.bio,
        location: userData.raw_user_meta_data?.location,
        timezone: userData.raw_user_meta_data?.timezone || 'UTC',
        language: userData.raw_user_meta_data?.language || 'en'
      };

      setProfile(profileData);
      setEditForm(profileData);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSessionData = async () => {
    try {
      const authenticatedUser = getAuthenticatedUser();
      const userId = authenticatedUser?.id || user?.id;

      if (!userId) return;

      // Fetch session/audit data
      const { data: auditLogs, error } = await supabase
        .from('admin_audit_log')
        .select('*')
        .eq('actor_id', userId)
        .eq('action_type', 'login')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && auditLogs) {
        const currentMonth = new Date();
        const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        
        const monthSessions = auditLogs.filter(log => 
          new Date(log.created_at) >= monthStart
        );

        const lastSession = auditLogs[0];

        setSessions({
          totalSessions: auditLogs.length,
          currentMonth: monthSessions.length,
          lastLocation: lastSession?.metadata?.location || 'Unknown',
          lastDevice: lastSession?.metadata?.device || 'Unknown'
        });
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      setEditForm(profile || {});
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      const authenticatedUser = getAuthenticatedUser();
      const userId = authenticatedUser?.id || user?.id;

      if (!userId) {
        toast.error('No authenticated user found');
        return;
      }

      // Update user table
      const { error: userError } = await supabase
        .from('users')
        .update({
          raw_user_meta_data: {
            ...profile,
            name: editForm.name,
            phone: editForm.phone,
            avatar_url: editForm.avatar,
            department: editForm.department,
            position: editForm.position,
            bio: editForm.bio,
            location: editForm.location,
            timezone: editForm.timezone,
            language: editForm.language
          }
        })
        .eq('id', userId);

      if (userError) throw userError;

      // Update entity_users if admin
      if (profile?.adminLevel) {
        const { error: entityError } = await supabase
          .from('entity_users')
          .update({
            name: editForm.name,
            phone: editForm.phone,
            avatar: editForm.avatar
          })
          .eq('user_id', userId);

        if (entityError) throw entityError;
      }

      await fetchUserProfile();
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.new.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      setIsSaving(true);
      
      // Update password via Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.new
      });

      if (error) throw error;

      toast.success('Password updated successfully');
      setShowPasswordChange(false);
      setPasswordForm({ current: '', new: '', confirm: '' });
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = (path: string | null) => {
    setEditForm(prev => ({ ...prev, avatar: path || undefined }));
  };

  const getAvatarUrl = (path?: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(path);
    
    return data?.publicUrl || null;
  };

  const getAdminLevelBadge = (level?: string) => {
    const badges: Record<string, { color: string; icon: JSX.Element; label: string }> = {
      entity_admin: { 
        color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
        icon: <Shield className="w-4 h-4" />,
        label: 'Entity Admin'
      },
      sub_entity_admin: { 
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        icon: <Shield className="w-4 h-4" />,
        label: 'Sub-Entity Admin'
      },
      school_admin: { 
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        icon: <Building className="w-4 h-4" />,
        label: 'School Admin'
      },
      branch_admin: { 
        color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
        icon: <MapPin className="w-4 h-4" />,
        label: 'Branch Admin'
      }
    };

    return badges[level || ''] || null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Failed to load profile</p>
        </div>
      </div>
    );
  }

  const adminBadge = getAdminLevelBadge(profile.adminLevel);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 h-32"></div>
          <div className="px-8 pb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-end -mt-16 space-y-4 sm:space-y-0 sm:space-x-6">
              {/* Avatar */}
              <div className="relative">
                {isEditing ? (
                  <div className="w-32 h-32">
                    <ImageUpload
                      id="avatar-upload"
                      bucket="avatars"
                      value={editForm.avatar}
                      publicUrl={getAvatarUrl(editForm.avatar)}
                      onChange={handleAvatarChange}
                      className="w-full h-full"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-xl bg-white dark:bg-gray-700 shadow-lg border-4 border-white dark:border-gray-800 overflow-hidden">
                    {profile.avatar ? (
                      <img
                        src={getAvatarUrl(profile.avatar) || ''}
                        alt={profile.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-white text-4xl font-bold">
                          {profile.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        className="text-2xl font-bold bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 mb-2"
                      />
                    ) : (
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {profile.name}
                      </h1>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {profile.email}
                      </div>
                      {profile.companyName && (
                        <div className="flex items-center gap-1">
                          <Building className="w-4 h-4" />
                          {profile.companyName}
                        </div>
                      )}
                      {adminBadge && (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${adminBadge.color}`}>
                          {adminBadge.icon}
                          <span className="text-xs font-medium">{adminBadge.label}</span>
                        </div>
                      )}
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                        profile.isActive 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {profile.isActive ? <CheckCircle className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        <span className="text-xs font-medium">{profile.isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Edit/Save Button */}
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleSaveProfile}
                          disabled={isSaving}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                        >
                          {isSaving ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          Save
                        </button>
                        <button
                          onClick={handleEditToggle}
                          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={handleEditToggle}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit Profile
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Basic Information */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Basic Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Full Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full mt-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2"
                    />
                  ) : (
                    <p className="font-medium text-gray-900 dark:text-white">{profile.name}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Email Address</label>
                  <p className="font-medium text-gray-900 dark:text-white">{profile.email}</p>
                </div>

                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Phone Number</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editForm.phone || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Add phone number"
                      className="w-full mt-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2"
                    />
                  ) : (
                    <p className="font-medium text-gray-900 dark:text-white">
                      {profile.phone || <span className="text-gray-400">Not provided</span>}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Role</label>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">
                    {profile.role.replace('_', ' ')}
                  </p>
                </div>

                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Department</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.department || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, department: e.target.value }))}
                      placeholder="Add department"
                      className="w-full mt-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2"
                    />
                  ) : (
                    <p className="font-medium text-gray-900 dark:text-white">
                      {profile.department || <span className="text-gray-400">Not specified</span>}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Position</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.position || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, position: e.target.value }))}
                      placeholder="Add position"
                      className="w-full mt-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2"
                    />
                  ) : (
                    <p className="font-medium text-gray-900 dark:text-white">
                      {profile.position || <span className="text-gray-400">Not specified</span>}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Location</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.location || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Add location"
                      className="w-full mt-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2"
                    />
                  ) : (
                    <p className="font-medium text-gray-900 dark:text-white">
                      {profile.location || <span className="text-gray-400">Not specified</span>}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Timezone</label>
                  {isEditing ? (
                    <select
                      value={editForm.timezone || 'UTC'}
                      onChange={(e) => setEditForm(prev => ({ ...prev, timezone: e.target.value }))}
                      className="w-full mt-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="Europe/London">London</option>
                      <option value="Europe/Paris">Paris</option>
                      <option value="Asia/Tokyo">Tokyo</option>
                      <option value="Asia/Shanghai">Shanghai</option>
                    </select>
                  ) : (
                    <p className="font-medium text-gray-900 dark:text-white">{profile.timezone}</p>
                  )}
                </div>
              </div>

              {/* Bio Section */}
              <div className="mt-4">
                <label className="text-sm text-gray-500 dark:text-gray-400">Bio</label>
                {isEditing ? (
                  <textarea
                    value={editForm.bio || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell us about yourself"
                    rows={4}
                    className="w-full mt-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2"
                  />
                ) : (
                  <p className="font-medium text-gray-900 dark:text-white mt-1">
                    {profile.bio || <span className="text-gray-400">No bio added</span>}
                  </p>
                )}
              </div>
            </div>

            {/* Security Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Security Settings
                </h2>
                <button
                  onClick={() => setShowPasswordChange(!showPasswordChange)}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Change Password
                </button>
              </div>

              {showPasswordChange ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Current Password</label>
                    <input
                      type="password"
                      value={passwordForm.current}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, current: e.target.value }))}
                      className="w-full mt-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">New Password</label>
                    <input
                      type="password"
                      value={passwordForm.new}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, new: e.target.value }))}
                      className="w-full mt-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
                      className="w-full mt-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handlePasswordChange}
                      disabled={isSaving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSaving ? 'Updating...' : 'Update Password'}
                    </button>
                    <button
                      onClick={() => {
                        setShowPasswordChange(false);
                        setPasswordForm({ current: '', new: '', confirm: '' });
                      }}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-600 dark:text-gray-400">Password</span>
                    <span className="font-medium">••••••••</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Last updated: {profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleDateString() : 'Never'}
                  </p>
                  
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
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
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Account Activity */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Account Activity
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Last Login</label>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {profile.lastLoginAt 
                      ? new Date(profile.lastLoginAt).toLocaleString()
                      : 'Never'}
                  </p>
                  {sessions?.lastLocation && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Location: {sessions.lastLocation}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Account Created</label>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {new Date(profile.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Total Sessions</label>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {sessions?.totalSessions || 0}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    This month: {sessions?.currentMonth || 0}
                  </p>
                </div>

                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Status</label>
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${
                    profile.isActive 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                  }`}>
                    {profile.isActive ? <CheckCircle className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    <span className="text-xs font-medium">{profile.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            {profile.adminLevel && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Admin Information
                </h2>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Admin Level</label>
                    <p className="font-medium text-gray-900 dark:text-white capitalize">
                      {profile.adminLevel?.replace(/_/g, ' ')}
                    </p>
                  </div>
                  
                  {profile.companyName && (
                    <div>
                      <label className="text-sm text-gray-500 dark:text-gray-400">Organization</label>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {profile.companyName}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Permissions</label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Based on your admin level, you have access to manage organization structure, users, and settings.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}