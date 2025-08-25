/**
 * File: /src/app/entity-module/organisation/tabs/admins/components/AdminCreationForm.tsx
 * 
 * REIMPLEMENTED: Admin Creation/Edit Form - Fixed Version
 * 
 * Fixed Issues:
 * 1. ✅ Removed duplicated tabs
 * 2. ✅ Removed permissions section (permissions are pre-determined by admin level)
 * 3. ✅ Improved scope assignment with proper school/branch filtering
 * 4. ✅ Maintained all existing functionality
 * 
 * Dependencies:
 *   - @/components/shared/* (SlideInForm, FormField, Input, Select, ToggleSwitch)
 *   - @/contexts/UserContext
 *   - ../hooks/useAdminMutations
 *   - ../types/admin.types
 *   - ../services/permissionService
 *   - External: react, zod, lucide-react, @tanstack/react-query
 * 
 * Database Tables:
 *   - entity_users (id, user_id, name, email, admin_level, permissions, is_active, company_id, metadata)
 *   - users (id, email, password_hash, user_type, is_active)
 *   - entity_admin_scope (user_id, scope_type, scope_id, permissions)
 *   - schools (id, name, company_id, status)
 *   - branches (id, name, school_id, status)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { User, Mail, Lock, Shield, AlertCircle, Eye, EyeOff, CheckCircle, Building, School, MapPin } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { SlideInForm } from '@/components/shared/SlideInForm';
import { FormField, Input, Select } from '@/components/shared/FormField';
import { SearchableMultiSelect } from '@/components/shared/SearchableMultiSelect';
import { ToggleSwitch } from '@/components/shared/ToggleSwitch';
import { toast } from '@/components/shared/Toast';
import { supabase } from '@/lib/supabase';
import { useCreateAdmin, useUpdateAdmin } from '../hooks/useAdminMutations';
import { AdminLevel, AdminPermissions } from '../types/admin.types';
import { permissionService } from '../services/permissionService';
import { usePermissions } from '@/contexts/PermissionContext';

// ===== VALIDATION SCHEMAS =====
const nameSchema = z.string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must not exceed 100 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');

const emailSchema = z.string()
  .email('Please enter a valid email address')
  .transform(email => email.toLowerCase().trim());

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// ===== HELPER FUNCTIONS =====
function calculatePasswordStrength(password: string): number {
  if (!password) return 0;
  let strength = 0;
  if (password.length >= 8) strength += 25;
  if (password.length >= 12) strength += 25;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
  if (/[0-9]/.test(password)) strength += 12.5;
  if (/[^A-Za-z0-9]/.test(password)) strength += 12.5;
  return Math.min(strength, 100);
}

// ===== INTERFACES =====
interface AdminFormData {
  name: string;
  email: string;
  password: string;
  admin_level: AdminLevel;
  is_active: boolean;
}

interface AdminCreationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  companyId: string;
  initialData?: {
    id: string;
    user_id: string;
    name: string;
    email: string;
    admin_level: AdminLevel;
    company_id: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    permissions?: AdminPermissions;
    assigned_schools?: string[];
    assigned_branches?: string[];
    metadata?: Record<string, any>;
  };
}

// ===== MAIN COMPONENT =====
export function AdminCreationForm({
  isOpen,
  onClose,
  onSuccess,
  companyId,
  initialData
}: AdminCreationFormProps) {
  const isEditing = !!initialData;
  const { user } = useUser();
  const { adminLevel: currentUserAdminLevel } = usePermissions();
  
  // ===== FORM STATE =====
  const [formData, setFormData] = useState<AdminFormData>({
    name: '',
    email: '',
    password: '',
    admin_level: 'branch_admin',
    is_active: true
  });
  
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [selectedSchoolForBranches, setSelectedSchoolForBranches] = useState<string>('');
  
  const [errors, setErrors] = useState<Record<string, string>>({}); // General form errors
  const [emailExistsError, setEmailExistsError] = useState<string | null>(null); // New state for email duplication
  const [showPassword, setShowPassword] = useState(false);
  const [isValidatingEmail, setIsValidatingEmail] = useState(false); // New state for email validation in progress
  const [isValidating, setIsValidating] = useState(false);

  // ===== MUTATIONS =====
  const createAdminMutation = useCreateAdmin();
  const updateAdminMutation = useUpdateAdmin();
  const isSubmitting = createAdminMutation.isPending || updateAdminMutation.isPending;

  // ===== FETCH SCHOOLS =====
  const { data: schools = [], isLoading: isLoadingSchools } = useQuery(
    ['schools-for-admin', companyId],
    async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    { enabled: !!companyId && isOpen }
  );

  // ===== FETCH BRANCHES =====
  const { data: branches = [], isLoading: isLoadingBranches } = useQuery(
    ['branches-for-admin', selectedSchoolForBranches],
    async () => {
      if (!selectedSchoolForBranches) return [];
      
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .eq('school_id', selectedSchoolForBranches)
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    { enabled: !!selectedSchoolForBranches && formData.admin_level === 'branch_admin' }
  );

  // ===== COMPUTED VALUES =====
  const isSelfEdit = useMemo(() => {
    return isEditing && initialData?.user_id === user?.id;
  }, [isEditing, initialData, user]);

  const availableAdminLevels = useMemo(() => {
    const levels: { value: AdminLevel; label: string }[] = [];
    
    if (currentUserAdminLevel === 'entity_admin') {
      levels.push(
        { value: 'entity_admin', label: 'Entity Administrator' },
        { value: 'sub_entity_admin', label: 'Sub-Entity Administrator' },
        { value: 'school_admin', label: 'School Administrator' },
        { value: 'branch_admin', label: 'Branch Administrator' }
      );
    } else if (currentUserAdminLevel === 'sub_entity_admin') {
      levels.push(
        { value: 'sub_entity_admin', label: 'Sub-Entity Administrator' },
        { value: 'school_admin', label: 'School Administrator' },
        { value: 'branch_admin', label: 'Branch Administrator' }
      );
    } else if (currentUserAdminLevel === 'school_admin') {
      levels.push(
        { value: 'branch_admin', label: 'Branch Administrator' }
      );
    }
    
    return levels;
  }, [currentUserAdminLevel]);

  const canModifyThisAdmin = useMemo(() => {
    if (!isEditing) return true;
    if (!initialData) return false;
    
    // Entity admins can modify anyone
    if (currentUserAdminLevel === 'entity_admin') {
      return true;
    }
    
    // Check hierarchy permissions
    return permissionService.canModifyAdminLevel(
      currentUserAdminLevel || 'branch_admin',
      initialData.admin_level
    );
  }, [isEditing, initialData, currentUserAdminLevel]);

  const passwordStrength = useMemo(() => 
    calculatePasswordStrength(formData.password), 
    [formData.password]
  );

  // ===== FORM INITIALIZATION =====
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Edit mode: populate form with existing data
        setFormData({
          name: initialData.name,
          email: initialData.email,
          password: '', // Always start with empty password for security
          admin_level: initialData.admin_level,
          is_active: initialData.is_active
        });
        setSelectedSchools(initialData.assigned_schools || []);
        setSelectedBranches(initialData.assigned_branches || []);
        
        // If editing a branch admin with assigned branches, set the school filter
        if (initialData.admin_level === 'branch_admin' && initialData.assigned_branches?.length) {
          // You might need to fetch the school ID for the branches
          // For now, we'll leave it empty and let the user select
          setSelectedSchoolForBranches('');
        }
      } else {
        // Create mode: set defaults
        const defaultLevel = availableAdminLevels[availableAdminLevels.length - 1]?.value || 'branch_admin';
        setFormData({
          name: '',
          email: '',
          password: '',
          admin_level: defaultLevel,
          is_active: true
        });
        setSelectedSchools([]);
        setSelectedBranches([]);
        setSelectedSchoolForBranches('');
      }
      setErrors({});
      setShowPassword(false);
      setIsValidating(false);
    }
  }, [isOpen, initialData, availableAdminLevels]);

  // ===== VALIDATION =====
  const validateField = useCallback((field: string, value: any): string | undefined => {
    try {
      switch (field) {
        case 'name':
          nameSchema.parse(value);
          break;
        case 'email':
          emailSchema.parse(value);
          break;
        case 'password':
          if (!isEditing || value) {
            passwordSchema.parse(value);
          }
          break;
      }
      return undefined;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors[0]?.message;
      }
      return 'Invalid value';
    }
  }, [isEditing]);

  // ===== FORM HANDLERS =====
  const handleFieldChange = useCallback((field: keyof AdminFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field] || (field === 'email' && emailExistsError)) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    
    // Real-time validation for better UX
    if (isValidating) {
      const error = validateField(field, value);
      if (error) {
        setErrors(prev => ({ ...prev, [field]: error }));
      }
    }
  }, [errors, isValidating, validateField, emailExistsError]);

  // Email duplication validation on blur
  const handleEmailBlur = useCallback(async () => {
    if (!formData.email || errors.email) {
      setEmailExistsError(null); // Clear email error if field is empty or has format error
      return;
    }

    setIsValidatingEmail(true);
    try {
      const { data, error } = await supabase
        .from('entity_users')
        .select('id')
        .eq('email', formData.email.toLowerCase())
        .eq('company_id', companyId)
        .neq('id', isEditing ? initialData?.id : '');

      if (error) throw error;
      setEmailExistsError(data && data.length > 0 ? 'An administrator with this email already exists' : null);
    } catch (error) {
      console.error('Email validation error:', error);
    } finally {
      setIsValidatingEmail(false);
    }
  }, [formData.email, companyId, isEditing, initialData, errors.email]);

  const handleSubmit = useCallback(async () => {
    setIsValidatingEmail(true); // Indicate that validation is in progress
    await handleEmailBlur(); // Re-run email validation on submit attempt to catch last-minute changes

    // Validate all required fields
    const newErrors: Record<string, string> = {};
    
    const nameError = validateField('name', formData.name);
    if (nameError) newErrors.name = nameError;
    
    const emailError = validateField('email', formData.email);
    if (emailError) newErrors.email = emailError;
    
    // Password validation
    if (!isEditing && !formData.password) {
      newErrors.password = 'Password is required for new administrators';
    } else if (formData.password) {
      const passwordError = validateField('password', formData.password);
      if (passwordError) newErrors.password = passwordError;
    }
    
    // Admin level validation
    if (!formData.admin_level) {
      newErrors.admin_level = 'Administrator level is required';
    }
    
    // Scope validation
    if (formData.admin_level === 'school_admin' && selectedSchools.length === 0) {
      newErrors.schools = 'At least one school must be assigned to a School Administrator';
    }
    
    if (formData.admin_level === 'branch_admin' && selectedBranches.length === 0) {
      newErrors.branches = 'At least one branch must be assigned to a Branch Administrator';
    }
    
    if (Object.keys(newErrors).length > 0 || emailExistsError) { // Include emailExistsError in overall validation check
      setErrors(newErrors);
      toast.error('Please fix the validation errors');
      setIsValidatingEmail(false); // Reset validation state
      return;
    }
    
    // Permission checks
    if (!canModifyThisAdmin) {
      toast.error('You do not have permission to modify this administrator');
      return;
    }
    
    // Prevent self-deactivation
    if (isSelfEdit && !formData.is_active) {
      toast.error('You cannot deactivate your own account for security reasons');
      return;
    }
    
    try {
      // Get permissions based on admin level
      const permissions = permissionService.getPermissionsForLevel(formData.admin_level);
      
      if (isEditing && initialData) {
        // Update existing admin
        await updateAdminMutation.mutateAsync({
          userId: initialData.id,
          updates: {
            name: formData.name,
            email: formData.email,
            password: formData.password || undefined,
            admin_level: formData.admin_level,
            is_active: formData.is_active,
            permissions,
            assigned_schools: formData.admin_level === 'school_admin' ? selectedSchools : undefined,
            assigned_branches: formData.admin_level === 'branch_admin' ? selectedBranches : undefined
          }
        });
      } else {
        // Create new admin
        await createAdminMutation.mutateAsync({
          email: formData.email,
          name: formData.name,
          password: formData.password,
          admin_level: formData.admin_level,
          company_id: companyId,
          permissions,
          is_active: formData.is_active,
          assigned_schools: formData.admin_level === 'school_admin' ? selectedSchools : undefined,
          assigned_branches: formData.admin_level === 'branch_admin' ? selectedBranches : undefined
        });
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Form submission error:', error);
      // Error toast is handled by the mutation hooks
    }
  }, [
    formData, 
    selectedSchools,
    selectedBranches,
    isEditing, 
    initialData, 
    companyId, 
    canModifyThisAdmin, 
    isSelfEdit,
    validateField,
    createAdminMutation,
    updateAdminMutation,
    onSuccess,
    onClose,
    emailExistsError,
    handleEmailBlur
  ]);

  // ===== RENDER =====
  return (
    <SlideInForm
      title={isEditing ? 'Edit Administrator' : 'Create New Administrator'}
      isOpen={isOpen}
      onClose={onClose}
      onSave={handleSubmit}
      loading={isSubmitting}
      width="lg"
    >
      <div className="space-y-6">
        {/* SECTION 1: Basic Information */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
            <User className="h-5 w-5 text-[#8CC63F]" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Basic Information
            </h3>
          </div>
          
          <FormField
            id="name"
            label="Full Name"
            required
            error={errors.name}
          >
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="Enter administrator's full name"
              disabled={!canModifyThisAdmin}
              leftIcon={<User className="h-4 w-4 text-gray-400" />}
            />
          </FormField>
          
          <FormField
            id="email"
            label="Email Address"
            required
            error={errors.email || emailExistsError}
          >
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => { // Clear emailExistsError on change
                handleFieldChange('email', e.target.value);
                setEmailExistsError(null); // Clear error immediately on change
              }}
              onBlur={handleEmailBlur}
              placeholder="admin@example.com"
              disabled={!canModifyThisAdmin}
              leftIcon={<Mail className="h-4 w-4 text-gray-400" />}
            />
          </FormField>

          <FormField
            id="password"
            label={isEditing ? "New Password (leave blank to keep current)" : "Password"}
            required={!isEditing}
            error={errors.password}
          >
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => handleFieldChange('password', e.target.value)}
                placeholder={isEditing ? "Leave blank to keep current password" : "Enter a secure password"}
                disabled={!canModifyThisAdmin}
                leftIcon={<Lock className="h-4 w-4 text-gray-400" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
            </div>
          </FormField>
          
          {/* Password Strength Indicator */}
          {formData.password && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Password Strength</span>
                <span className={`font-medium ${
                  passwordStrength >= 75 ? 'text-green-600' :
                  passwordStrength >= 50 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {passwordStrength >= 75 ? 'Strong' :
                   passwordStrength >= 50 ? 'Medium' :
                   passwordStrength > 0 ? 'Weak' : ''}
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    passwordStrength >= 75 ? 'bg-green-500' :
                    passwordStrength >= 50 ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${passwordStrength}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: Role & Status */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
            <Shield className="h-5 w-5 text-[#8CC63F]" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Role & Status
            </h3>
          </div>
          
          <FormField
            id="admin_level"
            label="Administrator Level"
            required
            error={errors.admin_level}
          >
            <Select
              id="admin_level"
              value={formData.admin_level}
              onChange={(value) => handleFieldChange('admin_level', value)}
              options={availableAdminLevels}
              disabled={!canModifyThisAdmin || availableAdminLevels.length <= 1}
            />
          </FormField>
          
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <ToggleSwitch
              checked={formData.is_active}
              onChange={(checked) => handleFieldChange('is_active', checked)}
              disabled={isSelfEdit || !canModifyThisAdmin}
              label="Account Status"
              description={formData.is_active ? 'User can access the system' : 'User cannot log in'}
              activeLabel="Active"
              inactiveLabel="Inactive"
              showStateLabel={true}
              preventSelfDeactivation={true}
              currentUserId={user?.id}
              targetUserId={initialData?.user_id}
            />
          </div>
          
          {/* Self-edit warning */}
          {isSelfEdit && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mr-2 flex-shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  You cannot deactivate your own account for security reasons.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: Scope Assignment (for School/Branch Admins) */}
        {(formData.admin_level === 'school_admin' || formData.admin_level === 'branch_admin') && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
              <Building className="h-5 w-5 text-[#8CC63F]" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Scope Assignment
              </h3>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-2" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {formData.admin_level === 'school_admin' 
                    ? 'Assign schools this administrator can manage'
                    : 'Assign branches this administrator can manage'}
                </p>
              </div>
            </div>
            
            {/* School Admin - School Assignment */}
            {formData.admin_level === 'school_admin' && (
              <FormField
                id="schools"
                label="Assigned Schools"
                required
                error={errors.schools}
              >
                <SearchableMultiSelect
                  label=""
                  options={schools.map(school => ({ 
                    value: school.id, 
                    label: school.name 
                  }))}
                  selectedValues={selectedSchools}
                  onChange={setSelectedSchools}
                  placeholder="Select schools to assign..."
                  disabled={!canModifyThisAdmin || isLoadingSchools}
                />
              </FormField>
            )}
            
            {/* Branch Admin - Branch Assignment */}
            {formData.admin_level === 'branch_admin' && (
              <>
                <FormField
                  id="school_filter"
                  label="Select School"
                  required
                >
                  <Select
                    id="school_filter"
                    value={selectedSchoolForBranches}
                    onChange={setSelectedSchoolForBranches}
                    options={[
                      { value: '', label: 'Select a school...' },
                      ...schools.map(school => ({ 
                        value: school.id, 
                        label: school.name 
                      }))
                    ]}
                    disabled={!canModifyThisAdmin || isLoadingSchools}
                  />
                </FormField>
                
                {selectedSchoolForBranches && (
                  <FormField
                    id="branches"
                    label="Assigned Branches"
                    required
                    error={errors.branches}
                  >
                    <SearchableMultiSelect
                      label=""
                      options={branches.map(branch => ({ 
                        value: branch.id, 
                        label: branch.name 
                      }))}
                      selectedValues={selectedBranches}
                      onChange={setSelectedBranches}
                      placeholder="Select branches to assign..."
                      disabled={!canModifyThisAdmin || isLoadingBranches}
                    />
                  </FormField>
                )}
              </>
            )}
          </div>
        )}
        
        {/* Auto-Generated Permissions Notice */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Permissions Automatically Assigned
              </p>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                {formData.admin_level === 'entity_admin' && 
                  'Entity Administrators receive full system permissions and complete access.'}
                {formData.admin_level === 'sub_entity_admin' && 
                  'Sub-Entity Administrators receive management permissions for their assigned scope.'}
                {formData.admin_level === 'school_admin' && 
                  'School Administrators receive permissions to manage their assigned schools.'}
                {formData.admin_level === 'branch_admin' && 
                  'Branch Administrators receive permissions to manage their assigned branches.'}
              </p>
            </div>
          </div>
        </div>

        {/* Form Validation Errors Summary */}
        {Object.keys(errors).length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mr-2 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Please fix the following errors:
                </p>
                <ul className="text-sm text-red-700 dark:text-red-300 mt-1 list-disc list-inside">
                  {Object.entries(errors).map(([field, error]) => (
                    <li key={field}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </SlideInForm>
  );
}