import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '../../../../../lib/supabase';
import { DataTable } from '../../../../../components/shared/DataTable';
import { FilterCard } from '../../../../../components/shared/FilterCard';
import { SlideInForm } from '../../../../../components/shared/SlideInForm';
import { FormField, Input, Select, Textarea } from '../../../../../components/shared/FormField';
import { StatusBadge } from '../../../../../components/shared/StatusBadge';
import { Button } from '../../../../../components/shared/Button';
import { SearchableMultiSelect } from '../../../../../components/shared/SearchableMultiSelect';
import { ConfirmationDialog } from '../../../../../components/shared/ConfirmationDialog';
import { toast } from '../../../../../components/shared/Toast';

const citySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  country_id: z.string().uuid('Please select a country'),
  status: z.enum(['active', 'inactive'])
});

interface FilterState {
  search: string;
  region_ids: string[];
  country_ids: string[];
  status: string[];
}

type City = {
  id: string;
  name: string;
  code: string | null;
  country_id: string;
  country_name: string;
  region_name: string;
  status: 'active' | 'inactive';
  created_at: string;
};

type Region = {
  id: string;
  name: string;
  status: 'Active' | 'Inactive';
};

type Country = {
  id: string;
  name: string;
  region_id: string;
  status: 'Active' | 'Inactive';
};

interface FormState {
  name: string;
  region_id: string;
  country_id: string;
  status: 'active' | 'inactive';
}

