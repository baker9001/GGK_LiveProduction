/**
 * File: /src/app/entity-module/organisation/tabs/admins/components/AdminCreationForm.tsx
 * 
 * COMPLETE MERGED VERSION - All features from both implementations
 * ✅ Modal wrapper with overlay and close functionality
 * ✅ ValidationProvider pattern with form validation
 * ✅ Password strength indicator with visual feedback
 * ✅ Comprehensive Zod validation schemas
 * ✅ Close button (X) in header
 * ✅ Supports both prop patterns (isOpen/onClose and onSubmit/onCancel)
 * ✅ Permission matrix integration
 * ✅ Scope assignment for existing admins
 * ✅ Real-time validation and error handling
 * ✅ Password visibility toggle for both fields
 * ✅ Responsive layout with dark mode support
 */

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { 
  User, Shield, AlertCircle, Eye, EyeOff, Lock, XCircle
} from 'lucide-react';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import { 
  ValidationProvider, 
  ValidatedInput, 
  ValidatedSelect,
  FormErrorSummary 
} from '@/components/shared/FormValidation';
import { AdminPermissionMatrix } from './AdminPermissionMatrix';
import { AdminScopeAssignment } from './AdminScopeAssignment';
import { AdminLevel, AdminPermissions } from '../types/admin.types';
import { useCreateAdmin, useUpdateAdmin } from '../hooks/useAdminMutations';
import { permissionService } from '../services/permissionService';

// Validation schemas
const nameSchema = z.string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');

const emailSchema = z.string()
  .email('Please enter a valid email address')
  .min(5, 'Email must be at least 5 characters')
  .max(255, 'Email must be less than 255 characters')
  .transform(email => email.toLowerCase().trim());

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*]/, 'Password must contain at least one special character');

const confirmPasswordSchema = z.string()
  .min(1, 'Please confirm your password');

const adminLevelSchema = z.enum(['entity_admin', 'sub_entity_admin', 'school_admin', 'branch_admin']);

// Password strength calculator
const calculatePasswordStrength = (password: string): { score: number; label: string; color: string } => {
  if (!password) return { score: 0, label: '', color: 'bg-gray-200' };
  
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  const strengthMap = {
    0: { label: 'Very Weak', color: 'bg-red-500' },
    1: { label: 'Very Weak', color: 'bg-red-500' },
    2: { label: 'Weak', color: 'bg-orange-500' },
    3: { label: 'Fair', color: 'bg-yellow-500' },
    4: { label: 'Good', color: 'bg-blue-500' },
    5: { label: 'Strong', color: 'bg-green-500' },
    6: { label: 'Very Strong', color: 'bg-green-600' }
  };
  
  return { score, ...strengthMap[score as keyof typeof strengthMap] || strengthMap[6] };
};

