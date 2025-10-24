import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import { DataTable } from '../../../../../components/shared/DataTable';
import { FilterCard } from '../../../../../components/shared/FilterCard';
import { SlideInForm } from '../../../../../components/shared/SlideInForm';
import { FormField, Input, Textarea, Select } from '../../../../../components/shared/FormField';
import { StatusBadge } from '../../../../../components/shared/StatusBadge';
import { Button } from '../../../../../components/shared/Button';
import { ConfirmationDialog } from '../../../../../components/shared/ConfirmationDialog';
import { toast } from '../../../../../components/shared/Toast';

const programSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().min(1, 'Code is required'),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive'])
});

type Program = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  status: 'active' | 'inactive';
  created_at: string;
};

export default function ProgramsTable() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [programsToDelete, setProgramsToDelete] = useState<Program[]>([]);
  
  const [filters, setFilters] = useState({
    name: '',
    code: '',
    status: ''
  });

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      let query = supabase
        .from('programs')
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
      setPrograms(data || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
      toast.error('Failed to fetch programs');
    } finally {
      setLoading(false);
    }
  };

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
      const validatedData = programSchema.parse(data);
      
      if (editingProgram) {
        const { error } = await supabase
          .from('programs')
          .update(validatedData)
          .eq('id', editingProgram.id);

        if (error) throw error;
        toast.success('Program updated successfully');
      } else {
        const { error } = await supabase
          .from('programs')
          .insert([validatedData]);

        if (error) throw error;
        toast.success('Program created successfully');
      }

      await fetchPrograms();
      setIsFormOpen(false);
      setEditingProgram(null);
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
        console.error('Error saving program:', error);
        setFormErrors({ form: 'Failed to save program. Please try again.' });
        toast.error('Failed to save program');
      }
    }
  };

  const handleDelete = (programs: Program[]) => {
    setProgramsToDelete(programs);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      const { error } = await supabase
        .from('programs')
        .delete()
        .in('id', programsToDelete.map(p => p.id));

      if (error) throw error;
      await fetchPrograms();
      toast.success('Program(s) deleted successfully');
      setIsConfirmDialogOpen(false);
      setProgramsToDelete([]);
    } catch (error) {
      console.error('Error deleting programs:', error);
      toast.error('Failed to delete program(s)');
      setIsConfirmDialogOpen(false);
      setProgramsToDelete([]);
    }
  };

  const cancelDelete = () => {
    setIsConfirmDialogOpen(false);
    setProgramsToDelete([]);
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
      cell: (row: Program) => (
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
      cell: (row: Program) => (
        <div className="max-w-md truncate text-sm text-gray-900 dark:text-gray-100">
          {row.description || '-'}
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: true,
      cell: (row: Program) => (
        <StatusBadge status={row.status} />
      ),
    },
    {
      id: 'created_at',
      header: 'Created At',
      accessorKey: 'created_at',
      enableSorting: true,
      cell: (row: Program) => (
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
            setEditingProgram(null);
            setIsFormOpen(true);
          }}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add Program
        </Button>
      </div>

      <FilterCard
        title="Filters"
        onApply={fetchPrograms}
        onClear={() => {
          setFilters({
            name: '',
            code: '',
            status: ''
          });
          fetchPrograms();
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
        data={programs}
        columns={columns}
        keyField="id"
        caption="List of educational programs with their codes, descriptions, and status"
        ariaLabel="Educational programs management table"
        loading={loading}
        onEdit={(program) => {
          setEditingProgram(program);
          setIsFormOpen(true);
        }}
        onDelete={handleDelete}
        emptyMessage="No programs found"
      />

      <SlideInForm
        key={editingProgram?.id || 'new'}
        title={editingProgram ? 'Edit Program' : 'Create Program'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingProgram(null);
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
              placeholder="Enter program name"
              defaultValue={editingProgram?.name}
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
              placeholder="Enter program code"
              defaultValue={editingProgram?.code || ''}
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
              placeholder="Enter program description"
              defaultValue={editingProgram?.description || ''}
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
              defaultValue={editingProgram?.status || 'active'}
            />
          </FormField>
        </form>
      </SlideInForm>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        title="Delete Program"
        message={`Are you sure you want to delete ${programsToDelete.length} program(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}