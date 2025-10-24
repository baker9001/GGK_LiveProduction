import React, { useState, useEffect } from 'react';
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

const objectiveSchema = z.object({
  subtopic_id: z.string().uuid('Please select a subtopic'),
  name: z.string().min(5, 'Name must be at least 5 characters'),
  sort: z.number().int().nonnegative('Sort order must be a non-negative number').optional(),
  status: z.enum(['active', 'inactive'])
});

type Objective = {
  id: string;
  subtopic_id: string;
  name: string;
  sort: number | null;
  status: 'active' | 'inactive';
  created_at: string;
  subtopic_name: string;
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

type Subtopic = {
  id: string;
  topic_id: string;
  name: string;
};

interface FilterState {
  subject_id: string;
  unit_id: string;
  topic_id: string;
  subtopic_id: string;
  status: string[];
}

interface FormState {
  subject_id: string;
  unit_id: string;
  topic_id: string;
  subtopic_id: string;
  name: string;
  sort: number;
  status: 'active' | 'inactive';
}

export default function ObjectivesTable() {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filterUnits, setFilterUnits] = useState<Unit[]>([]);
  const [filterTopics, setFilterTopics] = useState<Topic[]>([]);
  const [filterSubtopics, setFilterSubtopics] = useState<Subtopic[]>([]);
  const [formUnits, setFormUnits] = useState<Unit[]>([]);
  const [formTopics, setFormTopics] = useState<Topic[]>([]);
  const [formSubtopics, setFormSubtopics] = useState<Subtopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingObjective, setEditingObjective] = useState<Objective | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [objectivesToDelete, setObjectivesToDelete] = useState<Objective[]>([]);
  
  const [formState, setFormState] = useState<FormState>({
    subject_id: '',
    unit_id: '',
    topic_id: '',
    subtopic_id: '',
    name: '',
    sort: 0,
    status: 'active'
  });
  
  const [filters, setFilters] = useState<FilterState>({
    subject_id: '',
    unit_id: '',
    topic_id: '',
    subtopic_id: '',
    status: []
  });

  useEffect(() => {
    fetchObjectives();
    fetchSubjects();
  }, []);

  // Filter cascade effects
  useEffect(() => {
    if (filters.subject_id) {
      fetchFilterUnits(filters.subject_id);
    } else {
      setFilterUnits([]);
      setFilters(prev => ({ ...prev, unit_id: '', topic_id: '', subtopic_id: '' }));
    }
  }, [filters.subject_id]);

  useEffect(() => {
    if (filters.unit_id) {
      fetchFilterTopics(filters.unit_id);
    } else {
      setFilterTopics([]);
      setFilters(prev => ({ ...prev, topic_id: '', subtopic_id: '' }));
    }
  }, [filters.unit_id]);

  useEffect(() => {
    if (filters.topic_id) {
      fetchFilterSubtopics(filters.topic_id);
    } else {
      setFilterSubtopics([]);
      setFilters(prev => ({ ...prev, subtopic_id: '' }));
    }
  }, [filters.topic_id]);

  // Form cascade effects
  useEffect(() => {
    if (formState.subject_id) {
      fetchFormUnits(formState.subject_id);
    } else {
      setFormUnits([]);
      setFormState(prev => ({ ...prev, unit_id: '', topic_id: '', subtopic_id: '' }));
    }
  }, [formState.subject_id]);

  useEffect(() => {
    if (formState.unit_id) {
      fetchFormTopics(formState.unit_id);
    } else {
      setFormTopics([]);
      setFormState(prev => ({ ...prev, topic_id: '', subtopic_id: '' }));
    }
  }, [formState.unit_id]);

  useEffect(() => {
    if (formState.topic_id) {
      fetchFormSubtopics(formState.topic_id);
    } else {
      setFormSubtopics([]);
      setFormState(prev => ({ ...prev, subtopic_id: '' }));
    }
  }, [formState.topic_id]);

  // Populate form when editing
  useEffect(() => {
    if (editingObjective) {
      const fetchObjectiveDetails = async () => {
        try {
          // Get subtopic to find topic_id
          const { data: subtopic, error: subtopicError } = await supabase
            .from('edu_subtopics')
            .select('id, topic_id')
            .eq('id', editingObjective.subtopic_id)
            .single();

          if (subtopicError) throw subtopicError;

          // Get topic to find unit_id
          const { data: topic, error: topicError } = await supabase
            .from('edu_topics')
            .select('id, unit_id')
            .eq('id', subtopic.topic_id)
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
            topic_id: subtopic.topic_id,
            subtopic_id: editingObjective.subtopic_id,
            name: editingObjective.name,
            sort: editingObjective.sort || 0,
            status: editingObjective.status
          });

          // Fetch cascading options
          await fetchFormUnits(unit.subject_id);
          await fetchFormTopics(topic.unit_id);
          await fetchFormSubtopics(subtopic.topic_id);
        } catch (error) {
          console.error('Error fetching objective details:', error);
          toast.error('Failed to load objective details');
        }
      };

      fetchObjectiveDetails();
    } else {
      setFormState({
        subject_id: '',
        unit_id: '',
        topic_id: '',
        subtopic_id: '',
        name: '',
        sort: 0,
        status: 'active'
      });
    }
  }, [editingObjective]);

  const fetchObjectives = async () => {
    try {
      // First, fetch the objectives
      let query = supabase
        .from('edu_learning_objectives')
        .select('id, subtopic_id, name, sort, status, created_at')
        .order('created_at', { ascending: false });

      if (filters.subtopic_id) {
        query = query.eq('subtopic_id', filters.subtopic_id);
      } else if (filters.topic_id) {
        // If only topic is selected, we need to get all subtopics for that topic
        const { data: subtopics } = await supabase
          .from('edu_subtopics')
          .select('id')
          .eq('topic_id', filters.topic_id);
        
        if (subtopics && subtopics.length > 0) {
          query = query.in('subtopic_id', subtopics.map(s => s.id));
        }
      } else if (filters.unit_id) {
        // If only unit is selected, we need to get all topics for that unit
        const { data: topics } = await supabase
          .from('edu_topics')
          .select('id')
          .eq('unit_id', filters.unit_id);
        
        if (topics && topics.length > 0) {
          const { data: subtopics } = await supabase
            .from('edu_subtopics')
            .select('id')
            .in('topic_id', topics.map(t => t.id));
          
          if (subtopics && subtopics.length > 0) {
            query = query.in('subtopic_id', subtopics.map(s => s.id));
          }
        }
      } else if (filters.subject_id) {
        // If only subject is selected, we need to get all units for that subject
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
            const { data: subtopics } = await supabase
              .from('edu_subtopics')
              .select('id')
              .in('topic_id', topics.map(t => t.id));
            
            if (subtopics && subtopics.length > 0) {
              query = query.in('subtopic_id', subtopics.map(s => s.id));
            }
          }
        }
      }

      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      const { data: objectivesData, error } = await query;

      if (error) throw error;

      if (!objectivesData || objectivesData.length === 0) {
        setObjectives([]);
        setLoading(false);
        return;
      }

      // Get all subtopic IDs from the objectives
      const subtopicIds = [...new Set(objectivesData.map(objective => objective.subtopic_id))];

      // Fetch subtopics with their topics
      const { data: subtopicsData, error: subtopicsError } = await supabase
        .from('edu_subtopics')
        .select('id, name, topic_id')
        .in('id', subtopicIds);

      if (subtopicsError) throw subtopicsError;

      // Get all topic IDs from the subtopics
      const topicIds = [...new Set(subtopicsData.map(subtopic => subtopic.topic_id))];

      // Fetch topics with their units
      const { data: topicsData, error: topicsError } = await supabase
        .from('edu_topics')
        .select('id, name, unit_id')
        .in('id', topicIds);

      if (topicsError) throw topicsError;

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
      const topicMap = new Map(topicsData.map(topic => [topic.id, { ...topic, unit: unitMap.get(topic.unit_id) }]));
      const subtopicMap = new Map(subtopicsData.map(subtopic => [subtopic.id, { ...subtopic, topic: topicMap.get(subtopic.topic_id) }]));

      // Map objectives with their related data
      const formattedObjectives = objectivesData.map(objective => {
        const subtopic = subtopicMap.get(objective.subtopic_id);
        const topic = subtopic?.topic;
        const unit = topic?.unit;
        const subject = unit?.subject;

        return {
          ...objective,
          subtopic_name: subtopic?.name || 'Unknown Subtopic',
          topic_name: topic?.name || 'Unknown Topic',
          unit_name: unit?.name || 'Unknown Unit',
          subject_name: subject?.name || 'Unknown Subject'
        };
      });

      setObjectives(formattedObjectives);
    } catch (error) {
      console.error('Error fetching objectives:', error);
      toast.error('Failed to fetch objectives');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
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

  const fetchFilterSubtopics = async (topicId: string) => {
    try {
      const { data, error } = await supabase
        .from('edu_subtopics')
        .select('*')
        .eq('topic_id', topicId)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setFilterSubtopics(data || []);
    } catch (error) {
      console.error('Error fetching filter subtopics:', error);
      toast.error('Failed to fetch subtopics');
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

  const fetchFormSubtopics = async (topicId: string) => {
    try {
      const { data, error } = await supabase
        .from('edu_subtopics')
        .select('*')
        .eq('topic_id', topicId)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setFormSubtopics(data || []);
    } catch (error) {
      console.error('Error fetching form subtopics:', error);
      toast.error('Failed to fetch subtopics');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors({});

    try {
      const validatedData = objectiveSchema.parse({
        subtopic_id: formState.subtopic_id,
        name: formState.name,
        sort: formState.sort,
        status: formState.status
      });

      if (editingObjective) {
        const { error } = await supabase
          .from('edu_learning_objectives')
          .update(validatedData)
          .eq('id', editingObjective.id);

        if (error) throw error;
        toast.success('Objective updated successfully');
      } else {
        const { error } = await supabase
          .from('edu_learning_objectives')
          .insert([validatedData]);

        if (error) throw error;
        toast.success('Objective created successfully');
      }

      await fetchObjectives();
      setIsFormOpen(false);
      setEditingObjective(null);
      setFormState({
        subject_id: '',
        unit_id: '',
        topic_id: '',
        subtopic_id: '',
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
        console.error('Error saving objective:', error);
        setFormErrors({ form: 'Failed to save objective. Please try again.' });
        toast.error('Failed to save objective');
      }
    }
  };

  const handleDelete = (objectives: Objective[]) => {
    setObjectivesToDelete(objectives);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      const { error } = await supabase
        .from('edu_learning_objectives')
        .delete()
        .in('id', objectivesToDelete.map(o => o.id));

      if (error) throw error;
      await fetchObjectives();
      toast.success('Objective(s) deleted successfully');
      setIsConfirmDialogOpen(false);
      setObjectivesToDelete([]);
    } catch (error) {
      console.error('Error deleting objectives:', error);
      toast.error('Failed to delete objective(s)');
      setIsConfirmDialogOpen(false);
      setObjectivesToDelete([]);
    }
  };

  const cancelDelete = () => {
    setIsConfirmDialogOpen(false);
    setObjectivesToDelete([]);
  };

  const columns = [
    {
      id: 'description',
      header: 'Description',
      accessorKey: 'name',
      enableSorting: true,
      cell: (row: Objective) => (
        <div className="max-w-md truncate">
          {row.name}
        </div>
      ),
    },
    {
      id: 'subtopic',
      header: 'Subtopic',
      accessorKey: 'subtopic_name',
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
      id: 'status',
      header: 'Status',
      enableSorting: true,
      cell: (row: Objective) => (
        <StatusBadge status={row.status} />
      ),
    },
    {
      id: 'created_at',
      header: 'Created At',
      accessorKey: 'created_at',
      enableSorting: true,
      cell: (row: Objective) => (
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
            setEditingObjective(null);
            setIsFormOpen(true);
          }}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add Objective
        </Button>
      </div>

      <FilterCard
        title="Filters"
        onApply={fetchObjectives}
        onClear={() => {
          setFilters({
            subject_id: '',
            unit_id: '',
            topic_id: '',
            subtopic_id: '',
            status: []
          });
          fetchObjectives();
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <SearchableMultiSelect
            label="Subject"
            options={subjects.map(subject => ({
              value: subject.id,
              label: subject.name
            }))}
            selectedValues={filters.subject_id ? [filters.subject_id] : []}
            onChange={(values) => setFilters({ ...filters, subject_id: values[0] || '', unit_id: '', topic_id: '', subtopic_id: '' })}
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
            onChange={(values) => setFilters({ ...filters, unit_id: values[0] || '', topic_id: '', subtopic_id: '' })}
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
            onChange={(values) => setFilters({ ...filters, topic_id: values[0] || '', subtopic_id: '' })}
            isMulti={false}
            disabled={!filters.unit_id}
            placeholder="Select topic..."
          />

          <SearchableMultiSelect
            label="Subtopic"
            options={filterSubtopics.map(subtopic => ({
              value: subtopic.id,
              label: subtopic.name
            }))}
            selectedValues={filters.subtopic_id ? [filters.subtopic_id] : []}
            onChange={(values) => setFilters({ ...filters, subtopic_id: values[0] || '' })}
            isMulti={false}
            disabled={!filters.topic_id}
            placeholder="Select subtopic..."
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
        data={objectives}
        columns={columns}
        keyField="id"
        caption="List of learning objectives with their subtopic, topic, unit, and subject associations"
        ariaLabel="Learning objectives data table"
        loading={loading}
        onEdit={(objective) => {
          setEditingObjective(objective);
          setIsFormOpen(true);
        }}
        onDelete={handleDelete}
        emptyMessage="No objectives found"
      />

      <SlideInForm
        key={editingObjective?.id || 'new'}
        title={editingObjective ? 'Edit Objective' : 'Create Objective'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingObjective(null);
          setFormState({
            subject_id: '',
            unit_id: '',
            topic_id: '',
            subtopic_id: '',
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
              onChange={(value) => setFormState(prev => ({ ...prev, subject_id: value, unit_id: '', topic_id: '', subtopic_id: '' }))}
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
              onChange={(value) => setFormState(prev => ({ ...prev, unit_id: value, topic_id: '', subtopic_id: '' }))}
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
              onChange={(value) => setFormState(prev => ({ ...prev, topic_id: value, subtopic_id: '' }))}
              disabled={!formState.unit_id}
            />
          </FormField>

          <FormField
            id="subtopic_id"
            label="Subtopic"
            required
            error={formErrors.subtopic_id}
          >
            <Select
              id="subtopic_id"
              name="subtopic_id"
              options={formSubtopics.map(subtopic => ({
                value: subtopic.id,
                label: subtopic.name
              }))}
              value={formState.subtopic_id}
              onChange={(value) => setFormState(prev => ({ ...prev, subtopic_id: value }))}
              disabled={!formState.topic_id}
            />
          </FormField>

          <FormField
            id="name"
            label="Name"
            required
            error={formErrors.name}
          >
            <Textarea
              id="name"
              name="name"
              placeholder="Enter learning objective"
              value={formState.name}
              onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
              rows={3}
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
        title="Delete Objective"
        message={`Are you sure you want to delete ${objectivesToDelete.length} objective(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}