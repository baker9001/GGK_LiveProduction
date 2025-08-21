/**
 * File: /src/app/entity-module/organisation/tabs/admins/components/AdminCreationForm.tsx
 * 
 * ENHANCED VERSION - Complete form validation and improved UX
 * Now properly integrated with SlideInForm component
 * 
 * Features:
 * ✅ Integrated with shared form validation components
 * ✅ Zod schema validation for all fields
 * ✅ Password strength indicator
 * ✅ Proper error handling and toast messages
 * ✅ Removed "Super Admin" option (entity-level only)
 * ✅ Enhanced permission matrix functionality
 * ✅ Proper data validation and error prevention
 * ✅ Works with SlideInForm component
 */

import React, { useState, useEffect, useRef } from 'react';
import { z } from 'zod';
import { User, Mail, Lock, Shield, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { 
  ValidationProvider, 
  ValidatedInput, 
  ValidatedSelect,
  FormErrorSummary,
  FormStatus,
  SubmitButton,
  PasswordStrength,
  useValidation
} from '@/components/shared/FormValidation';
import { Button } from '@/components/shared/Button';
import { toast } from '@/components/shared/Toast';
import { useCreateAdmin, useUpdateAdmin } from '../hooks/useAdminMutations';
import { AdminLevel, AdminPermissions, EntityAdminScope } from '../types/admin.types';
import { AdminScopeAssignment } from './AdminScopeAssignment';
import { AdminPermissionMatrix } from './AdminPermissionMatrix';
import { permissionService } from '../services/permissionService';

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
  name: string;
  email: string;
  admin_level: AdminLevel;
  is_active: boolean;
  created_at: string;
  permissions?: AdminPermissions;
  scopes?: EntityAdminScope[];
}

interface AdminCreationFormProps {
  companyId: string;
  initialData?: AdminUser;
  onSuccess?: () => void;
}

