/**
 * File: /src/app/entity-module/organisation/layout.tsx
 * Dependencies:
 *   - @/hooks/useAccessControl
 *   - @/contexts/UserContext
 *   - @/contexts/PermissionContext
 *   - @/app/entity-module/organisation/tabs/admins/services/permissionService
 *   - External: react, lucide-react
 * 
 * Preserved Features:
 *   - Dynamic tab visibility based on permissions
 *   - Loading state while permissions load
 *   - Automatic redirect if no tabs accessible
 *   - Scope-aware tab rendering
 *   - User context display
 * 
 * Added/Modified:
 *   - Integrated with existing tab components
 *   - Uses actual permission service
 *   - Aligned with current routing patterns
 *   - Proper dark mode support
 *   - Tab navigation matching existing implementation
 * 
 * Database Tables:
 *   - users
 *   - entity_users
 *   - entity_user_schools
 *   - entity_user_branches
 * 
 * Connected Files:
 *   - useAccessControl.ts (permission checking)
 *   - PermissionContext.tsx (permission provider)
 *   - organization page.tsx (main organization page)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Building2, 
  School, 
  MapPin, 
  Users, 
  GraduationCap, 
  Shield,
  Loader2,
  AlertCircle,
  Lock,
  ChevronRight,
  Info
} from 'lucide-react';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useUser } from '@/contexts/UserContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { permissionService } from '@/app/entity-module/organisation/tabs/admins/services/permissionService';
import { cn } from '@/lib/utils';

// Tab configuration with access requirements
interface TabConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  adminLevelsAllowed?: string[];
  requiresPermission?: boolean;
}

// Tab configurations matching the existing system
const TAB_CONFIGURATIONS: TabConfig[] = [
  {
    id: 'structure',
    label: 'Organization Structure',
    icon: Building2,
    description: 'View organizational hierarchy and structure',
    adminLevelsAllowed: ['entity_admin', 'sub_entity_admin'],
  },
  {
    id: 'schools',
    label: 'Schools',
    icon: School,
    description: 'Manage schools within your organization',
    requiresPermission: true,
  },
  {
    id: 'branches',
    label: 'Branches',
    icon: MapPin,
    description: 'Manage school branches and locations',
    requiresPermission: true,
  },
  {
    id: 'admins',
    label: 'Administrators',
    icon: Shield,
    description: 'Manage administrative users and permissions',
    requiresPermission: true,
  },
  {
    id: 'teachers',
    label: 'Teachers',
    icon: Users,
    description: 'Manage teaching staff',
    requiresPermission: true,
  },
  {
    id: 'students',
    label: 'Students',
    icon: GraduationCap,
    description: 'Manage student enrollment and records',
    requiresPermission: true,
  },
];

interface OrganisationLayoutProps {
  children?: React.ReactNode;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  companyId?: string;
}

export default function OrganisationLayout({ 
  children, 
  activeTab, 
  onTabChange,
  companyId 
}: OrganisationLayoutProps) {
  const { user } = useUser();
  const { permissions, adminLevel } = usePermissions();
  const {
    canViewTab,
    isLoading: isAccessControlLoading,
    isAuthenticated,
    isEntityAdmin,
    isSubEntityAdmin,
    isSchoolAdmin,
    isBranchAdmin,
    getUserContext
  } = useAccessControl();

  const [accessibleTabs, setAccessibleTabs] = useState<TabConfig[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Filter accessible tabs based on user permissions
  useEffect(() => {
    if (isAccessControlLoading || !isAuthenticated) {
      return;
    }

    const userContext = getUserContext();
    if (!userContext) {
      setAccessibleTabs([]);
      setIsInitialized(true);
      return;
    }

    const accessible = TAB_CONFIGURATIONS.filter(tab => {
      // Check admin level restrictions first
      if (tab.adminLevelsAllowed) {
        if (!userContext.adminLevel || !tab.adminLevelsAllowed.includes(userContext.adminLevel)) {
          return false;
        }
      }

      // Use permission service to check tab access
      if (permissions && tab.requiresPermission) {
        return permissionService.canAccessTab(tab.id, permissions);
      }

      // For structure tab, use canViewTab
      return canViewTab(tab.id);
    });

    setAccessibleTabs(accessible);
    setIsInitialized(true);
  }, [isAccessControlLoading, isAuthenticated, canViewTab, getUserContext, permissions]);

  // Get user role description
  const getUserRoleDescription = useCallback(() => {
    const context = getUserContext();
    if (!context) return 'Unknown Role';

    const adminLevelMap: Record<string, string> = {
      'entity_admin': 'Entity Administrator',
      'sub_entity_admin': 'Sub-Entity Administrator',
      'school_admin': 'School Administrator',
      'branch_admin': 'Branch Administrator'
    };

    return adminLevelMap[context.adminLevel || ''] || 'User';
  }, [getUserContext]);

  // Get scope description
  const getScopeDescription = useCallback(() => {
    const context = getUserContext();
    if (!context) return 'No scope assigned';

    if (isEntityAdmin || isSubEntityAdmin) {
      return 'Full company access';
    }

    const scopes = [];
    if (context.schoolIds.length > 0) {
      scopes.push(`${context.schoolIds.length} school${context.schoolIds.length > 1 ? 's' : ''}`);
    }
    if (context.branchIds.length > 0) {
      scopes.push(`${context.branchIds.length} branch${context.branchIds.length > 1 ? 'es' : ''}`);
    }

    return scopes.length > 0 ? scopes.join(', ') : 'No specific scope';
  }, [getUserContext, isEntityAdmin, isSubEntityAdmin]);

  // Loading state
  if (isAccessControlLoading || !isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Loading Permissions
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Checking your access permissions and assigned scope...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Lock className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You are not authenticated or do not have access to this module.
          </p>
        </div>
      </div>
    );
  }

  // No accessible tabs
  if (accessibleTabs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Access Permissions
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You don't have permission to access any sections of the organization module. 
            Please contact your administrator to request appropriate permissions.
          </p>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-left">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Your Current Role:</h3>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                <span>User Type: {getUserContext()?.userType || 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Admin Level: {getUserContext()?.adminLevel || 'None'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span>Company: {companyId ? 'Assigned' : 'None'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Organization Management
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {getUserRoleDescription()} • {getScopeDescription()}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Optional: Add action buttons here */}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {accessibleTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={cn(
                      "py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                      isActive
                        ? "border-blue-500 text-blue-600 dark:text-blue-400"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                    )}
                  >
                    <Icon className="w-4 h-4 inline-block mr-2" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {children}
        </div>

        {/* Optional: Tab descriptions for better UX */}
        {activeTab && (
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4" />
              {TAB_CONFIGURATIONS.find(t => t.id === activeTab)?.description}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Export tab configurations for use in parent component
export { TAB_CONFIGURATIONS };

// Helper function to check if a tab should be highlighted
export function shouldHighlightTab(tabId: string, userHasNewData: boolean): boolean {
  // Add logic here to determine if a tab should show a notification badge
  // For example, if there are new admins to review or pending teacher approvals
  return false;
}

// Helper to get tab stats (for badges/counts)
export function getTabStats(tabId: string, companyId?: string): { count?: number; hasNew?: boolean } {
  // This would typically fetch from the database or use React Query
  // For now, return empty stats
  return {};
}