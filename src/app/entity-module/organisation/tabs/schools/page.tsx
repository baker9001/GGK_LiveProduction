/**
 * File: /src/app/entity-module/organisation/tabs/schools/page.tsx
 * 
 * FIXED VERSION - School Admins now only see their assigned schools
 * 
 * Dependencies:
 *   - @/lib/supabase
 *   - @/lib/auth
 *   - @/contexts/UserContext
 *   - @/hooks/useAccessControl
 *   - @/components/shared/* (SlideInForm, FormField, Button, StatusBadge)
 *   - @/components/forms/SchoolFormContent
 *   - External: react, @tanstack/react-query, lucide-react, react-hot-toast
 * 
 * Fixed Issues:
 *   - School Admins now only see schools they are assigned to
 *   - Proper scope filtering based on entity_admin_scope table
 *   - Branch Admins cannot see schools tab
 * 
 * Database Tables:
 *   - schools & schools_additional
 *   - entity_admin_scope (for assigned schools)
 *   - branches (for deactivation check)
 *   - companies (for reference)
 */

'use client';

import React, { useState, useEffect, memo, useCallback } from 'react';
import { 
  School, Plus, Edit2, Trash2, Search, Filter, GraduationCap,
  Users, MapPin, Calendar, Globe, BookOpen, FlaskConical, 
  Dumbbell, Coffee, Phone, Mail, User, CheckCircle2, XCircle,
  Clock, AlertTriangle, Building2, Info, Lock, Shield
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
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { useAccessControl } from '@/hooks/useAccessControl';
import { SchoolFormContent } from '@/components/forms/SchoolFormContent';

// ===== TYPE DEFINITIONS =====
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
  additional?: SchoolAdditional;
  branches?: any[];
  student_count?: number;
  branch_count?: number;
  teachers_count?: number;
}

interface SchoolAdditional {
  id?: string;
  school_id: string;
  school_type?: string;
  curriculum_type?: string[];
  total_capacity?: number;
  teachers_count?: number;
  student_count?: number;
  active_teachers_count?: number;
  principal_name?: string;
  principal_email?: string;
  principal_phone?: string;
  campus_address?: string;
  campus_city?: string;
  campus_state?: string;
  campus_postal_code?: string;
  latitude?: number;
  longitude?: number;
  established_date?: string;
  academic_year_start?: number;
  academic_year_end?: number;
  has_library?: boolean;
  has_laboratory?: boolean;
  has_sports_facilities?: boolean;
  has_cafeteria?: boolean;
}

export interface SchoolsTabProps {
  companyId: string;
  refreshData?: () => void;
}

// ===== REF INTERFACE =====
export interface SchoolsTabRef {
  openEditSchoolModal: (school: SchoolData) => void;
}

