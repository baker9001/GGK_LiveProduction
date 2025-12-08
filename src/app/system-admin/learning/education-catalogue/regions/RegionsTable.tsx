import React, { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import { DataTable } from '../../../../../components/shared/DataTable';
import { FilterCard } from '../../../../../components/shared/FilterCard';
import { SlideInForm } from '../../../../../components/shared/SlideInForm';
import { FormField, Input, Select, Textarea } from '../../../../../components/shared/FormField';
import { StatusBadge } from '../../../../../components/shared/StatusBadge';
import { Button } from '../../../../../components/shared/Button';
import { ConfirmationDialog } from '../../../../../components/shared/ConfirmationDialog';
import { toast } from '../../../../../components/shared/Toast';

const regionSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().min(1, 'Code is required'),
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

export default function RegionsTable() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [regionsToDelete, setRegionsToDelete] = useState<Region[]>([]);
  
  const [filters, setFilters] = useState({
    name: '',
    code: '',
    status: ''
  });

  const fetchRegions = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('regions')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.name) {
        query = query.ilike('name', `%${filters.name}%`);
      }

      if (filters.code) {
        query = query.ilike('code', `%${filters.code}%`);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRegions(data || []);
    } catch (error) {
      console.error('Error fetching regions:', error);
      toast.error('Failed to fetch regions');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchRegions();
  }, [fetchRegions]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors({});

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      code: formData.get('code') as string,
      description: formData.get('description') as string,
      status: formData.get('status') as 'active' | 'inactive'
    };

    try {
      const validatedData = regionSchema.parse(data);
      
      if (editingRegion) {
        const { error } = await supabase
          .from('regions')
          .update(validatedData)
          .eq('id', editingRegion.id);

        if (error) throw error;
        toast.success('Region updated successfully');
      } else {
        const { error } = await supabase
          .from('regions')
          .insert([validatedData]);

        if (error) throw error;
        toast.success('Region created successfully');
      }

      await fetchRegions();
      setIsFormOpen(false);
      setEditingRegion(null);
      setFormErrors({});
    } catch (error) {
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
  };

  const handleDelete = (regions: Region[]) => {
    setRegionsToDelete(regions);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      const { error } = await supabase
        .from('regions')
        .delete()
        .in('id', regionsToDelete.map(r => r.id));

      if (error) throw error;
      await fetchRegions();
      toast.success('Region(s) deleted successfully');
      setIsConfirmDialogOpen(false);
      setRegionsToDelete([]);
    } catch (error) {
      console.error('Error deleting regions:', error);
      toast.error('Failed to delete region(s)');
      setIsConfirmDialogOpen(false);
      setRegionsToDelete([]);
    }
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
      id: 'description',
      header: 'Description',
      accessorKey: 'description',
      enableSorting: true,
      cell: (row: Region) => (
        <div className="max-w-md truncate text-sm text-gray-900 dark:text-gray-100">
          {row.description || '-'}
        </div>
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
        <div />
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
        onApply={fetchRegions}
        onClear={() => {
          setFilters({
            name: '',
            code: '',
            status: ''
          });
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            id="name"
            label="Name"
          >
            <Input
              id="name"
              placeholder="Search by name..."
              value={filters.name}
              onChange={(e) => setFilters({ ...filters, name: e.target.value })}
            />
          </FormField>

          <FormField
            id="code"
            label="Code"
          >
            <Input
              id="code"
              placeholder="Search by code..."
              value={filters.code}
              onChange={(e) => setFilters({ ...filters, code: e.target.value })}
            />
          </FormField>

          <FilterCard.Dropdown
            id="status"
            label="Status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
            value={filters.status}
            onChange={(value) => setFilters({ ...filters, status: value })}
          />
        </div>
      </FilterCard>

      <DataTable
        data={regions}
        columns={columns}
        keyField="id"
        caption="List of geographical regions with their codes, descriptions, and status"
        ariaLabel="Regions management table"
        loading={loading}
        onEdit={(region) => {
          setEditingRegion(region);
          setIsFormOpen(true);
        }}
        onDelete={handleDelete}
        emptyMessage="No regions found"
      />

      <SlideInForm
        key={editingRegion?.id || `new-${Date.now()}`}
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
              defaultValue={editingRegion?.name || ''}
              key={editingRegion?.id || `name-${Date.now()}`}
            />
          </FormField>

          <FormField
            id="code"
            label="Code"
            required
            error={formErrors.code}
          >
            <Input
              id="code"
              name="code"
              placeholder="Enter region code"
              defaultValue={editingRegion?.code || ''}
              key={editingRegion?.id || `code-${Date.now()}`}
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
              key={editingRegion?.id || `description-${Date.now()}`}
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
              key={editingRegion?.id || `status-${Date.now()}`}
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