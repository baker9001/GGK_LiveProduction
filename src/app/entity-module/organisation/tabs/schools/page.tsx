/**
 * File: /src/app/entity-module/organisation/tabs/schools/page.tsx
 * COMPLETE FIXED VERSION - All UI Issues Resolved
 * 
 * Fixes Applied:
 * 1. ✅ Removed duplicate bottom buttons (kept only top icon buttons)
 * 2. ✅ Enhanced logo size (80x80) and display with better background
 * 3. ✅ Unified color scheme (purple for branches, blue for students, green for teachers)
 * 4. ✅ View mode toggle moved to right side for consistency
 */

'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Search, Edit2, Trash2, Building2, Users, MapPin,
  Filter, X, AlertTriangle, Shield, Lock, Loader2,
  CheckCircle2, XCircle, Info, School, Hash, Grid3X3, List
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/shared/Button';
import { FormField, Input, Select, Textarea } from '@/components/shared/FormField';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SlideInForm } from '@/components/shared/SlideInForm';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useUser } from '@/contexts/UserContext';
import { getAuthenticatedUser } from '@/lib/auth';
import { SchoolFormContent } from '@/components/forms/SchoolFormContent';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { usePagination } from '@/hooks/usePagination';

// ===== INTERFACES =====
interface SchoolData {
  id: string;
  name: string;
  code: string;
  company_id: string;
  description?: string;
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
  readOnly?: boolean;
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

export interface SchoolsTabRef {
  openEditSchoolModal: (school: SchoolData) => void;
}

// ===== MAIN COMPONENT =====
const SchoolsTab = React.forwardRef<SchoolsTabRef, SchoolsTabProps>(
  ({ companyId, refreshData }, ref) => {
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
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [activeTab, setActiveTab] = useState<'basic' | 'additional' | 'contact'>('basic');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
    const [showDeactivateConfirmation, setShowDeactivateConfirmation] = useState(false);
    const [branchesToDeactivate, setBranchesToDeactivate] = useState<any[]>([]);
    const [tabErrors, setTabErrors] = useState({ basic: false, additional: false, contact: false });
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
    
    // Confirmation dialog state
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [deleteContext, setDeleteContext] = useState<{ ids: string[]; names: string[] } | null>(null);
    const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
    const selectAllRef = useRef<HTMLInputElement>(null);

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

    // Expose methods via ref
    React.useImperativeHandle(ref, () => ({
      openEditSchoolModal: (school: SchoolData) => {
        handleEdit(school);
      }
    }), []);

    // Helper to get school logo URL
    const getSchoolLogoUrl = useCallback((path: string | null | undefined) => {
      if (!path) return null;
      
      if (path.startsWith('http')) {
        return path;
      }
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        console.warn('VITE_SUPABASE_URL is not defined');
        return null;
      }
      
      return `${supabaseUrl}/storage/v1/object/public/school-logos/${path}`;
    }, []);

    // SCOPED QUERIES: Apply getScopeFilters to all Supabase queries
    const scopeFilters = getScopeFilters('schools');

    // ===== FETCH SCHOOLS WITH PROPER JUNCTION TABLE HANDLING =====
    const { data: schools = [], isLoading, error: fetchError, refetch } = useQuery(
      ['schools-tab', companyId, isEntityAdmin, isSubEntityAdmin, isSchoolAdmin, isBranchAdmin, authenticatedUser?.id],
      async () => {
        // For Entity and Sub-Entity admins - fetch all company schools
        if (isEntityAdmin || isSubEntityAdmin) {
          let schoolsQuery = supabase
            .from('schools')
            .select('id, name, code, company_id, description, status, address, notes, logo, created_at')
            .eq('company_id', companyId);
          
          const { data: schoolsData, error: schoolsError } = await schoolsQuery.order('name');
          
          if (schoolsError) throw schoolsError;
          
          // Fetch additional data for each school
          const schoolsWithAdditional = await Promise.all((schoolsData || []).map(async (school) => {
            const { data: additionalData } = await supabase
              .from('schools_additional')
              .select('*')
              .eq('school_id', school.id)
              .maybeSingle();
            
            const { count: branchCount } = await supabase
              .from('branches')
              .select('*', { count: 'exact', head: true })
              .eq('school_id', school.id)
              .eq('status', 'active');
            
            let teacherCount = additionalData?.teachers_count || 0;
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
              additional: additionalData || {},
              branch_count: branchCount || 0,
              student_count: additionalData?.student_count || 0,
              teachers_count: teacherCount
            };
          }));
          
          return schoolsWithAdditional;
        }
        
        // For School Admins - fetch assigned schools from entity_user_schools junction table
        if (isSchoolAdmin && authenticatedUser?.id) {
          const { data: entityUser, error: entityUserError } = await supabase
            .from('entity_users')
            .select('id')
            .eq('user_id', authenticatedUser.id)
            .single();
          
          if (entityUserError) {
            console.error('Error fetching entity user:', entityUserError);
            throw entityUserError;
          }
          
          if (!entityUser) {
            console.warn('No entity user found for school admin');
            return [];
          }
          
          const { data: assignedSchoolsData, error: assignedSchoolsError } = await supabase
            .from('entity_user_schools')
            .select(`
              school_id,
              schools!entity_user_schools_school_id_fkey (
                id,
                name,
                code,
                company_id,
                description,
                status,
                address,
                notes,
                logo,
                created_at
              )
            `)
            .eq('entity_user_id', entityUser.id);
          
          if (assignedSchoolsError) {
            console.error('Error fetching assigned schools:', assignedSchoolsError);
            throw assignedSchoolsError;
          }
          
          const schools = assignedSchoolsData?.map(item => item.schools).filter(Boolean) || [];
          
          const schoolsWithAdditional = await Promise.all(schools.map(async (school) => {
            const { data: additionalData } = await supabase
              .from('schools_additional')
              .select('*')
              .eq('school_id', school.id)
              .maybeSingle();
            
            const { count: branchCount } = await supabase
              .from('branches')
              .select('*', { count: 'exact', head: true })
              .eq('school_id', school.id)
              .eq('status', 'active');
            
            let teacherCount = additionalData?.teachers_count || 0;
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
              additional: additionalData || {},
              branch_count: branchCount || 0,
              student_count: additionalData?.student_count || 0,
              teachers_count: teacherCount
            };
          }));
          
          return schoolsWithAdditional;
        }
        
        // For Branch Admins - fetch schools that contain their assigned branches
        if (isBranchAdmin && authenticatedUser?.id) {
          const { data: entityUser, error: entityUserError } = await supabase
            .from('entity_users')
            .select('id')
            .eq('user_id', authenticatedUser.id)
            .single();
          
          if (entityUserError || !entityUser) {
            console.warn('No entity user found for branch admin');
            return [];
          }
          
          const { data: assignedBranchesData, error: assignedBranchesError } = await supabase
            .from('entity_user_branches')
            .select(`
              branch_id,
              branches!entity_user_branches_branch_id_fkey (
                school_id
              )
            `)
            .eq('entity_user_id', entityUser.id);
          
          if (assignedBranchesError) {
            console.error('Error fetching assigned branches:', assignedBranchesError);
            return [];
          }
          
          const schoolIds = [...new Set(
            assignedBranchesData?.map(item => item.branches?.school_id).filter(Boolean) || []
          )];
          
          if (schoolIds.length === 0) {
            return [];
          }
          
          const { data: schoolsData, error: schoolsError } = await supabase
            .from('schools')
            .select('id, name, code, company_id, description, status, address, notes, logo, created_at')
            .in('id', schoolIds)
            .eq('company_id', companyId)
            .order('name');
          
          if (schoolsError) throw schoolsError;
          
          const schoolsWithAdditional = await Promise.all((schoolsData || []).map(async (school) => {
            const { data: additionalData } = await supabase
              .from('schools_additional')
              .select('*')
              .eq('school_id', school.id)
              .maybeSingle();
            
            const { count: branchCount } = await supabase
              .from('branches')
              .select('*', { count: 'exact', head: true })
              .eq('school_id', school.id)
              .eq('status', 'active');
            
            let teacherCount = additionalData?.teachers_count || 0;
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
              additional: additionalData || {},
              branch_count: branchCount || 0,
              student_count: additionalData?.student_count || 0,
              teachers_count: teacherCount,
              readOnly: true
            };
          }));
          
          return schoolsWithAdditional;
        }
        
