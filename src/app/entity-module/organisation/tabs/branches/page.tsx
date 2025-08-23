/**
 * File: /src/app/entity-module/organisation/tabs/branches/page.tsx
 * Dependencies:
 *   - @/lib/supabase
 *   - @/lib/auth
 *   - @/contexts/UserContext
 *   - @/hooks/useAccessControl
 *   - @/components/shared/* (SlideInForm, FormField, Button, StatusBadge)
 *   - @/components/shared/ImageUpload
 *   - External: react, @tanstack/react-query, lucide-react, react-hot-toast
 * 
 * FIXED: Changed permission checks from 'organization.modify_branch' to 'modify_branch'
 * This matches the permission format in useAccessControl hook
 * 
 * Preserved Features:
 *   - All original branch management functionality
 *   - Search, filter, and status management
 *   - Branch creation and editing forms
 *   - ImageUpload integration
 *   - Statistics display
 *   - All original event handlers
 *   - Tab-based form organization
 * 
 * Database Tables:
 *   - branches & branches_additional
 *   - schools (for reference)
 *   - entity_user_branches (for scope)
 * 
 * Connected Files:
 *   - useAccessControl.ts (permission checking)
 *   - StatusBadge.tsx (status display)
 *   - ImageUpload.tsx (logo upload)
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
import { ImageUpload } from '@/components/shared/ImageUpload';
import { useAccessControl } from '@/hooks/useAccessControl';

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
}

interface BranchAdditional {
  id?: string;
  branch_id: string;
  student_capacity?: number;
  current_students?: number;
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
const BranchesTab = React.forwardRef<BranchesTabRef, BranchesTabProps>(({ companyId, refreshData }, ref) => {
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
  const [selectedBranch, setSelectedBranch] = useState<BranchData | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'basic' | 'additional' | 'contact'>('basic');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterSchool, setFilterSchool] = useState<string>('all');

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
    
    // Use the correct bucket name for branches
    return `${supabaseUrl}/storage/v1/object/public/branch-logos/${path}`;
  }, []);

  // SCOPED QUERIES: Apply getScopeFilters to all Supabase queries
  const scopeFilters = getScopeFilters('branches');

  // ===== FETCH SCHOOLS FOR DROPDOWN =====
  const { data: schools = [], isLoading: isLoadingSchools } = useQuery(
    ['schools-for-branches', companyId, scopeFilters],
    async () => {
      let query = supabase
        .from('schools')
        .select(`
          id, name, code, company_id,
          companies (id, name)
        `)
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name');
      
      // Apply scope filters for school admins
      if (!isEntityAdmin && !isSubEntityAdmin && scopeFilters.id) {
        if (Array.isArray(scopeFilters.id) && scopeFilters.id.length === 0) {
          return [];
        }
        query = query.in('id', scopeFilters.id);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
    { 
      enabled: !!companyId && !isAccessControlLoading,
      staleTime: 5 * 60 * 1000
    }
  );

  // ===== FETCH BRANCHES WITH SCOPE =====
  const { data: branches = [], isLoading, error: fetchError, refetch } = useQuery(
    ['branches-tab', companyId, scopeFilters],
    async () => {
      // For branch admins, get branches directly
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
        
        // Fetch additional data
        const enrichedBranches = await Promise.all((branchesData || []).map(async (branch) => {
          const { data: additional } = await supabase
            .from('branches_additional')
            .select('*')
            .eq('branch_id', branch.id)
            .maybeSingle();
          
          // Get school name
          const { data: school } = await supabase
            .from('schools')
            .select('name')
            .eq('id', branch.school_id)
            .single();
          
          // Get teacher count if not in additional
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
      
      // For others, get schools first then branches
      let schoolsQuery = supabase
        .from('schools')
        .select(`
          id, name, code, company_id,
          companies (id, name)
        `)
        .eq('company_id', companyId);

      // Apply school scope filters
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
      
      // Get branches for these schools
      const { data: branchesData, error: branchesError } = await supabase
        .from('branches')
        .select(`
          id, name, code, school_id, status, address, notes, logo, created_at,
          additional:branches_additional (*)
        `)
        .in('school_id', schoolIds)
        .order('name');
      
      if (branchesError) throw branchesError;
      
      // Fetch additional data for each branch
      const branchesWithAdditional = await Promise.all((branchesData || []).map(async (branch) => {
        const { data: additional } = await supabase
          .from('branches_additional')
          .select('*') 
          .eq('branch_id', branch.id)
          .maybeSingle();
        
        // Get school name
        const school = schoolsData?.find(s => s.id === branch.school_id);
        
        // Get teacher count if not in additional
        let teacherCount = additional?.teachers_count || 0;
        if (!teacherCount) {
          const { count } = await supabase
            .from('teachers')
            .select('*', { count: 'exact', head: true })
            .eq('branch_id', branch.id)
            .eq('is_active', true);
          teacherCount = count || 0;
        }
        
        // Return enriched branch data
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
      // Validate school selection for branch admins
      if (isBranchAdmin) {
        toast.error('Branch administrators cannot create new branches');
        throw new Error('Insufficient permissions');
      }
      
      // Prepare main data
      const mainData = {
        name: data.name,
        code: data.code,
        school_id: data.school_id,
        status: data.status,
        address: data.address,
        notes: data.notes,
        logo: data.logo
      };
      
      // Create main record
      const { data: branch, error } = await supabase
        .from('branches')
        .insert([mainData])
        .select()
        .single();
      
      if (error) throw error;
      
      // Create additional record
      const additionalData: any = {
        branch_id: branch.id
      };
      
      // Add additional fields
      const additionalFields = [
        'student_capacity', 'current_students', 'student_count', 'teachers_count',
        'active_teachers_count', 'branch_head_name', 'branch_head_email',
        'branch_head_phone', 'building_name', 'floor_details', 'opening_time',
        'closing_time', 'working_days'
      ];
      
      additionalFields.forEach(field => {
        if (data[field] !== undefined) {
          additionalData[field] = data[field];
        }
      });
      
      if (Object.keys(additionalData).length > 1) {
        const { error: additionalError } = await supabase
          .from('branches_additional')
          .insert([additionalData]);
        
        if (additionalError && additionalError.code !== '23505') {
          console.error('Additional data error:', additionalError);
        }
      }
      
      return branch;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['branches-tab', companyId]);
        queryClient.invalidateQueries(['organization-stats']);
        if (refreshData) refreshData();
        toast.success('Branch created successfully');
        setShowCreateModal(false);
        setFormData({});
        setFormErrors({});
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
      // Prepare main data
      const mainData = {
        name: data.name,
        code: data.code,
        school_id: data.school_id,
        status: data.status,
        address: data.address,
        notes: data.notes,
        logo: data.logo
      };
      
      // Update main record
      const { error } = await supabase
        .from('branches')
        .update(mainData)
        .eq('id', id);
      
      if (error) throw error;
      
      // Update or insert additional record
      const additionalData: any = {
        branch_id: id
      };
      
      // Add additional fields
      const additionalFields = [
        'student_capacity', 'current_students', 'student_count', 'teachers_count',
        'active_teachers_count', 'branch_head_name', 'branch_head_email',
        'branch_head_phone', 'building_name', 'floor_details', 'opening_time',
        'closing_time', 'working_days'
      ];
      
      additionalFields.forEach(field => {
        if (data[field] !== undefined) {
          additionalData[field] = data[field];
        }
      });
      
      if (Object.keys(additionalData).length > 1) {
        // Try update first
        const { error: updateError } = await supabase
          .from('branches_additional')
          .update(additionalData)
          .eq('branch_id', id);
        
        // If no rows updated, insert
        if (updateError?.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('branches_additional')
            .insert([additionalData]);
          
          if (insertError && insertError.code !== '23505') {
            console.error('Additional insert error:', insertError);
          }
        }
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['branches-tab', companyId]);
        queryClient.invalidateQueries(['organization-stats']);
        if (refreshData) refreshData();
        toast.success('Branch updated successfully');
        setShowEditModal(false);
        setSelectedBranch(null);
        setFormData({});
        setFormErrors({});
        setActiveTab('basic');
      },
      onError: (error: any) => {
        console.error('Error updating branch:', error);
        toast.error(error.message || 'Failed to update branch');
      }
    }
  );

  // ===== HELPER FUNCTIONS =====
  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};
    
    if (!formData.name) errors.name = 'Name is required';
    if (!formData.code) errors.code = 'Code is required';
    if (!formData.school_id) errors.school_id = 'School is required';
    if (!formData.status) errors.status = 'Status is required';
    
    // Email validation
    if (formData.branch_head_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.branch_head_email)) {
      errors.branch_head_email = 'Invalid email address';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  // Effect to populate form data when editing
  useEffect(() => {
    if (selectedBranch && showEditModal) {
      console.log('Populating form for branch:', selectedBranch);
      const populateEditForm = async () => {
        try {
          const { data: schoolData, error } = await supabase
            .from('schools')
            .select('id, name, company_id')
            .eq('id', selectedBranch.school_id)
            .single();
          
          if (error) {
            console.error('Error fetching school data:', error);
            toast.error('Failed to load school information');
            return;
          }
          
          const additionalData = selectedBranch.additional || {};
          console.log('Additional data:', additionalData);
          
          const combinedData = {
            ...selectedBranch,
            school_id: selectedBranch.school_id,
            company_id: schoolData?.company_id,
            ...additionalData
          };
          
          console.log('Setting form data:', combinedData);
          setFormData(combinedData);
        } catch (error) {
          console.error('Error populating form:', error);
          toast.error('Failed to load branch data');
        }
      };
      
      populateEditForm();
    }
  }, [selectedBranch, showEditModal]);

  // Effect to fetch schools when formData.company_id changes
  useEffect(() => {
    if (formData.company_id && schools.length === 0) {
      console.log('Fetching schools for company:', formData.company_id);
      // Trigger schools fetch by updating the schools query
      // This will be handled by the schools query dependency
    }
  }, [formData.company_id]);

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
    setShowEditModal(true);
  }, []);

  const handleCreate = useCallback(() => {
    setFormData({ status: 'active' });
    setFormErrors({});
    setActiveTab('basic');
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

  // Get user context for display
  const userContext = getUserContext();
  const adminLevelDisplay = userContext?.adminLevel?.replace('_', ' ');

  // Loading state
  if (isLoading || isAccessControlLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
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

  // ===== RENDER FORM =====
  const renderBranchForm = () => (
    <>
      {activeTab === 'basic' && (
        <div className="space-y-4">
          <FormField id="school_id" label="School" required error={formErrors.school_id}>
            <Select
              id="school_id"
              value={formData.school_id || ''}
              onChange={(e) => setFormData({...formData, school_id: e.target.value})}
              disabled={isBranchAdmin} // Branch admins can't change school
            >
              <option value="">Select school</option>
              {schools.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </FormField>

          <FormField id="name" label="Branch Name" required error={formErrors.name}>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Enter branch name"
            />
          </FormField>

          <FormField id="code" label="Branch Code" required error={formErrors.code}>
            <Input
              id="code"
              value={formData.code || ''}
              onChange={(e) => setFormData({...formData, code: e.target.value})}
              placeholder="e.g., BR-001"
            />
          </FormField>

          <FormField id="status" label="Status" required error={formErrors.status}>
            <Select
              id="status"
              value={formData.status || 'active'}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </FormField>

          <FormField id="building_name" label="Building Name">
            <Input
              id="building_name"
              value={formData.building_name || ''}
              onChange={(e) => setFormData({...formData, building_name: e.target.value})}
              placeholder="Enter building name"
            />
          </FormField>

          <FormField id="floor_details" label="Floor Details">
            <Input
              id="floor_details"
              value={formData.floor_details || ''}
              onChange={(e) => setFormData({...formData, floor_details: e.target.value})}
              placeholder="e.g., 2nd Floor, Wing A"
            />
          </FormField>

          <FormField id="address" label="Address">
            <Textarea
              id="address"
              value={formData.address || ''}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              placeholder="Enter branch address"
              rows={3}
            />
          </FormField>

          <FormField id="logo" label="Branch Logo">
            <ImageUpload
              id="branch-logo"
              bucket="branch-logos"
              value={formData.logo}
              publicUrl={formData.logo ? getBranchLogoUrl(formData.logo) : null}
              onChange={(path) => setFormData({...formData, logo: path || ''})}
            />
          </FormField>
        </div>
      )}

      {activeTab === 'additional' && (
        <div className="space-y-4">
          <FormField id="student_capacity" label="Student Capacity">
            <Input
              id="student_capacity"
              type="number"
              value={formData.student_capacity || ''}
              onChange={(e) => setFormData({...formData, student_capacity: parseInt(e.target.value)})}
              placeholder="Maximum students"
            />
          </FormField>

          <FormField id="current_students" label="Current Students">
            <Input
              id="current_students"
              type="number"
              value={formData.current_students || ''}
              onChange={(e) => setFormData({...formData, current_students: parseInt(e.target.value)})}
              placeholder="Current number of students"
            />
          </FormField>

          <FormField id="teachers_count" label="Teachers Count">
            <Input
              id="teachers_count"
              type="number"
              value={formData.teachers_count || ''}
              onChange={(e) => setFormData({...formData, teachers_count: parseInt(e.target.value)})}
              placeholder="Number of teachers"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField id="opening_time" label="Opening Time">
              <Input
                id="opening_time"
                type="time"
                value={formData.opening_time || ''}
                onChange={(e) => setFormData({...formData, opening_time: e.target.value})}
              />
            </FormField>

            <FormField id="closing_time" label="Closing Time">
              <Input
                id="closing_time"
                type="time"
                value={formData.closing_time || ''}
                onChange={(e) => setFormData({...formData, closing_time: e.target.value})}
              />
            </FormField>
          </div>

          <FormField id="working_days" label="Working Days">
            <div className="space-y-2">
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                <label key={day} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={(formData.working_days || []).includes(day)}
                    onChange={(e) => {
                      const current = formData.working_days || [];
                      if (e.target.checked) {
                        setFormData({...formData, working_days: [...current, day]});
                      } else {
                        setFormData({...formData, working_days: current.filter((d: string) => d !== day)});
                      }
                    }}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm capitalize">{day}</span>
                </label>
              ))}
            </div>
          </FormField>

          <FormField id="notes" label="Notes">
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Additional notes"
              rows={3}
            />
          </FormField>
        </div>
      )}

      {activeTab === 'contact' && (
        <div className="space-y-4">
          <FormField id="branch_head_name" label="Branch Head Name">
            <Input
              id="branch_head_name"
              value={formData.branch_head_name || ''}
              onChange={(e) => setFormData({...formData, branch_head_name: e.target.value})}
              placeholder="Enter branch head name"
            />
          </FormField>

          <FormField id="branch_head_email" label="Branch Head Email" error={formErrors.branch_head_email}>
            <Input
              id="branch_head_email"
              type="email"
              value={formData.branch_head_email || ''}
              onChange={(e) => setFormData({...formData, branch_head_email: e.target.value})}
              placeholder="branchhead@school.com"
            />
          </FormField>

          <FormField id="branch_head_phone" label="Branch Head Phone">
            <Input
              id="branch_head_phone"
              type="tel"
              value={formData.branch_head_phone || ''}
              onChange={(e) => setFormData({...formData, branch_head_phone: e.target.value})}
              placeholder="+1 (555) 123-4567"
            />
          </FormField>

          <FormField id="active_teachers_count" label="Active Teachers">
            <Input
              id="active_teachers_count"
              type="number"
              value={formData.active_teachers_count || ''}
              onChange={(e) => setFormData({...formData, active_teachers_count: parseInt(e.target.value)})}
              placeholder="Number of active teachers"
            />
          </FormField>
        </div>
      )}
    </>
  );

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
              onChange={(e) => setFilterSchool(e.target.value)}
              className="w-48"
            >
              <option value="all">All Schools</option>
              {schools.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
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
          {/* FIXED: Changed from 'organization.create_branch' to 'create_branch' */}
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

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Branches</p>
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
            // FIXED: Changed from 'organization.modify_branch' to 'modify_branch'
            const canEdit = can('modify_branch');
            
            return (
              <div
                key={branch.id}
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
                            alt={`${branch.name} logo`}
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
                          <div className="logo-fallback hidden items-center justify-center w-full h-full absolute inset-0 bg-purple-500 text-white">
                            <MapPin className="w-5 h-5" />
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-center w-full h-full bg-purple-500 text-white">
                          <MapPin className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{branch.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{branch.code}</p>
                    </div>
                  </div>
                  <StatusBadge status={branch.status} size="xs" />
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
                  {/* UI GATING: Show edit button based on permissions */}
                  {canEdit ? (
                    <button
                      onClick={() => handleEdit(branch)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Edit branch"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                  ) : (
                    <div className="p-1.5 opacity-50" title="You don't have permission to edit branches">
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
        title="Create Branch"
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setFormData({});
          setFormErrors({});
        }}
        onSave={() => handleSubmit('create')}
        loading={createBranchMutation.isLoading}
      >
        {/* Use BranchFormContent component */}
        <div className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex space-x-4 border-b dark:border-gray-700">
            <button
              onClick={() => setActiveTab('basic')}
              className={`pb-2 px-1 ${activeTab === 'basic' 
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'text-gray-600 dark:text-gray-400'}`}
            >
              Basic Info
            </button>
            <button
              onClick={() => setActiveTab('additional')}
              className={`pb-2 px-1 ${activeTab === 'additional' 
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'text-gray-600 dark:text-gray-400'}`}
            >
              Additional
            </button>
            <button
              onClick={() => setActiveTab('contact')}
              className={`pb-2 px-1 ${activeTab === 'contact' 
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'text-gray-600 dark:text-gray-400'}`}
            >
              Contact
            </button>
          </div>

          {/* Form Content */}
          <div className="mt-4">
            <BranchFormContent
              formData={formData}
              setFormData={setFormData}
              formErrors={formErrors}
              setFormErrors={setFormErrors}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              schools={schools}
              isEditing={false}
            />
          </div>
        </div>
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
          setActiveTab('basic');
        }}
        onSave={() => handleSubmit('edit')}
        loading={updateBranchMutation.isLoading}
      >
        {/* Use BranchFormContent component */}
        <div className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex space-x-4 border-b dark:border-gray-700">
            <button
              onClick={() => setActiveTab('basic')}
              className={`pb-2 px-1 ${activeTab === 'basic' 
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'text-gray-600 dark:text-gray-400'}`}
            >
              Basic Info
            </button>
            <button
              onClick={() => setActiveTab('additional')}
              className={`pb-2 px-1 ${activeTab === 'additional' 
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'text-gray-600 dark:text-gray-400'}`}
            >
              Additional
            </button>
            <button
              onClick={() => setActiveTab('contact')}
              className={`pb-2 px-1 ${activeTab === 'contact' 
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'text-gray-600 dark:text-gray-400'}`}
            >
              Contact
            </button>
          </div>

          {/* Form Content */}
          <div className="mt-4">
            <BranchFormContent
              formData={formData}
              setFormData={setFormData}
              formErrors={formErrors}
              setFormErrors={setFormErrors}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              schools={schools}
              isEditing={true}
            />
          </div>
        </div>
      </SlideInForm>
    </div>
  );
});

BranchesTab.displayName = 'BranchesTab';

export default BranchesTab;