// ===== MAIN COMPONENT =====
const SchoolsTab = React.forwardRef<SchoolsTabRef, SchoolsTabProps>(({ companyId, refreshData }, ref) => {
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

  // State management
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolData | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [activeTab, setActiveTab] = useState<'basic' | 'additional' | 'contact'>('basic');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Confirmation dialog state for branch deactivation
  const [showDeactivateConfirmation, setShowDeactivateConfirmation] = useState(false);
  const [branchesToDeactivate, setBranchesToDeactivate] = useState<any[]>([]);

  // ACCESS CHECK: Block entry if user cannot view this tab
  useEffect(() => {
    if (!isAccessControlLoading && !canViewTab('schools')) {
      toast.error('You do not have permission to view schools');
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
    openEditSchoolModal: (school: SchoolData) => {
      handleEdit(school);
    }
  }), []);

  // Helper to get school logo URL with better error handling
  const getSchoolLogoUrl = useCallback((path: string | null | undefined) => {
    if (!path) return null;
    
    // If it's already a full URL, return as is
    if (path.startsWith('http')) {
      return path;
    }
    
    // Construct Supabase storage URL
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      console.warn('VITE_SUPABASE_URL is not defined');
      return null;
    }
    
    return `${supabaseUrl}/storage/v1/object/public/school-logos/${path}`;
  }, []);

  // Get user context and scope filters
  const userContext = getUserContext();
  const scopeFilters = getScopeFilters('schools');

  // ===== FETCH SCHOOLS WITH PROPER SCOPE FILTERING =====
  const { data: schools = [], isLoading, error: fetchError, refetch } = useQuery(
    ['schools-tab', companyId, userContext?.schoolIds],
    async () => {
      // Debug logging
      console.log('Fetching schools with context:', {
        isSchoolAdmin,
        userContext,
        assignedSchoolIds: userContext?.schoolIds,
        scopeFilters
      });

      let schoolsQuery = supabase
        .from('schools')
        .select('id, name, code, company_id, description, status, address, notes, logo, created_at')
        .eq('company_id', companyId);

      // Apply scope filtering for School Admins
      if (isSchoolAdmin && userContext?.schoolIds && userContext.schoolIds.length > 0) {
        console.log('Applying school admin filter for schools:', userContext.schoolIds);
        // School Admin: Only show assigned schools
        schoolsQuery = schoolsQuery.in('id', userContext.schoolIds);
      } else if (isSchoolAdmin && (!userContext?.schoolIds || userContext.schoolIds.length === 0)) {
        console.log('School Admin with no assigned schools');
        // School Admin with no assigned schools - return empty
        return [];
      } else if (isBranchAdmin) {
        console.log('Branch Admin - no school access');
        // Branch Admin: No access to schools tab (shouldn't reach here due to canViewTab check)
        return [];
      }
      // Entity and Sub-Entity Admins see all schools in the company (no additional filtering needed)

      const { data: schoolsData, error: schoolsError } = await schoolsQuery.order('name');
      
      if (schoolsError) {
        console.error('Error fetching schools:', schoolsError);
        throw schoolsError;
      }

      console.log('Fetched schools:', schoolsData?.length || 0);
      
      // Fetch additional data for each school
      const schoolsWithAdditional = await Promise.all((schoolsData || []).map(async (school) => {
        // Fetch additional data
        const { data: additional } = await supabase
          .from('schools_additional')
          .select('*')
          .eq('school_id', school.id)
          .maybeSingle();
        
        // Count branches
        const { count: branchCount } = await supabase
          .from('branches')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', school.id)
          .eq('status', 'active');
        
        // Get teacher count if not in additional data
        let teacherCount = additional?.teachers_count || 0;
        if (!teacherCount) {
          const { count } = await supabase
            .from('teachers')
            .select('*', { count: 'exact', head: true })
            .eq('school_id', school.id)
            .eq('is_active', true);
          teacherCount = count || 0;
        }
        
        return {
          ...school,
          additional,
          branch_count: branchCount || 0,
          student_count: additional?.student_count || 0,
          teachers_count: teacherCount
        };
      }));
      
      return schoolsWithAdditional;
    },
    {
      enabled: !!companyId && !isAccessControlLoading,
      staleTime: 60 * 1000,
      retry: 2
    }
  );

  // Check if user can create/modify schools
  const canCreateSchool = can('create_school');
  const canModifySchool = can('modify_school');
  const canDeleteSchool = can('delete_school');

  // ===== FETCH BRANCHES FOR DEACTIVATION CHECK =====
  const { data: branches = [] } = useQuery(
    ['branches-for-schools', companyId],
    async () => {
      // Get schools based on user's scope
      let schoolIds: string[] = [];
      
      if (isSchoolAdmin && userContext?.schoolIds) {
        schoolIds = userContext.schoolIds;
      } else if (isEntityAdmin || isSubEntityAdmin) {
        const { data: schoolsData } = await supabase
          .from('schools')
          .select('id')
          .eq('company_id', companyId);
        schoolIds = schoolsData?.map(s => s.id) || [];
      }
      
      if (schoolIds.length === 0) return [];
      
      // Get branches for these schools
      const { data: branchesData, error: branchesError } = await supabase
        .from('branches')
        .select('id, name, school_id, status')
        .in('school_id', schoolIds);
      
      if (branchesError) throw branchesError;
      
      return branchesData || [];
    },
    {
      enabled: !!companyId,
      staleTime: 60 * 1000
    }
  );

  // ===== MUTATIONS =====
  const createSchoolMutation = useMutation(
    async ({ data }: { data: any }) => {
      // School Admins cannot create schools
      if (isSchoolAdmin) {
        throw new Error('School Administrators cannot create new schools');
      }

      // Prepare main data
      const mainData = {
        name: data.name,
        code: data.code,
        company_id: companyId,
        description: data.description,
        status: data.status,
        address: data.address,
        notes: data.notes,
        logo: data.logo
      };
      
      // Create main record
      const { data: school, error } = await supabase
        .from('schools')
        .insert([mainData])
        .select()
        .single();
      
      if (error) throw error;
      
      // Create additional record
      const additionalData: any = {
        school_id: school.id
      };
      
      // Add additional fields
      const additionalFields = [
        'school_type', 'curriculum_type', 'total_capacity', 'teachers_count',
        'student_count', 'active_teachers_count', 'principal_name', 'principal_email',
        'principal_phone', 'campus_address', 'campus_city', 'campus_state',
        'campus_postal_code', 'latitude', 'longitude', 'established_date',
        'academic_year_start', 'academic_year_end', 'has_library', 'has_laboratory',
        'has_sports_facilities', 'has_cafeteria'
      ];
      
      additionalFields.forEach(field => {
        if (data[field] !== undefined) {
          additionalData[field] = data[field];
        }
      });
      
      if (Object.keys(additionalData).length > 1) {
        const { error: additionalError } = await supabase
          .from('schools_additional')
          .insert([additionalData]);
        
        if (additionalError && additionalError.code !== '23505') {
          console.error('Additional data error:', additionalError);
        }
      }
      
      return school;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['schools-tab', companyId]);
        queryClient.invalidateQueries(['branches-for-schools', companyId]);
        queryClient.invalidateQueries(['organization-stats']);
        if (refreshData) refreshData();
        toast.success('School created successfully');
        setShowCreateModal(false);
        setFormData({});
        setActiveTab('basic');
      },
      onError: (error: any) => {
        console.error('Error creating school:', error);
        toast.error(error.message || 'Failed to create school. Please try again.');
      }
    }
  );

  const updateSchoolMutation = useMutation(
    async ({ id, data, deactivateAssociatedBranches = false }: { id: string; data: any; deactivateAssociatedBranches?: boolean }) => {
      // Check if School Admin is trying to modify a school they're not assigned to
      if (isSchoolAdmin && userContext?.schoolIds && !userContext.schoolIds.includes(id)) {
        throw new Error('You can only modify schools you are assigned to');
      }

      // If deactivating school and we need to deactivate branches
      if (data.status === 'inactive' && deactivateAssociatedBranches) {
        // First deactivate all active branches for this school
        const { error: branchUpdateError } = await supabase
          .from('branches')
          .update({ status: 'inactive' })
          .eq('school_id', id)
          .eq('status', 'active');
        
        if (branchUpdateError) {
          throw new Error(`Failed to deactivate branches: ${branchUpdateError.message}`);
        }
      }
      
      // Prepare main data
      const mainData = {
        name: data.name,
        code: data.code,
        description: data.description,
        status: data.status,
        address: data.address,
        notes: data.notes,
        logo: data.logo
      };
      
      // Update main record
      const { error } = await supabase
        .from('schools')
        .update(mainData)
        .eq('id', id);
      
      if (error) throw error;
      
      // Update or insert additional record
      const additionalData: any = {
        school_id: id
      };
      
      // Add additional fields
      const additionalFields = [
        'school_type', 'curriculum_type', 'total_capacity', 'teachers_count',
        'student_count', 'active_teachers_count', 'principal_name', 'principal_email',
        'principal_phone', 'campus_address', 'campus_city', 'campus_state',
        'campus_postal_code', 'latitude', 'longitude', 'established_date',
        'academic_year_start', 'academic_year_end', 'has_library', 'has_laboratory',
        'has_sports_facilities', 'has_cafeteria'
      ];
      
      additionalFields.forEach(field => {
        if (data[field] !== undefined) {
          additionalData[field] = data[field];
        }
      });
      
      if (Object.keys(additionalData).length > 1) {
        // Try update first
        const { error: updateError } = await supabase
          .from('schools_additional')
          .update(additionalData)
          .eq('school_id', id);
        
        // If no rows updated, insert
        if (updateError?.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('schools_additional')
            .insert([additionalData]);
          
          if (insertError && insertError.code !== '23505') {
            console.error('Additional insert error:', insertError);
          }
        }
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['schools-tab', companyId]);
        queryClient.invalidateQueries(['branches-for-schools', companyId]);
        queryClient.invalidateQueries(['organization-stats']);
        if (refreshData) refreshData();
        toast.success('School updated successfully');
        setShowEditModal(false);
        setSelectedSchool(null);
        setFormData({});
        setActiveTab('basic');
      },
      onError: (error: any) => {
        console.error('Error updating school:', error);
        toast.error(error.message || 'Failed to update school. Please try again.');
      }
    }
  );

  // ===== HELPER FUNCTIONS =====
  const validateForm = useCallback(() => {
    if (!formData.name) {
      toast.error('School name is required');
      return false;
    }
    if (!formData.code) {
      toast.error('School code is required');
      return false;
    }
    if (!formData.status) {
      toast.error('Status is required');
      return false;
    }
    
    // Email validation
    if (formData.principal_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.principal_email)) {
      toast.error('Please enter a valid email address for principal');
      return false;
    }
    
    return true;
  }, [formData]);

  const handleSubmit = useCallback(async (mode: 'create' | 'edit') => {
    if (!validateForm()) {
      return;
    }
    
    // Check for branch deactivation before proceeding with edit
    if (mode === 'edit' && formData.status === 'inactive' && selectedSchool) {
      // Find active branches for this school
      const activeBranches = branches.filter(branch => 
        branch.school_id === selectedSchool.id && branch.status === 'active'
      );
      
      if (activeBranches.length > 0) {
        setBranchesToDeactivate(activeBranches);
        setShowDeactivateConfirmation(true);
        return; // Don't proceed with mutation yet
      }
    }
    
    if (mode === 'create') {
      createSchoolMutation.mutate({ data: formData });
    } else {
      updateSchoolMutation.mutate({ id: selectedSchool!.id, data: formData, deactivateAssociatedBranches: false });
    }
  }, [validateForm, formData, selectedSchool, branches, createSchoolMutation, updateSchoolMutation]);

  // Handle confirmed deactivation with branches
  const handleConfirmDeactivation = useCallback(() => {
    if (selectedSchool) {
      updateSchoolMutation.mutate({ 
        id: selectedSchool.id, 
        data: formData, 
        deactivateAssociatedBranches: true 
      });
    }
    setShowDeactivateConfirmation(false);
    setBranchesToDeactivate([]);
  }, [selectedSchool, formData, updateSchoolMutation]);

  // Handle cancel deactivation
  const handleCancelDeactivation = useCallback(() => {
    setShowDeactivateConfirmation(false);
    setBranchesToDeactivate([]);
  }, []);

  const handleEdit = useCallback((school: SchoolData) => {
    // Check if School Admin can edit this school
    if (isSchoolAdmin && userContext?.schoolIds && !userContext.schoolIds.includes(school.id)) {
      toast.error('You can only edit schools you are assigned to');
      return;
    }

    const combinedData = {
      ...school,
      ...(school.additional || {})
    };
    setFormData(combinedData);
    setSelectedSchool(school);
    setActiveTab('basic');
    setShowEditModal(true);
  }, [isSchoolAdmin, userContext]);

  const handleCreate = useCallback(() => {
    if (!canCreateSchool) {
      toast.error('You do not have permission to create schools');
      return;
    }
    setFormData({ status: 'active', company_id: companyId });
    setActiveTab('basic');
    setShowCreateModal(true);
  }, [companyId, canCreateSchool]);

  // Filter schools based on search and status
  const displayedSchools = schools.filter(school => {
    const matchesSearch = school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         school.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || school.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const totalStudents = schools.reduce((sum, school) => sum + (school.student_count || 0), 0);
  const totalTeachers = schools.reduce((sum, school) => sum + (school.teachers_count || 0), 0);

  // Loading state
  if (isLoading || isAccessControlLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading schools...</p>
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
          <p className="text-gray-600 dark:text-gray-400">Failed to load schools</p>
          <p className="text-sm text-gray-500 mt-1">{fetchError instanceof Error ? fetchError.message : 'Unknown error'}</p>
          <Button onClick={() => refetch()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

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
                placeholder="Search schools..."
                className="pl-10"
              />
            </div>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
              className="w-32"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
          {canCreateSchool ? (
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Add School
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Lock className="w-4 h-4" />
              <span>{isSchoolAdmin ? 'Cannot create schools' : 'Read-only access'}</span>
            </div>
          )}
        </div>

        {/* Permission notices */}
        {isSchoolAdmin && userContext?.schoolIds && userContext.schoolIds.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Assigned Schools Only
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  As a School Administrator, you're viewing and can manage only the schools assigned to you.
                  You have access to {userContext.schoolIds.length} school{userContext.schoolIds.length > 1 ? 's' : ''}.
                </p>
              </div>
            </div>
          </div>
        )}

        {isSchoolAdmin && (!userContext?.schoolIds || userContext.schoolIds.length === 0) && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  No Schools Assigned
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                  You haven't been assigned to any schools yet. Please contact your administrator to assign you to schools.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isSchoolAdmin ? 'Assigned Schools' : 'Total Schools'}
                </p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {schools.length}
                </p>
              </div>
              <School className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Active</p>
                <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                  {schools.filter(s => s.status === 'active').length}
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
                  {totalStudents.toLocaleString()}
                </p>
              </div>
              <GraduationCap className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Teachers</p>
                <p className="text-xl font-semibold text-purple-600 dark:text-purple-400">
                  {totalTeachers.toLocaleString()}
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Schools List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedSchools.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <School className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || filterStatus !== 'all' 
                ? 'No schools match your filters' 
                : isSchoolAdmin 
                  ? 'No assigned schools found' 
                  : 'No schools found'}
            </p>
          </div>
        ) : (
          displayedSchools.map((school) => {
            const logoUrl = getSchoolLogoUrl(school.logo);
            const canEdit = canModifySchool && (!isSchoolAdmin || (userContext?.schoolIds?.includes(school.id)));
            
            return (
              <div
                key={school.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {/* Logo display with better error handling */}
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md overflow-hidden relative bg-white">
                      {logoUrl ? (
                        <>
                          <img
                            src={logoUrl}
                            alt={`${school.name} logo`}
                            className="w-full h-full object-contain p-0.5"
                            onError={(e) => {
                              const imgElement = e.currentTarget as HTMLImageElement;
                              imgElement.style.display = 'none';
                              const parent = imgElement.parentElement;
                              if (parent) {
                                const fallback = parent.querySelector('.logo-fallback') as HTMLElement;
                                if (fallback) {
                                  fallback.style.display = 'flex';
                                }
                              }
                            }}
                          />
                          <div className="logo-fallback hidden items-center justify-center w-full h-full absolute inset-0 bg-green-500 text-white">
                            <School className="w-5 h-5" />
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center w-full h-full bg-green-500 text-white">
                          <School className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{school.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{school.code}</p>
                    </div>
                  </div>
                  <StatusBadge status={school.status} size="xs" />
                </div>

                {school.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {school.description}
                  </p>
                )}

                <div className="space-y-2 mb-3">
                  {school.additional?.principal_name && (
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <User className="w-3 h-3" />
                      <span>{school.additional.principal_name}</span>
                    </div>
                  )}
                  {school.additional?.campus_city && (
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <MapPin className="w-3 h-3" />
                      <span>{school.additional.campus_city}</span>
                    </div>
                  )}
                  {school.additional?.school_type && (
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <Building2 className="w-3 h-3" />
                      <span className="capitalize">{school.additional.school_type.replace('_', ' ')}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t dark:border-gray-700">
                  <div className="flex items-center space-x-4 text-xs">
                    <div className="flex items-center gap-1">
                      <GraduationCap className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">
                        {school.student_count || 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">
                        {school.teachers_count || 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">
                        {school.branch_count || 0}
                      </span>
                    </div>
                  </div>
                  {canEdit ? (
                    <button
                      onClick={() => handleEdit(school)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Edit school"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                  ) : (
                    <div className="p-1.5 opacity-50" title="You don't have permission to edit this school">
                      <Shield className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Modal */}
      <SlideInForm
        title="Create School"
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setFormData({});
        }}
        onSave={() => handleSubmit('create')}
        loading={createSchoolMutation.isLoading}
      >
        <SchoolFormContent
          formData={formData}
          setFormData={setFormData}
          formErrors={{}}
          setFormErrors={() => {}}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          companyId={companyId}
          isEditing={false}
        />
      </SlideInForm>

      {/* Edit Modal */}
      <SlideInForm
        title="Edit School"
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedSchool(null);
          setFormData({});
        }}
        onSave={() => handleSubmit('edit')}
        loading={updateSchoolMutation.isLoading}
      >
        <SchoolFormContent
          formData={formData}
          setFormData={setFormData}
          formErrors={{}}
          setFormErrors={() => {}}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          companyId={companyId}
          isEditing={true}
        />
      </SlideInForm>

      {/* Branch Deactivation Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeactivateConfirmation}
        title="Deactivate Branches?"
        message={`This school has ${branchesToDeactivate.length} active branch${branchesToDeactivate.length > 1 ? 'es' : ''}: ${branchesToDeactivate.map(b => b.name).join(', ')}. These branches will also be deactivated. Do you want to proceed?`}
        confirmText="Deactivate All"
        cancelText="Cancel"
        confirmVariant="destructive"
        onConfirm={handleConfirmDeactivation}
        onCancel={handleCancelDeactivation}
      />
    </div>
  );
});

SchoolsTab.displayName = 'SchoolsTab';

export default SchoolsTab;