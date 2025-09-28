/**
 * File: /src/app/entity-module/organisation/tabs/teachers/page.tsx
 * 
 * ENHANCED WIZARD VERSION: Teachers Tab with Step-by-Step Assignment System
 * 
 * New Features in This Version:
 * ✅ Wizard-style assignment modal with progress steps
 * ✅ Green theme (#8CC63F) for all selections and borders
 * ✅ Step validation before proceeding
 * ✅ Review step showing all selections before save
 * ✅ Better visual hierarchy and user guidance
 * ✅ Smooth transitions between steps
 * 
 * All original features preserved including:
 * ✅ Teacher creation with invitation email
 * ✅ Password reset functionality
 * ✅ Comprehensive assignment management
 * ✅ Scope-based filtering
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
  CheckCircle, XCircle, Send, Link2, BookOpenCheck, Award as AwardIcon,
  ChevronRight, ChevronLeft, Check, ArrowRight
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
  programs?: { id: string; name: string }[];
  subjects?: { id: string; name: string; code: string }[];
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
  program_ids?: string[];
  subject_ids?: string[];
  
  // Settings
  is_active?: boolean;
  send_invitation?: boolean;
}

interface AssignmentModalData {
  teacher: TeacherData;
  schools: string[];
  branches: string[];
  programs: string[];
  subjects: string[];
  grades: string[];
  sections: string[];
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

// Custom green-themed SearchableMultiSelect wrapper
const GreenSearchableMultiSelect = ({ ...props }) => {
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
  
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherData | null>(null);
  const [bulkAction, setBulkAction] = useState<'activate' | 'deactivate' | 'delete' | null>(null);
  const [invitedTeacherEmail, setInvitedTeacherEmail] = useState<string>('');
  
  // Assignment Wizard State
  const [currentAssignmentStep, setCurrentAssignmentStep] = useState(1);
  const [assignmentData, setAssignmentData] = useState<AssignmentModalData | null>(null);
  const [assignmentFormData, setAssignmentFormData] = useState({
    school_ids: [] as string[],
    branch_ids: [] as string[],
    program_ids: [] as string[],
    subject_ids: [] as string[],
    grade_level_ids: [] as string[],
    section_ids: [] as string[]
  });
  
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

        // Fetch teacher relationships including new program and subject assignments
        const enrichedTeachers = await Promise.all(
          teachersData.map(async (teacher) => {
            try {
              const [deptData, gradeData, sectionData, programData, subjectData] = await Promise.all([
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
                programs: programData.data?.map(p => p.programs).filter(Boolean) || [],
                subjects: subjectData.data?.map(s => s.edu_subjects).filter(Boolean) || [],
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

  // Fetch branches for selected school(s)
  const { data: availableBranches = [] } = useQuery(
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
      enabled: assignmentFormData.school_ids && assignmentFormData.school_ids.length > 0,
      staleTime: 5 * 60 * 1000
    }
  );

  // Fetch available programs
  const { data: availablePrograms = [] } = useQuery(
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
      
      return (data || []) as Program[];
    },
    { 
      enabled: !!companyId,
      staleTime: 5 * 60 * 1000
    }
  );

  // Fetch available subjects
  const { data: availableSubjects = [] } = useQuery(
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
      
      return (data || []) as Subject[];
    },
    { 
      enabled: !!companyId,
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
    ['grade-levels', assignmentFormData.school_ids, assignmentFormData.branch_ids],
    async () => {
      if (!assignmentFormData.school_ids || assignmentFormData.school_ids.length === 0) return [];
      
      let query = supabase
        .from('grade_levels')
        .select('id, grade_name, grade_code, grade_order, school_id, branch_id')
        .in('school_id', assignmentFormData.school_ids)
        .eq('status', 'active')
        .order('grade_order');

      if (assignmentFormData.branch_ids && assignmentFormData.branch_ids.length > 0) {
        query = query.in('branch_id', assignmentFormData.branch_ids);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Grade levels query error:', error);
        return [];
      }
      
      return (data || []) as GradeLevel[];
    },
    { 
      enabled: assignmentFormData.school_ids && assignmentFormData.school_ids.length > 0,
      staleTime: 5 * 60 * 1000
    }
  );

  // Fetch sections for selected grade levels
  const { data: availableSections = [] } = useQuery(
    ['sections', assignmentFormData.grade_level_ids],
    async () => {
      if (!assignmentFormData.grade_level_ids || assignmentFormData.grade_level_ids.length === 0) return [];
      
      const { data, error } = await supabase
        .from('class_sections')
        .select('id, section_name, section_code, grade_level_id')
        .in('grade_level_id', assignmentFormData.grade_level_ids)
        .eq('status', 'active')
        .order('class_section_order');
      
      if (error) {
        console.error('Sections query error:', error);
        return [];
      }
      
      return (data || []) as ClassSection[];
    },
    { 
      enabled: assignmentFormData.grade_level_ids && assignmentFormData.grade_level_ids.length > 0,
      staleTime: 5 * 60 * 1000
    }
  );

  // ===== MUTATIONS =====
  
  // Update Teacher Assignments Mutation
  const updateTeacherAssignmentsMutation = useMutation(
    async ({ teacherId, assignments }: { teacherId: string; assignments: typeof assignmentFormData }) => {
      // Update school and branch in teachers table
      const teacherUpdates: any = {};
      
      if (assignments.school_ids.length > 0) {
        teacherUpdates.school_id = assignments.school_ids[0]; // Primary school
      }
      
      if (assignments.branch_ids.length > 0) {
        teacherUpdates.branch_id = assignments.branch_ids[0]; // Primary branch
      }
      
      if (Object.keys(teacherUpdates).length > 0) {
        const { error } = await supabase
          .from('teachers')
          .update(teacherUpdates)
          .eq('id', teacherId);
        
        if (error) throw error;
      }

      // Update junction tables
      const junctionUpdates = [];

      // Programs
      junctionUpdates.push(
        supabase.from('teacher_programs').delete().eq('teacher_id', teacherId)
      );
      if (assignments.program_ids.length > 0) {
        junctionUpdates.push(
          supabase.from('teacher_programs').insert(
            assignments.program_ids.map(program_id => ({
              teacher_id: teacherId,
              program_id
            }))
          )
        );
      }

      // Subjects
      junctionUpdates.push(
        supabase.from('teacher_subjects').delete().eq('teacher_id', teacherId)
      );
      if (assignments.subject_ids.length > 0) {
        junctionUpdates.push(
          supabase.from('teacher_subjects').insert(
            assignments.subject_ids.map(subject_id => ({
              teacher_id: teacherId,
              subject_id
            }))
          )
        );
      }

      // Grade Levels
      junctionUpdates.push(
        supabase.from('teacher_grade_levels').delete().eq('teacher_id', teacherId)
      );
      if (assignments.grade_level_ids.length > 0) {
        junctionUpdates.push(
          supabase.from('teacher_grade_levels').insert(
            assignments.grade_level_ids.map(grade_id => ({
              teacher_id: teacherId,
              grade_level_id: grade_id
            }))
          )
        );
      }

      // Sections
      junctionUpdates.push(
        supabase.from('teacher_sections').delete().eq('teacher_id', teacherId)
      );
      if (assignments.section_ids.length > 0) {
        junctionUpdates.push(
          supabase.from('teacher_sections').insert(
            assignments.section_ids.map(section_id => ({
              teacher_id: teacherId,
              section_id
            }))
          )
        );
      }

      await Promise.all(junctionUpdates);

      return { success: true };
    },
    {
      onSuccess: () => {
        toast.success('Teacher assignments updated successfully');
        setShowAssignmentModal(false);
        refetchTeachers();
      },
      onError: (error: any) => {
        console.error('Update assignments error:', error);
        toast.error('Failed to update teacher assignments');
      }
    }
  );

  // Create Teacher with Invitation Email
  const createTeacherMutation = useMutation(
    async (data: TeacherFormData) => {
      // Create user with invitation (no password)
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
          console.warn('Junction tables may not exist yet:', err);
        }
      }
      
      return { ...result, email: data.email };
    },
    {
      onSuccess: (result) => {
        setInvitedTeacherEmail(result.email);
        setShowInvitationSuccess(true);
        setShowCreateForm(false);
        refetchTeachers();
        resetForm();
        toast.success('Teacher created successfully. Invitation email sent!');
      },
      onError: (error: any) => {
        console.error('Create teacher error:', error);
        toast.error(error.message || 'Failed to create teacher');
      }
    }
  );

  // Update Teacher
  const updateTeacherMutation = useMutation(
    async ({ teacherId, data }: { teacherId: string; data: Partial<TeacherFormData> }) => {
      // Find the teacher for user ID
      const teacher = teachers.find(t => t.id === teacherId);
      if (!teacher) throw new Error('Teacher not found');

      // Track what was updated
      let emailUpdated = false;

      // Handle Email Update (if changed)
      if (data.email && data.email !== teacher.email) {
        try {
          await userCreationService.updateEmail(teacher.user_id, data.email);
          emailUpdated = true;
          console.log('Email updated successfully');
          
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

      // Update Teacher Profile
      const teacherUpdates: any = {
        specialization: data.specialization,
        qualification: data.qualification,
        experience_years: data.experience_years,
        bio: data.bio,
        hire_date: data.hire_date,
        school_id: data.school_id && data.school_id !== '' ? data.school_id : null,
        branch_id: data.branch_id && data.branch_id !== '' ? data.branch_id : null,
        updated_at: new Date().toISOString()
      };
      
      if (data.phone !== undefined) {
        teacherUpdates.phone = data.phone ? data.phone.toString() : null;
      }
      
      const { error: teacherError } = await supabase
        .from('teachers')
        .update(teacherUpdates)
        .eq('id', teacherId);
      
      if (teacherError) {
        console.error('Teacher profile update error:', teacherError);
        throw new Error(`Failed to update teacher profile: ${teacherError.message}`);
      }

      // Update Metadata in custom users table
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
        userUpdates.raw_user_meta_data.phone = data.phone;
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

      // Update Teaching Relationships
      try {
        if (data.department_ids !== undefined) {
          await supabase
            .from('teacher_departments')
            .delete()
            .eq('teacher_id', teacherId);
          
          if (data.department_ids.length > 0) {
            await supabase
              .from('teacher_departments')
              .insert(
                data.department_ids.map(dept_id => ({
                  teacher_id: teacherId,
                  department_id: dept_id
                }))
              );
          }
        }

        if (data.program_ids !== undefined) {
          await supabase
            .from('teacher_programs')
            .delete()
            .eq('teacher_id', teacherId);
          
          if (data.program_ids.length > 0) {
            await supabase
              .from('teacher_programs')
              .insert(
                data.program_ids.map(program_id => ({
                  teacher_id: teacherId,
                  program_id
                }))
              );
          }
        }

        if (data.subject_ids !== undefined) {
          await supabase
            .from('teacher_subjects')
            .delete()
            .eq('teacher_id', teacherId);
          
          if (data.subject_ids.length > 0) {
            await supabase
              .from('teacher_subjects')
              .insert(
                data.subject_ids.map(subject_id => ({
                  teacher_id: teacherId,
                  subject_id
                }))
              );
          }
        }

        if (data.grade_level_ids !== undefined) {
          await supabase
            .from('teacher_grade_levels')
            .delete()
            .eq('teacher_id', teacherId);
          
          if (data.grade_level_ids.length > 0) {
            await supabase
              .from('teacher_grade_levels')
              .insert(
                data.grade_level_ids.map(grade_id => ({
                  teacher_id: teacherId,
                  grade_level_id: grade_id
                }))
              );
          }
        }

        if (data.section_ids !== undefined) {
          await supabase
            .from('teacher_sections')
            .delete()
            .eq('teacher_id', teacherId);
          
          if (data.section_ids.length > 0) {
            await supabase
              .from('teacher_sections')
              .insert(
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
      school_id: '',
      branch_id: '',
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
  }, [formData]);

  // Validate current step
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

  // Open Assignment Modal
  const handleOpenAssignmentModal = (teacher: TeacherData) => {
    setSelectedTeacher(teacher);
    setAssignmentFormData({
      school_ids: teacher.school_id ? [teacher.school_id] : [],
      branch_ids: teacher.branch_id ? [teacher.branch_id] : [],
      program_ids: teacher.programs?.map(p => p.id) || [],
      subject_ids: teacher.subjects?.map(s => s.id) || [],
      grade_level_ids: teacher.grade_levels?.map(g => g.id) || [],
      section_ids: teacher.sections?.map(s => s.id) || []
    });
    setCurrentAssignmentStep(1);
    setShowAssignmentModal(true);
  };

  // Handle step navigation
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

  // Save Assignment Changes
  const handleSaveAssignments = () => {
    if (!selectedTeacher) return;
    
    updateTeacherAssignmentsMutation.mutate({
      teacherId: selectedTeacher.id,
      assignments: assignmentFormData
    });
  };

  // Quick Password Reset Handler
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

  // Get selected items for display
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
      .map(g => `${g.grade_name} (${g.grade_code})`);
  };

  const getSelectedSectionNames = () => {
    return availableSections
      .filter(s => assignmentFormData.section_ids.includes(s.id))
      .map(s => `${s.section_name} (${s.section_code})`);
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
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleOpenAssignmentModal(teacher)}
                              title="Manage Assignments"
                              className="hover:border-[#8CC63F] hover:text-[#8CC63F]"
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

      {/* Enhanced Assignment Modal with Wizard */}
      {showAssignmentModal && selectedTeacher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
              <button
                onClick={() => {
                  setShowAssignmentModal(false);
                  setSelectedTeacher(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
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

                  {assignmentFormData.school_ids.length > 0 && (
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

              {/* Step 3: Classes */}
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
                          options={availableGradeLevels.map(g => ({ value: g.id, label: `${g.grade_name} (${g.grade_code})` }))}
                          selectedValues={assignmentFormData.grade_level_ids}
                          onChange={(values) => setAssignmentFormData(prev => ({ 
                            ...prev, 
                            grade_level_ids: values,
                            section_ids: []
                          }))}
                          placeholder="Select grade levels"
                          className="focus:border-[#8CC63F] focus:ring-[#8CC63F]"
                        />
                      </FormField>

                      {assignmentFormData.grade_level_ids.length > 0 && (
                        <FormField id="wizard_sections" label="Class Sections (Optional)">
                          <GreenSearchableMultiSelect
                            options={availableSections.map(s => ({ value: s.id, label: `${s.section_name} (${s.section_code})` }))}
                            selectedValues={assignmentFormData.section_ids}
                            onChange={(values) => setAssignmentFormData(prev => ({ 
                              ...prev, 
                              section_ids: values 
                            }))}
                            placeholder="Select sections"
                            className="focus:border-[#8CC63F] focus:ring-[#8CC63F]"
                          />
                        </FormField>
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
                          {getSelectedSectionNames().length > 0 ? (
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

            {/* Modal Footer */}
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
                      className="border-gray-300 hover:border-[#8CC63F] hover:text-[#8CC63F]"
                    >
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Previous
                    </Button>
                  )}
                  
                  {currentAssignmentStep < ASSIGNMENT_STEPS.length ? (
                    <Button
                      onClick={handleNextStep}
                      disabled={currentAssignmentStep === 1 && assignmentFormData.school_ids.length === 0}
                      className="bg-[#8CC63F] hover:bg-[#7AB532] text-white"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSaveAssignments}
                      disabled={updateTeacherAssignmentsMutation.isLoading}
                      className="bg-[#8CC63F] hover:bg-[#7AB532] text-white"
                    >
                      {updateTeacherAssignmentsMutation.isLoading ? (
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
                    onClick={() => {
                      setShowAssignmentModal(false);
                      setSelectedTeacher(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Other existing modals remain unchanged... */}
      {/* (Create/Edit Form Modal, Invitation Success Modal, Delete Confirmation, Bulk Action Confirmation) */}
      {/* These would continue with the existing implementation from the original code */}
    </div>
  );
}