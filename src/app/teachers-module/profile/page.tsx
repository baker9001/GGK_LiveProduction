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
import { FormField, Input, Textarea } from '../../../components/shared/FormField';
import { PhoneInput } from '../../../components/shared/PhoneInput';
import { SearchableMultiSelect } from '../../../components/shared/SearchableMultiSelect';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { toast } from '../../../components/shared/Toast';
import { cn } from '../../../lib/utils';
import { PageHeader } from '../../../components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/shared/Card';
import { Badge } from '../../../components/shared/Badge';

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

  const headerActions = !isEditing ? (
    <Button
      onClick={() => setIsEditing(true)}
      leftIcon={<Edit3 className="w-4 h-4" />}
    >
      Edit profile
    </Button>
  ) : (
    <div className="flex items-center gap-12">
      <Button
        variant="secondary"
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
      >
        Save changes
      </Button>
    </div>
  );

  // Calculate experience badge color
  const getExperienceBadgeColor = (years?: number) => {
    if (!years || years === 0) return 'bg-ggk-neutral-100 text-ggk-neutral-600 dark:bg-ggk-neutral-800 dark:text-ggk-neutral-300';
    if (years < 2) return 'bg-ggk-primary-100 text-ggk-primary-700 dark:bg-ggk-primary-900/40 dark:text-ggk-primary-200';
    if (years < 5) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200';
    if (years < 10) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200';
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-ggk-neutral-50 dark:bg-ggk-neutral-950 flex items-center justify-center px-20">
        <Card variant="elevated" className="max-w-md text-center">
          <CardContent className="space-y-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-ggk-primary-100 text-ggk-primary-600">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-ggk-neutral-900 dark:text-ggk-neutral-50">Loading profile</h2>
              <p className="text-sm text-ggk-neutral-600 dark:text-ggk-neutral-400">
                Fetching your teacher profile information...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-20 py-20">
        <Card variant="outlined" className="border-red-200 bg-red-50/80 text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
          <CardContent className="space-y-6">
            <div className="flex items-center gap-8">
              <AlertCircle className="h-6 w-6" />
              <div>
                <h3 className="text-base font-semibold">Error loading profile</h3>
                <p className="mt-2 text-sm leading-relaxed">
                  {error instanceof Error ? error.message : 'Failed to load profile data. Please try again.'}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="mx-auto max-w-3xl px-20 py-20">
        <Card variant="outlined" className="border-amber-200 bg-amber-50/80 text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          <CardContent className="space-y-4">
            <div className="flex items-center gap-8">
              <AlertCircle className="h-6 w-6" />
              <div>
                <h3 className="text-base font-semibold">Profile not found</h3>
                <p className="mt-2 text-sm leading-relaxed">
                  Your teacher profile could not be found. Please contact your administrator.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-20 py-20 space-y-24">
      <PageHeader
        title="Teacher profile"
        subtitle="Manage your personal details, professional credentials, and security settings with the refreshed GGK design system."
        actions={headerActions}
      />

      <Card variant="elevated">
        <CardContent className="space-y-16">
          <div className="flex flex-col gap-12 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ggk-primary-100 text-ggk-primary-600">
                <GraduationCap className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-ggk-neutral-900 dark:text-ggk-neutral-50">
                  {profileData.raw_user_meta_data?.name || 'Teacher profile'}
                </h2>
                <p className="text-sm text-ggk-neutral-600 dark:text-ggk-neutral-400">
                  {profileData.email}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-8">
              <Badge variant="primary" size="sm">
                {profileData.status === 'active' ? 'Active' : profileData.status.replace('_', ' ')}
              </Badge>
              <Badge variant="outline" size="sm">
                Joined {new Date(profileData.created_at).toLocaleDateString()}
              </Badge>
            </div>
          </div>

          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-ggk-xl border border-ggk-primary-200/70 bg-ggk-primary-50/80 p-16 shadow-ggk-sm dark:border-ggk-primary-800/60 dark:bg-ggk-primary-900/30">
              <div className="flex items-center gap-8">
                <Award className="h-6 w-6 text-ggk-primary-600" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ggk-neutral-600">Experience</p>
                  <p className="mt-2 text-lg font-semibold text-ggk-primary-700 dark:text-ggk-primary-200">
                    {profileData.experience_years || 0} years
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-ggk-xl border border-ggk-neutral-200/70 bg-white/80 p-16 shadow-ggk-sm dark:border-ggk-neutral-800/70 dark:bg-ggk-neutral-900/50">
              <div className="flex items-center gap-8">
                <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ggk-neutral-600">Specialisations</p>
                  <p className="mt-2 text-lg font-semibold text-blue-600 dark:text-blue-300">
                    {profileData.specialization?.length || 0} subjects
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-ggk-xl border border-ggk-neutral-200/70 bg-white/80 p-16 shadow-ggk-sm dark:border-ggk-neutral-800/70 dark:bg-ggk-neutral-900/50">
              <div className="flex items-center gap-8">
                <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ggk-neutral-600">Hire date</p>
                  <p className="mt-2 text-lg font-semibold text-purple-600 dark:text-purple-300">
                    {profileData.hire_date
                      ? new Date(profileData.hire_date).toLocaleDateString()
                      : 'Not set'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information Section */}
      <Card variant="outlined">
        <CardHeader accent>
          <div className="flex items-center gap-8">
            <User className="h-5 w-5 text-ggk-primary-600" />
            <div>
              <CardTitle className="text-lg">Personal information</CardTitle>
              <CardDescription className="mt-4">
                Update your contact details and basic information.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-16">
          {formErrors.form && (
            <div className="rounded-ggk-xl border border-red-200 bg-red-50/80 p-12 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
              {formErrors.form}
            </div>
          )}

          <div className="grid grid-cols-1 gap-16 md:grid-cols-2">
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
                leftIcon={<User className="h-4 w-4 text-ggk-neutral-400" />}
                className="focus:ring-ggk-primary-500 focus:border-ggk-primary-500"
              />
            ) : (
              <div className="flex items-center gap-2 rounded-ggk-lg bg-ggk-neutral-50 p-12 dark:bg-ggk-neutral-900/50">
                <User className="h-4 w-4 text-ggk-neutral-400" />
                <span className="text-ggk-neutral-900 dark:text-ggk-neutral-50">
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
                leftIcon={<Mail className="h-4 w-4 text-ggk-neutral-400" />}
                className="focus:ring-ggk-primary-500 focus:border-ggk-primary-500"
              />
            ) : (
              <div className="flex items-center gap-2 rounded-ggk-lg bg-ggk-neutral-50 p-12 dark:bg-ggk-neutral-900/50">
                <Mail className="h-4 w-4 text-ggk-neutral-400" />
                <span className="text-ggk-neutral-900 dark:text-ggk-neutral-50">
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
              <div className="flex items-center gap-2 rounded-ggk-lg bg-ggk-neutral-50 p-12 dark:bg-ggk-neutral-900/50">
                <Phone className="h-4 w-4 text-ggk-neutral-400" />
                <span className="text-ggk-neutral-900 dark:text-ggk-neutral-50">
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
            <div className="flex items-center gap-2 rounded-ggk-lg bg-ggk-neutral-50 p-12 dark:bg-ggk-neutral-900/50">
              <Briefcase className="h-4 w-4 text-ggk-neutral-400" />
              <span className="font-mono text-ggk-neutral-900 dark:text-ggk-neutral-50">
                {profileData.teacher_code}
              </span>
            </div>
          </FormField>
        </div>
      </div>

      {/* Professional Information Section */}
      <Card variant="outlined">
        <CardHeader accent>
          <div className="flex items-center gap-8">
            <BookOpen className="h-5 w-5 text-ggk-primary-600" />
            <div>
              <CardTitle className="text-lg">Professional information</CardTitle>
              <CardDescription className="mt-4">
                Share your teaching expertise and experiences.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-16">
          <FormField
            id="specialization"
            label="Subject specialisations"
            error={formErrors.specialization}
          >
            {isEditing ? (
              <SearchableMultiSelect
                label=""
                options={SPECIALIZATION_OPTIONS}
                selectedValues={formData.specialization}
                onChange={(values) => handleFieldChange('specialization', values)}
                placeholder="Select your subject specialisations..."
              />
            ) : (
              <div className="rounded-ggk-xl bg-ggk-neutral-50 p-12 dark:bg-ggk-neutral-900/50">
                {profileData.specialization && profileData.specialization.length > 0 ? (
                  <div className="flex flex-wrap gap-6">
                    {profileData.specialization.map((spec, index) => (
                      <Badge key={index} variant="primary" size="sm">
                        {SPECIALIZATION_OPTIONS.find(opt => opt.value === spec)?.label || spec}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-ggk-neutral-500 dark:text-ggk-neutral-400 italic">
                    No specialisations set
                  </span>
                )}
              </div>
            )}
          </FormField>

          <div className="grid grid-cols-1 gap-16 md:grid-cols-2">
            <FormField
              id="qualification"
              label="Highest qualification"
              error={formErrors.qualification}
            >
              {isEditing ? (
                <Input
                  id="qualification"
                  value={formData.qualification}
                  onChange={(e) => handleFieldChange('qualification', e.target.value)}
                  placeholder="e.g., M.Sc. Mathematics, B.Ed."
                  leftIcon={<Award className="h-4 w-4 text-ggk-neutral-400" />}
                  className="focus:ring-ggk-primary-500 focus:border-ggk-primary-500"
                />
              ) : (
                <div className="flex items-center gap-2 rounded-ggk-lg bg-ggk-neutral-50 p-12 text-ggk-neutral-900 dark:bg-ggk-neutral-900/50 dark:text-ggk-neutral-50">
                  <Award className="h-4 w-4 text-ggk-neutral-400" />
                  <span>{profileData.qualification || 'Not set'}</span>
                </div>
              )}
            </FormField>

            <FormField
              id="experience_years"
              label="Years of experience"
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
                  leftIcon={<Clock className="h-4 w-4 text-ggk-neutral-400" />}
                  className="focus:ring-ggk-primary-500 focus:border-ggk-primary-500"
                />
              ) : (
                <div className="flex items-center gap-2 rounded-ggk-lg bg-ggk-neutral-50 p-12 dark:bg-ggk-neutral-900/50">
                  <Clock className="h-4 w-4 text-ggk-neutral-400" />
                  <span
                    className={cn(
                      'px-6 py-2 rounded-full text-sm font-medium',
                      getExperienceBadgeColor(profileData.experience_years)
                    )}
                  >
                    {profileData.experience_years || 0} years
                  </span>
                </div>
              )}
            </FormField>
          </div>

          <FormField
            id="bio"
            label="Professional bio"
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
                className="focus:ring-ggk-primary-500 focus:border-ggk-primary-500"
              />
            ) : (
              <div className="min-h-[100px] rounded-ggk-lg bg-ggk-neutral-50 p-12 dark:bg-ggk-neutral-900/50">
                {profileData.bio ? (
                  <p className="text-sm text-ggk-neutral-900 dark:text-ggk-neutral-50 whitespace-pre-wrap">
                    {profileData.bio}
                  </p>
                ) : (
                  <span className="text-sm text-ggk-neutral-500 dark:text-ggk-neutral-400 italic">
                    No bio provided
                  </span>
                )}
              </div>
            )}
          </FormField>
        </CardContent>
      </Card>

      {/* Assignment Information Section */}
      <Card variant="outlined">
        <CardHeader accent>
          <div className="flex items-center gap-8">
            <Building2 className="h-5 w-5 text-ggk-primary-600" />
            <div>
              <CardTitle className="text-lg">Assignment information</CardTitle>
              <CardDescription className="mt-4">
                Organisation and school details for your role.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 gap-16 md:grid-cols-2">
            <div className="space-y-4">
              <label className="text-sm font-medium text-ggk-neutral-700 dark:text-ggk-neutral-300">Organisation</label>
              <div className="flex items-center gap-2 rounded-ggk-lg bg-ggk-neutral-50 p-12 text-ggk-neutral-900 dark:bg-ggk-neutral-900/50 dark:text-ggk-neutral-50">
                <Building2 className="h-4 w-4 text-ggk-neutral-400" />
                <span>{profileData.company_name || 'Not assigned'}</span>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium text-ggk-neutral-700 dark:text-ggk-neutral-300">School</label>
              <div className="flex items-center gap-2 rounded-ggk-lg bg-ggk-neutral-50 p-12 text-ggk-neutral-900 dark:bg-ggk-neutral-900/50 dark:text-ggk-neutral-50">
                <School className="h-4 w-4 text-ggk-neutral-400" />
                <span>{profileData.school_name || 'Not assigned'}</span>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium text-ggk-neutral-700 dark:text-ggk-neutral-300">Branch</label>
              <div className="flex items-center gap-2 rounded-ggk-lg bg-ggk-neutral-50 p-12 text-ggk-neutral-900 dark:bg-ggk-neutral-900/50 dark:text-ggk-neutral-50">
                <MapPin className="h-4 w-4 text-ggk-neutral-400" />
                <span>{profileData.branch_name || 'Not assigned'}</span>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium text-ggk-neutral-700 dark:text-ggk-neutral-300">Department</label>
              <div className="flex items-center gap-2 rounded-ggk-lg bg-ggk-neutral-50 p-12 text-ggk-neutral-900 dark:bg-ggk-neutral-900/50 dark:text-ggk-neutral-50">
                <Users className="h-4 w-4 text-ggk-neutral-400" />
                <span>{profileData.department_name || 'Not assigned'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Security Section */}
      <Card variant="outlined">
        <CardHeader accent>
          <div className="flex items-center gap-8">
            <Eye className="h-5 w-5 text-ggk-primary-600" />
            <div>
              <CardTitle className="text-lg">Account security</CardTitle>
              <CardDescription className="mt-4">
                Manage your login credentials and account activity.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-16">
          <div className="flex items-center justify-between rounded-ggk-lg bg-ggk-neutral-50 p-12 dark:bg-ggk-neutral-900/50">
            <div>
              <p className="text-sm font-medium text-ggk-neutral-700 dark:text-ggk-neutral-300">Account status</p>
              <p className="mt-2 text-xs text-ggk-neutral-500 dark:text-ggk-neutral-400">Your account access level</p>
            </div>
            <StatusBadge status={profileData.is_active ? 'active' : 'inactive'} size="sm" />
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ggk-neutral-700 dark:text-ggk-neutral-300">Password</p>
                <p className="mt-2 text-xs text-ggk-neutral-500 dark:text-ggk-neutral-400">Change your account password</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsChangingPassword(!isChangingPassword)}
              >
                {isChangingPassword ? 'Cancel' : 'Change password'}
              </Button>
            </div>

            {isChangingPassword && (
              <div className="space-y-6 rounded-ggk-xl border border-ggk-primary-200/60 bg-ggk-primary-50/60 p-12 dark:border-ggk-primary-800/60 dark:bg-ggk-primary-900/30">
                <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
                  <FormField id="new_password" label="New password" required>
                    <div className="relative">
                      <Input
                        id="new_password"
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        leftIcon={<Eye className="h-4 w-4 text-ggk-neutral-400" />}
                        className="focus:ring-ggk-primary-500 focus:border-ggk-primary-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 text-ggk-neutral-500"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormField>

                  <FormField id="confirm_password" label="Confirm password" required>
                    <Input
                      id="confirm_password"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      leftIcon={<Eye className="h-4 w-4 text-ggk-neutral-400" />}
                      className="focus:ring-ggk-primary-500 focus:border-ggk-primary-500"
                    />
                  </FormField>
                </div>

                <div className="flex justify-end gap-12">
                  <Button
                    variant="secondary"
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
                  >
                    Update password
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-ggk-lg bg-ggk-neutral-50 p-12 text-sm text-ggk-neutral-700 dark:bg-ggk-neutral-900/50 dark:text-ggk-neutral-200">
            <div>
              <p className="font-medium">Last login</p>
              <p className="mt-2 text-xs text-ggk-neutral-500 dark:text-ggk-neutral-400">When you last accessed the system</p>
            </div>
            <span className="text-sm text-ggk-neutral-900 dark:text-ggk-neutral-50">
              {profileData.last_login_at
                ? new Date(profileData.last_login_at).toLocaleString()
                : 'Never'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Account Information Section */}
      <Card variant="outlined">
        <CardHeader accent>
          <div className="flex items-center gap-8">
            <FileText className="h-5 w-5 text-ggk-primary-600" />
            <div>
              <CardTitle className="text-lg">Account information</CardTitle>
              <CardDescription className="mt-4">
                Quick snapshot of your account activity and employment status.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 gap-16 md:grid-cols-2">
            <div className="space-y-4">
              <label className="text-sm font-medium text-ggk-neutral-700 dark:text-ggk-neutral-300">Account created</label>
              <div className="flex items-center gap-2 rounded-ggk-lg bg-ggk-neutral-50 p-12 text-ggk-neutral-900 dark:bg-ggk-neutral-900/50 dark:text-ggk-neutral-50">
                <Calendar className="h-4 w-4 text-ggk-neutral-400" />
                <span>{new Date(profileData.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium text-ggk-neutral-700 dark:text-ggk-neutral-300">Employment status</label>
              <div className="flex items-center gap-2 rounded-ggk-lg bg-ggk-neutral-50 p-12 dark:bg-ggk-neutral-900/50">
                <Briefcase className="h-4 w-4 text-ggk-neutral-400" />
                <StatusBadge status={profileData.status} size="sm" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Development Status */}
      <Card variant="outlined" className="bg-ggk-primary-50/60 dark:bg-ggk-primary-900/30">
        <CardContent className="space-y-8">
          <div className="flex items-center gap-6 text-ggk-primary-700 dark:text-ggk-primary-200">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">Teacher profile management</span>
          </div>
          <p className="text-sm text-ggk-neutral-700 dark:text-ggk-neutral-300">
            Complete teacher profile management system with secure data handling and professional information tracking.
          </p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {[
              'Personal information management ✓',
              'Professional data tracking ✓',
              'Secure password management ✓',
              'Assignment information display ✓',
            ].map(item => (
              <div key={item} className="flex items-center gap-4 text-sm text-ggk-neutral-700 dark:text-ggk-neutral-200">
                <CheckCircle className="h-4 w-4 text-ggk-primary-600 dark:text-ggk-primary-200" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}