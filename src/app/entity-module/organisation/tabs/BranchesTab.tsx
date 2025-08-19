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
import { BranchFormContent } from '../../../../components/forms/BranchFormContent';

interface FilterState {
  search: string;
  company_ids: string[];
  school_ids: string[];
  status: string[];
}

interface Branch {
  id: string;
  name: string;
  code: string;
  school_id: string;
  address: string;
  notes: string;
  status: 'active' | 'inactive';
  created_at: string;
  additional?: any; // To hold additional data
  student_count?: number;
}

interface Company {
  id: string;
  name: string;
  region_name: string;
  status: 'active' | 'inactive';
}

interface School {
  id: string;
  name: string;
  company_id: string;
  company_name: string;
  status: 'active' | 'inactive';
}

interface BranchFormData {
  name: string;
  code: string;
  school_id: string;
  status: 'active' | 'inactive';
  address: string;
  notes: string;
  logo: string;
  student_capacity: number;
  current_students: number;
  teachers_count: number;
  active_teachers_count: number;
  branch_head_name: string;
  branch_head_email: string;
  branch_head_phone: string;
  building_name: string;
  floor_details: string;
  opening_time: string;
  closing_time: string;
  working_days: string[];
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
  const [formData, setFormData] = useState<Partial<BranchFormData>>({});
  const [activeTab, setActiveTab] = useState<'basic' | 'additional' | 'contact'>('basic');
  
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    company_ids: [],
    school_ids: [],
    status: []
  });

  // Helper to get branch logo URL
  const getBranchLogoUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith('http')) {
      return path;
    }
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/branch-logos/${path}`;
  };

  const resetFormData = () => {
    setFormData({
      name: '',
      code: '',
      school_id: '',
      status: 'active',
      address: '',
      notes: '',
      logo: '',
      student_capacity: 0,
      current_students: 0,
      teachers_count: 0,
      active_teachers_count: 0,
      branch_head_name: '',
      branch_head_email: '',
      branch_head_phone: '',
      building_name: '',
      floor_details: '',
      opening_time: '',
      closing_time: '',
      working_days: []
    });
    setSchools([]);
    setFormErrors({});
    setActiveTab('basic');
  };

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
      resetFormData();
    }
  }, [editingBranch]);

  const populateFormForEdit = async () => {
    if (!editingBranch) return;

    setFormLoading(true);

    try {
      // Fetch school details to get company_id
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select(`
          id,
          name,
          company_id
        `)
        .eq('id', editingBranch.school_id)
        .single();

      if (schoolError) throw schoolError;

      // Fetch additional branch data
      const { data: additionalData, error: additionalError } = await supabase
        .from('branches_additional')
        .select('*')
        .eq('branch_id', editingBranch.id)
        .maybeSingle();

      if (additionalError) throw additionalError;

      if (schoolData) {
        // Combine all data for the form
        setFormData({
          ...editingBranch,
          company_id: schoolData.company_id,
          ...additionalData
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
          ),
          branches_additional (*)
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
        region_name: branch.schools?.companies?.regions?.name ?? 'Unknown Region',
        additional: Array.isArray(branch.branches_additional) 
          ? branch.branches_additional[0] 
          : branch.branches_additional || {},
        student_count: branch.branches_additional?.[0]?.student_count || 
                       branch.branches_additional?.student_count || 
                       branch.branches_additional?.current_students || 0
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
          id,
          name,
          company_id,
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

  const handleSubmit = async (mode: 'create' | 'edit') => {
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setFormLoading(true);

    try {
      // Prepare main data
      const mainData = {
        name: formData.name,
        code: formData.code,
        school_id: formData.school_id,
        status: formData.status,
        address: formData.address,
        notes: formData.notes,
        logo: formData.logo
      };

      // Prepare additional data
      const additionalData: any = {
        branch_id: editingBranch?.id, // Will be set after main branch creation for 'create' mode
        student_capacity: formData.student_capacity,
        current_students: formData.current_students,
        teachers_count: formData.teachers_count,
        active_teachers_count: formData.active_teachers_count,
        branch_head_name: formData.branch_head_name,
        branch_head_email: formData.branch_head_email,
        branch_head_phone: formData.branch_head_phone,
        building_name: formData.building_name,
        floor_details: formData.floor_details,
        opening_time: formData.opening_time,
        closing_time: formData.closing_time,
        working_days: formData.working_days
      };

      let branchId = editingBranch?.id;

      if (mode === 'create') {
        // Create main branch record
        const { data: newBranch, error: branchError } = await supabase
          .from('branches')
          .insert([mainData])
          .select()
          .single();
        
        if (branchError) throw branchError;
        branchId = newBranch.id;
        additionalData.branch_id = branchId;
      } else {
        // Update main branch record
        const { error: branchError } = await supabase
          .from('branches')
          .update(mainData)
          .eq('id', branchId);
        
        if (branchError) throw branchError;
      }

      // Handle additional data (update or insert)
      if (branchId) {
        const { error: updateError } = await supabase
          .from('branches_additional')
          .update(additionalData)
          .eq('branch_id', branchId);
        
        if (updateError?.code === 'PGRST116') { // No rows updated, so insert
          const { error: insertError } = await supabase
            .from('branches_additional')
            .insert([additionalData]);
          if (insertError) console.error('Error inserting additional branch data:', insertError);
        } else if (updateError) {
          console.error('Error updating additional branch data:', updateError);
        }
      }

      await fetchBranches();
      setIsFormOpen(false);
      setEditingBranch(null);
      resetFormData();
      toast.success(`Branch ${mode === 'edit' ? 'updated' : 'created'} successfully`);
    } catch (error) {
      console.error('Error saving branch:', error);
      setFormErrors({
        form: 'Failed to save branch. Please try again.'
      });
      toast.error('Failed to save branch');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingBranch(null);
    setIsFormOpen(true);
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
          onClick={handleCreate}
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
        onEdit={handleEdit}
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
          resetFormData();
        }}
        onSave={() => handleSubmit(editingBranch ? 'edit' : 'create')}
        loading={formLoading}
      >
        <BranchFormContent
          formData={formData}
          setFormData={setFormData}
          formErrors={formErrors}
          setFormErrors={setFormErrors}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          schools={schools}
          isEditing={!!editingBranch}
        />
      </SlideInForm>
    </div>
  );
}