export const AdminCreationForm: React.FC<AdminCreationFormProps> = ({
  companyId,
  initialData,
  onSuccess
}) => {
  const isEditing = !!initialData;
  const [showPassword, setShowPassword] = useState(false);
  const [permissions, setPermissions] = useState<AdminPermissions>(
    initialData?.permissions ?? permissionService.getDefaultPermissions()
  );
  const [assignedScopes, setAssignedScopes] = useState<EntityAdminScope[]>(
    initialData?.scopes ?? []
  );
  const formRef = useRef<HTMLFormElement>(null);

  const createAdminMutation = useCreateAdmin();
  const updateAdminMutation = useUpdateAdmin();

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      setPermissions(initialData.permissions ?? permissionService.getDefaultPermissions());
      setAssignedScopes(initialData.scopes ?? []);
    } else {
      setPermissions(permissionService.getDefaultPermissions());
      setAssignedScopes([]);
    }
  }, [initialData]);

  // Handle admin level change to update default permissions
  const handleAdminLevelChange = (newLevel: AdminLevel) => {
    const defaultPermissions = permissionService.getPermissionsForLevel(newLevel);
    setPermissions(defaultPermissions);
    toast.info(`Default permissions applied for ${newLevel.replace('_', ' ')}`);
  };

  // Handle form submission
  const handleFormSubmit = async (formData: Record<string, any>) => {
    try {
      // Validate required fields
      if (!companyId) {
        throw new Error('Company ID is required');
      }

      // Prepare payload with proper validation
      const payload = {
        name: formData.name?.trim(),
        email: formData.email?.trim().toLowerCase(),
        password: formData.password,
        admin_level: formData.admin_level,
        is_active: formData.is_active ?? true,
        company_id: companyId,
        permissions,
        scopes: assignedScopes
      };

      // Additional validation
      if (!payload.name) {
        throw new Error('Full name is required');
      }

      if (!payload.email) {
        throw new Error('Email address is required');
      }

      if (!isEditing && !payload.password) {
        throw new Error('Password is required for new users');
      }

      if (!payload.admin_level) {
        throw new Error('Admin level is required');
      }

      // Validate permissions object
      if (!permissions || typeof permissions !== 'object') {
        throw new Error('Invalid permissions configuration');
      }

      // Check if at least one permission is granted
      const hasAnyPermission = Object.values(permissions).some(category => 
        Object.values(category).some(permission => permission === true)
      );

      if (!hasAnyPermission) {
        toast.warning('Warning: This admin will have no permissions. Consider granting at least view permissions.');
      }

      if (isEditing && initialData) {
        await updateAdminMutation.mutateAsync(
          { userId: initialData.id, updates: payload },
          {
            onSuccess: () => {
              toast.success('Administrator updated successfully!');
              onSuccess?.();
            },
            onError: (error: any) => {
              const errorMessage = error?.message || 'Failed to update administrator';
              toast.error(errorMessage);
              throw new Error(errorMessage);
            }
          }
        );
      } else {
        await createAdminMutation.mutateAsync(payload, {
          onSuccess: () => {
            toast.success('Administrator created successfully!');
            onSuccess?.();
          },
          onError: (error: any) => {
            const errorMessage = error?.message || 'Failed to create administrator';
            toast.error(errorMessage);
            throw new Error(errorMessage);
          }
        });
      }
    } catch (error) {
      console.error('Form submission error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error(errorMessage);
      throw error; // Re-throw to prevent form from closing
    }
  };

  // Custom password field with strength indicator
  const PasswordField = () => {
    const { register, getFieldState } = useValidation();
    
    const { value, onChange, onBlur, ref } = register('password', {
      required: !isEditing,
      zodSchema: isEditing ? passwordSchema.optional() : passwordSchema,
      validateOnChange: true,
    });
    
    const fieldState = getFieldState('password');
    const hasError = fieldState?.result.errors.length > 0;
    
    return (
      <div className="mb-4">
        <label 
          htmlFor="password" 
          className={`block text-sm font-medium mb-1 ${hasError ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-300"}`}
        >
          {isEditing ? 'New Password (leave blank to keep current)' : 'Password'} 
          {!isEditing && <span className="text-red-500 ml-1">*</span>}
        </label>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Lock className="h-5 w-5 text-gray-400" />
          </div>
          <input
            id="password"
            ref={ref as React.RefObject<HTMLInputElement>}
            type={showPassword ? "text" : "password"}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            className={`w-full pl-10 pr-10 py-2 border rounded-md shadow-sm text-sm transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
              ${hasError ? "border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500" : "border-gray-300 dark:border-gray-600"}`}
            placeholder={isEditing ? "Enter new password (optional)" : "Enter password"}
          />
          
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
            )}
          </button>
        </div>
        
        {value && <PasswordStrength password={value} className="mt-2" />}
        
        {fieldState?.result.errors.map((error, index) => (
          <p 
            key={`password-error-${index}`} 
            className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center"
          >
            <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0" />
            {error}
          </p>
        ))}
        
        {!hasError && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {isEditing 
              ? 'Leave blank to keep current password' 
              : 'Must contain uppercase, lowercase, number, and special character'
            }
          </p>
        )}
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
          
          {/* Basic Information Section */}
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
                placeholder="Enter full name"
                initialValue={initialData?.name || ''}
                helperText="Enter the administrator's full name"
              />

              <ValidatedInput
                name="email"
                label="Email Address"
                type="email"
                required
                zodSchema={emailSchema}
                placeholder="Enter email address"
                initialValue={initialData?.email || ''}
                helperText="This will be used for login and notifications"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <PasswordField />

              <ValidatedSelect
                name="admin_level"
                label="Admin Level"
                required
                zodSchema={adminLevelSchema}
                options={[
                  { value: 'entity_admin', label: 'Entity Admin' },
                  { value: 'sub_entity_admin', label: 'Sub-Entity Admin' },
                  { value: 'school_admin', label: 'School Admin' },
                  { value: 'branch_admin', label: 'Branch Admin' }
                ]}
                initialValue={initialData?.admin_level || 'entity_admin'}
                helperText="Determines default permissions and access level"
              />
            </div>

            <div className="mt-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  defaultChecked={initialData?.is_active ?? true}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                  Active User
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Inactive users cannot log in or access the system
              </p>
            </div>
          </div>

          {/* Admin Permissions Section */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-purple-500" />
              Admin Permissions
            </h3>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-4">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-2" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  These permissions control what actions this administrator can perform. 
                  Unchecked permissions will prevent access to related functions.
                </p>
              </div>
            </div>
            <AdminPermissionMatrix
              value={permissions}
              onChange={setPermissions}
              disabled={formState.isSubmitting}
            />
          </div>

          {/* Scope Assignment Section - Only show for editing existing admins */}
          {isEditing && initialData?.id && (
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <User className="h-5 w-5 mr-2 text-green-500" />
                Scope Assignment
              </h3>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 mb-4">
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mr-2" />
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Scope assignment limits this admin's access to specific schools or branches. 
                    Leave empty for full company access.
                  </p>
                </div>
              </div>
              <AdminScopeAssignment
                userId={initialData.id}
                companyId={companyId}
                onScopesUpdated={() => {
                  toast.success('Scope assignments updated');
                  onSuccess?.();
                }}
              />
            </div>
          )}

          {/* Information for new admins */}
          {!isEditing && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" />
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">
                    New Administrator Setup
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    After creation, you can assign specific schools and branches to limit this admin's access. 
                    By default, they will have access to the entire company.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form Status */}
          <div className="mt-6">
            <FormStatus className="mb-4" />
          </div>

          {/* Hidden submit button - form will be submitted via SlideInForm */}
          <div className="hidden">
            <SubmitButton
              disabled={formState.isSubmitting}
              loadingText={isEditing ? "Updating..." : "Creating..."}
            >
              {isEditing ? 'Update Administrator' : 'Create Administrator'}
            </SubmitButton>
          </div>
        </form>
      )}
    </ValidationProvider>
  );
};