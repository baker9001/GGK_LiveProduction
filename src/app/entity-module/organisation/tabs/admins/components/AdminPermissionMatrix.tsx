import React from 'react';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
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
  // Helper to handle permission changes with proper state updates
  const handlePermissionChange = (
    section: keyof AdminPermissions,
    permissionKey: string,
    isChecked: boolean
  ) => {
    const updatedPermissions = { ...value };
    
    // Ensure the section exists
    if (!updatedPermissions[section]) {
      updatedPermissions[section] = {} as any;
    }
    
    updatedPermissions[section] = {
      ...(updatedPermissions[section] as any),
      [permissionKey]: isChecked,
    };
    
    onChange(updatedPermissions);
  };

  // Helper to get permission count for a section
  const getPermissionCount = (section: keyof AdminPermissions) => {
    const sectionPerms = value[section] as any;
    if (!sectionPerms) return { granted: 0, total: 0 };
    
    const permissions = Object.values(sectionPerms);
    return {
      granted: permissions.filter(Boolean).length,
      total: permissions.length
    };
  };

  // Helper to render section header with count
  const renderSectionHeader = (title: string, section: keyof AdminPermissions, icon: React.ReactNode) => {
    const { granted, total } = getPermissionCount(section);
    const percentage = total > 0 ? Math.round((granted / total) * 100) : 0;
    
    return (
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          {icon}
          {title}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {granted}/{total} permissions
          </span>
          <div className={cn(
            "w-3 h-3 rounded-full",
            percentage === 100 ? "bg-green-500" :
            percentage > 50 ? "bg-yellow-500" :
            percentage > 0 ? "bg-orange-500" : "bg-red-500"
          )} />
        </div>
      </div>
    );
  };
  const renderPermissionToggle = (
    section: keyof AdminPermissions,
    permissionKey: string,
    label: string
  ) => {
    const isChecked = (value[section] as any)?.[permissionKey] || false; // Use optional chaining for safety
    return (
      <div className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
        <label htmlFor={`${section}-${permissionKey}`} className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer flex items-center">
          {isChecked ? (
            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
          ) : (
            <XCircle className="h-4 w-4 text-gray-400 mr-2" />
          )}
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
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 transition-colors"
        />
      </div>
    );
  };

  return (
    <div className={cn("space-y-6", disabled && "opacity-70 pointer-events-none")}>
      {/* Permission Overview */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Permission Configuration
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Unchecked permissions will prevent the admin from accessing related functions. 
              Ensure you grant appropriate permissions for their role.
            </p>
          </div>
        </div>
      </div>

      {/* User Management Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {renderSectionHeader('User Management', 'users', <User className="h-5 w-5 mr-2 text-blue-500" />)}
        <div className="space-y-1">
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
        {renderSectionHeader('Organization Structure', 'organization', <Shield className="h-5 w-5 mr-2 text-green-500" />)}
        <div className="space-y-1">
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
        {renderSectionHeader('Settings & Administration', 'settings', <Settings className="h-5 w-5 mr-2 text-purple-500" />)}
        <div className="space-y-1">
          {renderPermissionToggle('settings', 'manage_company_settings', 'Manage Company Settings')}
          {renderPermissionToggle('settings', 'manage_school_settings', 'Manage School Settings')}
          {renderPermissionToggle('settings', 'manage_branch_settings', 'Manage Branch Settings')}
          {renderPermissionToggle('settings', 'view_audit_logs', 'View Audit Logs')}
          {renderPermissionToggle('settings', 'export_data', 'Export Data')}
        </div>
      </div>

      {/* Permission Summary */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
          Permission Summary
        </h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          {(['users', 'organization', 'settings'] as const).map(section => {
            const { granted, total } = getPermissionCount(section);
            const percentage = total > 0 ? Math.round((granted / total) * 100) : 0;
            
            return (
              <div key={section} className="text-center">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {granted}/{total}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                  {section.replace('_', ' ')}
                </div>
                <div className={cn(
                  "text-xs font-medium mt-1",
                  percentage === 100 ? "text-green-600 dark:text-green-400" :
                  percentage > 50 ? "text-yellow-600 dark:text-yellow-400" :
                  percentage > 0 ? "text-orange-600 dark:text-orange-400" : "text-red-600 dark:text-red-400"
                )}>
                  {percentage}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}