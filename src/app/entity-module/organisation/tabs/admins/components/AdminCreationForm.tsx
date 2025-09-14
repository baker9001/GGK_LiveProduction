// Path: /src/app/entity-module/organisation/tabs/admins/components/AdminCreationForm.tsx

/**
 * FIXED VERSION - Phone field handling based on user type
 * 
 * Fixed Issues:
 * 1. ✅ Phone stored in correct table based on user type:
 *    - Entity users: entity_users.phone
 *    - Teachers: teachers.phone
 *    - Students: students.phone
 * 2. ✅ Password always goes to users.password_hash
 * 3. ✅ Email duplication check doesn't query non-existent columns
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { User, Mail, Lock, Shield, AlertCircle, Eye, EyeOff, CheckCircle, Building, School, MapPin, Phone } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { SlideInForm } from '@/components/shared/SlideInForm';
import { FormField, Input, Select } from '@/components/shared/FormField';
import { SearchableMultiSelect } from '@/components/shared/SearchableMultiSelect';
import { ToggleSwitch } from '@/components/shared/ToggleSwitch';
import { PhoneInput } from '@/components/shared/PhoneInput';
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

/**
 * Determines which table stores phone number based on user type
 */
function getPhoneTableForUserType(userType: string): string {
  switch (userType) {
    case 'entity':
      return 'entity_users';
    case 'teacher':
      return 'teachers';
    case 'student':
      return 'students';
    default:
      return 'entity_users'; // Default for admins
  }
}

