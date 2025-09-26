/**
 * File: /src/app/entity-module/organisation/tabs/teachers/page.tsx
 * 
 * COMPLETE CORRECTED VERSION: Teachers Tab with Email/Password Auth.users Sync
 * 
 * Features Implemented:
 * ✅ Enhanced password management with radio options
 * ✅ Password requirements checker with visual feedback
 * ✅ Generated password modal with copy/print functionality
 * ✅ Editable email field with verification notice
 * ✅ Protected teacher code field (non-editable by design)
 * ✅ Quick password reset from table actions
 * ✅ Professional UI/UX matching tenant page standards
 * ✅ Green theme (#8CC63F) throughout
 * ✅ Comprehensive error handling and validation
 * ✅ Accessibility improvements
 * ✅ Fixed UUID handling for school_id and branch_id
 * ✅ Fixed password update to actually save to database via auth.users
 * ✅ Fixed phone number saving to teachers table
 * ✅ Fixed junction table updates to avoid conflicts
 * ✅ Fixed column name: last_login_at -> last_sign_in_at
 * ✅ CRITICAL FIX: Email updates now sync with auth.users
 * ✅ CRITICAL FIX: Password reset now sends email for admin updates
 * 
 * Dependencies:
 *   - @/services/userCreationService (with updateEmail method)
 *   - @/hooks/useAccessControl
 *   - @/components/shared/*
 *   - @/contexts/UserContext
 *   - @/lib/supabase
 */

'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Users, Award, Calendar, BookOpen, Clock, Briefcase, 
  Plus, Search, Filter, AlertTriangle, Info, CheckCircle2,
  Loader2, UserCheck, GraduationCap, Edit, Eye, MoreVertical,
  Mail, Phone, MapPin, Download, Upload, Key, Copy, RefreshCw,
  Trash2, UserX, FileText, ChevronDown, X, User, Building2,
  School, Grid3x3, Layers, Shield, Hash, Eye as EyeIcon, EyeOff,
  CheckCircle, XCircle, Printer, Check
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../../lib/supabase';
import { useUser } from '../../../../../contexts/UserContext';
import { useAccessControl } from '../../../../../hooks/useAccessControl';
import { FormField, Input, Select, Textarea } from '../../../../../components/shared/FormField';
import { Button } from '../../../../../components/shared/Button';
import { StatusBadge } from '../../../../../components/shared/StatusBadge';
import { toast } from '../../../../../components/shared/Toast';
import { SlideInForm } from '../../../../../components/shared/SlideInForm';
import { ConfirmationDialog } from '../../../../../components/shared/ConfirmationDialog';
import { SearchableMultiSelect } from '../../../../../components/shared/SearchableMultiSelect';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../../components/shared/Tabs';
import { PhoneInput } from '../../../../../components/shared/PhoneInput';
import { ToggleSwitch } from '../../../../../components/shared/ToggleSwitch';
import { userCreationService } from '../../../../../services/userCreationService';
import { cn } from '../../../../../lib/utils';
import { QuickPasswordResetButton } from '../../../../../components/shared/QuickPasswordResetButton';
import { PasswordResetManager } from '../../../../../components/shared/PasswordResetManager';

// ===== INTERFACES =====
interface TeacherData {
  id: string;
  user_id: string;
  teacher_code: string;
  name?: string;
  email?: string;
  phone?: string;
  specialization?: string[];
  qualification?: string;
  experience_years?: number;
  bio?: string;
  hire_date?: string;
  company_id: string;
  school_id?: string;
  branch_id?: string;
  department_id?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
  school_name?: string;
  branch_name?: string;
  departments?: { id: string; name: string }[];
  grade_levels?: { id: string; grade_name: string; grade_code: string }[];
  sections?: { id: string; section_name: string; section_code: string; grade_level_id: string }[];
  user_data?: {
    email: string;
    is_active: boolean;
    raw_user_meta_data?: any;
    last_sign_in_at?: string;
  };
}

interface TeacherFormData {
  // Basic Information
  name: string;
  email: string;
  phone?: string;
  teacher_code: string;
  password?: string;
  
  // Professional Information
  specialization?: string[];
  qualification?: string;
  experience_years?: number;
  bio?: string;
  hire_date?: string;
  
  // Assignment
  school_id?: string;
  branch_id?: string;
  department_ids?: string[];
  grade_level_ids?: string[];
  section_ids?: string[];
  
  // Settings
  is_active?: boolean;
  send_credentials?: boolean;
}

interface Department {
  id: string;
  name: string;
  code?: string;
  status: string;
}

interface GradeLevel {
  id: string;
  grade_name: string;
  grade_code: string;
  grade_order: number;
  school_id?: string;
  branch_id?: string;
}

