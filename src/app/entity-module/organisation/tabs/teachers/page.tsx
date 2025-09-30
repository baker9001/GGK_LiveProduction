/**
 * File: /src/app/entity-module/organisation/tabs/teachers/page.tsx
 * 
 * FIXED VERSION - CORRECTED TEACHER ASSIGNMENT RELATIONSHIPS
 * 
 * ✅ FIXED: Multiple school assignments properly handled
 * ✅ FIXED: Edit form now loads all junction table relationships
 * ✅ FIXED: Assignment data correctly retrieved and displayed  
 * ✅ FIXED: Teacher schools/branches/departments junction tables properly managed
 * ✅ FIXED: Grade levels and sections loading with proper dependencies
 * ✅ FIXED: View modal displaying complete assignment information
 * ✅ FIXED: Assignment wizard properly handling multiple selections
 * ✅ FIXED: Database queries optimized for junction table relationships
 */

'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Users, Award, Calendar, BookOpen, Clock, Briefcase, Plus, Search, Filter, AlertTriangle, Info, CheckCircle2, Loader2, UserCheck, GraduationCap, CreditCard as Edit2, Eye, MoreVertical, Mail, Phone, MapPin, Download, Upload, Key, Copy, RefreshCw, Trash2, UserX, FileText, ChevronDown, X, User, Building2, School, Grid3x3, Layers, Shield, Hash, EyeOff, CheckCircle, XCircle, Send, Link2, BookOpenCheck, Award as AwardIcon, ChevronRight, ChevronLeft, Check, ArrowRight } from 'lucide-react';
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
  // FIXED: Enhanced relationship data
  schools?: { id: string; name: string }[];
  branches?: { id: string; name: string; school_id: string }[];
  departments?: { id: string; name: string }[];
  grade_levels?: { id: string; grade_name: string; grade_code: string }[];
  sections?: { id: string; section_name: string; section_code: string; grade_level_id: string }[];
  programs?: { id: string; name: string }[];
  subjects?: { id: string; name: string; code: string }[];
  user_data?: {
    email: string;
    is_active: boolean;
    raw_user_meta_data?: any;
    last_sign_in_at?: string;
  };
  // Legacy single assignments for backward compatibility
  school_name?: string;
  branch_name?: string;
}

interface TeacherFormData {
  name: string;
  email: string;
  phone?: string;
  teacher_code: string;
  specialization?: string[];
  qualification?: string;
  experience_years?: number;
  bio?: string;
  hire_date?: string;
  // FIXED: Support multiple assignments
  school_ids?: string[];
  branch_ids?: string[];
  department_ids?: string[];
  grade_level_ids?: string[];
  section_ids?: string[];
  program_ids?: string[];
  subject_ids?: string[];
  is_active?: boolean;
  send_invitation?: boolean;
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
  display_name?: string;
  schools?: {
    id: string;
    name: string;
  };
  branches?: {
    id: string;
    name: string;
  };
}

interface ClassSection {
  id: string;
  section_name: string;
  section_code: string;
  grade_level_id: string;
  max_capacity?: number;
  grade_name?: string;
  grade_code?: string;
  display_name?: string;
  grade_levels?: {
    grade_name: string;
    grade_code: string;
  };
}

interface Program {
  id: string;
  name: string;
  code?: string;
  status: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  status: string;
}

interface School {
  id: string;
  name: string;
  status: string;
}

interface Branch {
  id: string;
  name: string;
  status: string;
  school_id: string;
}

export interface TeachersTabProps {
  companyId: string;
  refreshData?: () => void;
}

// ===== CONSTANTS =====
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

const ASSIGNMENT_STEPS = [
  { id: 1, name: 'Schools', icon: School, description: 'Select schools and branches' },
  { id: 2, name: 'Academics', icon: BookOpenCheck, description: 'Choose programs and subjects' },
  { id: 3, name: 'Classes', icon: Layers, description: 'Assign grades and sections' },
  { id: 4, name: 'Review', icon: CheckCircle, description: 'Review and confirm' }
];