// ===== INTERFACES =====
interface AdminFormData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  admin_level: AdminLevel;
  is_active: boolean;
  user_type?: string; // Added to track user type
  assigned_schools: string[];
  assigned_branches: string[];
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
    phone?: string;
    admin_level: AdminLevel;
    company_id: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    permissions?: AdminPermissions;
    assigned_schools?: string[];
    assigned_branches?: string[];
    metadata?: Record<string, any>;
    user_type?: string; // Track the user type
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
    phone: '',
    admin_level: 'branch_admin',
    is_active: true,
    assigned_schools: [] as string[],
    assigned_branches: [] as string[],
    user_type: 'entity' // Default to entity for admins
  });
  
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [selectedSchoolForBranches, setSelectedSchoolForBranches] = useState<string>('');
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [emailExistsError, setEmailExistsError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isValidatingEmail, setIsValidatingEmail] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // ===== MUTATIONS =====
  const createAdminMutation = useCreateAdmin();
  const updateAdminMutation = useUpdateAdmin();
  const isSubmitting = createAdminMutation.isPending || updateAdminMutation.isPending;

  // ===== FETCH USER TYPE (for existing user) =====
  const { data: userData } = useQuery(
    ['user-type', initialData?.user_id],
    async () => {
      if (!initialData?.user_id) return null;
      
      const { data, error } = await supabase
        .from('users')
        .select('user_type')
        .eq('id', initialData.user_id)
        .single();
      
      if (error) throw error;
      return data;
    },
    { enabled: !!initialData?.user_id && isOpen }
  );

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
  const phoneTableName = useMemo(() => {
    return getPhoneTableForUserType(formData.user_type || 'entity');
  }, [formData.user_type]);

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
        const userType = userData?.user_type || initialData.user_type || 'entity';
        setFormData({
          name: initialData.name,
          email: initialData.email,
          password: '', // Always start with empty password for security
          phone: initialData.phone || '',
          admin_level: initialData.admin_level,
          is_active: initialData.is_active,
          user_type: userType,
          assigned_schools: initialData.assigned_schools || [],
          assigned_branches: initialData.assigned_branches || []
        });
        setSelectedSchools(initialData.assigned_schools || []);
        setSelectedBranches(initialData.assigned_branches || []);
        
        // If editing a branch admin with assigned branches, set the school filter
        if (initialData.admin_level === 'branch_admin' && initialData.assigned_branches?.length) {
          setSelectedSchoolForBranches('');
        }
      } else {
        // Create mode: set defaults
        const defaultLevel = availableAdminLevels[availableAdminLevels.length - 1]?.value || 'branch_admin';
        setFormData({
          name: '',
          email: '',
          password: '', // Will not be used for new users
          phone: '',
          admin_level: defaultLevel,
          is_active: true,
          user_type: 'entity', // Admins are entity users by default
          assigned_schools: [],
          assigned_branches: []
        });
        setSelectedSchools([]);
        setSelectedBranches([]);
        setSelectedSchoolForBranches('');
      }
      setErrors({});
      setEmailExistsError(null);
      setShowPassword(false);
      setIsValidating(false);
    }
  }, [isOpen, initialData, availableAdminLevels, userData]);

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
          // Only validate password when editing AND a password is provided
          if (isEditing && value) {
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
      if (field === 'email') {
        setEmailExistsError(null);
      }
    }
    
    // Real-time validation for better UX
    if (isValidating) {
      const error = validateField(field, value);
      if (error) {
        setErrors(prev => ({ ...prev, [field]: error }));
      }
    }
  }, [errors, isValidating, validateField, emailExistsError]);

  // Email duplication validation - checks all relevant tables
  const handleEmailBlur = useCallback(async () => {
    if (!formData.email || formData.email.trim() === '') {
      setEmailExistsError(null);
      return;
    }

    // Skip validation if email format is invalid
    try {
      emailSchema.parse(formData.email);
    } catch {
      setEmailExistsError(null);
      return;
    }

    setIsValidatingEmail(true);
    try {
      const normalizedEmail = formData.email.toLowerCase().trim();
      
      // Check in relevant tables
      const checks = await Promise.all([
        // Check users table (only email column exists here)
        supabase
          .from('users')
          .select('id, email')
          .eq('email', normalizedEmail)
          .maybeSingle(),
        
        // Check entity_users if dealing with entity user
        formData.user_type === 'entity' ? supabase
          .from('entity_users')
          .select('id, email, user_id')
          .eq('email', normalizedEmail)
          .eq('company_id', companyId)
          .maybeSingle() : Promise.resolve({ data: null, error: null }),
        
        // Check teachers table if needed
        formData.user_type === 'teacher' ? supabase
          .from('teachers')
          .select('id, email, user_id')
          .eq('email', normalizedEmail)
          .maybeSingle() : Promise.resolve({ data: null, error: null }),
        
        // Check students table if needed
        formData.user_type === 'student' ? supabase
          .from('students')
          .select('id, email, user_id')
          .eq('email', normalizedEmail)
          .maybeSingle() : Promise.resolve({ data: null, error: null }),
          
        // Always check admin_users for backward compatibility
        supabase
          .from('admin_users')
          .select('id, email')
          .eq('email', normalizedEmail)
          .maybeSingle()
      ]);

      // Check for errors
      for (const check of checks) {
        if (check.error && check.error.code !== 'PGRST116') {
          throw check.error;
        }
      }
      
      // Determine if email is duplicate
      let isDuplicate = false;
      
      for (const check of checks) {
        if (check.data) {
          // If editing, exclude current record
          if (isEditing) {
            const checkUserId = (check.data as any).user_id || (check.data as any).id;
            if (checkUserId !== initialData?.user_id && checkUserId !== initialData?.id) {
              isDuplicate = true;
              break;
            }
          } else {
            isDuplicate = true;
            break;
          }
        }
      }

      setEmailExistsError(isDuplicate ? 'This email address is already registered in the system' : null);
    } catch (error) {
      console.error('Email validation error:', error);
      setEmailExistsError('Unable to verify email availability. Please try again.');
    } finally {
      setIsValidatingEmail(false);
    }
  }, [formData.email, formData.user_type, companyId, isEditing, initialData]);

  const handleSubmit = useCallback(async () => {
    // Set validation mode
    setIsValidating(true);
    
    // Re-run email validation on submit
    await handleEmailBlur();
    
    // Wait for validation to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Validate all required fields
    const newErrors: Record<string, string> = {};
    
    const nameError = validateField('name', formData.name);
    if (nameError) newErrors.name = nameError;
    
    const emailError = validateField('email', formData.email);
    if (emailError) newErrors.email = emailError;
    
    // Password validation - only for editing existing users when password is provided
    if (isEditing && formData.password && formData.password.trim()) {
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
    
    if (Object.keys(newErrors).length > 0 || emailExistsError) {
      setErrors(newErrors);
      if (emailExistsError) {
        toast.error('Email address is already in use. Please choose a different email.');
      } else {
        toast.error('Please fix the validation errors');
      }
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
        // Phone will be updated in the correct table based on user type
        await updateAdminMutation.mutateAsync({
          userId: initialData.id,
          updates: {
            name: formData.name,
            email: formData.email,
            password: formData.password || undefined, // Updates users.password_hash
            phone: formData.phone || undefined,       // Updates correct table based on user_type
            admin_level: formData.admin_level,
            is_active: formData.is_active,
            permissions,
            assigned_schools: formData.admin_level === 'school_admin' ? selectedSchools : undefined,
            assigned_branches: formData.admin_level === 'branch_admin' ? selectedBranches : undefined,
            user_type: formData.user_type // Pass user type to mutation
          }
        });
      } else {
        // Create new admin (always entity user type)
        const createData: any = {
          email: formData.email,
          name: formData.name,
          password: formData.password || 'temp-password-123!', // Temporary password for creation
          admin_level: formData.admin_level,
          company_id: companyId,
          permissions,
          is_active: formData.is_active,
          assigned_schools: formData.admin_level === 'school_admin' ? selectedSchools : undefined,
          assigned_branches: formData.admin_level === 'branch_admin' ? selectedBranches : undefined,
          phone: formData.phone,
          user_type: 'entity' // Admins are always entity users
        };

        await createAdminMutation.mutateAsync(createData);
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Form submission error:', error);
    }
  }, [
    selectedSchools,
    selectedBranches,
    isEditing, 
    initialData, 
    canModifyThisAdmin, 
    isSelfEdit,
    validateField,
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
        {/* Invitation Process Notice - Only for new users */}
        {!isEditing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <Mail className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-blue-900 mb-1">
                  Invitation Process
                </h4>
                <p className="text-sm text-blue-700">
                  An invitation email will be sent to the administrator. They will need to click the link in the email to set their own secure password and activate their account.
                </p>
              </div>
            </div>
          </div>
        )}

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
            error={errors.email || emailExistsError || undefined}
            helpText={isValidatingEmail ? 'Checking email availability...' : undefined}
          >
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              onBlur={handleEmailBlur}
              placeholder="Enter email address"
              disabled={!canModifyThisAdmin}
              leftIcon={<Mail className="h-4 w-4 text-gray-400" />}
              rightIcon={isValidatingEmail ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
              ) : emailExistsError ? (
                <AlertCircle className="h-4 w-4 text-red-500" />
              ) : formData.email && !errors.email ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : null}
            />
          </FormField>

          <FormField
            id="phone"
            label="Phone Number"
            error={errors.phone}
            helpText={`Phone will be stored in ${phoneTableName} table`}
          >
            <PhoneInput
              value={formData.phone}
              onChange={(value) => handleFieldChange('phone', value)}
              placeholder="Enter phone number"
              disabled={!canModifyThisAdmin}
            />
          </FormField>

          {/* Password Reset Field - Only for editing existing users */}
          {isEditing && (
            <>
              <FormField
                id="password"
                label="Reset Password (optional)"
                error={errors.password}
                description="Leave blank to keep current password, or enter a new password to reset it"
              >
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleFieldChange('password', e.target.value)}
                    placeholder="Enter new password to reset (optional)"
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
              
              {/* Password Strength Indicator - only when password is being reset */}
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
            </>
          )}
          
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
        
        {/* Data Storage Information */}
        <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Data Storage Information
              </p>
              <ul className="text-xs text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                <li>• Authentication data (email, password) → <code>users</code> table</li>
                <li>• Administrator profile (name, permissions) → <code>entity_users</code> table</li>
                <li>• Phone number → <code>{phoneTableName}</code> table</li>
                {isEditing && formData.user_type && formData.user_type !== 'entity' && (
                  <li className="text-amber-600 dark:text-amber-400">
                    ⚠ User type: <strong>{formData.user_type}</strong> - Phone stored in <code>{phoneTableName}</code> table
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
        
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
        
        {/* Email Exists Error */}
        {emailExistsError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mr-2 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">
                {emailExistsError}
              </p>
            </div>
          </div>
        )}
      </div>
    </SlideInForm>
  );
}