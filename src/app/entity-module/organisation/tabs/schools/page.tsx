/**
 * File: /src/app/entity-module/organisation/tabs/schools/page.tsx
 * COMPLETE FIXED VERSION - Based on working Branches component structure
 */

'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Search, Edit2, Trash2, Building2, Users, MapPin, Calendar,
  Filter, X, ChevronRight, AlertTriangle, Shield, Lock, Loader2,
  CheckCircle, XCircle, Info, School, Activity, Settings, Eye
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/shared/Button';
import { FormField, Input, Select, Textarea } from '@/components/shared/FormField';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SlideInForm } from '@/components/shared/SlideInForm';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useUser } from '@/contexts/UserContext';
import { getAuthenticatedUser } from '@/lib/auth';

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
            const { data: additional } = await supabase
              .from('schools_additional')
              .select('*')
              .eq('school_id', school.id)
              .maybeSingle();
            
            const { count: branchCount } = await supabase
              .from('branches')
              .select('*', { count: 'exact', head: true })
              .eq('school_id', school.id)
              .eq('status', 'active');
            
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
        }
        
        // For School Admins - fetch assigned schools from entity_user_schools junction table
        if (isSchoolAdmin && authenticatedUser?.id) {
          // First, get the entity_user record
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
          
          // Then fetch assigned schools from junction table
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
            .eq('entity_user_id', entityUser.id);  // Use entity_users.id
          
          if (assignedSchoolsError) {
            console.error('Error fetching assigned schools:', assignedSchoolsError);
            throw assignedSchoolsError;
          }
          
          // Extract schools from the junction table results
          const schools = assignedSchoolsData?.map(item => item.schools).filter(Boolean) || [];
          
          // Fetch additional data for each school
          const schoolsWithAdditional = await Promise.all(schools.map(async (school) => {
            const { data: additional } = await supabase
              .from('schools_additional')
              .select('*')
              .eq('school_id', school.id)
              .maybeSingle();
            
            const { count: branchCount } = await supabase
              .from('branches')
              .select('*', { count: 'exact', head: true })
              .eq('school_id', school.id)
              .eq('status', 'active');
            
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
        }
        
        // For Branch Admins - fetch schools that contain their assigned branches
        if (isBranchAdmin && authenticatedUser?.id) {
          // First, get the entity_user record
          const { data: entityUser, error: entityUserError } = await supabase
            .from('entity_users')
            .select('id')
            .eq('user_id', authenticatedUser.id)
            .single();
          
          if (entityUserError || !entityUser) {
            console.warn('No entity user found for branch admin');
            return [];
          }
          
          // Get assigned branches from junction table
          const { data: assignedBranchesData, error: assignedBranchesError } = await supabase
            .from('entity_user_branches')
            .select(`
              branch_id,
              branches!entity_user_branches_branch_id_fkey (
                school_id
              )
            `)
            .eq('entity_user_id', entityUser.id);  // Use entity_users.id
          
          if (assignedBranchesError) {
            console.error('Error fetching assigned branches:', assignedBranchesError);
            return [];
          }
          
          // Extract unique school IDs
          const schoolIds = [...new Set(
            assignedBranchesData?.map(item => item.branches?.school_id).filter(Boolean) || []
          )];
          
          if (schoolIds.length === 0) {
            return [];
          }
          
          // Fetch schools
          const { data: schoolsData, error: schoolsError } = await supabase
            .from('schools')
            .select('id, name, code, company_id, description, status, address, notes, logo, created_at')
            .in('id', schoolIds)
            .eq('company_id', companyId)
            .order('name');
          
          if (schoolsError) throw schoolsError;
          
          // Add additional data but mark as read-only for branch admins
          const schoolsWithAdditional = await Promise.all((schoolsData || []).map(async (school) => {
            const { data: additional } = await supabase
              .from('schools_additional')
              .select('*')
              .eq('school_id', school.id)
              .maybeSingle();
            
            const { count: branchCount } = await supabase
              .from('branches')
              .select('*', { count: 'exact', head: true })
              .eq('school_id', school.id)
              .eq('status', 'active');
            
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
              teachers_count: teacherCount,
              readOnly: true // Mark as read-only for branch admins
            };
          }));
          
          return schoolsWithAdditional;
        }
        
        // Default: return empty array
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
        const { additionalData, ...schoolData } = data;
        
        // Create school
        const { data: newSchool, error: schoolError } = await supabase
          .from('schools')
          .insert([{ ...schoolData, company_id: companyId }])
          .select()
          .single();
        
        if (schoolError) throw schoolError;
        
        // Create additional data if provided
        if (additionalData && Object.keys(additionalData).length > 0) {
          const { error: additionalError } = await supabase
            .from('schools_additional')
            .insert([{ ...additionalData, school_id: newSchool.id }]);
          
          if (additionalError) throw additionalError;
        }
        
        return newSchool;
      },
      {
        onSuccess: () => {
          toast.success('School created successfully');
          setShowCreateModal(false);
          setFormData({});
          setFormErrors({});
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
        const { additionalData, ...schoolData } = data;
        
        // Update school
        const { error: schoolError } = await supabase
          .from('schools')
          .update(schoolData)
          .eq('id', id);
        
        if (schoolError) throw schoolError;
        
        // Update or create additional data
        if (additionalData && Object.keys(additionalData).length > 0) {
          const { data: existing } = await supabase
            .from('schools_additional')
            .select('id')
            .eq('school_id', id)
            .single();
          
          if (existing) {
            const { error: additionalError } = await supabase
              .from('schools_additional')
              .update(additionalData)
              .eq('school_id', id);
            
            if (additionalError) throw additionalError;
          } else {
            const { error: additionalError } = await supabase
              .from('schools_additional')
              .insert([{ ...additionalData, school_id: id }]);
            
            if (additionalError) throw additionalError;
          }
        }
        
        // Deactivate branches if school is being deactivated
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
      async (id: string) => {
        const { error } = await supabase
          .from('schools')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        return id;
      },
      {
        onSuccess: () => {
          toast.success('School deleted successfully');
          queryClient.invalidateQueries(['schools-tab']);
          if (refreshData) refreshData();
        },
        onError: (error: any) => {
          toast.error(error.message || 'Failed to delete school');
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
      if (!formData.status) errors.status = 'Status is required';
      
      // Email validation
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

      // Check if deactivating school with active branches
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

      // Separate basic and additional data
      const { 
        name, code, description, status, address, notes, logo,
        ...additionalFields 
      } = formData;
      
      const schoolData = {
        name, code, description, status, address, notes, logo,
        additionalData: additionalFields
      };

      if (selectedSchool) {
        updateSchoolMutation.mutate({ 
          id: selectedSchool.id, 
          data: schoolData 
        });
      } else {
        createSchoolMutation.mutate(schoolData);
      }
    }, [formData, selectedSchool, validateForm, updateSchoolMutation, createSchoolMutation, branches]);

    // Handle deactivation confirmation
    const handleConfirmDeactivation = useCallback(() => {
      if (selectedSchool) {
        const { 
          name, code, description, status, address, notes, logo,
          ...additionalFields 
        } = formData;
        
        const schoolData = {
          name, code, description, status, address, notes, logo,
          additionalData: additionalFields
        };

        updateSchoolMutation.mutate({ 
          id: selectedSchool.id, 
          data: schoolData, 
          deactivateAssociatedBranches: true 
        });
      }
      setShowDeactivateConfirmation(false);
      setBranchesToDeactivate([]);
    }, [selectedSchool, formData, updateSchoolMutation]);

    const handleEdit = useCallback((school: SchoolData) => {
      const combinedData = {
        ...school,
        ...(school.additional || {})
      };
      setFormData(combinedData);
      setSelectedSchool(school);
      setActiveTab('basic');
      setShowEditModal(true);
    }, []);

    const handleCreate = useCallback(() => {
      setFormData({ status: 'active', company_id: companyId });
      setActiveTab('basic');
      setShowCreateModal(true);
    }, [companyId]);

    // Filter schools based on search and status
    const displayedSchools = useMemo(() => {
      return schools.filter(school => {
        const matchesSearch = school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             school.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || school.status === filterStatus;
        return matchesSearch && matchesStatus;
      });
    }, [schools, searchTerm, filterStatus]);

    // Calculate stats
    const totalStudents = schools.reduce((sum, school) => sum + (school.student_count || 0), 0);
    const totalTeachers = schools.reduce((sum, school) => sum + (school.teachers_count || 0), 0);

    // Get user context for display
    const userContext = getUserContext();
    const adminLevelDisplay = userContext?.adminLevel?.replace('_', ' ');

    // Loading state
    if (isLoading || isAccessControlLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="inline-block animate-spin h-8 w-8 text-gray-600" />
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

    // Form content rendering
    const renderFormContent = () => (
      <>
        {/* Tab Navigation */}
        <div className="flex space-x-4 border-b dark:border-gray-700 mb-4">
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

        {activeTab === 'basic' && (
          <div className="space-y-4">
            <FormField label="School Name" required error={formErrors.name}>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter school name"
              />
            </FormField>

            <FormField label="School Code" required error={formErrors.code}>
              <Input
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Enter unique code"
              />
            </FormField>

            <FormField label="Description">
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter school description"
                rows={3}
              />
            </FormField>

            <FormField label="Status" required error={formErrors.status}>
              <Select
                value={formData.status || 'active'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </FormField>

            <FormField label="Address">
              <Textarea
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter school address"
                rows={2}
              />
            </FormField>

            <FormField label="School Logo">
              <ImageUpload
                id="school-logo"
                bucket="school-logos"
                value={formData.logo}
                publicUrl={formData.logo ? getSchoolLogoUrl(formData.logo) : null}
                onChange={(path) => setFormData({...formData, logo: path || ''})}
              />
            </FormField>
          </div>
        )}

        {activeTab === 'additional' && (
          <div className="space-y-4">
            <FormField label="School Type">
              <Select
                value={formData.school_type || ''}
                onChange={(e) => setFormData({ ...formData, school_type: e.target.value })}
              >
                <option value="">Select type</option>
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="high_school">High School</option>
                <option value="k12">K-12</option>
              </Select>
            </FormField>

            <FormField label="Total Capacity">
              <Input
                type="number"
                value={formData.total_capacity || ''}
                onChange={(e) => setFormData({ ...formData, total_capacity: parseInt(e.target.value) })}
                placeholder="Enter maximum capacity"
              />
            </FormField>

            <FormField label="Established Date">
              <Input
                type="date"
                value={formData.established_date || ''}
                onChange={(e) => setFormData({ ...formData, established_date: e.target.value })}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Has Library">
                <Select
                  value={formData.has_library ? 'yes' : 'no'}
                  onChange={(e) => setFormData({ ...formData, has_library: e.target.value === 'yes' })}
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </Select>
              </FormField>

              <FormField label="Has Laboratory">
                <Select
                  value={formData.has_laboratory ? 'yes' : 'no'}
                  onChange={(e) => setFormData({ ...formData, has_laboratory: e.target.value === 'yes' })}
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </Select>
              </FormField>
            </div>
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="space-y-4">
            <FormField label="Principal Name">
              <Input
                value={formData.principal_name || ''}
                onChange={(e) => setFormData({ ...formData, principal_name: e.target.value })}
                placeholder="Enter principal name"
              />
            </FormField>

            <FormField label="Principal Email" error={formErrors.principal_email}>
              <Input
                type="email"
                value={formData.principal_email || ''}
                onChange={(e) => setFormData({ ...formData, principal_email: e.target.value })}
                placeholder="Enter principal email"
              />
            </FormField>

            <FormField label="Principal Phone">
              <Input
                value={formData.principal_phone || ''}
                onChange={(e) => setFormData({ ...formData, principal_phone: e.target.value })}
                placeholder="Enter principal phone"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="City">
                <Input
                  value={formData.campus_city || ''}
                  onChange={(e) => setFormData({ ...formData, campus_city: e.target.value })}
                  placeholder="Enter city"
                />
              </FormField>

              <FormField label="State">
                <Input
                  value={formData.campus_state || ''}
                  onChange={(e) => setFormData({ ...formData, campus_state: e.target.value })}
                  placeholder="Enter state"
                />
              </FormField>
            </div>
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

          {/* No schools warning */}
          {schools.length === 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                    No Schools {!canAccessAll ? 'Assigned' : 'Available'}
                  </p>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    {isSchoolAdmin 
                      ? "You haven't been assigned to any schools yet. Please contact your administrator."
                      : isBranchAdmin
                      ? "Your branches don't belong to any active schools."
                      : canAccessAll
                      ? "No schools have been created yet. Click 'Add School' to create the first one."
                      : "No schools available to display."
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Statistics Cards */}
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {canAccessAll ? 'Total Schools' : 'Assigned Schools'}
                  </p>
                  <p className="text-xl font-semibold mt-1">{schools.length}</p>
                </div>
                <Building2 className="w-6 h-6 text-gray-400" />
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Active</p>
                  <p className="text-xl font-semibold mt-1 text-green-600">
                    {schools.filter(s => s.status === 'active').length}
                  </p>
                </div>
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Students</p>
                  <p className="text-xl font-semibold mt-1">{totalStudents}</p>
                </div>
                <Users className="w-6 h-6 text-gray-400" />
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Teachers</p>
                  <p className="text-xl font-semibold mt-1">{totalTeachers}</p>
                </div>
                <Users className="w-6 h-6 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Schools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedSchools.map((school) => {
            const logoUrl = getSchoolLogoUrl(school.logo);
            const canEdit = can('modify_school') && !school.readOnly;

            return (
              <div
                key={school.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt={`${school.name} logo`}
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
                          <School className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{school.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{school.code}</p>
                      </div>
                    </div>
                    <StatusBadge status={school.status} />
                  </div>

                  {school.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {school.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-3">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {school.branch_count || 0} branches
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {school.student_count || 0} students
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {school.teachers_count || 0} teachers
                    </span>
                  </div>

                  {canEdit && (
                    <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <Button
                        onClick={() => handleEdit(school)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      {can('delete_school') && (
                        <Button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this school?')) {
                              deleteSchoolMutation.mutate(school.id);
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
            );
          })}
        </div>

        {/* Create Modal */}
        <SlideInForm
          title="Create School"
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setFormData({});
            setFormErrors({});
          }}
          onSave={handleSubmit}
          loading={createSchoolMutation.isPending}
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
          }}
          onSave={handleSubmit}
          loading={updateSchoolMutation.isPending}
        >
          {renderFormContent()}
        </SlideInForm>

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