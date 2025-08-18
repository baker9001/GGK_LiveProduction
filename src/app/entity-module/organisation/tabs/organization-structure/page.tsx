/**
 * File: /src/app/entity-module/organisation/page.tsx
 * 
 * Organization Management Page - Refactored with Tab Components
 * Main orchestrator that imports and uses individual tab components
 * 
 * Dependencies: 
 *   - @/lib/supabase
 *   - @/lib/auth
 *   - @/contexts/UserContext
 *   - @/components/shared/* (SlideInForm, FormField, Button)
 *   - ./tabs/* (All tab components)
 *   - External: react, @tanstack/react-query, lucide-react, react-hot-toast
 * 
 * Database Tables:
 *   - companies & companies_additional
 *   - schools & schools_additional  
 *   - branches & branches_additional
 *   - regions, countries (for reference data)
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Building2, School, MapPin, Plus, X, Save, Users, 
  Activity, AlertCircle, Loader2, GraduationCap, Shield,
  FolderOpen, Calendar, FileText, Home, BarChart3
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { getAuthenticatedUser } from '../../../lib/auth';
import { useUser } from '../../../contexts/UserContext';
import { SlideInForm } from '../../../components/shared/SlideInForm';
import { FormField, Input, Select, Textarea } from '../../../components/shared/FormField';
import { Button } from '../../../components/shared/Button';

// Import tab components
import OrganizationStructureTab from './tabs/organization-structure/page';
import SchoolsTab from './tabs/schools/page';
import BranchesTab from './tabs/branches/page';
import StudentsTab from './tabs/students/page';
import TeachersTab from './tabs/teachers/page';

// ===== TYPE DEFINITIONS =====
interface Company {
  id: string;
  name: string;
  code: string;
  description: string;
  status: 'active' | 'inactive';
  region_id?: string;
  country_id?: string;
  address?: string;
  notes?: string;
  logo?: string;
  created_at: string;
  additional?: CompanyAdditional;
  schools?: SchoolData[];
}

interface CompanyAdditional {
  id?: string;
  company_id: string;
  organization_type?: string;
  fiscal_year_start?: number;
  main_phone?: string;
  main_email?: string;
  website?: string;
  head_office_address?: string;
  head_office_city?: string;
  head_office_country?: string;
  registration_number?: string;
  tax_id?: string;
  logo_url?: string;
  ceo_name?: string;
  ceo_email?: string;
  ceo_phone?: string;
}

interface SchoolData {
  id: string;
  name: string;
  code: string;
  company_id: string;
  description: string;
  status: 'active' | 'inactive';
  address?: string;
  notes?: string;
  logo?: string;
  created_at: string;
  additional?: any;
  branches?: any[];
  student_count?: number;
}

// ===== MAIN COMPONENT =====
export default function OrganisationManagement() {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const authenticatedUser = getAuthenticatedUser();
  
  // State management
  const [activeTab, setActiveTab] = useState<'structure' | 'schools' | 'branches' | 'students' | 'teachers'>('structure');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<'company' | 'school' | 'branch' | null>(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [modalType, setModalType] = useState<'company' | 'school' | 'branch' | 'department' | null>(null);
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState<Company | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<any>({});
  const [formActiveTab, setFormActiveTab] = useState<'basic' | 'additional' | 'contact'>('basic');
  const [detailsTab, setDetailsTab] = useState<'details' | 'departments' | 'academic'>('details');
  const [lazyLoadBranches, setLazyLoadBranches] = useState(true); // Option to control lazy loading

  // ===== FETCH USER'S COMPANY =====
  useEffect(() => {
    const fetchUserCompany = async () => {
      try {
        if (!authenticatedUser) {
          console.error('No authenticated user found');
          return;
        }

        // Check if Supabase is properly configured
        if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
          console.error('Supabase configuration missing. Please check your environment variables.');
          toast.error('Configuration error. Please contact support.');
          return;
        }

        const { data: entityUser, error } = await supabase
          .from('entity_users')
          .select('company_id')
          .eq('user_id', authenticatedUser.id)
          .single();
        
        if (!error && entityUser?.company_id) {
          setUserCompanyId(entityUser.company_id);
          
          // Fetch company's region and country for default values
          const { data: company } = await supabase
            .from('companies')
            .select('region_id, country_id')
            .eq('id', entityUser.company_id)
            .single();
          
          if (company) {
            // Store default region and country for new entities
            setFormData(prev => ({
              ...prev,
              region_id: company.region_id,
              country_id: company.country_id
            }));
          }
        } else {
          if (error) {
            console.error('Error fetching entity user:', error);
            toast.error('Failed to load user company data. Please try refreshing the page.');
          } else {
            console.error('No company found for user');
            toast.error('No company associated with your account. Please contact support.');
          }
        }
      } catch (error) {
        console.error('Error fetching user company:', error);
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          toast.error('Network error. Please check your internet connection and try again.');
        } else {
          toast.error('An unexpected error occurred. Please try refreshing the page.');
        }
      }
    };
    
    if (authenticatedUser) {
      fetchUserCompany();
    }
  }, [authenticatedUser]);

  // ===== FETCH ORGANIZATION DATA =====
  const { data: organizationData, isLoading, error, refetch } = useQuery(
    ['organization', userCompanyId, lazyLoadBranches],
    async () => {
      if (!userCompanyId) return null;
      
      try {
        // Use Promise.all to fetch data in parallel instead of sequentially
        const [
          companyResponse,
          companyAdditionalResponse,
          schoolsResponse
        ] = await Promise.all([
          supabase.from('companies').select('*').eq('id', userCompanyId).single(),
          supabase.from('companies_additional').select('*').eq('company_id', userCompanyId).maybeSingle(),
          supabase.from('schools').select('*').eq('company_id', userCompanyId).order('name')
        ]);

        if (companyResponse.error) throw companyResponse.error;
        if (schoolsResponse.error) throw schoolsResponse.error;
        
        const company = companyResponse.data;
        const schools = schoolsResponse.data || [];
        
        if (schools.length === 0) {
          return {
            ...company,
            additional: companyAdditionalResponse.data,
            schools: []
          };
        }

        // Get all school IDs
        const schoolIds = schools.map(s => s.id);
        
        // Fetch schools additional data in bulk
        const schoolsAdditionalResponse = await supabase
          .from('schools_additional')
          .select('*')
          .in('school_id', schoolIds);
        
        const schoolsAdditional = schoolsAdditionalResponse.data || [];
        
        // Create lookup map for O(1) access
        const schoolsAdditionalMap = new Map(
          schoolsAdditional.map(sa => [sa.school_id, sa])
        );
        
        let schoolsWithDetails;
        
        // If lazy loading is disabled, fetch all branches upfront
        if (!lazyLoadBranches) {
          const [branchesResponse] = await Promise.all([
            supabase.from('branches').select('*').in('school_id', schoolIds).order('name')
          ]);
          
          const branches = branchesResponse.data || [];
          
          // If there are branches, fetch their additional data in bulk
          let branchesAdditional: any[] = [];
          if (branches.length > 0) {
            const branchIds = branches.map(b => b.id);
            const branchesAdditionalResponse = await supabase
              .from('branches_additional')
              .select('*')
              .in('branch_id', branchIds);
            branchesAdditional = branchesAdditionalResponse.data || [];
          }
          
          const branchesAdditionalMap = new Map(
            branchesAdditional.map(ba => [ba.branch_id, ba])
          );
          
          const branchesBySchoolMap = new Map<string, any[]>();
          branches.forEach(branch => {
            if (!branchesBySchoolMap.has(branch.school_id)) {
              branchesBySchoolMap.set(branch.school_id, []);
            }
            const branchWithAdditional = {
              ...branch,
              additional: branchesAdditionalMap.get(branch.id)
            };
            branchesBySchoolMap.get(branch.school_id)!.push(branchWithAdditional);
          });
          
          // Combine all data using the lookup maps
          schoolsWithDetails = schools.map(school => ({
            ...school,
            additional: schoolsAdditionalMap.get(school.id),
            branches: branchesBySchoolMap.get(school.id) || [],
            student_count: schoolsAdditionalMap.get(school.id)?.student_count || 0
          }));
        } else {
          // If lazy loading is enabled, just get branch counts for display
          const branchCountsResponse = await supabase
            .from('branches')
            .select('school_id', { count: 'exact' })
            .in('school_id', schoolIds);
          
          // Count branches per school
          const branchCounts = new Map<string, number>();
          if (branchCountsResponse.data) {
            for (const schoolId of schoolIds) {
              const { count } = await supabase
                .from('branches')
                .select('*', { count: 'exact', head: true })
                .eq('school_id', schoolId);
              branchCounts.set(schoolId, count || 0);
            }
          }
          
          // Combine data without branches (they'll be loaded on demand)
          schoolsWithDetails = schools.map(school => ({
            ...school,
            additional: schoolsAdditionalMap.get(school.id),
            branches: [], // Empty array, will be loaded on demand
            branch_count: branchCounts.get(school.id) || 0,
            student_count: schoolsAdditionalMap.get(school.id)?.student_count || 0
          }));
        }

        return {
          ...company,
          additional: companyAdditionalResponse.data,
          schools: schoolsWithDetails
        };
      } catch (error) {
        console.error('Error fetching organization:', error);
        throw error;
      }
    },
    {
      enabled: !!userCompanyId,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      keepPreviousData: true
    }
  );

  useEffect(() => {
    if (organizationData) {
      setCompanyData(organizationData);
    }
  }, [organizationData]);

  // ===== FETCH DEPARTMENTS =====
  const { data: departments = [] } = useQuery(
    ['departments', selectedItem?.id, selectedType],
    async () => {
      if (!selectedItem) return [];
      
      let query = supabase.from('entity_departments').select('*');
      
      if (selectedType === 'company') {
        query = query.eq('company_id', selectedItem.id).is('school_id', null).is('branch_id', null);
      } else if (selectedType === 'school') {
        query = query.eq('school_id', selectedItem.id);
      } else if (selectedType === 'branch') {
        query = query.eq('branch_id', selectedItem.id);
      }
      
      const { data, error } = await query.order('name');
      
      if (error && error.code !== 'PGRST116') throw error;
      return data || [];
    },
    {
      enabled: !!selectedItem && detailsTab === 'departments'
    }
  );

  // ===== FETCH ACADEMIC YEARS =====
  const { data: academicYears = [] } = useQuery(
    ['academicYears', selectedItem?.id],
    async () => {
      if (!selectedItem || selectedType !== 'school') return [];
      
      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .eq('school_id', selectedItem.id)
        .order('start_date', { ascending: false });
      
      if (error && error.code !== 'PGRST116') throw error;
      return data || [];
    },
    {
      enabled: selectedType === 'school' && detailsTab === 'academic'
    }
  );

  // ===== UI HELPER FUNCTIONS =====
  const handleItemClick = useCallback((item: any, type: 'company' | 'school' | 'branch') => {
    setSelectedItem(item);
    setSelectedType(type);
    setShowDetailsPanel(true);
    setDetailsTab('details');
  }, []);

  const handleAddClick = useCallback((parentItem: any, parentType: 'company' | 'school') => {
    const newFormData: any = {
      status: 'active',
      ...(parentType === 'company' ? { company_id: parentItem.id } : { school_id: parentItem.id })
    };
    
    // For new companies, inherit region and country from user's company
    if (parentType === 'company' && companyData) {
      newFormData.region_id = companyData.region_id;
      newFormData.country_id = companyData.country_id;
    }
    
    setFormData(newFormData);
    setFormErrors({});
    setModalType(parentType === 'company' ? 'school' : 'branch');
    setFormActiveTab('basic');
    // Navigate to appropriate tab and let the tab handle the modal
    if (parentType === 'company') {
      setActiveTab('schools');
    } else {
      setActiveTab('branches');
    }
  }, [companyData]);

  const handleEditClick = useCallback((item: any, type: 'company' | 'school' | 'branch') => {
    // Navigate to appropriate tab and let the tab handle the edit
    if (type === 'school') {
      setActiveTab('schools');
    } else if (type === 'branch') {
      setActiveTab('branches');
    }
    // For company, we might want to handle it in a separate section
  }, []);

  // ===== LOADING & ERROR STATES =====
  if (!authenticatedUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please login to access this page.
          </p>
        </div>
      </div>
    );
  }

  if (!userCompanyId || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {!userCompanyId ? 'Identifying your company...' : 'Loading organization structure...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Unable to Load Organization Data
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {(error as Error).message || 'An error occurred while loading your organization structure.'}
          </p>
          <Button onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // ===== MAIN RENDER =====
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-full mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Organization Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage your organization hierarchy, schools, branches, and more
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Export Report
              </Button>
              <Button variant="outline">
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Schools</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {companyData?.schools?.length || 0}
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
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Branches</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {companyData?.schools?.reduce((acc, school) => acc + (school.branches?.length || 0), 0) || 0}
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
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Schools</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {companyData?.schools?.filter(s => s.status === 'active').length || 0}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Staff</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {companyData?.schools?.reduce((acc, school) => 
                    acc + (school.additional?.teachers_count || 0), 0) || 0}
                </p>
              </div>
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Students</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {companyData?.schools?.reduce((acc, school) => 
                    acc + (school.additional?.student_count || 0), 0) || 0}
                </p>
              </div>
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('structure')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'structure'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Home className="w-4 h-4 inline-block mr-2" />
                Organization Structure
              </button>
              <button
                onClick={() => setActiveTab('schools')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'schools'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <School className="w-4 h-4 inline-block mr-2" />
                Schools
              </button>
              <button
                onClick={() => setActiveTab('branches')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'branches'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <MapPin className="w-4 h-4 inline-block mr-2" />
                Branches
              </button>
              <button
                onClick={() => setActiveTab('students')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'students'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <GraduationCap className="w-4 h-4 inline-block mr-2" />
                Students
              </button>
              <button
                onClick={() => setActiveTab('teachers')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'teachers'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Users className="w-4 h-4 inline-block mr-2" />
                Teachers
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'structure' && (
              <OrganizationStructureTab
                companyData={companyData}
                onAddClick={handleAddClick}
                onEditClick={handleEditClick}
                onItemClick={handleItemClick}
                refreshData={() => refetch()}
              />
            )}
            {activeTab === 'schools' && userCompanyId && (
              <SchoolsTab
                companyId={userCompanyId}
                refreshData={() => refetch()}
              />
            )}
            {activeTab === 'branches' && userCompanyId && (
              <BranchesTab
                companyId={userCompanyId}
                refreshData={() => refetch()}
              />
            )}
            {activeTab === 'students' && userCompanyId && (
              <StudentsTab
                companyId={userCompanyId}
                refreshData={() => refetch()}
              />
            )}
            {activeTab === 'teachers' && userCompanyId && (
              <TeachersTab
                companyId={userCompanyId}
                refreshData={() => refetch()}
              />
            )}
          </div>
        </div>

        {/* Details Panel */}
        {showDetailsPanel && selectedItem && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowDetailsPanel(false)} />
            <div className="absolute right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4 z-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {selectedType === 'company' ? 'Company' : selectedType === 'school' ? 'School' : 'Branch'} Details
                  </h2>
                  <button
                    onClick={() => setShowDetailsPanel(false)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
                <div className="flex mt-4 space-x-4 border-b dark:border-gray-700">
                  <button
                    onClick={() => setDetailsTab('details')}
                    className={`pb-2 px-1 ${detailsTab === 'details' 
                      ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                  >
                    Details
                  </button>
                  <button
                    onClick={() => setDetailsTab('departments')}
                    className={`pb-2 px-1 ${detailsTab === 'departments' 
                      ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                  >
                    Departments
                  </button>
                  {selectedType === 'school' && (
                    <button
                      onClick={() => setDetailsTab('academic')}
                      className={`pb-2 px-1 ${detailsTab === 'academic' 
                        ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                    >
                      Academic Years
                    </button>
                  )}
                </div>
              </div>
              
              <div className="p-6">
                {detailsTab === 'details' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Name</label>
                      <p className="text-gray-900 dark:text-white font-medium">{selectedItem.name}</p>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Code</label>
                      <p className="text-gray-900 dark:text-white font-mono text-sm">{selectedItem.code}</p>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedItem.status === 'active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300'
                      }`}>
                        {selectedItem.status}
                      </span>
                    </div>
                    
                    {selectedItem.description && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
                        <p className="text-gray-700 dark:text-gray-300 text-sm">{selectedItem.description}</p>
                      </div>
                    )}
                  </div>
                )}

                {detailsTab === 'departments' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Departments</h3>
                      <button className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {departments && departments.length > 0 ? (
                        departments.map((dept: any) => (
                          <div key={dept.id} className="p-3 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">{dept.name}</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {dept.code} • {dept.employee_count || 0} employees
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <FolderOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                          <p className="text-gray-500 dark:text-gray-400">No departments found</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {detailsTab === 'academic' && selectedType === 'school' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Academic Years</h3>
                      <button className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {academicYears && academicYears.length > 0 ? (
                        academicYears.map((year: any) => (
                          <div key={year.id} className="p-3 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">{year.year_name}</h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {new Date(year.start_date).toLocaleDateString()} - {new Date(year.end_date).toLocaleDateString()}
                                </p>
                              </div>
                              {year.is_current && (
                                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                                  Current
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                          <p className="text-gray-500 dark:text-gray-400">No academic years found</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}