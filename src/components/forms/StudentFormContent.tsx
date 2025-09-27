/**
 * File: /src/components/forms/StudentFormContent.tsx
 * 
 * Student Form Content Component - FIXED VERSION
 * Comprehensive form for creating and editing student records
 * 
 * FIXES APPLIED:
 * 1. Added subjects prop to the interface
 * 2. Improved UI/UX for subject selection with chip-based multi-select
 * 3. Added better loading states and empty states for subjects
 * 4. Fixed program_id field handling
 * 
 * Features:
 * - Multi-tab interface (Basic Info, Academic Details, Parent & Emergency Contact)
 * - Dynamic school/branch filtering based on user scope
 * - Emergency contact management
 * - Program enrollment selection with dynamic subject loading
 * - Proper validation and error handling
 */

'use client';

import React, { useEffect, useMemo } from 'react';
import { 
  User, Mail, Phone, Hash, Calendar, GraduationCap, 
  Users, School, MapPin, AlertTriangle, BookOpen,
  Heart, UserCheck, Building2, CheckCircle, X, Info, Loader2
} from 'lucide-react';
import { FormField, Input, Select, Textarea } from '../shared/FormField';
import { SearchableMultiSelect } from '../shared/SearchableMultiSelect';
import { ToggleSwitch } from '../shared/ToggleSwitch';
import { PhoneInput } from '../shared/PhoneInput';

// ===== TYPE DEFINITIONS =====
interface StudentFormData {
  // Basic Information
  name: string;
  email: string;
  phone: string;
  student_code: string;
  enrollment_number: string;
  is_active: boolean;
  
  // Academic Details
  grade_level: string;
  section: string;
  admission_date: string;
  school_id: string;
  branch_id: string;
  program_id: string; // ADDED
  enrolled_subjects: string[]; // FIXED: Changed from enrolled_programs
  
  // Parent & Emergency Contact
  parent_name: string;
  parent_contact: string;
  parent_email: string;
  emergency_contact: {
    name: string;
    phone: string;
    relationship: string;
    address: string;
  };
}

interface StudentFormContentProps {
  formData: Partial<StudentFormData>;
  setFormData: (data: Partial<StudentFormData>) => void;
  formErrors: Record<string, string>;
  setFormErrors: (errors: Record<string, string>) => void;
  activeTab: 'basic' | 'academic' | 'contact';
  schools: Array<{ id: string; name: string }>;
  branches: Array<{ id: string; name: string }>;
  gradelevels: Array<{ id: string; grade_name: string; grade_order: number }>;
  programs: Array<{ id: string; name: string; code?: string }>;
  classSections: Array<{ id: string; section_name: string; section_code?: string; max_capacity: number; class_section_order: number }>;
  subjects: Array<{ id: string; name: string; code?: string }>; // FIXED: Added subjects prop
  isEditing?: boolean;
  isLoadingSchools?: boolean;
  isLoadingBranches?: boolean;
  isLoadingGrades?: boolean;
  isLoadingPrograms?: boolean;
  isLoadingSections?: boolean;
  isLoadingSubjects?: boolean;
  schoolsError?: Error | null;
  onTabErrorsChange?: (errors: { basic: boolean; academic: boolean; contact: boolean }) => void;
}

