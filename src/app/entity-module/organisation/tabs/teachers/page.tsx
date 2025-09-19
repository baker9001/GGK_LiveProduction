/**
 * File: /src/app/entity-module/organisation/tabs/teachers/page.tsx
 * 
 * ENHANCED VERSION: Teachers with Supabase Auth Invitation Flow
 * 
 * New Features:
 * ✅ Invitation-based teacher creation (no password required)
 * ✅ Secure password reset via Edge Functions
 * ✅ Email/name updates handled properly
 * ✅ Phone stored in teachers table
 * ✅ Full Supabase Auth integration
 * ✅ Invitation email notifications
 * ✅ Better error handling and user feedback
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
  CheckCircle, XCircle, Printer, Check, Send, MailCheck
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
    last_login_at?: string;
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
  class_section_order?: number;
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
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  const allChars = uppercase + lowercase + numbers + special;
  for (let i = password.length; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
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
  const [resetPassword, setResetPassword] = useState(false);
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
            *,
            schools:school_id (
              id,
              name,
              status
            ),
            branches:branch_id (
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

        // Now fetch users data separately
        const userIds = teachersData.map(t => t.user_id).filter(Boolean);
        
        let usersData: any[] = [];
        if (userIds.length > 0) {
          const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, email, is_active, raw_user_meta_data, last_login_at')
            .in('id', userIds);
          
          if (!usersError && users) {
            usersData = users;
          }
        }

        // Create a map for quick user lookup
        const usersMap = new Map(usersData.map(u => [u.id, u]));

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

              // Get user data from map
              const userData = usersMap.get(teacher.user_id);

              return {
                ...teacher,
                name: userData?.raw_user_meta_data?.name || 
                      userData?.email?.split('@')[0] || 
                      'Unknown Teacher',
                email: userData?.email || '',
                is_active: userData?.is_active ?? false,
                school_name: teacher.schools?.name || 'No School Assigned',
                branch_name: teacher.branches?.name || 'No Branch Assigned',
                departments: deptData.data?.map(d => d.departments).filter(Boolean) || [],
                grade_levels: gradeData.data?.map(g => g.grade_levels).filter(Boolean) || [],
                sections: sectionData.data?.map(s => s.class_sections).filter(Boolean) || [],
                user_data: userData
              };
            } catch (err) {
              console.error('Error enriching teacher data:', err);
              const userData = usersMap.get(teacher.user_id);
              return {
                ...teacher,
                name: userData?.raw_user_meta_data?.name || 
                      userData?.email?.split('@')[0] || 
                      'Unknown Teacher',
                email: userData?.email || '',
                phone: teacher.phone || userData?.raw_user_meta_data?.phone || '',
                is_active: userData?.is_active ?? false,
                school_name: teacher.schools?.name || 'No School Assigned',
                branch_name: teacher.branches?.name || 'No Branch Assigned',
                departments: [],
                grade_levels: [],
                sections: [],
                user_data: userData
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

  // Fetch branches for selected school
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
      
      return data || [];
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
      
      return data || [];
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
      
      return data || [];
    },
    { 
      enabled: formData.grade_level_ids && formData.grade_level_ids.length > 0,
      staleTime: 5 * 60 * 1000
    }
  );

  // ===== MUTATIONS =====
  
  // Create teacher mutation - ENHANCED with invitation flow
  const createTeacherMutation = useMutation(
    async (data: TeacherFormData) => {
      // Use invitation flow - no password needed
      const result = await userCreationService.createUser({
        user_type: 'teacher',
        email: data.email,
        name: data.name,
        password: undefined, // No password - invitation will be sent
        phone: data.phone,
        company_id: companyId,
        teacher_code: data.teacher_code,
        specialization: data.specialization,
        qualification: data.qualification,
        experience_years: data.experience_years,
        bio: data.bio,
        hire_date: data.hire_date,
        school_id: data.school_id && data.school_id !== '' ? data.school_id : undefined,
        branch_id: data.branch_id && data.branch_id !== '' ? data.branch_id : undefined,
        is_active: data.is_active,
        send_invitation: true // Always send invitation
      });
      
      // Create junction table relationships
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
          console.warn('Junction tables update warning:', err);
        }
      }
      
      return result;
    },
    {
      onSuccess: () => {
        toast.success('Teacher created successfully. An invitation email has been sent.');
        setShowCreateForm(false);
        refetchTeachers();
        resetForm();
      },
      onError: (error: any) => {
        console.error('Create teacher error:', error);
        toast.error(error.message || 'Failed to create teacher');
      }
    }
  );

  // Update teacher mutation - ENHANCED with proper password reset
  const updateTeacherMutation = useMutation(
    async ({ teacherId, data }: { teacherId: string; data: Partial<TeacherFormData> }) => {
      const teacher = teachers.find(t => t.id === teacherId);
      if (!teacher) throw new Error('Teacher not found');
      
      // Update teacher profile in teachers table
      const teacherUpdates: any = {
        specialization: data.specialization,
        qualification: data.qualification,
        experience_years: data.experience_years,
        bio: data.bio,
        hire_date: data.hire_date,
        school_id: data.school_id && data.school_id !== '' ? data.school_id : null,
        branch_id: data.branch_id && data.branch_id !== '' ? data.branch_id : null,
        phone: data.phone ? String(data.phone) : null,
        updated_at: new Date().toISOString()
      };
      
      const { error: teacherError } = await supabase
        .from('teachers')
        .update(teacherUpdates)
        .eq('id', teacherId);
      
      if (teacherError) throw teacherError;
      
      // Update user table for email, name, or password changes
      const userUpdates: any = {};
      let passwordGenerated: string | null = null;
      
      // Handle email change
      if (data.email && data.email !== teacher.email) {
        userUpdates.email = data.email.toLowerCase();
        userUpdates.email_verified = false; // Require re-verification
      }
      
      // Handle name change
      if (data.name) {
        userUpdates.raw_user_meta_data = { 
          ...teacher.user_data?.raw_user_meta_data,
          name: data.name,
          updated_at: new Date().toISOString()
        };
      }
      
      // Handle phone in user metadata as well
      if (data.phone !== undefined) {
        if (!userUpdates.raw_user_meta_data) {
          userUpdates.raw_user_meta_data = { ...teacher.user_data?.raw_user_meta_data };
        }
        userUpdates.raw_user_meta_data.phone = data.phone;
      }
      
      // Handle password reset if requested
      if (resetPassword) {
        const newPassword = data.password || generateSecurePassword();
        passwordGenerated = newPassword;
        
        try {
          await userCreationService.updatePassword(teacher.user_id, newPassword);
        } catch (passwordError: any) {
          console.error('Password update error:', passwordError);
          throw new Error(passwordError.message || 'Failed to update password');
        }
      }
      
      // Apply user updates if any
      if (Object.keys(userUpdates).length > 0) {
        userUpdates.updated_at = new Date().toISOString();
        
        const { error: userError } = await supabase
          .from('users')
          .update(userUpdates)
          .eq('id', teacher.user_id);
        
        if (userError) throw userError;
      }
      
      // Update relationships sequentially
      try {
        if (data.department_ids !== undefined) {
          await supabase.from('teacher_departments').delete().eq('teacher_id', teacherId);
          
          if (data.department_ids.length > 0) {
            await supabase.from('teacher_departments').insert(
              data.department_ids.map(dept_id => ({
                teacher_id: teacherId,
                department_id: dept_id
              }))
            );
          }
        }

        if (data.grade_level_ids !== undefined) {
          await supabase.from('teacher_grade_levels').delete().eq('teacher_id', teacherId);
          
          if (data.grade_level_ids.length > 0) {
            await supabase.from('teacher_grade_levels').insert(
              data.grade_level_ids.map(grade_id => ({
                teacher_id: teacherId,
                grade_level_id: grade_id
              }))
            );
          }
        }

        if (data.section_ids !== undefined) {
          await supabase.from('teacher_sections').delete().eq('teacher_id', teacherId);
          
          if (data.section_ids.length > 0) {
            await supabase.from('teacher_sections').insert(
              data.section_ids.map(section_id => ({
                teacher_id: teacherId,
                section_id: section_id
              }))
            );
          }
        }
      } catch (err) {
        console.warn('Error updating teacher relationships:', err);
      }
      
      return { success: true, password: passwordGenerated };
    },
    {
      onSuccess: (result) => {
        if (result.password) {
          setGeneratedPassword(result.password);
          toast.success('Teacher updated and password reset. Copy the new password!');
        } else {
          toast.success('Teacher updated successfully');
          setShowEditForm(false);
          refetchTeachers();
          resetForm();
        }
      },
      onError: (error: any) => {
        console.error('Update teacher error:', error);
        toast.error(error.message || 'Failed to update teacher');
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
    setResetPassword(false);
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
    
    // Password validation only when resetting in edit mode
    if (showEditForm && resetPassword && formData.password) {
      const allRequirementsMet = PASSWORD_REQUIREMENTS.every(req => req.test(formData.password!));
      if (!allRequirementsMet) {
        errors.password = 'Password does not meet all requirements';
        newTabErrors.basic = true;
      }
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
  }, [formData, showEditForm, resetPassword]);

  // ===== EVENT HANDLERS =====
  const handleCreateTeacher = () => {
    resetForm();
    setFormData(prev => ({
      ...prev,
      teacher_code: generateTeacherCode(companyId),
      password: ''
    }));
    setResetPassword(false);
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
    setResetPassword(false);
    setShowEditForm(true);
    setActiveTab('basic');
  };

  const handleQuickPasswordReset = (teacher: TeacherData) => {
    handleEditTeacher(teacher);
    setResetPassword(true);
    setActiveTab('basic');
    
    // Scroll to password section after modal opens
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      const passwordSection = document.getElementById('password-reset-section');
      if (passwordSection) {
        passwordSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    
    toast.info(`Password reset mode activated for ${teacher.name}`);
  };

  const handleSubmitForm = async () => {
    if (!validateForm()) return;
    
    if (showEditForm && selectedTeacher) {
      const updateData = { ...formData };
      if (!resetPassword) {
        delete updateData.password;
      }
      
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
                <div class="label">Temporary Password:</div>
                <div class="password">${generatedPassword}</div>
              </div>
              
              <div class="important">
                <strong>Important Instructions:</strong>
                <ul>
                  <li>This is a temporary password that must be changed on first login</li>
                  <li>Share this password securely with the teacher</li>
                  <li>The teacher will receive a verification email</li>
                </ul>
              </div>
              
              <div class="footer">
                <p><strong>Generated on:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>Generated by:</strong> ${user?.name || user?.email || 'System Administrator'}</p>
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

  // ===== RENDER =====
  return (
    <div className="space-y-6">
      {/* Header Section with Statistics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        
        {/* Summary Statistics */}
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
              <Button onClick={handleCreateTeacher}>
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
                      <div className="flex gap-1" role="group">
                        {canModifyTeacher && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleQuickPasswordReset(teacher)}
                              title="Reset Password"
                              className="hover:border-[#8CC63F] hover:text-[#8CC63F] hover:bg-[#8CC63F]/10"
                            >
                              <Key className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEditTeacher(teacher)}
                              title="Edit Teacher"
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

      {/* Create/Edit Teacher Form Modal */}
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
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="professional" 
              className="relative data-[state=active]:bg-[#8CC63F]/10 data-[state=active]:text-[#8CC63F]"
            >
              <Briefcase className="w-4 h-4 mr-2" />
              Professional
              {tabErrors.professional && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="assignment" 
              className="relative data-[state=active]:bg-[#8CC63F]/10 data-[state=active]:text-[#8CC63F]"
            >
              <School className="w-4 h-4 mr-2" />
              Assignment
              {tabErrors.assignment && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            {/* Invitation Notice for New Teachers */}
            {!showEditForm && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-800">
                      <Send className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                      Secure Invitation Process
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      The teacher will receive an invitation email with a secure link to:
                    </p>
                    <ul className="mt-2 text-sm text-blue-600 dark:text-blue-400 list-disc list-inside space-y-1">
                      <li>Set their own secure password</li>
                      <li>Verify their email address</li>
                      <li>Activate their account</li>
                    </ul>
                    <p className="mt-2 text-xs text-blue-500 dark:text-blue-400">
                      The invitation link expires in 24 hours for security.
                    </p>
                  </div>
                </div>
              </div>
            )}

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

            <FormField id="email" label="Email Address" required error={formErrors.email}>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="teacher@school.com"
                leftIcon={<Mail className="h-4 w-4 text-gray-400" />}
                className="focus:ring-[#8CC63F] focus:border-[#8CC63F]"
              />
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
              helpText={showEditForm ? "Teacher codes are permanent identifiers" : "This will be the permanent identifier"}
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

            {/* Password Reset Section for Edit Mode */}
            {showEditForm && (
              <div id="password-reset-section" className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-[#8CC63F]" />
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Password Management</h3>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={resetPassword ? "default" : "outline"}
                    onClick={() => {
                      setResetPassword(!resetPassword);
                      if (!resetPassword) {
                        setFormData({ ...formData, password: '' });
                      }
                    }}
                    className={cn(
                      resetPassword 
                        ? "bg-[#8CC63F] hover:bg-[#7AB532] text-white" 
                        : "border-[#8CC63F] text-[#8CC63F] hover:bg-[#8CC63F]/10"
                    )}
                  >
                    <RefreshCw className={cn("h-4 w-4 mr-2", resetPassword && "animate-pulse")} />
                    {resetPassword ? "Reset Password Enabled" : "Enable Password Reset"}
                  </Button>
                </div>

                {resetPassword && (
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                            Password Reset Active
                          </p>
                          <p className="text-sm text-amber-700 dark:text-amber-300">
                            A new password will be generated and the teacher will need to use it to log in.
                          </p>
                        </div>
                      </div>
                    </div>

                    <FormField id="reset-password" label="Custom Password (Optional)">
                      <div className="space-y-2">
                        <div className="relative">
                          <Input
                            id="reset-password"
                            type={showPassword ? "text" : "password"}
                            value={formData.password || ''}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Leave blank for auto-generated password"
                            className="pr-10 font-mono focus:ring-[#8CC63F] focus:border-[#8CC63F]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                          </button>
                        </div>
                        {formData.password && (
                          <PasswordRequirementsChecker password={formData.password} />
                        )}
                      </div>
                    </FormField>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Professional Tab Content */}
          <TabsContent value="professional" className="space-y-4">
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

          {/* Assignment Tab Content */}
          <TabsContent value="assignment" className="space-y-4">
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
                <FormField id="send_credentials" label="Send Invitation">
                  <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <input
                      type="checkbox"
                      id="send_credentials"
                      checked={formData.send_credentials}
                      onChange={(e) => setFormData({ ...formData, send_credentials: e.target.checked })}
                      className="rounded border-gray-300 text-[#8CC63F] focus:ring-[#8CC63F]"
                      disabled
                    />
                    <label htmlFor="send_credentials" className="text-sm text-gray-700 dark:text-gray-300">
                      Send invitation email (always sent for new teachers)
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
              Password Reset Successfully
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                A new password has been generated for {formData.name}.
              </p>
            </div>

            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md mb-4">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                New Password
              </p>
              <div className="flex items-center justify-between">
                <code className="text-base font-mono font-semibold break-all pr-2 text-gray-900 dark:text-white">
                  {generatedPassword}
                </code>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={copyPassword}
                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
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
                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                    title="Print credentials"
                  >
                    <Printer className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={printPassword}
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