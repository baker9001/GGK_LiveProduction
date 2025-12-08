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

const topicSchema = z.object({
  unit_id: z.string().uuid('Please select a unit'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  sort: z.number().int().nonnegative('Sort order must be a non-negative number').optional(),
  status: z.enum(['active', 'inactive'])
});

type Topic = {
  id: string;
  unit_id: string;
  name: string;
  sort: number | null;
  status: 'active' | 'inactive';
  created_at: string;
  unit_name: string;
  subject_name: string;
};

type Subject = {
  id: string;
  name: string;
  status: 'active' | 'inactive';
};

type Unit = {
  id: string;
  subject_id: string;
  name: string;
  status: 'active' | 'inactive';
};

interface FilterState {
  subject_id: string;
  unit_id: string;
  status: string[];
}

interface FormState {
  subject_id: string;
  unit_id: string;
  name: string;
  sort: number;
  status: 'active' | 'inactive';
}

export default function TopicsTable() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filterUnits, setFilterUnits] = useState<Unit[]>([]);
  const [formUnits, setFormUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [topicsToDelete, setTopicsToDelete] = useState<Topic[]>([]);
  
  const [formState, setFormState] = useState<FormState>({
    subject_id: '',
    unit_id: '',
    name: '',
    sort: 0,
    status: 'active'
  });
  
  const [filters, setFilters] = useState<FilterState>({
    subject_id: '',
    unit_id: '',
    status: []
  });

  const fetchTopics = useCallback(async () => {
    setLoading(true);
    try {
      // First, fetch the topics
      let query = supabase
        .from('edu_topics')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.unit_id) {
        query = query.eq('unit_id', filters.unit_id);
      } else if (filters.subject_id) {
        // If only subject is selected, we need to get all units for that subject
        const { data: units } = await supabase
          .from('edu_units')
          .select('id')
          .eq('subject_id', filters.subject_id);

        if (units && units.length > 0) {
          query = query.in('unit_id', units.map(u => u.id));
        }
      }

      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      const { data: topicsData, error } = await query;

      if (error) throw error;

      if (!topicsData || topicsData.length === 0) {
        setTopics([]);
        setLoading(false);
        return;
      }

      // Get all unit IDs from the topics
      const unitIds = [...new Set(topicsData.map(topic => topic.unit_id))];

      // Fetch units with their subjects
      const { data: unitsData, error: unitsError } = await supabase
        .from('edu_units')
        .select('id, name, subject_id')
        .in('id', unitIds);

      if (unitsError) throw unitsError;

      // Get all subject IDs from the units
      const subjectIds = [...new Set(unitsData.map(unit => unit.subject_id))];

      // Fetch subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('edu_subjects')
        .select('id, name, code, status')
        .in('id', subjectIds);

      if (subjectsError) throw subjectsError;

      // Create lookup maps
      const subjectMap = new Map(subjectsData.map(subject => [subject.id, subject]));
      const unitMap = new Map(unitsData.map(unit => [unit.id, { ...unit, subject: subjectMap.get(unit.subject_id) }]));

      // Map topics with their related data
      const formattedTopics = topicsData.map(topic => {
        const unit = unitMap.get(topic.unit_id);
        const subject = unit?.subject;

        return {
          ...topic,
          unit_name: unit?.name || 'Unknown Unit',
          subject_name: subject?.name || 'Unknown Subject'
        };
      });

      setTopics(formattedTopics);
    } catch (error) {
      console.error('Error fetching topics:', error);
      toast.error('Failed to fetch topics');
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
    fetchTopics();
  }, [fetchTopics]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  // Filter cascade effects
  useEffect(() => {
    if (filters.subject_id) {
      fetchFilterUnits(filters.subject_id);
    } else {
      setFilterUnits([]);
      setFilters(prev => ({ ...prev, unit_id: '' }));
    }
  }, [filters.subject_id]);

  // Form cascade effects
  useEffect(() => {
    if (formState.subject_id) {
      fetchFormUnits(formState.subject_id);
    } else {
      setFormUnits([]);
      setFormState(prev => ({ ...prev, unit_id: '' }));
    }
  }, [formState.subject_id]);

  // Populate form when editing
  useEffect(() => {
    if (editingTopic) {
      const fetchTopicDetails = async () => {
        try {
          // Get unit to find subject_id
          const { data: unit, error: unitError } = await supabase
            .from('edu_units')
            .select('id, subject_id')
            .eq('id', editingTopic.unit_id)
            .single();

          if (unitError) throw unitError;

          // Set form state with all IDs
          setFormState({
            subject_id: unit.subject_id,
            unit_id: editingTopic.unit_id,
            name: editingTopic.name,
            sort: editingTopic.sort || 0,
            status: editingTopic.status
          });

          // Fetch cascading options
          await fetchFormUnits(unit.subject_id);
        } catch (error) {
          console.error('Error fetching topic details:', error);
          toast.error('Failed to load topic details');
        }
      };

      fetchTopicDetails();
    } else {
      setFormState({
        subject_id: '',
        unit_id: '',
        name: '',
        sort: 0,
        status: 'active'
      });
    }
  }, [editingTopic]);


  const fetchFilterUnits = async (subjectId: string) => {
    try {
      const { data, error } = await supabase
        .from('edu_units')
        .select('*')
        .eq('subject_id', subjectId)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setFilterUnits(data || []);
    } catch (error) {
      console.error('Error fetching filter units:', error);
      toast.error('Failed to fetch units');
    }
  };

  const fetchFormUnits = async (subjectId: string) => {
    try {
      const { data, error } = await supabase
        .from('edu_units')
        .select('*')
        .eq('subject_id', subjectId)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setFormUnits(data || []);
    } catch (error) {
      console.error('Error fetching form units:', error);
      toast.error('Failed to fetch units');
    }
  };

  const handleSubjectChange = (value: string) => {
    setFormState(prev => ({ ...prev, subject_id: value, unit_id: '' }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors({});

    try {
      const validatedData = topicSchema.parse({
        unit_id: formState.unit_id,
        name: formState.name,
        sort: formState.sort,
        status: formState.status
      });

      // Check for unique constraints
      const { data: existingTopics, error: checkError } = await supabase
        .from('edu_topics')
        .select('id')
        .eq('unit_id', validatedData.unit_id)
        .eq('name', validatedData.name);

      if (checkError) throw checkError;

      // For updates, filter out the current topic from uniqueness check
      const conflictingTopics = editingTopic
        ? existingTopics?.filter(t => t.id !== editingTopic.id)
        : existingTopics;

      if (conflictingTopics && conflictingTopics.length > 0) {
        setFormErrors({
          form: 'A topic with this name already exists for the selected unit'
        });
        return;
      }

      if (editingTopic) {
        const { error } = await supabase
          .from('edu_topics')
          .update(validatedData)
          .eq('id', editingTopic.id);

        if (error) throw error;
        toast.success('Topic updated successfully');
      } else {
        const { error } = await supabase
          .from('edu_topics')
          .insert([validatedData]);

        if (error) throw error;
        toast.success('Topic created successfully');
      }

      await fetchTopics();
      setIsFormOpen(false);
      setEditingTopic(null);
      setFormState({
        subject_id: '',
        unit_id: '',
        name: '',
        sort: 0,
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
        console.error('Error saving topic:', error);
        setFormErrors({ form: 'Failed to save topic. Please try again.' });
        toast.error('Failed to save topic');
      }
    }
  };

  const handleDelete = (topics: Topic[]) => {
    setTopicsToDelete(topics);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      const { error } = await supabase
        .from('edu_topics')
        .delete()
        .in('id', topicsToDelete.map(t => t.id));

      if (error) throw error;
      await fetchTopics();
      toast.success('Topic(s) deleted successfully');
      setIsConfirmDialogOpen(false);
      setTopicsToDelete([]);
    } catch (error) {
      console.error('Error deleting topics:', error);
      toast.error('Failed to delete topic(s)');
      setIsConfirmDialogOpen(false);
      setTopicsToDelete([]);
    }
  };

  const cancelDelete = () => {
    setIsConfirmDialogOpen(false);
    setTopicsToDelete([]);
  };

  const columns = [
    {
      id: 'name',
      header: 'Name',
      accessorKey: 'name',
      enableSorting: true,
    },
    {
      id: 'unit',
      header: 'Unit',
      accessorKey: 'unit_name',
      enableSorting: true,
    },
    {
      id: 'subject',
      header: 'Subject',
      accessorKey: 'subject_name',
      enableSorting: true,
    },
    {
      id: 'sort',
      header: 'Sort Order',
      accessorKey: 'sort',
      enableSorting: true,
      cell: (row: Topic) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {row.sort ?? '-'}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: true,
      cell: (row: Topic) => (
        <StatusBadge status={row.status} />
      ),
    },
    {
      id: 'created_at',
      header: 'Created At',
      accessorKey: 'created_at',
      enableSorting: true,
      cell: (row: Topic) => (
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
            setEditingTopic(null);
            setIsFormOpen(true);
          }}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add Topic
        </Button>
      </div>

      <FilterCard
        title="Filters"
        onApply={fetchTopics}
        onClear={() => {
          setFilters({
            subject_id: '',
            unit_id: '',
            status: []
          });
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SearchableMultiSelect
            label="Subject"
            options={subjects.map(subject => ({
              value: subject.id,
              label: subject.name
            }))}
            selectedValues={filters.subject_id ? [filters.subject_id] : []}
            onChange={(values) =>
              setFilters(prev => ({
                ...prev,
                subject_id: values[0] || '',
                unit_id: ''
              }))
            }
            isMulti={false}
            placeholder="Select subject..."
          />

          <SearchableMultiSelect
            label="Unit"
            options={filterUnits.map(unit => ({
              value: unit.id,
              label: unit.name
            }))}
            selectedValues={filters.unit_id ? [filters.unit_id] : []}
            onChange={(values) =>
              setFilters(prev => ({
                ...prev,
                unit_id: values[0] || ''
              }))
            }
            isMulti={false}
            disabled={!filters.subject_id}
            placeholder="Select unit..."
          />

          <SearchableMultiSelect
            label="Status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
            selectedValues={filters.status}
            onChange={(values) =>
              setFilters(prev => ({
                ...prev,
                status: values
              }))
            }
            placeholder="Select status..."
          />
        </div>
      </FilterCard>

      <DataTable
        data={topics}
        columns={columns}
        keyField="id"
        caption="List of educational topics with their unit and subject associations"
        ariaLabel="Educational topics data table"
        loading={loading}
        onEdit={(topic) => {
          setEditingTopic(topic);
          setIsFormOpen(true);
        }}
        onDelete={handleDelete}
        emptyMessage="No topics found"
      />

      <SlideInForm
        key={editingTopic?.id || `new-${Date.now()}`}
        title={editingTopic ? 'Edit Topic' : 'Create Topic'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTopic(null);
          setFormState({
            subject_id: '',
            unit_id: '',
            name: '',
            sort: 0,
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
              onChange={(value) => handleSubjectChange(value)}
            />
          </FormField>

          <FormField
            id="unit_id"
            label="Unit"
            required
            error={formErrors.unit_id}
          >
            <Select
              id="unit_id"
              name="unit_id"
              options={formUnits.map(unit => ({
                value: unit.id,
                label: unit.name
              }))}
              value={formState.unit_id}
              onChange={(value) => setFormState(prev => ({ ...prev, unit_id: value }))}
              disabled={!formState.subject_id}
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
              placeholder="Enter topic name"
              value={formState.name}
              onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
            />
          </FormField>

          <FormField
            id="sort"
            label="Sort Order"
            error={formErrors.sort}
          >
            <Input
              id="sort"
              name="sort"
              type="number"
              min="0"
              placeholder="Enter sort order"
              value={formState.sort}
              onChange={(e) => setFormState(prev => ({ ...prev, sort: parseInt(e.target.value) || 0 }))}
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
        title="Delete Topic"
        message={`Are you sure you want to delete ${topicsToDelete.length} topic(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}