/**
 * File: /src/app/entity-module/organisation/page.tsx
 * Dependencies:
 *   - @/lib/supabase
 *   - @/lib/auth
 *   - @/contexts/UserContext
 *   - @/contexts/PermissionContext
 *   - @/hooks/useAccessControl
 *   - @/app/entity-module/organisation/tabs/* (all tab components)
 *   - @/app/entity-module/organisation/tabs/admins/services/permissionService
 *   - External: react, @tanstack/react-query, lucide-react, react-hot-toast
 * 
 * Preserved Features:
 *   - All 6 tabs (Structure, Schools, Branches, Admins, Teachers, Students)
 *   - Statistics cards with real-time data
 *   - Tab navigation with permission checking
 *   - Lazy loading of tab components
 *   - Company data fetching
 *   - Error handling and loading states
 * 
 * Fixed Issues:
 *   - Tab navigation visibility issue resolved
 *   - Proper permission checking for tab access
 *   - Ensured tabs render even when permissions are loading
 * 
 * Database Tables:
 *   - companies, schools, branches
 *   - entity_users, teachers, students
 *   - entity_user_schools, entity_user_branches
 * 
 * Connected Files:
 *   - All tab components in tabs folder
 *   - useAccessControl.ts hook
 *   - PermissionContext.tsx
 */

'use client';

