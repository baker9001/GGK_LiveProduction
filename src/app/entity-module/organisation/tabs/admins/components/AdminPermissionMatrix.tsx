/**
 * File: /src/app/entity-module/organisation/tabs/admins/components/AdminPermissionMatrix.tsx
 * 
 * ENHANCED VERSION - Visual feedback and improved functionality
 * 
 * Features:
 * ✅ Visual indicators for each permission (checkmarks/X marks)
 * ✅ Permission count and percentage display
 * ✅ Section headers with summary
 * ✅ Hover states for better UX
 * ✅ Proper state management
 * ✅ Responsive design
 */

import React, { useMemo, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, User, Shield, Settings } from 'lucide-react';
import { AdminPermissions } from '../types/admin.types';
import { cn } from '@/lib/utils';

interface AdminPermissionMatrixProps {
  value: AdminPermissions;
  onChange: (updated: AdminPermissions) => void;
  disabled?: boolean;
}

export const AdminPermissionMatrix: React.FC<AdminPermissionMatrixProps> = React.memo(({
  value,
  onChange,
  disabled = false,
}) => {
  // Calculate permission statistics
  const permissionStats = useMemo(() => {
    const stats: Record<string, { granted: number; total: number; percentage: number }> = {};
    
    Object.keys(value).forEach(section => {
      const sectionPerms = value[section as keyof AdminPermissions] as any;
      if (sectionPerms && typeof sectionPerms === 'object') {
        const permissions = Object.values(sectionPerms);
        const granted = permissions.filter(Boolean).length;
        const total = permissions.length;
        stats[section] = {
          granted,
          total,
          percentage: total > 0 ? Math.round((granted / total) * 100) : 0
        };
      }
    });
    
    // Calculate overall stats
    const overall = Object.values(stats).reduce(
      (acc, curr) => ({
        granted: acc.granted + curr.granted,
        total: acc.total + curr.total
      }),
      { granted: 0, total: 0 }
    );
    
    stats.overall = {
      ...overall,
      percentage: overall.total > 0 ? Math.round((overall.granted / overall.total) * 100) : 0
    };
    
    return stats;
  }, [value]);

  // Handle permission change
  const handlePermissionChange = useCallback((
    section: keyof AdminPermissions,
    permissionKey: string,
    isChecked: boolean
  ) => {
    const updatedPermissions = { ...value };
    
    if (!updatedPermissions[section]) {
      updatedPermissions[section] = {} as any;
    }
    
    updatedPermissions[section] = {
      ...(updatedPermissions[section] as any),
      [permissionKey]: isChecked,
    };
    
    onChange(updatedPermissions);
  }, [value, onChange]);

  // Toggle all permissions in a section
  const toggleSection = useCallback((section: keyof AdminPermissions, enable: boolean) => {
    const updatedPermissions = { ...value };
    const sectionPerms = updatedPermissions[section] as any;
    
    if (sectionPerms) {
      Object.keys(sectionPerms).forEach(key => {
        sectionPerms[key] = enable;
      });
      onChange(updatedPermissions);
    }
  }, [value, onChange]);

  // Get status color based on percentage
  const getStatusColor = (percentage: number) => {
    if (percentage === 100) return 'text-green-500';
    if (percentage >= 75) return 'text-blue-500';
    if (percentage >= 50) return 'text-yellow-500';
    if (percentage >= 25) return 'text-orange-500';
    return 'text-red-500';
  };

  // Get status icon based on percentage
  const getStatusIcon = (percentage: number) => {
    if (percentage === 100) return <CheckCircle className="h-4 w-4" />;
    if (percentage === 0) return <XCircle className="h-4 w-4" />;
    return <AlertTriangle className="h-4 w-4" />;
  };

  // Render section header
  const renderSectionHeader = (
    title: string,
    section: keyof AdminPermissions,
    icon: React.ReactNode
  ) => {
    const stats = permissionStats[section];
    if (!stats) return null;

    return (
      <div className="flex items-center justify-between mb-4 pb-2 border-b dark:border-gray-700">
        <div className="flex items-center">
          {icon}
          <h4 className="text-md font-semibold text-gray-900 dark:text-white ml-2">
            {title}
          </h4>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={cn("flex items-center gap-1", getStatusColor(stats.percentage))}>
              {getStatusIcon(stats.percentage)}
              <span className="text-sm font-medium">{stats.percentage}%</span>
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              ({stats.granted}/{stats.total})
            </span>
          </div>
          
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => toggleSection(section, true)}
              disabled={disabled}
              className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-400 rounded transition-colors disabled:opacity-50"
            >
              All
            </button>
            <button
              type="button"
              onClick={() => toggleSection(section, false)}
              disabled={disabled}
              className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 rounded transition-colors disabled:opacity-50"
            >
              None
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render permission toggle
  const renderPermissionToggle = (
    section: keyof AdminPermissions,
    permissionKey: string,
    label: string
  ) => {
    const isChecked = (value[section] as any)?.[permissionKey] || false;
    
    return (
      <div className={cn(
        "flex items-center justify-between py-3 px-3 rounded-lg transition-all",
        "hover:bg-gray-50 dark:hover:bg-gray-700/30",
        isChecked ? "bg-green-50/50 dark:bg-green-900/10" : "bg-gray-50/50 dark:bg-gray-800/50"
      )}>
        <label 
          htmlFor={`${section}-${permissionKey}`} 
          className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer flex items-center"
        >
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
          onChange={(e) => handlePermissionChange(section, permissionKey, e.target.checked)}
          disabled={disabled}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 transition-colors"
        />
      </div>
    );
  };

  return (
    <div className={cn("space-y-6", disabled && "opacity-70 pointer-events-none")}>
      {/* Overall Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Permissions</h4>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {permissionStats.overall?.granted || 0} / {permissionStats.overall?.total || 0}
            </p>
          </div>
          <div className={cn("text-3xl", getStatusColor(permissionStats.overall?.percentage || 0))}>
            {getStatusIcon(permissionStats.overall?.percentage || 0)}
          </div>
        </div>
        
        <div className="mt-3">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={cn(
                "h-2 rounded-full transition-all",
                permissionStats.overall?.percentage === 100 ? "bg-green-500" :
                permissionStats.overall?.percentage >= 75 ? "bg-blue-500" :
                permissionStats.overall?.percentage >= 50 ? "bg-yellow-500" :
                permissionStats.overall?.percentage >= 25 ? "bg-orange-500" :
                "bg-red-500"
              )}
              style={{ width: `${permissionStats.overall?.percentage || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* User Management Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {renderSectionHeader('User Management', 'users', <User className="h-5 w-5 text-blue-500" />)}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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

      {/* Organization Structure Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {renderSectionHeader('Organization Structure', 'organization', <Shield className="h-5 w-5 text-green-500" />)}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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

      {/* Settings & Administration Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {renderSectionHeader('Settings & Administration', 'settings', <Settings className="h-5 w-5 text-purple-500" />)}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {renderPermissionToggle('settings', 'manage_company_settings', 'Manage Company Settings')}
          {renderPermissionToggle('settings', 'manage_school_settings', 'Manage School Settings')}
          {renderPermissionToggle('settings', 'manage_branch_settings', 'Manage Branch Settings')}
          {renderPermissionToggle('settings', 'view_audit_logs', 'View Audit Logs')}
          {renderPermissionToggle('settings', 'export_data', 'Export Data')}
        </div>
      </div>

      {/* Warning Message */}
      {permissionStats.overall?.granted === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                No Permissions Granted
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                This administrator will have no permissions to perform any actions. 
                Consider granting at least view permissions for basic access.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});