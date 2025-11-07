import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '../../../../../lib/supabase';
import { DataTable } from '../../../../../components/shared/DataTable';
import { FilterCard } from '../../../../../components/shared/FilterCard';
import { SlideInForm } from '../../../../../components/shared/SlideInForm';
import { FormField, Input, Select } from '../../../../../components/shared/FormField';
import { StatusBadge } from '../../../../../components/shared/StatusBadge';
import { Button } from '../../../../../components/shared/Button';
import { SearchableMultiSelect } from '../../../../../components/shared/SearchableMultiSelect';
import { ConfirmationDialog } from '../../../../../components/shared/ConfirmationDialog';
import { toast } from '../../../../../components/shared/Toast';

const countrySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  region_id: z.string().uuid('Please select a region'),
  status: z.enum(['active', 'inactive'])
});

interface FilterState {
  search: string;
  region_ids: string[];
  status: string[];
}

type Country = {
  id: string;
  name: string;
  region_id: string;
  region_name: string;
  status: 'active' | 'inactive';
  created_at: string;
};

type Region = {
  id: string;
  name: string;
  status: 'active' | 'inactive';
};

export default function CountriesTab() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    region_ids: [],
    status: []
  });

  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [countriesToDelete, setCountriesToDelete] = useState<Country[]>([]);

  // Fetch regions with React Query
  const { data: regions = [] } = useQuery<Region[]>(
    ['regions'],
    async () => {
      const { data, error } = await supabase
        .from('regions')
        .select('*')
        .order('name');

      if (error) throw error;
      
      // Convert status to lowercase for consistency in the frontend
      return (data || []).map(region => ({
        ...region,
        status: region.status.toLowerCase() as 'active' | 'inactive'
      }));
    },
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  // Fetch countries with React Query
  const { 
    data: countries = [], 
    isLoading, 
    isFetching 
  } = useQuery<Country[]>(
    ['countries', filters],
    async () => {
      let query = supabase
        .from('countries')
        .select(`
          *,
          regions (name)
        `)
        .order('created_at', { ascending: false });

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%`);
      }

      if (filters.region_ids.length > 0) {
        // Ensure region_ids are valid strings
        const validRegionIds = filters.region_ids.filter(id => 
          typeof id === 'string' && id.trim() !== ''
        );
        
        if (validRegionIds.length > 0) {
          query = query.in('region_id', validRegionIds);
        }
      }

      if (filters.status.length > 0) {
        // Use lowercase status values for the query
        query = query.in('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedData = data.map(country => ({
        ...country,
        region_name: country.regions?.name ?? 'Unknown Region',
        status: country.status.toLowerCase() as 'active' | 'inactive' // Convert to lowercase for frontend
      }));

      return formattedData;
    },
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Create/update country mutation
  const countryMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const data = {
        name: formData.get('name') as string,
        region_id: formData.get('region_id') as string,
        status: formData.get('status') as 'active' | 'inactive'
      };

      // Validate with zod
      const validatedData = countrySchema.parse(data);
      
      if (editingCountry) {
        const { error } = await supabase
          .from('countries')
          .update(validatedData)
          .eq('id', editingCountry.id);

        if (error) throw error;
        return { ...editingCountry, ...validatedData };
      } else {
        const { data: newCountry, error } = await supabase
          .from('countries')
          .insert([validatedData])
          .select()
          .single();

        if (error) throw error;
        return newCountry;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['countries']);
      setIsFormOpen(false);
      setEditingCountry(null);
      setFormErrors({});
      toast.success(`Country ${editingCountry ? 'updated' : 'created'} successfully`);
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
        console.error('Error saving country:', error);
        setFormErrors({ form: 'Failed to save country. Please try again.' });
        toast.error('Failed to save country');
      }
    }
  });

  // Delete country mutation
  const deleteMutation = useMutation({
    mutationFn: async (countries: Country[]) => {
      const { error } = await supabase
        .from('countries')
        .delete()
        .in('id', countries.map(c => c.id));

      if (error) throw error;
      return countries;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['countries']);
      setIsConfirmDialogOpen(false);
      setCountriesToDelete([]);
      toast.success('Country(s) deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting countries:', error);
      toast.error('Failed to delete country(s)');
      setIsConfirmDialogOpen(false);
      setCountriesToDelete([]);
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    countryMutation.mutate(new FormData(e.currentTarget));
  };

  const handleDelete = (countries: Country[]) => {
    setCountriesToDelete(countries);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(countriesToDelete);
  };

  const cancelDelete = () => {
    setIsConfirmDialogOpen(false);
    setCountriesToDelete([]);
  };

  const columns = [
    {
      id: 'name',
      header: 'Name',
      accessorKey: 'name',
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
      cell: (row: Country) => (
        <StatusBadge status={row.status} />
      ),
    },
    {
      id: 'created_at',
      header: 'Created At',
      accessorKey: 'created_at',
      enableSorting: true,
      cell: (row: Country) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Countries</h2>
        <Button
          onClick={() => {
            setEditingCountry(null);
            setIsFormOpen(true);
          }}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add Country
        </Button>
      </div>

      <FilterCard
        title="Filters"
        onApply={() => {}} // No need for explicit apply with React Query
        onClear={() => {
          setFilters({
            search: '',
            region_ids: [],
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
              placeholder="Search by name..."
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
        data={countries}
        columns={columns}
        keyField="id"
        caption="List of countries with their regional associations and status"
        ariaLabel="Countries data table"
        loading={isLoading}
        isFetching={isFetching}
        onEdit={(country) => {
          setEditingCountry(country);
          setIsFormOpen(true);
        }}
        onDelete={handleDelete}
        emptyMessage="No countries found"
      />

      <SlideInForm
        key={editingCountry?.id || 'new'}
        title={editingCountry ? 'Edit Country' : 'Create Country'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingCountry(null);
          setFormErrors({});
        }}
        onSave={() => {
          const form = document.querySelector('form');
          if (form) form.requestSubmit();
        }}
        loading={countryMutation.isLoading}
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
              placeholder="Enter country name"
              defaultValue={editingCountry?.name}
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
              defaultValue={editingCountry?.region_id}
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
              defaultValue={editingCountry?.status || 'active'}
            />
          </FormField>
        </form>
      </SlideInForm>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        title="Delete Country"
        message={`Are you sure you want to delete ${countriesToDelete.length} country(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}