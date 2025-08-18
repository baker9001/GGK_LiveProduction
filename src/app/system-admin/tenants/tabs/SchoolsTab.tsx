import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ImageOff } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '../../../../lib/supabase';
import { DataTable } from '../../../../components/shared/DataTable';
import { FilterCard } from '../../../../components/shared/FilterCard';
import { SlideInForm } from '../../../../components/shared/SlideInForm';
import { FormField, Input, Select, Textarea } from '../../../../components/shared/FormField';
import { StatusBadge } from '../../../../components/shared/StatusBadge';
import { Button } from '../../../../components/shared/Button';
import { ImageUpload } from '../../../../components/shared/ImageUpload';
import { SearchableMultiSelect } from '../../../../components/shared/SearchableMultiSelect';
import { ConfirmationDialog } from '../../../../components/shared/ConfirmationDialog';
import { toast } from '../../../../components/shared/Toast';

const schoolSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().optional(),
  company_id: z.string().uuid('Please select a company'),
  logo: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive'])
});

interface FilterState {
  search: string;
  company_ids: string[];
  status: string[];
}

type School = {
  id: string;
  name: string;
  code: string | null;
  company_id: string;
  company_name: string;
  region_name: string;
  logo: string | null;
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

export default function SchoolsTab() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    company_ids: [],
    status: []
  });

  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [schoolsToDelete, setSchoolsToDelete] = useState<School[]>([]);

  // Fetch companies with React Query
  const { data: companies = [] } = useQuery<Company[]>(
    ['companies'],
    async () => {
      const { data: companiesData, error } = await supabase
        .from('companies')
        .select(`
          id,
          name,
          region_id
        `)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;

      // Fetch regions for companies
      let regionsData = { data: [] };
      if (companiesData && companiesData.length > 0) {
        const regionIds = [...new Set(companiesData.map(c => c.region_id))];
        regionsData = await supabase.from('regions').select('id, name').in('id', regionIds);
      }

      const regionMap = new Map(regionsData.data?.map(r => [r.id, r.name]) || []);

      return companiesData.map(company => ({
        ...company,
        region_name: regionMap.get(company.region_id) ?? 'Unknown Region',
        status: 'active' as const
      }));
    },
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  // Fetch schools with React Query
  const { 
    data: schools = [], 
    isLoading, 
    isFetching 
  } = useQuery<School[]>(
    ['schools', filters],
    async () => {
      let query = supabase
        .from('schools')
        .select(`
          id,
          name,
          code,
          company_id,
          logo,
          address,
          notes,
          status,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
      }

      if (filters.company_ids.length > 0) {
        query = query.in('company_id', filters.company_ids);
      }

      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch related data separately
      const companyIds = [...new Set(data.map(item => item.company_id))];

      const [companiesData] = await Promise.all([
        companyIds.length > 0 ? supabase
          .from('companies')
          .select(`
            id,
            name,
            region_id
          `)
          .in('id', companyIds) : Promise.resolve({ data: [] })
      ]);

      // Fetch regions for companies
      let regionsData = { data: [] };
      if (companiesData.data && companiesData.data.length > 0) {
        const regionIds = [...new Set(companiesData.data.map(c => c.region_id))];
        regionsData = await supabase.from('regions').select('id, name').in('id', regionIds);
      }

      // Create lookup maps
      const regionMap = new Map(regionsData.data?.map(r => [r.id, r.name]) || []);
      const companyMap = new Map(companiesData.data?.map(c => [c.id, { name: c.name, region_id: c.region_id }]) || []);

      return data.map(school => {
        const company = companyMap.get(school.company_id);
        return {
          ...school,
          company_name: company?.name ?? 'Unknown Company',
          region_name: company ? regionMap.get(company.region_id) ?? 'Unknown Region' : 'Unknown Region'
        };
      });
    },
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Create/update school mutation
  const schoolMutation = useMutation(
    async (formData: FormData) => {
      const data = {
        name: formData.get('name') as string,
        code: formData.get('code') as string || '',
        company_id: formData.get('company_id') as string,
        logo: formData.get('logo') as string || '',
        address: formData.get('address') as string || '',
        notes: formData.get('notes') as string || '',
        status: formData.get('status') as 'active' | 'inactive'
      };

      // Validate with zod
      schoolSchema.parse(data);

      if (editingSchool) {
        const { error } = await supabase
          .from('schools')
          .update(data)
          .eq('id', editingSchool.id);

        if (error) throw error;
        return { ...editingSchool, ...data };
      } else {
        const { data: newSchool, error } = await supabase
          .from('schools')
          .insert([data])
          .select()
          .single();

        if (error) throw error;
        return newSchool;
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['schools']);
        setIsFormOpen(false);
        setEditingSchool(null);
        setFormErrors({});
        toast.success(`School ${editingSchool ? 'updated' : 'created'} successfully`);
      },
      onError: (error) => {
        if (error instanceof z.ZodError) {
          const errors: Record<string, string> = {};
          error.errors.forEach((err) => {
            if (err.path.length > 0) {
              errors[err.path[0]] = err.message;
            }
          });
          setFormErrors(errors);
        } else {
          console.error('Error saving school:', error);
          setFormErrors({ form: 'Failed to save school. Please try again.' });
          toast.error('Failed to save school');
        }
      }
    }
  );

  // Delete school mutation
  const deleteMutation = useMutation(
    async (schools: School[]) => {
      // Delete logos from storage if they exist
      for (const school of schools) {
        if (school.logo) {
          const logoPath = school.logo.split('/').pop();
          if (logoPath) {
            await supabase.storage
              .from('logos')
              .remove([logoPath]);
          }
        }
      }

      const { error } = await supabase
        .from('schools')
        .delete()
        .in('id', schools.map(s => s.id));

      if (error) throw error;
      return schools;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['schools']);
        setIsConfirmDialogOpen(false);
        setSchoolsToDelete([]);
        toast.success('School(s) deleted successfully');
      },
      onError: (error) => {
        console.error('Error deleting schools:', error);
        toast.error('Failed to delete school(s)');
        setIsConfirmDialogOpen(false);
        setSchoolsToDelete([]);
      }
    }
  );

  const getLogoUrl = (path: string | null) => {
    if (!path) return null;
    return supabase.storage
      .from('school-logos')
      .getPublicUrl(path).data.publicUrl;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    schoolMutation.mutate(new FormData(e.currentTarget));
  };

  const handleDelete = (schools: School[]) => {
    setSchoolsToDelete(schools);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(schoolsToDelete);
  };

  const cancelDelete = () => {
    setIsConfirmDialogOpen(false);
    setSchoolsToDelete([]);
  };

  const columns = [
    {
      id: 'logo',
      header: 'Logo',
      enableSorting: false,
      cell: (row: School) => (
        <div className="w-10 h-10 flex items-center justify-center">
          {row.logo ? (
            <img
              src={getLogoUrl(row.logo)}
              alt={`${row.name} logo`}
              className="w-10 h-10 object-contain rounded-md"
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
      cell: (row: School) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {row.code || '-'}
        </span>
      ),
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
      cell: (row: School) => (
        <StatusBadge status={row.status} />
      ),
    },
    {
      id: 'created_at',
      header: 'Created At',
      accessorKey: 'created_at',
      enableSorting: true,
      cell: (row: School) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Schools</h2>
        <Button
          onClick={() => {
            setEditingSchool(null);
            setIsFormOpen(true);
          }}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add School
        </Button>
      </div>

      <FilterCard
        title="Filters"
        onApply={() => {}} // No need for explicit apply with React Query
        onClear={() => {
          setFilters({
            search: '',
            company_ids: [],
            status: []
          });
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            onChange={(values) => setFilters({ ...filters, company_ids: values })}
            placeholder="Select companies..."
          />

          <SearchableMultiSelect
            label="Status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
            selectedValues={filters.status}
            onChange={(values) => setFilters({ ...filters, status: values })}
            placeholder="Select status..."
          />
        </div>
      </FilterCard>

      <DataTable
        data={schools}
        columns={columns}
        keyField="id"
        caption="List of schools with their company associations and status"
        ariaLabel="Schools data table"
        loading={isLoading}
        isFetching={isFetching}
        onEdit={(school) => {
          setEditingSchool(school);
          setIsFormOpen(true);
        }}
        onDelete={handleDelete}
        emptyMessage="No schools found"
      />

      <SlideInForm
        key={editingSchool?.id || 'new'}
        title={editingSchool ? 'Edit School' : 'Create School'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingSchool(null);
          setFormErrors({});
        }}
        onSave={() => {
          const form = document.querySelector('form');
          if (form) form.requestSubmit();
        }}
        loading={schoolMutation.isLoading}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.form && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {formErrors.form}
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
              placeholder="Enter school name"
              defaultValue={editingSchool?.name}
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
              placeholder="Enter school code"
              defaultValue={editingSchool?.code || ''}
            />
          </FormField>

          <FormField
            id="company_id"
            label="Company"
            required
            error={formErrors.company_id}
          >
            <Select
              id="company_id"
              name="company_id"
              options={companies.map(company => ({
                value: company.id,
                label: `${company.name} (${company.region_name})`
              }))}
              defaultValue={editingSchool?.company_id || ''}
            />
          </FormField>

          <FormField
            id="logo"
            label="School Logo"
          >
            <input
              type="hidden"
              name="logo"
              value={editingSchool?.logo || ''}
            />
            <ImageUpload
              id="logo"
              bucket="school-logos"
              value={editingSchool?.logo}
              publicUrl={editingSchool?.logo ? getLogoUrl(editingSchool.logo) : null}
              onChange={(path) => {
                const input = document.querySelector('input[name="logo"]') as HTMLInputElement;
                if (input) input.value = path || '';
              }}
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
              placeholder="Enter school address"
              defaultValue={editingSchool?.address || ''}
              rows={3}
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
              placeholder="Enter school notes"
              defaultValue={editingSchool?.notes || ''}
              rows={3}
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
              defaultValue={editingSchool?.status || 'active'}
            />
          </FormField>
        </form>
      </SlideInForm>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        title="Delete School"
        message={`Are you sure you want to delete ${schoolsToDelete.length} school(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}