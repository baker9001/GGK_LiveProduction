import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Shield, AlertCircle } from 'lucide-react';
import { FormField, Input, Select } from '@/components/shared/FormField';
import { Button } from '@/components/shared/Button';
import { useCreateAdmin, useUpdateAdmin } from '../hooks/useAdminMutations';
import { AdminLevel, AdminPermissions, EntityAdminScope } from '../types/admin.types';
import { AdminScopeAssignment } from './AdminScopeAssignment';
import { AdminPermissionMatrix } from './AdminPermissionMatrix';
import { permissionService } from '../services/permissionService';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  adminLevel: AdminLevel;
  isActive: boolean;
  createdAt: string;
  permissions?: AdminPermissions;
  scopes?: EntityAdminScope[];
}

interface AdminCreationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  companyId: string;
  initialData?: AdminUser;
}

export const AdminCreationForm: React.FC<AdminCreationFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  companyId,
  initialData
}) => {
  const isEditing = !!initialData;
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    adminLevel: 'entity_admin' as AdminLevel,
    isActive: true
  });
  const [permissions, setPermissions] = useState<AdminPermissions>(
    initialData?.permissions ?? permissionService.getDefaultPermissions()
  );
  const [assignedScopes, setAssignedScopes] = useState<EntityAdminScope[]>(
    initialData?.scopes ?? []
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createAdminMutation = useCreateAdmin();
  const updateAdminMutation = useUpdateAdmin();

  const isSubmitting = createAdminMutation.isPending || updateAdminMutation.isPending;

  // Reset form when modal opens or initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        email: initialData.email,
        password: '', // Never pre-fill password
        adminLevel: initialData.adminLevel,
        isActive: initialData.isActive
      });
      setPermissions(initialData.permissions ?? permissionService.getDefaultPermissions());
      setAssignedScopes(initialData.scopes ?? []);
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        adminLevel: 'entity_admin',
        isActive: true
      });
      setPermissions(permissionService.getDefaultPermissions());
      setAssignedScopes([]);
    }
    setErrors({});
  }, [initialData, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!isEditing && !formData.password) {
      newErrors.password = 'Password is required';
    }

    if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const payload = {
      ...formData,
      companyId,
      permissions,
      scopes: assignedScopes
    };

    if (isEditing) {
      updateAdminMutation.mutate(
        { id: initialData.id, data: payload },
        {
          onSuccess: () => {
            onSuccess?.();
            onClose();
          },
          onError: (error: any) => {
            setErrors({ submit: error.message || 'Failed to update admin' });
          }
        }
      );
    } else {
      createAdminMutation.mutate(payload, {
        onSuccess: () => {
          onSuccess?.();
          onClose();
        },
        onError: (error: any) => {
          setErrors({ submit: error.message || 'Failed to create admin' });
        }
      });
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isEditing ? 'Edit Admin User' : 'Create New Admin User'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              disabled={isSubmitting}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {errors.submit && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-700 dark:text-red-300">{errors.submit}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField
              label="Full Name"
              error={errors.name}
              required
            >
              <Input
                icon={User}
                placeholder="Enter full name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={isSubmitting}
              />
            </FormField>

            <FormField
              label="Email Address"
              error={errors.email}
              required
            >
              <Input
                icon={Mail}
                type="email"
                placeholder="Enter email address"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={isSubmitting}
              />
            </FormField>

            <FormField
              label={isEditing ? "New Password (leave blank to keep current)" : "Password"}
              error={errors.password}
              required={!isEditing}
            >
              <Input
                icon={Lock}
                type="password"
                placeholder={isEditing ? "Enter new password (optional)" : "Enter password"}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                disabled={isSubmitting}
              />
            </FormField>

            <FormField
              label="Admin Level"
              error={errors.adminLevel}
              required
            >
              <Select
                icon={Shield}
                value={formData.adminLevel}
                onChange={(e) => handleInputChange('adminLevel', e.target.value as AdminLevel)}
                disabled={isSubmitting}
                options={[
                  { value: 'super_admin', label: 'Super Admin' },
                  { value: 'company_admin', label: 'Company Admin' },
                  { value: 'entity_admin', label: 'Entity Admin' }
                ]}
              />
            </FormField>

            <FormField label="Status">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  disabled={isSubmitting}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                  Active User
                </label>
              </div>
            </FormField>

            {/* Admin Permissions Section */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-purple-500" />
                Admin Permissions
              </h3>
              <AdminPermissionMatrix
                value={permissions}
                onChange={setPermissions}
                disabled={isSubmitting}
              />
            </div>

            {/* Admin Scope Assignment Section - Only show if userId is available (edit mode) */}
            {initialData?.id && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2 text-blue-500" />
                  Scope Assignment
                </h3>
                <AdminScopeAssignment
                  userId={initialData.id}
                  companyId={companyId}
                  onScopesUpdated={() => {
                    // Optionally refetch scopes or update local state
                    // For now, we'll rely on the component's internal state management
                    if (onSuccess) {
                      onSuccess();
                    }
                  }}
                />
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={isSubmitting}
              >
                {isEditing ? 'Update Admin' : 'Create Admin'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};