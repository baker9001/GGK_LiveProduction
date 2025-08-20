import React from 'react';
import { AdminPermissions } from '../types/admin.types';
import { cn } from '@/lib/utils';

interface AdminPermissionMatrixProps {
  value: AdminPermissions;
  onChange: (updated: AdminPermissions) => void;
  disabled?: boolean;
}

export function AdminPermissionMatrix({
  value,
  onChange,
  disabled = false,
}: AdminPermissionMatrixProps) {
  const handlePermissionChange = (
    section: keyof AdminPermissions,
    permissionKey: string,
    isChecked: boolean
  ) => {
    const updatedPermissions = { ...value }; // Shallow copy
    updatedPermissions[section] = {
      ...(updatedPermissions[section] as any), // Shallow copy of nested object
      [permissionKey]: isChecked,
    };
    onChange(updatedPermissions);
  };

  const renderPermissionToggle = (
    section: keyof AdminPermissions,
    permissionKey: string,
    label: string
  ) => {
    const isChecked = (value[section] as any)?.[permissionKey] || false; // Use optional chaining for safety
    return (
      <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
        <label htmlFor={`${section}-${permissionKey}`} className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
          {label}
        </label>
        <input
          type="checkbox"
          id={`${section}-${permissionKey}`}
          checked={isChecked}
          onChange={(e) =>
            handlePermissionChange(section, permissionKey, e.target.checked)
          }
          disabled={disabled}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
        />
      </div>
    );
  };

  return (
    <div className={cn("space-y-6", disabled && "opacity-70 pointer-events-none")}>
      {/* User Management Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          User Management
        </h3>
        <div className="divide-y divide-gray-100 dark:divide-gray-700"> {/* Use divide-y for consistent borders */}
          {renderPermissionToggle('users', 'create_entity_admin', 'Create Entity Admin')}
          {renderPermissionToggle('users', 'create_sub_admin', 'Create Sub-Entity Admin')}
          {renderPermissionToggle('users', 'create_school_admin', 'Create School Admin')}
          {renderPermissionToggle('users', 'create_branch_admin', 'Create Branch Admin')}
          {renderPermissionToggle('users', 'create_teacher', 'Create Teacher')}
          {renderPermissionToggle('users', 'create_student', 'Create Student')}
          {renderPermissionToggle('users', 'modify_entity_admin', 'Modify Entity Admin')}
          {renderPermissionToggle('users', 'modify_sub_admin', 'Modify Sub-Entity Admin')}
          {renderPermissionToggle('users', 'modify_school_admin', 'Modify School Admin')}
          {renderPermissionToggle('users', 'modify_branch_admin', 'Modify Branch Admin')}
          {renderPermissionToggle('users', 'modify_teacher', 'Modify Teacher')}
          {renderPermissionToggle('users', 'modify_student', 'Modify Student')}
          {renderPermissionToggle('users', 'delete_users', 'Delete Users')}
          {renderPermissionToggle('users', 'view_all_users', 'View All Users')}
        </div>
      </div>

      {/* Organization Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Organization Structure
        </h3>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {renderPermissionToggle('organization', 'create_school', 'Create School')}
          {renderPermissionToggle('organization', 'modify_school', 'Modify School')}
          {renderPermissionToggle('organization', 'delete_school', 'Delete School')}
          {renderPermissionToggle('organization', 'create_branch', 'Create Branch')}
          {renderPermissionToggle('organization', 'modify_branch', 'Modify Branch')}
          {renderPermissionToggle('organization', 'delete_branch', 'Delete Branch')}
          {renderPermissionToggle('organization', 'view_all_schools', 'View All Schools')}
          {renderPermissionToggle('organization', 'view_all_branches', 'View All Branches')}
          {renderPermissionToggle('organization', 'manage_departments', 'Manage Departments')}
        </div>
      </div>

      {/* Settings Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Settings & Administration
        </h3>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {renderPermissionToggle('settings', 'manage_company_settings', 'Manage Company Settings')}
          {renderPermissionToggle('settings', 'manage_school_settings', 'Manage School Settings')}
          {renderPermissionToggle('settings', 'manage_branch_settings', 'Manage Branch Settings')}
          {renderPermissionToggle('settings', 'view_audit_logs', 'View Audit Logs')}
          {renderPermissionToggle('settings', 'export_data', 'Export Data')}
        </div>
      </div>
    </div>
  );
}