interface AdminCreationFormProps {
  companyId: string;
  initialData?: {
    id?: string;
    name?: string;
    email?: string;
    admin_level?: AdminLevel;
    permissions?: AdminPermissions;
    is_active?: boolean;
    parent_admin_id?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  // Optional: For backward compatibility with different implementations
  isEditing?: boolean;
  onSubmit?: (data: any) => Promise<void>;
  onCancel?: () => void;
}

export function AdminCreationForm({
  companyId,
  initialData,
  isOpen,
  onClose,
  onSuccess,
  isEditing: isEditingProp,
  onSubmit,
  onCancel
}: AdminCreationFormProps) {
  // Determine if we're editing based on initialData or prop
  const isEditing = isEditingProp ?? !!initialData?.id;
  
  const formRef = useRef<HTMLFormElement>(null);
  const [permissions, setPermissions] = useState<AdminPermissions>(
    initialData?.permissions || permissionService.getDefaultPermissions()
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');
  const [confirmPasswordValue, setConfirmPasswordValue] = useState('');
  const [adminLevel, setAdminLevel] = useState<AdminLevel>(
    initialData?.admin_level || 'entity_admin'
  );

  // Hooks for mutations
  const createAdminMutation = useCreateAdmin();
  const updateAdminMutation = useUpdateAdmin();

  // Calculate password strength
  const passwordStrength = useMemo(() => 
    calculatePasswordStrength(passwordValue), 
    [passwordValue]
  );

  // Reset form when modal opens/closes or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setAdminLevel(initialData.admin_level || 'entity_admin');
        setPermissions(initialData.permissions || permissionService.getDefaultPermissions());
      } else {
        setAdminLevel('entity_admin');
        setPermissions(permissionService.getDefaultPermissions());
      }
      setPasswordValue('');
      setConfirmPasswordValue('');
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  }, [isOpen, initialData]);

  // Update permissions when admin level changes (only for new admins)
  useEffect(() => {
    if (!isEditing && isOpen) {
      const defaultPermissions = permissionService.getPermissionsForLevel(adminLevel);
      setPermissions(defaultPermissions);
      if (adminLevel !== (initialData?.admin_level || 'entity_admin')) {
        toast.info(`Default permissions applied for ${adminLevel.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`);
      }
    }
  }, [adminLevel, isEditing, isOpen, initialData?.admin_level]);

  const handleClose = () => {
    // Call both callbacks if they exist
    if (onCancel) {
      onCancel();
    }
    onClose();
  };

  const handleFormSubmit = async (formData: Record<string, any>) => {
    try {
      setIsSubmitting(true);

      // Validate passwords match
      if (!isEditing || formData.password) {
        if (formData.password !== formData.confirmPassword) {
          toast.error('Passwords do not match');
          return;
        }
      }

      // Check permissions
      const hasAnyPermission = Object.values(permissions).some(category => 
        Object.values(category).some(permission => permission === true)
      );

      if (!hasAnyPermission) {
        toast.warning('Warning: This admin will have no permissions. Consider granting at least view permissions.');
      }

      // Prepare submission data
      const submitData: any = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        admin_level: formData.admin_level,
        permissions: permissions,
        is_active: formData.is_active !== false,
        company_id: companyId
      };

      // Include password for new users or if updating password
      if (!isEditing) {
        submitData.password = formData.password;
      } else if (formData.password) {
        submitData.password = formData.password;
      }

      // Include parent_admin_id if provided
      if (initialData?.parent_admin_id) {
        submitData.parent_admin_id = initialData.parent_admin_id;
      }

      // Use mutation hooks or prop onSubmit
      if (onSubmit) {
        // Use provided onSubmit function
        await onSubmit(submitData);
        toast.success(isEditing ? 'Administrator updated successfully' : 'Administrator created successfully');
        onSuccess?.();
        onClose();
      } else if (isEditing && initialData?.id) {
        // Use update mutation
        await updateAdminMutation.mutateAsync(
          { userId: initialData.id, updates: submitData },
          {
            onSuccess: () => {
              toast.success('Administrator updated successfully');
              onSuccess?.();
              onClose();
            }
          }
        );
      } else {
        // Use create mutation
        await createAdminMutation.mutateAsync(submitData, {
          onSuccess: () => {
            toast.success('Administrator created successfully');
            onSuccess?.();
            onClose();
          }
        });
      }
    } catch (error: any) {
      console.error('Form submission error:', error);
      toast.error(error.message || 'Failed to save administrator');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Password field component
  const PasswordField = ({ 
    name, 
    label, 
    placeholder, 
    showState, 
    setShowState, 
    value, 
    setValue, 
    isConfirm = false 
  }: {
    name: string;
    label: string;
    placeholder: string;
    showState: boolean;
    setShowState: (show: boolean) => void;
    value: string;
    setValue: (value: string) => void;
    isConfirm?: boolean;
  }) => {
    return (
      <div className="relative">
        <ValidatedInput
          name={name}
          label={label}
          type={showState ? 'text' : 'password'}
          required={!isEditing}
          zodSchema={
            !isEditing 
              ? (isConfirm ? confirmPasswordSchema : passwordSchema)
              : (isConfirm ? confirmPasswordSchema.optional() : passwordSchema.optional())
          }
          placeholder={placeholder}
          initialValue=""
          helperText={
            isEditing && !isConfirm
              ? 'Leave blank to keep current password' 
              : !isConfirm && !isEditing
              ? 'Must contain uppercase, lowercase, number, and special character'
              : undefined
          }
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setValue(e.target.value);
          }}
          rules={
            isConfirm ? [
              {
                validator: (val: string) => val === passwordValue,
                message: 'Passwords do not match'
              }
            ] : undefined
          }
        />
        <button
          type="button"
          onClick={() => setShowState(!showState)}
          className="absolute right-2 top-[38px] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          tabIndex={-1}
        >
          {showState ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <>
      {/* Modal Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        {/* Modal Container */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Shield className="h-6 w-6 mr-2 text-blue-500" />
                {isEditing ? 'Edit Administrator' : 'Create New Administrator'}
              </h2>
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Modal Body - Scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
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
                        helperText="This will be used for login"
                        disabled={isEditing}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                          setAdminLevel(e.target.value as AdminLevel)
                        }
                      />

                      <div className="flex items-end">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="is_active"
                              name="is_active"
                              defaultChecked={initialData?.is_active !== false}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                            />
                            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                              Active User
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Password Section */}
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
                      <div>
                        <PasswordField
                          name="password"
                          label={isEditing ? "New Password (Optional)" : "Password"}
                          placeholder={isEditing ? "Enter new password" : "Enter password"}
                          showState={showPassword}
                          setShowState={setShowPassword}
                          value={passwordValue}
                          setValue={setPasswordValue}
                        />
                        
                        {/* Password Strength Indicator */}
                        {passwordValue && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-600 dark:text-gray-400">Password Strength:</span>
                              <span className={`text-xs font-medium ${
                                passwordStrength.score >= 5 ? 'text-green-600 dark:text-green-400' :
                                passwordStrength.score >= 3 ? 'text-yellow-600 dark:text-yellow-400' :
                                'text-red-600 dark:text-red-400'
                              }`}>
                                {passwordStrength.label}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                                style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <PasswordField
                        name="confirmPassword"
                        label={isEditing ? "Confirm New Password" : "Confirm Password"}
                        placeholder={isEditing ? "Confirm new password" : "Confirm password"}
                        showState={showConfirmPassword}
                        setShowState={setShowConfirmPassword}
                        value={confirmPasswordValue}
                        setValue={setConfirmPasswordValue}
                        isConfirm={true}
                      />
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
                        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-2 flex-shrink-0" />
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Permissions control what actions this administrator can perform. 
                          Default permissions are set based on the admin level.
                        </p>
                      </div>
                    </div>
                    <AdminPermissionMatrix
                      value={permissions}
                      onChange={setPermissions}
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Scope Assignment Section - Only for editing */}
                  {isEditing && initialData?.id && (
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <User className="h-5 w-5 mr-2 text-green-500" />
                        Scope Assignment
                      </h3>
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 mb-4">
                        <div className="flex items-center">
                          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mr-2 flex-shrink-0" />
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

                  {/* Form Actions - Moved inside form for proper submit handling */}
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </span>
                      ) : (
                        isEditing ? 'Update Administrator' : 'Create Administrator'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </ValidationProvider>
          </div>
        </div>
      </div>
    </>
  );
}