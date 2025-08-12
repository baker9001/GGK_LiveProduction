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

const courseSchema = z.object({
  subject_id: z.string().uuid('Please select a subject'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  level: z.string().min(1, 'Level is required'),
  status: z.enum(['active', 'inactive'])
});

type Course = {
  id: string;
  subject_id: string;
  name: string;
  level: string;
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
  level: string;
  status: string;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<FilterState>({
    subject_id: '',
    level: '',
    status: ''
  });

  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [coursesToDelete, setCoursesToDelete] = useState<Course[]>([]);

  useEffect(() => {
    fetchCourses();
    fetchSubjects();
  }, []);

  const fetchCourses = async () => {
    try {
      let query = supabase
        .from('edu_courses')
        .select(`
          *,
          edu_subjects (
            id,
            name,
            code
          )
        `)
        .order('created_at', { ascending: false });

      if (filters.subject_id) {
        query = query.eq('subject_id', filters.subject_id);
      }

      if (filters.level) {
        query = query.ilike('level', `%${filters.level}%`);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedData = data.map(course => ({
        ...course,
        subject_name: course.edu_subjects?.name || 'Unknown Subject'
      }));

      setCourses(formattedData);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to fetch courses');
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors({});

    const formData = new FormData(e.currentTarget);
    const data = {
      subject_id: formData.get('subject_id') as string,
      name: formData.get('name') as string,
      level: formData.get('level') as string,
      status: formData.get('status') as 'active' | 'inactive'
    };

    try {
      const validatedData = courseSchema.parse(data);
      
      if (editingCourse) {
        const { error } = await supabase
          .from('edu_courses')
          .update(validatedData)
          .eq('id', editingCourse.id);

        if (error) throw error;
        toast.success('Course updated successfully');
      } else {
        const { error } = await supabase
          .from('edu_courses')
          .insert([validatedData]);

        if (error) throw error;
        toast.success('Course created successfully');
      }

      await fetchCourses();
      setIsFormOpen(false);
      setEditingCourse(null);
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
        console.error('Error saving course:', error);
        setFormErrors({ form: 'Failed to save course. Please try again.' });
        toast.error('Failed to save course');
      }
    }
  };

  const handleDelete = (courses: Course[]) => {
    setCoursesToDelete(courses);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      const { error } = await supabase
        .from('edu_courses')
        .delete()
        .in('id', coursesToDelete.map(c => c.id));

      if (error) throw error;
      await fetchCourses();
      toast.success('Course(s) deleted successfully');
      setIsConfirmDialogOpen(false);
      setCoursesToDelete([]);
    } catch (error) {
      console.error('Error deleting courses:', error);
      toast.error('Failed to delete course(s)');
      setIsConfirmDialogOpen(false);
      setCoursesToDelete([]);
    }
  };

  const cancelDelete = () => {
    setIsConfirmDialogOpen(false);
    setCoursesToDelete([]);
  };

  const columns = [
    {
      id: 'name',
      header: 'Name',
      accessorKey: 'name',
      enableSorting: true,
    },
    {
      id: 'level',
      header: 'Level',
      accessorKey: 'level',
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
      cell: (row: Course) => (
        <StatusBadge status={row.status} />
      ),
    },
    {
      id: 'created_at',
      header: 'Created At',
      accessorKey: 'created_at',
      enableSorting: true,
      cell: (row: Course) => (
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
          <span className="text-gray-600 dark:text-gray-400">Courses / Levels</span>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div />
        <Button
          onClick={() => {
            setEditingCourse(null);
            setIsFormOpen(true);
          }}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add Course
        </Button>
      </div>

      <FilterCard
        title="Filters"
        onApply={fetchCourses}
        onClear={() => {
          setFilters({
            subject_id: '',
            level: '',
            status: ''
          });
          fetchCourses();
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
            onChange={(value) => setFilters({ ...filters, subject_id: value })}
          />

          <FormField
            id="level"
            label="Level"
          >
            <Input
              id="level"
              placeholder="Search by level..."
              value={filters.level}
              onChange={(e) => setFilters({ ...filters, level: e.target.value })}
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
        data={courses}
        columns={columns}
        keyField="id"
        loading={loading}
        onEdit={(course) => {
          setEditingCourse(course);
          setIsFormOpen(true);
        }}
        onDelete={handleDelete}
        emptyMessage="No courses found"
      />

      <SlideInForm
        key={editingCourse?.id || 'new'}
        title={editingCourse ? 'Edit Course' : 'Create Course'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingCourse(null);
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
              defaultValue={editingCourse?.subject_id}
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
              placeholder="Enter course name"
              defaultValue={editingCourse?.name}
            />
          </FormField>

          <FormField
            id="level"
            label="Level"
            required
            error={formErrors.level}
          >
            <Input
              id="level"
              name="level"
              placeholder="Enter course level (e.g., Beginner, Intermediate, Advanced)"
              defaultValue={editingCourse?.level}
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
              defaultValue={editingCourse?.status || 'active'}
            />
          </FormField>
        </form>
      </SlideInForm>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        title="Delete Course"
        message={`Are you sure you want to delete ${coursesToDelete.length} course(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}