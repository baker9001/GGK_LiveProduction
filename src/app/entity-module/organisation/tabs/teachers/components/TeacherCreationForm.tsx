/**
 * File: /src/app/entity-module/organisation/tabs/teachers/components/TeacherCreationForm.tsx
 * 
 * Teacher Creation/Edit Form Component
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  User, Book, GraduationCap, Calendar, Phone, Mail, 
  Lock, Eye, EyeOff, AlertCircle, School, MapPin
} from 'lucide-react';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { 
  ValidationProvider, 
  ValidatedInput, 
  ValidatedSelect,
  ValidatedTextarea,
  FormErrorSummary 
} from '@/components/shared/FormValidation';
import { teacherService } from '../services/teacherService';
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

const teacherCodeSchema = z.string()
  .min(3, 'Teacher code must be at least 3 characters')
  .max(20, 'Teacher code must be less than 20 characters');

const phoneSchema = z.string()
  .regex(/^[+]?[0-9]{10,15}$/, 'Please enter a valid phone number')
  .optional()
  .or(z.literal(''));

interface TeacherCreationFormProps {
  companyId: string;
  initialData?: {
    id?: string;
    name?: string;
    email?: string;
    teacher_code?: string;
    specialization?: string[];
    qualification?: string;
    experience_years?: number;
    bio?: string;
    school_id?: string;
    branch_id?: string;
    hire_date?: string;
    phone?: string;
    is_active?: boolean;
  };
  isEditing?: boolean;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  onSuccess?: () => void;
}

export function TeacherCreationForm({
  companyId,
  initialData,
  isEditing = false,
  onSubmit,
  onCancel,
  onSuccess
}: TeacherCreationFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schools, setSchools] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedSchool, setSelectedSchool] = useState(initialData?.school_id || '');
  const [generatingCode, setGeneratingCode] = useState(false);
  const [specializations, setSpecializations] = useState<string[]>(initialData?.specialization || []);
  const [newSpecialization, setNewSpecialization] = useState('');

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

  const generateTeacherCode = async () => {
    if (!companyId) {
      toast.error('Company ID is required to generate teacher code');
      return;
    }

    setGeneratingCode(true);
    try {
      const code = await teacherService.generateTeacherCode(companyId);
      const input = document.querySelector('input[name="teacher_code"]') as HTMLInputElement;
      if (input) {
        input.value = code;
      }
      toast.success('Teacher code generated successfully');
    } catch (error) {
      toast.error('Failed to generate teacher code');
    } finally {
      setGeneratingCode(false);
    }
  };

  const addSpecialization = () => {
    if (newSpecialization.trim() && !specializations.includes(newSpecialization.trim())) {
      setSpecializations([...specializations, newSpecialization.trim()]);
      setNewSpecialization('');
    }
  };

  const removeSpecialization = (spec: string) => {
    setSpecializations(specializations.filter(s => s !== spec));
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
        teacher_code: formData.teacher_code,
        company_id: companyId,
        specialization: specializations,
        qualification: formData.qualification,
        experience_years: parseInt(formData.experience_years) || 0,
        bio: formData.bio,
        school_id: formData.school_id || null,
        branch_id: formData.branch_id || null,
        hire_date: formData.hire_date || new Date().toISOString().split('T')[0],
        phone: formData.phone,
        is_active: formData.is_active !== false
      };

      // Include password for new teachers or if updating password
      if (!isEditing) {
        submitData.password = formData.password;
      } else if (formData.password) {
        submitData.password = formData.password;
      }

      await onSubmit(submitData);
      
      toast.success(isEditing ? 'Teacher updated successfully' : 'Teacher created successfully');
      onSuccess?.();
    } catch (error: any) {
      console.error('Form submission error:', error);
      toast.error(error.message || 'Failed to save teacher');
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
          
          {/* Basic Information */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-500" />
              Basic Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ValidatedInput
                name="name"
                label="Full Name"
                required
                zodSchema={nameSchema}
                placeholder="Enter teacher's full name"
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
              />

              <div>
                <ValidatedInput
                  name="teacher_code"
                  label="Teacher Code"
                  required
                  zodSchema={teacherCodeSchema}
                  placeholder="Enter or generate teacher code"
                  initialValue={initialData?.teacher_code || ''}
                  disabled={isEditing}
                />
                {!isEditing && (
                  <button
                    type="button"
                    onClick={generateTeacherCode}
                    disabled={generatingCode}
                    className="mt-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    {generatingCode ? 'Generating...' : 'Generate Code'}
                  </button>
                )}
              </div>

              <ValidatedInput
                name="phone"
                label="Phone Number"
                type="tel"
                zodSchema={phoneSchema}
                placeholder="Enter phone number"
                initialValue={initialData?.phone || ''}
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

          {/* Professional Information */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <GraduationCap className="h-5 w-5 mr-2 text-purple-500" />
              Professional Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ValidatedInput
                name="qualification"
                label="Qualification"
                placeholder="e.g., M.Sc, B.Ed"
                initialValue={initialData?.qualification || ''}
              />

              <ValidatedInput
                name="experience_years"
                label="Years of Experience"
                type="number"
                placeholder="Enter years of experience"
                initialValue={initialData?.experience_years?.toString() || '0'}
              />

              <ValidatedInput
                name="hire_date"
                label="Hire Date"
                type="date"
                initialValue={initialData?.hire_date || new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Specializations
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newSpecialization}
                  onChange={(e) => setNewSpecialization(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialization())}
                  placeholder="Add specialization"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
                />
                <button
                  type="button"
                  onClick={addSpecialization}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {specializations.map((spec) => (
                  <span
                    key={spec}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  >
                    {spec}
                    <button
                      type="button"
                      onClick={() => removeSpecialization(spec)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <ValidatedTextarea
                name="bio"
                label="Bio"
                placeholder="Enter teacher's bio or description"
                initialValue={initialData?.bio || ''}
                rows={3}
              />
            </div>
          </div>

          {/* Assignment */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <School className="h-5 w-5 mr-2 text-indigo-500" />
              School & Branch Assignment
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ValidatedSelect
                name="school_id"
                label="School"
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
            </div>

            <div className="mt-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  defaultChecked={initialData?.is_active !== false}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                  Active Teacher
                </label>
              </div>
            </div>
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
              {isSubmitting ? 'Saving...' : (isEditing ? 'Update Teacher' : 'Create Teacher')}
            </button>
          </div>
        </form>
      )}
    </ValidationProvider>
  );
}