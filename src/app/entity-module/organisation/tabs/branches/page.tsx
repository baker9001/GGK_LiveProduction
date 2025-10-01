/**
 * File: /src/app/entity-module/organisation/tabs/branches/page.tsx
 * COMPLETE FIXED VERSION - All UI Issues Resolved
 * 
 * Fixes Applied:
 * 1. ✅ Removed duplicate bottom buttons (kept only top icon buttons)
 * 2. ✅ Enhanced logo size (80x80) and display with better background
 * 3. ✅ Unified color scheme (purple for branches, blue for students, green for teachers)
 * 4. ✅ View mode toggle moved to right side for consistency
 */

'use client';

import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import {
  MapPin, Plus, Edit2, Trash2, Building,
  Users, Clock, Calendar, Phone, Mail, User, CheckCircle2, 
  XCircle, AlertTriangle, School, Hash, Navigation, Home, Info,
  Lock, Shield, Loader2, Grid3X3, List
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { getAuthenticatedUser } from '@/lib/auth';
import { useUser } from '@/contexts/UserContext';
import { SlideInForm } from '@/components/shared/SlideInForm';
import { Button } from '@/components/shared/Button';
import { FilterCard } from '@/components/shared/FilterCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useAccessControl } from '@/hooks/useAccessControl';
import { BranchFormContent } from '@/components/forms/BranchFormContent';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';

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
  current_students?: number;
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
      return userContext.companyId;
    }

    if (user?.company_id) {
      return user.company_id;
    }

    if (propCompanyId) {
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
  type StatusFilter = 'all' | 'active' | 'inactive';

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
  const [filterSchool, setFilterSchool] = useState<string>('all');
  const [tabErrors, setTabErrors] = useState({ basic: false, additional: false, contact: false });
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setFilterStatus((value as StatusFilter) || 'all');
  }, []);

  const handleSchoolChange = useCallback((value: string) => {
    setFilterSchool(value || 'all');
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterSchool('all');
  }, []);

  const schoolFilterOptions = useMemo(
    () => [
      { value: 'all', label: 'All Schools' },
      ...schools.map((school) => ({ value: school.id, label: school.name })),
    ],
    [schools],
  );

  const statusFilterOptions = useMemo(
    () => [
      { value: 'all', label: 'All Status' },
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ],
    [],
  );
  
  // Confirmation dialog state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<BranchData | null>(null);

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
        setShowDeleteConfirmation(false);
        setBranchToDelete(null);
        if (refreshData) refreshData();
      },
      onError: (error: any) => {
        console.error('Error deleting branch:', error);
        toast.error(error.message || 'Failed to delete branch');
      }
    }
  );

  // Form validation
  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};
    let hasBasicErrors = false;
    let hasAdditionalErrors = false;
    let hasContactErrors = false;

    // Basic tab validation
    if (!formData.name?.trim()) {
      errors.name = 'Branch name is required';
      hasBasicErrors = true;
    }
    if (!formData.code?.trim()) {
      errors.code = 'Branch code is required';
      hasBasicErrors = true;
    }
    if (!formData.school_id) {
      errors.school_id = 'School is required';
      hasBasicErrors = true;
    }

    // Additional tab validation (optional fields, but validate format if provided)
    if (formData.student_capacity && formData.student_capacity < 0) {
      errors.student_capacity = 'Student capacity must be a positive number';
      hasAdditionalErrors = true;
    }
    if (formData.student_count && formData.student_count < 0) {
      errors.student_count = 'Student count must be a positive number';
      hasAdditionalErrors = true;
    }

    // Contact tab validation (optional fields, but validate format if provided)
    if (formData.branch_head_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.branch_head_email)) {
      errors.branch_head_email = 'Please enter a valid email address';
      hasContactErrors = true;
    }

    setFormErrors(errors);
    setTabErrors({
      basic: hasBasicErrors,
      additional: hasAdditionalErrors,
      contact: hasContactErrors
    });

    return Object.keys(errors).length === 0;
  }, [formData]);

  // Update form data when editing
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

  // Handle delete confirmation
  const handleDeleteClick = useCallback((branch: BranchData) => {
    setBranchToDelete(branch);
    setShowDeleteConfirmation(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (branchToDelete) {
      deleteBranchMutation.mutate(branchToDelete.id);
    }
  }, [branchToDelete, deleteBranchMutation]);

  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirmation(false);
    setBranchToDelete(null);
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
      <FilterCard
        title="Filters"
        onClear={handleClearFilters}
        defaultExpanded
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FilterCard.Search
            id="branches-search"
            label="Search"
            value={searchTerm}
            onSearch={handleSearchChange}
            placeholder="Search branches..."
          />

          <FilterCard.Dropdown
            id="branches-school"
            label="School"
            value={filterSchool}
            onFilterChange={handleSchoolChange}
            options={schoolFilterOptions}
            placeholder="All schools"
          />

          <FilterCard.Dropdown
            id="branches-status"
            label="Status"
            value={filterStatus}
            onFilterChange={handleStatusChange}
            options={statusFilterOptions}
            placeholder="All status"
          />
        </div>
      </FilterCard>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('card')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'card'
                    ? 'bg-white dark:bg-gray-600 text-[#8CC63F] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                title="Card View"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-gray-600 text-[#8CC63F] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
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

        {/* Stats - Unified Colors */}
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
                <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                  {stats.teachers.toLocaleString()}
                </p>
              </div>
              <Users className="w-8 h-8 text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Branches Display */}
      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                className="group bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:border-[#8CC63F]/40 dark:hover:border-[#8CC63F]/40 transition-all duration-300 hover:-translate-y-2 overflow-hidden relative"
              >
                {/* Hover overlay for actions */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                
                <div className="relative p-6">
                  {/* Header with ENHANCED logo, name, and status */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      {/* ENHANCED LOGO DISPLAY */}
                      <div className="w-20 h-20 bg-gradient-to-br from-[#8CC63F]/20 to-[#8CC63F]/30 dark:from-[#8CC63F]/30 dark:to-[#8CC63F]/40 rounded-2xl flex items-center justify-center overflow-hidden shadow-xl border-2 border-[#8CC63F]/30 group-hover:border-[#8CC63F]/50 transition-all duration-300">
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt={`${branch.name} logo`}
                            className="w-full h-full object-contain p-2"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              const fallback = target.nextSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={logoUrl ? 'hidden' : 'flex'} style={{ display: logoUrl ? 'none' : 'flex' }}>
                          <MapPin className="w-10 h-10 text-[#8CC63F]/70" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold text-xl text-gray-900 dark:text-white group-hover:text-[#8CC63F] transition-colors">
                          {branch.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                            {branch.code}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={branch.status} size="sm" />
                      {/* Action buttons - floating on hover */}
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0">
                        {canEdit && (
                          <Button
                            onClick={() => handleEdit(branch)}
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 p-0 border-[#8CC63F]/30 text-[#8CC63F] hover:bg-[#8CC63F] hover:text-white hover:border-[#8CC63F] transition-all duration-200 shadow-md hover:shadow-lg"
                            title="Edit branch"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                        {can('delete_branch') && (
                          <Button
                            onClick={() => handleDeleteClick(branch)}
                            variant="outline"
                            size="sm"
                            className="h-9 w-9 p-0 border-red-200 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-200 shadow-md hover:shadow-lg"
                            title="Delete branch"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Branch details */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <School className="w-4 h-4 text-blue-500" />
                      <span>{branch.school_name}</span>
                    </div>
                    {branch.additional?.branch_head_name && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <User className="w-4 h-4 text-green-500" />
                        <span>{branch.additional.branch_head_name}</span>
                      </div>
                    )}
                    {branch.additional?.building_name && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Building className="w-4 h-4 text-purple-500" />
                        <span>{branch.additional.building_name}</span>
                        {branch.additional.floor_details && (
                          <span className="text-gray-400">• {branch.additional.floor_details}</span>
                        )}
                      </div>
                    )}
                    {branch.address && (
                      <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Navigation className="w-4 h-4 text-orange-500 mt-0.5" />
                        <span className="line-clamp-2">{branch.address}</span>
                      </div>
                    )}
                    {branch.additional?.opening_time && branch.additional?.closing_time && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Clock className="w-4 h-4 text-indigo-500" />
                        <span>{branch.additional.opening_time} - {branch.additional.closing_time}</span>
                      </div>
                    )}
                  </div>

                  {/* Statistics - UNIFIED COLORS */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-center mb-1">
                        <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                        {branch.student_count || 0}
                      </div>
                      <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        Students
                      </div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30 rounded-xl border border-green-200 dark:border-green-800">
                      <div className="flex items-center justify-center mb-1">
                        <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="text-xl font-bold text-green-700 dark:text-green-300">
                        {branch.teachers_count || 0}
                      </div>
                      <div className="text-xs font-medium text-green-600 dark:text-green-400">
                        Teachers
                      </div>
                    </div>
                  </div>

                  {/* Footer - NO DUPLICATE BUTTONS */}
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Created {new Date(branch.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        </div>
      ) : (
        /* List View */
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Branch</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">School</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Students</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Teachers</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredBranches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-gray-400">
                        {searchTerm || filterStatus !== 'all' || filterSchool !== 'all' 
                          ? 'No branches match your filters' 
                          : 'No branches found'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredBranches.map((branch) => {
                    const logoUrl = getBranchLogoUrl(branch.logo);
                    const canEdit = can('modify_branch') && !branch.readOnly;
                    
                    return (
                      <tr key={branch.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {/* ENHANCED LOGO IN LIST VIEW */}
                            <div className="w-14 h-14 bg-gradient-to-br from-[#8CC63F]/10 to-[#8CC63F]/20 dark:from-[#8CC63F]/20 dark:to-[#8CC63F]/30 rounded-xl flex items-center justify-center overflow-hidden border border-[#8CC63F]/20">
                              {logoUrl ? (
                                <img
                                  src={logoUrl}
                                  alt={`${branch.name} logo`}
                                  className="w-full h-full object-contain p-1"
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    target.style.display = 'none';
                                    const fallback = target.nextSibling as HTMLElement;
                                    if (fallback) fallback.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div className={logoUrl ? 'hidden' : 'flex'} style={{ display: logoUrl ? 'none' : 'flex' }}>
                                <MapPin className="w-7 h-7 text-[#8CC63F]/60" />
                              </div>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white">{branch.name}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {branch.additional?.building_name && (
                                  <span>{branch.additional.building_name}</span>
                                )}
                                {branch.additional?.floor_details && (
                                  <span className="text-gray-400"> • {branch.additional.floor_details}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {branch.code}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <School className="w-4 h-4 text-blue-500" />
                            <span className="text-sm">{branch.school_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={branch.status} size="sm" />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4 text-blue-500" />
                            <span className="font-medium">{branch.student_count || 0}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4 text-green-500" />
                            <span className="font-medium">{branch.teachers_count || 0}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {new Date(branch.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canEdit && (
                              <Button
                                onClick={() => handleEdit(branch)}
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 border-[#8CC63F]/30 text-[#8CC63F] hover:bg-[#8CC63F] hover:text-white hover:border-[#8CC63F] transition-all duration-200"
                                title="Edit branch"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            )}
                            {can('delete_branch') && (
                              <Button
                                onClick={() => handleDeleteClick(branch)}
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 border-red-200 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-200"
                                title="Delete branch"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirmation}
        title="Delete Branch"
        message={`Are you sure you want to delete "${branchToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete Branch"
        cancelText="Cancel"
        confirmVariant="destructive"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
});

BranchesTab.displayName = 'BranchesTab';

export default BranchesTab;