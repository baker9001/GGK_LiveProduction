import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { DataTable } from '../../../../components/shared/DataTable';
import { FilterCard } from '../../../../components/shared/FilterCard';
import { SlideInForm } from '../../../../components/shared/SlideInForm';
import { FormField, Input, Select } from '../../../../components/shared/FormField';
import { StatusBadge } from '../../../../components/shared/StatusBadge';
import { Button } from '../../../../components/shared/Button';
import { ConfirmationDialog } from '../../../../components/shared/ConfirmationDialog';
import { toast } from '../../../../components/shared/Toast';

const dataStructureSchema = z.object({
  region_id: z.string().uuid('Please select a region'),
  program_id: z.string().uuid('Please select a program'),
  provider_id: z.string().uuid('Please select a provider'),
  subject_id: z.string().uuid('Please select a subject'),
  status: z.enum(['active', 'inactive'])
});

type DataStructure = {
  id: string;
  region_id: string;
  program_id: string;
  provider_id: string;
  subject_id: string;
  status: 'active' | 'inactive';
  created_at: string;
  region_name: string;
  program_name: string;
  provider_name: string;
  subject_name: string;
};

type Option = {
  id: string;
  name: string;
};

export default function DataStructurePage() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<DataStructure | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState({
    region: '',
    program: '',
    provider: '',
    subject: '',
    status: ''
  });

  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [structuresToDelete, setStructuresToDelete] = useState<DataStructure[]>([]);

  // Form state
  const [formRegionId, setFormRegionId] = useState('');
  const [formProgramId, setFormProgramId] = useState('');
  const [formProviderId, setFormProviderId] = useState('');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');

  // Fetch regions with React Query
  const { data: regions = [] } = useQuery<Option[]>(
    ['regions'],
    async () => {
      const { data, error } = await supabase
        .from('regions')
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data || [];
    },
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  // Fetch programs with React Query
  const { data: programs = [] } = useQuery<Option[]>(
    ['programs', formRegionId],
    async () => {
      if (!formRegionId) return [];
      
      const { data, error } = await supabase
        .from('programs')
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data || [];
    },
    {
      enabled: !!formRegionId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Fetch providers with React Query
  const { data: providers = [] } = useQuery<Option[]>(
    ['providers', formRegionId, formProgramId],
    async () => {
      if (!formRegionId || !formProgramId) return [];
      
      const { data, error } = await supabase
        .from('providers')
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data || [];
    },
    {
      enabled: !!formRegionId && !!formProgramId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Fetch subjects with React Query
  const { data: subjects = [] } = useQuery<Option[]>(
    ['subjects', formRegionId, formProgramId, formProviderId],
    async () => {
      if (!formRegionId || !formProgramId || !formProviderId) return [];
      
      const { data, error } = await supabase
        .from('edu_subjects')
        .select('id, name, code, status')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data || [];
    },
    {
      enabled: !!formRegionId && !!formProgramId && !!formProviderId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Fetch data structures with React Query
  const { 
    data: dataStructures = [], 
    isLoading, 
    isFetching 
  } = useQuery<DataStructure[]>(
    ['data-structures', filters],
    async () => {
      let query = supabase
        .from('data_structures')
        .select(`
          id,
          region_id,
          program_id,
          provider_id,
          subject_id,
          status,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (filters.region) query = query.eq('region_id', filters.region);
      if (filters.program) query = query.eq('program_id', filters.program);
      if (filters.provider) query = query.eq('provider_id', filters.provider);
      if (filters.subject) query = query.eq('subject_id', filters.subject);
      if (filters.status) query = query.eq('status', filters.status);

      const { data, error } = await query;

      if (error) throw error;

      // Fetch related data separately
      const regionIds = [...new Set(data.map(item => item.region_id))];
      const programIds = [...new Set(data.map(item => item.program_id))];
      const providerIds = [...new Set(data.map(item => item.provider_id))];
      const subjectIds = [...new Set(data.map(item => item.subject_id))];

      const [regionsData, programsData, providersData, subjectsData] = await Promise.all([
        regionIds.length > 0 ? supabase.from('regions').select('id, name').in('id', regionIds) : { data: [] },
        programIds.length > 0 ? supabase.from('programs').select('id, name').in('id', programIds) : { data: [] },
        providerIds.length > 0 ? supabase.from('providers').select('id, name').in('id', providerIds) : { data: [] },
        subjectIds.length > 0 ? supabase.from('edu_subjects').select('id, name').in('id', subjectIds) : { data: [] }
      ]);

      // Create lookup maps
      const regionMap = new Map(regionsData.data?.map(r => [r.id, r.name]) || []);
      const programMap = new Map(programsData.data?.map(p => [p.id, p.name]) || []);
      const providerMap = new Map(providersData.data?.map(p => [p.id, p.name]) || []);
      const subjectMap = new Map(subjectsData.data?.map(s => [s.id, s.name]) || []);

      return data.map(item => ({
        ...item,
        region_name: regionMap.get(item.region_id) ?? 'Unknown Region',
        program_name: programMap.get(item.program_id) ?? 'Unknown Program',
        provider_name: providerMap.get(item.provider_id) ?? 'Unknown Provider',
        subject_name: subjectMap.get(item.subject_id) ?? 'Unknown Subject'
      }));
    },
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Create/update data structure mutation
  const mutation = useMutation({
    mutationFn: async () => {
      const data = {
        region_id: formRegionId,
        program_id: formProgramId,
        provider_id: formProviderId,
        subject_id: formSubjectId,
        status: formStatus
      };

      const validatedData = dataStructureSchema.parse(data);
      
      if (editingStructure) {
        const { error } = await supabase
          .from('data_structures')
          .update(validatedData)
          .eq('id', editingStructure.id);

        if (error) {
          if (error.code === '23505') {
            throw new Error('This combination already exists');
          }
          throw error;
        }
        return { ...editingStructure, ...validatedData };
      } else {
        const { data: newStructure, error } = await supabase
          .from('data_structures')
          .insert([validatedData])
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            throw new Error('This combination already exists');
          }
          throw error;
        }
        return newStructure;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['data-structures']);
      setIsFormOpen(false);
      setEditingStructure(null);
      resetFormState();
      setFormErrors({});
      toast.success(`Structure ${editingStructure ? 'updated' : 'created'} successfully`);
    },
    onError: (error: any) => {
      setFormErrors({ form: error.message || 'An error occurred' });
      toast.error('Failed to save structure');
    }
  });

  // Delete data structure mutation
  const deleteMutation = useMutation({
    mutationFn: async (structures: DataStructure[]) => {
      const { error } = await supabase
        .from('data_structures')
        .delete()
        .in('id', structures.map(s => s.id));

      if (error) throw error;
      return structures;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['data-structures']);
      setIsConfirmDialogOpen(false);
      setStructuresToDelete([]);
      toast.success('Structure(s) deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting structures:', error);
      toast.error('Failed to delete structure(s)');
      setIsConfirmDialogOpen(false);
      setStructuresToDelete([]);
    }
  });

  // Update form state when editing structure changes
  React.useEffect(() => {
    if (editingStructure) {
      setFormRegionId(editingStructure.region_id);
      setFormProgramId(editingStructure.program_id);
      setFormProviderId(editingStructure.provider_id);
      setFormSubjectId(editingStructure.subject_id);
      setFormStatus(editingStructure.status);
    } else {
      // Reset form state for new entry
      resetFormState();
    }
  }, [editingStructure]);

  const resetFormState = () => {
    setFormRegionId('');
    setFormProgramId('');
    setFormProviderId('');
    setFormSubjectId('');
    setFormStatus('active');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    mutation.mutate();
  };

  const handleDelete = (structures: DataStructure[]) => {
    setStructuresToDelete(structures);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(structuresToDelete);
  };

  const cancelDelete = () => {
    setIsConfirmDialogOpen(false);
    setStructuresToDelete([]);
  };

  const columns = [
    {
      id: 'region',
      header: 'Region',
      accessorKey: 'region_name',
      enableSorting: true,
    },
    {
      id: 'program',
      header: 'Program',
      accessorKey: 'program_name',
      enableSorting: true,
    },
    {
      id: 'provider',
      header: 'Provider',
      accessorKey: 'provider_name',
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
      cell: (row: DataStructure) => (
        <StatusBadge status={row.status} />
      ),
    },
    {
      id: 'created_at',
      header: 'Created At',
      accessorKey: 'created_at',
      enableSorting: true,
      cell: (row: DataStructure) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Data Structure</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">Manage valid curriculum combinations</p>
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div />
          <Button
            onClick={() => {
              setEditingStructure(null);
              setIsFormOpen(true);
            }}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Add Structure
          </Button>
        </div>

        <FilterCard
          title="Filters"
          onApply={() => {}} // No need for explicit apply with React Query
          onClear={() => {
            setFilters({
              region: '',
              program: '',
              provider: '',
              subject: '',
              status: ''
            });
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              id="region"
              label="Region"
            >
              <Select
                id="region"
                options={regions.map(r => ({
                  value: r.id,
                  label: r.name
                }))}
                value={filters.region}
                onChange={(value) => setFilters({ ...filters, region: value })}
              />
            </FormField>

            <FormField
              id="program"
              label="Program"
            >
              <Select
                id="program"
                options={programs.map(p => ({
                  value: p.id,
                  label: p.name
                }))}
                value={filters.program}
                onChange={(value) => setFilters({ ...filters, program: value })}
              />
            </FormField>

            <FormField
              id="provider"
              label="Provider"
            >
              <Select
                id="provider"
                options={providers.map(p => ({
                  value: p.id,
                  label: p.name
                }))}
                value={filters.provider}
                onChange={(value) => setFilters({ ...filters, provider: value })}
              />
            </FormField>

            <FormField
              id="subject"
              label="Subject"
            >
              <Select
                id="subject"
                options={subjects.map(s => ({
                  value: s.id,
                  label: s.name
                }))}
                value={filters.subject}
                onChange={(value) => setFilters({ ...filters, subject: value })}
              />
            </FormField>

            <FormField
              id="status"
              label="Status"
            >
              <Select
                id="status"
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' }
                ]}
                value={filters.status}
                onChange={(value) => setFilters({ ...filters, status: value })}
              />
            </FormField>
          </div>
        </FilterCard>

        <DataTable
          data={dataStructures}
          columns={columns}
          keyField="id"
          caption="List of data structures showing academic curriculum combinations"
          ariaLabel="Data structures table"
          loading={isLoading}
          isFetching={isFetching}
          onEdit={(structure) => {
            setEditingStructure(structure);
            setIsFormOpen(true);
          }}
          onDelete={handleDelete}
          emptyMessage="No data structures found"
        />

        <SlideInForm
          key={editingStructure?.id || 'new'}
          title={editingStructure ? 'Edit Structure' : 'Create Structure'}
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingStructure(null);
            resetFormState();
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
                value={formRegionId}
                onChange={(value) => {
                  setFormRegionId(value);
                  setFormProgramId('');
                  setFormProviderId('');
                  setFormSubjectId('');
                }}
              />
            </FormField>

            <FormField
              id="program_id"
              label="Program"
              required
              error={formErrors.program_id}
            >
              <Select
                id="program_id"
                name="program_id"
                options={programs.map(program => ({
                  value: program.id,
                  label: program.name
                }))}
                value={formProgramId}
                onChange={(value) => {
                  setFormProgramId(value);
                  setFormProviderId('');
                  setFormSubjectId('');
                }}
                disabled={!formRegionId}
              />
            </FormField>

            <FormField
              id="provider_id"
              label="Provider"
              required
              error={formErrors.provider_id}
            >
              <Select
                id="provider_id"
                name="provider_id"
                options={providers.map(provider => ({
                  value: provider.id,
                  label: provider.name
                }))}
                value={formProviderId}
                onChange={(value) => {
                  setFormProviderId(value);
                  setFormSubjectId('');
                }}
                disabled={!formProgramId}
              />
            </FormField>

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
                value={formSubjectId}
                onChange={(value) => setFormSubjectId(value)}
                disabled={!formProviderId}
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
                value={formStatus}
                onChange={(value) => setFormStatus(value as 'active' | 'inactive')}
              />
            </FormField>
          </form>
        </SlideInForm>

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={isConfirmDialogOpen}
          title="Delete Structure"
          message={`Are you sure you want to delete ${structuresToDelete.length} structure(s)? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      </div>
    </div>
  );
}