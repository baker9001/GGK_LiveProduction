/**
 * File: /src/app/entity-module/organisation/tabs/admins/components/AdminCreationForm.tsx
 * 
 * REIMPLEMENTED: Admin Creation/Edit Form
 * Matches standard shared slide form with proper database field alignment
 * 
 * Dependencies:
 *   - @/components/shared/* (SlideInForm, FormField, Input, Select, ToggleSwitch)
 *   - @/contexts/UserContext
 *   - ../hooks/useAdminMutations
 *   - ../types/admin.types
 *   - ../services/permissionService
 *   - External: react, zod, lucide-react
 * 
 * Database Tables:
 *   - entity_users (id, user_id, name, email, admin_level, permissions, is_active, company_id, metadata)
 *   - users (id, email, password_hash, user_type, is_active)
 *   - entity_admin_scope (user_id, scope_type, scope_id, permissions)
 * 
 * Form Sections:
 *   1. Basic Information (name, email, password)
 *   2. Role & Status (admin_level, is_active)
 *   3. Scope Assignment (schools/branches for non-entity admins)
 *   4. Permissions (customizable permissions matrix)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { z } from 'zod';
import { User, Mail, Lock, Shield, AlertCircle, Eye, EyeOff, CheckCircle, Building, School, MapPin } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { SlideInForm } from '@/components/shared/SlideInForm';
import { FormField, Input, Select } from '@/components/shared/FormField';
import { Button } from '@/components/shared/Button';
import { ToggleSwitch } from '@/components/shared/ToggleSwitch';
import { toast } from '@/components/shared/Toast';
import { useCreateAdmin, useUpdateAdmin } from '../hooks/useAdminMutations';
import { AdminLevel, AdminPermissions } from '../types/admin.types';
import { AdminScopeAssignment } from './AdminScopeAssignment';
import { AdminPermissionMatrix } from './AdminPermissionMatrix';
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
  
  const [permissions, setPermissions] = useState<AdminPermissions>(
    permissionService.getMinimalPermissions()
  );
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // ===== MUTATIONS =====
  const createAdminMutation = useCreateAdmin();
  const updateAdminMutation = useUpdateAdmin();
  const isSubmitting = createAdminMutation.isPending || updateAdminMutation.isPending;

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

  const needsScopeAssignment = useMemo(() => {
    return formData.admin_level === 'school_admin' || formData.admin_level === 'branch_admin';
  }, [formData.admin_level]);

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
        setPermissions(
          initialData.permissions || 
          permissionService.getPermissionsForLevel(initialData.admin_level)
        );
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
        setPermissions(permissionService.getPermissionsForLevel(defaultLevel));
      }
      setErrors({});
      setShowPassword(false);
      setIsValidating(false);
    }
  }, [isOpen, initialData, availableAdminLevels]);

  // ===== PERMISSION UPDATES =====
  useEffect(() => {
    // Update permissions when admin level changes (only for new admins or if no custom permissions)
    if (!isEditing || !initialData?.permissions) {
      const defaultPermissions = permissionService.getPermissionsForLevel(formData.admin_level);
      setPermissions(defaultPermissions);
    }
  }, [formData.admin_level, isEditing, initialData]);

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
    if (errors[field]) {
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
  }, [errors, isValidating, validateField]);

  const handleSubmit = useCallback(async () => {
    setIsValidating(true);
    
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
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('Please fix the validation errors');
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
            permissions: formData.admin_level === 'entity_admin' 
              ? permissionService.getEntityAdminPermissions()
              : permissions
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
          permissions: formData.admin_level === 'entity_admin'
            ? permissionService.getEntityAdminPermissions()
            : permissions,
          is_active: formData.is_active
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
    permissions, 
    isEditing, 
    initialData, 
    companyId, 
    canModifyThisAdmin, 
    isSelfEdit,
    validateField,
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
            error={errors.email}
          >
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleFieldChange('email', e.target.value)}
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
        {needsScopeAssignment && initialData?.user_id && (
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
            
            <AdminScopeAssignment
              userId={initialData.user_id}
              companyId={companyId}
              adminLevel={formData.admin_level}
              canModifyScope={canModifyThisAdmin}
              onScopesUpdated={() => {
                // Refresh parent data if needed
                console.log('Scopes updated for admin:', initialData.user_id);
              }}
            />
          </div>
        )}

        {/* SECTION 4: Permissions (for non-Entity Admins) */}
        {formData.admin_level !== 'entity_admin' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
              <Shield className="h-5 w-5 text-[#8CC63F]" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Permissions
              </h3>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" />
                <p className="text-sm text-green-700 dark:text-green-300">
                  Permissions are automatically set based on the admin level. You can customize them if needed.
                </p>
              </div>
            </div>
            
            <AdminPermissionMatrix
              value={permissions}
              onChange={setPermissions}
              disabled={!canModifyThisAdmin || isSelfEdit}
            />
          </div>
        )}
        
        {/* Entity Admin Full Permissions Notice */}
        {formData.admin_level === 'entity_admin' && (
          <div className="bg-[#8CC63F]/10 border border-[#8CC63F]/20 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-[#8CC63F] mr-2 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Full Permissions Automatically Granted
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Entity Administrators automatically receive all system permissions and full company access.
                </p>
              </div>
            </div>
          </div>
        )}

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