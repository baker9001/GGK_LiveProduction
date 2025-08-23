/**
 * File: /src/app/entity-module/organisation/page.tsx
 * 
 * FIXED ISSUES:
 * 1. Default tab now selects first accessible tab based on permissions
 * 2. Fixed company data fetching and passing to structure tab
 * 3. Added proper data fetching for organization structure
 * 
 * Dependencies:
 *   - @/lib/supabase
 *   - @/lib/auth
 *   - @/contexts/UserContext
 *   - @/contexts/PermissionContext
 *   - @/hooks/useAccessControl
 *   - @/app/entity-module/organisation/tabs/* (all tab components)
 *   - @/app/entity-module/organisation/tabs/admins/services/permissionService
 *   - External: react, @tanstack/react-query, lucide-react, react-hot-toast
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
  description?: string;
  additional?: any;
}

interface OrganizationData {
  company: Company;
  schools: any[];
  branches?: any[];
  totalSchools: number;
  totalBranches: number;
  totalStudents: number;
  totalTeachers: number;
  totalUsers: number;
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
  
  // State management - FIXED: Don't set default tab yet
  const [activeTab, setActiveTab] = useState<'structure' | 'schools' | 'branches' | 'admins' | 'teachers' | 'students' | null>(null);
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState<Company | null>(null);
  const [organizationData, setOrganizationData] = useState<OrganizationData | null>(null);
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

  // FIXED: Set default active tab to the first accessible tab
  useEffect(() => {
    if (accessibleTabs.length > 0 && activeTab === null) {
      console.log('Setting default tab to first accessible:', accessibleTabs[0]);
      setActiveTab(accessibleTabs[0] as any);
    } else if (accessibleTabs.length > 0 && !accessibleTabs.includes(activeTab as string)) {
      // If current tab is not accessible, switch to first accessible
      console.log('Current tab not accessible, switching to:', accessibleTabs[0]);
      setActiveTab(accessibleTabs[0] as any);
    }
  }, [accessibleTabs, activeTab]);

  // Fetch user's company and organization data
  useEffect(() => {
    const fetchUserCompanyAndOrganization = async () => {
      if (!authenticatedUser) return;

      try {
        // Check if user is an entity user
        const { data: entityUserData, error: entityUserError } = await supabase
          .from('entity_users')
          .select('company_id')
          .eq('user_id', authenticatedUser.id)
          .single();

        if (!entityUserError && entityUserData?.company_id) {
          setUserCompanyId(entityUserData.company_id);
          
          // Fetch complete organization data for structure tab
          await fetchOrganizationData(entityUserData.company_id);
        }
      } catch (error) {
        console.error('Error fetching user company:', error);
        toast.error('Failed to load organization data');
      }
    };

    fetchUserCompanyAndOrganization();
  }, [authenticatedUser]);

  // FIXED: Fetch complete organization data including schools and branches
  const fetchOrganizationData = async (companyId: string) => {
    try {
      // Fetch company details with additional data
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (companyError) throw companyError;

      // Fetch company additional data
      const { data: companyAdditional } = await supabase
        .from('companies_additional')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      // Fetch all schools for this company
      const { data: schools, error: schoolsError } = await supabase
        .from('schools')
        .select(`
          *,
          schools_additional (*)
        `)
        .eq('company_id', companyId)
        .order('name');

      if (schoolsError) throw schoolsError;

      // Fetch all branches for the schools
      const schoolIds = schools?.map(s => s.id) || [];
      let branches: any[] = [];
      
      if (schoolIds.length > 0) {
        const { data: branchesData, error: branchesError } = await supabase
          .from('branches')
          .select(`
            *,
            branches_additional (*)
          `)
          .in('school_id', schoolIds)
          .order('name');

        if (!branchesError && branchesData) {
          branches = branchesData;
        }
      }

      // Process schools with their branches
      const processedSchools = (schools || []).map(school => {
        const schoolBranches = branches.filter(b => b.school_id === school.id);
        return {
          ...school,
          additional: school.schools_additional?.[0] || school.schools_additional || {},
          branches: schoolBranches,
          branch_count: schoolBranches.length,
          student_count: school.schools_additional?.[0]?.student_count || 0,
          teachers_count: school.schools_additional?.[0]?.teachers_count || 0
        };
      });

      // Calculate totals
      const totalStudents = processedSchools.reduce((sum, school) => 
        sum + (school.student_count || 0), 0
      );
      const totalTeachers = processedSchools.reduce((sum, school) => 
        sum + (school.teachers_count || 0), 0
      );

      // Set company data
      const fullCompany: Company = {
        ...company,
        additional: companyAdditional || {}
      };
      setCompanyData(fullCompany);

      // Set organization data for structure tab
      const orgData: OrganizationData = {
        company: fullCompany,
        schools: processedSchools,
        branches: branches,
        totalSchools: processedSchools.length,
        totalBranches: branches.length,
        totalStudents,
        totalTeachers,
        totalUsers: 0 // Will be calculated from stats query
      };
      
      setOrganizationData(orgData);
      
      console.log('Organization data fetched:', {
        company: fullCompany.name,
        schoolsCount: processedSchools.length,
        branchesCount: branches.length
      });

    } catch (error) {
      console.error('Error fetching organization data:', error);
      toast.error('Failed to load organization structure');
    }
  };

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

      // Build queries with scope filters
      let schoolsQuery = supabase
        .from('schools')
        .select('id', { count: 'exact' })
        .eq('company_id', userCompanyId)
        .eq('status', 'active');

      let branchesQuery = supabase
        .from('branches')
        .select('id, school_id', { count: 'exact' })
        .eq('status', 'active');

      // Apply scope filters if not entity admin
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

      // Get teacher and student counts
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
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );

  // Memoized stats for performance
  const memoizedStats = useMemo(() => {
    return organizationStats || {
      total_schools: organizationData?.totalSchools || 0,
      total_branches: organizationData?.totalBranches || 0,
      total_students: organizationData?.totalStudents || 0,
      total_teachers: organizationData?.totalTeachers || 0,
      total_users: organizationData?.totalUsers || 0
    };
  }, [organizationStats, organizationData]);

  // Handle stats refresh
  const handleRefreshStats = useCallback(async () => {
    setIsRefreshingStats(true);
    await refetchStats();
    if (userCompanyId) {
      await fetchOrganizationData(userCompanyId);
    }
    setIsRefreshingStats(false);
    toast.success('Statistics refreshed');
  }, [refetchStats, userCompanyId]);

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

  // If we don't have an active tab yet, wait for it to be set
  if (!activeTab) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
          <p className="text-gray-600 dark:text-gray-400">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Organization Management
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {companyData?.name || 'Loading...'} • {getUserContext()?.adminLevel?.replace('_', ' ') || 'User'}
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
        {/* Schools Card */}
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

        {/* Branches Card */}
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

        {/* Teachers Card */}
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
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
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
                <Building2 className="w-4 h-4 inline-block mr-2" />
                Structure
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
            {/* Structure Tab - FIXED: Pass organizationData instead of just companyData */}
            {activeTab === 'structure' && accessibleTabs.includes('structure') && userCompanyId && organizationData && (
              <OrganizationStructureTab
                companyData={organizationData} // FIXED: Pass complete organization data
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
                  // Handle item click - Navigate to branches tab when clicking a branch
                  if (type === 'branch') {
                    setActiveTab('branches');
                  } else if (type === 'school') {
                    setActiveTab('schools');
                  }
                  console.log('Item clicked:', item, type);
                }}
                refreshData={() => {
                  queryClient.invalidateQueries(['organization-stats']);
                  handleRefreshStats();
                }}
              />
            )}

            {/* Schools Tab */}
            {activeTab === 'schools' && accessibleTabs.includes('schools') && userCompanyId && (
              <SchoolsTab
                ref={schoolsTabRef}
                companyId={userCompanyId}
                refreshData={() => {
                  queryClient.invalidateQueries(['organization-stats']);
                  handleRefreshStats();
                }}
              />
            )}

            {/* Branches Tab */}
            {activeTab === 'branches' && accessibleTabs.includes('branches') && userCompanyId && (
              <BranchesTab
                ref={branchesTabRef}
                companyId={userCompanyId}
                refreshData={() => {
                  queryClient.invalidateQueries(['organization-stats']);
                  handleRefreshStats();
                }}
              />
            )}

            {/* Admins Tab */}
            {activeTab === 'admins' && accessibleTabs.includes('admins') && userCompanyId && (
              <AdminsTab
                companyId={userCompanyId}
              />
            )}

            {/* Teachers Tab */}
            {activeTab === 'teachers' && accessibleTabs.includes('teachers') && userCompanyId && (
              <TeachersTab
                companyId={userCompanyId}
                refreshData={() => {
                  queryClient.invalidateQueries(['organization-stats']);
                  handleRefreshStats();
                }}
              />
            )}

            {/* Students Tab */}
            {activeTab === 'students' && accessibleTabs.includes('students') && userCompanyId && (
              <StudentsTab
                companyId={userCompanyId}
                refreshData={() => {
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