// ===== MAIN COMPONENT =====
export function StudentFormContent({
  formData,
  setFormData,
  formErrors,
  setFormErrors,
  activeTab,
  schools,
  branches,
  gradelevels,
  programs,
  classSections,
  subjects, // FIXED: Now receiving subjects prop
  isEditing = false,
  isLoadingSchools = false,
  isLoadingBranches = false,
  isLoadingGrades = false,
  isLoadingPrograms = false,
  isLoadingSections = false,
  isLoadingSubjects = false,
  schoolsError = null,
  onTabErrorsChange
}: StudentFormContentProps) {
  
  // Helper to update form data
  const updateFormData = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    
    // Clear error when user starts typing
    if (formErrors[field]) {
      const newErrors = { ...formErrors };
      delete newErrors[field];
      setFormErrors(newErrors);
    }
  };

  // Helper to update emergency contact
  const updateEmergencyContact = (field: string, value: string) => {
    const currentContact = formData.emergency_contact || {};
    updateFormData('emergency_contact', {
      ...currentContact,
      [field]: value
    });
  };

  // Calculate which tabs have errors and notify parent
  useEffect(() => {
    const errors = {
      basic: false,
      academic: false,
      contact: false
    };

    // Basic tab mandatory fields
    if (!formData.name || formData.name.trim() === '') {
      errors.basic = true;
    }
    if (!formData.email || formData.email.trim() === '') {
      errors.basic = true;
    }
    if (!formData.student_code || formData.student_code.trim() === '') {
      errors.basic = true;
    }
    if (formErrors.name || formErrors.email || formErrors.student_code || formErrors.phone) {
      errors.basic = true;
    }

    // Academic tab mandatory fields - ALL fields required
    if (!formData.school_id || formData.school_id.trim() === '') {
      errors.academic = true;
    }
    if (!formData.branch_id || formData.branch_id.trim() === '') {
      errors.academic = true;
    }
    if (!formData.grade_level || formData.grade_level.trim() === '') {
      errors.academic = true;
    }
    if (!formData.section || formData.section.trim() === '') {
      errors.academic = true;
    }
    if (!formData.admission_date || formData.admission_date.trim() === '') {
      errors.academic = true;
    }
    if (!formData.program_id || formData.program_id.trim() === '') {
      errors.academic = true;
    }
    if (!formData.enrolled_subjects || formData.enrolled_subjects.length === 0) {
      errors.academic = true;
    }
    if (formErrors.school_id || formErrors.branch_id || formErrors.grade_level || formErrors.section || 
        formErrors.admission_date || formErrors.program_id || formErrors.enrolled_subjects) {
      errors.academic = true;
    }

    // Contact tab - check for email format errors
    if (formErrors.parent_email) {
      errors.contact = true;
    }

    // Notify parent component about tab errors
    if (onTabErrorsChange) {
      onTabErrorsChange(errors);
    }
  }, [formData, formErrors, onTabErrorsChange]);

  // Custom component for better subject selection UI
  const SubjectChips = () => {
    const selectedSubjectDetails = subjects.filter(s => 
      formData.enrolled_subjects?.includes(s.id)
    );

    return (
      <div className="space-y-3">
        {selectedSubjectDetails.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            {selectedSubjectDetails.map(subject => (
              <div
                key={subject.id}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="font-medium">
                  {subject.name}
                  {subject.code && <span className="text-green-600 dark:text-green-400 ml-1">({subject.code})</span>}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const newSubjects = formData.enrolled_subjects?.filter(id => id !== subject.id) || [];
                    updateFormData('enrolled_subjects', newSubjects);
                  }}
                  className="ml-1 p-0.5 hover:bg-green-200 dark:hover:bg-green-800 rounded-full transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <Info className="w-3 h-3" />
          {selectedSubjectDetails.length} subject{selectedSubjectDetails.length !== 1 ? 's' : ''} selected
        </p>
      </div>
    );
  };

  // Render content based on active tab
  if (activeTab === 'basic') {
    return (
      <div className="space-y-4">
        {/* Student Name */}
        <FormField id="name" label="Student Name" required error={formErrors.name}>
          <Input
            id="name"
            value={formData.name || ''}
            onChange={(e) => updateFormData('name', e.target.value)}
            placeholder="Enter student's full name"
            leftIcon={<User className="h-5 w-5 text-gray-400" />}
            className="focus:border-green-500 focus:ring-green-500"
          />
        </FormField>

        {/* Email */}
        <FormField id="email" label="Email Address" required error={formErrors.email}>
          <Input
            id="email"
            type="email"
            value={formData.email || ''}
            onChange={(e) => updateFormData('email', e.target.value)}
            placeholder="student@school.com"
            leftIcon={<Mail className="h-5 w-5 text-gray-400" />}
            className="focus:border-green-500 focus:ring-green-500"
          />
        </FormField>

        {/* Phone */}
        <FormField id="phone" label="Phone Number">
          <PhoneInput
            value={formData.phone || ''}
            onChange={(value) => updateFormData('phone', value)}
            placeholder="Enter phone number"
          />
        </FormField>

        {/* Student Code */}
        <FormField id="student_code" label="Student Code" required error={formErrors.student_code}>
          <Input
            id="student_code"
            value={formData.student_code || ''}
            onChange={(e) => updateFormData('student_code', e.target.value)}
            placeholder="e.g., STU-2024-001"
            leftIcon={<Hash className="h-5 w-5 text-gray-400" />}
            className="focus:border-green-500 focus:ring-green-500"
          />
        </FormField>

        {/* Enrollment Number */}
        <FormField id="enrollment_number" label="Enrollment Number" error={formErrors.enrollment_number}>
          <Input
            id="enrollment_number"
            value={formData.enrollment_number || ''}
            onChange={(e) => updateFormData('enrollment_number', e.target.value)}
            placeholder="e.g., ENR-2024-001"
            leftIcon={<UserCheck className="h-5 w-5 text-gray-400" />}
            className="focus:border-green-500 focus:ring-green-500"
          />
        </FormField>

        {/* Status */}
        <FormField id="is_active" label="Student Status">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Account Status
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formData.is_active 
                  ? 'Student account is active and can access the platform' 
                  : 'Student account is inactive and cannot access the platform'}
              </p>
            </div>
            <ToggleSwitch
              checked={formData.is_active ?? true}
              onChange={(checked) => updateFormData('is_active', checked)}
              label="Active"
            />
          </div>
        </FormField>
      </div>
    );
  }

  if (activeTab === 'academic') {
    return (
      <div className="space-y-4">
        {/* School Selection */}
        <FormField id="school_id" label="School" required error={formErrors.school_id}>
          {isLoadingSchools ? (
            <div className="p-3 text-sm text-gray-600 dark:text-gray-400">
              Loading schools...
            </div>
          ) : schoolsError ? (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded">
              Failed to load schools. Please refresh the page.
            </div>
          ) : schools.length === 0 ? (
            <div className="space-y-2">
              <Select id="school_id" disabled options={[]}>
                <option value="">No schools available</option>
              </Select>
              <div className="p-2 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded">
                No schools found. Schools must be created first.
              </div>
            </div>
          ) : (
            <Select
              id="school_id"
              value={formData.school_id || ''}
              onChange={(value) => {
                updateFormData('school_id', value);
                // Clear branch when school changes
                if (formData.branch_id) {
                  updateFormData('branch_id', '');
                }
              }}
              options={[
                { value: '', label: 'Select school' },
                ...schools.map(s => ({ value: s.id, label: s.name }))
              ]}
              className="focus:border-green-500 focus:ring-green-500"
            />
          )}
        </FormField>

        {/* Branch Selection */}
        <FormField id="branch_id" label="Branch" required error={formErrors.branch_id}>
          {isLoadingBranches ? (
            <div className="p-3 text-sm text-gray-600 dark:text-gray-400">
              Loading branches...
            </div>
          ) : (
            <Select
              id="branch_id"
              value={formData.branch_id || ''}
              onChange={(value) => {
                updateFormData('branch_id', value);
                // Clear grade level and section when branch changes
                if (formData.grade_level) {
                  updateFormData('grade_level', '');
                }
                if (formData.section) {
                  updateFormData('section', '');
                }
              }}
              options={[
                { value: '', label: 'Select branch' },
                ...branches.map(b => ({ value: b.id, label: b.name }))
              ]}
              disabled={!formData.school_id || branches.length === 0}
              className="focus:border-green-500 focus:ring-green-500"
            />
          )}
        </FormField>

        {/* Grade Level */}
        <FormField id="grade_level" label="Grade Level" required error={formErrors.grade_level}>
          {isLoadingGrades ? (
            <div className="p-3 text-sm text-gray-600 dark:text-gray-400">
              Loading grade levels...
            </div>
          ) : gradelevels.length === 0 && (formData.school_id || formData.branch_id) ? (
            <div className="space-y-2">
              <Select id="grade_level" disabled options={[]}>
                <option value="">No grade levels available</option>
              </Select>
              <div className="p-2 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded">
                {formData.branch_id 
                  ? 'No grade levels configured for this branch. Please configure grade levels in the academic structure first.'
                  : 'No grade levels configured for this school. Please configure grade levels in the academic structure first.'
                }
              </div>
            </div>
          ) : (
            <Select
              id="grade_level"
              value={formData.grade_level || ''}
              onChange={(value) => {
                updateFormData('grade_level', value);
                // Clear section when grade changes
                if (formData.section) {
                  updateFormData('section', '');
                }
              }}
              options={[
                { value: '', label: 'Select grade level' },
                ...gradelevels
                  .sort((a, b) => a.grade_order - b.grade_order)
                  .map(g => ({ value: g.grade_name, label: g.grade_name }))
              ]}
              disabled={!formData.school_id && !formData.branch_id}
              className="focus:border-green-500 focus:ring-green-500"
            />
          )}
          {!formData.school_id && !formData.branch_id && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Please select a school first to see available grade levels
            </p>
          )}
        </FormField>

        {/* Section */}
        <FormField id="section" label="Section" required error={formErrors.section}>
          {isLoadingSections ? (
            <div className="p-3 text-sm text-gray-600 dark:text-gray-400">
              Loading sections...
            </div>
          ) : (
            <Select
              id="section"
              value={formData.section || ''}
              onChange={(value) => updateFormData('section', value)}
              options={[
                { value: '', label: 'Select section' },
                ...classSections
                  .sort((a, b) => a.class_section_order - b.class_section_order)
                  .map(s => ({ 
                    value: s.section_name, 
                    label: `${s.section_name}${s.section_code ? ` (${s.section_code})` : ''} - Max: ${s.max_capacity}` 
                  }))
              ]}
              disabled={!formData.grade_level || classSections.length === 0}
              className="focus:border-green-500 focus:ring-green-500"
            />
          )}
          {!formData.grade_level && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Please select a grade level first to see available sections
            </p>
          )}
          {formData.grade_level && classSections.length === 0 && !isLoadingSections && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              No sections configured for this grade level
            </p>
          )}
        </FormField>

        {/* Admission Date */}
        <FormField id="admission_date" label="Admission Date" required error={formErrors.admission_date}>
          <Input
            id="admission_date"
            type="date"
            value={formData.admission_date || ''}
            onChange={(e) => updateFormData('admission_date', e.target.value)}
            leftIcon={<Calendar className="h-5 w-5 text-gray-400" />}
            className="focus:border-green-500 focus:ring-green-500"
          />
        </FormField>

        {/* Program Selection - Improved UI */}
        <FormField id="program_id" label="Educational Program" required error={formErrors.program_id}>
          {isLoadingPrograms ? (
            <div className="p-3 text-sm text-gray-600 dark:text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
              Loading programs...
            </div>
          ) : (
            <>
              <Select
                id="program_id"
                value={formData.program_id || ''}
                onChange={(value) => {
                  updateFormData('program_id', value);
                  // Clear enrolled subjects when program changes
                  if (formData.enrolled_subjects && formData.enrolled_subjects.length > 0) {
                    updateFormData('enrolled_subjects', []);
                  }
                }}
                options={[
                  { value: '', label: 'Select educational program' },
                  ...programs.map(p => ({ 
                    value: p.id, 
                    label: p.code ? `${p.name} (${p.code})` : p.name 
                  }))
                ]}
                className="focus:border-green-500 focus:ring-green-500"
              />
              {formData.program_id && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Select subjects available for this program below
                </p>
              )}
            </>
          )}
        </FormField>

        {/* Subject Selection - Enhanced UI/UX */}
        {formData.program_id && (
          <FormField id="enrolled_subjects" label="Enrolled Subjects" required error={formErrors.enrolled_subjects}>
            {isLoadingSubjects ? (
              <div className="p-4 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                Loading subjects for selected program...
              </div>
            ) : subjects.length === 0 ? (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                      No Subjects Available
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      No subjects have been configured for this program. Please contact the administrator to set up subjects for this program.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <SearchableMultiSelect
                  label=""
                  options={subjects.map(s => ({ 
                    value: s.id, 
                    label: s.code ? `${s.name} - ${s.code}` : s.name 
                  }))}
                  selectedValues={formData.enrolled_subjects || []}
                  onChange={(values) => updateFormData('enrolled_subjects', values)}
                  placeholder="Search and select subjects..."
                  className="green-theme"
                />
                
                {/* Subject count indicator */}
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  {formData.enrolled_subjects?.length || 0} subject{(formData.enrolled_subjects?.length || 0) !== 1 ? 's' : ''} selected
                </p>
                
                {/* Info message */}
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="text-xs text-blue-700 dark:text-blue-300">
                      <p className="font-medium mb-1">Subject Enrollment Information</p>
                      <ul className="space-y-0.5">
                        <li>• Students can be enrolled in multiple subjects</li>
                        <li>• Available subjects are determined by the selected program</li>
                        <li>• Subjects can be modified later if needed</li>
                        <li>• {subjects.length} subject{subjects.length !== 1 ? 's' : ''} available for this program</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </FormField>
        )}
      </div>
    );
  }

  if (activeTab === 'contact') {
    return (
      <div className="space-y-4">
        {/* Parent Information Section */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h4 className="font-medium text-blue-900 dark:text-blue-100">Parent Information</h4>
          </div>
          
          <div className="space-y-3">
            <FormField id="parent_name" label="Parent/Guardian Name">
              <Input
                id="parent_name"
                value={formData.parent_name || ''}
                onChange={(e) => updateFormData('parent_name', e.target.value)}
                placeholder="Enter parent/guardian name"
                leftIcon={<User className="h-5 w-5 text-gray-400" />}
                className="focus:border-green-500 focus:ring-green-500"
              />
            </FormField>

            <FormField id="parent_contact" label="Parent Contact Number">
              <PhoneInput
                value={formData.parent_contact || ''}
                onChange={(value) => updateFormData('parent_contact', value)}
                placeholder="Enter parent contact"
              />
            </FormField>

            <FormField id="parent_email" label="Parent Email" error={formErrors.parent_email}>
              <Input
                id="parent_email"
                type="email"
                value={formData.parent_email || ''}
                onChange={(e) => updateFormData('parent_email', e.target.value)}
                placeholder="parent@email.com"
                leftIcon={<Mail className="h-5 w-5 text-gray-400" />}
                className="focus:border-green-500 focus:ring-green-500"
              />
            </FormField>
          </div>
        </div>

        {/* Emergency Contact Section */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Heart className="h-5 w-5 text-red-600 dark:text-red-400" />
            <h4 className="font-medium text-red-900 dark:text-red-100">Emergency Contact</h4>
          </div>
          
          <div className="space-y-3">
            <FormField id="emergency_contact_name" label="Emergency Contact Name">
              <Input
                id="emergency_contact_name"
                value={formData.emergency_contact?.name || ''}
                onChange={(e) => updateEmergencyContact('name', e.target.value)}
                placeholder="Enter emergency contact name"
                leftIcon={<User className="h-5 w-5 text-gray-400" />}
                className="focus:border-green-500 focus:ring-green-500"
              />
            </FormField>

            <FormField id="emergency_contact_phone" label="Emergency Contact Phone">
              <PhoneInput
                value={formData.emergency_contact?.phone || ''}
                onChange={(value) => updateEmergencyContact('phone', value)}
                placeholder="Enter emergency contact phone"
              />
            </FormField>

            <FormField id="emergency_contact_relationship" label="Relationship">
              <Select
                id="emergency_contact_relationship"
                value={formData.emergency_contact?.relationship || ''}
                onChange={(value) => updateEmergencyContact('relationship', value)}
                options={[
                  { value: '', label: 'Select relationship' },
                  { value: 'parent', label: 'Parent' },
                  { value: 'guardian', label: 'Guardian' },
                  { value: 'grandparent', label: 'Grandparent' },
                  { value: 'aunt_uncle', label: 'Aunt/Uncle' },
                  { value: 'sibling', label: 'Sibling' },
                  { value: 'family_friend', label: 'Family Friend' },
                  { value: 'other', label: 'Other' }
                ]}
                className="focus:border-green-500 focus:ring-green-500"
              />
            </FormField>

            <FormField id="emergency_contact_address" label="Emergency Contact Address">
              <Textarea
                id="emergency_contact_address"
                value={formData.emergency_contact?.address || ''}
                onChange={(e) => updateEmergencyContact('address', e.target.value)}
                placeholder="Enter emergency contact address"
                rows={3}
                className="focus:border-green-500 focus:ring-green-500"
              />
            </FormField>
          </div>
        </div>

        {/* Additional Notes */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p className="font-medium mb-1">Important Notes:</p>
              <ul className="text-xs space-y-1">
                <li>• Emergency contact should be someone other than the primary parent/guardian</li>
                <li>• Ensure all contact information is current and accurate</li>
                <li>• Emergency contact will be notified in case primary contacts are unreachable</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default StudentFormContent;