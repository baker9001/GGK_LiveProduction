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
 * Added/Modified:
 *   - Unified green color (#8CC63F) for all active tabs
 *   - Removed flashing dots animation
 *   - Consistent hover and active states
 * 
 * Database Tables:
 *   - companies, schools, branches, entity_users, teachers, students
 * 
 * Connected Files:
 *   - All tab components in ./tabs/*
 *   - Permission service and contexts
 */

'use client';

import React, { useState, useEffect, useCallback, lazy, Suspense, useMemo, useRef } from 'react';
import { 
  Building2, School, MapPin, Plus, Users, 
  Activity, AlertCircle, Loader2, GraduationCap, Shield,
  Calendar, RefreshCw, User, Info, Lock, Crown
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
  schools?: School[];
  additional?: any;
}

interface School {
  id: string;
  name: string;
  code: string;
  company_id: string;
  status: 'active' | 'inactive';
  created_at: string;
  branches?: Branch[];
  additional?: any;
  student_count?: number;
  teachers_count?: number;
  branch_count?: number;
}

interface Branch {
  id: string;
  name: string;
  code: string;
  school_id: string;
  status: 'active' | 'inactive';
  created_at: string;
  additional?: any;
  student_count?: number;
  teachers_count?: number;
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
  const { canView } = usePermissions();
  
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
  const [activeTab, setActiveTab] = useState<'structure' | 'schools' | 'branches' | 'admins' | 'teachers' | 'students' | null>(null);
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState<Company | null>(null);
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);

  // Refs for tab components
  const schoolsTabRef = useRef<SchoolsTabRef>(null);
  const branchesTabRef = useRef<BranchesTabRef>(null);

  // Get accessible tabs based on user permissions
  const accessibleTabs = useMemo(() => {
    if (!permissions) return [];
    
    const tabs = [];
    
    // Structure tab - only for entity_admin and sub_entity_admin
    if ((isEntityAdmin || isSubEntityAdmin) && canViewTab('structure')) {
      tabs.push('structure');
    }
    
    // Other tabs based on permissions
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
    
    return tabs;
  }, [permissions, isEntityAdmin, isSubEntityAdmin, canViewTab]);

  // Set default active tab to the first accessible tab
  useEffect(() => {
    if (accessibleTabs.length > 0 && !activeTab) {
      setActiveTab(accessibleTabs[0] as any);
    } else if (accessibleTabs.length > 0 && activeTab && !accessibleTabs.includes(activeTab)) {
      setActiveTab(accessibleTabs[0] as any);
    }
  }, [accessibleTabs, activeTab]);

  // Fetch user's company
  useEffect(() => {
    const fetchUserCompany = async () => {
      if (!authenticatedUser) return;

      try {
        const { data: entityUserData, error: entityUserError } = await supabase
          .from('entity_users')
          .select('company_id')
          .eq('user_id', authenticatedUser.id)
          .single();

        if (!entityUserError && entityUserData?.company_id) {
          setUserCompanyId(entityUserData.company_id);
        }
      } catch (error) {
        console.error('Error fetching user company:', error);
        toast.error('Failed to load organization data');
      }
    };

    fetchUserCompany();
  }, [authenticatedUser]);

  // Fetch complete organization data including schools and branches
  const { 
    data: organizationData, 
    isLoading: isLoadingOrgData,
    refetch: refetchOrgData 
  } = useQuery(
    ['organization-complete', userCompanyId],
    async () => {
      if (!userCompanyId) return null;

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', userCompanyId)
        .single();

      if (companyError) throw companyError;

      const { data: companyAdditional } = await supabase
        .from('companies_additional')
        .select('*')
        .eq('company_id', userCompanyId)
        .maybeSingle();

      const { data: schools, error: schoolsError } = await supabase
        .from('schools')
        .select('*')
        .eq('company_id', userCompanyId)
        .order('name');

      if (schoolsError) throw schoolsError;

      const schoolsWithDetails = await Promise.all(
        (schools || []).map(async (school) => {
          const { data: schoolAdditional } = await supabase
            .from('schools_additional')
            .select('*')
            .eq('school_id', school.id)
            .maybeSingle();

          const { data: branches } = await supabase
            .from('branches')
            .select('*')
            .eq('school_id', school.id)
            .order('name');

          const branchesWithDetails = await Promise.all(
            (branches || []).map(async (branch) => {
              const { data: branchAdditional } = await supabase
                .from('branches_additional')
                .select('*')
                .eq('branch_id', branch.id)
                .maybeSingle();

              return { 
                ...branch, 
                additional: branchAdditional,
                student_count: branchAdditional?.student_count || branchAdditional?.current_students || 0,
                teachers_count: branchAdditional?.teachers_count || branchAdditional?.active_teachers_count || 0
              };
            })
          );

          const activeBranches = branchesWithDetails.filter(b => b.status === 'active');

          return { 
            ...school, 
            additional: schoolAdditional, 
            branches: branchesWithDetails,
            branch_count: activeBranches.length,
            student_count: schoolAdditional?.student_count || 0,
            teachers_count: schoolAdditional?.teachers_count || 0
          };
        })
      );

      const fullData: Company = { 
        ...company, 
        additional: companyAdditional, 
        schools: schoolsWithDetails 
      };

      setCompanyData(fullData);
      return fullData;
    },
    {
      enabled: !!userCompanyId && !isAccessControlLoading,
      staleTime: 2 * 60 * 1000,
      retry: 2,
      onError: (error) => {
        console.error('Error fetching organization data:', error);
        toast.error('Failed to load organization structure');
      }
    }
  );

  // Get scope filters for data queries
  const scopeFilters = useMemo(() => {
    return getScopeFilters();
  }, [getScopeFilters]);

  // Fetch organization statistics with scope filtering
  const { 
    data: organizationStats, 
    isLoading: isLoadingStats,
    refetch: refetchStats 
  } = useQuery(
    ['organization-stats', userCompanyId, scopeFilters],
    async () => {
      if (!userCompanyId) return null;

      let schoolsQuery = supabase
        .from('schools')
        .select('id', { count: 'exact' })
        .eq('company_id', userCompanyId)
        .eq('status', 'active');

      let branchesQuery = supabase
        .from('branches')
        .select('id, school_id', { count: 'exact' })
        .eq('status', 'active');

      if (!isEntityAdmin && !isSubEntityAdmin) {
        if (scopeFilters.school_id) {
          schoolsQuery = schoolsQuery.in('id', scopeFilters.school_id);
          branchesQuery = branchesQuery.in('school_id', scopeFilters.school_id);
        }
        if (scopeFilters.branch_id) {
          branchesQuery = branchesQuery.in('id', scopeFilters.branch_id);
        }
      }

      const [schoolsResult, branchesResult] = await Promise.all([
        schoolsQuery,
        branchesQuery
      ]);

      const { count: teacherCount } = await supabase
        .from('teachers')
        .select('id', { count: 'exact' })
        .eq('company_id', userCompanyId)
        .eq('is_active', true);

      const { count: studentCount } = await supabase
        .from('students')
        .select('id', { count: 'exact' })
        .eq('company_id', userCompanyId)
        .eq('is_active', true);

      const { count: userCount } = await supabase
        .from('entity_users')
        .select('id', { count: 'exact' })
        .eq('company_id', userCompanyId)
        .eq('is_active', true);

      return {
        company_id: userCompanyId,
        total_schools: schoolsResult.count || 0,
        total_branches: branchesResult.count || 0,
        total_students: studentCount || 0,
        total_teachers: teacherCount || 0,
        total_users: userCount || 0
      } as OrganizationStats;
    },
    {
      enabled: !!userCompanyId && !isAccessControlLoading && isAuthenticated,
      staleTime: 2 * 60 * 1000,
    }
  );

  // Memoized stats for performance
  const memoizedStats = useMemo(() => {
    if (organizationStats) return organizationStats;
    
    if (organizationData?.schools) {
      return {
        company_id: userCompanyId || '',
        total_schools: organizationData.schools.length,
        total_branches: organizationData.schools.reduce((acc, s) => acc + (s.branch_count || 0), 0),
        total_students: organizationData.schools.reduce((acc, s) => acc + (s.student_count || 0), 0),
        total_teachers: organizationData.schools.reduce((acc, s) => acc + (s.teachers_count || 0), 0),
        total_users: 0
      };
    }
    
    return {
      total_schools: 0,
      total_branches: 0,
      total_students: 0,
      total_teachers: 0,
      total_users: 0
    };
  }, [organizationStats, organizationData, userCompanyId]);

  // Handle stats refresh
  const handleRefreshStats = useCallback(async () => {
    setIsRefreshingStats(true);
    await Promise.all([
      refetchStats(),
      refetchOrgData()
    ]);
    setIsRefreshingStats(false);
    toast.success('Statistics refreshed');
  }, [refetchStats, refetchOrgData]);

  // Prefetch tab data for better UX
  const prefetchTabData = useCallback((tab: string) => {
    // Implement prefetching logic if needed
  }, []);

  // Loading state
  if (isAccessControlLoading || !userCompanyId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Loading Organization
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Checking permissions and loading data...
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
            Please contact your administrator.
          </p>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-left">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Your Role:</h3>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <div>Admin Level: {adminLevel || 'None'}</div>
              <div>Company: {companyData?.name || 'Not assigned'}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Define unified green color for active tabs
  const activeColor = '#8CC63F';
  const activeColorDark = '#7AB635';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Organization Management
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {companyData?.name || organizationData?.name || 'Loading...'} • {getUserContext()?.adminLevel?.replace('_', ' ') || 'User'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(isEntityAdmin || isSubEntityAdmin) && (
            <div className="flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Crown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                Full Access
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Schools</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {memoizedStats.total_schools}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <School className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Branches</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {memoizedStats.total_branches}
              </p>
            </div>
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <MapPin className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Teachers</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {memoizedStats.total_teachers}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

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
      </div>

      {/* Enhanced Tab Navigation with Unified Green Color */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-2 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-t-xl">
          <nav className="flex gap-1.5" aria-label="Tabs">
            {accessibleTabs.includes('structure') && (
              <button
                onClick={() => setActiveTab('structure')}
                onMouseEnter={() => prefetchTabData('structure')}
                className={`
                  group relative flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm 
                  transition-all duration-300 transform
                  ${activeTab === 'structure' 
                    ? 'bg-white dark:bg-gray-700 shadow-md scale-105 z-10' 
                    : 'hover:bg-white/60 dark:hover:bg-gray-700/60 hover:shadow-sm'
                  }
                `}
                style={activeTab === 'structure' ? {
                  background: `linear-gradient(to right, ${activeColor}, ${activeColorDark})`,
                } : {}}
              >
                {activeTab === 'structure' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" 
                    style={{ backgroundColor: activeColor }} />
                )}
                <Building2 className={`w-4 h-4 transition-colors ${
                  activeTab === 'structure' 
                    ? 'text-white'
                    : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                }`} />
                <span className={`transition-colors ${
                  activeTab === 'structure' 
                    ? 'text-white font-semibold' 
                    : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white'
                }`}>
                  Structure
                </span>
              </button>
            )}

            {accessibleTabs.includes('schools') && (
              <button
                onClick={() => setActiveTab('schools')}
                onMouseEnter={() => prefetchTabData('schools')}
                className={`
                  group relative flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm 
                  transition-all duration-300 transform
                  ${activeTab === 'schools' 
                    ? 'bg-white dark:bg-gray-700 shadow-md scale-105 z-10' 
                    : 'hover:bg-white/60 dark:hover:bg-gray-700/60 hover:shadow-sm'
                  }
                `}
                style={activeTab === 'schools' ? {
                  background: `linear-gradient(to right, ${activeColor}, ${activeColorDark})`,
                } : {}}
              >
                {activeTab === 'schools' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" 
                    style={{ backgroundColor: activeColor }} />
                )}
                <School className={`w-4 h-4 transition-colors ${
                  activeTab === 'schools' 
                    ? 'text-white'
                    : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                }`} />
                <span className={`transition-colors ${
                  activeTab === 'schools' 
                    ? 'text-white font-semibold' 
                    : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white'
                }`}>
                  Schools
                </span>
              </button>
            )}

            {accessibleTabs.includes('branches') && (
              <button
                onClick={() => setActiveTab('branches')}
                onMouseEnter={() => prefetchTabData('branches')}
                className={`
                  group relative flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm 
                  transition-all duration-300 transform
                  ${activeTab === 'branches' 
                    ? 'bg-white dark:bg-gray-700 shadow-md scale-105 z-10' 
                    : 'hover:bg-white/60 dark:hover:bg-gray-700/60 hover:shadow-sm'
                  }
                `}
                style={activeTab === 'branches' ? {
                  background: `linear-gradient(to right, ${activeColor}, ${activeColorDark})`,
                } : {}}
              >
                {activeTab === 'branches' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" 
                    style={{ backgroundColor: activeColor }} />
                )}
                <MapPin className={`w-4 h-4 transition-colors ${
                  activeTab === 'branches' 
                    ? 'text-white'
                    : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                }`} />
                <span className={`transition-colors ${
                  activeTab === 'branches' 
                    ? 'text-white font-semibold' 
                    : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white'
                }`}>
                  Branches
                </span>
              </button>
            )}

            {accessibleTabs.includes('admins') && (
              <button
                onClick={() => setActiveTab('admins')}
                onMouseEnter={() => prefetchTabData('admins')}
                className={`
                  group relative flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm 
                  transition-all duration-300 transform
                  ${activeTab === 'admins' 
                    ? 'bg-white dark:bg-gray-700 shadow-md scale-105 z-10' 
                    : 'hover:bg-white/60 dark:hover:bg-gray-700/60 hover:shadow-sm'
                  }
                `}
                style={activeTab === 'admins' ? {
                  background: `linear-gradient(to right, ${activeColor}, ${activeColorDark})`,
                } : {}}
              >
                {activeTab === 'admins' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" 
                    style={{ backgroundColor: activeColor }} />
                )}
                <Shield className={`w-4 h-4 transition-colors ${
                  activeTab === 'admins' 
                    ? 'text-white'
                    : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                }`} />
                <span className={`transition-colors ${
                  activeTab === 'admins' 
                    ? 'text-white font-semibold' 
                    : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white'
                }`}>
                  Admins
                </span>
              </button>
            )}

            {accessibleTabs.includes('teachers') && (
              <button
                onClick={() => setActiveTab('teachers')}
                onMouseEnter={() => prefetchTabData('teachers')}
                className={`
                  group relative flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm 
                  transition-all duration-300 transform
                  ${activeTab === 'teachers' 
                    ? 'bg-white dark:bg-gray-700 shadow-md scale-105 z-10' 
                    : 'hover:bg-white/60 dark:hover:bg-gray-700/60 hover:shadow-sm'
                  }
                `}
                style={activeTab === 'teachers' ? {
                  background: `linear-gradient(to right, ${activeColor}, ${activeColorDark})`,
                } : {}}
              >
                {activeTab === 'teachers' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" 
                    style={{ backgroundColor: activeColor }} />
                )}
                <Users className={`w-4 h-4 transition-colors ${
                  activeTab === 'teachers' 
                    ? 'text-white'
                    : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                }`} />
                <span className={`transition-colors ${
                  activeTab === 'teachers' 
                    ? 'text-white font-semibold' 
                    : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white'
                }`}>
                  Teachers
                </span>
              </button>
            )}

            {accessibleTabs.includes('students') && (
              <button
                onClick={() => setActiveTab('students')}
                onMouseEnter={() => prefetchTabData('students')}
                className={`
                  group relative flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm 
                  transition-all duration-300 transform
                  ${activeTab === 'students' 
                    ? 'bg-white dark:bg-gray-700 shadow-md scale-105 z-10' 
                    : 'hover:bg-white/60 dark:hover:bg-gray-700/60 hover:shadow-sm'
                  }
                `}
                style={activeTab === 'students' ? {
                  background: `linear-gradient(to right, ${activeColor}, ${activeColorDark})`,
                } : {}}
              >
                {activeTab === 'students' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" 
                    style={{ backgroundColor: activeColor }} />
                )}
                <GraduationCap className={`w-4 h-4 transition-colors ${
                  activeTab === 'students' 
                    ? 'text-white'
                    : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                }`} />
                <span className={`transition-colors ${
                  activeTab === 'students' 
                    ? 'text-white font-semibold' 
                    : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white'
                }`}>
                  Students
                </span>
              </button>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6 bg-white dark:bg-gray-800 rounded-b-xl">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            }
          >
            {activeTab === 'structure' && accessibleTabs.includes('structure') && userCompanyId && organizationData && (
              <OrganizationStructureTab
                companyData={organizationData}
                companyId={userCompanyId}
                onAddClick={(parent, type) => {
                  if (type === 'company') {
                    setActiveTab('schools');
                  } else if (type === 'school') {
                    setActiveTab('branches');
                  }
                }}
                onEditClick={(item, type) => {
                  if (type === 'school') {
                    setActiveTab('schools');
                    schoolsTabRef.current?.openEditSchoolModal(item);
                  } else if (type === 'branch') {
                    setActiveTab('branches');
                    branchesTabRef.current?.openEditBranchModal(item);
                  }
                }}
                onItemClick={(item, type) => {
                  if (type === 'school' && accessibleTabs.includes('schools')) {
                    setActiveTab('schools');
                  } else if (type === 'branch' && accessibleTabs.includes('branches')) {
                    setActiveTab('branches');
                  }
                  console.log('Item clicked:', item, type);
                }}
                refreshData={() => {
                  queryClient.invalidateQueries(['organization-complete']);
                  queryClient.invalidateQueries(['organization-stats']);
                  handleRefreshStats();
                }}
              />
            )}

            {activeTab === 'schools' && accessibleTabs.includes('schools') && userCompanyId && (
              <SchoolsTab
                ref={schoolsTabRef}
                companyId={userCompanyId}
                refreshData={() => {
                  queryClient.invalidateQueries(['organization-complete']);
                  queryClient.invalidateQueries(['organization-stats']);
                  handleRefreshStats();
                }}
              />
            )}

            {activeTab === 'branches' && accessibleTabs.includes('branches') && userCompanyId && (
              <BranchesTab
                ref={branchesTabRef}
                companyId={userCompanyId}
                refreshData={() => {
                  queryClient.invalidateQueries(['organization-complete']);
                  queryClient.invalidateQueries(['organization-stats']);
                  handleRefreshStats();
                }}
              />
            )}

            {activeTab === 'admins' && accessibleTabs.includes('admins') && userCompanyId && (
              <AdminsTab
                companyId={userCompanyId}
              />
            )}

            {activeTab === 'teachers' && accessibleTabs.includes('teachers') && userCompanyId && (
              <TeachersTab
                companyId={userCompanyId}
                refreshData={() => {
                  queryClient.invalidateQueries(['organization-complete']);
                  queryClient.invalidateQueries(['organization-stats']);
                  handleRefreshStats();
                }}
              />
            )}

            {activeTab === 'students' && accessibleTabs.includes('students') && userCompanyId && (
              <StudentsTab
                companyId={userCompanyId}
                refreshData={() => {
                  queryClient.invalidateQueries(['organization-complete']);
                  queryClient.invalidateQueries(['organization-stats']);
                  handleRefreshStats();
                }}
              />
            )}
          </Suspense>
        </div>
      </div>

      {/* Scope Info for Non-Entity Admins */}
      {!isEntityAdmin && !isSubEntityAdmin && (
        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Limited Scope Access
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                You are viewing data within your assigned scope only. 
                {isSchoolAdmin && ' As a School Administrator, you can manage your assigned schools and their branches.'}
                {isBranchAdmin && ' As a Branch Administrator, you can manage your assigned branches only.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}