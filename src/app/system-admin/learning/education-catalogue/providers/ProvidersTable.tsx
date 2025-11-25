import React, { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import { DataTable } from '../../../../../components/shared/DataTable';
import { FilterCard } from '../../../../../components/shared/FilterCard';
import { SlideInForm } from '../../../../../components/shared/SlideInForm';
import { FormField, Input, Select } from '../../../../../components/shared/FormField';
import { StatusBadge } from '../../../../../components/shared/StatusBadge';
import { Button } from '../../../../../components/shared/Button';
import { ConfirmationDialog } from '../../../../../components/shared/ConfirmationDialog';
import { toast } from '../../../../../components/shared/Toast';

const providerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().min(1, 'Code is required'),
  status: z.enum(['active', 'inactive'])
});

type Provider = {
  id: string;
  name: string;
  code: string | null;
  status: 'active' | 'inactive';
  created_at: string;
};

export default function ProvidersTable() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [providersToDelete, setProvidersToDelete] = useState<Provider[]>([]);
  const [dependentRecords, setDependentRecords] = useState<{count: number, details: string} | null>(null);
  
  const [filters, setFilters] = useState({
    name: '',
    code: '',
    status: ''
  });

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('providers')
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
      setProviders(data || []);
    } catch (error) {
      console.error('Error fetching providers:', error);
      toast.error('Failed to fetch providers');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors({});

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      code: formData.get('code') as string,
      status: formData.get('status') as 'active' | 'inactive'
    };

    try {
      const validatedData = providerSchema.parse(data);
      
      if (editingProvider) {
        const { error } = await supabase
          .from('providers')
          .update(validatedData)
          .eq('id', editingProvider.id);

        if (error) throw error;
        toast.success('Provider updated successfully');
      } else {
        const { error } = await supabase
          .from('providers')
          .insert([validatedData]);

        if (error) throw error;
        toast.success('Provider created successfully');
      }

      await fetchProviders();
      setIsFormOpen(false);
      setEditingProvider(null);
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
        console.error('Error saving provider:', error);
        setFormErrors({ form: 'Failed to save provider. Please try again.' });
        toast.error('Failed to save provider');
      }
    }
  };

  const handleDelete = async (providers: Provider[]) => {
    // Check for dependent records before showing confirmation dialog
    try {
      const providerIds = providers.map(p => p.id);
      
      // Query for dependent records in data_structures table
      const { data: dependentData, error: dependentError } = await supabase
        .from('data_structures')
        .select('id, name, provider_id')
        .in('provider_id', providerIds);

      if (dependentError) throw dependentError;

      if (dependentData && dependentData.length > 0) {
        // Group dependent records by provider
        const dependentByProvider = dependentData.reduce((acc, record) => {
          if (!acc[record.provider_id]) {
            acc[record.provider_id] = [];
          }
          acc[record.provider_id].push(record);
          return acc;
        }, {} as Record<string, any[]>);

        // Create details string
        const details = providers.map(provider => {
          const count = dependentByProvider[provider.id]?.length || 0;
          return count > 0 ? `${provider.name}: ${count} data structure(s)` : null;
        }).filter(Boolean).join(', ');

        setDependentRecords({
          count: dependentData.length,
          details
        });
      } else {
        setDependentRecords(null);
      }
    } catch (error) {
      console.error('Error checking dependencies:', error);
      toast.error('Failed to check dependencies');
      return;
    }

    setProvidersToDelete(providers);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = async () => {
    // If there are dependent records, just close the dialog
    if (dependentRecords && dependentRecords.count > 0) {
      setIsConfirmDialogOpen(false);
      setProvidersToDelete([]);
      setDependentRecords(null);
      return;
    }

    try {
      const { error } = await supabase
        .from('providers')
        .delete()
        .in('id', providersToDelete.map(p => p.id));

      if (error) throw error;
      await fetchProviders();
      toast.success('Provider(s) deleted successfully');
      setIsConfirmDialogOpen(false);
      setProvidersToDelete([]);
      setDependentRecords(null);
    } catch (error) {
      console.error('Error deleting providers:', error);
      toast.error('Failed to delete provider(s)');
      setIsConfirmDialogOpen(false);
      setProvidersToDelete([]);
      setDependentRecords(null);
    }
  };

  const cancelDelete = () => {
    setIsConfirmDialogOpen(false);
    setProvidersToDelete([]);
    setDependentRecords(null);
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
      cell: (row: Provider) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {row.code || '-'}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: true,
      cell: (row: Provider) => (
        <StatusBadge status={row.status} />
      ),
    },
    {
      id: 'created_at',
      header: 'Created At',
      accessorKey: 'created_at',
      enableSorting: true,
      cell: (row: Provider) => (
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
            setEditingProvider(null);
            setIsFormOpen(true);
          }}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add Provider
        </Button>
      </div>

      <FilterCard
        title="Filters"
        onApply={fetchProviders}
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
        data={providers}
        columns={columns}
        keyField="id"
        caption="List of educational providers with their codes and status"
        ariaLabel="Educational providers management table"
        loading={loading}
        onEdit={(provider) => {
          setEditingProvider(provider);
          setIsFormOpen(true);
        }}
        onDelete={handleDelete}
        emptyMessage="No providers found"
      />

      <SlideInForm
        key={editingProvider?.id || `new-${Date.now()}`}
        title={editingProvider ? 'Edit Provider' : 'Create Provider'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingProvider(null);
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
              placeholder="Enter provider name"
              defaultValue={editingProvider?.name || ''}
              key={editingProvider?.id || `name-${Date.now()}`}
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
              placeholder="Enter provider code"
              defaultValue={editingProvider?.code || ''}
              key={editingProvider?.id || `code-${Date.now()}`}
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
              defaultValue={editingProvider?.status || 'active'}
              key={editingProvider?.id || `status-${Date.now()}`}
            />
          </FormField>
        </form>
      </SlideInForm>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        title={dependentRecords && dependentRecords.count > 0 ? "Cannot Delete Provider" : "Delete Provider"}
        message={
          dependentRecords && dependentRecords.count > 0
            ? `Cannot delete ${providersToDelete.length} provider(s) because they are referenced by ${dependentRecords.count} data structure(s): ${dependentRecords.details}. Please remove or reassign these dependencies first.`
            : `Are you sure you want to delete ${providersToDelete.length} provider(s)? This action cannot be undone.`
        }
        confirmText={dependentRecords && dependentRecords.count > 0 ? "OK" : "Delete"}
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={dependentRecords && dependentRecords.count > 0 ? undefined : cancelDelete}
      />
    </div>
  );
}