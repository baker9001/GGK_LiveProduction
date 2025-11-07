import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Plus } from 'lucide-react';
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

const regionSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive'])
});

type Region = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  status: 'active' | 'inactive';
  created_at: string;
};

export default function RegionsTab() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState({
    search: '',
    status: [] as string[]
  });
  
  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [regionsToDelete, setRegionsToDelete] = useState<Region[]>([]);

  // React Query for fetching regions
  const {
    data: regions = [],
    isLoading,
    isFetching
  } = useQuery({
    queryKey: ['regions', filters],
    queryFn: async () => {
      let query = supabase
        .from('regions')
        .select('id, name, code, description, status, created_at')
        .order('created_at', { ascending: false });

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
      }

      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation for creating/updating regions
  const mutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const data = {
        name: formData.get('name') as string,
        code: formData.get('code') as string,
        description: formData.get('description') as string,
        status: formData.get('status') as 'active' | 'inactive'
      };

      const validatedData = regionSchema.parse(data);
      
      if (editingRegion) {
        const { error } = await supabase
          .from('regions')
          .update(validatedData)
          .eq('id', editingRegion.id);

        if (error) throw error;
        return { ...editingRegion, ...validatedData };
      } else {
        const { data: newRegion, error } = await supabase
          .from('regions')
          .insert([validatedData])
          .select()
          .single();

        if (error) throw error;
        return newRegion;
      }
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries(['regions']);

      // Close form and reset state
      setIsFormOpen(false);
      setEditingRegion(null);
      setFormErrors({});

      // Show success message
      toast.success(`Region ${editingRegion ? 'updated' : 'created'} successfully`);
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
        console.error('Error saving region:', error);
        setFormErrors({ form: 'Failed to save region. Please try again.' });
        toast.error('Failed to save region');
      }
    }
  });

  // Mutation for deleting regions
  const deleteMutation = useMutation({
    mutationFn: async (regionsToDelete: Region[]) => {
      const { error } = await supabase
        .from('regions')
        .delete()
        .in('id', regionsToDelete.map(r => r.id));

      if (error) throw error;
      return regionsToDelete;
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries(['regions']);
      setIsConfirmDialogOpen(false);
      setRegionsToDelete([]);
      toast.success('Region(s) deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting regions:', error);
      toast.error('Failed to delete region(s)');
      setIsConfirmDialogOpen(false);
      setRegionsToDelete([]);
    }
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors({});
    mutation.mutate(new FormData(e.currentTarget));
  };

  const handleDelete = (regions: Region[]) => {
    setRegionsToDelete(regions);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(regionsToDelete);
  };

  const cancelDelete = () => {
    setIsConfirmDialogOpen(false);
    setRegionsToDelete([]);
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
      cell: (row: Region) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {row.code || '-'}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: true,
      cell: (row: Region) => (
        <StatusBadge status={row.status} />
      ),
    },
    {
      id: 'created_at',
      header: 'Created At',
      accessorKey: 'created_at',
      enableSorting: true,
      cell: (row: Region) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Regions</h2>
        <Button
          onClick={() => {
            setEditingRegion(null);
            setIsFormOpen(true);
          }}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add Region
        </Button>
      </div>

      <FilterCard
        title="Filters"
        onApply={() => {}} // No need for explicit apply with React Query
        onClear={() => {
          setFilters({
            search: '',
            status: []
          });
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        data={regions}
        columns={columns}
        keyField="id"
        caption="List of geographical regions with their codes and status"
        ariaLabel="Regions data table"
        loading={isLoading}
        isFetching={isFetching}
        onEdit={(region) => {
          setEditingRegion(region);
          setIsFormOpen(true);
        }}
        onDelete={handleDelete}
        emptyMessage="No regions found"
      />

      <SlideInForm
        key={editingRegion?.id || 'new'}
        title={editingRegion ? 'Edit Region' : 'Create Region'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingRegion(null);
          setFormErrors({});
        }}
        onSave={() => {
          const form = document.querySelector('form');
          if (form) form.requestSubmit();
        }}
        loading={mutation.isLoading}
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
              placeholder="Enter region name"
              defaultValue={editingRegion?.name}
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
              placeholder="Enter region code"
              defaultValue={editingRegion?.code || ''}
            />
          </FormField>

          <FormField
            id="description"
            label="Description"
            error={formErrors.description}
          >
            <Textarea
              id="description"
              name="description"
              placeholder="Enter region description"
              defaultValue={editingRegion?.description || ''}
              rows={4}
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
              defaultValue={editingRegion?.status || 'active'}
            />
          </FormField>
        </form>
      </SlideInForm>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        title="Delete Region"
        message={`Are you sure you want to delete ${regionsToDelete.length} region(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}