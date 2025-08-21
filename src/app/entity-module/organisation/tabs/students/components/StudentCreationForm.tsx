/**
 * File: /src/app/entity-module/organisation/tabs/students/components/StudentCreationForm.tsx
 * 
 * Student Creation/Edit Form Component
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  User, GraduationCap, Calendar, Phone, Mail, Lock, 
  Eye, EyeOff, AlertCircle, School, MapPin, Users, Hash
} from 'lucide-react';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { 
  ValidationProvider, 
  ValidatedInput, 
  ValidatedSelect,
  FormErrorSummary 
} from '@/components/shared/FormValidation';
import { studentService } from '../services/studentService';
import { supabase } from '@/lib/supabase';

// Validation schemas
const nameSchema = z.string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be less than 100 characters');

const emailSchema = z.string()
  .email('Please enter a valid email address')
  .min(5, 'Email must be at least 5 characters');

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const studentCodeSchema = z.string()
  .min(3, 'Student code must be at least 3 characters')
  .max(20, 'Student code must be less than 20 characters');

const enrollmentSchema = z.string()
  .min(5, 'Enrollment number must be at least 5 characters')
  .max(30, 'Enrollment number must be less than 30 characters');

const phoneSchema = z.string()
  .regex(/^[+]?[0-9]{10,15}$/, 'Please enter a valid phone number')
  .optional()
  .or(z.literal(''));

const parentEmailSchema = z.string()
  .email('Please enter a valid email address')
  .optional()
  .or(z.literal(''));

interface StudentCreationFormProps {
  companyId: string;
  initialData?: {
    id?: string;
    name?: string;
    email?: string;
    student_code?: string;
    enrollment_number?: string;
    grade_level?: string;
    section?: string;
    admission_date?: string;
    parent_name?: string;
    parent_contact?: string;
    parent_email?: string;
    school_id?: string;
    branch_id?: string;
    phone?: string;
    is_active?: boolean;
  };
  isEditing?: boolean;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  onSuccess?: () => void;
}

// Grade levels configuration
const GRADE_LEVELS = [
  { value: 'KG1', label: 'KG 1' },
  { value: 'KG2', label: 'KG 2' },
  { value: '1', label: 'Grade 1' },
  { value: '2', label: 'Grade 2' },
  { value: '3', label: 'Grade 3' },
  { value: '4', label: 'Grade 4' },
  { value: '5', label: 'Grade 5' },
  { value: '6', label: 'Grade 6' },
  { value: '7', label: 'Grade 7' },
  { value: '8', label: 'Grade 8' },
  { value: '9', label: 'Grade 9' },
  { value: '10', label: 'Grade 10' },
  { value: '11', label: 'Grade 11' },
  { value: '12', label: 'Grade 12' }
];

const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function StudentCreationForm({
  companyId,
  initialData,
  isEditing = false,
  onSubmit,
  onCancel,
  onSuccess
}: StudentCreationFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schools, setSchools] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState(initialData?.school_id || '');
  const [generatingCode, setGeneratingCode] = useState(false);
  const [generatingEnrollment, setGeneratingEnrollment] = useState(false);

  // Fetch schools on mount
  useEffect(() => {
    fetchSchools();
  }, [companyId]);

  // Fetch branches when school is selected
  useEffect(() => {
    if (selectedSchool) {
      fetchBranches(selectedSchool);
    } else {
      setBranches([]);
    }
  }, [selectedSchool]);

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error('Error fetching schools:', error);
    }
  };

  const fetchBranches = async (schoolId: string) => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const generateStudentCode = async () => {
    if (!selectedSchool) {
      toast.error('Please select a school first');
      return;
    }

    setGeneratingCode(true);
    try {
      const code = await studentService.generateStudentCode(selectedSchool);
      const input = document.querySelector('input[name="student_code"]') as HTMLInputElement;
      if (input) {
        input.value = code;
      }
      toast.success('Student code generated successfully');
    } catch (error) {
      toast.error('Failed to generate student code');
    } finally {
      setGeneratingCode(false);
    }
  };

  const generateEnrollmentNumber = async () => {
    if (!selectedSchool) {
      toast.error('Please select a school first');
      return;
    }

    setGeneratingEnrollment(true);
    try {
      const enrollment = await studentService.generateEnrollmentNumber(selectedSchool);
      const input = document.querySelector('input[name="enrollment_number"]') as HTMLInputElement;
      if (input) {
        input.value = enrollment;
      }
      toast.success('Enrollment number generated successfully');
    } catch (error) {
      toast.error('Failed to generate enrollment number');
    } finally {
      setGeneratingEnrollment(false);
    }
  };

  const handleFormSubmit = async (formData: Record<string, any>) => {
    try {
      setIsSubmitting(true);

      // Validate passwords match if creating new user
      if (!isEditing || formData.password) {
        if (formData.password !== formData.confirmPassword) {
          toast.error('Passwords do not match');
          return;
        }
      }

      // Prepare submission data
      const submitData: any = {
        name: formData.name,
        email: formData.email,
        student_code: formData.student_code,
        enrollment_number: formData.enrollment_number,
        company_id: companyId,
        grade_level: formData.grade_level,
        section: formData.section,
        admission_date: formData.admission_date || new Date().toISOString().split('T')[0],
        parent_name: formData.parent_name,
        parent_contact: formData.parent_contact,
        parent_email: formData.parent_email,
        school_id: formData.school_id || null,
        branch_id: formData.branch_id || null,
        phone: formData.phone,
        is_active: formData.is_active !== false
      };

      // Include password for new students or if updating password
      if (!isEditing) {
        submitData.password = formData.password;
      } else if (formData.password) {
        submitData.password = formData.password;
      }

      await onSubmit(submitData);
      
      toast.success(isEditing ? 'Student updated successfully' : 'Student created successfully');
      onSuccess?.();
    } catch (error: any) {
      console.error('Form submission error:', error);
      toast.error(error.message || 'Failed to save student');
    } finally {
      setIsSubmitting(false);
    }
  };

  const PasswordField = ({ name, label, placeholder, showState, setShowState }: any) => {
    return (
      <div className="relative">
        <ValidatedInput
          name={name}
          label={label}
          type={showState ? 'text' : 'password'}
          required={!isEditing}
          zodSchema={!isEditing ? passwordSchema : passwordSchema.optional()}
          placeholder={placeholder}
          helperText={
            isEditing 
              ? 'Leave blank to keep current password' 
              : 'Must be at least 8 characters with uppercase, lowercase, and number'
          }
        />
        <button
          type="button"
          onClick={() => setShowState(!showState)}
          className="absolute right-2 top-[38px] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          {showState ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  };

  return (
    <ValidationProvider
      onSubmit={handleFormSubmit}
      validateOnChange={true}
      validateOnBlur={true}
    >
      {({ formState }) => (
        <form ref={formRef} className="space-y-6">
          <FormErrorSummary className="mb-6" />
          
          {/* Student Information */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-500" />
              Student Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ValidatedInput
                name="name"
                label="Full Name"
                required
                zodSchema={nameSchema}
                placeholder="Enter student's full name"
                initialValue={initialData?.name || ''}
              />

              <ValidatedInput
                name="email"
                label="Email Address"
                type="email"
                required
                zodSchema={emailSchema}
                placeholder="Enter email address"
                initialValue={initialData?.email || ''}
                disabled={isEditing}
                helperText="Student's email for login"
              />

              <div>
                <ValidatedInput
                  name="student_code"
                  label="Student Code"
                  required
                  zodSchema={studentCodeSchema}
                  placeholder="Enter or generate student code"
                  initialValue={initialData?.student_code || ''}
                  disabled={isEditing}
                />
                {!isEditing && (
                  <button
                    type="button"
                    onClick={generateStudentCode}
                    disabled={generatingCode || !selectedSchool}
                    className="mt-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 disabled:opacity-50"
                  >
                    {generatingCode ? 'Generating...' : 'Generate Code'}
                  </button>
                )}
              </div>

              <div>
                <ValidatedInput
                  name="enrollment_number"
                  label="Enrollment Number"
                  required
                  zodSchema={enrollmentSchema}
                  placeholder="Enter or generate enrollment number"
                  initialValue={initialData?.enrollment_number || ''}
                  disabled={isEditing}
                />
                {!isEditing && (
                  <button
                    type="button"
                    onClick={generateEnrollmentNumber}
                    disabled={generatingEnrollment || !selectedSchool}
                    className="mt-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 disabled:opacity-50"
                  >
                    {generatingEnrollment ? 'Generating...' : 'Generate Number'}
                  </button>
                )}
              </div>

              <ValidatedInput
                name="phone"
                label="Phone Number (Optional)"
                type="tel"
                zodSchema={phoneSchema}
                placeholder="Enter phone number"
                initialValue={initialData?.phone || ''}
              />

              <ValidatedInput
                name="admission_date"
                label="Admission Date"
                type="date"
                required
                initialValue={initialData?.admission_date || new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {/* Password Section */}
          {(!isEditing || formState.isDirty) && (
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Lock className="h-5 w-5 mr-2 text-green-500" />
                {isEditing ? 'Change Password (Optional)' : 'Set Password'}
              </h3>

              {isEditing && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 mb-4">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mr-2" />
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Leave password fields blank to keep the current password unchanged.
                    </p>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PasswordField
                  name="password"
                  label={isEditing ? "New Password" : "Password"}
                  placeholder="Enter password"
                  showState={showPassword}
                  setShowState={setShowPassword}
                />

                <PasswordField
                  name="confirmPassword"
                  label="Confirm Password"
                  placeholder="Confirm password"
                  showState={showConfirmPassword}
                  setShowState={setShowConfirmPassword}
                />
              </div>
            </div>
          )}

          {/* Academic Information */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <GraduationCap className="h-5 w-5 mr-2 text-purple-500" />
              Academic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ValidatedSelect
                name="school_id"
                label="School"
                required
                options={[
                  { value: '', label: 'Select School' },
                  ...schools.map(s => ({ value: s.id, label: s.name }))
                ]}
                initialValue={initialData?.school_id || ''}
                onChange={(e) => setSelectedSchool(e.target.value)}
              />

              <ValidatedSelect
                name="branch_id"
                label="Branch"
                options={[
                  { value: '', label: selectedSchool ? 'Select Branch' : 'Select School First' },
                  ...branches.map(b => ({ value: b.id, label: b.name }))
                ]}
                initialValue={initialData?.branch_id || ''}
                disabled={!selectedSchool}
              />

              <ValidatedSelect
                name="grade_level"
                label="Grade Level"
                required
                options={[
                  { value: '', label: 'Select Grade' },
                  ...GRADE_LEVELS
                ]}
                initialValue={initialData?.grade_level || ''}
              />

              <ValidatedSelect
                name="section"
                label="Section"
                options={[
                  { value: '', label: 'Select Section' },
                  ...SECTIONS.map(s => ({ value: s, label: `Section ${s}` }))
                ]}
                initialValue={initialData?.section || ''}
              />
            </div>
          </div>

          {/* Parent/Guardian Information */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Users className="h-5 w-5 mr-2 text-indigo-500" />
              Parent/Guardian Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ValidatedInput
                name="parent_name"
                label="Parent/Guardian Name"
                placeholder="Enter parent/guardian name"
                initialValue={initialData?.parent_name || ''}
              />

              <ValidatedInput
                name="parent_contact"
                label="Parent Contact Number"
                type="tel"
                zodSchema={phoneSchema}
                placeholder="Enter parent contact number"
                initialValue={initialData?.parent_contact || ''}
              />

              <ValidatedInput
                name="parent_email"
                label="Parent Email"
                type="email"
                zodSchema={parentEmailSchema}
                placeholder="Enter parent email address"
                initialValue={initialData?.parent_email || ''}
              />
            </div>
          </div>

          {/* Status */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                defaultChecked={initialData?.is_active !== false}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                Active Student
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Inactive students cannot log in to the system
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : (isEditing ? 'Update Student' : 'Create Student')}
            </button>
          </div>
        </form>
      )}
    </ValidationProvider>
  );
}