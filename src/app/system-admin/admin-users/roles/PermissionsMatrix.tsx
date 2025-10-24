import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { cn } from '../../../../lib/utils';
import { SYSTEM_ROUTES } from '../../../../lib/constants/routes';

export interface PermissionRecord {
  can_access: boolean;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface Permission extends PermissionRecord {
  id?: string;
  role_id: string;
  path: string;
}

interface PermissionsMatrixProps {
  roleId: string;
  initialPermissions?: Permission[];
  className?: string;
}

export interface PermissionsMatrixRef {
  getPermissions: () => Permission[];
}

export const PermissionsMatrix = forwardRef<PermissionsMatrixRef, PermissionsMatrixProps>(
  ({ roleId, initialPermissions = [], className }, ref) => {
    // Initialize permissions state from props
    const [permissions, setPermissions] = useState<Record<string, PermissionRecord>>({});

    // Update permissions when initialPermissions changes
    useEffect(() => {
      const permMap: Record<string, PermissionRecord> = {};
      SYSTEM_ROUTES.forEach(route => {
        const permission = initialPermissions.find(p => p.path === route.path);
        permMap[route.path] = permission ? {
          can_access: permission.can_access,
          can_view: permission.can_view,
          can_create: permission.can_create,
          can_edit: permission.can_edit,
          can_delete: permission.can_delete
        } : {
          can_access: false,
          can_view: false,
          can_create: false,
          can_edit: false,
          can_delete: false
        };
      });
      setPermissions(permMap);
    }, [initialPermissions]);

    // Expose getPermissions method to parent component
    useImperativeHandle(ref, () => ({
      getPermissions: () => {
        return SYSTEM_ROUTES.map(route => ({
          role_id: roleId,
          path: route.path,
          ...permissions[route.path]
        }));
      }
    }), [roleId, permissions]);

    // Handle individual permission toggle
    const togglePermission = (path: string, permission: keyof PermissionRecord) => {
      setPermissions(prev => ({
        ...prev,
        [path]: {
          ...prev[path],
          [permission]: !prev[path][permission]
        }
      }));
    };

    // Handle "Select All" for a column (permission type)
    const toggleColumnAll = (permission: keyof PermissionRecord) => {
      const someChecked = SYSTEM_ROUTES.some(route => permissions[route.path]?.[permission]);
      const allChecked = SYSTEM_ROUTES.every(route => permissions[route.path]?.[permission]);
      
      const newValue = !allChecked || !someChecked;
      
      setPermissions(prev => {
        const updated = { ...prev };
        SYSTEM_ROUTES.forEach(route => {
          updated[route.path] = {
            ...updated[route.path],
            [permission]: newValue
          };
        });
        return updated;
      });
    };

    // Handle "Select All" for a row (path)
    const toggleRowAll = (path: string) => {
      const currentPerms = permissions[path] || {
        can_access: false,
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false
      };
      const allChecked = Object.values(currentPerms).every(Boolean);
      const newValue = !allChecked;

      setPermissions(prev => ({
        ...prev,
        [path]: {
          can_access: newValue,
          can_view: newValue,
          can_create: newValue,
          can_edit: newValue,
          can_delete: newValue
        }
      }));
    };

    // Check if all permissions in a column are selected
    const isColumnAllSelected = (permission: keyof PermissionRecord) => {
      return SYSTEM_ROUTES.every(route => permissions[route.path]?.[permission]);
    };

    // Check if some permissions in a column are selected
    const isColumnIndeterminate = (permission: keyof PermissionRecord) => {
      const selected = SYSTEM_ROUTES.filter(route => permissions[route.path]?.[permission]);
      return selected.length > 0 && selected.length < SYSTEM_ROUTES.length;
    };

    // Check if all permissions in a row are selected
    const isRowAllSelected = (path: string) => {
      return Object.values(permissions[path] || {}).every(Boolean);
    };

    // Check if some permissions in a row are selected
    const isRowIndeterminate = (path: string) => {
      const values = Object.values(permissions[path] || {});
      const selected = values.filter(Boolean);
      return selected.length > 0 && selected.length < values.length;
    };

    return (
      <div className={cn('overflow-x-auto', className)}>
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded opacity-0 cursor-default dark:bg-gray-700"
                  disabled
                />
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Path
              </th>
              {['Access', 'View', 'Create', 'Edit', 'Delete'].map((header, index) => (
                <th
                  key={header}
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24"
                >
                  <div className="flex flex-col items-center">
                    <span className="mb-2">{header}</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                      checked={isColumnAllSelected(`can_${header.toLowerCase()}` as keyof PermissionRecord)}
                      ref={input => {
                        if (input) {
                          input.indeterminate = isColumnIndeterminate(`can_${header.toLowerCase()}` as keyof PermissionRecord);
                        }
                      }}
                      onChange={() => toggleColumnAll(`can_${header.toLowerCase()}` as keyof PermissionRecord)}
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {SYSTEM_ROUTES.map((route) => (
              <tr key={route.path} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                    checked={isRowAllSelected(route.path)}
                    ref={input => {
                      if (input) {
                        input.indeterminate = isRowIndeterminate(route.path);
                      }
                    }}
                    onChange={() => toggleRowAll(route.path)}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{route.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{route.path}</p>
                  </div>
                </td>
                {['access', 'view', 'create', 'edit', 'delete'].map(permission => (
                  <td key={permission} className="px-6 py-4 whitespace-nowrap text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                      checked={permissions[route.path]?.[`can_${permission}` as keyof PermissionRecord] || false}
                      onChange={() => togglePermission(route.path, `can_${permission}` as keyof PermissionRecord)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
);

PermissionsMatrix.displayName = 'PermissionsMatrix';