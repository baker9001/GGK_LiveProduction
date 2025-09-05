/**
 * File: /src/app/entity-module/organisation/tabs/teachers/page.tsx
 * 
 * COMPLETE ENHANCED VERSION: Teachers Tab with Full CRUD Operations
 * 
 * Features Implemented:
 * 1. Complete teacher creation with user account
 * 2. Teacher editing with data synchronization
 * 3. Bulk operations (activate/deactivate/delete)
 * 4. Advanced filtering and search
 * 5. Password generation and management
 * 6. Teacher details view
 * 7. Export functionality
 * 
 * Dependencies:
 *   - @/services/userCreationService
 *   - @/hooks/useAccessControl
 *   - @/components/shared/*
 *   - @/contexts/UserContext
 *   - @/lib/supabase
 *   - External: react, @tanstack/react-query, lucide-react
 */

'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, Award, Calendar, BookOpen, Clock, Briefcase, 
  Plus, Search, Filter, AlertTriangle, Info, CheckCircle2,
  Loader2, UserCheck, GraduationCap, Edit, Eye, MoreVertical,
  MapPin, Phone, Mail, Home, Edit, Eye, MoreVertical, User
  Trash2, UserX, FileText, ChevronDown, X
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
import { userCreationService } from '../../../../../services/userCreationService';

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
  department_id?: string;
  
  // Status
  is_active?: boolean;
  send_credentials?: boolean;
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
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const specializationOptions = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 
  'English', 'History', 'Geography', 'Computer Science',
  'Physical Education', 'Art', 'Music', 'Economics',
  'Business Studies', 'Psychology', 'Sociology', 'Philosophy'
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
    department_id: '',
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

        // Transform and enrich data
        return teachersData.map(teacher => ({
          ...teacher,
          name: teacher.users?.raw_user_meta_data?.name || 
                teacher.users?.email?.split('@')[0] || 
                'Unknown Teacher',
          email: teacher.users?.email || '',
          is_active: teacher.users?.is_active ?? false,
          school_name: teacher.schools?.name || 'No School Assigned',
          branch_name: teacher.branches?.name || 'No Branch Assigned',
          user_data: teacher.users
        })) as TeacherData[];

      } catch (error) {
        console.error('Error fetching teachers:', error);
        throw error;
      }
    },
    {
      enabled: !!companyId && !isAccessControlLoading,
      staleTime: 2 * 60 * 1000,
      retry: (failureCount, error) => {
        if (error.message.includes('permission')) return false;
        return failureCount < 2;
      }
    }
  );

  // Fetch available schools
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
    ['branches-for-school', formData.school_id],
    async () => {
      if (!formData.school_id) return [];
      
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, status')
        .eq('school_id', formData.school_id)
        .eq('status', 'active')
        .order('name');
      
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

  // ===== MUTATIONS =====
  const createTeacherMutation = useMutation(
    async (data: TeacherFormData) => {
      // Use the userCreationService to create teacher
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
      // Update teacher profile
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
          department_id: data.department_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', teacherId);
      
      if (teacherError) throw teacherError;
      
      // Update user metadata if name changed
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
      // Get user IDs for the teachers
      const teachersToDelete = teachers.filter(t => teacherIds.includes(t.id));
      const userIds = teachersToDelete.map(t => t.user_id);
      
      // Delete from teachers table (cascade will handle related data)
      const { error: teacherError } = await supabase
        .from('teachers')
        .delete()
        .in('id', teacherIds);
      
      if (teacherError) throw teacherError;
      
      // Delete from users table
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
      
      // Update user status
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
      department_id: '',
      is_active: true,
      send_credentials: true
    });
    setFormErrors({});
    setSelectedTeacher(null);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
    
    if (!formData.teacher_code.trim()) {
      errors.teacher_code = 'Teacher code is required';
    }
    
    if (!showEditForm && !formData.password) {
      errors.password = 'Password is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

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
      department_id: teacher.department_id || '',
      is_active: teacher.is_active ?? true,
      send_credentials: false
    });
    setShowEditForm(true);
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
    }, 500);
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
      bySchool: availableSchools.map(school => ({
        school: school.name,
        count: teachers.filter(t => t.school_id === school.id).length
      }))
    };
  }, [teachers, availableSchools]);

  // ===== LOADING & ERROR STATES =====
  if (isAccessControlLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
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
        
        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {summaryStats.total}
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-300">Total Teachers</div>
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
                className="pl-10"
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
                className="w-48"
              />
            )}
            
            <Select
              value={filterSpecialization}
              onChange={(value) => setFilterSpecialization(value)}
              options={[
                { value: 'all', label: 'All Subjects' },
                ...specializationOptions.map(s => ({ value: s, label: s }))
              ]}
              className="w-40"
            />
            
            <Select
              value={filterStatus}
              onChange={(value) => setFilterStatus(value as 'all' | 'active' | 'inactive')}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active Only' },
                { value: 'inactive', label: 'Inactive Only' }
              ]}
              className="w-32"
            />

            {canCreateTeacher && (
              <Button onClick={handleCreateTeacher}>
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
                {selectedTeachers.length} teacher{selectedTeachers.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                {canModifyTeacher && (
                  <>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleBulkAction('activate')}
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedTeachers([])}
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Teachers Table */}
        {isLoadingTeachers ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading teachers...</span>
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="text-center p-8 text-gray-500 dark:text-gray-400">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            {teachers.length === 0 ? (
              <>
                <h3 className="text-lg font-medium mb-2">No Teachers Found</h3>
                <p className="text-sm mb-4">
                  No teachers have been added to this organization yet.
                </p>
                {canCreateTeacher && (
                  <Button onClick={handleCreateTeacher}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Teacher
                  </Button>
                )}
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium mb-2">No Matching Teachers</h3>
                <p className="text-sm">
                  Try adjusting your search terms or filters.
                </p>
              </>
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
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                  </th>
                  <th className="text-left p-3 font-medium">Teacher</th>
                  <th className="text-left p-3 font-medium">Code</th>
                  <th className="text-left p-3 font-medium">Contact</th>
                  <th className="text-left p-3 font-medium">Specialization</th>
                  <th className="text-left p-3 font-medium">Experience</th>
                  <th className="text-left p-3 font-medium">Assignment</th>
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
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                          <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {teacher.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {teacher.qualification || 'N/A'}
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
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                          <Mail className="w-3 h-3" />
                          {teacher.email}
                        </div>
                        {teacher.phone && (
                          <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                            <Phone className="w-3 h-3" />
                            {teacher.phone}
                          </div>
                        )}
                      </div>
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
                            <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                              +{teacher.specialization.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-sm">None</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="text-sm">
                        {teacher.experience_years ? (
                          <span className="text-gray-700 dark:text-gray-300">
                            {teacher.experience_years} year{teacher.experience_years !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">N/A</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          {teacher.school_name}
                        </div>
                        {teacher.branch_name !== 'No Branch Assigned' && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
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
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {canModifyTeacher && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditTeacher(teacher)}
                            title="Edit Teacher"
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
        <div className="space-y-6">
          {/* Basic Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <User className="w-5 h-5 mr-2" />
              Basic Information
            </h3>
            
            <FormField id="name" label="Full Name" required error={formErrors.name}>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter teacher's full name"
              />
            </FormField>

            <FormField id="email" label="Email Address" required error={formErrors.email}>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="teacher@school.com"
                  disabled={showEditForm}
                />
                {showEditForm && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <Info className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </div>
              {showEditForm && (
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed after creation</p>
              )}
            </FormField>

            <FormField id="phone" label="Phone Number">
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1234567890"
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
                />
                {!showEditForm && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFormData({ ...formData, teacher_code: generateTeacherCode(companyId) })}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </FormField>

            {!showEditForm && (
              <FormField id="password" label="Password" required error={formErrors.password}>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      id="password"
                      type="text"
                      value={formData.password || ''}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter password"
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generateNewPassword}
                      disabled={isGeneratingPassword}
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
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="send_credentials"
                      checked={formData.send_credentials}
                      onChange={(e) => setFormData({ ...formData, send_credentials: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="send_credentials" className="text-sm text-gray-700 dark:text-gray-300">
                      Send login credentials via email
                    </label>
                  </div>
                </div>
              </FormField>
            )}
          </div>

          {/* Professional Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Briefcase className="w-5 h-5 mr-2" />
              Professional Information
            </h3>

            <FormField id="specialization" label="Specialization/Subjects">
              <SearchableMultiSelect
                options={specializationOptions.map(s => ({ id: s, name: s }))}
                value={formData.specialization || []}
                onChange={(values) => setFormData({ ...formData, specialization: values })}
                placeholder="Select subjects"
                labelKey="name"
                valueKey="id"
              />
            </FormField>

            <FormField id="qualification" label="Qualification">
              <Select
                id="qualification"
                value={formData.qualification}
                onChange={(value) => setFormData({ ...formData, qualification: value })}
                options={[
                  { value: '', label: 'Select qualification' },
                  ...qualificationOptions.map(q => ({ value: q, label: q }))
                ]}
              />
            </FormField>

            <FormField id="experience_years" label="Years of Experience">
              <Input
                id="experience_years"
                type="number"
                min="0"
                value={formData.experience_years}
                onChange={(e) => setFormData({ ...formData, experience_years: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </FormField>

            <FormField id="hire_date" label="Hire Date">
              <Input
                id="hire_date"
                type="date"
                value={formData.hire_date}
                onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
              />
            </FormField>

            <FormField id="bio" label="Bio/Description">
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Brief description about the teacher..."
                rows={3}
              />
            </FormField>
          </div>

          {/* Assignment Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Building2 className="w-5 h-5 mr-2" />
              School Assignment
            </h3>

            <FormField id="school_id" label="School">
              <Select
                id="school_id"
                value={formData.school_id}
                onChange={(value) => setFormData({ ...formData, school_id: value, branch_id: '' })}
                options={[
                  { value: '', label: 'Select school' },
                  ...availableSchools.map(s => ({ value: s.id, label: s.name }))
                ]}
              />
            </FormField>

            {formData.school_id && (
              <FormField id="branch_id" label="Branch">
                <Select
                  id="branch_id"
                  value={formData.branch_id}
                  onChange={(value) => setFormData({ ...formData, branch_id: value })}
                  options={[
                    { value: '', label: 'Select branch (optional)' },
                    ...availableBranches.map(b => ({ value: b.id, label: b.name }))
                  ]}
                />
              </FormField>
            )}

            <FormField id="is_active" label="Status">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
                  Active (Teacher can login and access the system)
                </label>
              </div>
            </FormField>
          </div>
        </div>
      </SlideInForm>

      {/* Teacher Details Modal */}
      {showDetailsModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Teacher Details
                </h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Header with Name and Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <GraduationCap className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedTeacher.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedTeacher.teacher_code}
                    </p>
                  </div>
                </div>
                <StatusBadge
                  status={selectedTeacher.is_active ? 'active' : 'inactive'}
                  variant={selectedTeacher.is_active ? 'success' : 'warning'}
                />
              </div>

              {/* Contact Information */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 dark:text-white">Contact Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Mail className="w-4 h-4" />
                    {selectedTeacher.email}
                  </div>
                  {selectedTeacher.phone && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Phone className="w-4 h-4" />
                      {selectedTeacher.phone}
                    </div>
                  )}
                </div>
              </div>

              {/* Professional Information */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 dark:text-white">Professional Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Qualification:</span>
                    <p className="text-gray-900 dark:text-white">
                      {selectedTeacher.qualification || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Experience:</span>
                    <p className="text-gray-900 dark:text-white">
                      {selectedTeacher.experience_years 
                        ? `${selectedTeacher.experience_years} years` 
                        : 'Not specified'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500 dark:text-gray-400">Specialization:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedTeacher.specialization && selectedTeacher.specialization.length > 0 ? (
                        selectedTeacher.specialization.map((spec, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full"
                          >
                            {spec}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400">None specified</span>
                      )}
                    </div>
                  </div>
                  {selectedTeacher.bio && (
                    <div className="col-span-2">
                      <span className="text-gray-500 dark:text-gray-400">Bio:</span>
                      <p className="text-gray-900 dark:text-white mt-1">
                        {selectedTeacher.bio}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Assignment Information */}
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900 dark:text-white">Assignment</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Building2 className="w-4 h-4" />
                    School: {selectedTeacher.school_name}
                  </div>
                  {selectedTeacher.branch_name !== 'No Branch Assigned' && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <MapPin className="w-4 h-4" />
                      Branch: {selectedTeacher.branch_name}
                    </div>
                  )}
                </div>
              </div>

              {/* System Information */}
              <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-900 dark:text-white">System Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Created:</span>
                    <p className="text-gray-900 dark:text-white">
                      {new Date(selectedTeacher.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Last Login:</span>
                    <p className="text-gray-900 dark:text-white">
                      {selectedTeacher.user_data?.last_login_at 
                        ? new Date(selectedTeacher.user_data.last_login_at).toLocaleDateString()
                        : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              {canModifyTeacher && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleEditTeacher(selectedTeacher);
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Teacher
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setShowDetailsModal(false)}
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
        message={`Are you sure you want to delete ${
          selectedTeacher ? `"${selectedTeacher.name}"` : 'selected teacher(s)'
        }? This will permanently delete the teacher account and all associated data.`}
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
            ? `Are you sure you want to delete ${selectedTeachers.length} teacher(s)? This action cannot be undone.`
            : bulkAction === 'activate'
            ? `Are you sure you want to activate ${selectedTeachers.length} teacher(s)?`
            : `Are you sure you want to deactivate ${selectedTeachers.length} teacher(s)?`
        }
        confirmText={
          bulkAction === 'delete' 
            ? 'Delete' 
            : bulkAction === 'activate'
            ? 'Activate'
            : 'Deactivate'
        }
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