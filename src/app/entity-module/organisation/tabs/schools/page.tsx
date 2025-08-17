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
import { FormField, Input, Select, Textarea } from '../../../../../components/shared/FormField';
import { Button } from '../../../../../components/shared/Button';

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

// ===== STATUS BADGE COMPONENT =====
const StatusBadge = memo(({ status, size = 'sm' }: { status: string; size?: 'xs' | 'sm' | 'md' }) => {
  const getStatusConfig = () => {
    switch (status?.toLowerCase()) {
      case 'active':
        return {
          color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-700',
          icon: <CheckCircle2 className="w-3 h-3" />,
        };
      case 'inactive':
        return {
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300 border-gray-200 dark:border-gray-600',
          icon: <XCircle className="w-3 h-3" />,
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300 border-gray-200 dark:border-gray-600',
          icon: <AlertTriangle className="w-3 h-3" />,
        };
    }
  };

  const config = getStatusConfig();
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm'
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium border ${config.color} ${sizeClasses[size]}`}>
      {config.icon}
      {status || 'Unknown'}
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';

// ===== MAIN COMPONENT =====
export default function SchoolsTab({ companyId, refreshData }: SchoolsTabProps) {
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

  // ===== RENDER FORM =====
  const renderSchoolForm = () => (
    <>
      {activeTab === 'basic' && (
        <div className="space-y-4">
          <FormField id="name" label="School Name" required error={formErrors.name}>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Enter school name"
            />
          </FormField>

          <FormField id="code" label="School Code" required error={formErrors.code}>
            <Input
              id="code"
              value={formData.code || ''}
              onChange={(e) => setFormData({...formData, code: e.target.value})}
              placeholder="e.g., SCH-001"
            />
          </FormField>

          <FormField id="status" label="Status" required error={formErrors.status}>
            <Select
              id="status"
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
              value={formData.status || 'active'}
              onChange={(value) => setFormData({...formData, status: value})}
            />
          </FormField>

          <FormField id="school_type" label="School Type">
            <Select
              id="school_type"
              options={[
                { value: 'primary', label: 'Primary School' },
                { value: 'secondary', label: 'Secondary School' },
                { value: 'k12', label: 'K-12' },
                { value: 'other', label: 'Other' }
              ]}
              value={formData.school_type || ''}
              onChange={(value) => setFormData({...formData, school_type: value})}
              placeholder="Select school type"
            />
          </FormField>

          <FormField id="description" label="Description">
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Enter school description"
              rows={3}
            />
          </FormField>

          <FormField id="curriculum_type" label="Curriculum Types">
            <div className="space-y-2">
              {['national', 'cambridge', 'ib', 'american', 'other'].map(type => (
                <label key={type} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={(formData.curriculum_type || []).includes(type)}
                    onChange={(e) => {
                      const current = formData.curriculum_type || [];
                      if (e.target.checked) {
                        setFormData({...formData, curriculum_type: [...current, type]});
                      } else {
                        setFormData({...formData, curriculum_type: current.filter((t: string) => t !== type)});
                      }
                    }}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm capitalize">{type}</span>
                </label>
              ))}
            </div>
          </FormField>

          <FormField id="total_capacity" label="Total Capacity">
            <Input
              id="total_capacity"
              type="number"
              value={formData.total_capacity || ''}
              onChange={(e) => setFormData({...formData, total_capacity: parseInt(e.target.value)})}
              placeholder="Maximum student capacity"
            />
          </FormField>

          <FormField id="student_count" label="Current Students">
            <Input
              id="student_count"
              type="number"
              value={formData.student_count || ''}
              onChange={(e) => setFormData({...formData, student_count: parseInt(e.target.value)})}
              placeholder="Current number of students"
            />
          </FormField>
        </div>
      )}

      {activeTab === 'additional' && (
        <div className="space-y-4">
          <FormField id="campus_address" label="Campus Address">
            <Input
              id="campus_address"
              value={formData.campus_address || ''}
              onChange={(e) => setFormData({...formData, campus_address: e.target.value})}
              placeholder="Enter campus address"
            />
          </FormField>

          <FormField id="campus_city" label="Campus City">
            <Input
              id="campus_city"
              value={formData.campus_city || ''}
              onChange={(e) => setFormData({...formData, campus_city: e.target.value})}
              placeholder="Enter city"
            />
          </FormField>

          <FormField id="campus_state" label="Campus State">
            <Input
              id="campus_state"
              value={formData.campus_state || ''}
              onChange={(e) => setFormData({...formData, campus_state: e.target.value})}
              placeholder="Enter state/province"
            />
          </FormField>

          <FormField id="campus_postal_code" label="Postal Code">
            <Input
              id="campus_postal_code"
              value={formData.campus_postal_code || ''}
              onChange={(e) => setFormData({...formData, campus_postal_code: e.target.value})}
              placeholder="Enter postal code"
            />
          </FormField>

          <FormField id="established_date" label="Established Date">
            <Input
              id="established_date"
              type="date"
              value={formData.established_date || ''}
              onChange={(e) => setFormData({...formData, established_date: e.target.value})}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField id="academic_year_start" label="Academic Year Start">
              <Input
                id="academic_year_start"
                type="number"
                min="1"
                max="12"
                value={formData.academic_year_start || ''}
                onChange={(e) => setFormData({...formData, academic_year_start: parseInt(e.target.value)})}
                placeholder="Month (1-12)"
              />
            </FormField>

            <FormField id="academic_year_end" label="Academic Year End">
              <Input
                id="academic_year_end"
                type="number"
                min="1"
                max="12"
                value={formData.academic_year_end || ''}
                onChange={(e) => setFormData({...formData, academic_year_end: parseInt(e.target.value)})}
                placeholder="Month (1-12)"
              />
            </FormField>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Facilities</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.has_library || false}
                  onChange={(e) => setFormData({...formData, has_library: e.target.checked})}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <BookOpen className="w-4 h-4 text-gray-500" />
                <span className="text-sm">Has Library</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.has_laboratory || false}
                  onChange={(e) => setFormData({...formData, has_laboratory: e.target.checked})}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <FlaskConical className="w-4 h-4 text-gray-500" />
                <span className="text-sm">Has Laboratory</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.has_sports_facilities || false}
                  onChange={(e) => setFormData({...formData, has_sports_facilities: e.target.checked})}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <Dumbbell className="w-4 h-4 text-gray-500" />
                <span className="text-sm">Has Sports Facilities</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.has_cafeteria || false}
                  onChange={(e) => setFormData({...formData, has_cafeteria: e.target.checked})}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <Coffee className="w-4 h-4 text-gray-500" />
                <span className="text-sm">Has Cafeteria</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'contact' && (
        <div className="space-y-4">
          <FormField id="principal_name" label="Principal Name">
            <Input
              id="principal_name"
              value={formData.principal_name || ''}
              onChange={(e) => setFormData({...formData, principal_name: e.target.value})}
              placeholder="Enter principal name"
            />
          </FormField>

          <FormField id="principal_email" label="Principal Email" error={formErrors.principal_email}>
            <Input
              id="principal_email"
              type="email"
              value={formData.principal_email || ''}
              onChange={(e) => setFormData({...formData, principal_email: e.target.value})}
              placeholder="principal@school.com"
            />
          </FormField>

          <FormField id="principal_phone" label="Principal Phone">
            <Input
              id="principal_phone"
              type="tel"
              value={formData.principal_phone || ''}
              onChange={(e) => setFormData({...formData, principal_phone: e.target.value})}
              placeholder="+1 (555) 123-4567"
            />
          </FormField>

          <FormField id="teachers_count" label="Total Teachers">
            <Input
              id="teachers_count"
              type="number"
              value={formData.teachers_count || ''}
              onChange={(e) => setFormData({...formData, teachers_count: parseInt(e.target.value)})}
              placeholder="Number of teachers"
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
                  {schools.reduce((acc, s) => acc + (s.additional?.teachers_count || 0), 0)}
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
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <School className="w-5 h-5 text-green-600 dark:text-green-400" />
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
            {renderSchoolForm()}
          </div>
        </div>
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
            {renderSchoolForm()}
          </div>
        </div>
      </SlideInForm>
    </div>
  );
}, s) => acc + (s.student_count || 0), 0)}
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
                  {schools.reduce((acc