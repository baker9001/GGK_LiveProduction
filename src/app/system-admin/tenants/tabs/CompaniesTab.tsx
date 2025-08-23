import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ImageOff, Trash2 } from 'lucide-react';
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

const companySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().optional(),
  region_id: z.string().uuid('Please select a region'),
  country_id: z.string().uuid('Please select a country'),
  logo: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive'])
});

interface FilterState {
  search: string;
  region_ids: string[];
  country_ids: string[];
  status: string[];
}

type Company = {
  id: string;
  name: string;
  code: string | null;
  region_id: string;
  country_id: string;
  region_name: string;
  country_name: string;
  logo: string | null;
  address: string | null;
  notes: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  admin_count?: number;
};

type Region = {
  id: string;
  name: string;
  status: 'active' | 'inactive';
};

type Country = {
  id: string;
  name: string;
  region_id: string;
  status: 'active' | 'inactive';
};

export default function CompaniesTab() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    region_ids: [],
    country_ids: [],
    status: []
  });

  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [companiesToDelete, setCompaniesToDelete] = useState<Company[]>([]);

  // Fetch regions
  const { data: regions = [] } = useQuery<Region[]>(
    ['regions'],
    async () => {
      const { data, error } = await supabase
        .from('regions')
        .select('id, name, status')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data || [];
    },
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  // Fetch countries
  const { data: countries = [] } = useQuery<Country[]>(
    ['countries'],
    async () => {
      const { data, error } = await supabase
        .from('countries')
        .select('id, name, region_id, status')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data || [];
    },
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  // Fetch companies with React Query
  const { 
    data: companies = [], 
    isLoading, 
    isFetching 
  } = useQuery<Company[]>(
    ['companies', filters],
    async () => {
      let query = supabase
        .from('companies')
        .select(`
          id,
          name,
          code,
          region_id,
          country_id,
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

      if (filters.region_ids.length > 0) {
        query = query.in('region_id', filters.region_ids);
      }

      if (filters.country_ids.length > 0) {
        query = query.in('country_id', filters.country_ids);
      }

      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch related data separately
      const regionIds = [...new Set(data.map(item => item.region_id))];
      const countryIds = [...new Set(data.map(item => item.country_id))];

      const [regionsData, countriesData] = await Promise.all([
        regionIds.length > 0 ? supabase
          .from('regions')
          .select('id, name')
          .in('id', regionIds) : Promise.resolve({ data: [] }),
        countryIds.length > 0 ? supabase
          .from('countries')
          .select('id, name')
          .in('id', countryIds) : Promise.resolve({ data: [] })
      ]);

      // Create lookup maps
      const regionMap = new Map(regionsData.data?.map(r => [r.id, r.name]) || []);
      const countryMap = new Map(countriesData.data?.map(c => [c.id, c.name]) || []);

      // Get admin counts for each company
      const companiesWithCounts = await Promise.all(
        data.map(async (company) => {
          const { count } = await supabase
            .from('entity_users')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', company.id)
            .eq('is_active', true);

          return {
            ...company,
            region_name: regionMap.get(company.region_id) ?? 'Unknown Region',
            country_name: countryMap.get(company.country_id) ?? 'Unknown Country',
            admin_count: count || 0
          };
        })
      );

      return companiesWithCounts;
    },
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Create/update company mutation
  const companyMutation = useMutation(
    async (formData: FormData) => {
      const data = {
        name: formData.get('name') as string,
        code: formData.get('code') as string || undefined,
        region_id: formData.get('region_id') as string,
        country_id: formData.get('country_id') as string,
        logo: formData.get('logo') as string || undefined,
        address: formData.get('address') as string || undefined,
        notes: formData.get('notes') as string || undefined,
        status: formData.get('status') as 'active' | 'inactive'
      };

      // Validate with zod
      companySchema.parse(data);

      if (editingCompany) {
        const { error } = await supabase
          .from('companies')
          .update(data)
          .eq('id', editingCompany.id);

        if (error) throw error;
        return { ...editingCompany, ...data };
      } else {
        const { data: newCompany, error } = await supabase
          .from('companies')
          .insert([data])
          .select()
          .single();

        if (error) throw error;
        return newCompany;
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['companies']);
        setIsFormOpen(false);
        setEditingCompany(null);
        setFormErrors({});
        toast.success(`Company ${editingCompany ? 'updated' : 'created'} successfully`);
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
          console.error('Error saving company:', error);
          setFormErrors({ form: 'Failed to save company. Please try again.' });
          toast.error('Failed to save company');
        }
      }
    }
  );

  // Delete companies mutation
  const deleteMutation = useMutation(
    async (companies: Company[]) => {
      // Delete logos from storage if they exist
      for (const company of companies) {
        if (company.logo) {
          const logoPath = company.logo.split('/').pop();
          if (logoPath) {
            await supabase.storage
              .from('company-logos')
              .remove([logoPath]);
          }
        }
      }

      const { error } = await supabase
        .from('companies')
        .delete()
        .in('id', companies.map(c => c.id));

      if (error) throw error;
      return companies;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['companies']);
        setIsConfirmDialogOpen(false);
        setCompaniesToDelete([]);
        setSelectedCompanies([]);
        toast.success('Company(s) deleted successfully');
      },
      onError: (error) => {
        console.error('Error deleting companies:', error);
        toast.error('Failed to delete company(s)');
        setIsConfirmDialogOpen(false);
        setCompaniesToDelete([]);
      }
    }
  );

  const getLogoUrl = (path: string | null) => {
    if (!path) return null;
    return supabase.storage
      .from('company-logos')
      .getPublicUrl(path).data.publicUrl;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    companyMutation.mutate(new FormData(e.currentTarget));
  };

  const handleDelete = (companies: Company[]) => {
    setCompaniesToDelete(companies);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(companiesToDelete);
  };

  const cancelDelete = () => {
    setIsConfirmDialogOpen(false);
    setCompaniesToDelete([]);
  };

  // Handle selection change from DataTable
  const handleSelectionChange = (selectedIds: Array<string | number>) => {
    setSelectedCompanies(selectedIds as string[]);
  };

  const columns = [
    {
      id: 'logo',
      header: 'Logo',
      enableSorting: false,
      cell: (row: Company) => (
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
      cell: (row: Company) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {row.code || '-'}
        </span>
      ),
    },
    {
      id: 'region',
      header: 'Region',
      accessorKey: 'region_name',
      enableSorting: true,
    },
    {
      id: 'country',
      header: 'Country',
      accessorKey: 'country_name',
      enableSorting: true,
    },
    {
      id: 'admins',
      header: 'Admins',
      enableSorting: true,
      cell: (row: Company) => (
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-900 dark:text-gray-100">
            {row.admin_count || 0}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            total admins
          </span>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: true,
      cell: (row: Company) => (
        <StatusBadge status={row.status} />
      ),
    },
    {
      id: 'created_at',
      header: 'Created At',
      accessorKey: 'created_at',
      enableSorting: true,
      cell: (row: Company) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Companies</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {companies.length} companies • {selectedCompanies.length} selected
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Bulk Delete Button - Shows when items are selected */}
          {selectedCompanies.length > 0 && (
            <Button
              variant="destructive"
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={() => {
                const companiesToProcess = companies.filter(c => selectedCompanies.includes(c.id));
                handleDelete(companiesToProcess);
              }}
            >
              Delete Selected ({selectedCompanies.length})
            </Button>
          )}
          <Button
            onClick={() => {
              setEditingCompany(null);
              setIsFormOpen(true);
            }}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Add Company
          </Button>
        </div>
      </div>

      <FilterCard
        title="Filters"
        onApply={() => {}} // No need for explicit apply with React Query
        onClear={() => {
          setFilters({
            search: '',
            region_ids: [],
            country_ids: [],
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
            label="Region"
            options={regions.map(r => ({
              value: r.id,
              label: r.name
            }))}
            selectedValues={filters.region_ids}
            onChange={(values) => setFilters({ ...filters, region_ids: values })}
            placeholder="Select regions..."
          />

          <SearchableMultiSelect
            label="Country"
            options={countries.map(c => ({
              value: c.id,
              label: c.name
            }))}
            selectedValues={filters.country_ids}
            onChange={(values) => setFilters({ ...filters, country_ids: values })}
            placeholder="Select countries..."
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
        data={companies}
        columns={columns}
        keyField="id"
        caption="List of companies with their regional associations and status"
        ariaLabel="Companies data table"
        loading={isLoading}
        isFetching={isFetching}
        onEdit={(company) => {
          setEditingCompany(company);
          setIsFormOpen(true);
        }}
        onDelete={handleDelete}
        onSelectionChange={handleSelectionChange}
        emptyMessage="No companies found"
      />

      <SlideInForm
        key={editingCompany?.id || 'new'}
        title={editingCompany ? 'Edit Company' : 'Create Company'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingCompany(null);
          setFormErrors({});
        }}
        onSave={() => {
          const form = document.querySelector('form');
          if (form) form.requestSubmit();
        }}
        loading={companyMutation.isPending}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.form && (
            <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
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
              placeholder="Enter company name"
              defaultValue={editingCompany?.name}
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
              placeholder="Enter company code"
              defaultValue={editingCompany?.code || ''}
            />
          </FormField>

          <FormField
            id="region_id"
            label="Region"
            required
            error={formErrors.region_id}
          >
            <Select
              id="region_id"
              name="region_id"
              options={regions.map(region => ({
                value: region.id,
                label: region.name
              }))}
              defaultValue={editingCompany?.region_id || ''}
            />
          </FormField>

          <FormField
            id="country_id"
            label="Country"
            required
            error={formErrors.country_id}
          >
            <Select
              id="country_id"
              name="country_id"
              options={countries.map(country => ({
                value: country.id,
                label: country.name
              }))}
              defaultValue={editingCompany?.country_id || ''}
            />
          </FormField>

          <FormField
            id="logo"
            label="Company Logo"
          >
            <input
              type="hidden"
              name="logo"
              value={editingCompany?.logo || ''}
            />
            <ImageUpload
              id="logo"
              bucket="company-logos"
              value={editingCompany?.logo}
              publicUrl={editingCompany?.logo ? getLogoUrl(editingCompany.logo) : null}
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
              placeholder="Enter company address"
              defaultValue={editingCompany?.address || ''}
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
              placeholder="Enter company notes"
              defaultValue={editingCompany?.notes || ''}
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
              defaultValue={editingCompany?.status || 'active'}
            />
          </FormField>
        </form>
      </SlideInForm>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        title="Delete Companies"
        message={`Are you sure you want to delete ${companiesToDelete.length} company(s)? This action cannot be undone and will also delete all associated schools and branches.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}