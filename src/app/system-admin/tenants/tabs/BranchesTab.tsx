/**
 * File: /home/project/src/app/system-admin/tenants/tabs/BranchesTab.tsx
 * 
 * FINAL VERSION - Complete System Admin Branch Management
 * 
 * Features:
 * - System admins must select Company → School → Branch details
 * - Properly handles database field mapping
 * - Includes logo management with storage cleanup
 * - Manages branches_additional table data
 * - Prevents duplicate form fields with BranchFormContent
 * 
 * Fixed Issues:
 * - Added Company dropdown for system admin flow
 * - School dropdown only appears after company selection
 * - Proper validation for all required fields
 * - Clear user guidance messages
 * - Prevents field duplication with BranchFormContent
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ImageOff } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { DataTable } from '@/components/shared/DataTable';
import { FilterCard } from '@/components/shared/FilterCard';
import { SlideInForm } from '@/components/shared/SlideInForm';
import { Button } from '@/components/shared/Button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SearchableMultiSelect } from '@/components/shared/SearchableMultiSelect';
import { toast } from '@/components/shared/Toast';
import { BranchFormContent } from '@/components/forms/BranchFormContent';
import { FormField, Input } from '@/components/shared/FormField';

interface FilterState {
  search: string;
  company_ids: string[];
  school_ids: string[];
  status: string[];
}

type Branch = {
  id: string;
  name: string;
  code: string | null;
  school_id: string;
  school_name: string;
  company_name: string;
  region_name: string;
  address: string | null;
  notes: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  additional?: BranchAdditional;
  logo?: string;
};

type Company = {
  id: string;
  name: string;
  region_id: string;
  region_name: string;
  status: 'active' | 'inactive';
};

type School = {
  id: string;
  name: string;
  company_id: string;
  company_name: string;
  status: 'active' | 'inactive';
};

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
  logo?: string;
}

interface FormState extends BranchAdditional {
  name: string;
  code: string;
  company_id: string;
  school_id: string;
  status: 'active' | 'inactive';
  address?: string;
  notes?: string;
}

export default function BranchesTab() {
  const queryClient = useQueryClient();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('basic');
  const [formState, setFormState] = useState<FormState>({
    name: '',
    code: '',
    company_id: '',
    school_id: '',
    status: 'active',
    // Additional fields
    student_capacity: undefined,
    current_students: undefined,
    teachers_count: undefined,
    active_teachers_count: undefined,
    branch_head_name: '',
    branch_head_email: '',
    branch_head_phone: '',
    building_name: '',
    floor_details: '',
    opening_time: '',
    closing_time: '',
    working_days: [],
    branch_id: ''
  });
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    company_ids: [],
    school_ids: [],
    status: []
  });

  // ===== LOGO HELPER FUNCTIONS =====
  
  // Get logo URL - handles both old and new path formats
  const getLogoUrl = (path: string | null) => {
    if (!path) return null;
    
    // If path is already a full URL, return it
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    // Get public URL from Supabase
    const { data } = supabase.storage
      .from('branch-logos')
      .getPublicUrl(path);
    
    return data?.publicUrl || null;
  };

  // Delete logo from storage - handles both old and new formats
  const deleteLogoFromStorage = async (path: string | null): Promise<void> => {
    if (!path) return;
    
    try {
      // Try to delete with the stored path
      const { error } = await supabase.storage
        .from('branch-logos')
        .remove([path]);
      
      if (error) {
        console.warn(`Failed to delete logo at: ${path}`, error);
        
        // If path has 'branches/' prefix, try without it
        if (path.startsWith('branches/')) {
          const fileNameOnly = path.replace('branches/', '');
          const { error: retryError } = await supabase.storage
            .from('branch-logos')
            .remove([fileNameOnly]);
          
          if (retryError) {
            console.error(`Also failed to delete at: ${fileNameOnly}`, retryError);
          }
        } 
        // If path doesn't have prefix, try with it (for old files)
        else {
          const withPrefix = `branches/${path}`;
          const { error: retryError } = await supabase.storage
            .from('branch-logos')
            .remove([withPrefix]);
          
          if (retryError) {
            console.error(`Also failed to delete at: ${withPrefix}`, retryError);
          }
        }
      }
    } catch (error) {
      console.error('Error deleting logo:', error);
    }
  };

  // Fetch companies with React Query
  const { data: companies = [] } = useQuery<Company[]>(
    ['companies-for-branches'],
    async () => {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
          regions (name)
        `)
        .eq('status', 'active')
        .order('name');

      if (error) {
        console.error('Error fetching companies:', error);
        throw error;
      }

      return data.map(company => ({
        ...company,
        region_name: company.regions?.name ?? 'Unknown Region'
      }));
    },
    {
      staleTime: 10 * 60 * 1000,
      onError: (error) => {
        console.error('Error fetching companies:', error);
        toast.error('Failed to fetch companies');
      }
    }
  );

  // Fetch schools based on selected companies with React Query
  const { data: schools = [] } = useQuery<School[]>(
    ['schools-for-branches', filters.company_ids],
    async () => {
      if (filters.company_ids.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from('schools')
        .select(`
          *,
          companies (name)
        `)
        .in('company_id', filters.company_ids)
        .eq('status', 'active')
        .order('name');

      if (error) {
        console.error('Error fetching schools:', error);
        throw error;
      }

      return data.map(school => ({
        ...school,
        company_name: school.companies?.name ?? 'Unknown Company'
      }));
    },
    {
      enabled: filters.company_ids.length > 0,
      staleTime: 5 * 60 * 1000,
      onError: (error) => {
        console.error('Error fetching schools:', error);
        toast.error('Failed to fetch schools');
      }
    }
  );

  // Fetch branches with React Query
  const {
    data: branches = [],
    isLoading,
    isFetching,
    error: branchesError
  } = useQuery<Branch[]>(
    ['branches', filters],
    async () => {
      console.log('=== BRANCHES QUERY DEBUG START ===');

      // Check authentication status
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Auth session exists:', !!session);
      console.log('Auth user ID:', session?.user?.id);

      // Check if user is admin
      if (session?.user?.id) {
        const { data: adminCheck, error: adminCheckError } = await supabase
          .rpc('is_admin_user', { user_id: session.user.id });
        console.log('Is admin user:', adminCheck);
        if (adminCheckError) console.error('Admin check error:', adminCheckError);
      }

      let query = supabase
        .from('branches')
        .select(`
          id, name, code, school_id, status, address, notes, logo, created_at,
          additional:branches_additional (*),
          schools (
            name,
            id,
            companies (
              name,
              regions (name)
            )
          )
        `);

      // Apply filters
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
      }

      let finalSchoolIds: string[] = [];

      if (filters.school_ids.length > 0) {
        finalSchoolIds = filters.school_ids;
      }

      // If companies are selected, we need to filter by schools that belong to those companies
      if (filters.company_ids.length > 0) {
        console.log('Fetching schools for companies:', filters.company_ids);
        const { data: schoolsData, error: schoolsError } = await supabase
          .from('schools')
          .select('id')
          .in('company_id', filters.company_ids);

        if (schoolsError) {
          console.error('Error fetching schools for filter:', schoolsError);
          console.error('Error details:', {
            message: schoolsError.message,
            details: schoolsError.details,
            hint: schoolsError.hint,
            code: schoolsError.code
          });
          throw schoolsError;
        }
        const schoolIds = schoolsData.map(school => school.id);

        if (schoolIds.length > 0) {
          finalSchoolIds = finalSchoolIds.length > 0
            ? finalSchoolIds.filter(id => schoolIds.includes(id))
            : schoolIds;
        } else {
          // No schools found for selected companies, return empty result
          console.log('No schools found for selected companies');
          return [];
        }
      }

      if (finalSchoolIds.length > 0) {
        query = query.in('school_id', finalSchoolIds);
      }

      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      console.log('Executing branches query...');
      const { data, error } = await query;

      if (error) {
        console.error('❌ BRANCHES QUERY ERROR:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('✅ Branches query successful. Count:', data?.length || 0);
      console.log('=== BRANCHES QUERY DEBUG END ===');

      return data.map(branch => ({
        ...branch,
        school_name: branch.schools?.name ?? 'Unknown School',
        company_name: branch.schools?.companies?.name ?? 'Unknown Company',
        region_name: branch.schools?.companies?.regions?.name ?? 'Unknown Region',
        additional: branch.additional
      }));
    },
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000,
      refetchInterval: 30 * 1000,
      onError: (error: any) => {
        console.error('❌ BRANCHES QUERY FAILED:', error);
        const errorMessage = error?.message || 'Unknown error';
        const errorCode = error?.code || 'N/A';
        const errorDetails = error?.details || 'No details available';

        console.error('Full error object:', JSON.stringify(error, null, 2));

        let userMessage = 'Failed to fetch branches';
        if (errorCode === 'PGRST301' || errorMessage.includes('policy')) {
          userMessage = 'Access denied. Please ensure you have proper permissions.';
        } else if (errorCode === '42501') {
          userMessage = 'Permission denied. Contact your administrator.';
        }

        toast.error(`${userMessage} (Code: ${errorCode})`);
      }
    }
  );

  useEffect(() => {
    if (editingBranch) {
      populateFormForEdit();
    } else {
      resetFormState();
    }
  }, [editingBranch]);

  const populateFormForEdit = async () => {
    if (!editingBranch) return;

    try {
      // First, fetch the school details to get the company_id
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select(`
          id,
          company_id,
          companies (id, name)
        `)
        .eq('id', editingBranch.school_id)
        .single();

      if (schoolError) throw schoolError;

      // Fetch additional data for the branch
      const { data: additionalData, error: additionalError } = await supabase
        .from('branches_additional')
        .select('*')
        .eq('branch_id', editingBranch.id)
        .maybeSingle();

      if (additionalError) {
        console.error('Error fetching additional branch data:', additionalError);
      }

      if (schoolData) {
        // Set the form state with the retrieved company_id
        setFormState({
          name: editingBranch.name || '',
          code: editingBranch.code || '',
          school_id: editingBranch.school_id,
          company_id: schoolData.company_id, // Ensure company_id is set
          status: editingBranch.status,
          address: editingBranch.address || '',
          notes: editingBranch.notes || '',
          // Additional fields from branches_additional
          student_capacity: additionalData?.student_capacity || undefined,
          current_students: additionalData?.current_students || undefined,
          student_count: additionalData?.student_count || undefined,
          teachers_count: additionalData?.teachers_count || undefined,
          active_teachers_count: additionalData?.active_teachers_count || undefined,
          opening_time: additionalData?.opening_time || '',
          closing_time: additionalData?.closing_time || '',
          working_days: additionalData?.working_days || [],
          branch_head_name: additionalData?.branch_head_name || '',
          branch_head_email: additionalData?.branch_head_email || '',
          branch_head_phone: additionalData?.branch_head_phone || '',
          building_name: additionalData?.building_name || '',
          floor_details: additionalData?.floor_details || '',
          logo: editingBranch.logo || '',
          branch_id: editingBranch.id
        });

        // Set filters to trigger school fetching
        setFilters(prev => ({ ...prev, company_ids: [schoolData.company_id] }));
      }
    } catch (error) {
      console.error('Error populating form for edit:', error);
      toast.error('Failed to load branch data for editing');
    }
  };

  const resetFormState = () => {
    setFormState({
      name: '',
      code: '',
      company_id: '',
      school_id: '',
      status: 'active',
      address: '',
      notes: '',
      // Additional fields reset
      student_capacity: undefined,
      current_students: undefined,
      student_count: undefined,
      teachers_count: undefined,
      active_teachers_count: undefined,
      branch_head_name: '',
      branch_head_email: '',
      branch_head_phone: '',
      building_name: '',
      floor_details: '',
      opening_time: '',
      closing_time: '',
      working_days: [],
      branch_id: '',
      logo: ''
    });
    setActiveTab('basic'); // Reset to basic tab
  };

  const handleDelete = async (branches: Branch[]) => {
    if (!confirm(`Are you sure you want to delete ${branches.length} branch(es)?`)) {
      return;
    }

    try {
      // Delete logos from storage first
      for (const branch of branches) {
        if (branch.logo) {
          await deleteLogoFromStorage(branch.logo);
        }
      }

      // Then delete branches from database (cascade will handle branches_additional)
      const { error } = await supabase
        .from('branches')
        .delete()
        .in('id', branches.map(b => b.id));

      if (error) throw error;

      queryClient.invalidateQueries(['branches']);
      toast.success('Branch(es) deleted successfully');
    } catch (error) {
      console.error('Error deleting branches:', error);
      toast.error('Failed to delete branch(es)');
    }
  };

  const handleCompanyChange = (companyId: string) => {
    setFormState(prev => ({
      ...prev,
      company_id: companyId,
      school_id: '' // Reset school when company changes
    }));

    // Update filters to trigger school fetching via React Query
    if (companyId) {
      setFilters(prev => ({ ...prev, company_ids: [companyId] }));
    } else {
      setFilters(prev => ({ ...prev, company_ids: [] }));
    }
  };

  const handleSchoolChange = (schoolId: string) => {
    setFormState(prev => ({ ...prev, school_id: schoolId }));
  };

  const handleSubmit = async () => {
    // Clear previous errors
    setFormErrors({});

    // Validate required fields
    const errors: Record<string, string> = {};
    
    if (!formState.name.trim()) {
      errors.name = 'Branch name is required';
    }
    
    if (!formState.company_id) {
      errors.company_id = 'Company is required';
    }
    
    if (!formState.school_id) {
      errors.school_id = 'School is required';
    }

    // If there are validation errors, set them and return
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Prepare main branch data - only fields that exist in branches table
      const mainBranchData = {
        name: formState.name.trim(),
        code: formState.code?.trim() || '', // Use empty string instead of null (code is NOT NULL in DB)
        school_id: formState.school_id,
        status: formState.status,
        logo: formState.logo || null,
        address: formState.address?.trim() || null,
        notes: formState.notes?.trim() || null,
      };

      // Prepare additional data - only fields that exist in branches_additional table
      const additionalData: any = {
        student_capacity: formState.student_capacity || null,
        current_students: formState.current_students || null,
        student_count: formState.student_count || null,
        teachers_count: formState.teachers_count || null,
        active_teachers_count: formState.active_teachers_count || null,
        branch_head_name: formState.branch_head_name?.trim() || null,
        branch_head_email: formState.branch_head_email?.trim() || null,
        branch_head_phone: formState.branch_head_phone?.trim() || null,
        building_name: formState.building_name?.trim() || null,
        floor_details: formState.floor_details?.trim() || null,
        opening_time: formState.opening_time || null,
        closing_time: formState.closing_time || null,
        working_days: formState.working_days?.length > 0 ? formState.working_days : null
      };

      let branchId: string;
      
      if (editingBranch) {
        // Update existing branch
        const { error } = await supabase
          .from('branches')
          .update(mainBranchData)
          .eq('id', editingBranch.id);
          
        if (error) throw error;
        branchId = editingBranch.id;
      } else {
        // Create new branch
        const { data, error } = await supabase
          .from('branches')
          .insert([mainBranchData])
          .select('id')
          .single();
          
        if (error) throw error;
        branchId = data.id;
      }

      // Add branch_id to additional data
      additionalData.branch_id = branchId;

      // Remove any undefined values from additionalData
      Object.keys(additionalData).forEach(key => {
        if (additionalData[key] === undefined) {
          delete additionalData[key];
        }
      });

      // Upsert additional data (insert or update)
      const { error: additionalError } = await supabase
        .from('branches_additional')
        .upsert(additionalData, { onConflict: 'branch_id' });

      if (additionalError) {
        console.error('Error saving additional branch data:', additionalError);
        // Don't throw here - the main branch was saved successfully
        toast.warning('Branch saved but some additional data could not be saved.');
      } else {
        toast.success(`Branch ${editingBranch ? 'updated' : 'created'} successfully`);
      }

      // Refresh the branches list using React Query
      queryClient.invalidateQueries(['branches']);

      // Close the form and reset state
      setIsFormOpen(false);
      setEditingBranch(null);
      resetFormState();
      setFormErrors({});

    } catch (error) {
      console.error('Error saving branch:', error);
      setFormErrors({
        form: 'Failed to save branch. Please check your input and try again.'
      });
      toast.error('Failed to save branch');
    }
  };

  const columns = [
    {
      id: 'logo',
      header: 'Logo',
      enableSorting: false,
      cell: (row: Branch) => (
        <div className="w-10 h-10 flex items-center justify-center">
          {row.logo ? (
            <img
              src={getLogoUrl(row.logo)}
              alt={`${row.name} logo`}
              className="w-10 h-10 object-contain rounded-md"
              onError={(e) => {
                console.error('Failed to load logo:', row.logo);
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center">
              <ImageOff className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'name',
      header: 'Name',
      accessorKey: 'name',
      enableSorting: true,
    },
    {
      id: 'code',
      header: 'Code',
      accessorKey: 'code',
      enableSorting: true,
      cell: (row: Branch) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {row.code || '-'}
        </span>
      ),
    },
    {
      id: 'school',
      header: 'School',
      accessorKey: 'school_name',
      enableSorting: true,
    },
    {
      id: 'company',
      header: 'Company',
      accessorKey: 'company_name',
      enableSorting: true,
    },
    {
      id: 'region',
      header: 'Region',
      accessorKey: 'region_name',
      enableSorting: true,
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: true,
      cell: (row: Branch) => (
        <StatusBadge status={row.status} />
      ),
    },
    {
      id: 'created_at',
      header: 'Created At',
      accessorKey: 'created_at',
      enableSorting: true,
      cell: (row: Branch) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Branches</h2>
        <Button
          onClick={() => {
            setEditingBranch(null);
            setIsFormOpen(true);
          }}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add Branch
        </Button>
      </div>

      <FilterCard
        title="Filters"
        onApply={() => {}} // No need for explicit apply with React Query
        onClear={() => {
          setFilters({
            search: '',
            company_ids: [],
            school_ids: [],
            status: []
          });
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FormField
            id="search"
            label="Search"
          >
            <Input
              id="search"
              placeholder="Search by name or code..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </FormField>

          <SearchableMultiSelect
            label="Company"
            options={companies.map(c => ({
              value: c.id,
              label: `${c.name} (${c.region_name})`
            }))}
            selectedValues={filters.company_ids}
            onChange={(values) => setFilters({ 
              ...filters, 
              company_ids: values,
              school_ids: [] // Reset school filter when company changes
            })}
          />

          <SearchableMultiSelect
            label="School"
            options={schools.map(s => ({
              value: s.id,
              label: s.name
            }))}
            selectedValues={filters.school_ids}
            onChange={(values) => setFilters({ ...filters, school_ids: values })}
            disabled={filters.company_ids.length === 0}
          />

          <SearchableMultiSelect
            label="Status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
            selectedValues={filters.status}
            onChange={(values) => setFilters({ ...filters, status: values })}
          />
        </div>
      </FilterCard>

      <DataTable
        data={branches}
        columns={columns}
        keyField="id"
        caption="List of branches with their school associations and status"
        ariaLabel="Branches data table"
        loading={isLoading}
        isFetching={isFetching}
        onEdit={(branch) => {
          setEditingBranch(branch);
          setIsFormOpen(true);
        }}
        onDelete={handleDelete}
        emptyMessage="No branches found"
      />

      <SlideInForm
        key={editingBranch?.id || 'new'}
        title={editingBranch ? 'Edit Branch' : 'Create Branch'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingBranch(null);
          resetFormState();
          setFormErrors({});
        }}
        onSave={handleSubmit}
        loading={false}
      >
        <div className="space-y-4">
          {/* Form-level error message */}
          {formErrors.form && (
            <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md">
              {formErrors.form}
            </div>
          )}

          {/* System Admin specific fields: Company and School selection */}
          {/* These fields are NOT in BranchFormContent as that's for school admins */}
          
          {/* Company Selection */}
          <FormField
            id="company_id"
            label="Company"
            required
            error={formErrors.company_id}
          >
            <select
              id="company_id"
              value={formState.company_id}
              onChange={(e) => handleCompanyChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#99C93B] dark:bg-gray-700 dark:text-white"
              disabled={!!editingBranch} // Disable company change when editing
            >
              <option value="">Select a company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name} ({company.region_name})
                </option>
              ))}
            </select>
          </FormField>

          {/* School Selection - only show when company is selected */}
          {formState.company_id && (
            <FormField
              id="school_id"
              label="School"
              required
              error={formErrors.school_id}
            >
              <select
                id="school_id"
                value={formState.school_id}
                onChange={(e) => handleSchoolChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#99C93B] dark:bg-gray-700 dark:text-white"
                disabled={!!editingBranch} // Disable school change when editing
              >
                <option value="">Select a school</option>
                {schools.length > 0 ? (
                  schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))
                ) : (
                  <option disabled>No active schools found for selected company</option>
                )}
              </select>
            </FormField>
          )}

          {/* Show BranchFormContent only after both company and school are selected */}
          {formState.company_id && formState.school_id ? (
            <BranchFormContent
              formData={formState}
              setFormData={setFormState}
              formErrors={formErrors}
              setFormErrors={setFormErrors}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              // Pass empty arrays to prevent BranchFormContent from showing duplicate dropdowns
              schools={[]}
              companies={[]}
              isEditing={!!editingBranch}
              // Pass no-op function since we handle company change above
              onCompanyChange={() => {}}
              // This prop tells BranchFormContent to skip school/company fields
              hideSchoolSelection={true}
            />
          ) : (
            <div className="space-y-4">
              {/* Guidance messages when company/school not selected */}
              {!formState.company_id && (
                <div className="p-4 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <p className="font-medium mb-1">Step 1: Select Company</p>
                  <p>Please select a company to see available schools for branch creation.</p>
                </div>
              )}

              {formState.company_id && !formState.school_id && schools.length === 0 && (
                <div className="p-4 text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                  <p className="font-medium mb-1">No Schools Available</p>
                  <p>The selected company has no active schools. Please create a school first before adding branches.</p>
                </div>
              )}

              {formState.company_id && !formState.school_id && schools.length > 0 && (
                <div className="p-4 text-sm text-[#99C93B] dark:text-[#AAD775] bg-[#E8F5DC] dark:bg-[#5D7E23]/20 rounded-md">
                  <p className="font-medium mb-1">Step 2: Select School</p>
                  <p>Please select a school to continue with branch creation.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </SlideInForm>
    </div>
  );
}