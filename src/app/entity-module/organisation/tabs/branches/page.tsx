/**
 * File: /src/app/entity-module/organisation/tabs/branches/page.tsx
 * UNIFIED VERSION - Standardized UI/UX matching schools implementation
 * 
 * Improvements:
 * 1. Consistent green theme (#8CC63F) throughout
 * 2. Standardized field names (student_count not current_students)
 * 3. Unified spacing and layout patterns
 * 4. Consistent validation and error handling
 * 5. Same stats card design as schools
 */

'use client';

import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { 
  MapPin, Plus, Edit2, Trash2, Search, Filter, Building,
  Users, Clock, Calendar, Phone, Mail, User, CheckCircle2, 
  XCircle, AlertTriangle, School, Hash, Navigation, Home, Info,
  Lock, Shield, Loader2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { getAuthenticatedUser } from '@/lib/auth';
import { useUser } from '@/contexts/UserContext';
import { SlideInForm } from '@/components/shared/SlideInForm';
import { FormField, Input, Select, Textarea } from '@/components/shared/FormField';
import { Button } from '@/components/shared/Button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useAccessControl } from '@/hooks/useAccessControl';
import { BranchFormContent } from '@/components/forms/BranchFormContent';

// ===== TYPE DEFINITIONS =====
interface BranchData {
  id: string;
  name: string;
  code: string;
  school_id: string;
  status: 'active' | 'inactive';
  address?: string;
  notes?: string;
  logo?: string;
  created_at: string;
  additional?: BranchAdditional;
  student_count?: number;
  teachers_count?: number;
  school_name?: string;
  readOnly?: boolean;
}

interface BranchAdditional {
  id?: string;
  branch_id: string;
  student_capacity?: number;
  student_count?: number;
  teachers_count?: number;
  active_teachers_count?: number;
  branch_head_name?: string;
  branch_head_email?: string;
  branch_head_phone?: string;
  building_name?: string;
  floor_details?: string;
  opening_time?: string;
  closing_time?: string;
  working_days?: string[];
}

interface SchoolOption {
  id: string;
  name: string;
}

export interface BranchesTabProps {
  companyId: string;
  refreshData?: () => void;
}

// ===== REF INTERFACE =====
export interface BranchesTabRef {
  openEditBranchModal: (branch: BranchData) => void;
}

// ===== MAIN COMPONENT =====
const BranchesTab = React.forwardRef<BranchesTabRef, BranchesTabProps>(({ companyId: propCompanyId, refreshData }, ref) => {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const authenticatedUser = getAuthenticatedUser();
  const {
    canViewTab,
    can,
    getScopeFilters,
    getUserContext,
    isLoading: isAccessControlLoading,
    isEntityAdmin,
    isSubEntityAdmin,
    isSchoolAdmin,
    isBranchAdmin,
    hasError: hasAccessError,
    error: accessError
  } = useAccessControl();

  // Get user context early for company ID
  const userContext = getUserContext();
  
  // AUTO-SELECT USER'S COMPANY
  const companyId = useMemo(() => {
    if (userContext?.companyId) {
      console.log('Using company ID from user context:', userContext.companyId);
      return userContext.companyId;
    }
    
    if (user?.company_id) {
      console.log('Using company ID from user object:', user.company_id);
      return user.company_id;
    }
    
    if (propCompanyId) {
      console.log('Using company ID from prop:', propCompanyId);
      return propCompanyId;
    }
    
    console.error('No company ID found in user context, user object, or props');
    return null;
  }, [userContext, user, propCompanyId]);

  // State management
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<BranchData | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'basic' | 'additional' | 'contact'>('basic');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterSchool, setFilterSchool] = useState<string>('all');
  const [tabErrors, setTabErrors] = useState({ basic: false, additional: false, contact: false });

  // ACCESS CHECK: Block entry if user cannot view this tab
  useEffect(() => {
    if (!isAccessControlLoading && !canViewTab('branches')) {
      toast.error('You do not have permission to view branches');
      setTimeout(() => {
        window.location.href = '/app/entity-module/dashboard';
      }, 1000);
    }
  }, [isAccessControlLoading, canViewTab]);

  // Show access error if there's one
  useEffect(() => {
    if (hasAccessError && accessError) {
      toast.error(`Access Control Error: ${accessError}`);
    }
  }, [hasAccessError, accessError]);

  // ===== EXPOSE METHODS VIA REF =====
  React.useImperativeHandle(ref, () => ({
    openEditBranchModal: (branch: BranchData) => {
      handleEdit(branch);
    }
  }), []);

  // Helper to get branch logo URL
  const getBranchLogoUrl = useCallback((path: string | null | undefined) => {
    if (!path) return null;
    
    if (path.startsWith('http')) {
      return path;
    }
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      console.warn('VITE_SUPABASE_URL is not defined');
      return null;
    }
    
    return `${supabaseUrl}/storage/v1/object/public/branch-logos/${path}`;
  }, []);

  // SCOPED QUERIES: Apply getScopeFilters to all Supabase queries
  const scopeFilters = getScopeFilters('branches');

  // ===== FETCH SCHOOLS FOR DROPDOWN =====
  const { data: schools = [], isLoading: isLoadingSchools, error: schoolsError } = useQuery(
    ['schools-for-branches', companyId],
    async () => {
      console.log('Fetching schools for user company:', companyId);
      
      if (!companyId) {
        console.error('No company ID available for user');
        return [];
      }
      
      let query = supabase
        .from('schools')
        .select('id, name, code, company_id')
        .eq('company_id', companyId)
        .order('name');
      
      if (isSchoolAdmin && scopeFilters.school_id) {
        if (Array.isArray(scopeFilters.school_id)) {
          if (scopeFilters.school_id.length === 0) return [];
          query = query.in('id', scopeFilters.school_id);
        } else {
          query = query.eq('id', scopeFilters.school_id);
        }
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching schools:', error);
        toast.error('Failed to load schools: ' + error.message);
        throw error;
      }
      
      console.log(`Found ${data?.length || 0} schools for user's company (${companyId}):`, data);
      return data || [];
    },
    { 
      enabled: !!companyId && !isAccessControlLoading,
      staleTime: 5 * 60 * 1000,
      retry: 1
    }
  );

  // ===== FETCH BRANCHES WITH SCOPE =====
  const { data: branches = [], isLoading, error: fetchError, refetch } = useQuery(
    ['branches-tab', companyId, scopeFilters],
    async () => {
      if (isBranchAdmin && scopeFilters.branch_id) {
        let branchQuery = supabase
          .from('branches')
          .select(`
            id, name, code, school_id, status, address, notes, logo, created_at,
            additional:branches_additional (*)
          `);
        
        if (Array.isArray(scopeFilters.branch_id)) {
          if (scopeFilters.branch_id.length === 0) return [];
          branchQuery = branchQuery.in('id', scopeFilters.branch_id);
        } else {
          branchQuery = branchQuery.eq('id', scopeFilters.branch_id);
        }
        
        const { data: branchesData, error } = await branchQuery.order('name');
        if (error) throw error;
        
        const enrichedBranches = await Promise.all((branchesData || []).map(async (branch) => {
          const { data: additional } = await supabase
            .from('branches_additional')
            .select('*')
            .eq('branch_id', branch.id)
            .maybeSingle();
          
          const { data: school } = await supabase
            .from('schools')
            .select('name')
            .eq('id', branch.school_id)
            .single();
          
          let teacherCount = additional?.teachers_count || 0;
          if (!teacherCount) {
            const { count } = await supabase
              .from('teachers')
              .select('*', { count: 'exact', head: true })
              .eq('branch_id', branch.id)
              .eq('is_active', true);
            teacherCount = count || 0;
          }
          
          return {
            ...branch,
            additional,
            school_name: school?.name || 'Unknown School',
            student_count: additional?.student_count || additional?.current_students || 0,
            teachers_count: teacherCount
          };
        }));
        
        return enrichedBranches;
      }
      
      let schoolsQuery = supabase
        .from('schools')
        .select(`
          id, name, code, company_id,
          companies (id, name)
        `)
        .eq('company_id', companyId);

      if (!isEntityAdmin && !isSubEntityAdmin && scopeFilters.school_id) {
        if (Array.isArray(scopeFilters.school_id)) {
          if (scopeFilters.school_id.length === 0) return [];
          schoolsQuery = schoolsQuery.in('id', scopeFilters.school_id);
        } else {
          schoolsQuery = schoolsQuery.eq('id', scopeFilters.school_id);
        }
      }

      const { data: schoolsData, error: schoolsError } = await schoolsQuery;
      if (schoolsError) throw schoolsError;
      
      const schoolIds = schoolsData?.map(s => s.id) || [];
      if (schoolIds.length === 0) return [];
      
      const { data: branchesData, error: branchesError } = await supabase
        .from('branches')
        .select(`
          id, name, code, school_id, status, address, notes, logo, created_at,
          additional:branches_additional (*)
        `)
        .in('school_id', schoolIds)
        .order('name');
      
      if (branchesError) throw branchesError;
      
      const branchesWithAdditional = await Promise.all((branchesData || []).map(async (branch) => {
        const { data: additional } = await supabase
          .from('branches_additional')
          .select('*') 
          .eq('branch_id', branch.id)
          .maybeSingle();
        
        const school = schoolsData?.find(s => s.id === branch.school_id);
        
        let teacherCount = additional?.teachers_count || 0;
        if (!teacherCount) {
          const { count } = await supabase
            .from('teachers')
            .select('*', { count: 'exact', head: true })
            .eq('branch_id', branch.id)
            .eq('is_active', true);
          teacherCount = count || 0;
        }
        
        return {
          ...branch,
          additional,
          school_name: school?.name || 'Unknown School',
          student_count: additional?.student_count || additional?.current_students || 0,
          teachers_count: teacherCount
        };
      }));
      
      return branchesWithAdditional;
    },
    {
      enabled: !!companyId && !isAccessControlLoading,
      staleTime: 60 * 1000,
      retry: 2
    }
  );

  // Check if user can access all branches
  const canAccessAll = isEntityAdmin || isSubEntityAdmin;

  // ===== MUTATIONS =====
  const createBranchMutation = useMutation(
    async (data: any) => {
      if (isBranchAdmin) {
        toast.error('Branch administrators cannot create new branches');
        throw new Error('Insufficient permissions');
      }
      
      const branchFields = ['name', 'code', 'school_id', 'status', 'address', 'notes', 'logo'];
      
      const additionalFieldsList = [
        'student_capacity', 'student_count', 'current_students', 'teachers_count',
        'active_teachers_count', 'branch_head_name', 'branch_head_email',
        'branch_head_phone', 'building_name', 'floor_details', 'opening_time',
        'closing_time', 'working_days'
      ];
      
      const branchData: any = {};
      const additionalData: any = {};
      
      Object.keys(data).forEach(key => {
        if (branchFields.includes(key)) {
          branchData[key] = data[key];
        } else if (additionalFieldsList.includes(key)) {
          // Map student_count to both fields for compatibility
          if (key === 'student_count') {
            additionalData['student_count'] = data[key];
            additionalData['current_students'] = data[key];
          } else {
            additionalData[key] = data[key];
          }
        }
      });
      
      const { data: branch, error } = await supabase
        .from('branches')
        .insert([branchData])
        .select()
        .single();
      
      if (error) throw error;
      
      if (Object.keys(additionalData).length > 0) {
        const { error: additionalError } = await supabase
          .from('branches_additional')
          .insert([{
            branch_id: branch.id,
            ...additionalData
          }]);
        
        if (additionalError && additionalError.code !== '23505') {
          console.error('Additional data error:', additionalError);
        }
      }
      
      return branch;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['branches-tab']);
        queryClient.invalidateQueries(['organization-stats']);
        if (refreshData) refreshData();
        toast.success('Branch created successfully');
        setShowCreateModal(false);
        setFormData({});
        setFormErrors({});
        setTabErrors({ basic: false, additional: false, contact: false });
        setActiveTab('basic');
      },
      onError: (error: any) => {
        console.error('Error creating branch:', error);
        toast.error(error.message || 'Failed to create branch');
      }
    }
  );

  const updateBranchMutation = useMutation(
    async ({ id, data }: { id: string; data: any }) => {
      const branchFields = ['name', 'code', 'school_id', 'status', 'address', 'notes', 'logo'];
      
      const additionalFieldsList = [
        'student_capacity', 'student_count', 'current_students', 'teachers_count',
        'active_teachers_count', 'branch_head_name', 'branch_head_email',
        'branch_head_phone', 'building_name', 'floor_details', 'opening_time',
        'closing_time', 'working_days'
      ];
      
      const branchData: any = {};
      const additionalData: any = {};
      
      Object.keys(data).forEach(key => {
        if (branchFields.includes(key)) {
          branchData[key] = data[key];
        } else if (additionalFieldsList.includes(key)) {
          // Map student_count to both fields for compatibility
          if (key === 'student_count') {
            additionalData['student_count'] = data[key];
            additionalData['current_students'] = data[key];
          } else {
            additionalData[key] = data[key];
          }
        }
      });
      
      if (Object.keys(branchData).length > 0) {
        const { error } = await supabase
          .from('branches')
          .update(branchData)
          .eq('id', id);
        
        if (error) throw error;
      }
      
      if (Object.keys(additionalData).length > 0) {
        const { error: updateError } = await supabase
          .from('branches_additional')
          .update(additionalData)
          .eq('branch_id', id);
        
        if (updateError?.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('branches_additional')
            .insert([{
              branch_id: id,
              ...additionalData
            }]);
          
          if (insertError && insertError.code !== '23505') {
            console.error('Additional insert error:', insertError);
          }
        }
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['branches-tab']);
        queryClient.invalidateQueries(['organization-stats']);
        if (refreshData) refreshData();
        toast.success('Branch updated successfully');
        setShowEditModal(false);
        setSelectedBranch(null);
        setFormData({});
        setFormErrors({});
        setTabErrors({ basic: false, additional: false, contact: false });
        setActiveTab('basic');
      },
      onError: (error: any) => {
        console.error('Error updating branch:', error);
        toast.error(error.message || 'Failed to update branch');
      }
    }
  );

  // Delete branch mutation
  const deleteBranchMutation = useMutation(
    async (id: string) => {
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    {
      onSuccess: () => {
        toast.success('Branch deleted successfully');
        queryClient.invalidateQueries(['branches-tab']);
        if (refreshData) refreshData();
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to delete branch');
      }
    }
  );

  // ===== HELPER FUNCTIONS =====
  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};
    
    if (!formData.name) errors.name = 'Name is required';
    if (!formData.code) errors.code = 'Code is required';
    if (!formData.school_id) errors.school_id = 'School is required';
    
    if (formData.branch_head_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.branch_head_email)) {
      errors.branch_head_email = 'Invalid email address';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  // Effect to populate form data when editing
  useEffect(() => {
    if (selectedBranch && showEditModal) {
      const additionalData = selectedBranch.additional || {};
      const combinedData = {
        ...selectedBranch,
        ...additionalData
      };
      setFormData(combinedData);
    }
  }, [selectedBranch, showEditModal]);

  const handleSubmit = useCallback((mode: 'create' | 'edit') => {
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }
    
    if (mode === 'create') {
      createBranchMutation.mutate(formData);
    } else {
      updateBranchMutation.mutate({ id: selectedBranch!.id, data: formData });
    }
  }, [validateForm, formData, selectedBranch, createBranchMutation, updateBranchMutation]);

  const handleEdit = useCallback((branch: BranchData) => {
    setSelectedBranch(branch);
    setFormErrors({});
    setActiveTab('basic');
    setTabErrors({ basic: false, additional: false, contact: false });
    setShowEditModal(true);
  }, []);

  const handleCreate = useCallback(() => {
    setFormData({ status: 'active' });
    setFormErrors({});
    setActiveTab('basic');
    setTabErrors({ basic: false, additional: false, contact: false });
    setShowCreateModal(true);
  }, []);

  // Filter branches based on search, status, and school
  const filteredBranches = useMemo(() => {
    return branches.filter(branch => {
      const matchesSearch = branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           branch.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || branch.status === filterStatus;
      const matchesSchool = filterSchool === 'all' || branch.school_id === filterSchool;
      return matchesSearch && matchesStatus && matchesSchool;
    });
  }, [branches, searchTerm, filterStatus, filterSchool]);

  // Calculate stats
  const stats = useMemo(() => ({
    total: branches.length,
    active: branches.filter(b => b.status === 'active').length,
    students: branches.reduce((acc, b) => acc + (b.student_count || 0), 0),
    teachers: branches.reduce((acc, b) => acc + (b.teachers_count || 0), 0)
  }), [branches]);

  // Get admin level display text
  const adminLevelDisplay = userContext?.adminLevel?.replace('_', ' ');

  // Loading state
  if (isLoading || isAccessControlLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-600 mx-auto mb-2" />
          <p className="text-gray-600 dark:text-gray-400">Loading branches...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">Failed to load branches</p>
          <p className="text-sm text-gray-500 mt-1">{fetchError instanceof Error ? fetchError.message : 'Unknown error'}</p>
          <Button onClick={() => refetch()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Form content rendering function
  const renderFormContent = () => {
    return (
      <div className="space-y-4">
        {/* Tab Navigation with Green Theme and Error Indicators */}
        <div className="flex space-x-4 border-b dark:border-gray-700">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`pb-2 px-1 flex items-center gap-2 transition-colors ${
              activeTab === 'basic' 
                ? 'border-b-2 border-[#8CC63F] text-[#8CC63F] font-medium' 
                : 'text-gray-600 dark:text-gray-400 hover:text-[#8CC63F]'
            }`}
          >
            Basic Info
            {tabErrors.basic && !selectedBranch && (
              <span 
                className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" 
                title="Required fields missing" 
              />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('additional')}
            className={`pb-2 px-1 flex items-center gap-2 transition-colors ${
              activeTab === 'additional' 
                ? 'border-b-2 border-[#8CC63F] text-[#8CC63F] font-medium' 
                : 'text-gray-600 dark:text-gray-400 hover:text-[#8CC63F]'
            }`}
          >
            Additional
            {tabErrors.additional && !selectedBranch && (
              <span 
                className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" 
                title="Required fields missing" 
              />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('contact')}
            className={`pb-2 px-1 flex items-center gap-2 transition-colors ${
              activeTab === 'contact' 
                ? 'border-b-2 border-[#8CC63F] text-[#8CC63F] font-medium' 
                : 'text-gray-600 dark:text-gray-400 hover:text-[#8CC63F]'
            }`}
          >
            Contact
            {tabErrors.contact && !selectedBranch && (
              <span 
                className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" 
                title="Required fields missing" 
              />
            )}
          </button>
        </div>

        {/* Form Content using BranchFormContent component */}
        <div className="mt-4">
          <BranchFormContent
            formData={formData}
            setFormData={setFormData}
            formErrors={formErrors}
            setFormErrors={setFormErrors}
            activeTab={activeTab}
            schools={schools}
            isEditing={!!selectedBranch}
            isLoadingSchools={isLoadingSchools}
            schoolsError={schoolsError}
            isBranchAdmin={isBranchAdmin}
            onTabErrorsChange={setTabErrors}
          />
        </div>
      </div>
    );
  };

  // ===== MAIN RENDER =====
  return (
    <div className="space-y-4">
      {/* Header & Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search branches..."
                className="pl-10"
              />
            </div>
            <Select
              value={filterSchool}
              onChange={(value) => setFilterSchool(value)}
              className="w-48"
              options={[
                { value: 'all', label: 'All Schools' },
                ...schools.map(s => ({ value: s.id, label: s.name }))
              ]}
            />
            <Select
              value={filterStatus}
              onChange={(value) => setFilterStatus(value as 'all' | 'active' | 'inactive')}
              className="w-32"
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
            />
          </div>
          {can('create_branch') ? (
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Add Branch
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Lock className="w-4 h-4" />
              <span>Read-only access</span>
            </div>
          )}
        </div>

        {/* Permission notices */}
        {!canAccessAll && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Limited Scope Access
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  As a {adminLevelDisplay}, you're viewing branches within your assigned scope.
                  {isSchoolAdmin && ' You can manage branches in your assigned schools.'}
                  {isBranchAdmin && ' You can only manage the branches you are assigned to.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats - Unified Style */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {canAccessAll ? 'Total Branches' : 'Assigned Branches'}
                </p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {stats.total}
                </p>
              </div>
              <MapPin className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Active</p>
                <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                  {stats.active}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Students</p>
                <p className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                  {stats.students.toLocaleString()}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Teachers</p>
                <p className="text-xl font-semibold text-purple-600 dark:text-purple-400">
                  {stats.teachers.toLocaleString()}
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Branches List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBranches.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || filterStatus !== 'all' || filterSchool !== 'all' 
                ? 'No branches match your filters' 
                : 'No branches found'}
            </p>
          </div>
        ) : (
          filteredBranches.map((branch) => {
            const logoUrl = getBranchLogoUrl(branch.logo);
            const canEdit = can('modify_branch') && !branch.readOnly;
            
            return (
              <div
                key={branch.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt={`${branch.name} logo`}
                            className="w-full h-full object-contain p-0.5"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              const fallback = target.nextSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={logoUrl ? 'hidden' : 'flex'} style={{ display: logoUrl ? 'none' : 'flex' }}>
                          <MapPin className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{branch.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{branch.code}</p>
                      </div>
                    </div>
                    <StatusBadge status={branch.status} />
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <School className="w-3 h-3" />
                      <span>{branch.school_name}</span>
                    </div>
                    {branch.additional?.branch_head_name && (
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <User className="w-3 h-3" />
                        <span>{branch.additional.branch_head_name}</span>
                      </div>
                    )}
                    {branch.additional?.building_name && (
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <Building className="w-3 h-3" />
                        <span>{branch.additional.building_name}</span>
                        {branch.additional.floor_details && (
                          <span className="text-gray-400">• {branch.additional.floor_details}</span>
                        )}
                      </div>
                    )}
                    {branch.address && (
                      <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <Navigation className="w-3 h-3 mt-0.5" />
                        <span className="line-clamp-2">{branch.address}</span>
                      </div>
                    )}
                    {branch.additional?.opening_time && branch.additional?.closing_time && (
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <Clock className="w-3 h-3" />
                        <span>{branch.additional.opening_time} - {branch.additional.closing_time}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t dark:border-gray-700">
                    <div className="flex items-center space-x-4 text-xs">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {branch.student_count || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {branch.teachers_count || 0}
                        </span>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleEdit(branch)}
                          variant="outline"
                          size="sm"
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        {can('delete_branch') && (
                          <Button
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this branch?')) {
                                deleteBranchMutation.mutate(branch.id);
                              }
                            }}
                            variant="danger-outline"
                            size="sm"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Modal */}
      <SlideInForm
        title="Create Branch"
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setFormData({});
          setFormErrors({});
          setTabErrors({ basic: false, additional: false, contact: false });
          setActiveTab('basic');
        }}
        onSave={() => handleSubmit('create')}
        loading={createBranchMutation.isPending || createBranchMutation.isLoading}
      >
        {renderFormContent()}
      </SlideInForm>

      {/* Edit Modal */}
      <SlideInForm
        key={`edit-${selectedBranch?.id || 'none'}`}
        title="Edit Branch"
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedBranch(null);
          setFormData({});
          setFormErrors({});
          setTabErrors({ basic: false, additional: false, contact: false });
          setActiveTab('basic');
        }}
        onSave={() => handleSubmit('edit')}
        loading={updateBranchMutation.isPending || updateBranchMutation.isLoading}
      >
        {renderFormContent()}
      </SlideInForm>
    </div>
  );
});

BranchesTab.displayName = 'BranchesTab';

export default BranchesTab;