/**
 * File: /src/app/entity-module/organisation/tabs/admins/components/AdminCreationForm.tsx
 * 
 * ENHANCED VERSION - Invitation-based admin creation
 * 
 * Changes:
 * - Removed password field for new admin creation
 * - Added invitation process notice
 * - Better error handling for Edge Function responses
 * - Preserved all existing features
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { User, Mail, Lock, Shield, AlertCircle, Eye, EyeOff, CheckCircle, Building, School, MapPin, Phone, Send } from 'lucide-react';
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

// ===== INTERFACES =====
interface AdminFormData {
  name: string;
  email: string;
  password: string; // Only for editing
  phone?: string;
  admin_level: AdminLevel;
  is_active: boolean;
  user_type?: string;
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
    user_type?: string;
  };
}

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

function getPhoneTableForUserType(userType: string): string {
  switch (userType) {
    case 'entity':
      return 'entity_users';
    case 'teacher':
      return 'teachers';
    case 'student':
      return 'students';
    default:
      return 'entity_users';
  }
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
    assigned_schools: [],
    assigned_branches: [],
    user_type: 'entity'
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

  // ===== FETCH USER TYPE =====
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
    
    if (currentUserAdminLevel === 'entity_admin') {
      return true;
    }
    
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
        const userType = userData?.user_type || initialData.user_type || 'entity';
        setFormData({
          name: initialData.name,
          email: initialData.email,
          password: '', // Always empty for security
          phone: initialData.phone || '',
          admin_level: initialData.admin_level,
          is_active: initialData.is_active,
          user_type: userType,
          assigned_schools: initialData.assigned_schools || [],
          assigned_branches: initialData.assigned_branches || []
        });
        setSelectedSchools(initialData.assigned_schools || []);
        setSelectedBranches(initialData.assigned_branches || []);
        
        if (initialData.admin_level === 'branch_admin' && initialData.assigned_branches?.length) {
          setSelectedSchoolForBranches('');
        }
      } else {
        const defaultLevel = availableAdminLevels[availableAdminLevels.length - 1]?.value || 'branch_admin';
        setFormData({
          name: '',
          email: '',
          password: '',
          phone: '',
          admin_level: defaultLevel,
          is_active: true,
          user_type: 'entity',
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
    
    if (isValidating) {
      const error = validateField(field, value);
      if (error) {
        setErrors(prev => ({ ...prev, [field]: error }));
      }
    }
  }, [errors, isValidating, validateField, emailExistsError]);

  // Email duplication validation
  const handleEmailBlur = useCallback(async () => {
    if (!formData.email || formData.email.trim() === '') {
      setEmailExistsError(null);
      return;
    }

    try {
      emailSchema.parse(formData.email);
    } catch {
      setEmailExistsError(null);
      return;
    }

    setIsValidatingEmail(true);
    try {
      const normalizedEmail = formData.email.toLowerCase().trim();
      
      const checks = await Promise.all([
        supabase
          .from('users')
          .select('id, email')
          .eq('email', normalizedEmail)
          .maybeSingle(),
        
        formData.user_type === 'entity' ? supabase
          .from('entity_users')
          .select('id, email, user_id')
          .eq('email', normalizedEmail)
          .eq('company_id', companyId)
          .maybeSingle() : Promise.resolve({ data: null, error: null })
      ]);

      for (const check of checks) {
        if (check.error && check.error.code !== 'PGRST116') {
          throw check.error;
        }
      }
      
      let isDuplicate = false;
      
      for (const check of checks) {
        if (check.data) {
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
    setIsValidating(true);
    
    await handleEmailBlur();
    await new Promise(resolve => setTimeout(resolve, 100));

    const newErrors: Record<string, string> = {};
    
    const nameError = validateField('name', formData.name);
    if (nameError) newErrors.name = nameError;
    
    const emailError = validateField('email', formData.email);
    if (emailError) newErrors.email = emailError;
    
    // Password validation - only for editing when password is provided
    if (isEditing && formData.password && formData.password.trim()) {
      const passwordError = validateField('password', formData.password);
      if (passwordError) newErrors.password = passwordError;
    }
    
    if (!formData.admin_level) {
      newErrors.admin_level = 'Administrator level is required';
    }
    
    // Scope validation
    if (formData.admin_level === 'school_admin' && selectedSchools.length === 0) {
      newErrors.schools = 'At least one school must be assigned';
    }
    
    if (formData.admin_level === 'branch_admin' && selectedBranches.length === 0) {
      newErrors.branches = 'At least one branch must be assigned';
    }
    
    if (Object.keys(newErrors).length > 0 || emailExistsError) {
      setErrors(newErrors);
      if (emailExistsError) {
        toast.error('Email address is already in use');
      }
      return;
    }
    
    if (!canModifyThisAdmin) {
      toast.error('You do not have permission to modify this administrator');
      return;
    }
    
    if (isSelfEdit && !formData.is_active) {
      toast.error('You cannot deactivate your own account');
      return;
    }
    
    try {
      const permissions = permissionService.getPermissionsForLevel(formData.admin_level);
      
      if (isEditing && initialData) {
        // Update existing admin
        await updateAdminMutation.mutateAsync({
          userId: initialData.id,
          updates: {
            name: formData.name,
            email: formData.email,
            password: formData.password || undefined,
            phone: formData.phone || undefined,
            admin_level: formData.admin_level,
            is_active: formData.is_active,
            permissions,
            assigned_schools: formData.admin_level === 'school_admin' ? selectedSchools : undefined,
            assigned_branches: formData.admin_level === 'branch_admin' ? selectedBranches : undefined,
            user_type: formData.user_type
          }
        });
        
        toast.success('Administrator updated successfully');
      } else {
        // Create new admin - NO PASSWORD REQUIRED
        const createData: any = {
          email: formData.email,
          name: formData.name,
          admin_level: formData.admin_level,
          company_id: companyId,
          permissions,
          is_active: formData.is_active,
          assigned_schools: formData.admin_level === 'school_admin' ? selectedSchools : undefined,
          assigned_branches: formData.admin_level === 'branch_admin' ? selectedBranches : undefined,
          phone: formData.phone,
          user_type: 'entity',
          send_invitation: true // Flag to send invitation email
        };

        await createAdminMutation.mutateAsync(createData);
        
        toast.success('Administrator created successfully. An invitation email has been sent.');
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Form submission error:', error);
      // Error toast handled by mutation
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
    emailExistsError,
    handleEmailBlur,
    createAdminMutation,
    updateAdminMutation,
    onSuccess,
    onClose
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
        {/* ENHANCED: Invitation Process Notice - Only for new users */}
        {!isEditing && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-[#99C93B]/30 dark:border-blue-700 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[#E8F5DC] dark:bg-blue-800">
                  <Send className="h-5 w-5 text-[#99C93B] dark:text-[#AAD775]" />
                </div>
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Secure Invitation Process
                </h4>
                <p className="text-sm text-[#5D7E23] dark:text-[#AAD775]">
                  The administrator will receive an invitation email with a secure link to:
                </p>
                <ul className="mt-2 text-sm text-[#99C93B] dark:text-[#AAD775] list-disc list-inside space-y-1">
                  <li>Set their own secure password</li>
                  <li>Verify their email address</li>
                  <li>Activate their account</li>
                </ul>
                <p className="mt-2 text-xs text-[#99C93B] dark:text-[#AAD775]">
                  The invitation link expires in 24 hours for security.
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
              disabled={!canModifyThisAdmin} // Keep disabled state
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
              disabled={!canModifyThisAdmin} // Keep disabled state
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
          >
            <PhoneInput
              value={formData.phone}
              onChange={(value) => handleFieldChange('phone', value)}
              placeholder="Enter phone number"
              disabled={!canModifyThisAdmin} // Keep disabled state
            />
          </FormField>

          {/* Password Reset Field - ONLY for editing existing users */}
          {isEditing && (
            <>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
                <div className="flex items-start">
                  <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-2 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Password Management
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                      To reset the password, enter a new one below. Leave blank to keep current password.
                    </p>
                  </div>
                </div>
              </div>

              <FormField
                id="password"
                label="Reset Password (Optional)"
                error={errors.password}
                description="Enter a new password to reset, or leave blank"
              >
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleFieldChange('password', e.target.value)}
                    placeholder="Enter new password (optional)" // Keep placeholder
                    disabled={!canModifyThisAdmin} // Keep disabled state
                    leftIcon={<Lock className="h-4 w-4 text-gray-400" />}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                  </button>
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
              disabled={!canModifyThisAdmin || availableAdminLevels.length <= 1} // Keep disabled state
            />
          </FormField>
          
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <ToggleSwitch
              checked={formData.is_active}
              onChange={(checked) => handleFieldChange('is_active', checked)}
              disabled={isSelfEdit || !canModifyThisAdmin} // Keep disabled state
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

        {/* SECTION 2: Scope Assignment */}
        {(formData.admin_level === 'school_admin' || formData.admin_level === 'branch_admin') && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
              <Building className="h-5 w-5 text-[#8CC63F]" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Scope Assignment
              </h3>
            </div>
            
            <div className="bg-[#E8F5DC] dark:bg-[#5D7E23]/20 border border-[#99C93B]/30 dark:border-blue-700 rounded-lg p-3">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-[#99C93B] dark:text-[#AAD775] mr-2" />
                <p className="text-sm text-[#5D7E23] dark:text-[#AAD775]">
                  {formData.admin_level === 'school_admin' 
                    ? 'Assign schools this administrator can manage'
                    : 'Assign branches this administrator can manage'}
                </p>
              </div>
            </div>
            
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
                  disabled={!canModifyThisAdmin || isLoadingSchools} // Keep disabled state
                />
              </FormField>
            )}
            
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
                    ]} // Keep options
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
                      placeholder="Select branches to assign..." // Keep placeholder
                      disabled={!canModifyThisAdmin || isLoadingBranches} // Keep disabled state
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
                  'Full system permissions and complete access'}
                {formData.admin_level === 'sub_entity_admin' && 
                  'Management permissions for assigned scope'}
                {formData.admin_level === 'school_admin' && 
                  'Permissions to manage assigned schools'}
                {formData.admin_level === 'branch_admin' && 
                  'Permissions to manage assigned branches'}
              </p>
            </div>
          </div>
        </div>

        {/* Form Validation Errors */}
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