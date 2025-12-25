/**
 * File: /src/app/teachers-module/profile/page.tsx
 * 
 * Teacher Profile Management Page
 * Allows teachers to view and edit their personal and professional information
 * 
 * Dependencies:
 *   - @/lib/supabase
 *   - @/contexts/UserContext
 *   - @/components/shared/* (UI components)
 *   - External: react, @tanstack/react-query, lucide-react, zod
 * 
 * Features:
 *   - View/Edit mode toggle
 *   - Real-time data fetching with React Query
 *   - Form validation with Zod
 *   - Dual table updates (users + teachers)
 *   - Professional information management
 *   - Responsive design with green theme
 * 
 * Database Tables:
 *   - users (authentication and basic info)
 *   - teachers (professional information)
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  User, 
  Mail, 
  Phone, 
  GraduationCap, 
  BookOpen, 
  Calendar, 
  Edit3, 
  Save, 
  X, 
  Eye, 
  EyeOff,
  Award,
  Clock,
  Building2,
  MapPin,
  Briefcase,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  School,
  Users
} from 'lucide-react';
import { z } from 'zod';
import { supabase } from '../../../lib/supabase';
import { useUser } from '../../../contexts/UserContext';
import { Button } from '../../../components/shared/Button';
import { FormField, Input, Textarea, Select } from '../../../components/shared/FormField';
import { PhoneInput } from '../../../components/shared/PhoneInput';
import { SearchableMultiSelect } from '../../../components/shared/SearchableMultiSelect';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { toast } from '../../../components/shared/Toast';
import { cn } from '../../../lib/utils';
import { SessionPreferencesCard } from '../../../components/shared/SessionPreferencesCard';

// ===== TYPE DEFINITIONS =====
interface TeacherProfileData {
  // From users table
  id: string;
  email: string;
  user_type: string;
  is_active: boolean;
  created_at: string;
  last_login_at?: string;
  raw_user_meta_data?: {
    name?: string;
    [key: string]: any;
  };
  
  // From teachers table
  teacher_id: string;
  teacher_code: string;
  specialization?: string[];
  qualification?: string;
  experience_years?: number;
  bio?: string;
  phone?: string;
  hire_date?: string;
  status: 'active' | 'on_leave' | 'inactive';
  company_id: string;
  school_id?: string;
  branch_id?: string;
  department_id?: string;
  
  // Related data
  company_name?: string;
  school_name?: string;
  branch_name?: string;
  department_name?: string;
}

interface EditableProfileData {
  name: string;
  email: string;
  phone: string;
  specialization: string[];
  qualification: string;
  experience_years: number;
  bio: string;
}

// ===== VALIDATION SCHEMA =====
const profileUpdateSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  email: z.string()
    .email('Please enter a valid email address')
    .transform(email => email.toLowerCase().trim()),
  phone: z.string()
    .optional()
    .refine(val => !val || val.length >= 10, 'Phone number must be at least 10 digits'),
  specialization: z.array(z.string()).optional(),
  qualification: z.string()
    .max(200, 'Qualification must not exceed 200 characters')
    .optional(),
  experience_years: z.number()
    .min(0, 'Experience cannot be negative')
    .max(50, 'Experience cannot exceed 50 years')
    .optional(),
  bio: z.string()
    .max(1000, 'Bio must not exceed 1000 characters')
    .optional()
});

// ===== PREDEFINED OPTIONS =====
const SPECIALIZATION_OPTIONS = [
  { value: 'mathematics', label: 'Mathematics' },
  { value: 'english', label: 'English Language' },
  { value: 'science', label: 'Science' },
  { value: 'physics', label: 'Physics' },
  { value: 'chemistry', label: 'Chemistry' },
  { value: 'biology', label: 'Biology' },
  { value: 'history', label: 'History' },
  { value: 'geography', label: 'Geography' },
  { value: 'economics', label: 'Economics' },
  { value: 'business_studies', label: 'Business Studies' },
  { value: 'computer_science', label: 'Computer Science' },
  { value: 'art', label: 'Art & Design' },
  { value: 'music', label: 'Music' },
  { value: 'physical_education', label: 'Physical Education' },
  { value: 'foreign_languages', label: 'Foreign Languages' },
  { value: 'arabic', label: 'Arabic' },
  { value: 'islamic_studies', label: 'Islamic Studies' },
  { value: 'social_studies', label: 'Social Studies' }
];

// ===== MAIN COMPONENT =====
export default function TeacherProfilePage() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  
  // State management
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<EditableProfileData>({
    name: '',
    email: '',
    phone: '',
    specialization: [],
    qualification: '',
    experience_years: 0,
    bio: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Access control - ensure only teachers can access
  useEffect(() => {
    if (user && user.role !== 'TEACHER') {
      toast.error('Access denied. This page is only available to teachers.');
      window.location.href = '/app/dashboard';
      return;
    }
  }, [user]);

  // Fetch teacher profile data
  const { 
    data: profileData, 
    isLoading, 
    error,
    refetch 
  } = useQuery<TeacherProfileData>(
    ['teacher-profile', user?.id],
    async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Fetch combined data from users and teachers tables
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select(`
          id,
          teacher_code,
          specialization,
          qualification,
          experience_years,
          bio,
          phone,
          hire_date,
          status,
          company_id,
          school_id,
          branch_id,
          department_id,
          created_at,
          updated_at,
          users!teachers_user_id_fkey (
            id,
            email,
            user_type,
            is_active,
            created_at,
            last_login_at,
            raw_user_meta_data
          ),
          companies!fk_teachers_company_id(name),
          schools!teachers_school_id_fkey(name),
          branches!teachers_branch_id_fkey(name),
          departments!teachers_department_id_fkey(name)
            name
          ),
          branches (
            name
          ),
          departments (
            name
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (teacherError) {
        throw new Error(`Failed to fetch teacher profile: ${teacherError.message}`);
      }

      if (!teacherData) {
        throw new Error('Teacher profile not found');
      }

      // Transform the data to match our interface
      return {
        id: teacherData.users.id,
        email: teacherData.users.email,
        user_type: teacherData.users.user_type,
        is_active: teacherData.users.is_active,
        created_at: teacherData.users.created_at,
        last_login_at: teacherData.users.last_login_at,
        raw_user_meta_data: teacherData.users.raw_user_meta_data,
        teacher_id: teacherData.id,
        teacher_code: teacherData.teacher_code,
        specialization: teacherData.specialization || [],
        qualification: teacherData.qualification,
        experience_years: teacherData.experience_years,
        bio: teacherData.bio,
        phone: teacherData.phone,
        hire_date: teacherData.hire_date,
        status: teacherData.status,
        company_id: teacherData.company_id,
        school_id: teacherData.school_id,
        branch_id: teacherData.branch_id,
        department_id: teacherData.department_id,
        company_name: teacherData.companies?.name,
        school_name: teacherData.schools?.name,
        branch_name: teacherData.branches?.name,
        department_name: teacherData.departments?.name
      } as TeacherProfileData;
    },
    {
      enabled: !!user?.id && user?.role === 'TEACHER',
      staleTime: 2 * 60 * 1000,
      retry: 2
    }
  );

  // Initialize form data when profile data is loaded
  useEffect(() => {
    if (profileData && !isEditing) {
      setFormData({
        name: profileData.raw_user_meta_data?.name || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
        specialization: profileData.specialization || [],
        qualification: profileData.qualification || '',
        experience_years: profileData.experience_years || 0,
        bio: profileData.bio || ''
      });
    }
  }, [profileData, isEditing]);

  // Update profile mutation
  const updateProfileMutation = useMutation(
    async (data: EditableProfileData) => {
      if (!user?.id || !profileData) {
        throw new Error('User not authenticated or profile not loaded');
      }

      // Validate the data
      const validatedData = profileUpdateSchema.parse(data);

      // Update users table
      const { error: userError } = await supabase
        .from('users')
        .update({
          email: validatedData.email,
          raw_user_meta_data: {
            ...profileData.raw_user_meta_data,
            name: validatedData.name
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (userError) {
        throw new Error(`Failed to update user data: ${userError.message}`);
      }

      // Update teachers table
      const { error: teacherError } = await supabase
        .from('teachers')
        .update({
          phone: validatedData.phone || null,
          specialization: validatedData.specialization || [],
          qualification: validatedData.qualification || null,
          experience_years: validatedData.experience_years || null,
          bio: validatedData.bio || null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (teacherError) {
        throw new Error(`Failed to update teacher data: ${teacherError.message}`);
      }

      return validatedData;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['teacher-profile', user?.id]);
        setIsEditing(false);
        setFormErrors({});
        toast.success('Profile updated successfully!');
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
          toast.error('Please fix the validation errors');
        } else {
          console.error('Profile update error:', error);
          setFormErrors({ form: error instanceof Error ? error.message : 'Failed to update profile' });
          toast.error('Failed to update profile. Please try again.');
        }
      }
    }
  );

  // Password change mutation
  const changePasswordMutation = useMutation(
    async ({ newPassword }: { newPassword: string }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Import bcrypt for password hashing
      const bcrypt = await import('bcryptjs/dist/bcrypt.min');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      const { error } = await supabase
        .from('users')
        .update({
          password_hash: hashedPassword,
          password_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        throw new Error(`Failed to update password: ${error.message}`);
      }
    },
    {
      onSuccess: () => {
        setNewPassword('');
        setConfirmPassword('');
        setIsChangingPassword(false);
        toast.success('Password changed successfully!');
      },
      onError: (error) => {
        console.error('Password change error:', error);
        toast.error('Failed to change password. Please try again.');
      }
    }
  );

  // Form handlers
  const handleFieldChange = (field: keyof EditableProfileData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

  const handleCancel = () => {
    if (profileData) {
      setFormData({
        name: profileData.raw_user_meta_data?.name || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
        specialization: profileData.specialization || [],
        qualification: profileData.qualification || '',
        experience_years: profileData.experience_years || 0,
        bio: profileData.bio || ''
      });
    }
    setIsEditing(false);
    setFormErrors({});
  };

  const handlePasswordChange = () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in both password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    changePasswordMutation.mutate({ newPassword });
  };

  // Calculate experience badge color
  const getExperienceBadgeColor = (years?: number) => {
    if (!years || years === 0) return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    if (years < 2) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    if (years < 5) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    if (years < 10) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#8CC63F] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Loading Profile
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Fetching your teacher profile information...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-6">
          <div className="flex items-center">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 mr-3" />
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-200">
                Error Loading Profile
              </h3>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {error instanceof Error ? error.message : 'Failed to load profile data. Please try again.'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="mt-3"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-6">
          <div className="flex items-center">
            <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mr-3" />
            <div>
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                Profile Not Found
              </h3>
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                Your teacher profile could not be found. Please contact your administrator.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#8CC63F]/20 to-[#7AB635]/20 rounded-full flex items-center justify-center">
              <GraduationCap className="w-8 h-8 text-[#8CC63F]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Teacher Profile
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your personal and professional information
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button
                onClick={() => setIsEditing(true)}
                leftIcon={<Edit3 className="w-4 h-4" />}
                className="bg-[#8CC63F] hover:bg-[#7AB635]"
              >
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  leftIcon={<X className="w-4 h-4" />}
                  disabled={updateProfileMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  leftIcon={<Save className="w-4 h-4" />}
                  loading={updateProfileMutation.isPending}
                  className="bg-[#8CC63F] hover:bg-[#7AB635]"
                >
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Profile Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-[#8CC63F]/10 to-[#7AB635]/10 dark:from-[#8CC63F]/20 dark:to-[#7AB635]/20 border border-[#8CC63F]/30 dark:border-[#8CC63F]/40 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Award className="h-6 w-6 text-[#8CC63F]" />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Experience
                </p>
                <p className="text-lg font-bold text-[#7AB635] dark:text-[#8CC63F]">
                  {profileData.experience_years || 0} years
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Specializations
                </p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {profileData.specialization?.length || 0} subjects
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Hire Date
                </p>
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {profileData.hire_date 
                    ? new Date(profileData.hire_date).toLocaleDateString()
                    : 'Not set'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Information Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-6 pb-2 border-b border-gray-200 dark:border-gray-700">
          <User className="h-5 w-5 text-[#8CC63F]" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Personal Information
          </h2>
        </div>

        {formErrors.form && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mr-2" />
              <span className="text-sm text-red-700 dark:text-red-300">{formErrors.form}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name */}
          <FormField
            id="name"
            label="Full Name"
            required
            error={formErrors.name}
          >
            {isEditing ? (
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="Enter your full name"
                leftIcon={<User className="h-4 w-4 text-gray-400" />}
                className="focus:ring-[#8CC63F] focus:border-[#8CC63F]"
              />
            ) : (
              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900 dark:text-white">
                  {profileData.raw_user_meta_data?.name || 'Not set'}
                </span>
              </div>
            )}
          </FormField>

          {/* Email */}
          <FormField
            id="email"
            label="Email Address"
            required
            error={formErrors.email}
          >
            {isEditing ? (
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                placeholder="Enter your email address"
                leftIcon={<Mail className="h-4 w-4 text-gray-400" />}
                className="focus:ring-[#8CC63F] focus:border-[#8CC63F]"
              />
            ) : (
              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900 dark:text-white">
                  {profileData.email}
                </span>
              </div>
            )}
          </FormField>

          {/* Phone */}
          <FormField
            id="phone"
            label="Phone Number"
            error={formErrors.phone}
          >
            {isEditing ? (
              <PhoneInput
                value={formData.phone}
                onChange={(value) => handleFieldChange('phone', value)}
                placeholder="Enter your phone number"
                disabled={updateProfileMutation.isPending}
              />
            ) : (
              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-900 dark:text-white">
                  {profileData.phone || 'Not set'}
                </span>
              </div>
            )}
          </FormField>

          {/* Teacher Code (Read-only) */}
          <FormField
            id="teacher_code"
            label="Teacher Code"
          >
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <Briefcase className="h-4 w-4 text-gray-400" />
              <span className="text-gray-900 dark:text-white font-mono">
                {profileData.teacher_code}
              </span>
            </div>
          </FormField>
        </div>
      </div>

      {/* Professional Information Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-6 pb-2 border-b border-gray-200 dark:border-gray-700">
          <BookOpen className="h-5 w-5 text-[#8CC63F]" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Professional Information
          </h2>
        </div>

        <div className="space-y-6">
          {/* Specialization */}
          <FormField
            id="specialization"
            label="Subject Specializations"
            error={formErrors.specialization}
          >
            {isEditing ? (
              <SearchableMultiSelect
                label=""
                options={SPECIALIZATION_OPTIONS}
                selectedValues={formData.specialization}
                onChange={(values) => handleFieldChange('specialization', values)}
                placeholder="Select your subject specializations..."
                className="green-theme"
              />
            ) : (
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                {profileData.specialization && profileData.specialization.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profileData.specialization.map((spec, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#8CC63F]/15 text-[#5A8A2C] dark:bg-[#8CC63F]/25 dark:text-[#8CC63F]"
                      >
                        {SPECIALIZATION_OPTIONS.find(opt => opt.value === spec)?.label || spec}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400 italic">
                    No specializations set
                  </span>
                )}
              </div>
            )}
          </FormField>

          {/* Qualification and Experience */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              id="qualification"
              label="Highest Qualification"
              error={formErrors.qualification}
            >
              {isEditing ? (
                <Input
                  id="qualification"
                  value={formData.qualification}
                  onChange={(e) => handleFieldChange('qualification', e.target.value)}
                  placeholder="e.g., M.Sc. Mathematics, B.Ed."
                  leftIcon={<Award className="h-4 w-4 text-gray-400" />}
                  className="focus:ring-[#8CC63F] focus:border-[#8CC63F]"
                />
              ) : (
                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <Award className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">
                    {profileData.qualification || 'Not set'}
                  </span>
                </div>
              )}
            </FormField>

            <FormField
              id="experience_years"
              label="Years of Experience"
              error={formErrors.experience_years}
            >
              {isEditing ? (
                <Input
                  id="experience_years"
                  type="number"
                  min="0"
                  max="50"
                  value={formData.experience_years.toString()}
                  onChange={(e) => handleFieldChange('experience_years', parseInt(e.target.value) || 0)}
                  placeholder="Enter years of experience"
                  leftIcon={<Clock className="h-4 w-4 text-gray-400" />}
                  className="focus:ring-[#8CC63F] focus:border-[#8CC63F]"
                />
              ) : (
                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className={cn(
                    "px-3 py-1 rounded-full text-sm font-medium",
                    getExperienceBadgeColor(profileData.experience_years)
                  )}>
                    {profileData.experience_years || 0} years
                  </span>
                </div>
              )}
            </FormField>
          </div>

          {/* Bio */}
          <FormField
            id="bio"
            label="Professional Bio"
            error={formErrors.bio}
          >
            {isEditing ? (
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleFieldChange('bio', e.target.value)}
                placeholder="Tell us about your teaching philosophy, interests, and experience..."
                rows={4}
                maxLength={1000}
                className="focus:ring-[#8CC63F] focus:border-[#8CC63F]"
              />
            ) : (
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg min-h-[100px]">
                {profileData.bio ? (
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                    {profileData.bio}
                  </p>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400 italic">
                    No bio provided
                  </span>
                )}
              </div>
            )}
          </FormField>
        </div>
      </div>

      {/* Assignment Information Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-6 pb-2 border-b border-gray-200 dark:border-gray-700">
          <Building2 className="h-5 w-5 text-[#8CC63F]" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Assignment Information
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Company */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Organization
            </label>
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <Building2 className="h-4 w-4 text-gray-400" />
              <span className="text-gray-900 dark:text-white">
                {profileData.company_name || 'Not assigned'}
              </span>
            </div>
          </div>

          {/* School */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              School
            </label>
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <School className="h-4 w-4 text-gray-400" />
              <span className="text-gray-900 dark:text-white">
                {profileData.school_name || 'Not assigned'}
              </span>
            </div>
          </div>

          {/* Branch */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Branch
            </label>
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span className="text-gray-900 dark:text-white">
                {profileData.branch_name || 'Not assigned'}
              </span>
            </div>
          </div>

          {/* Department */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Department
            </label>
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <Users className="h-4 w-4 text-gray-400" />
              <span className="text-gray-900 dark:text-white">
                {profileData.department_name || 'Not assigned'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Account Security Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-6 pb-2 border-b border-gray-200 dark:border-gray-700">
          <Eye className="h-5 w-5 text-[#8CC63F]" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Account Security
          </h2>
        </div>

        <div className="space-y-6">
          {/* Account Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Account Status
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Your account access level
              </p>
            </div>
            <StatusBadge 
              status={profileData.is_active ? 'active' : 'inactive'} 
              size="sm"
            />
          </div>

          {/* Password Change Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Change your account password
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsChangingPassword(!isChangingPassword)}
                className="border-[#8CC63F] text-[#8CC63F] hover:bg-[#8CC63F]/10"
              >
                {isChangingPassword ? 'Cancel' : 'Change Password'}
              </Button>
            </div>

            {isChangingPassword && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    id="new_password"
                    label="New Password"
                    required
                  >
                    <div className="relative">
                      <Input
                        id="new_password"
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        leftIcon={<Eye className="h-4 w-4 text-gray-400" />}
                        className="focus:ring-[#8CC63F] focus:border-[#8CC63F]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </FormField>

                  <FormField
                    id="confirm_password"
                    label="Confirm Password"
                    required
                  >
                    <Input
                      id="confirm_password"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      leftIcon={<Eye className="h-4 w-4 text-gray-400" />}
                      className="focus:ring-[#8CC63F] focus:border-[#8CC63F]"
                    />
                  </FormField>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handlePasswordChange}
                    loading={changePasswordMutation.isPending}
                    className="bg-[#8CC63F] hover:bg-[#7AB635]"
                  >
                    Update Password
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Last Login */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Last Login
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                When you last accessed the system
              </p>
            </div>
            <span className="text-sm text-gray-900 dark:text-white">
              {profileData.last_login_at 
                ? new Date(profileData.last_login_at).toLocaleString()
                : 'Never'
              }
            </span>
          </div>
        </div>
      </div>

      {/* Session Preferences Section */}
      <SessionPreferencesCard />

      {/* Account Information Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-6 pb-2 border-b border-gray-200 dark:border-gray-700">
          <FileText className="h-5 w-5 text-[#8CC63F]" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Account Information
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Account Created
            </label>
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-gray-900 dark:text-white">
                {new Date(profileData.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Employment Status
            </label>
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <Briefcase className="h-4 w-4 text-gray-400" />
              <StatusBadge status={profileData.status} size="sm" />
            </div>
          </div>
        </div>
      </div>

      {/* Development Status */}
      <div className="bg-[#8CC63F]/10 dark:bg-[#8CC63F]/20 border border-[#8CC63F]/30 dark:border-[#8CC63F]/40 rounded-lg p-6">
        <div className="flex items-center gap-2 text-[#5A8A2C] dark:text-[#8CC63F] mb-3">
          <CheckCircle className="w-5 h-5" />
          <span className="font-semibold">Teacher Profile Management</span>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
          Complete teacher profile management system with secure data handling and professional information tracking.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-[#8CC63F]" />
            <span className="text-gray-700 dark:text-gray-300">Personal Information Management ✓</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-[#8CC63F]" />
            <span className="text-gray-700 dark:text-gray-300">Professional Data Tracking ✓</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-[#8CC63F]" />
            <span className="text-gray-700 dark:text-gray-300">Secure Password Management ✓</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-[#8CC63F]" />
            <span className="text-gray-700 dark:text-gray-300">Assignment Information Display ✓</span>
          </div>
        </div>
      </div>
    </div>
  );
}