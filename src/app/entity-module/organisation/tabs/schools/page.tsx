/**
 * File: /src/app/entity-module/organisation/tabs/schools/page.tsx
 * 
 * Schools Management Tab Component
 * Handles school data display, creation, and editing with comprehensive forms
 * 
 * Dependencies:
 *   - @/lib/supabase
 *   - @/lib/auth
 *   - @/contexts/UserContext
 *   - @/components/shared/* (SlideInForm, FormField, Button)
 *   - External: react, @tanstack/react-query, lucide-react, react-hot-toast
 * 
 * Preserved Features:
 *   - All original school management functionality
 *   - Search and filter capabilities
 *   - School creation and editing forms
 *   - SchoolFormContent integration
 *   - Statistics display
 *   - All original event handlers
 * 
 * Added/Modified:
 *   - ENHANCED: Logo display matching organization structure's improved implementation
 *   - IMPROVED: Better logo sizing with proper aspect ratio
 *   - ADDED: Logo fallback with better error handling
 *   - IMPROVED: Logo container styling for better visual presentation
 * 
 * Database Tables:
 *   - schools & schools_additional
 *   - companies (for reference)
 */

'use client';

import React, { useState, useEffect, memo } from 'react';
import { 
  School, Plus, Edit2, Trash2, Search, Filter, GraduationCap,
  Users, MapPin, Calendar, Globe, BookOpen, FlaskConical, 
  Dumbbell, Coffee, Phone, Mail, User, CheckCircle2, XCircle,
  Clock, AlertTriangle, Building2, Info
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { getAuthenticatedUser } from '../../../../../lib/auth';
import { useUser } from '../../../../../contexts/UserContext';
import { SlideInForm } from '../../../../../components/shared/SlideInForm';
import { FormField, Input, Select } from '../../../../../components/shared/FormField';
import { Button } from '../../../../../components/shared/Button';
import { StatusBadge } from '../../../../../components/shared/StatusBadge';
import { ConfirmationDialog } from '../../../../../components/shared/ConfirmationDialog';
import { usePermissions } from '../../../../../contexts/PermissionContext';
import { useScopeFilter } from '../../../../../hooks/useScopeFilter';
// Note: DataTable import removed as it wasn't used in the original file
import { SchoolFormContent } from '../../../../../components/forms/SchoolFormContent';

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
  const { canCreate, canModify, canDelete } = usePermissions();
  
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

  // ===== EXPOSE METHODS VIA REF =====
  React.useImperativeHandle(ref, () => ({
    openEditSchoolModal: (school: SchoolData) => {
      handleEdit(school);
    }
  }), []);

  // ENHANCED: Improved helper to get school logo URL with better error handling
  const getSchoolLogoUrl = (path: string | null | undefined) => {
    if (!path) return null;
    
    // If it's already a full URL, return as is
    if (path.startsWith('http')) {
      return path;
    }
    
    // Construct Supabase storage URL with proper environment variable
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      console.warn('VITE_SUPABASE_URL is not defined');
      return null;
    }
    
    // Use the correct bucket name for schools
    return `${supabaseUrl}/storage/v1/object/public/school-logos/${path}`;
  };

  // ===== FETCH SCHOOLS =====
  const { data: schools = [], isLoading, refetch } = useQuery(
    ['schools-tab', companyId], // Different cache key from organization page
    async () => {
      const { data: schoolsData, error: schoolsError } = await supabase
        .from('schools')
        .select('id, name, code, company_id, description, status, address, notes, logo, created_at')
        .eq('company_id', companyId)
        .order('name');
      
      if (schoolsError) throw schoolsError;
      
      // Fetch additional data for each school
      const schoolsWithAdditional = await Promise.all((schoolsData || []).map(async (school) => {
        const { data: additional } = await supabase
          .from('schools_additional')
          .select('*')
          .eq('school_id', school.id)
          .maybeSingle();
        
        // Count branches
        const { count: branchCount } = await supabase
          .from('branches')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', school.id);
        
        return {
          ...school,
          additional,
          branch_count: branchCount || 0,
          student_count: additional?.student_count || 0
        };
      }));
      
      return schoolsWithAdditional;
    },
    {
      enabled: !!companyId,
      staleTime: 60 * 1000,
      cacheTime: 5 * 60 * 1000
    }
  );

  // Apply scope filtering to schools
  const { filteredData: accessibleSchools, hasAccess: hasSchoolAccess, canAccessAll } = useScopeFilter(
    schools,
    { entityType: 'school', companyId, requireActiveStatus: true }
  );

  // ===== FETCH BRANCHES FOR DEACTIVATION CHECK =====
  const { data: branches = [] } = useQuery(
    ['branches-for-schools', companyId],
    async () => {
      // Get all schools for this company first
      const { data: schoolsData, error: schoolsError } = await supabase
        .from('schools')
        .select('id')
        .eq('company_id', companyId);
      
      if (schoolsError) throw schoolsError;
      
      const schoolIds = schoolsData?.map(s => s.id) || [];
      
      if (schoolIds.length === 0) return [];
      
      // Then get all branches for these schools
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
        // FIXED: Use the correct query key that matches the useQuery hook
        queryClient.invalidateQueries(['schools-tab', companyId]);
        queryClient.invalidateQueries(['branches-for-schools', companyId]);
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
        // FIXED: Use the correct query key that matches the useQuery hook
        queryClient.invalidateQueries(['schools-tab', companyId]);
        queryClient.invalidateQueries(['branches-for-schools', companyId]);
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
  const validateForm = () => {
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
  };

  const handleSubmit = async (mode: 'create' | 'edit') => {
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
  };

  // Handle confirmed deactivation with branches
  const handleConfirmDeactivation = () => {
    if (selectedSchool) {
      updateSchoolMutation.mutate({ 
        id: selectedSchool.id, 
        data: formData, 
        deactivateAssociatedBranches: true 
      });
    }
    setShowDeactivateConfirmation(false);
    setBranchesToDeactivate([]);
  };

  // Handle cancel deactivation
  const handleCancelDeactivation = () => {
    setShowDeactivateConfirmation(false);
    setBranchesToDeactivate([]);
  };
  const handleEdit = (school: SchoolData) => {
    const combinedData = {
      ...school,
      ...(school.additional || {})
    };
    setFormData(combinedData);
    setSelectedSchool(school);
    setActiveTab('basic');
    setShowEditModal(true);
  };

  const handleCreate = () => {
    setFormData({ status: 'active', company_id: companyId });
    setActiveTab('basic');
    setShowCreateModal(true);
  };

  // Filter schools based on search and status
  const filteredSchools = accessibleSchools.filter(school => {
    const matchesSearch = school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         school.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || school.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const totalStudents = accessibleSchools.reduce((sum, school) => sum + (school.student_count || 0), 0);
  const totalTeachers = accessibleSchools.reduce((sum, school) => sum + (school.additional?.teachers_count || 0), 0);

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
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add School
          </Button>
        </div>

          {!canCreate('school') && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mr-2" />
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  You don't have permission to create schools.
                </p>
              </div>
            </div>
          )}
          
          {!canAccessAll && accessibleSchools.length < schools.length && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <div className="flex items-center">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-2" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Showing {accessibleSchools.length} of {schools.length} schools based on your assigned scope. You have access to schools you're specifically assigned to manage.
                </p>
              </div>
            </div>
          )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Schools</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {accessibleSchools.length}
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
                  {accessibleSchools.filter(s => s.status === 'active').length}
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
                  {totalStudents}
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
                  {totalTeachers}
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Schools List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading schools...</p>
          </div>
        ) : filteredSchools.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <School className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No schools found</p>
          </div>
        ) : (
          filteredSchools.map((school) => {
            const logoUrl = getSchoolLogoUrl(school.logo);
            
            return (
              <div
                key={school.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {/* ENHANCED: Improved logo display matching org structure implementation */}
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold shadow-md overflow-hidden relative bg-white">
                      {logoUrl ? (
                        <>
                          <img
                            src={logoUrl}
                            alt={`${school.name} logo`}
                            className="w-full h-full object-contain p-0.5"
                            style={{ maxWidth: '100%', maxHeight: '100%' }}
                            onError={(e) => {
                              // If logo fails to load, hide the image and show fallback
                              const imgElement = e.currentTarget as HTMLImageElement;
                              imgElement.style.display = 'none';
                              const parent = imgElement.parentElement;
                              if (parent) {
                                const fallback = parent.querySelector('.logo-fallback') as HTMLElement;
                                if (fallback) {
                                  fallback.style.display = 'flex';
                                  fallback.classList.remove('bg-white');
                                  fallback.classList.add('bg-green-500');
                                }
                              }
                            }}
                          />
                          <span className="text-sm font-bold logo-fallback hidden items-center justify-center w-full h-full absolute inset-0 bg-green-500 text-white">
                            {school.code?.substring(0, 2).toUpperCase() || 
                             school.name?.substring(0, 2).toUpperCase() || 
                             <School className="w-5 h-5" />}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm font-bold flex items-center justify-center w-full h-full bg-green-500 text-white">
                          {school.code?.substring(0, 2).toUpperCase() || 
                           school.name?.substring(0, 2).toUpperCase() || 
                           <School className="w-5 h-5" />}
                        </span>
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
                        {school.student_count || 0} students
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">
                        {school.additional?.teachers_count || 0} teachers
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">
                        {school.branch_count || 0} branches
                      </span>
                    </div>
                  </div>
                  {canModify('school', school.id, 'school') ? (
                    <button
                      onClick={() => handleEdit(school)}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Edit school"
                    >
                      <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                  ) : (
                    <div className="p-1.5 opacity-50" title="You don't have permission to edit this school">
                      <Edit2 className="w-4 h-4 text-gray-400" />
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