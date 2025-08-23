import React, { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { DataTable } from '@/components/shared/DataTable';
import { FilterCard } from '@/components/shared/FilterCard';
import { SlideInForm } from '@/components/shared/SlideInForm';
import { Button } from '@/components/shared/Button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SearchableMultiSelect } from '@/components/shared/SearchableMultiSelect';
import { toast } from '@/components/shared/Toast';
import { BranchFormContent } from '@/components/forms/BranchFormContent';

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
  school_id: string;
  status: 'active' | 'inactive';
}

export default function BranchesTab() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
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
  });
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    company_ids: [],
    school_ids: [],
    status: []
  });

  useEffect(() => {
    fetchBranches();
    fetchCompanies();
  }, [filters]);

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
    });
    setSchools([]);
  };

  const fetchBranches = async () => {
    try {
      let query = supabase
        .from('branches')
        .select(` 
          id, name, code, school_id, status, address, notes, logo, created_at,
          schools (
            name,
            id,
            companies (
              name,
              regions (name)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
      }

      if (filters.school_ids.length > 0) {
        query = query.in('school_id', filters.school_ids);
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

  const handleDelete = async (branches: Branch[]) => {
    if (!confirm(`Are you sure you want to delete ${branches.length} branch(es)?`)) {
      return;
    }

    try {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      // Separate main branch data from additional data
      const { 
        name, code, school_id, status, logo, address, notes, // Main branch fields
        ...additionalFields // All other fields go to additional
      } = formState;

      const mainBranchData = {
        name: name.trim(),
        code: code.trim(),
        school_id: school_id,
        status: status,
        logo: logo || null,
        address: address || null,
        notes: notes || null,
      };

      let branchId;
      if (editingBranch) {
        const { data, error } = await supabase
          .from('branches')
          .update(mainBranchData)
          .eq('id', editingBranch.id);
        if (error) throw error;
        branchId = editingBranch.id;
      } else {
        const { data, error } = await supabase
          .from('branches')
          .insert([mainBranchData])
          .select('id')
          .single();
        if (error) throw error;
        branchId = data.id;
      }

      // Handle additional data (upsert)
      const { error: additionalError } = await supabase
        .from('branches_additional')
        .upsert({ ...additionalFields, branch_id: branchId }, { onConflict: 'branch_id' });

      if (additionalError) {
        console.error('Error saving additional branch data:', additionalError);
        toast.error('Failed to save additional branch data.');
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
    }
  };

  const columns = [
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
        onSave={() => {
          formRef.current?.requestSubmit();
        }}
        loading={false}
      >
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
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
            isEditing={!!editingBranch}
            onCompanyChange={handleCompanyChange}
          />
        </form>
      </SlideInForm>
    </div>
  );
}