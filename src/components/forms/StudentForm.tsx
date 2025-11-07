/**
 * File: /src/components/forms/StudentForm.tsx
 * 
 * Student Form Component - FIXED VERSION
 * Wrapper component that manages student creation and editing
 * 
 * FIXES APPLIED:
 * 1. Properly passes subjects data to StudentFormContent
 * 2. Fixed subjects query to properly fetch from data_structures table
 * 3. Added program_id field to form data
 * 4. Improved enrolled_subjects handling
 * 
 * Features:
 * - Complete form state management
 * - Data fetching for dropdowns
 * - Validation using Zod schema
 * - Integration with userCreationService
 * - Multi-tab interface with error indicators
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { GraduationCap, AlertCircle, CheckCircle, User, Users } from 'lucide-react';
import { SlideInForm } from '../shared/SlideInForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../shared/Tabs';
import { toast } from '../shared/Toast';
import { supabase } from '../../lib/supabase';
import { useAccessControl } from '../../hooks/useAccessControl';
import { useUser } from '../../contexts/UserContext';
import { userCreationService } from '../../services/userCreationService';
import StudentFormContent from './StudentFormContent';

// ===== VALIDATION SCHEMA =====
const studentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  email: z.string().email('Invalid email address').transform(email => email.toLowerCase().trim()),
  phone: z.string().optional(),
  student_code: z.string().min(1, 'Student code is required').max(50, 'Student code too long'),
  enrollment_number: z.string().max(50, 'Enrollment number too long').optional(),
  grade_level: z.string().min(1, 'Grade level is required'),
  section: z.string().min(1, 'Section is required'),
  admission_date: z.string().min(1, 'Admission date is required'),
  school_id: z.string().uuid('Invalid school selection'),
  branch_id: z.string().uuid('Invalid branch selection'),
  parent_name: z.string().optional(),
  parent_contact: z.string().optional(),
  parent_email: z.string().email('Invalid parent email').optional().or(z.literal('')),
  emergency_contact: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    relationship: z.string().optional(),
    address: z.string().optional()
  }).optional(),
  program_id: z.string().uuid('Invalid program selection'),
  enrolled_subjects: z.array(z.string().uuid()).min(1, 'At least one subject must be selected'),
  is_active: z.boolean()
});

// ===== INTERFACES =====
interface StudentFormData {
  name: string;
  email: string;
  phone: string;
  student_code: string;
  enrollment_number: string;
  grade_level: string;
  section: string;
  admission_date: string;
  school_id: string;
  branch_id: string;
  parent_name: string;
  parent_contact: string;
  parent_email: string;
  emergency_contact: {
    name: string;
    phone: string;
    relationship: string;
    address: string;
  };
  program_id: string;
  enrolled_subjects: string[];
  is_active: boolean;
}

interface StudentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  companyId: string;
  initialData?: {
    id: string;
    user_id: string;
    name: string;
    email: string;
    phone?: string;
    student_code: string;
    enrollment_number: string;
    grade_level?: string;
    section?: string;
    admission_date?: string;
    school_id?: string;
    branch_id?: string;
    parent_name?: string;
    parent_contact?: string;
    parent_email?: string;
    emergency_contact?: Record<string, any>;
    program_id?: string;
    enrolled_subjects?: string[];
    is_active: boolean;
    company_id: string;
  };
}

// ===== MAIN COMPONENT =====
export function StudentForm({
  isOpen,
  onClose,
  onSuccess,
  companyId,
  initialData
}: StudentFormProps) {
  const { user } = useUser();
  const { getScopeFilters, isEntityAdmin, isSubEntityAdmin } = useAccessControl();
  const queryClient = useQueryClient();
  const isEditing = !!initialData;

  // ===== STATE MANAGEMENT =====
  const [activeTab, setActiveTab] = useState<'basic' | 'academic' | 'contact'>('basic');
  const [formData, setFormData] = useState<Partial<StudentFormData>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [tabErrors, setTabErrors] = useState({ basic: false, academic: false, contact: false });
  const [isValidating, setIsValidating] = useState(false);

  // Get scope filters
  const scopeFilters = getScopeFilters('students');
  const canAccessAll = isEntityAdmin || isSubEntityAdmin;

  // ===== DATA FETCHING =====
  
  // Fetch schools
  const { data: schools = [], isLoading: isLoadingSchools, error: schoolsError } = useQuery({
    queryKey: ['schools-for-student', companyId, scopeFilters],
    queryFn: async () => {
      if (!companyId) return [];

      let query = supabase
        .from('schools')
        .select('id, name, status')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name');

      if (!canAccessAll && scopeFilters.school_ids && scopeFilters.school_ids.length > 0) {
        query = query.in('id', scopeFilters.school_ids);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId && isOpen,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch branches for selected school
  const { data: branches = [], isLoading: isLoadingBranches } = useQuery({
    queryKey: ['branches-for-student', formData.school_id, scopeFilters],
    queryFn: async () => {
      if (!formData.school_id) return [];

      let query = supabase
        .from('branches')
        .select('id, name, status')
        .eq('school_id', formData.school_id)
        .eq('status', 'active')
        .order('name');

      if (!canAccessAll && scopeFilters.branch_ids && scopeFilters.branch_ids.length > 0) {
        query = query.in('id', scopeFilters.branch_ids);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!formData.school_id && isOpen,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch grade levels for selected school
  const { data: gradelevels = [], isLoading: isLoadingGrades } = useQuery({
    queryKey: ['grade-levels-for-student', formData.school_id, formData.branch_id],
    queryFn: async () => {
      // If branch is selected, prioritize branch-level grades
      if (formData.branch_id) {
        const { data, error } = await supabase
          .from('grade_levels')
          .select('id, grade_name, grade_order, education_level')
          .eq('branch_id', formData.branch_id)
          .eq('status', 'active')
          .order('grade_order');

        if (error) throw error;
        return data || [];
      }

      // Otherwise, get school-level grades
      if (formData.school_id) {
        const { data, error } = await supabase
          .from('grade_levels')
          .select('id, grade_name, grade_order, education_level')
          .eq('school_id', formData.school_id)
          .is('branch_id', null) // Only school-level grades (not assigned to branches)
          .eq('status', 'active')
          .order('grade_order');

        if (error) throw error;
        return data || [];
      }

      return [];
    },
    enabled: (!!formData.school_id || !!formData.branch_id) && isOpen,
    staleTime: 5 * 60 * 1000,
  });

  // Get selected grade level ID from grade name
  const selectedGradeLevelId = useMemo(() => {
    if (!formData.grade_level || !gradelevels.length) return null;
    const selectedGrade = gradelevels.find(g => g.grade_name === formData.grade_level);
    return selectedGrade?.id || null;
  }, [formData.grade_level, gradelevels]);

  // Fetch class sections for selected grade level
  const { data: classSections = [], isLoading: isLoadingSections } = useQuery({
    queryKey: ['class-sections-for-student', selectedGradeLevelId],
    queryFn: async () => {
      if (!selectedGradeLevelId) return [];

      const { data, error } = await supabase
        .from('class_sections')
        .select('id, section_name, section_code, max_capacity, class_section_order')
        .eq('grade_level_id', selectedGradeLevelId)
        .eq('status', 'active')
        .order('class_section_order');

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedGradeLevelId && isOpen,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch available programs
  const { data: programs = [], isLoading: isLoadingPrograms } = useQuery({
    queryKey: ['programs-for-student', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name, code')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId && isOpen,
    staleTime: 10 * 60 * 1000,
  });

  // FIXED: Fetch subjects for selected program
  const { data: subjects = [], isLoading: isLoadingSubjects } = useQuery({
    queryKey: ['subjects-for-program', formData.program_id],
    queryFn: async () => {
      if (!formData.program_id) return [];

      console.log('Fetching subjects for program:', formData.program_id);

      // First get data structures that match the selected program
      const { data: dataStructures, error: dsError } = await supabase
        .from('data_structures')
        .select('subject_id')
        .eq('program_id', formData.program_id)
        .eq('status', 'active');

      if (dsError) {
        console.error('Error fetching data structures:', dsError);
        throw dsError;
      }

      if (!dataStructures || dataStructures.length === 0) {
        console.log('No data structures found for program');
        return [];
      }

      // Get unique subject IDs
      const subjectIds = [...new Set(dataStructures.map(ds => ds.subject_id).filter(Boolean))];
      console.log('Found subject IDs:', subjectIds);

      if (subjectIds.length === 0) {
        return [];
      }

      // Fetch subject details from edu_subjects table
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('edu_subjects')
        .select('id, name, code')
        .in('id', subjectIds)
        .eq('status', 'active')
        .order('name');

      if (subjectsError) {
        console.error('Error fetching subjects:', subjectsError);
        throw subjectsError;
      }

      console.log('Fetched subjects:', subjectsData);
      return subjectsData || [];
    },
    enabled: !!formData.program_id && isOpen,
    staleTime: 5 * 60 * 1000,
  });

  // ===== FORM INITIALIZATION =====
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Populate form with existing data
        setFormData({
          name: initialData.name || '',
          email: initialData.email || '',
          phone: initialData.phone || '',
          student_code: initialData.student_code || '',
          enrollment_number: initialData.enrollment_number || '',
          grade_level: initialData.grade_level || '',
          section: initialData.section || '',
          admission_date: initialData.admission_date || '',
          school_id: initialData.school_id || '',
          branch_id: initialData.branch_id || '',
          parent_name: initialData.parent_name || '',
          parent_contact: initialData.parent_contact || '',
          parent_email: initialData.parent_email || '',
          emergency_contact: {
            name: initialData.emergency_contact?.name || '',
            phone: initialData.emergency_contact?.phone || '',
            relationship: initialData.emergency_contact?.relationship || '',
            address: initialData.emergency_contact?.address || ''
          },
          program_id: initialData.program_id || '',
          enrolled_subjects: initialData.enrolled_subjects || [],
          is_active: initialData.is_active ?? true
        });
      } else {
        // Initialize with default values
        setFormData({
          name: '',
          email: '',
          phone: '',
          student_code: '',
          enrollment_number: '',
          grade_level: '',
          section: '',
          admission_date: new Date().toISOString().split('T')[0],
          school_id: '',
          branch_id: '',
          parent_name: '',
          parent_contact: '',
          parent_email: '',
          emergency_contact: {
            name: '',
            phone: '',
            relationship: '',
            address: ''
          },
          program_id: '',
          enrolled_subjects: [],
          is_active: true
        });
      }
      setFormErrors({});
      setActiveTab('basic');
    }
  }, [isOpen, initialData]);

  // ===== MUTATIONS =====
  
  // Create student mutation
  const createStudentMutation = useMutation(
    async (data: StudentFormData) => {
      if (!user?.id) throw new Error('User not authenticated');

      const result = await userCreationService.createUserWithInvitation({
        user_type: 'student',
        email: data.email,
        name: data.name,
        phone: data.phone,
        company_id: companyId,
        student_code: data.student_code,
        enrollment_number: data.enrollment_number,
        grade_level: data.grade_level,
        section: data.section,
        admission_date: data.admission_date,
        school_id: data.school_id,
        branch_id: data.branch_id,
        parent_name: data.parent_name,
        parent_contact: data.parent_contact,
        parent_email: data.parent_email,
        emergency_contact: data.emergency_contact,
        program_id: data.program_id,
        enrolled_subjects: data.enrolled_subjects,
        is_active: data.is_active,
        send_invitation: true
      });

      return result;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['students']);
        toast.success('Student created successfully! Invitation email sent.');
        onSuccess();
        onClose();
      },
      onError: (error: any) => {
        console.error('Student creation error:', error);
        toast.error(error.message || 'Failed to create student');
      }
    }
  );

  // Update student mutation
  const updateStudentMutation = useMutation(
    async (data: StudentFormData) => {
      if (!initialData?.user_id) throw new Error('Student user ID not found');

      await userCreationService.updateStudent(initialData.user_id, {
        name: data.name,
        email: data.email,
        phone: data.phone,
        student_code: data.student_code,
        enrollment_number: data.enrollment_number,
        grade_level: data.grade_level,
        section: data.section,
        admission_date: data.admission_date,
        school_id: data.school_id,
        branch_id: data.branch_id,
        parent_name: data.parent_name,
        parent_contact: data.parent_contact,
        parent_email: data.parent_email,
        emergency_contact: data.emergency_contact,
        program_id: data.program_id,
        enrolled_subjects: data.enrolled_subjects,
        is_active: data.is_active
      });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['students']);
        toast.success('Student updated successfully!');
        onSuccess();
        onClose();
      },
      onError: (error: any) => {
        console.error('Student update error:', error);
        toast.error(error.message || 'Failed to update student');
      }
    }
  );

  // ===== VALIDATION =====
  const validateForm = (): boolean => {
    setIsValidating(true);
    const newErrors: Record<string, string> = {};

    try {
      studentSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            newErrors[err.path.join('.')] = err.message;
          }
        });
      }
    }

    // Additional business logic validation
    if (!formData.name?.trim()) {
      newErrors.name = 'Student name is required';
    }

    if (!formData.email?.trim()) {
      newErrors.email = 'Email address is required';
    }

    if (!formData.student_code?.trim()) {
      newErrors.student_code = 'Student code is required';
    }

    // Academic tab validation - ALL FIELDS REQUIRED
    if (!formData.school_id?.trim()) {
      newErrors.school_id = 'School is required';
    }

    if (!formData.branch_id?.trim()) {
      newErrors.branch_id = 'Branch is required';
    }

    if (!formData.grade_level?.trim()) {
      newErrors.grade_level = 'Grade level is required';
    }

    if (!formData.section?.trim()) {
      newErrors.section = 'Section is required';
    }

    if (!formData.admission_date?.trim()) {
      newErrors.admission_date = 'Admission date is required';
    }

    if (!formData.program_id?.trim()) {
      newErrors.program_id = 'Educational program is required';
    }

    if (!formData.enrolled_subjects || formData.enrolled_subjects.length === 0) {
      newErrors.enrolled_subjects = 'At least one subject must be selected';
    }

    // Validate parent email format if provided
    if (formData.parent_email && formData.parent_email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.parent_email)) {
        newErrors.parent_email = 'Invalid parent email format';
      }
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ===== FORM SUBMISSION =====
  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fix the form errors before submitting');
      return;
    }

    const mutation = isEditing ? updateStudentMutation : createStudentMutation;
    mutation.mutate(formData as StudentFormData);
  };

  // ===== COMPUTED VALUES =====
  const isSubmitting = createStudentMutation.isLoading || updateStudentMutation.isLoading;

  const formTitle = isEditing 
    ? `Edit Student: ${initialData?.name || 'Unknown'}` 
    : 'Create New Student';

  const saveButtonText = isEditing ? 'Update Student' : 'Create Student';

  // ===== RENDER =====
  return (
    <SlideInForm
      title={formTitle}
      isOpen={isOpen}
      onClose={onClose}
      onSave={handleSubmit}
      loading={isSubmitting}
      saveButtonText={saveButtonText}
      width="lg"
    >
      <div className="space-y-6">
        {/* Form Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                {isEditing ? 'Student Information Update' : 'New Student Registration'}
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {isEditing 
                  ? 'Update student information and academic details'
                  : 'Complete student registration with academic and contact information'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger 
              value="basic"
              tabStatus={tabErrors.basic ? 'error' : undefined}
            >
              <User className="w-4 h-4 mr-2" />
              Basic Info
            </TabsTrigger>
            <TabsTrigger 
              value="academic"
              tabStatus={tabErrors.academic ? 'error' : undefined}
            >
              <GraduationCap className="w-4 h-4 mr-2" />
              Academic
            </TabsTrigger>
            <TabsTrigger 
              value="contact"
              tabStatus={tabErrors.contact ? 'error' : undefined}
            >
              <Users className="w-4 h-4 mr-2" />
              Contact
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <StudentFormContent
              formData={formData}
              setFormData={setFormData}
              formErrors={formErrors}
              setFormErrors={setFormErrors}
              activeTab="basic"
              schools={schools}
              branches={branches}
              gradelevels={gradelevels}
              programs={programs}
              classSections={classSections}
              subjects={subjects} // FIXED: Now passing subjects
              isEditing={isEditing}
              isLoadingSchools={isLoadingSchools}
              isLoadingBranches={isLoadingBranches}
              isLoadingGrades={isLoadingGrades}
              isLoadingPrograms={isLoadingPrograms}
              isLoadingSections={isLoadingSections}
              isLoadingSubjects={isLoadingSubjects}
              schoolsError={schoolsError}
              onTabErrorsChange={setTabErrors}
            />
          </TabsContent>

          <TabsContent value="academic">
            <StudentFormContent
              formData={formData}
              setFormData={setFormData}
              formErrors={formErrors}
              setFormErrors={setFormErrors}
              activeTab="academic"
              schools={schools}
              branches={branches}
              gradelevels={gradelevels}
              programs={programs}
              classSections={classSections}
              subjects={subjects} // FIXED: Now passing subjects
              isEditing={isEditing}
              isLoadingSchools={isLoadingSchools}
              isLoadingBranches={isLoadingBranches}
              isLoadingGrades={isLoadingGrades}
              isLoadingPrograms={isLoadingPrograms}
              isLoadingSections={isLoadingSections}
              isLoadingSubjects={isLoadingSubjects}
              schoolsError={schoolsError}
              onTabErrorsChange={setTabErrors}
            />
          </TabsContent>

          <TabsContent value="contact">
            <StudentFormContent
              formData={formData}
              setFormData={setFormData}
              formErrors={formErrors}
              setFormErrors={setFormErrors}
              activeTab="contact"
              schools={schools}
              branches={branches}
              gradelevels={gradelevels}
              programs={programs}
              classSections={classSections}
              subjects={subjects} // FIXED: Now passing subjects
              isEditing={isEditing}
              isLoadingSchools={isLoadingSchools}
              isLoadingBranches={isLoadingBranches}
              isLoadingGrades={isLoadingGrades}
              isLoadingPrograms={isLoadingPrograms}
              isLoadingSections={isLoadingSections}
              isLoadingSubjects={isLoadingSubjects}
              schoolsError={schoolsError}
              onTabErrorsChange={setTabErrors}
            />
          </TabsContent>
        </Tabs>

        {/* Form Validation Summary */}
        {Object.keys(formErrors).length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                  Please fix the following errors:
                </p>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                  {Object.entries(formErrors).map(([field, error]) => (
                    <li key={field} className="flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Success Indicators */}
        {!isEditing && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                  Student Registration Process
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Upon creation, the student will receive an invitation email to set up their account and access the learning platform.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </SlideInForm>
  );
}

export default StudentForm;