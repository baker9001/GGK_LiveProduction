/**
 * File: /home/project/src/app/system-admin/tenants/tabs/BranchesTab.tsx
 * 
 * FIXED: Resolved database field mapping errors
 * - Properly separates main branch fields from additional fields
 * - Excludes non-database fields (company_name, school_name, region_name) from DB operations
 * - Fixed code field to use empty string instead of null (code column is NOT NULL in DB)
 * - Maintains all original functionality including logo handling
 */

import React, { useState, useEffect } from 'react';
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
  const [branches, setBranches] = useState<Branch[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
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

  // ===== CORRECTED LOGO HELPER FUNCTIONS =====
  
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

  const fetchBranches = React.useCallback(async () => {
    try {
      setLoading(true);

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
        const { data: schoolsData, error: schoolsError } = await supabase
          .from('schools')
          .select('id')
          .in('company_id', filters.company_ids);
        
        if (schoolsError) throw schoolsError;
        const schoolIds = schoolsData.map(school => school.id);
        
        if (schoolIds.length > 0) {
          finalSchoolIds = finalSchoolIds.length > 0 
            ? finalSchoolIds.filter(id => schoolIds.includes(id))
            : schoolIds;
        } else {
          // No schools found for selected companies, return empty result
          setBranches([]);
          return;
        }
      }

      if (finalSchoolIds.length > 0) {
        query = query.in('school_id', finalSchoolIds);
      }

      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedData = data.map(branch => ({
        ...branch, // Basic branch data
        school_name: branch.schools?.name ?? 'Unknown School',
        company_name: branch.schools?.companies?.name ?? 'Unknown Company',
        region_name: branch.schools?.companies?.regions?.name ?? 'Unknown Region',
        additional: branch.additional // Include additional data
      }));

      setBranches(formattedData);
    } catch (error) {
      console.error('Error fetching branches:', error);
      toast.error('Failed to fetch branches');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchBranches();
    fetchCompanies();
  }, [fetchBranches]);

  useEffect(() => {
    if (filters.company_ids.length > 0) {
      fetchSchools(filters.company_ids);
    } else {
      setSchools([]);
    }
  }, [filters.company_ids]);

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
          ...editingBranch, // Copy basic fields
          company_id: schoolData.company_id, // Ensure company_id is set
          ...additionalData, // Copy additional fields
          // Override specific fields if needed, or ensure correct types
          student_capacity: additionalData?.student_capacity || undefined,
          current_students: additionalData?.current_students || undefined,
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

        // Fetch schools for this company to populate the school dropdown
        await fetchSchools([schoolData.company_id]);
      }
    } catch (error) {
      console.error('Error populating form for edit:', error);
    }
  };

  const resetFormState = () => {
    setFormState({
      name: '',
      code: '',
      company_id: '',
      school_id: '',
      status: 'active',
      // Additional fields reset
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
    setSchools([]);
  };

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
          regions (name)
        `)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;

      const formattedData = data.map(company => ({
        ...company,
        region_name: company.regions?.name ?? 'Unknown Region'
      }));

      setCompanies(formattedData);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Failed to fetch companies');
    }
  };

  const fetchSchools = async (companyIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select(`
          *,
          companies (name)
        `)
        .in('company_id', companyIds)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;

      const formattedData = data.map(school => ({
        ...school,
        company_name: school.companies?.name ?? 'Unknown Company'
      }));

      setSchools(formattedData);
    } catch (error) {
      console.error('Error fetching schools:', error);
      toast.error('Failed to fetch schools');
    }
  };

  // CORRECTED handleDelete function with logo deletion
  const handleDelete = async (branches: Branch[]) => {
    if (!confirm(`Are you sure you want to delete ${branches.length} branch(es)?`)) {
      return;
    }

    try {
      // Delete logos from storage first
      for (const branch of branches) {
        await deleteLogoFromStorage(branch.logo);
      }

      // Then delete branches from database
      const { error } = await supabase
        .from('branches')
        .delete()
        .in('id', branches.map(b => b.id));

      if (error) throw error;
      await fetchBranches();
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
      school_id: ''
    }));
    if (companyId) {
      fetchSchools([companyId]);
    } else {
      setSchools([]);
    }
  };

  const handleSchoolChange = (schoolId: string) => {
    setFormState(prev => ({ ...prev, school_id: schoolId }));
  };

  // FIXED handleSubmit function - properly excludes non-database fields
  const handleSubmit = async () => {
    setFormErrors({});

    const errors: Record<string, string> = {};
    if (!formState.name.trim()) {
      errors.name = 'Name is required';
    }
    if (!formState.school_id) {
      errors.school_id = 'School is required';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      // Main branch data - only fields that exist in branches table
      const mainBranchData = {
        name: formState.name.trim(),
        code: formState.code?.trim() || '',  // Use empty string instead of null (code is NOT NULL in DB)
        school_id: formState.school_id,
        status: formState.status,
        logo: formState.logo || null,
        address: formState.address || null,
        notes: formState.notes || null,
      };

      // Additional data - only fields that exist in branches_additional table
      const additionalData: any = {
        student_capacity: formState.student_capacity || null,
        current_students: formState.current_students || null,
        student_count: formState.student_count || null,
        teachers_count: formState.teachers_count || null,
        active_teachers_count: formState.active_teachers_count || null,
        branch_head_name: formState.branch_head_name || null,
        branch_head_email: formState.branch_head_email || null,
        branch_head_phone: formState.branch_head_phone || null,
        building_name: formState.building_name || null,
        floor_details: formState.floor_details || null,
        opening_time: formState.opening_time || null,
        closing_time: formState.closing_time || null,
        working_days: formState.working_days || null
      };

      let branchId;
      if (editingBranch) {
        // Update existing branch
        const { data, error } = await supabase
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

      // Remove any null/undefined values from additionalData to avoid issues
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
        // Just notify the user about the additional data issue
        toast.warning('Branch saved but some additional data could not be saved.');
      }

      await fetchBranches();
      setIsFormOpen(false);
      setEditingBranch(null);
      resetFormState();
      toast.success(`Branch ${editingBranch ? 'updated' : 'created'} successfully`);
    } catch (error) {
      console.error('Error saving branch:', error);
      setFormErrors({
        form: 'Failed to save branch. Please try again.'
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
        <h2 className="text-lg font-semibold text-gray-900">Branches</h2>
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
        onApply={fetchBranches}
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
              school_ids: []
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
        loading={loading}
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
        {formErrors.form && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
            {formErrors.form}
          </div>
        )}

        <BranchFormContent
          formData={formState}
          setFormData={setFormState}
          formErrors={formErrors}
          setFormErrors={setFormErrors}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          schools={schools}
          companies={companies}
          isEditing={!!editingBranch}
          onCompanyChange={handleCompanyChange}
        />
      </SlideInForm>
    </div>
  );
}