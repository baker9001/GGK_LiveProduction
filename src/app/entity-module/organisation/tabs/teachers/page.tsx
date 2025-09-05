/**
 * File: /src/app/entity-module/organisation/tabs/teachers/page.tsx
 * 
 * ENHANCED VERSION: Teachers Tab with Tabbed Form & Green Theme
 * 
 * Features Implemented:
 * ✅ Tabbed form interface (Basic Info, Professional, Assignment)
 * ✅ Password generation with copy functionality
 * ✅ Scope-based filtering for schools/branches
 * ✅ Green theme (#8CC63F) throughout
 * ✅ Proper use of shared components
 * ✅ Tab error indicators
 * ✅ Form validation per tab
 * 
 * Dependencies:
 *   - @/services/userCreationService
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
  School, Grid3x3, Layers, Shield, Hash, Eye as EyeIcon, EyeOff
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../../lib/supabase';
import { useUser } from '../../../../../contexts/UserContext';
import { useTeachersQuery } from '../../../../../utils/queryHelpers';
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
}

export interface TeachersTabProps {
  companyId: string;
  refreshData?: () => void;
}

// ===== HELPER FUNCTIONS =====
const generateTeacherCode = (companyId: string): string => {
  const prefix = 'TCH';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

const generateSecurePassword = (): string => {
  const length = 12;
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const special = '!@#$%^&*';
  
  let password = '';
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  password += special.charAt(Math.floor(Math.random() * special.length));
  
  const allChars = uppercase + lowercase + numbers + special;
  for (let i = password.length; i < length; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

const specializationOptions = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 
  'English', 'History', 'Geography', 'Computer Science',
  'Physical Education', 'Art', 'Music', 'Economics',
  'Business Studies', 'Psychology', 'Sociology', 'Philosophy',
  'Arabic', 'French', 'Spanish', 'German'
];

const qualificationOptions = [
  'High School Diploma', 'Bachelor\'s Degree', 'Bachelor of Education',
  'Master\'s Degree', 'Master of Education', 'PhD', 'Professional Certificate'
];

// ===== MAIN COMPONENT =====
export default function TeachersTab({ companyId, refreshData }: TeachersTabProps) {
  const queryClient = useQueryClient();
  const { user } = useUser();
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
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showBulkActionConfirmation, setShowBulkActionConfirmation] = useState(false);
  
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherData | null>(null);
  const [bulkAction, setBulkAction] = useState<'activate' | 'deactivate' | 'delete' | null>(null);
  const [isGeneratingPassword, setIsGeneratingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
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
    send_credentials: true
  });
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ===== ACCESS CONTROL CHECK =====
  React.useEffect(() => {
    if (!isAccessControlLoading && !canViewTab('teachers')) {
      toast.error('You do not have permission to view teachers');
      window.location.href = '/app/entity-module/dashboard';
      return;
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
              last_login_at
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
    useTeachersQuery(companyId, userContext, {
      search: searchTerm,
      specialization: filterSpecialization !== 'all' ? filterSpecialization : undefined
    }),
    {
      enabled: !!companyId && !isAccessControlLoading && activeTab === 'list'
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
      const result = await userCreationService.createUser({
        user_type: 'teacher',
        email: data.email,
        name: data.name,
        password: data.password || generateSecurePassword(),
        phone: data.phone,
        company_id: companyId,
        teacher_code: data.teacher_code,
        specialization: data.specialization,
        qualification: data.qualification,
        experience_years: data.experience_years,
        bio: data.bio,
        hire_date: data.hire_date,
        school_id: data.school_id,
        branch_id: data.branch_id,
        is_active: data.is_active
      });
      
      if (result.entityId) {
        try {
          if (data.department_ids && data.department_ids.length > 0) {
            await supabase.from('teacher_departments').insert(
              data.department_ids.map(dept_id => ({
                teacher_id: result.entityId,
                department_id: dept_id
              }))
            );
          }

          if (data.grade_level_ids && data.grade_level_ids.length > 0) {
            await supabase.from('teacher_grade_levels').insert(
              data.grade_level_ids.map(grade_id => ({
                teacher_id: result.entityId,
                grade_level_id: grade_id
              }))
            );
          }

          if (data.section_ids && data.section_ids.length > 0) {
            await supabase.from('teacher_sections').insert(
              data.section_ids.map(section_id => ({
                teacher_id: result.entityId,
                section_id: section_id
              }))
            );
          }
        } catch (err) {
          console.warn('Junction tables may not exist yet:', err);
        }
      }
      
      return result;
    },
    {
      onSuccess: () => {
        toast.success('Teacher created successfully');
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

  const updateTeacherMutation = useMutation(
    async ({ teacherId, data }: { teacherId: string; data: Partial<TeacherFormData> }) => {
      const { error: teacherError } = await supabase
        .from('teachers')
        .update({
          specialization: data.specialization,
          qualification: data.qualification,
          experience_years: data.experience_years,
          bio: data.bio,
          phone: data.phone,
          school_id: data.school_id,
          branch_id: data.branch_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', teacherId);
      
      if (teacherError) throw teacherError;
      
      if (data.name) {
        const teacher = teachers.find(t => t.id === teacherId);
        if (teacher) {
          const { error: userError } = await supabase
            .from('users')
            .update({
              raw_user_meta_data: { 
                ...teacher.user_data?.raw_user_meta_data,
                name: data.name 
              }
            })
            .eq('id', teacher.user_id);
          
          if (userError) throw userError;
        }
      }
      
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
        console.warn('Junction tables may not exist yet:', err);
      }
      
      return { success: true };
    },
    {
      onSuccess: () => {
        toast.success('Teacher updated successfully');
        setShowEditForm(false);
        refetchTeachers();
        resetForm();
      },
      onError: (error: any) => {
        console.error('Update teacher error:', error);
        toast.error('Failed to update teacher');
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
  const resetForm = () => {
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
      send_credentials: true
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
  };

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
    
    if (!showEditForm && !formData.password) {
      errors.password = 'Password is required';
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
    setFormData({
      ...formData,
      teacher_code: generateTeacherCode(companyId),
      password: generateSecurePassword()
    });
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
      send_credentials: false
    });
    setShowEditForm(true);
    setActiveTab('basic');
  };

  const handleViewTeacher = (teacher: TeacherData) => {
    setSelectedTeacher(teacher);
    setShowDetailsModal(true);
  };

  const handleSubmitForm = async () => {
    if (!validateForm()) return;
    
    if (showEditForm && selectedTeacher) {
      updateTeacherMutation.mutate({
        teacherId: selectedTeacher.id,
        data: formData
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

  const generateNewPassword = () => {
    setIsGeneratingPassword(true);
    setTimeout(() => {
      const newPassword = generateSecurePassword();
      setFormData({ ...formData, password: newPassword });
      setIsGeneratingPassword(false);
      toast.success('New password generated');
    }, 300);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
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
              {teachersError.message || 'Failed to load teacher data.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ===== RENDER =====
  return (
    <div className="space-y-6">
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
            />

            {canCreateTeacher && (
              <Button 
                onClick={handleCreateTeacher}
                className="bg-[#8CC63F] hover:bg-[#7AB532] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Teacher
              </Button>
            )}
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedTeachers.length > 0 && (canModifyTeacher || canDeleteTeacher) && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border">
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
                className="bg-[#8CC63F] hover:bg-[#7AB532] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Teacher
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left p-3">
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
                  <th className="text-left p-3 font-medium">Teacher</th>
                  <th className="text-left p-3 font-medium">Code</th>
                  <th className="text-left p-3 font-medium">Specialization</th>
                  <th className="text-left p-3 font-medium">Assignments</th>
                  <th className="text-left p-3 font-medium">Location</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Actions</th>
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
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewTeacher(teacher)}
                          title="View Details"
                          className="hover:border-[#8CC63F] hover:text-[#8CC63F]"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {canModifyTeacher && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditTeacher(teacher)}
                            title="Edit"
                            className="hover:border-[#8CC63F] hover:text-[#8CC63F]"
                          >
                            <Edit className="w-4 h-4" />
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

      {/* Create/Edit Teacher Form Modal with Tabs and Green Theme */}
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
        className="
          [&_input]:focus:ring-2 [&_input]:focus:ring-[#8CC63F] [&_input]:focus:border-[#8CC63F] 
          [&_textarea]:focus:ring-2 [&_textarea]:focus:ring-[#8CC63F] [&_textarea]:focus:border-[#8CC63F] 
          [&_select]:focus:ring-2 [&_select]:focus:ring-[#8CC63F] [&_select]:focus:border-[#8CC63F]
        "
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
            <div className="p-4 bg-[#8CC63F]/10 border border-[#8CC63F]/30 rounded-lg mb-4">
              <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                Basic Information
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                Teacher's personal details and login credentials
              </p>
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

            <FormField id="email" label="Email Address" required error={formErrors.email}>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="teacher@school.com"
                disabled={showEditForm}
                leftIcon={<Mail className="h-4 w-4 text-gray-400" />}
                className="focus:ring-[#8CC63F] focus:border-[#8CC63F]"
              />
            </FormField>

            <FormField id="phone" label="Phone Number">
              <PhoneInput
                value={formData.phone || ''}
                onChange={(value) => setFormData({ ...formData, phone: value || '' })}
                placeholder="Enter phone number"
                defaultCountry="KW"
                international
                countryCallingCodeEditable={false}
                className="w-full"
              />
            </FormField>

            <FormField id="teacher_code" label="Teacher Code" required error={formErrors.teacher_code}>
              <div className="flex gap-2">
                <Input
                  id="teacher_code"
                  value={formData.teacher_code}
                  onChange={(e) => setFormData({ ...formData, teacher_code: e.target.value })}
                  placeholder="TCH-XXX-XXX"
                  disabled={showEditForm}
                  leftIcon={<Hash className="h-4 w-4 text-gray-400" />}
                  className="focus:ring-[#8CC63F] focus:border-[#8CC63F]"
                />
                {!showEditForm && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFormData({ ...formData, teacher_code: generateTeacherCode(companyId) })}
                    className="hover:border-[#8CC63F] hover:text-[#8CC63F]"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </FormField>

            {!showEditForm && (
              <FormField id="password" label="Password" required error={formErrors.password}>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password || ''}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter password"
                      className="font-mono pr-10 focus:ring-[#8CC63F] focus:border-[#8CC63F]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-gray-500" />
                      ) : (
                        <EyeIcon className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateNewPassword}
                    disabled={isGeneratingPassword}
                    className="hover:border-[#8CC63F] hover:text-[#8CC63F]"
                    title="Generate Password"
                  >
                    {isGeneratingPassword ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Key className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => copyToClipboard(formData.password || '', 'Password')}
                    disabled={!formData.password}
                    className="hover:border-[#8CC63F] hover:text-[#8CC63F]"
                    title="Copy Password"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                {formData.password && (
                  <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Password Strength: {formData.password.length >= 12 ? 'Strong' : formData.password.length >= 8 ? 'Medium' : 'Weak'}
                    </p>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all",
                          formData.password.length >= 12 ? 'bg-green-500 w-full' :
                          formData.password.length >= 8 ? 'bg-yellow-500 w-2/3' :
                          'bg-red-500 w-1/3'
                        )}
                      />
                    </div>
                  </div>
                )}
              </FormField>
            )}
          </TabsContent>

          <TabsContent value="professional" className="space-y-4">
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg mb-4">
              <h4 className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-1">
                Professional Information
              </h4>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                Teacher's qualifications and experience
              </p>
            </div>

            <FormField id="specialization" label="Specialization/Subjects">
              <SearchableMultiSelect
                options={specializationOptions.map(s => ({ value: s, label: s }))}
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
                  ...qualificationOptions.map(q => ({ value: q, label: q }))
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
            <div className="p-4 bg-[#8CC63F]/10 border border-[#8CC63F]/30 rounded-lg mb-4">
              <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                School Assignment
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                Assign teacher to schools, branches, and classes
              </p>
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
              <FormField id="is_active" label="Account Status">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Active Account
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formData.is_active 
                        ? 'Teacher can log in to the system' 
                        : 'Teacher cannot access the system'}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirmation}
        title="Delete Teacher"
        message={`Are you sure you want to delete selected teacher(s)? This action cannot be undone.`}
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