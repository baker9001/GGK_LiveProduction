/**
 * File: /src/app/entity-module/organisation/tabs/admins/components/AdminCreationForm.tsx
 * 
 * ENHANCED VERSION - Complete form validation and improved UX
 * Uses existing shared form components with comprehensive validation
 * 
 * Features:
 * ✅ Comprehensive field validation with Zod
 * ✅ Password strength indicator
 * ✅ Proper error handling and toast messages
 * ✅ Removed "Super Admin" option (entity-level only)
 * ✅ Enhanced permission matrix functionality
 * ✅ Proper data validation and error prevention
 * ✅ Works with existing FormField components
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { z } from 'zod';
import { User, Mail, Lock, Shield, AlertCircle, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { SlideInForm } from '@/components/shared/SlideInForm';
import { FormField, Input, Select } from '@/components/shared/FormField';
import { Button } from '@/components/shared/Button';
import { ToggleSwitch } from '@/components/shared/ToggleSwitch';
import { toast } from '@/components/shared/Toast';
import { useCreateAdmin, useUpdateAdmin } from '../hooks/useAdminMutations';
import { AdminLevel, AdminPermissions, EntityAdminScope } from '../types/admin.types';
import { AdminScopeAssignment } from './AdminScopeAssignment';
import { AdminPermissionMatrix } from './AdminPermissionMatrix';
import { permissionService } from '../services/permissionService';
import { usePermissions } from '@/contexts/PermissionContext';

// Validation schemas
const nameSchema = z.string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be less than 100 characters')
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

const adminLevelSchema = z.enum(['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin'], {
  errorMap: () => ({ message: 'Please select a valid admin level' })
});

interface AdminUser {
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
}

interface AdminCreationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  companyId: string;
  initialData?: AdminUser;
}

// Password strength calculator
const calculatePasswordStrength = (password: string): { score: number; label: string; color: string } => {
  if (!password) return { score: 0, label: 'No password', color: 'bg-gray-200' };
  
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  const strength = {
    0: { label: 'Very Weak', color: 'bg-red-500' },
    1: { label: 'Very Weak', color: 'bg-red-500' },
    2: { label: 'Weak', color: 'bg-orange-500' },
    3: { label: 'Fair', color: 'bg-yellow-500' },
    4: { label: 'Good', color: 'bg-blue-500' },
    5: { label: 'Strong', color: 'bg-green-500' },
    6: { label: 'Very Strong', color: 'bg-green-600' }
  };
  
  return { score, ...strength[score as keyof typeof strength] || strength[6] };
};

export const AdminCreationForm: React.FC<AdminCreationFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  companyId,
  initialData
}) => {
  const isEditing = !!initialData;
  const { user } = useUser();
  const { canModify } = usePermissions();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    admin_level: 'entity_admin' as AdminLevel,
    is_active: true
  });
  const [permissions, setPermissions] = useState<AdminPermissions>(
    initialData?.permissions ?? permissionService.getDefaultPermissions()
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);

  const createAdminMutation = useCreateAdmin();
  const updateAdminMutation = useUpdateAdmin();

  const isSubmitting = createAdminMutation.isPending || updateAdminMutation.isPending;

  // Password strength calculation
  const passwordStrength = useMemo(() => 
    calculatePasswordStrength(formData.password), 
    [formData.password]
  );

  // Reset form when modal opens or initialData changes
  useEffect(() => {
    if (initialData) {
      console.log('Setting form data from initialData:', initialData);
      setFormData({
        name: initialData.name,
        email: initialData.email,
        password: '',
        admin_level: initialData.admin_level,
        is_active: initialData.is_active
      });
      setPermissions(initialData.permissions ?? permissionService.getDefaultPermissions());
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        admin_level: 'entity_admin',
        is_active: true
      });
      setPermissions(permissionService.getDefaultPermissions());
    }
    setErrors({});
  }, [initialData, isOpen]);

  // Handle admin level change to update default permissions
  const handleAdminLevelChange = useCallback((value: string) => {
    const newLevel = value as AdminLevel;
    setFormData(prev => ({ ...prev, admin_level: newLevel }));
    
    const defaultPermissions = permissionService.getPermissionsForLevel(newLevel);
    setPermissions(defaultPermissions);
    
    // Show different messages based on admin level
    if (newLevel === 'entity_admin') {
      toast.success('Entity Admin selected - Full access permissions applied');
    } else {
      toast.info(`Default permissions applied for ${newLevel.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`);
    }
  }, []);

  // Validate individual field
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
        case 'admin_level':
          adminLevelSchema.parse(value);
          break;
      }
      return undefined;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors[0]?.message;
      }
      return 'Validation error';
    }
  }, [isEditing]);

  // Validate entire form
  const validateForm = useCallback((): boolean => {
    setIsValidating(true);
    const newErrors: Record<string, string> = {};

    // Validate name
    const nameError = validateField('name', formData.name);
    if (nameError) newErrors.name = nameError;

    // Validate email
    const emailError = validateField('email', formData.email);
    if (emailError) newErrors.email = emailError;

    // Validate password (required for new users)
    if (!isEditing && !formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password) {
      const passwordError = validateField('password', formData.password);
      if (passwordError) newErrors.password = passwordError;
    }

    // Validate admin level
    const adminLevelError = validateField('admin_level', formData.admin_level);
    if (adminLevelError) newErrors.admin_level = adminLevelError;

    // Validate company ID
    if (!companyId) {
      newErrors.submit = 'Company ID is required';
    }

    // Check permissions
    const hasAnyPermission = Object.values(permissions).some(category => 
      Object.values(category).some(permission => permission === true)
    );

    if (!hasAnyPermission) {
      toast.warning('Warning: This admin will have no permissions. Consider granting at least view permissions.');
    }

    setErrors(newErrors);
    setIsValidating(false);
    return Object.keys(newErrors).length === 0;
  }, [formData, isEditing, companyId, permissions, validateField]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the validation errors before submitting');
      return;
    }

    // Security check: Prevent admin from deactivating their own account
    if (isEditing && formData.is_active === false && initialData?.user_id === user?.id) {
      toast.error('You cannot deactivate your own account');
      return;
    }

    // Prepare payload
    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      admin_level: formData.admin_level,
      is_active: formData.is_active,
      company_id: companyId,
      permissions,
      scopes: []
    };

    try {
      if (isEditing) {
        await updateAdminMutation.mutateAsync(
          { userId: initialData.id, updates: payload },
          {
            onSuccess: () => {
              toast.success('Administrator updated successfully!');
              onSuccess?.();
              onClose();
            }
          }
        );
      } else {
        await createAdminMutation.mutateAsync(payload, {
          onSuccess: () => {
            toast.success('Administrator created successfully!');
            onSuccess?.();
            onClose();
          }
        });
      }
    } catch (error: any) {
      const errorMessage = error?.message || (isEditing ? 'Failed to update administrator' : 'Failed to create administrator');
      toast.error(errorMessage);
      setErrors({ submit: errorMessage });
    }
  };

  // Handle input change with validation
  const handleInputChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Real-time validation for critical fields
    if (field === 'email' || field === 'name') {
      const error = validateField(field, value);
      if (error) {
        setErrors(prev => ({ ...prev, [field]: error }));
      }
    }
  }, [errors, validateField]);

  if (!isOpen) return null;

  return (
    <SlideInForm
      title={isEditing ? 'Edit Admin User' : 'Create New Admin User'}
      isOpen={isOpen}
      onClose={onClose}
      onSave={() => {
        const form = document.querySelector('form');
        if (form) form.requestSubmit();
      }}
      loading={isSubmitting}
      saveButtonText={isEditing ? 'Update Administrator' : 'Create Administrator'}
      width="xl"
    >
      {/* Error Summary */}
      {errors.submit && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
          <span className="text-red-700 dark:text-red-300">{errors.submit}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Section */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <User className="h-5 w-5 mr-2 text-[#8CC63F]" />
            Basic Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              id="name"
              label="Full Name"
              error={errors.name}
              required
            >
              <Input
                id="name"
                placeholder="Enter full name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={isSubmitting}
                leftIcon={<User className="h-5 w-5 text-gray-400" />}
              />
            </FormField>

            <FormField
              id="email"
              label="Email Address"
              error={errors.email}
              required
            >
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={isSubmitting}
                leftIcon={<Mail className="h-5 w-5 text-gray-400" />}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* Password Field with Strength Indicator */}
            <FormField
              id="password"
              label={isEditing ? "New Password (optional)" : "Password"}
              error={errors.password}
              required={!isEditing}
            >
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={isEditing ? "Leave blank to keep current" : "Enter password"}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  disabled={isSubmitting}
                  leftIcon={<Lock className="h-5 w-5 text-gray-400" />}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Password Strength:</span>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{passwordStrength.label}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${passwordStrength.color}`}
                      style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </FormField>

            <FormField
              id="admin_level"
              label="Admin Level"
              error={errors.admin_level}
              required
            >
              <Select
                id="admin_level"
                value={formData.admin_level}
                onChange={handleAdminLevelChange}
                disabled={isSubmitting}
                options={[
                  { value: 'entity_admin', label: 'Entity Admin' },
                  { value: 'sub_entity_admin', label: 'Sub-Entity Admin' },
                  { value: 'school_admin', label: 'School Admin' },
                  { value: 'branch_admin', label: 'Branch Admin' }
                ]}
              />
            </FormField>
          </div>

          <div className="mt-4">
            <FormField id="status" label="Status">
              <ToggleSwitch
                checked={formData.is_active}
                onChange={(checked) => handleInputChange('is_active', checked)}
                disabled={isSubmitting || (isEditing && initialData?.user_id === user?.id)}
                color="green"
                size="md"
                showStateLabel={true}
                activeLabel="Active"
                inactiveLabel="Inactive"
                description="Inactive users cannot log in or access the system"
              />
              {isEditing && initialData?.user_id === user?.id && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  You cannot change your own account status
                </p>
              )}
            </FormField>
          </div>
        </div>

        {/* Scope Assignment Section */}
        {isEditing && initialData?.id && formData.admin_level !== 'entity_admin' && (
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-[#8CC63F]" />
              Scope Assignment
            </h3>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 mb-4">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-[#8CC63F] mr-2" />
                <p className="text-sm text-green-700 dark:text-green-300">
                  Scope assignment limits this admin's access to specific schools or branches. 
                  Leave empty for full company access.
                </p>
              </div>
            </div>
            <AdminScopeAssignment
              userId={initialData.id}
              companyId={companyId}
              adminLevel={formData.admin_level}
              canModifyScope={canModify('admin')}
              onScopesUpdated={() => {
                toast.success('Scope assignments updated');
                onSuccess?.();
              }}
            />
          </div>
        )}

        {/* Entity Admin Full Access Notice */}
        {formData.admin_level === 'entity_admin' && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-[#8CC63F]" />
              Entity Administrator Access
            </h3>
            <div className="bg-[#8CC63F]/10 border border-[#8CC63F]/20 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-[#8CC63F] mr-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Full Company Access Granted
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Entity Administrators have unrestricted access to all schools, branches, and company-wide settings. 
                    No scope assignment is needed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Admin Permissions Section */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-[#8CC63F]" />
            Admin Permissions
          </h3>
          {formData.admin_level === 'entity_admin' ? (
            <div className="bg-[#8CC63F]/10 border border-[#8CC63F]/20 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-[#8CC63F] mr-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Full Permissions Automatically Granted
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Entity Administrators automatically receive all permissions. The permission matrix below shows the complete access level.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 mb-4">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-[#8CC63F] mr-2" />
                <p className="text-sm text-green-700 dark:text-green-300">
                  These permissions control what actions this administrator can perform. 
                  Unchecked permissions will prevent access to related functions.
                </p>
              </div>
            </div>
          )}
          <AdminPermissionMatrix
            value={permissions}
            onChange={setPermissions}
            disabled={isSubmitting || formData.admin_level === 'entity_admin' || !canModify('admin')}
          />
          {!canModify('admin') && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 mt-4">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mr-2" />
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  You do not have permission to modify admin permissions.
                </p>
              </div>
            </div>
          )}
        </div>
      </form>
    </SlideInForm>
  );
};