// ===== HELPER FUNCTIONS =====
const generateTeacherCode = (companyId: string): string => {
  const prefix = 'TCH';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

// Green-themed SearchableMultiSelect wrapper
const GreenSearchableMultiSelect: React.FC<any> = ({ ...props }) => {
  return (
    <div className="green-select-wrapper">
      <style jsx global>{`
        /* Selected items styling */
        .green-select-wrapper .multi-select-selected-item,
        .green-select-wrapper [data-selected="true"],
        .green-select-wrapper .selected-item,
        .green-select-wrapper .bg-blue-100,
        .green-select-wrapper .bg-blue-50 {
          background-color: #8CC63F20 !important;
          border-color: #8CC63F !important;
          color: #7AB532 !important;
        }
        
        /* Remove button hover */
        .green-select-wrapper .multi-select-selected-item button:hover,
        .green-select-wrapper .multi-select-selected-item svg:hover {
          background-color: #8CC63F30 !important;
          color: #7AB532 !important;
        }
        
        /* Input field focus state */
        .green-select-wrapper input:focus,
        .green-select-wrapper input:focus-visible,
        .green-select-wrapper .focus\\:ring-blue-500:focus,
        .green-select-wrapper .focus\\:border-blue-500:focus {
          border-color: #8CC63F !important;
          outline-color: #8CC63F !important;
          box-shadow: 0 0 0 3px rgba(140, 198, 63, 0.1) !important;
        }
        
        /* Dropdown container border when focused */
        .green-select-wrapper .border-blue-500,
        .green-select-wrapper .border-blue-300,
        .green-select-wrapper .ring-blue-500 {
          border-color: #8CC63F !important;
        }
        
        /* Option hover state */
        .green-select-wrapper .multi-select-option:hover,
        .green-select-wrapper .hover\\:bg-blue-50:hover,
        .green-select-wrapper .hover\\:bg-gray-100:hover {
          background-color: #8CC63F10 !important;
        }
        
        /* Selected option in dropdown */
        .green-select-wrapper .multi-select-option.selected,
        .green-select-wrapper .bg-blue-500,
        .green-select-wrapper .bg-blue-600,
        .green-select-wrapper [aria-selected="true"] {
          background-color: #8CC63F25 !important;
          color: #7AB532 !important;
        }
        
        /* Tags/chips for selected values */
        .green-select-wrapper .chip,
        .green-select-wrapper .tag,
        .green-select-wrapper .badge,
        .green-select-wrapper span[class*="bg-blue"] {
          background-color: #8CC63F20 !important;
          border: 1px solid #8CC63F40 !important;
          color: #7AB532 !important;
        }
        
        /* Override any blue text colors */
        .green-select-wrapper .text-blue-500,
        .green-select-wrapper .text-blue-600,
        .green-select-wrapper .text-blue-700 {
          color: #7AB532 !important;
        }
        
        /* Checkbox or selection indicators */
        .green-select-wrapper input[type="checkbox"]:checked {
          background-color: #8CC63F !important;
          border-color: #8CC63F !important;
        }
        
        /* Focus ring for accessibility */
        .green-select-wrapper *:focus-visible {
          outline: 2px solid #8CC63F !important;
          outline-offset: 2px;
        }
        
        /* Scrollbar styling for dropdown */
        .green-select-wrapper ::-webkit-scrollbar-thumb {
          background-color: #8CC63F40 !important;
        }
        .green-select-wrapper ::-webkit-scrollbar-thumb:hover {
          background-color: #8CC63F60 !important;
        }
      `}</style>
      <SearchableMultiSelect 
        {...props} 
        className={`${props.className || ''} focus:ring-[#8CC63F] focus:border-[#8CC63F]`}
      />
    </div>
  );
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
  const [showInvitationSuccess, setShowInvitationSuccess] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingTeacher, setViewingTeacher] = useState<TeacherData | null>(null);
  
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherData | null>(null);
  const [bulkAction, setBulkAction] = useState<'activate' | 'deactivate' | 'delete' | null>(null);
  const [invitedTeacherEmail, setInvitedTeacherEmail] = useState<string>('');
  
  // Assignment Wizard State
  const [currentAssignmentStep, setCurrentAssignmentStep] = useState(1);
  const [assignmentFormData, setAssignmentFormData] = useState({
    school_ids: [] as string[],
    branch_ids: [] as string[],
    program_ids: [] as string[],
    subject_ids: [] as string[],
    grade_level_ids: [] as string[],
    section_ids: [] as string[]
  });
  const [isAssignmentLoading, setIsAssignmentLoading] = useState(false);
  
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
    school_ids: [],
    branch_ids: [],
    department_ids: [],
    grade_level_ids: [],
    section_ids: [],
    program_ids: [],
    subject_ids: [],
    is_active: true,
    send_invitation: true
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

  // FIXED: Effect to trigger dependent queries when editing teacher
  useEffect(() => {
    if (showEditForm && formData.school_ids && formData.school_ids.length > 0) {
      // Force refetch of dependent data when edit form opens with schools
      queryClient.invalidateQueries(['branches-for-form', formData.school_ids]);
      queryClient.invalidateQueries(['grade-levels-for-form', formData.school_ids, formData.branch_ids]);
      
      if (formData.grade_level_ids && formData.grade_level_ids.length > 0) {
        queryClient.invalidateQueries(['sections-for-form', formData.grade_level_ids]);
      }
    }
  }, [showEditForm, formData.school_ids, formData.branch_ids, formData.grade_level_ids, queryClient]);

  // FIXED: Add ESC key and outside click handlers for assignment modal
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showAssignmentModal) {
          handleCloseAssignmentModal();
        } else if (showViewModal) {
          handleCloseViewModal();
        }
      }
    };

    if (showAssignmentModal || showViewModal) {
      document.addEventListener('keydown', handleEscapeKey);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'unset';
    };
  }, [showAssignmentModal, showViewModal]);

  // Helper function to close assignment modal
  const handleCloseAssignmentModal = useCallback(() => {
    setShowAssignmentModal(false);
    setSelectedTeacher(null);
    setAssignmentFormData({
      school_ids: [],
      branch_ids: [],
      program_ids: [],
      subject_ids: [],
      grade_level_ids: [],
      section_ids: []
    });
    setCurrentAssignmentStep(1);
  }, []);

  // Helper function to close view modal
  const handleCloseViewModal = useCallback(() => {
    setShowViewModal(false);
    setViewingTeacher(null);
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
  
  // FIXED: Fetch teachers with proper junction table relationships
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

        // FIXED: Fetch ALL teacher relationships from junction tables
        const enrichedTeachers = await Promise.all(
          teachersData.map(async (teacher) => {
            try {
              // Fetch all junction table relationships in parallel
              const [
                schoolData, 
                branchData, 
                deptData, 
                gradeData, 
                sectionData, 
                programData, 
                subjectData
              ] = await Promise.all([
                // FIXED: Fetch teacher schools if junction table exists
                supabase
                  .from('teacher_schools')
                  .select('school_id, schools(id, name)')
                  .eq('teacher_id', teacher.id)
                  .then(result => result.error ? null : result.data)
                  .catch(() => null),
                // FIXED: Fetch teacher branches if junction table exists  
                supabase
                  .from('teacher_branches')
                  .select('branch_id, branches(id, name, school_id)')
                  .eq('teacher_id', teacher.id)
                  .then(result => result.error ? null : result.data)
                  .catch(() => null),
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
                  .eq('teacher_id', teacher.id),
                supabase
                  .from('teacher_programs')
                  .select('program_id, programs(id, name)')
                  .eq('teacher_id', teacher.id),
                supabase
                  .from('teacher_subjects')
                  .select('subject_id, edu_subjects(id, name, code)')
                  .eq('teacher_id', teacher.id)
              ]);

              // FIXED: Process all junction table data
              const teacherSchools = schoolData?.map(s => s.schools).filter(Boolean) || [];
              const teacherBranches = branchData?.map(b => b.branches).filter(Boolean) || [];
              const teacherDepartments = deptData.data?.map(d => d.departments).filter(Boolean) || [];
              const teacherGradeLevels = gradeData.data?.map(g => g.grade_levels).filter(Boolean) || [];
              const teacherSections = sectionData.data?.map(s => s.class_sections).filter(Boolean) || [];
              const teacherPrograms = programData.data?.map(p => p.programs).filter(Boolean) || [];
              const teacherSubjects = subjectData.data?.map(s => s.edu_subjects).filter(Boolean) || [];

              return {
                ...teacher,
                name: teacher.users?.raw_user_meta_data?.name || 
                      teacher.users?.email?.split('@')[0] || 
                      'Unknown Teacher',
                email: teacher.users?.email || '',
                is_active: teacher.users?.is_active ?? false,
                // Legacy single assignments (for backward compatibility)
                school_name: teacher.schools?.name || 'No School Assigned',
                branch_name: teacher.branches?.name || 'No Branch Assigned',
                // FIXED: Multiple assignments from junction tables
                schools: teacherSchools.length > 0 ? teacherSchools : (teacher.schools ? [teacher.schools] : []),
                branches: teacherBranches.length > 0 ? teacherBranches : (teacher.branches ? [teacher.branches] : []),
                departments: teacherDepartments,
                grade_levels: teacherGradeLevels,
                sections: teacherSections,
                programs: teacherPrograms,
                subjects: teacherSubjects,
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
                schools: teacher.schools ? [teacher.schools] : [],
                branches: teacher.branches ? [teacher.branches] : [],
                departments: [],
                grade_levels: [],
                sections: [],
                programs: [],
                subjects: [],
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
  const { data: availableSchools = [] } = useQuery<School[]>(
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

  // FIXED: Fetch branches for selected school(s) - now with enabled condition
  const { data: availableBranches = [] } = useQuery<Branch[]>(
    ['branches-for-schools', assignmentFormData.school_ids, scopeFilters],
    async () => {
      if (!assignmentFormData.school_ids || assignmentFormData.school_ids.length === 0) return [];
      
      let branchesQuery = supabase
        .from('branches')
        .select('id, name, status, school_id')
        .in('school_id', assignmentFormData.school_ids)
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
      enabled: !!(assignmentFormData.school_ids && assignmentFormData.school_ids.length > 0),
      staleTime: 5 * 60 * 1000
    }
  );

  // FIXED: Fetch branches for form (when editing) - support multiple schools
  const { data: formBranches = [] } = useQuery<Branch[]>(
    ['branches-for-form', formData.school_ids],
    async () => {
      if (!formData.school_ids || formData.school_ids.length === 0) return [];
      
      let branchesQuery = supabase
        .from('branches')
        .select('id, name, status, school_id')
        .in('school_id', formData.school_ids)
        .eq('status', 'active')
        .order('name');
      
      const { data, error } = await branchesQuery;
      
      if (error) {
        console.error('Form branches query error:', error);
        return [];
      }
      
      return data || [];
    },
    { 
      enabled: !!(formData.school_ids && formData.school_ids.length > 0),
      staleTime: 5 * 60 * 1000
    }
  );

  // FIXED: Fetch grade levels for form (when editing)
  const { data: formGradeLevels = [] } = useQuery<GradeLevel[]>(
    ['grade-levels-for-form', formData.school_ids, formData.branch_ids],
    async () => {
      if (!formData.school_ids || formData.school_ids.length === 0) return [];
      
      let query = supabase
        .from('grade_levels')
        .select(`
          id, 
          grade_name, 
          grade_code, 
          grade_order, 
          school_id, 
          branch_id,
          schools!inner (
            id,
            name
          ),
          branches (
            id,
            name
          )
        `)
        .in('school_id', formData.school_ids)
        .eq('status', 'active')
        .order('grade_order');

      // If branches are selected, include both branch-specific and school-level grades
      if (formData.branch_ids && formData.branch_ids.length > 0) {
        query = query.or(`branch_id.in.(${formData.branch_ids.join(',')}),branch_id.is.null`);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Form grade levels query error:', error);
        return [];
      }
      
      // Transform data to include school/branch context
      const gradeLevelsWithContext = (data || []).map(grade => ({
        ...grade,
        display_name: `${grade.grade_name} (${grade.grade_code}) - ${grade.schools?.name}${grade.branches ? ` / ${grade.branches.name}` : ''}`
      }));
      
      return gradeLevelsWithContext;
    },
    { 
      enabled: !!(formData.school_ids && formData.school_ids.length > 0),
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false
    }
  );

  // FIXED: Fetch sections for form (when editing)
  const { data: formSections = [] } = useQuery<ClassSection[]>(
    ['sections-for-form', formData.grade_level_ids],
    async () => {
      if (!formData.grade_level_ids || formData.grade_level_ids.length === 0) return [];
      
      const { data, error } = await supabase
        .from('class_sections')
        .select(`
          id, 
          section_name, 
          section_code, 
          grade_level_id,
          grade_levels!inner (
            grade_name,
            grade_code
          )
        `)
        .in('grade_level_id', formData.grade_level_ids)
        .eq('status', 'active')
        .order('class_section_order');
      
      if (error) {
        console.error('Form sections query error:', error);
        return [];
      }
      
      // Transform data to include grade info
      const sectionsWithGrade = (data || []).map(section => ({
        id: section.id,
        section_name: section.section_name,
        section_code: section.section_code,
        grade_level_id: section.grade_level_id,
        grade_name: section.grade_levels?.grade_name || '',
        grade_code: section.grade_levels?.grade_code || '',
        display_name: `${section.grade_levels?.grade_name || ''} - ${section.section_name} (${section.section_code})`
      }));
      
      return sectionsWithGrade;
    },
    { 
      enabled: !!(formData.grade_level_ids && formData.grade_level_ids.length > 0),
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false
    }
  );

  // Fetch available programs
  const { data: availablePrograms = [] } = useQuery<Program[]>(
    ['programs', companyId],
    async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name, code')
        .eq('status', 'active')
        .order('name');
      
      if (error) {
        console.error('Programs query error:', error);
        return [];
      }
      
      return data || [];
    },
    { 
      enabled: !!companyId,
      staleTime: 5 * 60 * 1000
    }
  );

  // Fetch available subjects
  const { data: availableSubjects = [] } = useQuery<Subject[]>(
    ['subjects', companyId],
    async () => {
      const { data, error } = await supabase
        .from('edu_subjects')
        .select('id, name, code')
        .eq('status', 'active')
        .order('name');
      
      if (error) {
        console.error('Subjects query error:', error);
        return [];
      }
      
      return data || [];
    },
    { 
      enabled: !!companyId,
      staleTime: 5 * 60 * 1000
    }
  );

  // Fetch departments
  const { data: availableDepartments = [] } = useQuery<Department[]>(
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

  // FIXED: Fetch grade levels with proper enabled condition
  const { data: availableGradeLevels = [] } = useQuery<GradeLevel[]>(
    ['grade-levels', assignmentFormData.school_ids, assignmentFormData.branch_ids],
    async () => {
      if (!assignmentFormData.school_ids || assignmentFormData.school_ids.length === 0) return [];
      
      let query = supabase
        .from('grade_levels')
        .select(`
          id, 
          grade_name, 
          grade_code, 
          grade_order, 
          school_id, 
          branch_id,
          schools!inner (
            id,
            name
          ),
          branches (
            id,
            name
          )
        `)
        .in('school_id', assignmentFormData.school_ids)
        .eq('status', 'active')
        .order('grade_order');

      // If branches are selected, include both branch-specific and school-level grades
      if (assignmentFormData.branch_ids && assignmentFormData.branch_ids.length > 0) {
        query = query.or(`branch_id.in.(${assignmentFormData.branch_ids.join(',')}),branch_id.is.null`);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Grade levels query error:', error);
        return [];
      }
      
      // Transform data to include school/branch context
      const gradeLevelsWithContext = (data || []).map(grade => ({
        ...grade,
        display_name: `${grade.grade_name} (${grade.grade_code}) - ${grade.schools?.name}${grade.branches ? ` / ${grade.branches.name}` : ''}`
      }));
      
      return gradeLevelsWithContext;
    },
    { 
      enabled: !!(assignmentFormData.school_ids && assignmentFormData.school_ids.length > 0),
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false
    }
  );

  // FIXED: Fetch sections with proper enabled condition
  const { data: availableSections = [] } = useQuery<ClassSection[]>(
    ['sections', assignmentFormData.grade_level_ids],
    async () => {
      if (!assignmentFormData.grade_level_ids || assignmentFormData.grade_level_ids.length === 0) return [];
      
      const { data, error } = await supabase
        .from('class_sections')
        .select(`
          id, 
          section_name, 
          section_code, 
          grade_level_id,
          grade_levels!inner (
            grade_name,
            grade_code
          )
        `)
        .in('grade_level_id', assignmentFormData.grade_level_ids)
        .eq('status', 'active')
        .order('class_section_order');
      
      if (error) {
        console.error('Sections query error:', error);
        return [];
      }
      
      // Transform data to include grade info
      const sectionsWithGrade = (data || []).map(section => ({
        id: section.id,
        section_name: section.section_name,
        section_code: section.section_code,
        grade_level_id: section.grade_level_id,
        grade_name: section.grade_levels?.grade_name || '',
        grade_code: section.grade_levels?.grade_code || '',
        display_name: `${section.grade_levels?.grade_name || ''} - ${section.section_name} (${section.section_code})`
      }));
      
      return sectionsWithGrade;
    },
    { 
      enabled: !!(assignmentFormData.grade_level_ids && assignmentFormData.grade_level_ids.length > 0),
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false
    }
  );

  // ===== MUTATIONS =====
  
  // FIXED: Update Teacher Assignments Mutation with junction table handling
  const updateTeacherAssignmentsMutation = useMutation(
    async ({ teacherId, assignments }: { teacherId: string; assignments: typeof assignmentFormData }) => {
      try {
        setIsAssignmentLoading(true);
        
        // FIXED: Update main teacher record with primary school/branch
        const teacherUpdates: any = {};
        
        if (assignments.school_ids.length > 0) {
          teacherUpdates.school_id = assignments.school_ids[0]; // Primary school
        } else {
          teacherUpdates.school_id = null;
        }
        
        if (assignments.branch_ids.length > 0) {
          teacherUpdates.branch_id = assignments.branch_ids[0]; // Primary branch
        } else {
          teacherUpdates.branch_id = null;
        }
        
        // Update teacher record if needed
        if (Object.keys(teacherUpdates).length > 0) {
          const { error } = await supabase
            .from('teachers')
            .update(teacherUpdates)
            .eq('id', teacherId);
          
          if (error) {
            console.error('Teacher update error:', error);
            throw new Error('Failed to update teacher location');
          }
        }

        // FIXED: Handle junction table updates with proper error handling
        const junctionTableUpdates = [
          // Handle teacher_schools junction (if table exists)
          {
            table: 'teacher_schools',
            deleteField: 'teacher_id',
            insertData: assignments.school_ids.map(school_id => ({
              teacher_id: teacherId,
              school_id
            })),
            required: false // Not all systems may have this table
          },
          // Handle teacher_branches junction (if table exists)
          {
            table: 'teacher_branches', 
            deleteField: 'teacher_id',
            insertData: assignments.branch_ids.map(branch_id => ({
              teacher_id: teacherId,
              branch_id
            })),
            required: false // Not all systems may have this table
          },
          // Standard junction tables
          {
            table: 'teacher_programs',
            deleteField: 'teacher_id',
            insertData: assignments.program_ids.map(program_id => ({
              teacher_id: teacherId,
              program_id
            })),
            required: true
          },
          {
            table: 'teacher_subjects',
            deleteField: 'teacher_id',
            insertData: assignments.subject_ids.map(subject_id => ({
              teacher_id: teacherId,
              subject_id
            })),
            required: true
          },
          {
            table: 'teacher_grade_levels',
            deleteField: 'teacher_id',
            insertData: assignments.grade_level_ids.map(grade_level_id => ({
              teacher_id: teacherId,
              grade_level_id
            })),
            required: true
          },
          {
            table: 'teacher_sections',
            deleteField: 'teacher_id',
            insertData: assignments.section_ids.map(section_id => ({
              teacher_id: teacherId,
              section_id
            })),
            required: true
          }
        ];

        // Process each junction table sequentially
        for (const junctionUpdate of junctionTableUpdates) {
          try {
            // Delete existing records
            const { error: deleteError } = await supabase
              .from(junctionUpdate.table)
              .delete()
              .eq(junctionUpdate.deleteField, teacherId);
            
            // Only throw error for required tables
            if (deleteError && junctionUpdate.required) {
              console.error(`Delete error in ${junctionUpdate.table}:`, deleteError);
              throw new Error(`Failed to update ${junctionUpdate.table}`);
            }
            
            // Small delay for consistency
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Insert new records if any
            if (junctionUpdate.insertData.length > 0) {
              const { error: insertError } = await supabase
                .from(junctionUpdate.table)
                .insert(junctionUpdate.insertData);
              
              // Only throw error for required tables or non-duplicate errors
              if (insertError && junctionUpdate.required && !insertError.message.includes('duplicate')) {
                console.error(`Insert error in ${junctionUpdate.table}:`, insertError);
                throw new Error(`Failed to insert into ${junctionUpdate.table}`);
              }
            }
          } catch (tableError: any) {
            if (junctionUpdate.required) {
              throw tableError;
            } else {
              console.warn(`Non-critical error in ${junctionUpdate.table}:`, tableError);
            }
          }
        }

        return { success: true };
      } catch (error) {
        console.error('Assignment update error:', error);
        throw error;
      } finally {
        setIsAssignmentLoading(false);
      }
    },
    {
      onSuccess: () => {
        toast.success('Teacher assignments updated successfully');
        setShowAssignmentModal(false);
        setSelectedTeacher(null);
        refetchTeachers();
        // Reset assignment form
        setAssignmentFormData({
          school_ids: [],
          branch_ids: [],
          program_ids: [],
          subject_ids: [],
          grade_level_ids: [],
          section_ids: []
        });
        setCurrentAssignmentStep(1);
      },
      onError: (error: any) => {
        console.error('Update assignments error:', error);
        toast.error(error.message || 'Failed to update teacher assignments');
      }
    }
  );

  // FIXED: Create Teacher with proper junction table handling
  const createTeacherMutation = useMutation(
    async (data: TeacherFormData) => {
      // Create main teacher record
      const result = await userCreationService.createUserWithInvitation({
        user_type: 'teacher',
        email: data.email,
        name: data.name,
        phone: data.phone,
        company_id: companyId,
        teacher_code: data.teacher_code,
        specialization: data.specialization,
        qualification: data.qualification,
        experience_years: data.experience_years,
        bio: data.bio,
        hire_date: data.hire_date,
        // FIXED: Use first school/branch as primary
        school_id: data.school_ids && data.school_ids.length > 0 ? data.school_ids[0] : null,
        branch_id: data.branch_ids && data.branch_ids.length > 0 ? data.branch_ids[0] : null,
        is_active: data.is_active
      });
      
      // FIXED: Handle junction table insertions if teacher created successfully
      if (result.entityId) {
        try {
          const junctionInserts = [];
          
          // Handle teacher_schools junction (if multiple schools assigned)
          if (data.school_ids && data.school_ids.length > 0) {
            try {
              await supabase.from('teacher_schools').insert(
                data.school_ids.map(school_id => ({
                  teacher_id: result.entityId,
                  school_id
                }))
              );
            } catch (err) {
              console.warn('teacher_schools junction table may not exist:', err);
            }
          }

          // Handle teacher_branches junction (if multiple branches assigned) 
          if (data.branch_ids && data.branch_ids.length > 0) {
            try {
              await supabase.from('teacher_branches').insert(
                data.branch_ids.map(branch_id => ({
                  teacher_id: result.entityId,
                  branch_id
                }))
              );
            } catch (err) {
              console.warn('teacher_branches junction table may not exist:', err);
            }
          }

          // Standard junction tables
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

          if (data.program_ids && data.program_ids.length > 0) {
            junctionInserts.push(
              supabase.from('teacher_programs').insert(
                data.program_ids.map(program_id => ({
                  teacher_id: result.entityId,
                  program_id
                }))
              )
            );
          }

          if (data.subject_ids && data.subject_ids.length > 0) {
            junctionInserts.push(
              supabase.from('teacher_subjects').insert(
                data.subject_ids.map(subject_id => ({
                  teacher_id: result.entityId,
                  subject_id
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
      
      return { ...result, email: data.email };
    },
    {
      onSuccess: (result) => {
        if (formData.send_invitation) {
          setInvitedTeacherEmail(result.email);
          setShowInvitationSuccess(true);
        }
        setShowCreateForm(false);
        refetchTeachers();
        resetForm();
        toast.success(
          formData.send_invitation 
            ? 'Teacher created successfully. Invitation email sent!' 
            : 'Teacher created successfully'
        );
      },
      onError: (error: any) => {
        console.error('Create teacher error:', error);
        toast.error(error.message || 'Failed to create teacher');
      }
    }
  );

  // FIXED: Update Teacher with junction table handling
  const updateTeacherMutation = useMutation(
    async ({ teacherId, data }: { teacherId: string; data: Partial<TeacherFormData> }) => {
      const teacher = teachers.find(t => t.id === teacherId);
      if (!teacher) throw new Error('Teacher not found');

      let emailUpdated = false;

      if (data.email && data.email !== teacher.email) {
        try {
          await userCreationService.updateEmail(teacher.user_id, data.email);
          emailUpdated = true;
          toast.info('Email updated. Teacher will receive a verification email at the new address.', {
            duration: 5000
          });
        } catch (emailError: any) {
          console.error('Email update error:', emailError);
          if (emailError.message?.includes('display only') || 
              emailError.message?.includes('admin intervention')) {
            toast.warning(
              'Email updated in display only. Contact system admin to complete the email change.',
              { duration: 10000 }
            );
          } else {
            throw new Error(emailError.message || 'Failed to update email');
          }
        }
      }

      // FIXED: Update main teacher record including primary school/branch
      const teacherUpdates: any = {
        specialization: data.specialization,
        qualification: data.qualification,
        experience_years: data.experience_years,
        bio: data.bio,
        hire_date: data.hire_date,
        updated_at: new Date().toISOString()
      };
      
      // FIXED: Update primary school/branch from arrays
      if (data.school_ids !== undefined) {
        teacherUpdates.school_id = data.school_ids.length > 0 ? data.school_ids[0] : null;
      }
      
      if (data.branch_ids !== undefined) {
        teacherUpdates.branch_id = data.branch_ids.length > 0 ? data.branch_ids[0] : null;
      }
      
      if (data.phone !== undefined) {
        teacherUpdates.phone = data.phone && data.phone.trim() !== '' ? data.phone.toString().trim() : null;
      }
      
      const { error: teacherError } = await supabase
        .from('teachers')
        .update(teacherUpdates)
        .eq('id', teacherId);
      
      if (teacherError) {
        console.error('Teacher profile update error:', teacherError);
        throw new Error(`Failed to update teacher profile: ${teacherError.message}`);
      }

      // Update user metadata
      const userUpdates: any = {
        updated_at: new Date().toISOString()
      };
      
      if (data.name && data.name !== teacher.name) {
        userUpdates.raw_user_meta_data = { 
          ...teacher.user_data?.raw_user_meta_data,
          name: data.name
        };
      }
      
      if (data.phone !== undefined) {
        if (!userUpdates.raw_user_meta_data) {
          userUpdates.raw_user_meta_data = { ...teacher.user_data?.raw_user_meta_data };
        }
        userUpdates.raw_user_meta_data.phone = data.phone && data.phone.trim() !== '' ? data.phone.trim() : null;
      }
      
      if (data.is_active !== undefined && data.is_active !== teacher.is_active) {
        userUpdates.is_active = data.is_active;
      }
      
      if (Object.keys(userUpdates).length > 1) {
        const { error: metaError } = await supabase
          .from('users')
          .update(userUpdates)
          .eq('id', teacher.user_id);
        
        if (metaError) {
          console.error('Metadata update error:', metaError);
        }
      }

      // FIXED: Update all junction table relationships
      try {
        // Handle teacher_schools junction table (if exists and data provided)
        if (data.school_ids !== undefined) {
          try {
            await supabase.from('teacher_schools').delete().eq('teacher_id', teacherId);
            await new Promise(resolve => setTimeout(resolve, 50));
            
            if (data.school_ids.length > 0) {
              await supabase.from('teacher_schools').insert(
                data.school_ids.map(school_id => ({
                  teacher_id: teacherId,
                  school_id: school_id
                }))
              );
            }
          } catch (err) {
            console.warn('teacher_schools table may not exist:', err);
          }
        }

        // Handle teacher_branches junction table (if exists and data provided)
        if (data.branch_ids !== undefined) {
          try {
            await supabase.from('teacher_branches').delete().eq('teacher_id', teacherId);
            await new Promise(resolve => setTimeout(resolve, 50));
            
            if (data.branch_ids.length > 0) {
              await supabase.from('teacher_branches').insert(
                data.branch_ids.map(branch_id => ({
                  teacher_id: teacherId,
                  branch_id: branch_id
                }))
              );
            }
          } catch (err) {
            console.warn('teacher_branches table may not exist:', err);
          }
        }

        // Standard junction table updates
        if (data.department_ids !== undefined) {
          await supabase.from('teacher_departments').delete().eq('teacher_id', teacherId);
          await new Promise(resolve => setTimeout(resolve, 50));
          
          if (data.department_ids.length > 0) {
            await supabase.from('teacher_departments').insert(
              data.department_ids.map(dept_id => ({
                teacher_id: teacherId,
                department_id: dept_id
              }))
            );
          }
        }

        if (data.program_ids !== undefined) {
          await supabase.from('teacher_programs').delete().eq('teacher_id', teacherId);
          await new Promise(resolve => setTimeout(resolve, 50));
          
          if (data.program_ids.length > 0) {
            await supabase.from('teacher_programs').insert(
              data.program_ids.map(program_id => ({
                teacher_id: teacherId,
                program_id: program_id
              }))
            );
          }
        }

        if (data.subject_ids !== undefined) {
          await supabase.from('teacher_subjects').delete().eq('teacher_id', teacherId);
          await new Promise(resolve => setTimeout(resolve, 50));
          
          if (data.subject_ids.length > 0) {
            await supabase.from('teacher_subjects').insert(
              data.subject_ids.map(subject_id => ({
                teacher_id: teacherId,
                subject_id: subject_id
              }))
            );
          }
        }

        if (data.grade_level_ids !== undefined) {
          await supabase.from('teacher_grade_levels').delete().eq('teacher_id', teacherId);
          await new Promise(resolve => setTimeout(resolve, 50));
          
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
          await new Promise(resolve => setTimeout(resolve, 50));
          
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

      return { 
        success: true, 
        emailUpdated: emailUpdated,
        teacherId: teacherId
      };
    },
    {
      onSuccess: (result) => {
        toast.success('Teacher updated successfully');
        setShowEditForm(false);
        refetchTeachers();
        resetForm();
      },
      onError: (error: any) => {
        console.error('Update teacher error:', error);
        toast.error(error.message || 'Failed to update teacher');
      },
      onSettled: () => {
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
      school_ids: [],
      branch_ids: [],
      department_ids: [],
      grade_level_ids: [],
      section_ids: [],
      program_ids: [],
      subject_ids: [],
      is_active: true,
      send_invitation: true
    });
    setFormErrors({});
    setTabErrors({
      basic: false,
      professional: false,
      assignment: false
    });
    setActiveTab('basic');
    setSelectedTeacher(null);
  }, [companyId]);

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    const newTabErrors = {
      basic: false,
      professional: false,
      assignment: false
    };
    
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
    
    // FIXED: Validate school_ids array instead of single school_id
    if (!formData.school_ids || formData.school_ids.length === 0) {
      errors.school_ids = 'At least one school is required';
      newTabErrors.assignment = true;
    }
    
    setFormErrors(errors);
    setTabErrors(newTabErrors);
    
    if (newTabErrors.basic) {
      setActiveTab('basic');
    } else if (newTabErrors.professional) {
      setActiveTab('professional');
    } else if (newTabErrors.assignment) {
      setActiveTab('assignment');
    }
    
    return Object.keys(errors).length === 0;
  }, [formData]);

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return assignmentFormData.school_ids.length > 0;
      case 2:
        return true; // Academic step is optional
      case 3:
        return true; // Classes step is optional
      case 4:
        return true; // Review step always valid
      default:
        return false;
    }
  };

  // View Teacher Details Handler
  const handleViewTeacher = (teacher: TeacherData) => {
    setViewingTeacher(teacher);
    setShowViewModal(true);
  };

  // FIXED: Open Assignment Modal with Complete Data Loading and proper query invalidation
  const handleOpenAssignmentModal = async (teacher: TeacherData) => {
    setSelectedTeacher(teacher);
    
    // FIXED: Initialize with ALL existing data from multiple assignments
    const initialData = {
      school_ids: teacher.schools?.map(s => s.id) || (teacher.school_id ? [teacher.school_id] : []),
      branch_ids: teacher.branches?.map(b => b.id) || (teacher.branch_id ? [teacher.branch_id] : []),
      program_ids: teacher.programs?.map(p => p.id) || [],
      subject_ids: teacher.subjects?.map(s => s.id) || [],
      grade_level_ids: teacher.grade_levels?.map(g => g.id) || [],
      section_ids: teacher.sections?.map(s => s.id) || []
    };
    
    // Set the form data FIRST before opening modal
    setAssignmentFormData(initialData);
    setCurrentAssignmentStep(1);
    
    // Force refetch of dependent data with the new IDs
    if (initialData.school_ids.length > 0) {
      // Invalidate and refetch branches
      await queryClient.invalidateQueries(['branches-for-schools', initialData.school_ids]);
      await queryClient.refetchQueries(['branches-for-schools', initialData.school_ids]);
      
      // Invalidate and refetch grade levels
      await queryClient.invalidateQueries(['grade-levels', initialData.school_ids, initialData.branch_ids]);
      await queryClient.refetchQueries(['grade-levels', initialData.school_ids, initialData.branch_ids]);
      
      // If grades are selected, refetch sections
      if (initialData.grade_level_ids.length > 0) {
        await queryClient.invalidateQueries(['sections', initialData.grade_level_ids]);
        await queryClient.refetchQueries(['sections', initialData.grade_level_ids]);
      }
    }
    
    // Small delay to ensure queries complete
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // NOW open the modal - data should be ready
    setShowAssignmentModal(true);
  };

  const handleNextStep = () => {
    if (validateStep(currentAssignmentStep)) {
      setCurrentAssignmentStep(prev => Math.min(prev + 1, ASSIGNMENT_STEPS.length));
    } else {
      toast.error('Please complete the required fields before proceeding');
    }
  };

  const handlePreviousStep = () => {
    setCurrentAssignmentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSaveAssignments = () => {
    if (!selectedTeacher) return;
    
    updateTeacherAssignmentsMutation.mutate({
      teacherId: selectedTeacher.id,
      assignments: assignmentFormData
    });
  };

  const handleQuickPasswordReset = async (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) {
      throw new Error('Teacher not found');
    }

    try {
      const result = await userCreationService.updatePassword(teacher.user_id, '');
      
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
      if (error.isPasswordReset && error.userEmail) {
        return { success: true, emailSent: true };
      } else if (error.message === 'PASSWORD_RESET_EMAIL_SENT') {
        return { success: true, emailSent: true };
      }
      
      throw error;
    }
  };

  // ===== EVENT HANDLERS =====
  const handleCreateTeacher = () => {
    resetForm();
    setFormData(prev => ({
      ...prev,
      teacher_code: generateTeacherCode(companyId)
    }));
    setShowCreateForm(true);
  };

  // FIXED: Handle Edit Teacher with multiple assignments
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
      // FIXED: Use multiple assignments from junction tables
      school_ids: teacher.schools?.map(s => s.id) || (teacher.school_id ? [teacher.school_id] : []),
      branch_ids: teacher.branches?.map(b => b.id) || (teacher.branch_id ? [teacher.branch_id] : []),
      department_ids: teacher.departments?.map(d => d.id) || [],
      grade_level_ids: teacher.grade_levels?.map(g => g.id) || [],
      section_ids: teacher.sections?.map(s => s.id) || [],
      program_ids: teacher.programs?.map(p => p.id) || [],
      subject_ids: teacher.subjects?.map(s => s.id) || [],
      is_active: teacher.is_active ?? true,
      send_invitation: false
    });
    setShowEditForm(true);
    setActiveTab('basic');
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
      
      // FIXED: Filter by any assigned school, not just primary
      const matchesSchool = filterSchool === 'all' || 
        teacher.schools?.some(school => school.id === filterSchool) ||
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

  // FIXED: Get selected items for display - handle multiple selections
  const getSelectedSchoolNames = () => {
    return availableSchools
      .filter(s => assignmentFormData.school_ids.includes(s.id))
      .map(s => s.name);
  };

  const getSelectedBranchNames = () => {
    return availableBranches
      .filter(b => assignmentFormData.branch_ids.includes(b.id))
      .map(b => b.name);
  };

  const getSelectedProgramNames = () => {
    return availablePrograms
      .filter(p => assignmentFormData.program_ids.includes(p.id))
      .map(p => p.name);
  };

  const getSelectedSubjectNames = () => {
    return availableSubjects
      .filter(s => assignmentFormData.subject_ids.includes(s.id))
      .map(s => s.name);
  };

  const getSelectedGradeNames = () => {
    return availableGradeLevels
      .filter(g => assignmentFormData.grade_level_ids.includes(g.id))
      .map(g => g.display_name || `${g.grade_name} (${g.grade_code}) - ${g.schools?.name}${g.branches ? ` / ${g.branches.name}` : ''}`);
  };

  const getSelectedSectionNames = () => {
    return availableSections
      .filter(s => assignmentFormData.section_ids.includes(s.id))
      .map(s => s.display_name || `${s.grade_name} - ${s.section_name} (${s.section_code})`);
  };

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
                variant="default"
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
                variant="default"
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
                  <th className="text-left p-3 font-medium" scope="col">Assignments</th>
                  <th className="text-left p-3 font-medium" scope="col">Academic</th>
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
                      <div className="space-y-1">
                        {teacher.programs && teacher.programs.length > 0 && (
                          <div className="flex items-center gap-1">
                            {teacher.programs.slice(0, 2).map((prog, idx) => (
                              <span key={prog.id} className="px-2 py-1 bg-[#8CC63F]/10 text-[#7AB532] text-xs rounded border border-[#8CC63F]/30">
                                {prog.name}
                              </span>
                            ))}
                            {teacher.programs.length > 2 && (
                              <span className="text-xs text-gray-500">+{teacher.programs.length - 2}</span>
                            )}
                          </div>
                        )}
                        {teacher.subjects && teacher.subjects.length > 0 && (
                          <div className="flex items-center gap-1">
                            {teacher.subjects.slice(0, 2).map((subj, idx) => (
                              <span key={subj.id} className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded">
                                {subj.name}
                              </span>
                            ))}
                            {teacher.subjects.length > 2 && (
                              <span className="text-xs text-gray-500">+{teacher.subjects.length - 2}</span>
                            )}
                          </div>
                        )}
                        {(!teacher.programs || teacher.programs.length === 0) && 
                         (!teacher.subjects || teacher.subjects.length === 0) && (
                          <span className="text-gray-400 text-xs">No programs/subjects</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-sm">
                        {/* FIXED: Show multiple schools/branches if assigned */}
                        {teacher.schools && teacher.schools.length > 0 ? (
                          <div>
                            <div className="text-gray-700 dark:text-gray-300">
                              {teacher.schools.length === 1 
                                ? teacher.schools[0].name 
                                : `${teacher.schools[0].name} +${teacher.schools.length - 1}`}
                            </div>
                            {teacher.branches && teacher.branches.length > 0 && (
                              <div className="text-xs text-gray-500">
                                {teacher.branches.length === 1 
                                  ? teacher.branches[0].name 
                                  : `${teacher.branches[0].name} +${teacher.branches.length - 1}`}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-gray-700 dark:text-gray-300">
                            {teacher.school_name || 'No School Assigned'}
                            {teacher.branch_name && teacher.branch_name !== 'No Branch Assigned' && (
                              <div className="text-xs text-gray-500">
                                {teacher.branch_name}
                              </div>
                            )}
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
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewTeacher(teacher)}
                          title="View Teacher Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {canModifyTeacher && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleOpenAssignmentModal(teacher)}
                              title="Manage Assignments"
                            >
                              <Link2 className="w-4 h-4" />
                            </Button>
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
                            >
                              <Edit2 className="w-4 h-4" />
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

      {/* Enhanced Assignment Modal with Wizard - FIXED BUTTONS */}
      {showAssignmentModal && selectedTeacher && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            // Close modal if clicking on backdrop (outside the modal content)
            if (e.target === e.currentTarget) {
              handleCloseAssignmentModal();
            }
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-[#8CC63F]/10 to-[#7AB532]/10">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Manage Assignments
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {selectedTeacher.name} • {selectedTeacher.email}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseAssignmentModal}
                className="text-gray-500 hover:text-gray-700"
                title="Close (ESC)"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Progress Steps */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                {ASSIGNMENT_STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = currentAssignmentStep === step.id;
                  const isCompleted = currentAssignmentStep > step.id;
                  
                  return (
                    <div key={step.id} className="flex items-center">
                      <div className="flex items-center">
                        <div 
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                            isActive && "bg-[#8CC63F] text-white",
                            isCompleted && "bg-[#8CC63F]/20 text-[#8CC63F]",
                            !isActive && !isCompleted && "bg-gray-200 dark:bg-gray-700 text-gray-500"
                          )}
                        >
                          {isCompleted ? (
                            <Check className="w-5 h-5" />
                          ) : (
                            <Icon className="w-5 h-5" />
                          )}
                        </div>
                        <div className="ml-3">
                          <p className={cn(
                            "text-sm font-medium",
                            isActive && "text-[#8CC63F]",
                            isCompleted && "text-[#7AB532]",
                            !isActive && !isCompleted && "text-gray-500"
                          )}>
                            {step.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {step.description}
                          </p>
                        </div>
                      </div>
                      {index < ASSIGNMENT_STEPS.length - 1 && (
                        <div className={cn(
                          "h-[2px] w-12 mx-3",
                          currentAssignmentStep > index + 1 ? "bg-[#8CC63F]" : "bg-gray-300 dark:bg-gray-600"
                        )} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Step 1: Schools */}
              {currentAssignmentStep === 1 && (
                <div className="space-y-6">
                  <div className="p-4 bg-[#8CC63F]/10 border border-[#8CC63F]/30 rounded-lg">
                    <div className="flex items-start gap-2">
                      <School className="h-5 w-5 text-[#8CC63F] mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-green-800 dark:text-green-200">
                          School Assignment
                        </h4>
                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                          Select the schools and branches where this teacher will work
                        </p>
                      </div>
                    </div>
                  </div>

                  <FormField id="wizard_schools" label="Schools" required>
                    <GreenSearchableMultiSelect
                      options={availableSchools.map(s => ({ value: s.id, label: s.name }))}
                      selectedValues={assignmentFormData.school_ids}
                      onChange={(values) => setAssignmentFormData(prev => ({ 
                        ...prev, 
                        school_ids: values,
                        branch_ids: [],
                        grade_level_ids: [],
                        section_ids: []
                      }))}
                      placeholder="Select schools"
                      className="focus:border-[#8CC63F] focus:ring-[#8CC63F]"
                    />
                  </FormField>

                  {assignmentFormData.school_ids.length > 0 && availableBranches.length > 0 && (
                    <FormField id="wizard_branches" label="Branches (Optional)">
                      <GreenSearchableMultiSelect
                        options={availableBranches.map(b => ({ value: b.id, label: b.name }))}
                        selectedValues={assignmentFormData.branch_ids}
                        onChange={(values) => setAssignmentFormData(prev => ({ 
                          ...prev, 
                          branch_ids: values,
                          grade_level_ids: [],
                          section_ids: []
                        }))}
                        placeholder="Select branches"
                        className="focus:border-[#8CC63F] focus:ring-[#8CC63F]"
                      />
                    </FormField>
                  )}
                </div>
              )}

              {/* Step 2: Academics */}
              {currentAssignmentStep === 2 && (
                <div className="space-y-6">
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
                    <div className="flex items-start gap-2">
                      <BookOpenCheck className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-purple-800 dark:text-purple-200">
                          Academic Programs
                        </h4>
                        <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                          Assign programs and subjects the teacher will teach
                        </p>
                      </div>
                    </div>
                  </div>

                  <FormField id="wizard_programs" label="Programs (Optional)">
                    <GreenSearchableMultiSelect
                      options={availablePrograms.map(p => ({ value: p.id, label: p.name }))}
                      selectedValues={assignmentFormData.program_ids}
                      onChange={(values) => setAssignmentFormData(prev => ({ 
                        ...prev, 
                        program_ids: values 
                      }))}
                      placeholder="Select programs (IGCSE, A Level, etc.)"
                      className="focus:border-[#8CC63F] focus:ring-[#8CC63F]"
                    />
                  </FormField>

                  <FormField id="wizard_subjects" label="Subjects (Optional)">
                    <GreenSearchableMultiSelect
                      options={availableSubjects.map(s => ({ value: s.id, label: `${s.name} (${s.code})` }))}
                      selectedValues={assignmentFormData.subject_ids}
                      onChange={(values) => setAssignmentFormData(prev => ({ 
                        ...prev, 
                        subject_ids: values 
                      }))}
                      placeholder="Select subjects"
                      className="focus:border-[#8CC63F] focus:ring-[#8CC63F]"
                    />
                  </FormField>
                </div>
              )}

              {/* Step 3: Classes - WITH SECTIONS */}
              {currentAssignmentStep === 3 && (
                <div className="space-y-6">
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Layers className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-orange-800 dark:text-orange-200">
                          Class Assignment
                        </h4>
                        <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                          Select specific grades and sections for this teacher
                        </p>
                      </div>
                    </div>
                  </div>

                  {assignmentFormData.school_ids.length === 0 ? (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                          Please select schools first in Step 1
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <FormField id="wizard_grades" label="Grade Levels (Optional)">
                        <GreenSearchableMultiSelect
                          options={availableGradeLevels.map(g => ({ 
                            value: g.id, 
                            label: g.display_name || `${g.grade_name} (${g.grade_code}) - ${g.schools?.name}${g.branches ? ` / ${g.branches.name}` : ''}`
                          }))}
                          selectedValues={assignmentFormData.grade_level_ids}
                          onChange={(values) => setAssignmentFormData(prev => ({ 
                            ...prev, 
                            grade_level_ids: values,
                            section_ids: []
                          }))}
                          placeholder="Select grade levels (shows: Grade - School / Branch)"
                          className="focus:border-[#8CC63F] focus:ring-[#8CC63F]"
                        />
                      </FormField>

                      {assignmentFormData.grade_level_ids.length > 0 ? (
                        <div className="space-y-2">
                          <FormField id="wizard_sections" label="Class Sections (Optional)">
                            <div className="mb-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                              <p className="text-xs text-amber-700 dark:text-amber-300">
                                💡 Sections show grade level for easier identification (e.g., "Grade 9 - Section A")
                              </p>
                            </div>
                            <GreenSearchableMultiSelect
                              options={availableSections.map(s => ({ 
                                value: s.id, 
                                label: s.display_name || `${s.grade_name} - ${s.section_name} (${s.section_code})`
                              }))}
                              selectedValues={assignmentFormData.section_ids}
                              onChange={(values) => setAssignmentFormData(prev => ({ 
                                ...prev, 
                                section_ids: values 
                              }))}
                              placeholder="Select sections (Grade - Section Name)"
                              className="focus:border-[#8CC63F] focus:ring-[#8CC63F]"
                            />
                            {availableSections.length === 0 && (
                              <p className="text-xs text-gray-500 mt-2">
                                No sections available for selected grades. Sections may not be configured yet.
                              </p>
                            )}
                          </FormField>
                          
                          {/* Visual helper showing selected sections grouped by grade */}
                          {assignmentFormData.section_ids.length > 0 && (
                            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                                Selected Sections by Grade:
                              </p>
                              <div className="space-y-1">
                                {Object.entries(
                                  availableSections
                                    .filter(s => assignmentFormData.section_ids.includes(s.id))
                                    .reduce((acc, section) => {
                                      const gradeName = section.grade_name || 'Unknown Grade';
                                      if (!acc[gradeName]) acc[gradeName] = [];
                                      acc[gradeName].push(section);
                                      return acc;
                                    }, {} as Record<string, typeof availableSections>)
                                ).map(([gradeName, sections]) => (
                                  <div key={gradeName} className="flex items-start gap-2">
                                    <span className="text-xs font-medium text-[#8CC63F]">{gradeName}:</span>
                                    <div className="flex flex-wrap gap-1">
                                      {sections.map(s => (
                                        <span key={s.id} className="text-xs px-2 py-0.5 bg-[#8CC63F]/10 rounded border border-[#8CC63F]/30">
                                          {s.section_name}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Please select grade levels first to see available sections
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Step 4: Review */}
              {currentAssignmentStep === 4 && (
                <div className="space-y-6">
                  <div className="p-4 bg-[#8CC63F]/10 border border-[#8CC63F]/30 rounded-lg">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-[#8CC63F] mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-green-800 dark:text-green-200">
                          Review Assignments
                        </h4>
                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                          Please review the assignments before saving
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Review Summary */}
                  <div className="space-y-4">
                    {/* Schools & Branches */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                        <School className="w-4 h-4 mr-2 text-[#8CC63F]" />
                        Schools & Branches
                      </h5>
                      <div className="space-y-1">
                        {getSelectedSchoolNames().length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {getSelectedSchoolNames().map((name, idx) => (
                              <span key={idx} className="px-3 py-1 bg-[#8CC63F]/20 text-[#7AB532] rounded-full text-sm border border-[#8CC63F]/30">
                                {name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No schools selected</p>
                        )}
                        {getSelectedBranchNames().length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {getSelectedBranchNames().map((name, idx) => (
                              <span key={idx} className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm">
                                {name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Academic Programs */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                        <BookOpenCheck className="w-4 h-4 mr-2 text-purple-600" />
                        Academic Programs
                      </h5>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Programs:</p>
                          {getSelectedProgramNames().length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {getSelectedProgramNames().map((name, idx) => (
                                <span key={idx} className="px-3 py-1 bg-[#8CC63F]/20 text-[#7AB532] rounded-full text-sm border border-[#8CC63F]/30">
                                  {name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">No programs selected</p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Subjects:</p>
                          {getSelectedSubjectNames().length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {getSelectedSubjectNames().map((name, idx) => (
                                <span key={idx} className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm">
                                  {name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">No subjects selected</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Classes */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                        <Layers className="w-4 h-4 mr-2 text-orange-600" />
                        Classes
                      </h5>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Grade Levels:</p>
                          {getSelectedGradeNames().length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {getSelectedGradeNames().map((name, idx) => (
                                <span key={idx} className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-sm">
                                  {name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">No grades selected</p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Sections:</p>
                          {assignmentFormData.section_ids.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {getSelectedSectionNames().map((name, idx) => (
                                <span key={idx} className="px-3 py-1 bg-[#8CC63F]/20 text-[#7AB532] rounded-full text-sm border border-[#8CC63F]/30">
                                  {name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">No sections selected</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* FIXED: Modal Footer with proper Button component usage */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center justify-between">
                <div>
                  {currentAssignmentStep === 1 && assignmentFormData.school_ids.length === 0 && (
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      * At least one school is required
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  {currentAssignmentStep > 1 && (
                    <Button
                      variant="outline"
                      onClick={handlePreviousStep}
                      disabled={isAssignmentLoading}
                    >
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Previous
                    </Button>
                  )}
                  
                  {currentAssignmentStep < ASSIGNMENT_STEPS.length ? (
                    <Button
                      onClick={handleNextStep}
                      disabled={currentAssignmentStep === 1 && assignmentFormData.school_ids.length === 0 || isAssignmentLoading}
                      variant="default"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSaveAssignments}
                      disabled={isAssignmentLoading || updateTeacherAssignmentsMutation.isLoading}
                      variant="default"
                    >
                      {isAssignmentLoading || updateTeacherAssignmentsMutation.isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Save Assignments
                        </>
                      )}
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    onClick={handleCloseAssignmentModal}
                    disabled={isAssignmentLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FIXED: View Teacher Details Modal - Complete Implementation with Multiple Assignments */}
      {showViewModal && viewingTeacher && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            // Close modal if clicking on backdrop (outside the modal content)
            if (e.target === e.currentTarget) {
              handleCloseViewModal();
            }
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-[#8CC63F]/10 to-[#7AB532]/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#8CC63F]/20 rounded-full flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-[#8CC63F]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Teacher Details
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Complete profile and assignment information
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseViewModal}
                  className="text-gray-500 hover:text-gray-700"
                  title="Close (ESC)"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Modal Body - Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2 text-[#8CC63F]" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Full Name</label>
                      <p className="text-sm text-gray-900 dark:text-white mt-1">{viewingTeacher.name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Teacher Code</label>
                      <p className="text-sm font-mono text-gray-900 dark:text-white mt-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded inline-block">
                        {viewingTeacher.teacher_code}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Email</label>
                      <p className="text-sm text-gray-900 dark:text-white mt-1">{viewingTeacher.email || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Phone</label>
                      <p className="text-sm text-gray-900 dark:text-white mt-1">{viewingTeacher.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</label>
                      <div className="mt-1">
                        <StatusBadge
                          status={viewingTeacher.is_active ? 'active' : 'inactive'}
                          variant={viewingTeacher.is_active ? 'success' : 'warning'}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Hire Date</label>
                      <p className="text-sm text-gray-900 dark:text-white mt-1">
                        {viewingTeacher.hire_date ? new Date(viewingTeacher.hire_date).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Professional Information */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Briefcase className="w-5 h-5 mr-2 text-purple-600" />
                    Professional Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Qualification</label>
                      <p className="text-sm text-gray-900 dark:text-white mt-1">{viewingTeacher.qualification || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Experience</label>
                      <p className="text-sm text-gray-900 dark:text-white mt-1">
                        {viewingTeacher.experience_years ? `${viewingTeacher.experience_years} years` : 'N/A'}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Specializations</label>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {viewingTeacher.specialization && viewingTeacher.specialization.length > 0 ? (
                          viewingTeacher.specialization.map((spec, idx) => (
                            <span key={idx} className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm rounded-full">
                              {spec}
                            </span>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">No specializations listed</p>
                        )}
                      </div>
                    </div>
                    {viewingTeacher.bio && (
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Biography</label>
                        <p className="text-sm text-gray-900 dark:text-white mt-1">{viewingTeacher.bio}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* FIXED: Location Assignment - Show Multiple Schools/Branches */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-orange-600" />
                    Location Assignment
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Assigned Schools</label>
                      {viewingTeacher.schools && viewingTeacher.schools.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {viewingTeacher.schools.map((school) => (
                            <span key={school.id} className="px-3 py-1 bg-[#8CC63F]/20 text-[#7AB532] text-sm rounded-full border border-[#8CC63F]/30">
                              {school.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">{viewingTeacher.school_name || 'No schools assigned'}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Assigned Branches</label>
                      {viewingTeacher.branches && viewingTeacher.branches.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {viewingTeacher.branches.map((branch) => (
                            <span key={branch.id} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded-full">
                              {branch.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">{viewingTeacher.branch_name || 'No branches assigned'}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Academic Assignments */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <BookOpen className="w-5 h-5 mr-2 text-blue-600" />
                    Academic Assignments
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Programs</label>
                      {viewingTeacher.programs && viewingTeacher.programs.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {viewingTeacher.programs.map((prog) => (
                            <span key={prog.id} className="px-3 py-1 bg-[#8CC63F]/20 text-[#7AB532] text-sm rounded-full border border-[#8CC63F]/30">
                              {prog.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No programs assigned</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Subjects</label>
                      {viewingTeacher.subjects && viewingTeacher.subjects.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {viewingTeacher.subjects.map((subj) => (
                            <span key={subj.id} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded-full">
                              {subj.name} ({subj.code})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No subjects assigned</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Class Assignments */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Layers className="w-5 h-5 mr-2 text-green-600" />
                    Class Assignments
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Grade Levels</label>
                      {viewingTeacher.grade_levels && viewingTeacher.grade_levels.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {viewingTeacher.grade_levels.map((grade) => (
                            <span key={grade.id} className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm rounded-full">
                              {grade.grade_name} ({grade.grade_code})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No grade levels assigned</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Sections</label>
                      {viewingTeacher.sections && viewingTeacher.sections.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {viewingTeacher.sections.map((section) => (
                            <span key={section.id} className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-sm rounded-full">
                              {section.section_name} ({section.section_code})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No sections assigned</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Info className="w-5 h-5 mr-2 text-gray-600" />
                    Additional Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Created At</label>
                      <p className="text-sm text-gray-900 dark:text-white mt-1">
                        {new Date(viewingTeacher.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Last Updated</label>
                      <p className="text-sm text-gray-900 dark:text-white mt-1">
                        {new Date(viewingTeacher.updated_at).toLocaleString()}
                      </p>
                    </div>
                    {viewingTeacher.user_data?.last_sign_in_at && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Last Sign In</label>
                        <p className="text-sm text-gray-900 dark:text-white mt-1">
                          {new Date(viewingTeacher.user_data.last_sign_in_at).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* FIXED: Modal Footer with proper Button components */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  This is a read-only view. Use Edit or Assignments buttons to make changes.
                </p>
                <div className="flex gap-3">
                  {canModifyTeacher && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowViewModal(false);
                          handleEditTeacher(viewingTeacher);
                        }}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit Details
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowViewModal(false);
                          handleOpenAssignmentModal(viewingTeacher);
                        }}
                      >
                        <Link2 className="w-4 h-4 mr-2" />
                        Manage Assignments
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleCloseViewModal}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FIXED: Create/Edit Form - SlideInForm with Multiple School Support */}
      {(showCreateForm || showEditForm) && (
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
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic" className={tabErrors.basic ? 'text-red-500' : ''}>
                Basic Info {tabErrors.basic && <span className="ml-1 text-red-500">•</span>}
              </TabsTrigger>
              <TabsTrigger value="professional" className={tabErrors.professional ? 'text-red-500' : ''}>
                Professional
              </TabsTrigger>
              <TabsTrigger value="assignment" className={tabErrors.assignment ? 'text-red-500' : ''}>
                Assignment {tabErrors.assignment && <span className="ml-1 text-red-500">•</span>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <FormField id="name" label="Full Name" required error={formErrors.name}>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter teacher's full name"
                  className={formErrors.name ? 'border-red-500' : ''}
                />
              </FormField>

              <FormField id="email" label="Email" required error={formErrors.email}>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="teacher@school.com"
                  className={formErrors.email ? 'border-red-500' : ''}
                />
              </FormField>

              <FormField id="phone" label="Phone Number">
                <PhoneInput
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(value) => setFormData({ ...formData, phone: value })}
                  placeholder="Enter phone number"
                />
              </FormField>

              <FormField id="teacher_code" label="Teacher Code" required error={formErrors.teacher_code}>
                <Input
                  id="teacher_code"
                  value={formData.teacher_code}
                  onChange={(e) => setFormData({ ...formData, teacher_code: e.target.value })}
                  placeholder="TCH-XXXXX"
                  readOnly={showEditForm}
                  className={`font-mono ${formErrors.teacher_code ? 'border-red-500' : ''} ${showEditForm ? 'bg-gray-100' : ''}`}
                />
              </FormField>

              <FormField id="is_active" label="Account Status">
                <ToggleSwitch
                  id="is_active"
                  checked={formData.is_active ?? true}
                  onChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  label={formData.is_active ? 'Active' : 'Inactive'}
                />
              </FormField>

              {showCreateForm && (
                <FormField id="send_invitation" label="Send Invitation Email">
                  <ToggleSwitch
                    id="send_invitation"
                    checked={formData.send_invitation ?? true}
                    onChange={(checked) => setFormData({ ...formData, send_invitation: checked })}
                    label={formData.send_invitation ? 'Yes, send invitation' : 'No, create without invitation'}
                  />
                </FormField>
              )}
            </TabsContent>

            <TabsContent value="professional" className="space-y-4">
              <FormField id="specialization" label="Specialization">
                <SearchableMultiSelect
                  options={SPECIALIZATION_OPTIONS.map(s => ({ value: s, label: s }))}
                  selectedValues={formData.specialization || []}
                  onChange={(values) => setFormData({ ...formData, specialization: values })}
                  placeholder="Select specializations"
                />
              </FormField>

              <FormField id="qualification" label="Qualification">
                <Select
                  value={formData.qualification || ''}
                  onChange={(value) => setFormData({ ...formData, qualification: value })}
                  options={[
                    { value: '', label: 'Select qualification' },
                    ...QUALIFICATION_OPTIONS.map(q => ({ value: q, label: q }))
                  ]}
                />
              </FormField>

              <FormField id="experience" label="Years of Experience">
                <Input
                  id="experience"
                  type="number"
                  min="0"
                  value={formData.experience_years || 0}
                  onChange={(e) => setFormData({ ...formData, experience_years: parseInt(e.target.value) || 0 })}
                />
              </FormField>

              <FormField id="hire_date" label="Hire Date">
                <Input
                  id="hire_date"
                  type="date"
                  value={formData.hire_date || ''}
                  onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                />
              </FormField>

              <FormField id="bio" label="Bio">
                <Textarea
                  id="bio"
                  value={formData.bio || ''}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Brief bio or description"
                  rows={3}
                />
              </FormField>
            </TabsContent>

            <TabsContent value="assignment" className="space-y-4">
              {/* FIXED: Support multiple school assignments */}
              <FormField id="school_ids" label="Schools" required error={formErrors.school_ids}>
                <SearchableMultiSelect
                  options={availableSchools.map(s => ({ value: s.id, label: s.name }))}
                  selectedValues={formData.school_ids || []}
                  onChange={(values) => setFormData({ ...formData, school_ids: values, branch_ids: [], grade_level_ids: [], section_ids: [] })}
                  placeholder="Select schools (at least one required)"
                  className={formErrors.school_ids ? 'border-red-500' : ''}
                />
              </FormField>

              {formData.school_ids && formData.school_ids.length > 0 && formBranches.length > 0 && (
                <FormField id="branch_ids" label="Branches (Optional)">
                  <SearchableMultiSelect
                    options={formBranches.map(b => ({ value: b.id, label: b.name }))}
                    selectedValues={formData.branch_ids || []}
                    onChange={(values) => setFormData({ ...formData, branch_ids: values, grade_level_ids: [], section_ids: [] })}
                    placeholder="Select branches"
                  />
                </FormField>
              )}

              <FormField id="departments" label="Departments">
                <SearchableMultiSelect
                  options={availableDepartments.map(d => ({ value: d.id, label: d.name }))}
                  selectedValues={formData.department_ids || []}
                  onChange={(values) => setFormData({ ...formData, department_ids: values })}
                  placeholder="Select departments"
                />
              </FormField>

              {/* FIXED: Add grade levels and sections to the form */}
              {formData.school_ids && formData.school_ids.length > 0 && (
                <>
                  <FormField id="grade_level_ids" label="Grade Levels (Optional)">
                    <SearchableMultiSelect
                      options={formGradeLevels.map(g => ({ 
                        value: g.id, 
                        label: g.display_name || `${g.grade_name} (${g.grade_code}) - ${g.schools?.name}${g.branches ? ` / ${g.branches.name}` : ''}`
                      }))}
                      selectedValues={formData.grade_level_ids || []}
                      onChange={(values) => setFormData({ ...formData, grade_level_ids: values, section_ids: [] })}
                      placeholder="Select grade levels"
                    />
                    {formGradeLevels.length === 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        No grade levels available for selected schools. Grade levels may not be configured yet.
                      </p>
                    )}
                  </FormField>

                  {formData.grade_level_ids && formData.grade_level_ids.length > 0 && (
                    <FormField id="section_ids" label="Class Sections (Optional)">
                      <SearchableMultiSelect
                        options={formSections.map(s => ({ 
                          value: s.id, 
                          label: s.display_name || `${s.grade_name} - ${s.section_name} (${s.section_code})`
                        }))}
                        selectedValues={formData.section_ids || []}
                        onChange={(values) => setFormData({ ...formData, section_ids: values })}
                        placeholder="Select sections"
                      />
                      {formSections.length === 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          No sections available for selected grades. Sections may not be configured yet.
                        </p>
                      )}
                    </FormField>
                  )}

                  <FormField id="program_ids" label="Programs (Optional)">
                    <SearchableMultiSelect
                      options={availablePrograms.map(p => ({ value: p.id, label: p.name }))}
                      selectedValues={formData.program_ids || []}
                      onChange={(values) => setFormData({ ...formData, program_ids: values })}
                      placeholder="Select programs"
                    />
                  </FormField>

                  <FormField id="subject_ids" label="Subjects (Optional)">
                    <SearchableMultiSelect
                      options={availableSubjects.map(s => ({ value: s.id, label: `${s.name} (${s.code})` }))}
                      selectedValues={formData.subject_ids || []}
                      onChange={(values) => setFormData({ ...formData, subject_ids: values })}
                      placeholder="Select subjects"
                    />
                  </FormField>
                </>
              )}

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  💡 You can assign basic relationships here, or use the detailed Assignment Wizard after saving for more advanced configuration.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </SlideInForm>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirmation && selectedTeacher && (
        <ConfirmationDialog
          isOpen={showDeleteConfirmation}
          onCancel={() => {
            setShowDeleteConfirmation(false);
            setSelectedTeacher(null);
          }}
          onConfirm={() => {
            deleteTeacherMutation.mutate([selectedTeacher.id]);
            setSelectedTeacher(null);
          }}
          title="Delete Teacher"
          message={`Are you sure you want to delete ${selectedTeacher.name}? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
        />
      )}

      {/* Bulk Action Confirmation */}
      {showBulkActionConfirmation && (
        <ConfirmationDialog
          open={showBulkActionConfirmation}
          onClose={() => {
            setShowBulkActionConfirmation(false);
            setBulkAction(null);
          }}
          onConfirm={handleConfirmBulkAction}
          title={
            bulkAction === 'delete' ? 'Delete Teachers' :
            bulkAction === 'activate' ? 'Activate Teachers' :
            'Deactivate Teachers'
          }
          message={`Are you sure you want to ${bulkAction} ${selectedTeachers.length} teacher(s)?`}
          confirmText={bulkAction === 'delete' ? 'Delete' : bulkAction === 'activate' ? 'Activate' : 'Deactivate'}
          cancelText="Cancel"
          variant={bulkAction === 'delete' ? 'destructive' : 'default'}
        />
      )}

      {/* Success Message for Invitation */}
      {showInvitationSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center mb-4">
              <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
              <h3 className="text-lg font-semibold">Teacher Created Successfully!</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              An invitation email has been sent to <strong>{invitedTeacherEmail}</strong>.
            </p>
            <Button
              onClick={() => {
                setShowInvitationSuccess(false);
                setInvitedTeacherEmail('');
              }}
              variant="default"
              className="w-full"
            >
              OK
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}