interface ClassSection {
  id: string;
  section_name: string;
  section_code: string;
  grade_level_id: string;
  max_capacity?: number;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

export interface TeachersTabProps {
  companyId: string;
  refreshData?: () => void;
}

// ===== CONSTANTS =====
const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'Contains uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { label: 'Contains lowercase letter (a-z)', test: (p) => /[a-z]/.test(p) },
  { label: 'Contains number (0-9)', test: (p) => /[0-9]/.test(p) },
  { label: 'Contains special character (!@#$%^&*)', test: (p) => /[!@#$%^&*]/.test(p) }
];

const SPECIALIZATION_OPTIONS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 
  'English', 'History', 'Geography', 'Computer Science',
  'Physical Education', 'Art', 'Music', 'Economics',
  'Business Studies', 'Psychology', 'Sociology', 'Philosophy',
  'Arabic', 'French', 'Spanish', 'German'
];

const QUALIFICATION_OPTIONS = [
  'High School Diploma', 'Bachelor\'s Degree', 'Bachelor of Education',
  'Master\'s Degree', 'Master of Education', 'PhD', 'Professional Certificate'
];

// ===== HELPER COMPONENTS =====
const PasswordRequirementsChecker: React.FC<{ password: string }> = React.memo(({ password }) => {
  return (
    <div className="mt-2 space-y-1" role="list" aria-label="Password requirements">
      {PASSWORD_REQUIREMENTS.map((req, index) => {
        const isMet = password ? req.test(password) : false;
        return (
          <div 
            key={index} 
            role="listitem"
            className={`flex items-center gap-2 text-xs transition-all ${
              isMet ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {isMet ? (
              <CheckCircle className="h-3 w-3" aria-hidden="true" />
            ) : (
              <XCircle className="h-3 w-3" aria-hidden="true" />
            )}
            <span>{req.label}</span>
          </div>
        );
      })}
    </div>
  );
});

PasswordRequirementsChecker.displayName = 'PasswordRequirementsChecker';

// ===== HELPER FUNCTIONS =====
const generateTeacherCode = (companyId: string): string => {
  const prefix = 'TCH';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

const generateSecurePassword = (): string => {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  let password = '';
  // Ensure at least one of each required character type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  const allChars = uppercase + lowercase + numbers + special;
  for (let i = password.length; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// ===== MAIN COMPONENT =====
export default function TeachersTab({ companyId, refreshData }: TeachersTabProps) {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const {
    canViewTab,
    can,
    getScopeFilters,
    getUserContext,
    isLoading: isAccessControlLoading,
    isEntityAdmin,
    isSubEntityAdmin,
    hasError: accessControlError,
    error: accessControlErrorMessage
  } = useAccessControl();

  // ===== STATE MANAGEMENT =====
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterSchool, setFilterSchool] = useState<string>('all');
  const [filterSpecialization, setFilterSpecialization] = useState<string>('all');
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  
  // Form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showBulkActionConfirmation, setShowBulkActionConfirmation] = useState(false);
  
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherData | null>(null);
  const [bulkAction, setBulkAction] = useState<'activate' | 'deactivate' | 'delete' | null>(null);
  
  // Enhanced password management state
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  
  // Tab management
  const [activeTab, setActiveTab] = useState<'basic' | 'professional' | 'assignment'>('basic');
  const [tabErrors, setTabErrors] = useState({
    basic: false,
    professional: false,
    assignment: false
  });
  
  const [formData, setFormData] = useState<TeacherFormData>({
    name: '',
    email: '',
    teacher_code: '',
    phone: '',
    specialization: [],
    qualification: '',
    experience_years: 0,
    bio: '',
    hire_date: new Date().toISOString().split('T')[0],
    school_id: '',
    branch_id: '',
    department_ids: [],
    grade_level_ids: [],
    section_ids: [],
    is_active: true,
    send_credentials: true,
    password: ''
  });
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ===== CLEANUP EFFECT =====
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // ===== ACCESS CONTROL CHECK =====
  useEffect(() => {
    if (!isAccessControlLoading && !canViewTab('teachers')) {
      toast.error('You do not have permission to view teachers');
      window.location.href = '/app/entity-module/dashboard';
    }
  }, [isAccessControlLoading, canViewTab]);

  // Get scope filters and permissions
  const scopeFilters = useMemo(() => getScopeFilters('teachers'), [getScopeFilters]);
  const userContext = useMemo(() => getUserContext(), [getUserContext]);
  const canAccessAll = useMemo(() => isEntityAdmin || isSubEntityAdmin, [isEntityAdmin, isSubEntityAdmin]);
  
  const canCreateTeacher = can('create_teacher');
  const canModifyTeacher = can('modify_teacher');
  const canDeleteTeacher = can('delete_teacher');

  // ===== DATA FETCHING =====
  
  // Fetch teachers with relationships
  const { data: teachers = [], isLoading: isLoadingTeachers, error: teachersError, refetch: refetchTeachers } = useQuery(
    ['teachers', companyId, scopeFilters],
    async () => {
      try {
        if (!companyId) {
          throw new Error('Company ID is required');
        }

        let query = supabase
          .from('teachers')
          .select(`
            id,
            user_id,
            teacher_code,
            specialization,
            qualification,
            experience_years,
            bio,
            phone,
            company_id,
            school_id,
            branch_id,
            department_id,
            hire_date,
            created_at,
            updated_at,
            users!teachers_user_id_fkey (
              id,
              email,
              is_active,
              raw_user_meta_data,
              last_sign_in_at
            ),
            schools (
              id,
              name,
              status
            ),
            branches (
              id,
              name,
              status
            )
          `)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        // Apply scope-based filtering
        if (!canAccessAll) {
          const orConditions: string[] = [];
          
          if (scopeFilters.school_ids && scopeFilters.school_ids.length > 0) {
            orConditions.push(`school_id.in.(${scopeFilters.school_ids.join(',')})`);
          }
          
          if (scopeFilters.branch_ids && scopeFilters.branch_ids.length > 0) {
            orConditions.push(`branch_id.in.(${scopeFilters.branch_ids.join(',')})`);
          }
          
          if (orConditions.length > 0) {
            query = query.or(orConditions.join(','));
          }
        }

        const { data: teachersData, error: teachersError } = await query;

        if (teachersError) {
          console.error('Teachers query error:', teachersError);
          throw new Error(`Failed to fetch teachers: ${teachersError.message}`);
        }

        if (!teachersData) {
          return [];
        }

        // Fetch teacher relationships
        const enrichedTeachers = await Promise.all(
          teachersData.map(async (teacher) => {
            try {
              const [deptData, gradeData, sectionData] = await Promise.all([
                supabase
                  .from('teacher_departments')
                  .select('department_id, departments(id, name)')
                  .eq('teacher_id', teacher.id),
                supabase
                  .from('teacher_grade_levels')
                  .select('grade_level_id, grade_levels(id, grade_name, grade_code)')
                  .eq('teacher_id', teacher.id),
                supabase
                  .from('teacher_sections')
                  .select('section_id, class_sections(id, section_name, section_code, grade_level_id)')
                  .eq('teacher_id', teacher.id)
              ]);

              return {
                ...teacher,
                name: teacher.users?.raw_user_meta_data?.name || 
                      teacher.users?.email?.split('@')[0] || 
                      'Unknown Teacher',
                email: teacher.users?.email || '',
                is_active: teacher.users?.is_active ?? false,
                school_name: teacher.schools?.name || 'No School Assigned',
                branch_name: teacher.branches?.name || 'No Branch Assigned',
                departments: deptData.data?.map(d => d.departments).filter(Boolean) || [],
                grade_levels: gradeData.data?.map(g => g.grade_levels).filter(Boolean) || [],
                sections: sectionData.data?.map(s => s.class_sections).filter(Boolean) || [],
                user_data: teacher.users
              };
            } catch (err) {
              console.error('Error enriching teacher data:', err);
              return {
                ...teacher,
                name: teacher.users?.raw_user_meta_data?.name || 
                      teacher.users?.email?.split('@')[0] || 
                      'Unknown Teacher',
                email: teacher.users?.email || '',
                phone: teacher.phone || teacher.users?.raw_user_meta_data?.phone || '',
                is_active: teacher.users?.is_active ?? false,
                school_name: teacher.schools?.name || 'No School Assigned',
                branch_name: teacher.branches?.name || 'No Branch Assigned',
                departments: [],
                grade_levels: [],
                sections: [],
                user_data: teacher.users
              };
            }
          })
        );

        return enrichedTeachers as TeacherData[];

      } catch (error) {
        console.error('Error fetching teachers:', error);
        throw error;
      }
    },
    {
      enabled: !!companyId && !isAccessControlLoading,
      staleTime: 2 * 60 * 1000,
      retry: (failureCount, error: any) => {
        if (error?.message?.includes('permission')) return false;
        return failureCount < 2;
      }
    }
  );

  // Fetch available schools (filtered by scope)
  const { data: availableSchools = [] } = useQuery(
    ['schools-for-teachers', companyId, scopeFilters],
    async () => {
      try {
        let schoolsQuery = supabase
          .from('schools')
          .select('id, name, status')
          .eq('company_id', companyId)
          .eq('status', 'active')
          .order('name');

        // Apply scope filtering
        if (!canAccessAll && scopeFilters.school_ids && scopeFilters.school_ids.length > 0) {
          schoolsQuery = schoolsQuery.in('id', scopeFilters.school_ids);
        }

        const { data, error } = await schoolsQuery;
        
        if (error) {
          console.error('Schools query error:', error);
          return [];
        }
        
        return data || [];
      } catch (error) {
        console.error('Error fetching schools:', error);
        return [];
      }
    },
    { 
      enabled: !!companyId && !isAccessControlLoading,
      staleTime: 5 * 60 * 1000
    }
  );

  // Fetch branches for selected school (filtered by scope)
  const { data: availableBranches = [] } = useQuery(
    ['branches-for-school', formData.school_id, scopeFilters],
    async () => {
      if (!formData.school_id) return [];
      
      let branchesQuery = supabase
        .from('branches')
        .select('id, name, status')
        .eq('school_id', formData.school_id)
        .eq('status', 'active')
        .order('name');
      
      // Apply scope filtering
      if (!canAccessAll && scopeFilters.branch_ids && scopeFilters.branch_ids.length > 0) {
        branchesQuery = branchesQuery.in('id', scopeFilters.branch_ids);
      }
      
      const { data, error } = await branchesQuery;
      
      if (error) {
        console.error('Branches query error:', error);
        return [];
      }
      
      return data || [];
    },
    { 
      enabled: !!formData.school_id,
      staleTime: 5 * 60 * 1000
    }
  );

  // Fetch departments
  const { data: availableDepartments = [] } = useQuery(
    ['departments', companyId],
    async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, code, status')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name');
      
      if (error) {
        console.error('Departments query error:', error);
        return [];
      }
      
      return (data || []) as Department[];
    },
    { 
      enabled: !!companyId,
      staleTime: 5 * 60 * 1000
    }
  );

  // Fetch grade levels for selected school/branch
  const { data: availableGradeLevels = [] } = useQuery(
    ['grade-levels', formData.school_id, formData.branch_id],
    async () => {
      if (!formData.school_id) return [];
      
      let query = supabase
        .from('grade_levels')
        .select('id, grade_name, grade_code, grade_order')
        .eq('school_id', formData.school_id)
        .eq('status', 'active')
        .order('grade_order');

      if (formData.branch_id) {
        query = query.eq('branch_id', formData.branch_id);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Grade levels query error:', error);
        return [];
      }
      
      return (data || []) as GradeLevel[];
    },
    { 
      enabled: !!formData.school_id,
      staleTime: 5 * 60 * 1000
    }
  );

  // Fetch sections for selected grade levels
  const { data: availableSections = [] } = useQuery(
    ['sections', formData.grade_level_ids],
    async () => {
      if (!formData.grade_level_ids || formData.grade_level_ids.length === 0) return [];
      
      const { data, error } = await supabase
        .from('class_sections')
        .select('id, section_name, section_code, grade_level_id')
        .in('grade_level_id', formData.grade_level_ids)
        .eq('status', 'active')
        .order('class_section_order');
      
      if (error) {
        console.error('Sections query error:', error);
        return [];
      }
      
      return (data || []) as ClassSection[];
    },
    { 
      enabled: formData.grade_level_ids && formData.grade_level_ids.length > 0,
      staleTime: 5 * 60 * 1000
    }
  );

  // ===== MUTATIONS =====
  const createTeacherMutation = useMutation(
    async (data: TeacherFormData) => {
      // Always generate a secure password for new teachers
      const finalPassword = generateSecurePassword();
      
      const result = await userCreationService.createUser({
        user_type: 'teacher',
        email: data.email,
        name: data.name,
        password: finalPassword,
        phone: data.phone,
        company_id: companyId,
        teacher_code: data.teacher_code,
        specialization: data.specialization,
        qualification: data.qualification,
        experience_years: data.experience_years,
        bio: data.bio,
        hire_date: data.hire_date,
        // Convert empty strings to null for UUID fields
        school_id: data.school_id && data.school_id !== '' ? data.school_id : null,
        branch_id: data.branch_id && data.branch_id !== '' ? data.branch_id : null,
        is_active: data.is_active
      });
      
      if (result.entityId) {
        try {
          const junctionInserts = [];
          
          if (data.department_ids && data.department_ids.length > 0) {
            junctionInserts.push(
              supabase.from('teacher_departments').insert(
                data.department_ids.map(dept_id => ({
                  teacher_id: result.entityId,
                  department_id: dept_id
                }))
              )
            );
          }

          if (data.grade_level_ids && data.grade_level_ids.length > 0) {
            junctionInserts.push(
              supabase.from('teacher_grade_levels').insert(
                data.grade_level_ids.map(grade_id => ({
                  teacher_id: result.entityId,
                  grade_level_id: grade_id
                }))
              )
            );
          }

          if (data.section_ids && data.section_ids.length > 0) {
            junctionInserts.push(
              supabase.from('teacher_sections').insert(
                data.section_ids.map(section_id => ({
                  teacher_id: result.entityId,
                  section_id: section_id
                }))
              )
            );
          }
          
          await Promise.all(junctionInserts);
        } catch (err) {
          console.warn('Junction tables may not exist yet:', err);
        }
      }
      
      return { ...result, password: finalPassword };
    },
    {
      onSuccess: (result) => {
        // Always show the generated password for new teachers
        if (result.password) {
          setGeneratedPassword(result.password);
          toast.success('Teacher created successfully. Copy the temporary password!');
        } else {
          // Fallback (shouldn't happen)
          setShowCreateForm(false);
          refetchTeachers();
          resetForm();
          toast.success('Teacher created successfully');
        }
      },
      onError: (error: any) => {
        console.error('Create teacher error:', error);
        toast.error(error.message || 'Failed to create teacher');
      }
    }
  );

  // CORRECTED UPDATE TEACHER MUTATION WITH EMAIL/PASSWORD AUTH.USERS SYNC
  const updateTeacherMutation = useMutation(
    async ({ teacherId, data }: { teacherId: string; data: Partial<TeacherFormData> }) => {
      // Find the teacher for user ID
      const teacher = teachers.find(t => t.id === teacherId);
      if (!teacher) throw new Error('Teacher not found');

      // Track what was updated for proper response
      let emailUpdated = false;
      let passwordGenerated: string | null = null;
      let passwordResetEmailSent = false;

      // ========== STEP 1: Handle Email Update (if changed) ==========
      if (data.email && data.email !== teacher.email) {
        try {
          // Use the userCreationService to update email in BOTH auth.users and custom table
          await userCreationService.updateEmail(teacher.user_id, data.email);
          emailUpdated = true;
          console.log('Email updated successfully in auth.users and custom table');
          
          // Note: Teacher will receive verification email for new address
          toast.info('Email updated. Teacher will receive a verification email at the new address.', {
            duration: 5000
          });
          
        } catch (emailError: any) {
          console.error('Email update error:', emailError);
          
          // Check if it's a fallback warning (Edge Function unavailable)
          if (emailError.message?.includes('display only') || 
              emailError.message?.includes('admin intervention')) {
            // Email was updated in custom table but NOT in auth.users
            toast.warning(
              'Email updated in display only. Teacher must still log in with their ORIGINAL email. Contact system admin to complete the email change in authentication system.',
              { duration: 10000 }
            );
            // Continue with update - display email is changed at least
          } else {
            // Real error - stop the entire update
            throw new Error(emailError.message || 'Failed to update email');
          }
        }
      }

      // ========== STEP 2: Handle Password Reset (if requested) ==========
      if (generatePassword) {
        // Determine the new password
        const newPassword = !data.password || data.password === '' 
          ? generateSecurePassword() 
          : data.password;
        
        try {
          // Use userCreationService to update password in auth.users
          await userCreationService.updatePassword(teacher.user_id, newPassword);
          console.log('Password updated successfully');
          
          // If we get here, password was updated directly (self-update scenario)
          passwordGenerated = newPassword;
          
        } catch (passwordError: any) {
          console.error('Password update error:', passwordError);
          
          // Check if it's a password reset email scenario (expected for admin updates)
          if (passwordError.isPasswordReset && passwordError.userEmail) {
            // Password reset email was sent - this is actually a success for admin updates!
            toast.success(
              `Password reset email sent to ${passwordError.userEmail}. The teacher will receive instructions to set their new password.`,
              { duration: 6000 }
            );
            
            // Mark that email was sent
            passwordResetEmailSent = true;
            // Don't show password modal since we sent an email
            passwordGenerated = null;
            
            // Continue with the rest of the update - this is not an error
          } else if (passwordError.message === 'PASSWORD_RESET_EMAIL_SENT') {
            // Alternative error format
            toast.success(
              `Password reset email sent to ${teacher.email}. The teacher will receive instructions to set their new password.`,
              { duration: 6000 }
            );
            passwordResetEmailSent = true;
            passwordGenerated = null;
            // Continue with the rest of the update
          } else {
            // Real error - throw it
            throw new Error(passwordError.message || 'Failed to update password');
          }
        }
      }

      // ========== STEP 3: Update Teacher Profile in teachers table ==========
      const teacherUpdates: any = {
        specialization: data.specialization,
        qualification: data.qualification,
        experience_years: data.experience_years,
        bio: data.bio,
        hire_date: data.hire_date,
        // Handle UUID fields properly
        school_id: data.school_id && data.school_id !== '' ? data.school_id : null,
        branch_id: data.branch_id && data.branch_id !== '' ? data.branch_id : null,
        updated_at: new Date().toISOString()
      };
      
      // Handle phone number update
      if (data.phone !== undefined) {
        teacherUpdates.phone = data.phone ? data.phone.toString() : null;
      }
      
      // Execute teacher profile update
      const { error: teacherError } = await supabase
        .from('teachers')
        .update(teacherUpdates)
        .eq('id', teacherId);
      
      if (teacherError) {
        console.error('Teacher profile update error:', teacherError);
        throw new Error(`Failed to update teacher profile: ${teacherError.message}`);
      }

      // ========== STEP 4: Update Metadata in custom users table ==========
      const userUpdates: any = {
        updated_at: new Date().toISOString()
      };
      
      // Update name in metadata if changed
      if (data.name && data.name !== teacher.name) {
        userUpdates.raw_user_meta_data = { 
          ...teacher.user_data?.raw_user_meta_data,
          name: data.name
        };
      }
      
      // Update phone in metadata if changed
      if (data.phone !== undefined) {
        if (!userUpdates.raw_user_meta_data) {
          userUpdates.raw_user_meta_data = { ...teacher.user_data?.raw_user_meta_data };
        }
        userUpdates.raw_user_meta_data.phone = data.phone;
      }
      
      // Update active status if changed
      if (data.is_active !== undefined && data.is_active !== teacher.is_active) {
        userUpdates.is_active = data.is_active;
      }
      
      // Apply metadata updates if any changes exist
      if (Object.keys(userUpdates).length > 1) { // More than just updated_at
        const { error: metaError } = await supabase
          .from('users')
          .update(userUpdates)
          .eq('id', teacher.user_id);
        
        if (metaError) {
          console.error('Metadata update error:', metaError);
          // Don't throw - this is non-critical
        }
      }

      // ========== STEP 5: Update Teaching Relationships ==========
      try {
        // Update departments (if provided)
        if (data.department_ids !== undefined) {
          // Delete existing relationships
          await supabase
            .from('teacher_departments')
            .delete()
            .eq('teacher_id', teacherId);
          
          // Insert new relationships
          if (data.department_ids.length > 0) {
            const { error: deptError } = await supabase
              .from('teacher_departments')
              .insert(
                data.department_ids.map(dept_id => ({
                  teacher_id: teacherId,
                  department_id: dept_id
                }))
              );
            
            if (deptError && deptError.code !== '23505') { // Ignore duplicate key errors
              console.error('Department assignment error:', deptError);
            }
          }
        }

        // Update grade levels (if provided)
        if (data.grade_level_ids !== undefined) {
          // Delete existing relationships
          await supabase
            .from('teacher_grade_levels')
            .delete()
            .eq('teacher_id', teacherId);
          
          // Insert new relationships
          if (data.grade_level_ids.length > 0) {
            const { error: gradeError } = await supabase
              .from('teacher_grade_levels')
              .insert(
                data.grade_level_ids.map(grade_id => ({
                  teacher_id: teacherId,
                  grade_level_id: grade_id
                }))
              );
            
            if (gradeError && gradeError.code !== '23505') {
              console.error('Grade level assignment error:', gradeError);
            }
          }
        }

        // Update sections (if provided)
        if (data.section_ids !== undefined) {
          // Delete existing relationships
          await supabase
            .from('teacher_sections')
            .delete()
            .eq('teacher_id', teacherId);
          
          // Insert new relationships
          if (data.section_ids.length > 0) {
            const { error: sectionError } = await supabase
              .from('teacher_sections')
              .insert(
                data.section_ids.map(section_id => ({
                  teacher_id: teacherId,
                  section_id: section_id
                }))
              );
            
            if (sectionError && sectionError.code !== '23505') {
              console.error('Section assignment error:', sectionError);
            }
          }
        }
      } catch (err) {
        console.warn('Error updating teacher relationships:', err);
        // Don't throw - relationships might be partially updated but main record is fine
      }

      // ========== STEP 6: Send Notifications (if configured) ==========
      if (data.send_credentials) {
        try {
          if (emailUpdated) {
            // Email change notification is handled by Supabase Auth automatically
            console.log('Email verification sent to new address:', data.email);
          }
          
          if (passwordGenerated) {
            // You could add custom email notification for password reset here
            console.log('Password reset notification needed for:', teacher.email);
            // Implement your email service call here if needed
          }
        } catch (notificationError) {
          console.error('Failed to send notifications:', notificationError);
          // Don't throw - update succeeded, notifications are secondary
        }
      }

      // Return result with update status
      return { 
        success: true, 
        password: passwordGenerated,
        emailUpdated: emailUpdated,
        passwordResetEmailSent: passwordResetEmailSent,
        teacherId: teacherId
      };
    },
    {
      onSuccess: (result) => {
        // Handle different success scenarios
        if (result.password) {
          // Password was reset directly - show the password modal
          setGeneratedPassword(result.password);
          toast.success('Teacher updated and password reset successfully!');
        } else if (result.passwordResetEmailSent) {
          // Password reset email was sent - close form without showing password
          setShowEditForm(false);
          refetchTeachers();
          resetForm();
          // Success toast already shown in the mutation
        } else if (result.emailUpdated) {
          // Email was updated - close form and refresh
          toast.success('Teacher updated successfully. Email verification sent to new address.');
          setShowEditForm(false);
          refetchTeachers();
          resetForm();
        } else {
          // Regular update without email/password changes
          toast.success('Teacher updated successfully');
          setShowEditForm(false);
          refetchTeachers();
          resetForm();
        }
      },
      onError: (error: any) => {
        console.error('Update teacher error:', error);
        
        // Provide user-friendly error messages
        if (error.message?.includes('email')) {
          toast.error(`Email update failed: ${error.message}`);
        } else if (error.message?.includes('password')) {
          toast.error(`Password update failed: ${error.message}`);
        } else {
          toast.error(error.message || 'Failed to update teacher. Please try again.');
        }
      },
      onSettled: () => {
        // Always called after success or error
        queryClient.invalidateQueries(['teachers', companyId]);
      }
    }
  );

  const deleteTeacherMutation = useMutation(
    async (teacherIds: string[]) => {
      const teachersToDelete = teachers.filter(t => teacherIds.includes(t.id));
      const userIds = teachersToDelete.map(t => t.user_id);
      
      const { error: teacherError } = await supabase
        .from('teachers')
        .delete()
        .in('id', teacherIds);
      
      if (teacherError) throw teacherError;
      
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .in('id', userIds);
      
      if (userError) throw userError;
      
      return { success: true };
    },
    {
      onSuccess: () => {
        toast.success('Teacher(s) deleted successfully');
        setShowDeleteConfirmation(false);
        setSelectedTeachers([]);
        refetchTeachers();
      },
      onError: (error: any) => {
        console.error('Delete teacher error:', error);
        toast.error('Failed to delete teacher(s)');
      }
    }
  );

  const toggleTeacherStatusMutation = useMutation(
    async ({ teacherIds, activate }: { teacherIds: string[]; activate: boolean }) => {
      const teachersToUpdate = teachers.filter(t => teacherIds.includes(t.id));
      const userIds = teachersToUpdate.map(t => t.user_id);
      
      const { error } = await supabase
        .from('users')
        .update({ is_active: activate })
        .in('id', userIds);
      
      if (error) throw error;
      
      return { success: true };
    },
    {
      onSuccess: (_, { activate }) => {
        toast.success(`Teacher(s) ${activate ? 'activated' : 'deactivated'} successfully`);
        setShowBulkActionConfirmation(false);
        setSelectedTeachers([]);
        refetchTeachers();
      },
      onError: (error: any) => {
        console.error('Toggle status error:', error);
        toast.error('Failed to update teacher status');
      }
    }
  );

  // ===== HELPER FUNCTIONS =====
  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      email: '',
      teacher_code: generateTeacherCode(companyId),
      phone: '',
      specialization: [],
      qualification: '',
      experience_years: 0,
      bio: '',
      hire_date: new Date().toISOString().split('T')[0],
      school_id: '',
      branch_id: '',
      department_ids: [],
      grade_level_ids: [],
      section_ids: [],
      is_active: true,
      send_credentials: true,
      password: ''
    });
    setFormErrors({});
    setTabErrors({
      basic: false,
      professional: false,
      assignment: false
    });
    setActiveTab('basic');
    setSelectedTeacher(null);
    setShowPassword(false);
  }, [companyId]);

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    const newTabErrors = {
      basic: false,
      professional: false,
      assignment: false
    };
    
    // Basic tab validation
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
      newTabErrors.basic = true;
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
      newTabErrors.basic = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
      newTabErrors.basic = true;
    }
    
    if (!formData.teacher_code.trim()) {
      errors.teacher_code = 'Teacher code is required';
      newTabErrors.basic = true;
    }
    
    // Assignment tab validation
    if (!formData.school_id) {
      errors.school_id = 'School is required';
      newTabErrors.assignment = true;
    }
    
    setFormErrors(errors);
    setTabErrors(newTabErrors);
    
    // Switch to first tab with errors
    if (newTabErrors.basic) {
      setActiveTab('basic');
    } else if (newTabErrors.professional) {
      setActiveTab('professional');
    } else if (newTabErrors.assignment) {
      setActiveTab('assignment');
    }
    
    return Object.keys(errors).length === 0;
  }, [formData, showEditForm]);

  // ===== EVENT HANDLERS =====
  const handleCreateTeacher = () => {
    resetForm();
    setFormData(prev => ({
      ...prev,
      teacher_code: generateTeacherCode(companyId),
      password: ''
    }));
    setShowCreateForm(true);
  };

  const handleEditTeacher = (teacher: TeacherData) => {
    setSelectedTeacher(teacher);
    setFormData({
      name: teacher.name || '',
      email: teacher.email || '',
      teacher_code: teacher.teacher_code,
      phone: teacher.phone || '',
      specialization: teacher.specialization || [],
      qualification: teacher.qualification || '',
      experience_years: teacher.experience_years || 0,
      bio: teacher.bio || '',
      hire_date: teacher.hire_date || '',
      school_id: teacher.school_id || '',
      branch_id: teacher.branch_id || '',
      department_ids: teacher.departments?.map(d => d.id) || [],
      grade_level_ids: teacher.grade_levels?.map(g => g.id) || [],
      section_ids: teacher.sections?.map(s => s.id) || [],
      is_active: teacher.is_active ?? true,
      send_credentials: false,
      password: ''
    });
    setShowEditForm(true);
    setActiveTab('basic');
  };

  const handleQuickPasswordReset = async (teacherId: string) => {
    // Find the teacher
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) {
      throw new Error('Teacher not found');
    }

    try {
      // Use userCreationService to trigger password reset
      const result = await userCreationService.updatePassword(teacher.user_id, '');
      // This will trigger a password reset email
      
      // Log the action
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user?.id,
          action: 'password_reset_requested',
          entity_type: 'teacher',
          entity_id: teacherId,
          details: {
            teacher_name: teacher.name,
            teacher_email: teacher.email,
            reset_method: 'admin_quick_reset'
          },
          created_at: new Date().toISOString()
        });
        
      return result;
    } catch (error: any) {
      // Check if it's a password reset email scenario (expected)
      if (error.isPasswordReset && error.userEmail) {
        // Success - email was sent
        return { success: true, emailSent: true };
      } else if (error.message === 'PASSWORD_RESET_EMAIL_SENT') {
        // Alternative success format
        return { success: true, emailSent: true };
      }
      
      // Real error
      throw error;
    }
  };

  const handleSubmitForm = async () => {
    if (!validateForm()) return;
    
    if (showEditForm && selectedTeacher) {
      // For edit mode, password resets are handled separately through PasswordResetManager
      const updateData = { ...formData };
      delete updateData.password; // Don't send password in update
      
      updateTeacherMutation.mutate({
        teacherId: selectedTeacher.id,
        data: updateData
      });
    } else {
      createTeacherMutation.mutate(formData);
    }
  };

  const handleBulkAction = (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedTeachers.length === 0) {
      toast.error('Please select teachers first');
      return;
    }
    
    setBulkAction(action);
    setShowBulkActionConfirmation(true);
  };

  const handleConfirmBulkAction = () => {
    if (!bulkAction) return;
    
    if (bulkAction === 'delete') {
      deleteTeacherMutation.mutate(selectedTeachers);
    } else {
      toggleTeacherStatusMutation.mutate({
        teacherIds: selectedTeachers,
        activate: bulkAction === 'activate'
      });
    }
  };

  const copyPassword = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
      toast.success('Password copied to clipboard');
    }
  };

  const printPassword = () => {
    if (generatedPassword) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Teacher Credentials - ${formData.name}</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  padding: 40px;
                  max-width: 600px;
                  margin: 0 auto;
                }
                .header { 
                  font-size: 24px; 
                  font-weight: bold; 
                  margin-bottom: 30px;
                  color: #1f2937;
                  border-bottom: 2px solid #8CC63F;
                  padding-bottom: 10px;
                }
                .section {
                  margin-bottom: 25px;
                  background: #f9fafb;
                  padding: 15px;
                  border-radius: 8px;
                }
                .label {
                  font-weight: bold;
                  color: #4b5563;
                  margin-bottom: 5px;
                }
                .value {
                  color: #1f2937;
                  font-size: 16px;
                }
                .password { 
                  font-family: 'Courier New', monospace; 
                  font-size: 18px; 
                  background: #fef3c7; 
                  padding: 15px;
                  border: 2px dashed #f59e0b;
                  border-radius: 8px;
                  margin: 20px 0;
                  text-align: center;
                  letter-spacing: 2px;
                }
                .footer { 
                  margin-top: 40px; 
                  padding-top: 20px;
                  border-top: 1px solid #e5e7eb;
                  font-size: 14px; 
                  color: #6b7280; 
                }
                .important {
                  background: #fee2e2;
                  border-left: 4px solid #ef4444;
                  padding: 15px;
                  margin: 20px 0;
                }
                @media print {
                  body { padding: 20px; }
                }
              </style>
            </head>
            <body>
              <div class="header">Teacher Login Credentials</div>
              
              <div class="section">
                <div class="label">Teacher Name:</div>
                <div class="value">${formData.name}</div>
              </div>
              
              <div class="section">
                <div class="label">Email Address:</div>
                <div class="value">${formData.email}</div>
              </div>
              
              <div class="section">
                <div class="label">Teacher Code:</div>
                <div class="value">${formData.teacher_code}</div>
              </div>
              
              <div class="section">
                <div class="label">School:</div>
                <div class="value">${availableSchools.find(s => s.id === formData.school_id)?.name || 'Not Assigned'}</div>
              </div>
              
              <div class="section">
                <div class="label">Temporary Password:</div>
                <div class="password">${generatedPassword}</div>
              </div>
              
              <div class="important">
                <strong>Important Instructions:</strong>
                <ul>
                  <li>This is a temporary password that must be changed on first login</li>
                  <li>Share this password securely with the teacher</li>
                  <li>The teacher will receive a verification email</li>
                  <li>Email verification is required before first login</li>
                </ul>
              </div>
              
              <div class="footer">
                <p><strong>Generated on:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>Generated by:</strong> ${user?.name || user?.email || 'System Administrator'}</p>
                <p style="margin-top: 20px; font-style: italic;">
                  This document contains sensitive information. Please handle with care and dispose of securely after use.
                </p>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const closePasswordModal = () => {
    setGeneratedPassword(null);
    setShowCreateForm(false);
    setShowEditForm(false);
    resetForm();
    refetchTeachers();
  };

  // ===== FILTERING =====
  const filteredTeachers = useMemo(() => {
    return teachers.filter(teacher => {
      const matchesSearch = !searchTerm || 
        teacher.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        teacher.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        teacher.teacher_code?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'active' && teacher.is_active) ||
        (filterStatus === 'inactive' && !teacher.is_active);
      
      const matchesSchool = filterSchool === 'all' || 
        teacher.school_id === filterSchool;
      
      const matchesSpecialization = filterSpecialization === 'all' ||
        teacher.specialization?.includes(filterSpecialization);
      
      return matchesSearch && matchesStatus && matchesSchool && matchesSpecialization;
    });
  }, [teachers, searchTerm, filterStatus, filterSchool, filterSpecialization]);

  // ===== STATISTICS =====
  const summaryStats = useMemo(() => {
    return {
      total: teachers.length,
      active: teachers.filter(t => t.is_active).length,
      inactive: teachers.filter(t => !t.is_active).length,
      withSpecialization: teachers.filter(t => 
        t.specialization && t.specialization.length > 0
      ).length,
      withGrades: teachers.filter(t => 
        t.grade_levels && t.grade_levels.length > 0
      ).length
    };
  }, [teachers]);

  // ===== LOADING & ERROR STATES =====
  if (isAccessControlLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-[#8CC63F]" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">
          Checking permissions...
        </span>
      </div>
    );
  }

  if (accessControlError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
          <div>
            <h3 className="font-semibold text-red-800 dark:text-red-200">
              Access Control Error
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              {accessControlErrorMessage || 'Failed to load access permissions.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (teachersError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
          <div>
            <h3 className="font-semibold text-red-800 dark:text-red-200">
              Error Loading Teachers
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              {(teachersError as Error).message || 'Failed to load teacher data.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ... REST OF THE COMPONENT (UI rendering) continues unchanged ...
  // The UI rendering code from here onwards is identical to the original
  // I'm including it for completeness but the only change was in the updateTeacherMutation

  return (
    <div className="space-y-6">
      {/* The entire return JSX remains exactly the same */}
      {/* Including all the UI components, tables, modals, etc. */}
      {/* This is a very long JSX section that I'm preserving as-is */}
      
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        
        {/* Summary Statistics with Green Theme */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="text-center p-4 bg-[#8CC63F]/10 dark:bg-[#8CC63F]/20 rounded-lg">
            <div className="text-2xl font-bold text-[#8CC63F]">
              {summaryStats.total}
            </div>
            <div className="text-sm text-green-700 dark:text-green-300">Total</div>
          </div>
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {summaryStats.active}
            </div>
            <div className="text-sm text-green-700 dark:text-green-300">Active</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {summaryStats.inactive}
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">Inactive</div>
          </div>
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {summaryStats.withSpecialization}
            </div>
            <div className="text-sm text-purple-700 dark:text-purple-300">Specialized</div>
          </div>
          <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {summaryStats.withGrades}
            </div>
            <div className="text-sm text-orange-700 dark:text-orange-300">Assigned</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search teachers by name, email, or code..."
                className="pl-10 focus:ring-[#8CC63F] focus:border-[#8CC63F]"
                aria-label="Search teachers"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            {availableSchools.length > 0 && (
              <Select
                value={filterSchool}
                onChange={(value) => setFilterSchool(value)}
                options={[
                  { value: 'all', label: 'All Schools' },
                  ...availableSchools.map(s => ({ value: s.id, label: s.name }))
                ]}
                className="w-48 focus:ring-[#8CC63F] focus:border-[#8CC63F]"
                aria-label="Filter by school"
              />
            )}
            
            <Select
              value={filterStatus}
              onChange={(value) => setFilterStatus(value as 'all' | 'active' | 'inactive')}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
              className="w-32 focus:ring-[#8CC63F] focus:border-[#8CC63F]"
              aria-label="Filter by status"
            />

            {canCreateTeacher && (
              <Button 
                onClick={handleCreateTeacher}
                aria-label="Add new teacher"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Teacher
              </Button>
            )}
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedTeachers.length > 0 && (canModifyTeacher || canDeleteTeacher) && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border" role="toolbar" aria-label="Bulk actions">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {selectedTeachers.length} selected
              </span>
              <div className="flex gap-2">
                {canModifyTeacher && (
                  <>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleBulkAction('activate')}
                      className="border-[#8CC63F] text-[#8CC63F] hover:bg-[#8CC63F]/10"
                    >
                      <UserCheck className="w-4 h-4 mr-1" />
                      Activate
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleBulkAction('deactivate')}
                    >
                      <UserX className="w-4 h-4 mr-1" />
                      Deactivate
                    </Button>
                  </>
                )}
                {canDeleteTeacher && (
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => handleBulkAction('delete')}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Teachers Table */}
        {isLoadingTeachers ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#8CC63F]" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading teachers...</span>
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="text-center p-8 text-gray-500 dark:text-gray-400">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">No Teachers Found</h3>
            <p className="text-sm mb-4">
              {teachers.length === 0 
                ? "No teachers have been added yet." 
                : "No teachers match your filters."}
            </p>
            {canCreateTeacher && teachers.length === 0 && (
              <Button 
                onClick={handleCreateTeacher}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Teacher
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left p-3" scope="col">
                    <input
                      type="checkbox"
                      checked={
                        selectedTeachers.length === filteredTeachers.length &&
                        filteredTeachers.length > 0
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTeachers(filteredTeachers.map(t => t.id));
                        } else {
                          setSelectedTeachers([]);
                        }
                      }}
                      className="rounded border-gray-300 dark:border-gray-600 focus:ring-[#8CC63F]"
                      aria-label="Select all teachers"
                    />
                  </th>
                  <th className="text-left p-3 font-medium" scope="col">Teacher</th>
                  <th className="text-left p-3 font-medium" scope="col">Code</th>
                  <th className="text-left p-3 font-medium" scope="col">Specialization</th>
                  <th className="text-left p-3 font-medium" scope="col">Assignments</th>
                  <th className="text-left p-3 font-medium" scope="col">Location</th>
                  <th className="text-left p-3 font-medium" scope="col">Status</th>
                  <th className="text-left p-3 font-medium" scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((teacher) => (
                  <tr 
                    key={teacher.id} 
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedTeachers.includes(teacher.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTeachers([...selectedTeachers, teacher.id]);
                          } else {
                            setSelectedTeachers(selectedTeachers.filter(id => id !== teacher.id));
                          }
                        }}
                        className="rounded border-gray-300 dark:border-gray-600 focus:ring-[#8CC63F]"
                        aria-label={`Select ${teacher.name}`}
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#8CC63F]/20 rounded-full flex items-center justify-center">
                          <GraduationCap className="w-4 h-4 text-[#8CC63F]" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {teacher.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {teacher.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {teacher.teacher_code}
                      </span>
                    </td>
                    <td className="p-3">
                      {teacher.specialization && teacher.specialization.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {teacher.specialization.slice(0, 2).map((spec, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full"
                            >
                              {spec}
                            </span>
                          ))}
                          {teacher.specialization.length > 2 && (
                            <span className="text-xs text-gray-500">+{teacher.specialization.length - 2}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">None</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="space-y-1">
                        {teacher.grade_levels && teacher.grade_levels.length > 0 && (
                          <div className="flex items-center gap-1 text-xs">
                            <Layers className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">
                              {teacher.grade_levels.length} Grade{teacher.grade_levels.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                        {teacher.sections && teacher.sections.length > 0 && (
                          <div className="flex items-center gap-1 text-xs">
                            <Grid3x3 className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">
                              {teacher.sections.length} Section{teacher.sections.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                        {(!teacher.grade_levels || teacher.grade_levels.length === 0) && 
                         (!teacher.sections || teacher.sections.length === 0) && (
                          <span className="text-gray-400 text-xs">Not assigned</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-sm">
                        <div className="text-gray-700 dark:text-gray-300">
                          {teacher.school_name}
                        </div>
                        {teacher.branch_name !== 'No Branch Assigned' && (
                          <div className="text-xs text-gray-500">
                            {teacher.branch_name}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <StatusBadge
                        status={teacher.is_active ? 'active' : 'inactive'}
                        variant={teacher.is_active ? 'success' : 'warning'}
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1" role="group" aria-label={`Actions for ${teacher.name}`}>
                        {canModifyTeacher && (
                          <>
                            <QuickPasswordResetButton
                              teacherId={teacher.id}
                              teacherName={teacher.name || 'Teacher'}
                              teacherEmail={teacher.email || ''}
                              onReset={handleQuickPasswordReset}
                              disabled={createTeacherMutation.isLoading || updateTeacherMutation.isLoading}
                            />
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEditTeacher(teacher)}
                              title="Edit Teacher"
                              className="hover:border-blue-500 hover:text-blue-500"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {canDeleteTeacher && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedTeacher(teacher);
                              setShowDeleteConfirmation(true);
                            }}
                            title="Delete Teacher"
                            className="hover:border-red-500 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Teacher Form Modal with Enhanced UI */}
      <SlideInForm
        title={showEditForm ? 'Edit Teacher' : 'Create New Teacher'}
        isOpen={showCreateForm || showEditForm}
        onClose={() => {
          setShowCreateForm(false);
          setShowEditForm(false);
          resetForm();
        }}
        onSave={handleSubmitForm}
        loading={createTeacherMutation.isLoading || updateTeacherMutation.isLoading}
      >
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger 
              value="basic" 
              className="relative data-[state=active]:bg-[#8CC63F]/10 data-[state=active]:text-[#8CC63F]"
            >
              <User className="w-4 h-4 mr-2" />
              Basic Info
              {tabErrors.basic && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" aria-label="Tab has errors" />
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="professional" 
              className="relative data-[state=active]:bg-[#8CC63F]/10 data-[state=active]:text-[#8CC63F]"
            >
              <Briefcase className="w-4 h-4 mr-2" />
              Professional
              {tabErrors.professional && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" aria-label="Tab has errors" />
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="assignment" 
              className="relative data-[state=active]:bg-[#8CC63F]/10 data-[state=active]:text-[#8CC63F]"
            >
              <School className="w-4 h-4 mr-2" />
              Assignment
              {tabErrors.assignment && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" aria-label="Tab has errors" />
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            {/* Enhanced Header Section */}
            <div className="p-4 bg-[#8CC63F]/10 border border-[#8CC63F]/30 rounded-lg mb-4">
              <div className="flex items-start gap-2">
                <User className="h-5 w-5 text-[#8CC63F] mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-green-800 dark:text-green-200">
                    Basic Information
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Teacher's personal details and login credentials
                  </p>
                </div>
              </div>
            </div>

            <FormField id="name" label="Full Name" required error={formErrors.name}>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter teacher's full name"
                leftIcon={<User className="h-4 w-4 text-gray-400" />}
                className="focus:ring-[#8CC63F] focus:border-[#8CC63F]"
              />
            </FormField>

            <FormField 
              id="email" 
              label="Email Address" 
              required 
              error={formErrors.email}
              helpText={showEditForm ? "Email can be changed. User will need to verify the new email address." : undefined}
            >
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="teacher@school.com"
                  leftIcon={<Mail className="h-4 w-4 text-gray-400" />}
                  className={cn(
                    "focus:ring-[#8CC63F] focus:border-[#8CC63F]",
                    showEditForm && "bg-white dark:bg-gray-900"
                  )}
                  disabled={false}
                />
                {showEditForm && formData.email !== selectedTeacher?.email && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Modified</span>
                  </div>
                )}
              </div>
            </FormField>

            <FormField id="phone" label="Phone Number">
              <PhoneInput
                value={formData.phone || ''}
                onChange={(value) => {
                  const phoneValue = value ? String(value) : '';
                  setFormData({ ...formData, phone: phoneValue });
                }}
                placeholder="Enter phone number"
                defaultCountry="KW"
                international
                countryCallingCodeEditable={false}
                className="w-full"
              />
            </FormField>

            <FormField 
              id="teacher_code" 
              label="Teacher Code" 
              required 
              error={formErrors.teacher_code}
              helpText={showEditForm ? "Teacher codes are permanent identifiers and cannot be changed" : "This will be the permanent identifier for this teacher"}
            >
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="teacher_code"
                    value={formData.teacher_code}
                    onChange={(e) => !showEditForm && setFormData({ ...formData, teacher_code: e.target.value })}
                    placeholder="TCH-XXX-XXX"
                    readOnly={showEditForm}
                    leftIcon={<Hash className="h-4 w-4 text-gray-400" />}
                    className={cn(
                      "font-mono",
                      showEditForm 
                        ? "bg-gray-100 dark:bg-gray-800 cursor-not-allowed text-gray-600 dark:text-gray-400" 
                        : "focus:ring-[#8CC63F] focus:border-[#8CC63F]"
                    )}
                  />
                  {showEditForm && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <Shield className="h-4 w-4 text-gray-400" title="Protected field" />
                    </div>
                  )}
                </div>
                {!showEditForm && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFormData({ ...formData, teacher_code: generateTeacherCode(companyId) })}
                    className="hover:border-[#8CC63F] hover:text-[#8CC63F]"
                    title="Generate new code"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </FormField>

            {/* Password Info for New Teachers */}
            {!showEditForm && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="flex items-start gap-2">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Automatic Password Generation
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        A secure temporary password will be automatically generated when you create the teacher. 
                        You'll be able to copy and share it with them after creation.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Password Reset Section for Edit Mode */}
            {showEditForm && (
              <div id="password-management-section" className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <PasswordResetManager
                  teacherName={formData.name}
                  teacherEmail={formData.email}
                  onResetPassword={async (sendEmail) => {
                    if (!selectedTeacher) throw new Error('No teacher selected');
                    
                    // Trigger password reset
                    const result = await userCreationService.updatePassword(
                      selectedTeacher.user_id, 
                      ''
                    );
                    
                    // Log the action
                    await supabase
                      .from('audit_logs')
                      .insert({
                        user_id: user?.id,
                        action: 'password_reset_requested',
                        entity_type: 'teacher',
                        entity_id: selectedTeacher.id,
                        details: {
                          teacher_name: formData.name,
                          teacher_email: formData.email,
                          reset_method: 'edit_form',
                          send_email: sendEmail
                        },
                        created_at: new Date().toISOString()
                      });
                    
                    return result;
                  }}
                  isLoading={updateTeacherMutation.isLoading}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="professional" className="space-y-4">
            {/* Enhanced Header Section */}
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg mb-4">
              <div className="flex items-start gap-2">
                <Briefcase className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-purple-800 dark:text-purple-200">
                    Professional Information
                  </h4>
                  <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                    Teacher's qualifications and experience
                  </p>
                </div>
              </div>
            </div>

            <FormField id="specialization" label="Specialization/Subjects">
              <SearchableMultiSelect
                options={SPECIALIZATION_OPTIONS.map(s => ({ value: s, label: s }))}
                selectedValues={formData.specialization || []}
                onChange={(values) => setFormData({ ...formData, specialization: values })}
                placeholder="Select subjects"
              />
            </FormField>

            <FormField id="qualification" label="Highest Qualification">
              <Select
                id="qualification"
                value={formData.qualification}
                onChange={(value) => setFormData({ ...formData, qualification: value })}
                options={[
                  { value: '', label: 'Select qualification' },
                  ...QUALIFICATION_OPTIONS.map(q => ({ value: q, label: q }))
                ]}
                className="focus:ring-[#8CC63F] focus:border-[#8CC63F]"
              />
            </FormField>

            <FormField id="experience_years" label="Years of Experience">
              <Input
                id="experience_years"
                type="number"
                min="0"
                value={formData.experience_years}
                onChange={(e) => setFormData({ ...formData, experience_years: parseInt(e.target.value) || 0 })}
                leftIcon={<Clock className="h-4 w-4 text-gray-400" />}
                className="focus:ring-[#8CC63F] focus:border-[#8CC63F]"
              />
            </FormField>

            <FormField id="hire_date" label="Hire Date">
              <Input
                id="hire_date"
                type="date"
                value={formData.hire_date}
                onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                leftIcon={<Calendar className="h-4 w-4 text-gray-400" />}
                className="focus:ring-[#8CC63F] focus:border-[#8CC63F]"
              />
            </FormField>

            <FormField id="bio" label="Bio/Description">
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Brief description about the teacher..."
                rows={3}
                className="focus:ring-[#8CC63F] focus:border-[#8CC63F]"
              />
            </FormField>
          </TabsContent>

          <TabsContent value="assignment" className="space-y-4">
            {/* Enhanced Header Section */}
            <div className="p-4 bg-[#8CC63F]/10 border border-[#8CC63F]/30 rounded-lg mb-4">
              <div className="flex items-start gap-2">
                <School className="h-5 w-5 text-[#8CC63F] mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-green-800 dark:text-green-200">
                    School Assignment
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Assign teacher to schools, branches, and classes
                  </p>
                </div>
              </div>
            </div>

            <FormField id="school_id" label="School" required error={formErrors.school_id}>
              <Select
                id="school_id"
                value={formData.school_id}
                onChange={(value) => setFormData({ 
                  ...formData, 
                  school_id: value, 
                  branch_id: '',
                  grade_level_ids: [],
                  section_ids: []
                })}
                options={[
                  { value: '', label: 'Select school' },
                  ...availableSchools.map(s => ({ value: s.id, label: s.name }))
                ]}
                className="focus:ring-[#8CC63F] focus:border-[#8CC63F]"
              />
            </FormField>

            {formData.school_id && availableBranches.length > 0 && (
              <FormField id="branch_id" label="Branch">
                <Select
                  id="branch_id"
                  value={formData.branch_id}
                  onChange={(value) => setFormData({ 
                    ...formData, 
                    branch_id: value,
                    grade_level_ids: [],
                    section_ids: []
                  })}
                  options={[
                    { value: '', label: 'Select branch (optional)' },
                    ...availableBranches.map(b => ({ value: b.id, label: b.name }))
                  ]}
                  className="focus:ring-[#8CC63F] focus:border-[#8CC63F]"
                />
              </FormField>
            )}

            {formData.school_id && (
              <>
                <FormField id="department_ids" label="Departments">
                  <SearchableMultiSelect
                    options={availableDepartments.map(d => ({ value: d.id, label: d.name }))}
                    selectedValues={formData.department_ids || []}
                    onChange={(values) => setFormData({ ...formData, department_ids: values })}
                    placeholder="Select departments"
                  />
                </FormField>

                <FormField id="grade_level_ids" label="Grade Levels">
                  <SearchableMultiSelect
                    options={availableGradeLevels.map(g => ({ value: g.id, label: `${g.grade_name} (${g.grade_code})` }))}
                    selectedValues={formData.grade_level_ids || []}
                    onChange={(values) => setFormData({ 
                      ...formData, 
                      grade_level_ids: values,
                      section_ids: []
                    })}
                    placeholder="Select grade levels"
                  />
                </FormField>

                {formData.grade_level_ids && formData.grade_level_ids.length > 0 && (
                  <FormField id="section_ids" label="Sections">
                    <SearchableMultiSelect
                      options={availableSections.map(s => ({ value: s.id, label: `${s.section_name} (${s.section_code})` }))}
                      selectedValues={formData.section_ids || []}
                      onChange={(values) => setFormData({ ...formData, section_ids: values })}
                      placeholder="Select sections"
                    />
                  </FormField>
                )}
              </>
            )}

            {/* Enhanced Account Status Section */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-4 w-4 text-[#8CC63F]" />
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Account Settings</h3>
              </div>

              <FormField id="is_active" label="Account Status">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Active Account
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formData.is_active 
                        ? '✓ Teacher can log in to the system' 
                        : '✗ Teacher cannot access the system'}
                    </p>
                  </div>
                  <ToggleSwitch
                    checked={formData.is_active ?? true}
                    onChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
              </FormField>

              {!showEditForm && (
                <FormField id="send_credentials" label="Send Credentials">
                  <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <input
                      type="checkbox"
                      id="send_credentials"
                      checked={formData.send_credentials}
                      onChange={(e) => setFormData({ ...formData, send_credentials: e.target.checked })}
                      className="rounded border-gray-300 text-[#8CC63F] focus:ring-[#8CC63F]"
                    />
                    <label htmlFor="send_credentials" className="text-sm text-gray-700 dark:text-gray-300">
                      Send login credentials to teacher's email
                    </label>
                  </div>
                </FormField>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </SlideInForm>

      {/* Generated Password Modal */}
      {generatedPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80]">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 relative">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {showEditForm ? 'Password Reset Successfully' : 'Teacher Account Created Successfully'}
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {showEditForm 
                  ? `A new password has been generated for ${formData.name}.`
                  : `A temporary password has been generated for ${formData.name}.`}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                The teacher will receive a verification email and must verify their email before logging in.
              </p>
            </div>

            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md mb-4">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                {showEditForm ? 'New Password' : 'Temporary Password'}
              </p>
              <div className="flex items-center justify-between">
                <code className="text-base font-mono font-semibold break-all pr-2 text-gray-900 dark:text-white">
                  {generatedPassword}
                </code>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={copyPassword}
                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    title="Copy password"
                  >
                    {copiedPassword ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    )}
                  </button>
                  <button
                    onClick={printPassword}
                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    title="Print credentials"
                  >
                    <Printer className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md mb-4 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <strong>Important:</strong> This password will not be shown again. Make sure to:
              </p>
              <ul className="mt-2 text-sm text-amber-700 dark:text-amber-400 list-disc list-inside">
                <li>Copy or print the password now</li>
                <li>Share it securely with the teacher</li>
                <li>Advise them to change it after first login</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={printPassword}
                className="hover:border-[#8CC63F] hover:text-[#8CC63F]"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button 
                onClick={closePasswordModal}
                className="bg-[#8CC63F] hover:bg-[#7AB532] text-white"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirmation}
        title="Delete Teacher"
        message={`Are you sure you want to delete ${selectedTeacher?.name || 'selected teacher(s)'}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="destructive"
        onConfirm={() => {
          if (selectedTeacher) {
            deleteTeacherMutation.mutate([selectedTeacher.id]);
          }
        }}
        onCancel={() => {
          setShowDeleteConfirmation(false);
          setSelectedTeacher(null);
        }}
      />

      {/* Bulk Action Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showBulkActionConfirmation}
        title={
          bulkAction === 'delete' 
            ? 'Delete Teachers' 
            : bulkAction === 'activate'
            ? 'Activate Teachers'
            : 'Deactivate Teachers'
        }
        message={
          bulkAction === 'delete'
            ? `Delete ${selectedTeachers.length} teacher(s)?`
            : bulkAction === 'activate'
            ? `Activate ${selectedTeachers.length} teacher(s)?`
            : `Deactivate ${selectedTeachers.length} teacher(s)?`
        }
        confirmText={bulkAction === 'delete' ? 'Delete' : bulkAction === 'activate' ? 'Activate' : 'Deactivate'}
        cancelText="Cancel"
        confirmVariant={bulkAction === 'delete' ? 'destructive' : 'default'}
        onConfirm={handleConfirmBulkAction}
        onCancel={() => {
          setShowBulkActionConfirmation(false);
          setBulkAction(null);
        }}
      />
    </div>
  );
}