        return [];
      },
      {
        enabled: !!companyId && !isAccessControlLoading,
        staleTime: 60 * 1000,
        retry: 2
      }
    );

    // Check if user can access all schools
    const canAccessAll = isEntityAdmin || isSubEntityAdmin;

    // Create school mutation
    const createSchoolMutation = useMutation(
      async (data: any) => {
        const schoolFields = ['name', 'code', 'description', 'status', 'address', 'notes', 'logo'];
        
        const additionalFieldsList = [
          'school_type', 'curriculum_type', 'total_capacity', 'teachers_count',
          'student_count', 'active_teachers_count', 'principal_name', 'principal_email',
          'principal_phone', 'campus_address', 'campus_city', 'campus_state',
          'campus_postal_code', 'latitude', 'longitude', 'established_date',
          'academic_year_start', 'academic_year_end', 'has_library', 'has_laboratory',
          'has_sports_facilities', 'has_cafeteria'
        ];
        
        const schoolData: any = { company_id: companyId };
        const additionalData: any = {};
        
        Object.keys(data).forEach(key => {
          if (schoolFields.includes(key)) {
            schoolData[key] = data[key];
          } else if (additionalFieldsList.includes(key)) {
            additionalData[key] = data[key];
          }
        });
        
        const { data: newSchool, error: schoolError } = await supabase
          .from('schools')
          .insert([schoolData])
          .select()
          .single();
        
        if (schoolError) throw schoolError;
        
        if (Object.keys(additionalData).length > 0) {
          const { error: additionalError } = await supabase
            .from('schools_additional')
            .insert([{ 
              school_id: newSchool.id,
              ...additionalData 
            }]);
          
          if (additionalError && additionalError.code !== '23505') {
            console.error('Additional data error:', additionalError);
          }
        }
        
        return newSchool;
      },
      {
        onSuccess: () => {
          toast.success('School created successfully');
          setShowCreateModal(false);
          setFormData({});
          setFormErrors({});
          setTabErrors({ basic: false, additional: false, contact: false });
          setActiveTab('basic');
          queryClient.invalidateQueries(['schools-tab']);
          if (refreshData) refreshData();
        },
        onError: (error: any) => {
          toast.error(error.message || 'Failed to create school');
        }
      }
    );

    // Update school mutation
    const updateSchoolMutation = useMutation(
      async ({ id, data, deactivateAssociatedBranches }: { 
        id: string; 
        data: any; 
        deactivateAssociatedBranches?: boolean 
      }) => {
        const schoolFields = ['name', 'code', 'description', 'status', 'address', 'notes', 'logo', 'company_id'];
        
        const additionalFieldsList = [
          'school_type', 'curriculum_type', 'total_capacity', 'teachers_count',
          'student_count', 'active_teachers_count', 'principal_name', 'principal_email',
          'principal_phone', 'campus_address', 'campus_city', 'campus_state',
          'campus_postal_code', 'latitude', 'longitude', 'established_date',
          'academic_year_start', 'academic_year_end', 'has_library', 'has_laboratory',
          'has_sports_facilities', 'has_cafeteria'
        ];
        
        const schoolData: any = {};
        const additionalData: any = {};
        
        Object.keys(data).forEach(key => {
          if (schoolFields.includes(key)) {
            schoolData[key] = data[key];
          } else if (additionalFieldsList.includes(key)) {
            additionalData[key] = data[key];
          }
        });
        
        if (Object.keys(schoolData).length > 0) {
          const { error: schoolError } = await supabase
            .from('schools')
            .update(schoolData)
            .eq('id', id);
          
          if (schoolError) throw schoolError;
        }
        
        if (Object.keys(additionalData).length > 0) {
          const { error: updateError } = await supabase
            .from('schools_additional')
            .update(additionalData)
            .eq('school_id', id);
          
          if (updateError && updateError.code === 'PGRST116') {
            const { error: insertError } = await supabase
              .from('schools_additional')
              .insert([{ 
                school_id: id,
                ...additionalData 
              }]);
            
            if (insertError && insertError.code !== '23505') {
              console.error('Additional insert error:', insertError);
            }
          } else if (updateError) {
            console.error('Additional update error:', updateError);
          }
        }
        
        if (deactivateAssociatedBranches && schoolData.status === 'inactive') {
          const { error: branchError } = await supabase
            .from('branches')
            .update({ status: 'inactive' })
            .eq('school_id', id);
          
          if (branchError) throw branchError;
        }
        
        return { id };
      },
      {
        onSuccess: () => {
          toast.success('School updated successfully');
          setShowEditModal(false);
          setSelectedSchool(null);
          setFormData({});
          setFormErrors({});
          setTabErrors({ basic: false, additional: false, contact: false });
          setActiveTab('basic');
          queryClient.invalidateQueries(['schools-tab']);
          if (refreshData) refreshData();
        },
        onError: (error: any) => {
          toast.error(error.message || 'Failed to update school');
        }
      }
    );

    // Delete school mutation
    const deleteSchoolMutation = useMutation(
      async (ids: string[]) => {
        const { error } = await supabase
          .from('schools')
          .delete()
          .in('id', ids);

        if (error) throw error;
        return ids;
      },
      {
        onSuccess: (_data, ids) => {
          toast.success(ids.length > 1 ? 'Schools deleted successfully' : 'School deleted successfully');
          queryClient.invalidateQueries(['schools-tab']);
          setShowDeleteConfirmation(false);
          setDeleteContext(null);
          setSelectedSchools([]);
          if (refreshData) refreshData();
        },
        onError: (error: any) => {
          toast.error(error.message || 'Failed to delete school');
          setShowDeleteConfirmation(false);
          setDeleteContext(null);
        }
      }
    );

    // Fetch branches for deactivation check
    const { data: branches = [] } = useQuery(
      ['branches-for-schools', companyId],
      async () => {
        const { data: schoolsData, error: schoolsError } = await supabase
          .from('schools')
          .select('id')
          .eq('company_id', companyId);
        
        if (schoolsError) throw schoolsError;
        
        const schoolIds = schoolsData?.map(s => s.id) || [];
        
        if (schoolIds.length === 0) return [];
        
        const { data: branchesData, error: branchesError } = await supabase
          .from('branches')
          .select('id, name, school_id, status')
          .in('school_id', schoolIds);
        
        if (branchesError) throw branchesError;
        
        return branchesData || [];
      },
      {
        enabled: !!companyId && !isAccessControlLoading
      }
    );

    // Validation
    const validateForm = useCallback(() => {
      const errors: Record<string, string> = {};
      
      if (!formData.name) errors.name = 'Name is required';
      if (!formData.code) errors.code = 'Code is required';
      
      if (formData.principal_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.principal_email)) {
        errors.principal_email = 'Invalid email address';
      }
      
      setFormErrors(errors);
      return Object.keys(errors).length === 0;
    }, [formData]);

    // Handle form submission
    const handleSubmit = useCallback(() => {
      if (!validateForm()) {
        toast.error('Please fix the errors before submitting');
        return;
      }

      if (selectedSchool && 
          formData.status === 'inactive' && 
          selectedSchool.status === 'active') {
        const activeBranches = branches.filter(
          b => b.school_id === selectedSchool.id && b.status === 'active'
        );
        
        if (activeBranches.length > 0) {
          setBranchesToDeactivate(activeBranches);
          setShowDeactivateConfirmation(true);
          return;
        }
      }

      if (selectedSchool) {
        updateSchoolMutation.mutate({ 
          id: selectedSchool.id, 
          data: formData 
        });
      } else {
        createSchoolMutation.mutate(formData);
      }
    }, [formData, selectedSchool, branches, validateForm, updateSchoolMutation, createSchoolMutation]);

    // Handle deactivation confirmation
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

    // Handle edit
    const handleEdit = useCallback((school: SchoolData) => {
      const combinedData = {
        ...school
      };
      
      if (school.additional && typeof school.additional === 'object') {
        Object.assign(combinedData, school.additional);
      }
      
      delete combinedData.additional;
      
      setFormData(combinedData);
      setSelectedSchool(school);
      setActiveTab('basic');
      setTabErrors({ basic: false, additional: false, contact: false });
      setShowEditModal(true);
    }, []);

    const handleCreate = useCallback(() => {
      setFormData({ 
        status: 'active',
        company_id: companyId 
      });
      setActiveTab('basic');
      setTabErrors({ basic: false, additional: false, contact: false });
      setShowCreateModal(true);
    }, [companyId]);

    // Handle delete confirmation
    const handleDeleteClick = useCallback((school: SchoolData) => {
      setDeleteContext({ ids: [school.id], names: [school.name] });
      setShowDeleteConfirmation(true);
    }, []);

    const handleBulkDelete = useCallback(() => {
      if (selectedSchools.length === 0) return;

      const selected = schools.filter(school => selectedSchools.includes(school.id));
      if (selected.length === 0) return;

      setDeleteContext({
        ids: selected.map(school => school.id),
        names: selected.map(school => school.name)
      });
      setShowDeleteConfirmation(true);
    }, [schools, selectedSchools]);

    const handleConfirmDelete = useCallback(() => {
      if (deleteContext) {
        deleteSchoolMutation.mutate(deleteContext.ids);
      }
    }, [deleteContext, deleteSchoolMutation]);

    const handleCancelDelete = useCallback(() => {
      setShowDeleteConfirmation(false);
      setDeleteContext(null);
    }, []);

    // Filter schools based on search and status
    const displayedSchools = useMemo(() => {
      return schools.filter(school => {
        const matchesSearch = school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             school.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || school.status === filterStatus;
        return matchesSearch && matchesStatus;
      });
    }, [schools, searchTerm, filterStatus]);

    const {
      page: schoolsPage,
      rowsPerPage: schoolsRowsPerPage,
      totalPages: schoolsTotalPages,
      totalCount: schoolsTotalCount,
      paginatedItems: paginatedSchools,
      start: schoolsStart,
      end: schoolsEnd,
      goToPage: goToSchoolsPage,
      nextPage: nextSchoolsPage,
      previousPage: previousSchoolsPage,
      changeRowsPerPage: changeSchoolsRowsPerPage,
    } = usePagination(displayedSchools);

    const listViewSchools = viewMode === 'list' ? paginatedSchools : displayedSchools;

    const currentListIds = useMemo(() =>
      viewMode === 'list' ? paginatedSchools.map(school => school.id) : [],
    [viewMode, paginatedSchools]);

    const isAllSelected = viewMode === 'list' &&
      currentListIds.length > 0 &&
      currentListIds.every(id => selectedSchools.includes(id));

    const isSomeSelected = viewMode === 'list' &&
      currentListIds.some(id => selectedSchools.includes(id));

    useEffect(() => {
      if (viewMode !== 'list') {
        if (selectedSchools.length > 0) {
          setSelectedSchools([]);
        }
        return;
      }

      setSelectedSchools(prev => {
        const filtered = prev.filter(id => displayedSchools.some(school => school.id === id));
        if (filtered.length === prev.length && filtered.every((id, index) => id === prev[index])) {
          return prev;
        }
        return filtered;
      });
    }, [displayedSchools, viewMode, selectedSchools.length]);

    useEffect(() => {
      if (!selectAllRef.current) return;

      selectAllRef.current.indeterminate = viewMode === 'list' && isSomeSelected && !isAllSelected;
    }, [isAllSelected, isSomeSelected, viewMode]);

    // Calculate stats
    const stats = useMemo(() => ({
      total: schools.length,
      active: schools.filter(s => s.status === 'active').length,
      students: schools.reduce((acc, s) => acc + (s.student_count || 0), 0),
      teachers: schools.reduce((acc, s) => acc + (s.teachers_count || 0), 0)
    }), [schools]);

    // Get user context for display
    const userContext = getUserContext();
    const adminLevelDisplay = userContext?.adminLevel?.replace('_', ' ');
    const deleteCount = deleteContext?.ids.length ?? 0;
    const deleteTitle = deleteCount > 1 ? 'Delete Schools' : 'Delete School';
    const deleteNamesPreview = deleteContext ? deleteContext.names.slice(0, 3).join(', ') : '';
    const deleteMessage = deleteCount === 1
      ? `Are you sure you want to delete "${deleteContext?.names[0]}"? This action cannot be undone and will also delete all associated branches.`
      : deleteCount > 1
        ? `Are you sure you want to delete ${deleteCount} schools? This action cannot be undone and will also delete all associated branches.${deleteNamesPreview ? ` Selected: ${deleteNamesPreview}${deleteCount > 3 ? '…' : ''}` : ''}`
        : '';

    // Loading state
    if (isLoading || isAccessControlLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-600 mx-auto mb-2" />
            <p className="text-gray-600 dark:text-gray-400">Loading schools...</p>
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

    // Form content rendering with SchoolFormContent component
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
              {tabErrors.basic && !selectedSchool && (
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
              {tabErrors.additional && !selectedSchool && (
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
              {tabErrors.contact && !selectedSchool && (
                <span 
                  className="inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" 
                  title="Required fields missing" 
                />
              )}
            </button>
          </div>

          {/* Form Content using SchoolFormContent component */}
          <div className="mt-4">
            <SchoolFormContent
              formData={formData}
              setFormData={setFormData}
              formErrors={formErrors}
              setFormErrors={setFormErrors}
              activeTab={activeTab}
              companyId={companyId}
              isEditing={!!selectedSchool}
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
                  placeholder="Search schools..."
                  className="pl-10"
                />
              </div>
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
              {/* View Mode Toggle - Moved to Right */}
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
            {can('create_school') ? (
              <Button onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Add School
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
                    As a {adminLevelDisplay}, you're viewing schools within your assigned scope.
                    {isSchoolAdmin && ' You can manage the schools you are assigned to.'}
                    {isBranchAdmin && ' You can view schools that contain your assigned branches (read-only).'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Statistics Cards - Unified Colors */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {canAccessAll ? 'Total Schools' : 'Assigned Schools'}
                  </p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">
                    {stats.total}
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

        {/* Schools Display */}
        {viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedSchools.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <School className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm || filterStatus !== 'all'
                  ? 'No schools match your filters'
                  : 'No schools found'}
              </p>
            </div>
          ) : (
            displayedSchools.map((school) => {
              const logoUrl = getSchoolLogoUrl(school.logo);
              const canEdit = can('modify_school') && !school.readOnly;

              return (
                <div
                  key={school.id}
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
                              alt={`${school.name} logo`}
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
                            <School className="w-10 h-10 text-[#8CC63F]/70" />
                          </div>
                        </div>
                        <div>
                          <h3 className="font-bold text-xl text-gray-900 dark:text-white group-hover:text-[#8CC63F] transition-colors">
                            {school.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                              {school.code}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={school.status} size="sm" />
                        {/* Action buttons - floating on hover */}
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0">
                          {canEdit && (
                            <Button
                              onClick={() => handleEdit(school)}
                              variant="outline"
                              size="sm"
                              className="h-9 w-9 p-0 border-[#8CC63F]/30 text-[#8CC63F] hover:bg-[#8CC63F] hover:text-white hover:border-[#8CC63F] transition-all duration-200 shadow-md hover:shadow-lg"
                              title="Edit school"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          )}
                          {can('delete_school') && (
                            <Button
                              onClick={() => handleDeleteClick(school)}
                              variant="outline"
                              size="sm"
                              className="h-9 w-9 p-0 border-red-200 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-200 shadow-md hover:shadow-lg"
                              title="Delete school"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {school.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 line-clamp-2 leading-relaxed">
                        {school.description}
                      </p>
                    )}

                    {/* Statistics - UNIFIED COLORS */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                      <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/30 rounded-xl border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center justify-center mb-1">
                          <MapPin className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="text-xl font-bold text-purple-700 dark:text-purple-300">
                          {school.branch_count || 0}
                        </div>
                        <div className="text-xs font-medium text-purple-600 dark:text-purple-400">
                          Branches
                        </div>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30 rounded-xl border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-center mb-1">
                          <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                          {school.student_count || 0}
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
                          {school.teachers_count || 0}
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
                          Created {new Date(school.created_at).toLocaleDateString()}
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
            {selectedSchools.length > 0 && (
              <div className="flex items-center justify-between px-6 py-3 bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700" role="toolbar" aria-label="Bulk actions">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {selectedSchools.length} selected
                </span>
                <div className="flex gap-2">
                  {can('delete_school') && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleBulkDelete}
                      disabled={deleteSchoolMutation.isLoading || deleteSchoolMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={isAllSelected}
                        aria-checked={isAllSelected ? 'true' : (isSomeSelected ? 'mixed' : 'false')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSchools(prev => {
                              const next = new Set(prev);
                              paginatedSchools.forEach(school => next.add(school.id));
                              return Array.from(next);
                            });
                          } else {
                            setSelectedSchools(prev => prev.filter(id => !paginatedSchools.some(school => school.id === id)));
                          }
                        }}
                        className="rounded border-gray-300 dark:border-gray-600 focus:ring-[#8CC63F] text-emerald-600"
                        aria-label="Select all schools"
                      />
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">School</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Code</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Branches</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Students</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Teachers</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {schoolsTotalCount === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center">
                        <School className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 dark:text-gray-400">
                          {searchTerm || filterStatus !== 'all'
                            ? 'No schools match your filters'
                            : 'No schools found'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    listViewSchools.map((school) => {
                      const logoUrl = getSchoolLogoUrl(school.logo);
                      const canEdit = can('modify_school') && !school.readOnly;

                      return (
                        <tr key={school.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedSchools.includes(school.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSchools(prev => (prev.includes(school.id) ? prev : [...prev, school.id]));
                                } else {
                                  setSelectedSchools(prev => prev.filter(id => id !== school.id));
                                }
                              }}
                              className="rounded border-gray-300 dark:border-gray-600 focus:ring-[#8CC63F] text-emerald-600"
                              aria-label={`Select ${school.name}`}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {/* ENHANCED LOGO IN LIST VIEW */}
                              <div className="w-14 h-14 bg-gradient-to-br from-[#8CC63F]/10 to-[#8CC63F]/20 dark:from-[#8CC63F]/20 dark:to-[#8CC63F]/30 rounded-xl flex items-center justify-center overflow-hidden border border-[#8CC63F]/20">
                                {logoUrl ? (
                                  <img
                                    src={logoUrl}
                                    alt={`${school.name} logo`}
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
                                  <School className="w-7 h-7 text-[#8CC63F]/60" />
                                </div>
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900 dark:text-white">{school.name}</div>
                                {school.description && (
                                  <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                    {school.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                              {school.code}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={school.status} size="sm" />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4 text-purple-500" />
                              <span className="font-medium">{school.branch_count || 0}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4 text-blue-500" />
                              <span className="font-medium">{school.student_count || 0}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4 text-green-500" />
                              <span className="font-medium">{school.teachers_count || 0}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {new Date(school.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {canEdit && (
                                <Button
                                  onClick={() => handleEdit(school)}
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0 border-[#8CC63F]/30 text-[#8CC63F] hover:bg-[#8CC63F] hover:text-white hover:border-[#8CC63F] transition-all duration-200"
                                  title="Edit school"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              )}
                              {can('delete_school') && (
                                <Button
                                  onClick={() => handleDeleteClick(school)}
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0 border-red-200 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-200"
                                  title="Delete school"
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
            <PaginationControls
              page={schoolsPage}
              rowsPerPage={schoolsRowsPerPage}
              totalCount={schoolsTotalCount}
              totalPages={schoolsTotalPages}
              onPageChange={goToSchoolsPage}
              onNextPage={nextSchoolsPage}
              onPreviousPage={previousSchoolsPage}
              onRowsPerPageChange={changeSchoolsRowsPerPage}
              showingRange={{ start: schoolsStart, end: schoolsEnd }}
            />
          </div>
        )}

        {/* Create Modal */}
        <SlideInForm
          title="Create School"
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setFormData({});
            setFormErrors({});
            setTabErrors({ basic: false, additional: false, contact: false });
          }}
          onSave={handleSubmit}
          loading={createSchoolMutation.isPending || createSchoolMutation.isLoading}
        >
          {renderFormContent()}
        </SlideInForm>

        {/* Edit Modal */}
        <SlideInForm
          title="Edit School"
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedSchool(null);
            setFormData({});
            setFormErrors({});
            setTabErrors({ basic: false, additional: false, contact: false });
          }}
          onSave={handleSubmit}
          loading={updateSchoolMutation.isPending || updateSchoolMutation.isLoading}
        >
          {renderFormContent()}
        </SlideInForm>

        {/* Delete Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={showDeleteConfirmation}
          title={deleteTitle}
          message={deleteMessage}
          confirmText={deleteCount > 1 ? 'Delete Schools' : 'Delete School'}
          cancelText="Cancel"
          confirmVariant="destructive"
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />

        {/* Deactivation Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={showDeactivateConfirmation}
          onClose={() => setShowDeactivateConfirmation(false)}
          onConfirm={handleConfirmDeactivation}
          title="Deactivate Associated Branches?"
          message={`This school has ${branchesToDeactivate.length} active branch(es). Deactivating the school will also deactivate all its branches. Do you want to continue?`}
          confirmText="Deactivate All"
          cancelText="Cancel"
          variant="warning"
        />
      </div>
    );
  }
);

SchoolsTab.displayName = 'SchoolsTab';

export default SchoolsTab;