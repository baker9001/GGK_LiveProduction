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

const subtopicSchema = z.object({
  topic_id: z.string().uuid('Please select a topic'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  sort: z.number().int().nonnegative('Sort order must be a non-negative number').optional(),
  status: z.enum(['active', 'inactive'])
});

type Subtopic = {
  id: string;
  topic_id: string;
  name: string;
  sort: number | null;
  status: 'active' | 'inactive';
  created_at: string;
  topic_name: string;
  unit_name: string;
  subject_name: string;
};

type Subject = {
  id: string;
  name: string;
};

type Unit = {
  id: string;
  subject_id: string;
  name: string;
};

type Topic = {
  id: string;
  unit_id: string;
  name: string;
};

interface FilterState {
  subject_id: string;
  unit_id: string;
  topic_id: string;
  status: string[];
}

interface FormState {
  subject_id: string;
  unit_id: string;
  topic_id: string;
  name: string;
  sort: number;
  status: 'active' | 'inactive';
}

export default function SubtopicsTable() {
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filterUnits, setFilterUnits] = useState<Unit[]>([]);
  const [filterTopics, setFilterTopics] = useState<Topic[]>([]);
  const [formUnits, setFormUnits] = useState<Unit[]>([]);
  const [formTopics, setFormTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSubtopic, setEditingSubtopic] = useState<Subtopic | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [subtopicsToDelete, setSubtopicsToDelete] = useState<Subtopic[]>([]);
  
  const [formState, setFormState] = useState<FormState>({
    subject_id: '',
    unit_id: '',
    topic_id: '',
    name: '',
    sort: 0,
    status: 'active'
  });
  
  const [filters, setFilters] = useState<FilterState>({
    subject_id: '',
    unit_id: '',
    topic_id: '',
    status: []
  });

  const fetchSubtopics = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('edu_subtopics')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.topic_id) {
        query = query.eq('topic_id', filters.topic_id);
      } else if (filters.unit_id) {
        const { data: topics } = await supabase
          .from('edu_topics')
          .select('id')
          .eq('unit_id', filters.unit_id);

        if (topics && topics.length > 0) {
          query = query.in('topic_id', topics.map(t => t.id));
        }
      } else if (filters.subject_id) {
        const { data: units } = await supabase
          .from('edu_units')
          .select('id')
          .eq('subject_id', filters.subject_id);

        if (units && units.length > 0) {
          const { data: topics } = await supabase
            .from('edu_topics')
            .select('id')
            .in('unit_id', units.map(u => u.id));

          if (topics && topics.length > 0) {
            query = query.in('topic_id', topics.map(t => t.id));
          }
        }
      }

      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      const { data: subtopicsData, error } = await query;

      if (error) throw error;

      if (!subtopicsData || subtopicsData.length === 0) {
        setSubtopics([]);
        setLoading(false);
        return;
      }

      const topicIds = [...new Set(subtopicsData.map(subtopic => subtopic.topic_id))];

      const { data: topicsData, error: topicsError } = await supabase
        .from('edu_topics')
        .select('id, name, unit_id')
        .in('id', topicIds);

      if (topicsError) throw topicsError;

      const unitIds = [...new Set(topicsData.map(topic => topic.unit_id))];

      const { data: unitsData, error: unitsError } = await supabase
        .from('edu_units')
        .select('id, name, subject_id')
        .in('id', unitIds);

      if (unitsError) throw unitsError;

      const subjectIds = [...new Set(unitsData.map(unit => unit.subject_id))];

      const { data: subjectsData, error: subjectsError } = await supabase
        .from('edu_subjects')
        .select('id, name')
        .in('id', subjectIds);

      if (subjectsError) throw subjectsError;

      const subjectsMap = new Map(subjectsData.map(subject => [subject.id, subject]));
      const unitsMap = new Map(unitsData.map(unit => [unit.id, { ...unit, subject: subjectsMap.get(unit.subject_id) }]));
      const topicsMap = new Map(topicsData.map(topic => [topic.id, { ...topic, unit: unitsMap.get(topic.unit_id) }]));

      const formattedSubtopics = subtopicsData.map(subtopic => {
        const topic = topicsMap.get(subtopic.topic_id);
        const unit = topic?.unit;
        const subject = unit?.subject;

        return {
          ...subtopic,
          topic_name: topic?.name || 'Unknown Topic',
          unit_name: unit?.name || 'Unknown Unit',
          subject_name: subject?.name || 'Unknown Subject'
        };
      });

      setSubtopics(formattedSubtopics);
    } catch (error) {
      console.error('Error fetching subtopics:', error);
      toast.error('Failed to fetch subtopics');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchSubjects = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('edu_subjects')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast.error('Failed to fetch subjects');
    }
  }, []);

  useEffect(() => {
    fetchSubtopics();
  }, [fetchSubtopics]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  // Filter cascade effects
  useEffect(() => {
    if (filters.subject_id) {
      fetchFilterUnits(filters.subject_id);
    } else {
      setFilterUnits([]);
      setFilters(prev => ({ ...prev, unit_id: '', topic_id: '' }));
    }
  }, [filters.subject_id]);

  useEffect(() => {
    if (filters.unit_id) {
      fetchFilterTopics(filters.unit_id);
    } else {
      setFilterTopics([]);
      setFilters(prev => ({ ...prev, topic_id: '' }));
    }
  }, [filters.unit_id]);

  // Form cascade effects
  useEffect(() => {
    if (formState.subject_id) {
      fetchFormUnits(formState.subject_id);
    } else {
      setFormUnits([]);
      setFormState(prev => ({ ...prev, unit_id: '', topic_id: '' }));
    }
  }, [formState.subject_id]);

  useEffect(() => {
    if (formState.unit_id) {
      fetchFormTopics(formState.unit_id);
    } else {
      setFormTopics([]);
      setFormState(prev => ({ ...prev, topic_id: '' }));
    }
  }, [formState.unit_id]);

  // Populate form when editing
  useEffect(() => {
    if (editingSubtopic) {
      const fetchSubtopicDetails = async () => {
        try {
          // Get topic to find unit_id
          const { data: topic, error: topicError } = await supabase
            .from('edu_topics')
            .select('id, unit_id')
            .eq('id', editingSubtopic.topic_id)
            .single();

          if (topicError) throw topicError;

          // Get unit to find subject_id
          const { data: unit, error: unitError } = await supabase
            .from('edu_units')
            .select('id, subject_id')
            .eq('id', topic.unit_id)
            .single();

          if (unitError) throw unitError;

          // Set form state with all IDs
          setFormState({
            subject_id: unit.subject_id,
            unit_id: topic.unit_id,
            topic_id: editingSubtopic.topic_id,
            name: editingSubtopic.name,
            sort: editingSubtopic.sort || 0,
            status: editingSubtopic.status
          });

          // Fetch cascading options
          await fetchFormUnits(unit.subject_id);
          await fetchFormTopics(topic.unit_id);
        } catch (error) {
          console.error('Error fetching subtopic details:', error);
          toast.error('Failed to load subtopic details');
        }
      };

      fetchSubtopicDetails();
    } else {
      setFormState({
        subject_id: '',
        unit_id: '',
        topic_id: '',
        name: '',
        sort: 0,
        status: 'active'
      });
    }
  }, [editingSubtopic]);
      });

      setSubtopics(formattedSubtopics);
    } catch (error) {
      console.error('Error fetching subtopics:', error);
      toast.error('Failed to fetch subtopics');
    } finally {
      setLoading(false);
    }
  };

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

  const fetchFilterTopics = async (unitId: string) => {
    try {
      const { data, error } = await supabase
        .from('edu_topics')
        .select('*')
        .eq('unit_id', unitId)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setFilterTopics(data || []);
    } catch (error) {
      console.error('Error fetching filter topics:', error);
      toast.error('Failed to fetch topics');
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

  const fetchFormTopics = async (unitId: string) => {
    try {
      const { data, error } = await supabase
        .from('edu_topics')
        .select('*')
        .eq('unit_id', unitId)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setFormTopics(data || []);
    } catch (error) {
      console.error('Error fetching form topics:', error);
      toast.error('Failed to fetch topics');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors({});

    try {
      const validatedData = subtopicSchema.parse({
        topic_id: formState.topic_id,
        name: formState.name,
        sort: formState.sort,
        status: formState.status
      });

      // Check for unique constraints
      const { data: existingSubtopics, error: checkError } = await supabase
        .from('edu_subtopics')
        .select('id')
        .eq('topic_id', validatedData.topic_id)
        .eq('name', validatedData.name);

      if (checkError) throw checkError;

      // For updates, filter out the current subtopic from uniqueness check
      const conflictingSubtopics = editingSubtopic
        ? existingSubtopics?.filter(s => s.id !== editingSubtopic.id)
        : existingSubtopics;

      if (conflictingSubtopics && conflictingSubtopics.length > 0) {
        setFormErrors({
          form: 'A subtopic with this name already exists for the selected topic'
        });
        return;
      }

      if (editingSubtopic) {
        const { error } = await supabase
          .from('edu_subtopics')
          .update(validatedData)
          .eq('id', editingSubtopic.id);

        if (error) throw error;
        toast.success('Subtopic updated successfully');
      } else {
        const { error } = await supabase
          .from('edu_subtopics')
          .insert([validatedData]);

        if (error) throw error;
        toast.success('Subtopic created successfully');
      }

      await fetchSubtopics();
      setIsFormOpen(false);
      setEditingSubtopic(null);
      setFormState({
        subject_id: '',
        unit_id: '',
        topic_id: '',
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
        console.error('Error saving subtopic:', error);
        setFormErrors({ form: 'Failed to save subtopic. Please try again.' });
        toast.error('Failed to save subtopic');
      }
    }
  };

  const handleDelete = (subtopics: Subtopic[]) => {
    setSubtopicsToDelete(subtopics);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      const { error } = await supabase
        .from('edu_subtopics')
        .delete()
        .in('id', subtopicsToDelete.map(s => s.id));

      if (error) throw error;
      await fetchSubtopics();
      toast.success('Subtopic(s) deleted successfully');
      setIsConfirmDialogOpen(false);
      setSubtopicsToDelete([]);
    } catch (error) {
      console.error('Error deleting subtopics:', error);
      toast.error('Failed to delete subtopic(s)');
      setIsConfirmDialogOpen(false);
      setSubtopicsToDelete([]);
    }
  };

  const cancelDelete = () => {
    setIsConfirmDialogOpen(false);
    setSubtopicsToDelete([]);
  };

  const columns = [
    {
      id: 'name',
      header: 'Name',
      accessorKey: 'name',
      enableSorting: true,
    },
    {
      id: 'topic',
      header: 'Topic',
      accessorKey: 'topic_name',
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
      cell: (row: Subtopic) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {row.sort ?? '-'}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: true,
      cell: (row: Subtopic) => (
        <StatusBadge status={row.status} />
      ),
    },
    {
      id: 'created_at',
      header: 'Created At',
      accessorKey: 'created_at',
      enableSorting: true,
      cell: (row: Subtopic) => (
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
            setEditingSubtopic(null);
            setIsFormOpen(true);
          }}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add Subtopic
        </Button>
      </div>

      <FilterCard
        title="Filters"
        onApply={fetchSubtopics}
        onClear={() => {
          setFilters({
            subject_id: '',
            unit_id: '',
            topic_id: '',
            status: []
          });
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                unit_id: '',
                topic_id: ''
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
                unit_id: values[0] || '',
                topic_id: ''
              }))
            }
            isMulti={false}
            disabled={!filters.subject_id}
            placeholder="Select unit..."
          />

          <SearchableMultiSelect
            label="Topic"
            options={filterTopics.map(topic => ({
              value: topic.id,
              label: topic.name
            }))}
            selectedValues={filters.topic_id ? [filters.topic_id] : []}
            onChange={(values) =>
              setFilters(prev => ({
                ...prev,
                topic_id: values[0] || ''
              }))
            }
            isMulti={false}
            disabled={!filters.unit_id}
            placeholder="Select topic..."
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
        data={subtopics}
        columns={columns}
        keyField="id"
        caption="List of educational subtopics with their topic, unit, and subject associations"
        ariaLabel="Educational subtopics data table"
        loading={loading}
        onEdit={(subtopic) => {
          setEditingSubtopic(subtopic);
          setIsFormOpen(true);
        }}
        onDelete={handleDelete}
        emptyMessage="No subtopics found"
      />

      <SlideInForm
        key={editingSubtopic?.id || 'new'}
        title={editingSubtopic ? 'Edit Subtopic' : 'Create Subtopic'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingSubtopic(null);
          setFormState({
            subject_id: '',
            unit_id: '',
            topic_id: '',
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
              onChange={(value) => setFormState(prev => ({ ...prev, subject_id: value, unit_id: '', topic_id: '' }))}
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
              onChange={(value) => setFormState(prev => ({ ...prev, unit_id: value, topic_id: '' }))}
              disabled={!formState.subject_id}
            />
          </FormField>

          <FormField
            id="topic_id"
            label="Topic"
            required
            error={formErrors.topic_id}
          >
            <Select
              id="topic_id"
              name="topic_id"
              options={formTopics.map(topic => ({
                value: topic.id,
                label: topic.name
              }))}
              value={formState.topic_id}
              onChange={(value) => setFormState(prev => ({ ...prev, topic_id: value }))}
              disabled={!formState.unit_id}
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
              placeholder="Enter subtopic name"
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
        title="Delete Subtopic"
        message={`Are you sure you want to delete ${subtopicsToDelete.length} subtopic(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}