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
import { SearchableMultiSelect } from '../../../../../components/shared/SearchableMultiSelect';
import { ConfirmationDialog } from '../../../../../components/shared/ConfirmationDialog';
import { toast } from '../../../../../components/shared/Toast';

const unitSchema = z.object({
  subject_id: z.string().uuid('Please select a subject'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().min(1, 'Code is required'),
  status: z.enum(['active', 'inactive'])
});

type Unit = {
  id: string;
  subject_id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive';
  created_at: string;
  subject_name: string;
};

type Subject = {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive';
};

interface FilterState {
  subject_id: string;
  status: string;
}

interface FormState {
  subject_id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive';
}

export default function UnitsTable() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [unitsToDelete, setUnitsToDelete] = useState<Unit[]>([]);
  
  const [formState, setFormState] = useState<FormState>({
    subject_id: '',
    name: '',
    code: '',
    status: 'active'
  });
  
  const [filters, setFilters] = useState<FilterState>({
    subject_id: '',
    status: ''
  });

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('edu_units')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.subject_id) {
        query = query.eq('subject_id', filters.subject_id);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data: unitsData, error } = await query;

      if (error) throw error;

      if (!unitsData || unitsData.length === 0) {
        setUnits([]);
        setLoading(false);
        return;
      }

      // Get all subject IDs from the units
      const subjectIds = [...new Set(unitsData.map(unit => unit.subject_id))];

      // Fetch subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('edu_subjects')
        .select('id, name, code, status')
        .in('id', subjectIds);

      if (subjectsError) throw subjectsError;

      // Create lookup map
      const subjectMap = new Map(subjectsData.map(subject => [subject.id, subject]));

      // Map units with their related data
      const formattedUnits = unitsData.map(unit => {
        const subject = subjectMap.get(unit.subject_id);

        return {
          ...unit,
          subject_name: subject?.name || 'Unknown Subject'
        };
      });

      setUnits(formattedUnits);
    } catch (error) {
      console.error('Error fetching units:', error);
      toast.error('Failed to fetch units');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchSubjects = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('edu_subjects')
        .select('id, name, code, status')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast.error('Failed to fetch subjects');
    }
  }, []);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    if (editingUnit) {
      setFormState({
        subject_id: editingUnit.subject_id,
        name: editingUnit.name,
        code: editingUnit.code,
        status: editingUnit.status
      });
    } else {
      setFormState({
        subject_id: '',
        name: '',
        code: '',
        status: 'active'
      });
    }
  }, [editingUnit]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors({});

    try {
      const validatedData = unitSchema.parse({
        subject_id: formState.subject_id,
        name: formState.name,
        code: formState.code,
        status: formState.status
      });

      // Check for unique constraints
      const { data: existingUnits, error: checkError } = await supabase
        .from('edu_units')
        .select('id')
        .eq('subject_id', validatedData.subject_id)
        .or(`name.eq.${validatedData.name},code.eq.${validatedData.code}`);

      if (checkError) throw checkError;

      // For updates, filter out the current unit from uniqueness check
      const conflictingUnits = editingUnit
        ? existingUnits?.filter(u => u.id !== editingUnit.id)
        : existingUnits;

      if (conflictingUnits && conflictingUnits.length > 0) {
        setFormErrors({
          form: 'A unit with this name or code already exists for the selected subject'
        });
        return;
      }

      if (editingUnit) {
        const { error } = await supabase
          .from('edu_units')
          .update(validatedData)
          .eq('id', editingUnit.id);

        if (error) throw error;
        toast.success('Unit updated successfully');
      } else {
        const { error } = await supabase
          .from('edu_units')
          .insert([validatedData]);

        if (error) throw error;
        toast.success('Unit created successfully');
      }

      await fetchUnits();
      setIsFormOpen(false);
      setEditingUnit(null);
      setFormState({
        subject_id: '',
        name: '',
        code: '',
        status: 'active'
      });
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
        console.error('Error saving unit:', error);
        setFormErrors({ form: 'Failed to save unit. Please try again.' });
        toast.error('Failed to save unit');
      }
    }
  };

  const handleDelete = (units: Unit[]) => {
    setUnitsToDelete(units);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      const { error } = await supabase
        .from('edu_units')
        .delete()
        .in('id', unitsToDelete.map(u => u.id));

      if (error) throw error;
      await fetchUnits();
      toast.success('Unit(s) deleted successfully');
      setIsConfirmDialogOpen(false);
      setUnitsToDelete([]);
    } catch (error) {
      console.error('Error deleting units:', error);
      toast.error('Failed to delete unit(s)');
      setIsConfirmDialogOpen(false);
      setUnitsToDelete([]);
    }
  };

  const cancelDelete = () => {
    setIsConfirmDialogOpen(false);
    setUnitsToDelete([]);
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
    },
    {
      id: 'subject',
      header: 'Subject',
      accessorKey: 'subject_name',
      enableSorting: true,
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: true,
      cell: (row: Unit) => (
        <StatusBadge status={row.status} />
      ),
    },
    {
      id: 'created_at',
      header: 'Created At',
      accessorKey: 'created_at',
      enableSorting: true,
      cell: (row: Unit) => (
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
            setEditingUnit(null);
            setIsFormOpen(true);
          }}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add Unit
        </Button>
      </div>

      <FilterCard
        title="Filters"
        onApply={fetchUnits}
        onClear={() => {
          setFilters({
            subject_id: '',
            status: ''
          });
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SearchableMultiSelect
            label="Subject"
            options={subjects.map(subject => ({
              value: subject.id,
              label: subject.name
            }))}
            selectedValues={filters.subject_id ? [filters.subject_id] : []}
            onChange={(values) => setFilters({ ...filters, subject_id: values[0] || '' })}
            isMulti={false}
            placeholder="Select subject..."
          />

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
        data={units}
        columns={columns}
        keyField="id"
        caption="List of educational units with their subject associations and codes"
        ariaLabel="Educational units data table"
        loading={loading}
        onEdit={(unit) => {
          setEditingUnit(unit);
          setIsFormOpen(true);
        }}
        onDelete={handleDelete}
        emptyMessage="No units found"
      />

      <SlideInForm
        key={editingUnit?.id || 'new'}
        title={editingUnit ? 'Edit Unit' : 'Create Unit'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingUnit(null);
          setFormState({
            subject_id: '',
            name: '',
            code: '',
            status: 'active'
          });
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
            id="subject_id"
            label="Subject"
            required
            error={formErrors.subject_id}
          >
            <Select
              id="subject_id"
              name="subject_id"
              options={subjects.map(subject => ({
                value: subject.id,
                label: subject.name
              }))}
              value={formState.subject_id}
              onChange={(e) => setFormState(prev => ({ ...prev, subject_id: e.target.value }))}
            />
          </FormField>

          <FormField
            id="name"
            label="Name"
            required
            error={formErrors.name}
          >
            <Input
              id="name"
              name="name"
              placeholder="Enter unit name"
              value={formState.name}
              onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
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
              placeholder="Enter unit code"
              value={formState.code}
              onChange={(e) => setFormState(prev => ({ ...prev, code: e.target.value }))}
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
              onChange={(e) => setFormState(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
            />
          </FormField>
        </form>
      </SlideInForm>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        title="Delete Unit"
        message={`Are you sure you want to delete ${unitsToDelete.length} unit(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}