export default function CitiesTab() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    region_ids: [],
    country_ids: [],
    status: []
  });

  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [citiesToDelete, setCitiesToDelete] = useState<City[]>([]);

  const [formState, setFormState] = useState<FormState>({
    name: '',
    region_id: '',
    country_id: '',
    status: 'active'
  });

  // Fetch regions with React Query
  const { data: regions = [] } = useQuery<Region[]>(
    ['regions'],
    async () => {
      const { data, error } = await supabase
        .from('regions')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data || [];
    },
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  // Fetch countries based on selected regions
  const { data: filterCountries = [] } = useQuery<Country[]>(
    ['countries', filters.region_ids],
    async () => {
      // Ensure regionIds are strings and filter out any invalid values
      const validRegionIds = filters.region_ids.filter(id => 
        typeof id === 'string' && id.trim() !== ''
      );
      
      if (validRegionIds.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .in('region_id', validRegionIds)
        .eq('status', 'active') // Use lowercase status
        .order('name');

      if (error) throw error;
      return data || [];
    },
    {
      enabled: filters.region_ids.length > 0,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Fetch countries for form
  const { data: formCountries = [] } = useQuery<Country[]>(
    ['formCountries', formState.region_id],
    async () => {
      if (!formState.region_id) return [];
      
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .eq('region_id', formState.region_id)
        .eq('status', 'active') // Use lowercase status
        .order('name');

      if (error) throw error;
      return data || [];
    },
    {
      enabled: !!formState.region_id,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Fetch cities with React Query
  const { 
    data: cities = [], 
    isLoading, 
    isFetching 
  } = useQuery<City[]>(
    ['cities', filters],
    async () => {
      let query = supabase
        .from('cities')
        .select(`
          *,
          countries (
            name,
            regions (name)
          )
        `)
        .order('created_at', { ascending: false });

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%`);
      }

      if (filters.country_ids.length > 0) {
        query = query.in('country_id', filters.country_ids);
      }

      if (filters.status.length > 0) {
        // Use lowercase status values for the query
        query = query.in('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedData = data?.map(city => ({
        ...city,
        country_name: city.countries?.name ?? 'Unknown Country',
        region_name: city.countries?.regions?.name ?? 'Unknown Region',
        status: city.status.toLowerCase() as 'active' | 'inactive' // Convert to lowercase for frontend
      })) || [];

      return formattedData;
    },
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Create/update city mutation
  const cityMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const data = {
        name: formData.get('name') as string,
        country_id: formData.get('country_id') as string,
        status: formData.get('status') as 'active' | 'inactive'
      };

      // Validate with zod
      const validatedData = citySchema.parse(data);
      
      if (editingCity) {
        const { error } = await supabase
          .from('cities')
          .update(validatedData)
          .eq('id', editingCity.id);

        if (error) throw error;
        return { ...editingCity, ...validatedData };
      } else {
        const { data: newCity, error } = await supabase
          .from('cities')
          .insert([validatedData])
          .select()
          .single();

        if (error) throw error;
        return newCity;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cities']);
      setIsFormOpen(false);
      setEditingCity(null);
      setFormErrors({});
      toast.success(`City ${editingCity ? 'updated' : 'created'} successfully`);
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
        console.error('Error saving city:', error);
        setFormErrors({ form: 'Failed to save city. Please try again.' });
        toast.error('Failed to save city');
      }
    }
  });

  // Delete city mutation
  const deleteMutation = useMutation({
    mutationFn: async (cities: City[]) => {
      const { error } = await supabase
        .from('cities')
        .delete()
        .in('id', cities.map(c => c.id));

      if (error) throw error;
      return cities;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cities']);
      setIsConfirmDialogOpen(false);
      setCitiesToDelete([]);
      toast.success('City(s) deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting cities:', error);
      toast.error('Failed to delete city(s)');
      setIsConfirmDialogOpen(false);
      setCitiesToDelete([]);
    }
  });

  // Update form state when editing city changes
  useEffect(() => {
    if (editingCity) {
      // Find the region for this city's country
      const fetchCityRegion = async () => {
        try {
          const { data: country, error } = await supabase
            .from('countries')
            .select('region_id')
            .eq('id', editingCity.country_id)
            .single();

          if (error) throw error;

          setFormState({
            name: editingCity.name,
            region_id: country.region_id,
            country_id: editingCity.country_id,
            status: editingCity.status.toLowerCase() as 'active' | 'inactive' // Convert to lowercase
          });
        } catch (error) {
          console.error('Error fetching city region:', error);
          toast.error('Failed to load city details');
        }
      };

      fetchCityRegion();
    } else {
      setFormState({
        name: '',
        region_id: '',
        country_id: '',
        status: 'active'
      });
    }
  }, [editingCity]);

  const handleRegionChange = (regionId: string) => {
    setFormState(prev => ({
      ...prev,
      region_id: regionId,
      country_id: ''
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    cityMutation.mutate(new FormData(e.currentTarget));
  };

  const handleDelete = (cities: City[]) => {
    setCitiesToDelete(cities);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(citiesToDelete);
  };

  const cancelDelete = () => {
    setIsConfirmDialogOpen(false);
    setCitiesToDelete([]);
  };

  const columns = [
    {
      id: 'name',
      header: 'Name',
      accessorKey: 'name',
      enableSorting: true,
    },
    {
      id: 'country',
      header: 'Country',
      accessorKey: 'country_name',
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
      cell: (row: City) => (
        <StatusBadge status={row.status} />
      ),
    },
    {
      id: 'created_at',
      header: 'Created At',
      accessorKey: 'created_at',
      enableSorting: true,
      cell: (row: City) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Cities</h2>
        <Button
          onClick={() => {
            setEditingCity(null);
            setIsFormOpen(true);
          }}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add City
        </Button>
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
            onChange={(values) => setFilters({ ...filters, region_ids: values, country_ids: [] })}
            placeholder="Select regions..."
          />

          <SearchableMultiSelect
            label="Country"
            options={filterCountries.map(c => ({
              value: c.id,
              label: c.name
            }))}
            selectedValues={filters.country_ids}
            onChange={(values) => setFilters({ ...filters, country_ids: values })}
            disabled={filters.region_ids.length === 0}
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
        data={cities}
        columns={columns}
        keyField="id"
        caption="List of cities with their country and regional associations"
        ariaLabel="Cities data table"
        loading={isLoading}
        isFetching={isFetching}
        onEdit={(city) => {
          setEditingCity(city);
          setIsFormOpen(true);
        }}
        onDelete={handleDelete}
        emptyMessage="No cities found"
      />

      <SlideInForm
        key={editingCity?.id || 'new'}
        title={editingCity ? 'Edit City' : 'Create City'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingCity(null);
          setFormErrors({});
        }}
        onSave={() => {
          const form = document.querySelector('form');
          if (form) form.requestSubmit();
        }}
        loading={cityMutation.isLoading}
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
              placeholder="Enter city name"
              defaultValue={editingCity?.name}
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
              value={formState.region_id}
              onChange={(value) => handleRegionChange(value)}
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
              options={formCountries.map(country => ({
                value: country.id,
                label: country.name
              }))}
              value={formState.country_id}
              onChange={(value) => setFormState(prev => ({ ...prev, country_id: value }))}
              disabled={!formState.region_id}
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
            />
          </FormField>
        </form>
      </SlideInForm>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        title="Delete City"
        message={`Are you sure you want to delete ${citiesToDelete.length} city(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}