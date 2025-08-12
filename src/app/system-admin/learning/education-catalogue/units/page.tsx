import React, { useState, useEffect } from 'react';
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
  course_id: z.string().uuid('Please select a course'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().min(1, 'Code is required'),
  status: z.enum(['active', 'inactive'])
});

type Unit = {
  id: string;
  course_id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive';
  created_at: string;
  course_name: string;
};

type Subject = {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive';
};

type Course = {
  id: string;
  subject_id: string;
  name: string;
  level: string;
  status: 'active' | 'inactive';
};

interface FilterState {
  subject_id: string;
  course_id: string;
  status: string;
}

interface FormState {
  subject_id: string;
  course_id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive';
}

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filterCourses, setFilterCourses] = useState<Course[]>([]);
  const [formCourses, setFormCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [unitsToDelete, setUnitsToDelete] = useState<Unit[]>([]);
  
  const [formState, setFormState] = useState<FormState>({
    subject_id: '',
    course_id: '',
    name: '',
    code: '',
    status: 'active'
  });
  
  const [filters, setFilters] = useState<FilterState>({
    subject_id: '',
    course_id: '',
    status: ''
  });

  useEffect(() => {
    fetchUnits();
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (filters.subject_id) {
      fetchFilterCourses(filters.subject_id);
    } else {
      setFilterCourses([]);
      // Clear course filter when no subject is selected
      if (filters.course_id) {
        setFilters(prev => ({ ...prev, course_id: '' }));
      }
    }
  }, [filters.subject_id]);

  useEffect(() => {
    if (editingUnit) {
      // Find the course for this unit to get the subject_id
      const fetchUnitCourse = async () => {
        try {
          const { data: course, error } = await supabase
            .from('edu_courses')
            .select('id, subject_id, name')
            .eq('id', editingUnit.course_id)
            .single();

          if (error) throw error;

          setFormState({
            subject_id: course.subject_id,
            course_id: editingUnit.course_id,
            name: editingUnit.name,
            code: editingUnit.code,
            status: editingUnit.status
          });

          // Fetch courses for this subject
          await fetchFormCourses(course.subject_id);
        } catch (error) {
          console.error('Error fetching unit course:', error);
          toast.error('Failed to load unit details');
        }
      };

      fetchUnitCourse();
    } else {
      setFormState({
        subject_id: '',
        course_id: '',
        name: '',
        code: '',
        status: 'active'
      });
      setFormCourses([]);
    }
  }, [editingUnit]);

  const fetchUnits = async () => {
    try {
      let query = supabase
        .from('edu_units')
        .select(`
          *,
          edu_courses (
            id,
            name,
            subject_id
          )
        `)
        .order('created_at', { ascending: false });

      if (filters.course_id) {
        query = query.eq('course_id', filters.course_id);
      } else if (filters.subject_id) {
        // If only subject is selected, we need to get all courses for that subject
        const { data: courses } = await supabase
          .from('edu_courses')
          .select('id')
          .eq('subject_id', filters.subject_id);
        
        if (courses && courses.length > 0) {
          query = query.in('course_id', courses.map(c => c.id));
        }
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedData = data?.map(unit => ({
        ...unit,
        course_name: unit.edu_courses?.name || 'Unknown Course'
      })) || [];

      setUnits(formattedData);
    } catch (error) {
      console.error('Error fetching units:', error);
      toast.error('Failed to fetch units');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('edu_subjects')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast.error('Failed to fetch subjects');
    }
  };

  const fetchFilterCourses = async (subjectId: string) => {
    try {
      const { data, error } = await supabase
        .from('edu_courses')
        .select('*')
        .eq('subject_id', subjectId)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setFilterCourses(data || []);
    } catch (error) {
      console.error('Error fetching filter courses:', error);
      toast.error('Failed to fetch courses');
    }
  };

  const fetchFormCourses = async (subjectId: string) => {
    try {
      const { data, error } = await supabase
        .from('edu_courses')
        .select('*')
        .eq('subject_id', subjectId)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setFormCourses(data || []);
    } catch (error) {
      console.error('Error fetching form courses:', error);
      toast.error('Failed to fetch courses');
    }
  };

  const handleSubjectChange = (subjectId: string) => {
    setFormState(prev => ({
      ...prev,
      subject_id: subjectId,
      course_id: ''
    }));
    if (subjectId) {
      fetchFormCourses(subjectId);
    } else {
      setFormCourses([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors({});

    try {
      const validatedData = unitSchema.parse({
        course_id: formState.course_id,
        name: formState.name,
        code: formState.code,
        status: formState.status
      });

      // Check for unique constraints
      const { data: existingUnits, error: checkError } = await supabase
        .from('edu_units')
        .select('id')
        .eq('course_id', validatedData.course_id)
        .or(`name.eq.${validatedData.name},code.eq.${validatedData.code}`);

      if (checkError) throw checkError;

      // For updates, filter out the current unit from uniqueness check
      const conflictingUnits = editingUnit
        ? existingUnits?.filter(u => u.id !== editingUnit.id)
        : existingUnits;

      if (conflictingUnits && conflictingUnits.length > 0) {
        setFormErrors({
          form: 'A unit with this name or code already exists for the selected course'
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
        course_id: '',
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
      id: 'course',
      header: 'Course',
      accessorKey: 'course_name',
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
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Education Catalogue</h1>
        <div className="flex items-center mt-2">
          <span className="text-gray-600 dark:text-gray-400">Units / Modules</span>
        </div>
      </div>

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
            course_id: '',
            status: ''
          });
          fetchUnits();
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FilterCard.Dropdown
            id="subject_id"
            label="Subject"
            options={subjects.map(subject => ({
              value: subject.id,
              label: subject.name
            }))}
            value={filters.subject_id}
            onChange={(value) => setFilters({ ...filters, subject_id: value, course_id: '' })}
          />

          <FilterCard.Dropdown
            id="course_id"
            label="Course"
            options={filterCourses.map(course => ({
              value: course.id,
              label: course.name
            }))}
            value={filters.course_id}
            onChange={(value) => setFilters({ ...filters, course_id: value })}
            disabled={!filters.subject_id}
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
            course_id: '',
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
              onChange={(value) => handleSubjectChange(value)}
            />
          </FormField>

          <FormField
            id="course_id"
            label="Course"
            required
            error={formErrors.course_id}
          >
            <Select
              id="course_id"
              name="course_id"
              options={formCourses.map(course => ({
                value: course.id,
                label: course.name
              }))}
              value={formState.course_id}
              onChange={(value) => setFormState(prev => ({ ...prev, course_id: value }))}
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
              onChange={(value) => setFormState(prev => ({ ...prev, status: value as 'active' | 'inactive' }))}
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