import React, { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { DataTable } from '../../../../components/shared/DataTable';
import { FilterCard } from '../../../../components/shared/FilterCard';
import { SlideInForm } from '../../../../components/shared/SlideInForm';
import { FormField, Input, Select, Textarea } from '../../../../components/shared/FormField';
import { StatusBadge } from '../../../../components/shared/StatusBadge';
import { Button } from '../../../../components/shared/Button';
import { SearchableMultiSelect } from '../../../../components/shared/SearchableMultiSelect';
import { toast } from '../../../../components/shared/Toast';

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

interface FormState {
  name: string;
  code: string;
  company_id: string;
  school_id: string;
  address: string;
  notes: string;
  status: 'active' | 'inactive';
}

export default function BranchesTab() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const [formState, setFormState] = useState<FormState>({
    name: '',
    code: '',
    company_id: '',
    school_id: '',
    address: '',
    notes: '',
    status: 'active'
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
    
    setFormLoading(true);
    try {
      // First, fetch the school details to get the company_id
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select(`
          id,
          name,
          company_id,
          companies (
            id,
            name,
            regions (name)
          )
        `)
        .eq('id', editingBranch.school_id)
        .single();

      if (schoolError) throw schoolError;

      if (schoolData) {
        // Set the form state with the retrieved company_id
        setFormState({
          name: editingBranch.name,
          code: editingBranch.code || '',
          company_id: schoolData.company_id,
          school_id: editingBranch.school_id,
          address: editingBranch.address || '',
          notes: editingBranch.notes || '',
          status: editingBranch.status
        });

        // Fetch schools for this company to populate the school dropdown
        await fetchSchools([schoolData.company_id]);
      }
    } catch (error) {
      console.error('Error populating form for edit:', error);
      toast.error('Failed to load branch details');
    } finally {
      setFormLoading(false);
    }
  };

  const resetFormState = () => {
    setFormState({
      name: '',
      code: '',
      company_id: '',
      school_id: '',
      address: '',
      notes: '',
      status: 'active'
    });
    setSchools([]);
  };

  const fetchBranches = async () => {
    try {
      let query = supabase
        .from('branches')
        .select(`
          *,
          schools (
            name,
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
        ...branch,
        school_name: branch.schools?.name ?? 'Unknown School',
        company_name: branch.schools?.companies?.name ?? 'Unknown Company',
        region_name: branch.schools?.companies?.regions?.name ?? 'Unknown Region'
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
      const branchData = {
        name: formState.name.trim(),
        code: formState.code.trim(),
        school_id: formState.school_id,
        address: formState.address.trim() || null,
        notes: formState.notes.trim() || null,
        status: formState.status
      };

      let error;
      if (editingBranch) {
        ({ error } = await supabase
          .from('branches')
          .update(branchData)
          .eq('id', editingBranch.id));
      } else {
        ({ error } = await supabase
          .from('branches')
          .insert([branchData]));
      }

      if (error) throw error;

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
        loading={formLoading}
      >
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          {formErrors.form && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {formErrors.form}
            </div>
          )}

          {formLoading && (
            <div className="p-3 text-sm text-blue-600 bg-blue-50 rounded-md">
              Loading branch details...
            </div>
          )}

          <FormField
            id="name"
            label="Name"
            required
            error={formErrors.name}
          >
            <Input
              id="name"
              name="name"
              placeholder="Enter branch name"
              value={formState.name}
              onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
              disabled={formLoading}
            />
          </FormField>

          <FormField
            id="code"
            label="Code"
            error={formErrors.code}
          >
            <Input
              id="code"
              name="code"
              placeholder="Enter branch code"
              value={formState.code}
              onChange={(e) => setFormState(prev => ({ ...prev, code: e.target.value }))}
              disabled={formLoading}
            />
          </FormField>

          <FormField
            id="company"
            label="Company"
            required
          >
            <Select
              id="company"
              options={companies.map(company => ({
                value: company.id,
                label: `${company.name} (${company.region_name})`
              }))}
              value={formState.company_id}
              onChange={handleCompanyChange}
              disabled={formLoading}
            />
          </FormField>

          <FormField
            id="school_id"
            label="School"
            required
            error={formErrors.school_id}
          >
            <Select
              id="school_id"
              name="school_id"
              options={schools.map(school => ({
                value: school.id,
                label: school.name
              }))}
              value={formState.school_id}
              onChange={handleSchoolChange}
              disabled={!formState.company_id || formLoading}
            />
          </FormField>

          <FormField
            id="address"
            label="Address"
            error={formErrors.address}
          >
            <Textarea
              id="address"
              name="address"
              placeholder="Enter branch address"
              value={formState.address}
              onChange={(e) => setFormState(prev => ({ ...prev, address: e.target.value }))}
              rows={3}
              disabled={formLoading}
            />
          </FormField>

          <FormField
            id="notes"
            label="Notes"
            error={formErrors.notes}
          >
            <Textarea
              id="notes"
              name="notes"
              placeholder="Enter branch notes"
              value={formState.notes}
              onChange={(e) => setFormState(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              disabled={formLoading}
            />
          </FormField>

          <FormField
            id="status"
            label="Status"
            required
            error={formErrors.status}
          >
            <Select
              id="status"
              name="status"
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
              value={formState.status}
              onChange={(value) => setFormState(prev => ({ ...prev, status: value as 'active' | 'inactive' }))}
              disabled={formLoading}
            />
          </FormField>
        </form>
      </SlideInForm>
    </div>
  );
}