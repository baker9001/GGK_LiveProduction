'use client';

/**
 * File: /src/app/student-module/profile/page.tsx
 *
 * Student Profile Settings Page
 * ----------------------------------------------
 * Provides a modern, student-friendly interface that allows learners to
 * manage their essential account information. The experience is inspired by
 * social apps with vibrant gradients, micro-interactions, and quick stats.
 *
 * Features
 *   • Personalized hero panel with avatar upload + vibe controls
 *   • Editable profile + guardian contact information with real-time validation
 *   • Secure email + password update flows (leveraging existing services)
 *   • Context cards highlighting progress, achievements, and account insights
 *   • Responsive layout optimized for desktop and mobile use
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Camera,
  CheckCircle2,
  Clock,
  Edit3,
  GraduationCap,
  Heart,
  Lock,
  Mail,
  PenLine,
  Phone,
  ShieldCheck,
  Smile,
  Sparkles,
  Wand2,
  Calendar
} from 'lucide-react';
import { z } from 'zod';

import { supabase } from '../../../lib/supabase';
import { useUser } from '../../../contexts/UserContext';
import { Button } from '../../../components/shared/Button';
import { FormField, Input, Textarea } from '../../../components/shared/FormField';
import { toast } from '../../../components/shared/Toast';
import { getPublicUrl } from '../../../lib/storageHelpers';
import { userCreationService } from '../../../services/userCreationService';

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

interface StudentEmergencyContact {
  name?: string | null;
  phone?: string | null;
  relationship?: string | null;
  address?: string | null;
}

interface StudentRecord {
  id: string;
  student_code: string;
  enrollment_number?: string | null;
  grade_level?: string | null;
  section?: string | null;
  admission_date?: string | null;
  parent_name?: string | null;
  parent_contact?: string | null;
  parent_email?: string | null;
  emergency_contact?: StudentEmergencyContact | null;
  program_id?: string | null;
  school_id?: string | null;
  branch_id?: string | null;
  is_active: boolean;
  updated_at?: string | null;
}

interface StudentProfileData {
  user: {
    id: string;
    email: string;
    created_at: string;
    last_login_at?: string | null;
    is_active: boolean;
    password_updated_at?: string | null;
    raw_user_meta_data?: Record<string, any> | null;
  };
  student: StudentRecord | null;
  programName?: string | null;
  schoolName?: string | null;
  branchName?: string | null;
}

const ACCENT_THEMES: Record<string, { gradient: string; ring: string; tag: string }> = {
  emerald: {
    gradient: 'from-emerald-500 via-green-500 to-lime-500',
    ring: 'ring-emerald-400/60',
    tag: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
  },
  violet: {
    gradient: 'from-violet-500 via-purple-500 to-indigo-500',
    ring: 'ring-violet-400/60',
    tag: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200'
  },
  sky: {
    gradient: 'from-sky-500 via-cyan-500 to-emerald-400',
    ring: 'ring-sky-400/60',
    tag: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200'
  },
  sunset: {
    gradient: 'from-orange-500 via-pink-500 to-rose-500',
    ring: 'ring-orange-400/60',
    tag: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200'
  }
};

const ACCENT_OPTIONS = [
  { value: 'emerald', label: 'Fresh Focus' },
  { value: 'violet', label: 'Creative Burst' },
  { value: 'sky', label: 'Calm & Curious' },
  { value: 'sunset', label: 'Bold Energy' }
];

const profileFormSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Name is too long'),
  displayName: z
    .string()
    .max(40, 'Display name should be under 40 characters')
    .optional()
    .or(z.literal('')),
  pronouns: z
    .string()
    .max(30, 'Keep pronouns short and sweet')
    .optional()
    .or(z.literal('')),
  bio: z
    .string()
    .max(240, 'Bio should be under 240 characters')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .regex(/^(\+?[0-9\s-]{7,20})?$/, 'Enter a valid phone number')
    .optional()
    .or(z.literal('')),
  gradeLevel: z.string().max(50, 'Grade level looks too long').optional().or(z.literal('')),
  section: z.string().max(50, 'Section name looks too long').optional().or(z.literal('')),
  parentName: z.string().max(100, 'Parent name is too long').optional().or(z.literal('')),
  parentContact: z
    .string()
    .max(40, 'Parent contact looks too long')
    .optional()
    .or(z.literal('')),
  parentEmail: z.string().email('Please enter a valid parent email').optional().or(z.literal('')),
  emergencyName: z.string().max(100, 'Emergency contact name too long').optional().or(z.literal('')),
  emergencyPhone: z
    .string()
    .max(40, 'Emergency phone looks too long')
    .optional()
    .or(z.literal('')),
  emergencyRelationship: z
    .string()
    .max(60, 'Relationship description too long')
    .optional()
    .or(z.literal('')),
  vibe: z.string().max(60, 'Keep your vibe under 60 characters').optional().or(z.literal('')),
  accentColor: z.enum(['emerald', 'violet', 'sky', 'sunset']).default('emerald')
});

type StudentProfileFormValues = z.infer<typeof profileFormSchema>;

interface PasswordStrength {
  score: number;
  label: string;
  description: string;
  color: string;
}

const PASSWORD_MESSAGES: PasswordStrength[] = [
  { score: 0, label: 'Too Weak', description: 'Add more characters & mix symbols', color: 'bg-red-500' },
  { score: 1, label: 'Weak', description: 'Try adding numbers or symbols', color: 'bg-orange-500' },
  { score: 2, label: 'Okay', description: 'Almost there—add more variety', color: 'bg-amber-500' },
  { score: 3, label: 'Strong', description: 'Solid! This will keep you safe', color: 'bg-emerald-500' },
  { score: 4, label: 'Epic', description: 'Legendary password energy', color: 'bg-blue-500' }
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function evaluatePasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return PASSWORD_MESSAGES[Math.min(score, PASSWORD_MESSAGES.length - 1)];
}

function sanitizeValue<T>(value: T | null | undefined): T | null {
  if (value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : (trimmed as unknown as T);
  }
  return value as T | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StudentProfileSettingsPage() {
  const { user } = useUser();
  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<StudentProfileFormValues>({
    name: '',
    displayName: '',
    pronouns: '',
    bio: '',
    phone: '',
    gradeLevel: '',
    section: '',
    parentName: '',
    parentContact: '',
    parentEmail: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelationship: '',
    vibe: '',
    accentColor: 'emerald'
  });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  const [emailDraft, setEmailDraft] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const passwordStrength = useMemo(() => evaluatePasswordStrength(newPassword), [newPassword]);

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  const {
    data: profileData,
    isLoading,
    isError,
    error
  } = useQuery<StudentProfileData>(
    ['student-profile', user?.id],
    async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { data: userRow, error: userError } = await supabase
        .from('users')
        .select('id, email, created_at, last_login_at, is_active, password_updated_at, raw_user_meta_data')
        .eq('id', user.id)
        .single();

      if (userError) {
        throw userError;
      }

      const { data: studentRow, error: studentError } = await supabase
        .from('students')
        .select(`
          id,
          student_code,
          enrollment_number,
          grade_level,
          section,
          admission_date,
          parent_name,
          parent_contact,
          parent_email,
          emergency_contact,
          program_id,
          school_id,
          branch_id,
          is_active,
          updated_at
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (studentError) {
        throw studentError;
      }

      let programName: string | null = null;
      if (studentRow?.program_id) {
        const { data: programData } = await supabase
          .from('programs')
          .select('name')
          .eq('id', studentRow.program_id)
          .maybeSingle();
        programName = programData?.name ?? null;
      }

      let schoolName: string | null = null;
      if (studentRow?.school_id) {
        const { data: schoolData } = await supabase
          .from('schools')
          .select('name')
          .eq('id', studentRow.school_id)
          .maybeSingle();
        schoolName = schoolData?.name ?? null;
      }

      let branchName: string | null = null;
      if (studentRow?.branch_id) {
        const { data: branchData } = await supabase
          .from('branches')
          .select('name')
          .eq('id', studentRow.branch_id)
          .maybeSingle();
        branchName = branchData?.name ?? null;
      }

      return {
        user: userRow,
        student: studentRow ?? null,
        programName,
        schoolName,
        branchName
      } satisfies StudentProfileData;
    },
    {
      enabled: !!user?.id && (user.role === 'STUDENT' || user.role === 'SSA'),
      staleTime: 60 * 1000
    }
  );

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  const updateProfileMutation = useMutation(
    async (values: StudentProfileFormValues) => {
      if (!user?.id || !profileData?.user) {
        throw new Error('User not authenticated');
      }

      const currentMeta = profileData.user.raw_user_meta_data || {};
      const sanitizedMeta: Record<string, any> = {
        ...currentMeta,
        name: values.name.trim(),
        display_name: sanitizeValue(values.displayName),
        pronouns: sanitizeValue(values.pronouns),
        bio: sanitizeValue(values.bio),
        phone: sanitizeValue(values.phone),
        vibe: sanitizeValue(values.vibe),
        accent_color: values.accentColor,
        updated_at: new Date().toISOString()
      };

      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          raw_user_meta_data: sanitizedMeta,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (userUpdateError) {
        throw new Error(userUpdateError.message);
      }

      if (profileData.student) {
        const emergencyContact = {
          name: sanitizeValue(values.emergencyName),
          phone: sanitizeValue(values.emergencyPhone),
          relationship: sanitizeValue(values.emergencyRelationship)
        } satisfies StudentEmergencyContact;

        const { error: studentUpdateError } = await supabase
          .from('students')
          .update({
            grade_level: sanitizeValue(values.gradeLevel),
            section: sanitizeValue(values.section),
            parent_name: sanitizeValue(values.parentName),
            parent_contact: sanitizeValue(values.parentContact),
            parent_email: sanitizeValue(values.parentEmail),
            emergency_contact: emergencyContact,
            updated_at: new Date().toISOString()
          })
          .eq('id', profileData.student.id);

        if (studentUpdateError) {
          throw new Error(studentUpdateError.message);
        }
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['student-profile', user?.id] });
        toast.success('Profile updated! ✨');
        setIsEditingProfile(false);
      },
      onError: (err: any) => {
        console.error('Profile update failed:', err);
        toast.error(err?.message || 'Failed to update profile');
      }
    }
  );

  const updateEmailMutation = useMutation(
    async (newEmail: string) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      await userCreationService.updateEmail(user.id, newEmail);
    },
    {
      onSuccess: () => {
        toast.success('Email update requested. Check your inbox!');
        setEmailError(null);
        queryClient.invalidateQueries({ queryKey: ['student-profile', user?.id] });
      },
      onError: (err: any) => {
        console.error('Email update error:', err);
        setEmailError(err?.message || 'Failed to update email');
        toast.error(err?.message || 'Failed to update email');
      }
    }
  );

  const changePasswordMutation = useMutation(
    async (password: string) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const bcrypt = await import('bcryptjs/dist/bcrypt.min');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const { error: passwordError } = await supabase
        .from('users')
        .update({
          password_hash: hashedPassword,
          password_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (passwordError) {
        throw new Error(passwordError.message);
      }

      await userCreationService.updatePasswordMetadata(user.id);
    },
    {
      onSuccess: () => {
        setNewPassword('');
        setConfirmPassword('');
        setIsChangingPassword(false);
        queryClient.invalidateQueries({ queryKey: ['student-profile', user?.id] });
        toast.success('Password updated! 🔒');
      },
      onError: (err: any) => {
        console.error('Password update failed:', err);
        toast.error(err?.message || 'Failed to update password');
      }
    }
  );

  // -------------------------------------------------------------------------
  // Derived data & effects
  // -------------------------------------------------------------------------

  const avatarUrl = useMemo(() => {
    const rawUrl = profileData?.user?.raw_user_meta_data?.avatar_url;
    return getPublicUrl('avatars', rawUrl || null) || rawUrl || null;
  }, [profileData?.user?.raw_user_meta_data?.avatar_url]);

  const accentTheme = ACCENT_THEMES[profileForm.accentColor] ?? ACCENT_THEMES.emerald;

  useEffect(() => {
    if (!profileData) return;

    const meta = profileData.user.raw_user_meta_data || {};
    setProfileForm({
      name: meta?.name || profileData.user.email.split('@')[0] || '',
      displayName: meta?.display_name || meta?.name || '',
      pronouns: meta?.pronouns || '',
      bio: meta?.bio || '',
      phone: meta?.phone || '',
      gradeLevel: profileData.student?.grade_level || '',
      section: profileData.student?.section || '',
      parentName: profileData.student?.parent_name || '',
      parentContact: profileData.student?.parent_contact || '',
      parentEmail: profileData.student?.parent_email || '',
      emergencyName: profileData.student?.emergency_contact?.name || '',
      emergencyPhone: profileData.student?.emergency_contact?.phone || '',
      emergencyRelationship: profileData.student?.emergency_contact?.relationship || '',
      vibe: meta?.vibe || '',
      accentColor: (meta?.accent_color as string) && ACCENT_THEMES[meta?.accent_color]
        ? meta?.accent_color
        : 'emerald'
    });
    setEmailDraft(profileData.user.email);
  }, [profileData]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleProfileChange = (field: keyof StudentProfileFormValues, value: string) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
    if (profileErrors[field]) {
      setProfileErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSaveProfile = () => {
    try {
      const validated = profileFormSchema.parse(profileForm);
      setProfileErrors({});
      updateProfileMutation.mutate(validated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.issues.forEach(issue => {
          const path = issue.path[0];
          if (typeof path === 'string') {
            fieldErrors[path] = issue.message;
          }
        });
        setProfileErrors(fieldErrors);
        toast.error('Please fix the highlighted fields');
      } else {
        toast.error('Something went wrong while validating the form');
      }
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be under 2MB');
      return;
    }

    const uploadingToast = toast.loading('Uploading your vibe pic...');

    try {
      const ext = file.name.split('.').pop();
      const fileName = `student_${user.id}_${Date.now()}.${ext}`;

      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      const currentMeta = profileData?.user.raw_user_meta_data || {};
      const { error: metaError } = await supabase
        .from('users')
        .update({
          raw_user_meta_data: {
            ...currentMeta,
            avatar_url: data?.path,
            updated_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (metaError) {
        throw metaError;
      }

      toast.dismiss(uploadingToast);
      toast.success('Profile picture updated!');
      queryClient.invalidateQueries({ queryKey: ['student-profile', user.id] });
    } catch (err: any) {
      console.error('Avatar upload failed:', err);
      toast.dismiss(uploadingToast);
      toast.error(err?.message || 'Failed to upload image');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAvatarRemove = async () => {
    if (!user?.id) return;

    const confirmed = window.confirm('Remove your profile picture?');
    if (!confirmed) return;

    const removingToast = toast.loading('Removing profile picture...');

    try {
      const currentMeta = profileData?.user.raw_user_meta_data || {};
      const path = currentMeta?.avatar_url;

      if (path) {
        await supabase.storage.from('avatars').remove([path]);
      }

      const { error: metaError } = await supabase
        .from('users')
        .update({
          raw_user_meta_data: {
            ...currentMeta,
            avatar_url: null,
            updated_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (metaError) {
        throw metaError;
      }

      toast.dismiss(removingToast);
      toast.success('Profile picture removed');
      queryClient.invalidateQueries({ queryKey: ['student-profile', user.id] });
    } catch (err: any) {
      console.error('Avatar removal failed:', err);
      toast.dismiss(removingToast);
      toast.error(err?.message || 'Failed to remove image');
    }
  };

  const handleEmailUpdate = () => {
    if (!emailDraft.trim()) {
      setEmailError('Email cannot be empty');
      return;
    }
    setEmailError(null);
    updateEmailMutation.mutate(emailDraft.trim().toLowerCase());
  };

  const handlePasswordUpdate = () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Enter and confirm your new password');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password should be at least 8 characters');
      return;
    }

    setIsChangingPassword(true);
    changePasswordMutation.mutate(newPassword, {
      onSettled: () => setIsChangingPassword(false)
    });
  };

  // -------------------------------------------------------------------------
  // Rendering helpers
  // -------------------------------------------------------------------------

  const joinDate = profileData ? new Date(profileData.user.created_at).toLocaleDateString() : '';
  const lastLogin = profileData?.user.last_login_at
    ? new Date(profileData.user.last_login_at).toLocaleString()
    : 'No recent activity';

  const progressPercent = useMemo(() => {
    const meta = profileData?.user.raw_user_meta_data || {};
    if (typeof meta.progress_percent === 'number') {
      return Math.min(100, Math.max(0, meta.progress_percent));
    }
    return 62;
  }, [profileData?.user.raw_user_meta_data]);

  const streakDays = useMemo(() => {
    const meta = profileData?.user.raw_user_meta_data || {};
    if (typeof meta.streak_days === 'number') {
      return meta.streak_days;
    }
    return 5;
  }, [profileData?.user.raw_user_meta_data]);

  const vibeTag = profileForm.vibe || 'Ready to learn';

  // -------------------------------------------------------------------------
  // Render states
  // -------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 animate-pulse">
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded-full mb-4" />
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded-full mb-2" />
          <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
      </div>
    );
  }

  if (isError || !profileData) {
    return (
      <div className="p-6">
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-3xl p-10 text-center">
          <ShieldCheck className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-rose-600 dark:text-rose-300 mb-2">Profile unavailable</h2>
          <p className="text-sm text-rose-500 dark:text-rose-200 max-w-lg mx-auto">
            {error instanceof Error ? error.message : 'We could not load your profile. Please refresh or contact support.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Hero */}
      <div className={`relative overflow-hidden rounded-3xl border border-white/10 shadow-lg bg-gradient-to-r ${accentTheme.gradient}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.25),_transparent_60%)]" />
        <div className="relative p-8 md:p-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 text-white">
          <div className="flex items-start gap-6">
            <div className={`relative w-24 h-24 md:w-28 md:h-28 rounded-3xl ring-4 ${accentTheme.ring} ring-offset-4 ring-offset-white/20 bg-white/20 backdrop-blur-sm flex items-center justify-center`}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile avatar"
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <span className="text-4xl font-semibold">
                  {profileForm.displayName?.charAt(0)?.toUpperCase() || profileForm.name.charAt(0)?.toUpperCase() || 'S'}
                </span>
              )}
              <label className="absolute -bottom-3 -right-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-gray-800 shadow-sm cursor-pointer">
                  <Camera className="h-3.5 w-3.5" />
                  Update
                </span>
              </label>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <span className="uppercase text-xs tracking-[0.4em]">My Space</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mt-2">
                {profileForm.displayName || profileForm.name}
              </h1>
              <p className="text-sm md:text-base text-white/80 mt-2 max-w-xl">
                {profileForm.bio || 'Curate your learning vibe, keep your details fresh, and stay on top of your goals.'}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs md:text-sm">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full font-semibold backdrop-blur-sm ${accentTheme.tag}`}>
                  <Smile className="w-3.5 h-3.5" />
                  {vibeTag}
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md">
                  <GraduationCap className="w-3.5 h-3.5" />
                  {profileData.student?.grade_level || 'Grade TBD'}
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md">
                  <Clock className="w-3.5 h-3.5" />
                  Joined {joinDate}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:gap-6 text-xs md:text-sm">
            <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between text-white/80">
                <span>Learning Progress</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="mt-3">
                <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-white"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="mt-2 text-sm font-semibold">{progressPercent}% complete</div>
              </div>
            </div>
            <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between text-white/80">
                <span>Streak</span>
                <Heart className="w-4 h-4" />
              </div>
              <div className="mt-3">
                <div className="text-3xl font-bold">{streakDays}</div>
                <div className="text-sm">days of focus 🔥</div>
              </div>
            </div>
          </div>
        </div>
        {avatarUrl && (
          <button
            onClick={handleAvatarRemove}
            className="absolute top-6 right-6 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white/20 text-white rounded-full backdrop-blur-md hover:bg-white/30"
          >
            <PenLine className="w-3.5 h-3.5" />
            Remove pic
          </button>
        )}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Editable profile */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Profile Details</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Keep your information current so mentors can celebrate your wins.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {isEditingProfile ? (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setIsEditingProfile(false);
                        setProfileErrors({});
                        if (profileData) {
                          const meta = profileData.user.raw_user_meta_data || {};
                          setProfileForm({
                            name: meta?.name || profileData.user.email.split('@')[0] || '',
                            displayName: meta?.display_name || meta?.name || '',
                            pronouns: meta?.pronouns || '',
                            bio: meta?.bio || '',
                            phone: meta?.phone || '',
                            gradeLevel: profileData.student?.grade_level || '',
                            section: profileData.student?.section || '',
                            parentName: profileData.student?.parent_name || '',
                            parentContact: profileData.student?.parent_contact || '',
                            parentEmail: profileData.student?.parent_email || '',
                            emergencyName: profileData.student?.emergency_contact?.name || '',
                            emergencyPhone: profileData.student?.emergency_contact?.phone || '',
                            emergencyRelationship: profileData.student?.emergency_contact?.relationship || '',
                            vibe: meta?.vibe || '',
                            accentColor: (meta?.accent_color as string) && ACCENT_THEMES[meta?.accent_color]
                              ? meta?.accent_color
                              : 'emerald'
                          });
                        }
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveProfile}
                      loading={updateProfileMutation.isPending}
                      loadingText="Saving..."
                    >
                      Save changes
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Edit3 className="w-4 h-4" />}
                    onClick={() => setIsEditingProfile(true)}
                  >
                    Edit profile
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="grid grid-cols-1 gap-4">
                  <FormField id="name" label="Full name" required error={profileErrors.name}>
                    <Input
                      id="name"
                      value={profileForm.name}
                      onChange={e => handleProfileChange('name', e.target.value)}
                      disabled={!isEditingProfile}
                      placeholder="Your official name"
                    />
                  </FormField>
                  <FormField id="displayName" label="Display name" error={profileErrors.displayName}>
                    <Input
                      id="displayName"
                      value={profileForm.displayName}
                      onChange={e => handleProfileChange('displayName', e.target.value)}
                      disabled={!isEditingProfile}
                      placeholder="What should we call you?"
                    />
                  </FormField>
                  <FormField id="pronouns" label="Pronouns" error={profileErrors.pronouns}>
                    <Input
                      id="pronouns"
                      value={profileForm.pronouns}
                      onChange={e => handleProfileChange('pronouns', e.target.value)}
                      disabled={!isEditingProfile}
                      placeholder="e.g. she/her"
                    />
                  </FormField>
                  <FormField id="bio" label="About you" error={profileErrors.bio}>
                    <Textarea
                      id="bio"
                      rows={4}
                      value={profileForm.bio}
                      onChange={e => handleProfileChange('bio', e.target.value)}
                      disabled={!isEditingProfile}
                      placeholder="Tell your mentors what makes you unique"
                    />
                  </FormField>
                </div>
              </div>

              <div>
                <div className="grid grid-cols-1 gap-4">
                  <FormField id="phone" label="Contact number" error={profileErrors.phone}>
                    <Input
                      id="phone"
                      value={profileForm.phone}
                      onChange={e => handleProfileChange('phone', e.target.value)}
                      disabled={!isEditingProfile}
                      placeholder="Share a number if you want alerts"
                      leftIcon={<Phone className="w-4 h-4 text-gray-400" />}
                    />
                  </FormField>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField id="gradeLevel" label="Grade" error={profileErrors.gradeLevel}>
                      <Input
                        id="gradeLevel"
                        value={profileForm.gradeLevel}
                        onChange={e => handleProfileChange('gradeLevel', e.target.value)}
                        disabled={!isEditingProfile}
                        placeholder="Grade level"
                      />
                    </FormField>
                    <FormField id="section" label="Class section" error={profileErrors.section}>
                      <Input
                        id="section"
                        value={profileForm.section}
                        onChange={e => handleProfileChange('section', e.target.value)}
                        disabled={!isEditingProfile}
                        placeholder="Section"
                      />
                    </FormField>
                  </div>
                  <FormField id="vibe" label="Current vibe" error={profileErrors.vibe}>
                    <Input
                      id="vibe"
                      value={profileForm.vibe}
                      onChange={e => handleProfileChange('vibe', e.target.value)}
                      disabled={!isEditingProfile}
                      placeholder="e.g. Crushing math goals 🔢"
                      leftIcon={<Sparkles className="w-4 h-4 text-gray-400" />}
                    />
                  </FormField>
                  <FormField id="accentColor" label="Accent colour" description="Pick a gradient that matches your mood">
                    <div className="grid grid-cols-2 gap-3">
                      {ACCENT_OPTIONS.map(option => {
                        const isActive = profileForm.accentColor === option.value;
                        const theme = ACCENT_THEMES[option.value];
                        return (
                          <button
                            key={option.value}
                            type="button"
                            className={`relative overflow-hidden rounded-2xl p-3 text-left border transition-all duration-200 ${
                              isActive
                                ? 'border-transparent scale-[1.02] shadow-lg'
                                : 'border-gray-200 dark:border-gray-700'
                            }`}
                            style={{
                              backgroundImage: `linear-gradient(135deg, var(--tw-gradient-stops))`
                            }}
                            onClick={() => isEditingProfile && handleProfileChange('accentColor', option.value)}
                            disabled={!isEditingProfile}
                          >
                            <div className={`absolute inset-0 bg-gradient-to-r ${theme.gradient}`} />
                            <div className="relative">
                              <div className="text-sm font-semibold text-white drop-shadow-sm">{option.label}</div>
                              <div className="text-xs text-white/80 mt-1">
                                {option.value === 'emerald' && 'Growth energy'}
                                {option.value === 'violet' && 'Creative power'}
                                {option.value === 'sky' && 'Calm confidence'}
                                {option.value === 'sunset' && 'Bold moves'}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </FormField>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Guardian & emergency contacts</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Trusted adults we can reach if there is important news about your learning journey.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <FormField id="parentName" label="Guardian name" error={profileErrors.parentName}>
                  <Input
                    id="parentName"
                    value={profileForm.parentName}
                    onChange={e => handleProfileChange('parentName', e.target.value)}
                    disabled={!isEditingProfile}
                    placeholder="Primary guardian name"
                  />
                </FormField>
                <FormField id="parentContact" label="Guardian phone" error={profileErrors.parentContact}>
                  <Input
                    id="parentContact"
                    value={profileForm.parentContact}
                    onChange={e => handleProfileChange('parentContact', e.target.value)}
                    disabled={!isEditingProfile}
                    placeholder="Phone number"
                    leftIcon={<Phone className="w-4 h-4 text-gray-400" />}
                  />
                </FormField>
                <FormField id="parentEmail" label="Guardian email" error={profileErrors.parentEmail}>
                  <Input
                    id="parentEmail"
                    value={profileForm.parentEmail}
                    onChange={e => handleProfileChange('parentEmail', e.target.value)}
                    disabled={!isEditingProfile}
                    placeholder="Email address"
                    leftIcon={<Mail className="w-4 h-4 text-gray-400" />}
                  />
                </FormField>
              </div>
              <div className="space-y-4">
                <FormField id="emergencyName" label="Emergency contact" error={profileErrors.emergencyName}>
                  <Input
                    id="emergencyName"
                    value={profileForm.emergencyName}
                    onChange={e => handleProfileChange('emergencyName', e.target.value)}
                    disabled={!isEditingProfile}
                    placeholder="Who should we call?"
                  />
                </FormField>
                <FormField id="emergencyPhone" label="Emergency phone" error={profileErrors.emergencyPhone}>
                  <Input
                    id="emergencyPhone"
                    value={profileForm.emergencyPhone}
                    onChange={e => handleProfileChange('emergencyPhone', e.target.value)}
                    disabled={!isEditingProfile}
                    placeholder="Phone number"
                    leftIcon={<Phone className="w-4 h-4 text-gray-400" />}
                  />
                </FormField>
                <FormField
                  id="emergencyRelationship"
                  label="Relationship"
                  error={profileErrors.emergencyRelationship}
                >
                  <Input
                    id="emergencyRelationship"
                    value={profileForm.emergencyRelationship}
                    onChange={e => handleProfileChange('emergencyRelationship', e.target.value)}
                    disabled={!isEditingProfile}
                    placeholder="e.g. Aunt, family friend"
                  />
                </FormField>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Account insights</h3>
              <Wand2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/40">
                <Sparkles className="w-5 h-5 text-emerald-500 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">Program</p>
                  <p>{profileData.programName || 'Program assignment coming soon'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-900/40">
                <GraduationCap className="w-5 h-5 text-sky-500 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">School & branch</p>
                  <p>{profileData.schoolName || 'No school assigned'} · {profileData.branchName || 'Branch pending'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40">
                <Calendar className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">Last login</p>
                  <p>{lastLogin}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-sm p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Account security</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Update how you sign in and keep your account safe.
              </p>
            </div>

            <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200 font-semibold">
                <Mail className="w-4 h-4" />
                Email address
              </div>
              <Input
                value={emailDraft}
                onChange={e => setEmailDraft(e.target.value)}
                placeholder="student@email.com"
              />
              {emailError && <p className="text-xs text-red-500">{emailError}</p>}
              <Button
                size="sm"
                onClick={handleEmailUpdate}
                loading={updateEmailMutation.isPending}
                loadingText="Updating"
              >
                Update email
              </Button>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                You may be asked to verify the new email before it becomes active.
              </p>
            </div>

            <div className="p-4 border border-gray-200 dark:border-gray-800 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200 font-semibold">
                <Lock className="w-4 h-4" />
                Change password
              </div>
              <Input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="New password"
              />
              <Input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
              />
              <div className="space-y-2">
                <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-2 ${passwordStrength.color}`}
                    style={{ width: `${(passwordStrength.score + 1) * 20}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-semibold text-gray-700 dark:text-gray-200 mr-1">{passwordStrength.label}</span>
                  {passwordStrength.description}
                </div>
              </div>
              <Button
                size="sm"
                onClick={handlePasswordUpdate}
                loading={isChangingPassword || changePasswordMutation.isPending}
                loadingText="Updating"
              >
                Save new password
              </Button>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Use at least 8 characters with a mix of letters, numbers, and symbols.
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-white rounded-3xl shadow-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <div>
                <h3 className="text-lg font-semibold">Staying safe online</h3>
                <p className="text-sm text-white/70">Only you control this space. Share wisely.</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-white/80">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-400" />
                Never post your password anywhere.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-400" />
                Keep guardian details current so we can reach them.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-400" />
                Ask for help if something feels off—your mentors are here for you.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
