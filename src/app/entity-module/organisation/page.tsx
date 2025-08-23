/**
 * File: /src/app/entity-module/organisation/page.tsx
 * 
 * COMPLETE FIX FOR ALL ISSUES:
 * 1. ✅ Default tab selects first accessible tab based on permissions
 * 2. ✅ Organization structure properly loads and displays schools/branches
 * 3. ✅ Using shared Tabs component for consistent UI/UX
 * 
 * Dependencies:
 *   - @/lib/supabase
 *   - @/lib/auth
 *   - @/contexts/UserContext
 *   - @/contexts/PermissionContext
 *   - @/hooks/useAccessControl
 *   - @/components/shared/Tabs (NEW: Using shared tabs component)
 *   - @/app/entity-module/organisation/tabs/* (all tab components)
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
// FIXED: Using shared Tabs component for consistency
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shared/Tabs';

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

interface SchoolData {
  id: string;
  name: string;
  code: string;
  company_id: string;
  description?: string;
  status: 'active' | 'inactive';
  logo?: string;
  created_at: string;
  additional?: any;
  branches?: any[];
  branch_count?: number;
  student_count?: number;
  teachers_count?: number;
}

interface OrganizationData {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive';
  logo?: string;
  created_at: string;
  description?: string;
  additional?: any;
  schools?: SchoolData[];
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
  const [activeTab, setActiveTab] = useState<string>('');
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState<Company | null>(null);
  const [organizationData, setOrganizationData] = useState<OrganizationData | null>(null);
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);
  const [isLoadingOrgData, setIsLoadingOrgData] = useState(true);

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
    
    console.log('Accessible tabs:', tabs);
    return tabs;
  }, [permissions, isEntityAdmin, isSubEntityAdmin, canViewTab]);

  // FIXED: Set default active tab to the first accessible tab
  useEffect(() => {
    if (accessibleTabs.length > 0 && !activeTab) {
      console.log('Setting default tab to first accessible:', accessibleTabs[0]);
      setActiveTab(accessibleTabs[0]);
    } else if (accessibleTabs.length > 0 && !accessibleTabs.includes(activeTab)) {
      // If current tab is not accessible, switch to first accessible
      console.log('Current tab not accessible, switching to:', accessibleTabs[0]);
      setActiveTab(accessibleTabs[0]);
    }
  }, [accessibleTabs, activeTab]);

  // FIXED: Fetch complete organization data including schools and branches
  const fetchOrganizationData = useCallback(async (companyId: string) => {
    try {
      setIsLoadingOrgData(true);
      console.log('Fetching organization data for company:', companyId);
      
      // Fetch company details with additional data
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (companyError) {
        console.error('Company fetch error:', companyError);
        throw companyError;
      }

      console.log('Company data fetched:', company);

      // Fetch company additional data
      const { data: companyAdditional } = await supabase
        .from('companies_additional')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      // Fetch all schools for this company with their additional data
      const { data: schools, error: schoolsError } = await supabase
        .from('schools')
        .select(`
          *,
          schools_additional (*)
        `)
        .eq('company_id', companyId)
        .order('name');

      if (schoolsError) {
        console.error('Schools fetch error:', schoolsError);
        throw schoolsError;
      }

      console.log('Schools fetched:', schools?.length || 0);

      // Fetch all branches for the schools
      const schoolIds = schools?.map(s => s.id) || [];
      let allBranches: any[] = [];
      
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
          allBranches = branchesData;
          console.log('Branches fetched:', allBranches.length);
        }
      }

      // Process schools with their branches and additional data
      const processedSchools = (schools || []).map(school => {
        const schoolBranches = allBranches.filter(b => b.school_id === school.id);
        
        // Process additional data
        const additionalData = Array.isArray(school.schools_additional) 
          ? school.schools_additional[0] 
          : school.schools_additional || {};
        
        return {
          ...school,
          additional: additionalData,
          branches: schoolBranches.map(branch => ({
            ...branch,
            additional: Array.isArray(branch.branches_additional) 
              ? branch.branches_additional[0] 
              : branch.branches_additional || {}
          })),
          branch_count: schoolBranches.length,
          student_count: additionalData.student_count || 0,
          teachers_count: additionalData.teachers_count || 0
        };
      });

      // Set company data
      const fullCompany: Company = {
        ...company,
        additional: companyAdditional || {}
      };
      setCompanyData(fullCompany);

      // Set organization data with schools for structure tab
      const orgData: OrganizationData = {
        ...fullCompany,
        schools: processedSchools
      };
      
      setOrganizationData(orgData);
      
      console.log('Organization data prepared:', {
        company: fullCompany.name,
        schoolsCount: processedSchools.length,
        branchesCount: allBranches.length,
        schools: processedSchools
      });

    } catch (error) {
      console.error('Error fetching organization data:', error);
      toast.error('Failed to load organization structure');
    } finally {
      setIsLoadingOrgData(false);
    }
  }, []);

  // Fetch user's company and organization data
  useEffect(() => {
    const fetchUserCompanyAndOrganization = async () => {
      if (!authenticatedUser) return;

      try {
        console.log('Fetching company for user:', authenticatedUser.id);
        
        // Check if user is an entity user
        const { data: entityUserData, error: entityUserError } = await supabase
          .from('entity_users')
          .select('company_id')
          .eq('user_id', authenticatedUser.id)
          .single();

        if (!entityUserError && entityUserData?.company_id) {
          console.log('User company ID:', entityUserData.company_id);
          setUserCompanyId(entityUserData.company_id);
          
          // Fetch complete organization data for structure tab
          await fetchOrganizationData(entityUserData.company_id);
        } else {
          console.error('Error fetching entity user:', entityUserError);
        }
      } catch (error) {
        console.error('Error fetching user company:', error);
        toast.error('Failed to load organization data');
      }
    };

    fetchUserCompanyAndOrganization();
  }, [authenticatedUser, fetchOrganizationData]);

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
      total_schools: organizationData?.schools?.length || 0,
      total_branches: organizationData?.schools?.reduce((sum, school) => sum + (school.branch_count || 0), 0) || 0,
      total_students: 0,
      total_teachers: 0,
      total_users: 0
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
  }, [refetchStats, userCompanyId, fetchOrganizationData]);

  // Handle tab navigation from structure diagram
  const handleItemClick = useCallback((item: any, type: 'company' | 'school' | 'branch' | 'year' | 'section') => {
    console.log('Item clicked:', type, item);
    
    // Navigate to appropriate tab based on item type
    if (type === 'branch' && accessibleTabs.includes('branches')) {
      setActiveTab('branches');
    } else if (type === 'school' && accessibleTabs.includes('schools')) {
      setActiveTab('schools');
    }
  }, [accessibleTabs]);

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

      {/* Tab Navigation and Content - USING SHARED TABS COMPONENT */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          defaultValue={accessibleTabs[0] || 'schools'}
          className="w-full"
        >
          <div className="border-b border-gray-200 dark:border-gray-700 p-4">
            <TabsList className="w-full justify-start">
              {accessibleTabs.includes('structure') && (
                <TabsTrigger value="structure">
                  <Building2 className="w-4 h-4 mr-2" />
                  Structure
                </TabsTrigger>
              )}
              {accessibleTabs.includes('schools') && (
                <TabsTrigger value="schools">
                  <School className="w-4 h-4 mr-2" />
                  Schools
                </TabsTrigger>
              )}
              {accessibleTabs.includes('branches') && (
                <TabsTrigger value="branches">
                  <MapPin className="w-4 h-4 mr-2" />
                  Branches
                </TabsTrigger>
              )}
              {accessibleTabs.includes('admins') && (
                <TabsTrigger value="admins">
                  <Shield className="w-4 h-4 mr-2" />
                  Admins
                </TabsTrigger>
              )}
              {accessibleTabs.includes('teachers') && (
                <TabsTrigger value="teachers">
                  <Users className="w-4 h-4 mr-2" />
                  Teachers
                </TabsTrigger>
              )}
              {accessibleTabs.includes('students') && (
                <TabsTrigger value="students">
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Students
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <div className="p-6">
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              }
            >
              {/* Structure Tab - FIXED: Pass complete organization data with schools */}
              <TabsContent value="structure">
                {accessibleTabs.includes('structure') && userCompanyId && organizationData && !isLoadingOrgData ? (
                  <OrganizationStructureTab
                    companyData={organizationData} // Pass complete data with schools
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
                    onItemClick={handleItemClick}
                    refreshData={handleRefreshStats}
                  />
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <span className="ml-2 text-gray-600 dark:text-gray-400">Loading organization structure...</span>
                  </div>
                )}
              </TabsContent>

              {/* Schools Tab */}
              <TabsContent value="schools">
                {accessibleTabs.includes('schools') && userCompanyId && (
                  <SchoolsTab
                    ref={schoolsTabRef}
                    companyId={userCompanyId}
                    refreshData={handleRefreshStats}
                  />
                )}
              </TabsContent>

              {/* Branches Tab */}
              <TabsContent value="branches">
                {accessibleTabs.includes('branches') && userCompanyId && (
                  <BranchesTab
                    ref={branchesTabRef}
                    companyId={userCompanyId}
                    refreshData={handleRefreshStats}
                  />
                )}
              </TabsContent>

              {/* Admins Tab */}
              <TabsContent value="admins">
                {accessibleTabs.includes('admins') && userCompanyId && (
                  <AdminsTab
                    companyId={userCompanyId}
                  />
                )}
              </TabsContent>

              {/* Teachers Tab */}
              <TabsContent value="teachers">
                {accessibleTabs.includes('teachers') && userCompanyId && (
                  <TeachersTab
                    companyId={userCompanyId}
                    refreshData={handleRefreshStats}
                  />
                )}
              </TabsContent>

              {/* Students Tab */}
              <TabsContent value="students">
                {accessibleTabs.includes('students') && userCompanyId && (
                  <StudentsTab
                    companyId={userCompanyId}
                    refreshData={handleRefreshStats}
                  />
                )}
              </TabsContent>
            </Suspense>
          </div>
        </Tabs>
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