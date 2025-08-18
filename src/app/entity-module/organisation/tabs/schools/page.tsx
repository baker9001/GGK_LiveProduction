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
  
  // State management
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolData | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'basic' | 'additional' | 'contact'>('basic');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // ===== EXPOSE METHODS VIA REF =====
  React.useImperativeHandle(ref, () => ({
    openEditSchoolModal: (school: SchoolData) => {
      handleEdit(school);
    }
  }), []);

  // ===== FETCH SCHOOLS =====
  const { data: schools = [], isLoading, refetch } = useQuery(
    ['schools', companyId],
    async () => {
      const { data: schoolsData, error: schoolsError } = await supabase
        .from('schools')
        .select('*')
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

  // ===== MUTATIONS =====
  const createSchoolMutation = useMutation(
    async (data: any) => {
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
        queryClient.invalidateQueries(['schools']);
        if (refreshData) refreshData();
        toast.success('School created successfully');
        setShowCreateModal(false);
        setFormData({});
        setFormErrors({});
        setActiveTab('basic');
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to create school');
      }
    }
  );

  const updateSchoolMutation = useMutation(
    async ({ id, data }: { id: string; data: any }) => {
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
        queryClient.invalidateQueries(['schools']);
        if (refreshData) refreshData();
        toast.success('School updated successfully');
        setShowEditModal(false);
        setSelectedSchool(null);
        setFormData({});
        setFormErrors({});
        setActiveTab('basic');
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to update school');
      }
    }
  );

  // ===== HELPER FUNCTIONS =====
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.name) errors.name = 'Name is required';
    if (!formData.code) errors.code = 'Code is required';
    if (!formData.status) errors.status = 'Status is required';
    
    // Email validations
    if (formData.principal_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.principal_email)) {
      errors.principal_email = 'Invalid email address';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (mode: 'create' | 'edit') => {
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }
    
    if (mode === 'create') {
      createSchoolMutation.mutate(formData);
    } else {
      updateSchoolMutation.mutate({ id: selectedSchool!.id, data: formData });
    }
  };

  const handleEdit = (school: SchoolData) => {
    const combinedData = {
      ...school,
      ...(school.additional || {})
    };
    setFormData(combinedData);
    setFormErrors({});
    setSelectedSchool(school);
    setActiveTab('basic');
    setShowEditModal(true);
  };

  const handleCreate = () => {
    setFormData({ status: 'active', company_id: companyId });
    setFormErrors({});
    setActiveTab('basic');
    setShowCreateModal(true);
  };

  // Filter schools based on search and status
  const filteredSchools = schools.filter(school => {
    const matchesSearch = school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         school.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || school.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const totalStudents = schools.reduce((sum, school) => sum + (school.student_count || 0), 0);
  const totalTeachers = schools.reduce((sum, school) => sum + (school.additional?.teachers_count || 0), 0);

  // Helper to get school logo URL
  const getSchoolLogoUrl = (path: string | null) => {
    if (!path) return null;
    
    // If it's already a full URL, return as is
    if (path.startsWith('http')) {
      return path;
    }
    
    // Construct Supabase storage URL
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/school-logos/${path}`;
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
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
            />
          </div>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Add School
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Schools</p>
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
          filteredSchools.map((school) => (
            <div
              key={school.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center overflow-hidden">
                    {school.logo ? (
                      <img
                        src={getSchoolLogoUrl(school.logo)}
                        alt={`${school.name} logo`}
                        className="w-full h-full object-contain p-1"
                        onError={(e) => {
                          // If logo fails to load, hide the image and show fallback
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            const fallback = parent.querySelector('.logo-fallback');
                            if (fallback) {
                              (fallback as HTMLElement).style.display = 'flex';
                            }
                          }
                        }}
                      />
                    ) : null}
                    <span className={`text-sm font-bold logo-fallback ${school.logo ? 'hidden' : 'flex'} items-center justify-center w-full h-full text-green-600 dark:text-green-400`}>
                      {school.code?.substring(0, 2).toUpperCase() || school.name?.substring(0, 2).toUpperCase() || <School className="w-5 h-5" />}
                    </span>
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
                <button
                  onClick={() => handleEdit(school)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
          ))
        )}
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
        onSave={() => handleSubmit('create')}
      >
        <SchoolFormContent
          formData={formData}
          setFormData={setFormData}
          formErrors={formErrors}
          setFormErrors={setFormErrors}
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
          setFormErrors({});
        }}
        onSave={() => handleSubmit('edit')}
      >
        <SchoolFormContent
          formData={formData}
          setFormData={setFormData}
          formErrors={formErrors}
          setFormErrors={setFormErrors}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          companyId={companyId}
          isEditing={true}
        />
      </SlideInForm>
    </div>
  );
});

SchoolsTab.displayName = 'SchoolsTab';

export default SchoolsTab;