import React, { useState, useEffect, useCallback, lazy, Suspense, useMemo, useRef } from 'react';
import { 
  Building2, School, MapPin, Plus, Users, 
  Activity, AlertCircle, Loader2, GraduationCap, Shield,
  Calendar, RefreshCw, User, Info, Lock, Crown, Home
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { usePermissions } from '@/contexts/PermissionContext';
import { permissionService } from '@/app/entity-module/organisation/tabs/admins/services/permissionService';
import { useAccessControl } from '@/hooks/useAccessControl';
import { getAuthenticatedUser } from '@/lib/auth';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/shared/Button';

// ===== LAZY LOAD TAB COMPONENTS =====
const OrganizationStructureTab = lazy(() => 
  import('./tabs/organization-structure/page')
);
const SchoolsTab = lazy(() => 
  import('./tabs/schools/page')
);
const BranchesTab = lazy(() => 
  import('./tabs/branches/page').then(module => ({ default: module.default }))
);
const AdminsTab = lazy(() => 
  import('./tabs/admins/page')
);
const StudentsTab = lazy(() => 
  import('./tabs/students/page')
);
const TeachersTab = lazy(() => 
  import('./tabs/teachers/page')
);

// ===== TYPE DEFINITIONS =====
interface Company {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive';
  logo?: string;
  created_at: string;
  updated_at?: string;
}

interface OrganizationStats {
  company_id: string;
  total_schools: number;
  total_branches: number;
  total_students: number;
  total_teachers: number;
  total_users: number;
}

// ===== REF INTERFACES FOR TAB COMPONENTS =====
export interface SchoolsTabRef {
  openEditSchoolModal: (school: any) => void;
}

export interface BranchesTabRef {
  openEditBranchModal: (branch: any) => void;
}

// ===== MAIN COMPONENT =====
export default function OrganizationManagement() {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const { permissions, adminLevel } = usePermissions();
  const authenticatedUser = getAuthenticatedUser();
  
  // Use the access control hook
  const {
    canViewTab,
    can,
    getScopeFilters,
    getUserContext,
    isLoading: isAccessControlLoading,
    isAuthenticated,
    isEntityAdmin,
    isSubEntityAdmin,
    isSchoolAdmin,
    isBranchAdmin
  } = useAccessControl();
  
  // State management
  const [activeTab, setActiveTab] = useState<'structure' | 'schools' | 'branches' | 'admins' | 'teachers' | 'students'>('structure');
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState<Company | null>(null);
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);

  // Refs for tab components
  const schoolsTabRef = useRef<SchoolsTabRef>(null);
  const branchesTabRef = useRef<BranchesTabRef>(null);

  // Get accessible tabs based on user permissions
  const accessibleTabs = useMemo(() => {
    const tabs = [];
    
    // Structure tab - only for entity_admin and sub_entity_admin
    if ((isEntityAdmin || isSubEntityAdmin)) {
      tabs.push('structure');
    }
    
    // Other tabs - available to all admin levels based on permissions
    if (permissions) {
      if (permissionService.canAccessTab('schools', permissions)) {
        tabs.push('schools');
      }
      if (permissionService.canAccessTab('branches', permissions)) {
        tabs.push('branches');
      }
      if (permissionService.canAccessTab('admins', permissions)) {
        tabs.push('admins');
      }
      if (permissionService.canAccessTab('teachers', permissions)) {
        tabs.push('teachers');
      }
      if (permissionService.canAccessTab('students', permissions)) {
        tabs.push('students');
      }
    } else {
      // Default tabs when permissions are not loaded yet
      // This ensures tabs are visible during loading
      tabs.push('schools', 'branches', 'teachers', 'students');
    }
    
    return tabs;
  }, [permissions, isEntityAdmin, isSubEntityAdmin]);

  // Set default active tab to the first accessible tab
  useEffect(() => {
    if (accessibleTabs.length > 0 && !accessibleTabs.includes(activeTab)) {
      setActiveTab(accessibleTabs[0] as any);
    }
  }, [accessibleTabs]);

  // Fetch user's company
  useEffect(() => {
    const fetchUserCompany = async () => {
      if (!authenticatedUser) return;

      try {
        // Check if user is an entity user
        const { data: entityUserData, error: entityUserError } = await supabase
          .from('entity_users')
          .select('company_id')
          .eq('user_id', authenticatedUser.id)
          .single();

        if (entityUserData?.company_id) {
          setUserCompanyId(entityUserData.company_id);
          
          // Fetch company data
          const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('*')
            .eq('id', entityUserData.company_id)
            .single();

          if (company) {
            setCompanyData(company);
          }
        }
      } catch (error) {
        console.error('Error fetching user company:', error);
      }
    };

    fetchUserCompany();
  }, [authenticatedUser]);

  // Fetch organization stats
  const { data: stats, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['organization-stats', userCompanyId],
    queryFn: async () => {
      if (!userCompanyId) return null;

      const { data, error } = await supabase
        .rpc('get_organization_stats', { p_company_id: userCompanyId });

      if (error) {
        console.error('Error fetching stats:', error);
        return {
          company_id: userCompanyId,
          total_schools: 0,
          total_branches: 0,
          total_students: 0,
          total_teachers: 0,
          total_users: 0
        };
      }

      return data?.[0] || {
        company_id: userCompanyId,
        total_schools: 0,
        total_branches: 0,
        total_students: 0,
        total_teachers: 0,
        total_users: 0
      };
    },
    enabled: !!userCompanyId,
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  // Memoized stats to prevent unnecessary re-renders
  const memoizedStats = useMemo(() => stats || {
    company_id: userCompanyId || '',
    total_schools: 0,
    total_branches: 0,
    total_students: 0,
    total_teachers: 0,
    total_users: 0
  }, [stats, userCompanyId]);

  // Prefetch tab data on hover
  const prefetchTabData = useCallback((tab: string) => {
    if (!userCompanyId) return;

    switch (tab) {
      case 'schools':
        queryClient.prefetchQuery({
          queryKey: ['schools', userCompanyId],
          queryFn: async () => {
            const { data } = await supabase
              .from('schools')
              .select('*')
              .eq('company_id', userCompanyId);
            return data;
          }
        });
        break;
      case 'branches':
        queryClient.prefetchQuery({
          queryKey: ['branches', userCompanyId],
          queryFn: async () => {
            const { data } = await supabase
              .from('branches')
              .select('*, schools!inner(company_id)')
              .eq('schools.company_id', userCompanyId);
            return data;
          }
        });
        break;
      // Add more cases as needed
    }
  }, [userCompanyId, queryClient]);

  // Handle stats refresh
  const handleRefreshStats = useCallback(async () => {
    setIsRefreshingStats(true);
    await refetchStats();
    setTimeout(() => setIsRefreshingStats(false), 500);
  }, [refetchStats]);

  // Loading state
  if (isAccessControlLoading || !userCompanyId) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // No permission state
  if (!isAuthenticated || accessibleTabs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Lock className="h-12 w-12 text-gray-400" />
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Access Denied</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            You don't have permission to access this module.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Organization Management
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your organization structure and hierarchy
          </p>
        </div>
        <button
          onClick={handleRefreshStats}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          disabled={isRefreshingStats}
        >
          <RefreshCw className={`h-5 w-5 ${isRefreshingStats ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {isLoadingStats ? (
          <>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              </div>
            ))}
          </>
        ) : (
          <>
            {/* Schools Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Schools</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {memoizedStats.total_schools}
                  </p>
                </div>
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <School className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            {/* Branches Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Branches</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {memoizedStats.total_branches}
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            {/* Teachers Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Teachers</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {memoizedStats.total_teachers}
                  </p>
                </div>
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>

            {/* Students Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Students</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {memoizedStats.total_students}
                  </p>
                </div>
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>

            {/* Total Users Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {memoizedStats.total_users}
                  </p>
                </div>
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tab Navigation and Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {accessibleTabs.includes('structure') && (
              <button
                onClick={() => setActiveTab('structure')}
                onMouseEnter={() => prefetchTabData('structure')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'structure'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Home className="w-4 h-4 inline-block mr-2" />
                Organization Structure
              </button>
            )}
            {accessibleTabs.includes('schools') && (
              <button
                onClick={() => setActiveTab('schools')}
                onMouseEnter={() => prefetchTabData('schools')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'schools'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <School className="w-4 h-4 inline-block mr-2" />
                Schools
              </button>
            )}
            {accessibleTabs.includes('branches') && (
              <button
                onClick={() => setActiveTab('branches')}
                onMouseEnter={() => prefetchTabData('branches')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'branches'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <MapPin className="w-4 h-4 inline-block mr-2" />
                Branches
              </button>
            )}
            {accessibleTabs.includes('admins') && (
              <button
                onClick={() => setActiveTab('admins')}
                onMouseEnter={() => prefetchTabData('admins')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'admins'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Shield className="w-4 h-4 inline-block mr-2" />
                Admins
              </button>
            )}
            {accessibleTabs.includes('teachers') && (
              <button
                onClick={() => setActiveTab('teachers')}
                onMouseEnter={() => prefetchTabData('teachers')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'teachers'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Users className="w-4 h-4 inline-block mr-2" />
                Teachers
              </button>
            )}
            {accessibleTabs.includes('students') && (
              <button
                onClick={() => setActiveTab('students')}
                onMouseEnter={() => prefetchTabData('students')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'students'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <GraduationCap className="w-4 h-4 inline-block mr-2" />
                Students
              </button>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            }
          >
            {/* Structure Tab */}
            {activeTab === 'structure' && accessibleTabs.includes('structure') && userCompanyId && companyData && (
              <OrganizationStructureTab
                companyData={companyData}
                companyId={userCompanyId}
                onAddClick={(parent, type) => {
                  // Handle add action
                  if (type === 'company') {
                    setActiveTab('schools');
                  } else if (type === 'school') {
                    setActiveTab('branches');
                  }
                }}
                onEditClick={(item, type) => {
                  // Handle edit action
                  if (type === 'school') {
                    setActiveTab('schools');
                    schoolsTabRef.current?.openEditSchoolModal(item);
                  } else if (type === 'branch') {
                    setActiveTab('branches');
                    branchesTabRef.current?.openEditBranchModal(item);
                  }
                }}
                onItemClick={(item, type) => {
                  // Handle item click
                  if (type === 'school') {
                    setActiveTab('schools');
                  } else if (type === 'branch') {
                    setActiveTab('branches');
                  }
                }}
                refreshData={handleRefreshStats}
              />
            )}

            {/* Schools Tab */}
            {activeTab === 'schools' && accessibleTabs.includes('schools') && userCompanyId && (
              <SchoolsTab
                ref={schoolsTabRef}
                companyId={userCompanyId}
                onSchoolUpdate={handleRefreshStats}
              />
            )}

            {/* Branches Tab */}
            {activeTab === 'branches' && accessibleTabs.includes('branches') && userCompanyId && (
              <BranchesTab
                ref={branchesTabRef}
                companyId={userCompanyId}
                onBranchUpdate={handleRefreshStats}
              />
            )}

            {/* Admins Tab */}
            {activeTab === 'admins' && accessibleTabs.includes('admins') && userCompanyId && (
              <AdminsTab
                companyId={userCompanyId}
                onAdminUpdate={handleRefreshStats}
              />
            )}

            {/* Teachers Tab */}
            {activeTab === 'teachers' && accessibleTabs.includes('teachers') && userCompanyId && (
              <TeachersTab
                companyId={userCompanyId}
                onTeacherUpdate={handleRefreshStats}
              />
            )}

            {/* Students Tab */}
            {activeTab === 'students' && accessibleTabs.includes('students') && userCompanyId && (
              <StudentsTab
                companyId={userCompanyId}
                onStudentUpdate={handleRefreshStats}
              />
            )}
          </Suspense>
        </div>
      </div>
    </div>
  );
}