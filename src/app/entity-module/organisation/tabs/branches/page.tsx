/**
 * File: /src/app/entity-module/organisation/tabs/branches/page.tsx
 * 
 * Branches Management Tab Component
 * Handles branch data display, creation, and editing with comprehensive forms
 * 
 * Dependencies:
 *   - @/lib/supabase
 *   - @/lib/auth
 *   - @/contexts/UserContext
 *   - @/components/shared/* (SlideInForm, FormField, Button)
 *   - External: react, @tanstack/react-query, lucide-react, react-hot-toast
 * 
 * Database Tables:
 *   - branches & branches_additional
 *   - schools (for reference)
 */

'use client';

import React, { useState, useEffect, memo } from 'react';
import { 
  MapPin, Plus, Edit2, Trash2, Search, Filter, Building,
  Users, Clock, Calendar, Phone, Mail, User, CheckCircle2, 
  XCircle, AlertTriangle, School, Hash, Navigation, Home
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { getAuthenticatedUser } from '../../../../../lib/auth';
import { useUser } from '../../../../../contexts/UserContext';
import { SlideInForm } from '../../../../../components/shared/SlideInForm';
import { FormField, Input, Select, Textarea } from '../../../../../components/shared/FormField';
import { Button } from '../../../../../components/shared/Button';
import { ImageUpload } from '../../../../../components/shared/ImageUpload';

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

export interface BranchesTabProps {
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
          color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-700',
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
function BranchesTab({ companyId, refreshData }: BranchesTabProps) {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const authenticatedUser = getAuthenticatedUser();
  
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

  // Helper to get branch logo URL
  const getBranchLogoUrl = (path: string | null) => {
    if (!path) return null;
    
    // If it's already a full URL, return as is
    if (path.startsWith('http')) {
      return path;
    }
    
    // Construct Supabase storage URL
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/branch-logos/${path}`;
  };

  // ===== FETCH SCHOOLS FOR DROPDOWN =====
  const { data: schools = [] } = useQuery(
    ['schools-list', companyId],
    async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    { enabled: !!companyId }
  );

  // ===== FETCH BRANCHES =====
  const { data: branches = [], isLoading, refetch } = useQuery(
    ['branches', companyId],
    async () => {
      // First get all schools for this company
      const { data: schoolsData, error: schoolsError } = await supabase
        .from('schools')
        .select('id, name')
        .eq('company_id', companyId);
      
      if (schoolsError) throw schoolsError;
      
      const schoolIds = schoolsData?.map(s => s.id) || [];
      
      if (schoolIds.length === 0) return [];
      
      // Then get all branches for these schools
      const { data: branchesData, error: branchesError } = await supabase
        .from('branches')
        .select('id, name, code, school_id, status, address, notes, logo, created_at')
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
        
        return {
          ...branch,
          additional,
          school_name: school?.name || 'Unknown School',
          student_count: additional?.student_count || additional?.current_students || 0
        };
      }));
      
      return branchesWithAdditional;
    },
    {
      enabled: !!companyId,
      staleTime: 60 * 1000,
      cacheTime: 5 * 60 * 1000
    }
  );

  // ===== MUTATIONS =====
  const createBranchMutation = useMutation(
    async (data: any) => {
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
        queryClient.invalidateQueries(['branches']);
        if (refreshData) refreshData();
        toast.success('Branch created successfully');
        setShowCreateModal(false);
        setFormData({});
        setFormErrors({});
        setActiveTab('basic');
      },
      onError: (error: any) => {
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
        queryClient.invalidateQueries(['branches']);
        if (refreshData) refreshData();
        toast.success('Branch updated successfully');
        setShowEditModal(false);
        setSelectedBranch(null);
        setFormData({});
        setFormErrors({});
        setActiveTab('basic');
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to update branch');
      }
    }
  );

  // ===== HELPER FUNCTIONS =====
  const validateForm = () => {
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
  };

  const handleSubmit = (mode: 'create' | 'edit') => {
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }
    
    if (mode === 'create') {
      createBranchMutation.mutate(formData);
    } else {
      updateBranchMutation.mutate({ id: selectedBranch!.id, data: formData });
    }
  };

  const handleEdit = (branch: BranchData) => {
    const combinedData = {
      ...branch,
      ...(branch.additional || {})
    };
    setFormData(combinedData);
    setFormErrors({});
    setSelectedBranch(branch);
    setActiveTab('basic');
    setShowEditModal(true);
  };

  const handleCreate = () => {
    setFormData({ status: 'active' });
    setFormErrors({});
    setActiveTab('basic');
    setShowCreateModal(true);
  };

  // Filter branches based on search, status, and school
  const filteredBranches = branches.filter(branch => {
    const matchesSearch = branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         branch.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || branch.status === filterStatus;
    const matchesSchool = filterSchool === 'all' || branch.school_id === filterSchool;
    return matchesSearch && matchesStatus && matchesSchool;
  });

  // ===== RENDER FORM =====
  const renderBranchForm = () => (
    <>
      {activeTab === 'basic' && (
        <div className="space-y-4">
          <FormField id="school_id" label="School" required error={formErrors.school_id}>
            <Select
              id="school_id"
              options={schools.map(s => ({ value: s.id, label: s.name }))}
              value={formData.school_id || ''}
              onChange={(value) => setFormData({...formData, school_id: value})}
              placeholder="Select school"
            />
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
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
              value={formData.status || 'active'}
              onChange={(value) => setFormData({...formData, status: value})}
            />
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
              onChange={(value) => setFilterSchool(value)}
              options={[
                { value: 'all', label: 'All Schools' },
                ...schools.map(s => ({ value: s.id, label: s.name }))
              ]}
            />
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
            Add Branch
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Branches</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {branches.length}
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
                  {branches.filter(b => b.status === 'active').length}
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
                  {branches.reduce((acc, b) => acc + (b.student_count || 0), 0)}
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
                  {branches.reduce((acc, b) => acc + (b.additional?.teachers_count || 0), 0)}
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Branches List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading branches...</p>
          </div>
        ) : filteredBranches.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No branches found</p>
          </div>
        ) : (
          filteredBranches.map((branch) => (
            <div
              key={branch.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center overflow-hidden">
                    {branch.logo ? (
                      <img
                        src={getBranchLogoUrl(branch.logo)}
                        alt={`${branch.name} logo`}
                        className="w-full h-full object-contain"
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
                    <span className={`text-sm font-bold logo-fallback ${branch.logo ? 'hidden' : 'flex'} items-center justify-center w-full h-full text-purple-600 dark:text-purple-400`}>
                      {branch.code?.substring(0, 2).toUpperCase() || branch.name?.substring(0, 2).toUpperCase() || <MapPin className="w-5 h-5" />}
                    </span>
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
                      {branch.student_count || 0} students
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">
                      {branch.additional?.teachers_count || 0} teachers
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleEdit(branch)}
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
        title="Create Branch"
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
            {renderBranchForm()}
          </div>
        </div>
      </SlideInForm>

      {/* Edit Modal */}
      <SlideInForm
        title="Edit Branch"
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedBranch(null);
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
            {renderBranchForm()}
          </div>
        </div>
      </SlideInForm>
    </div>
  );
}

BranchesTab.displayName = 'BranchesTab';

export default BranchesTab;