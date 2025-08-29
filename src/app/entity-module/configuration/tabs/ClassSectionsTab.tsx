/**
 * File: /src/app/entity-module/configuration/tabs/ClassSectionsTab.tsx
 * 
 * Class Sections Management Tab
 * Manages class_sections table data with grade level organization
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Hash, School } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '../../../../lib/supabase';
import { useAccessControl } from '../../../../hooks/useAccessControl';
import { DataTable } from '../../../../components/shared/DataTable';
import { FilterCard } from '../../../../components/shared/FilterCard';
import { SlideInForm } from '../../../../components/shared/SlideInForm';
import { FormField, Input, Select, Textarea } from '../../../../components/shared/FormField';
import { StatusBadge } from '../../../../components/shared/StatusBadge';
import { Button } from '../../../../components/shared/Button';
import { SearchableMultiSelect } from '../../../../components/shared/SearchableMultiSelect';
import { ToggleSwitch } from '../../../../components/shared/ToggleSwitch';
import { ConfirmationDialog } from '../../../../components/shared/ConfirmationDialog';
import { toast } from '../../../../components/shared/Toast';

const classSectionSchema = z.object({
  grade_level_id: z.string().uuid('Please select a grade level'),
  section_name: z.string().min(1, 'Section name is required'),
  section_code: z.string().optional(),
  max_students: z.number().min(1, 'Must be at least 1'),
  current_students: z.number().min(0, 'Cannot be negative').optional(),
  room_number: z.string().optional(),
  section_teacher_id: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive'])
});

interface FilterState {
  search: string;
  school_ids: string[];
  grade_level_ids: string[];
  status: string[];
}

interface FormState {
  grade_level_id: string;
  section_name: string;
  section_code: string;
  max_students: number;
  current_students: number;
  room_number: string;
  section_teacher_id: string;
  status: 'active' | 'inactive';
}

type ClassSection = {
  id: string;
  grade_level_id: string;
  grade_level_name: string;
  school_name: string;
  section_name: string;
  section_code: string | null;
  max_students: number;
  current_students: number | null;
  room_number: string | null;
  section_teacher_id: string | null;
  status: 'active' | 'inactive';
  created_at: string;
};

interface ClassSectionsTabProps {
  companyId: string | null;
}

export function ClassSectionsTab({ companyId }: ClassSectionsTabProps) {
  const queryClient = useQueryClient();
  const { getScopeFilters, isEntityAdmin, isSubEntityAdmin } = useAccessControl();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<ClassSection | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    school_ids: [],
    grade_level_ids: [],
    status: []
  });

  const [formState, setFormState] = useState<FormState>({
    grade_level_id: '',
    section_name: '',
    section_code: '',
    max_students: 30,
    current_students: 0,
    room_number: '',
    section_teacher_id: '',
    status: 'active',
  });

  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [sectionsToDelete, setSectionsToDelete] = useState<ClassSection[]>([]);

  // Get scope filters
  const scopeFilters = getScopeFilters('schools');
  const canAccessAll = isEntityAdmin || isSubEntityAdmin;

  // Fetch schools for filtering
  const { data: schools = [] } = useQuery(
    ['schools-for-sections', companyId, scopeFilters],
    async () => {
      if (!companyId) return [];

      let query = supabase
        .from('schools')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name');

      if (!canAccessAll && scopeFilters.school_ids && scopeFilters.school_ids.length > 0) {
        query = query.in('id', scopeFilters.school_ids);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    {
      enabled: !!companyId,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Fetch grade levels for dropdown
  const { data: gradeLevels = [] } = useQuery(
    ['grade-levels-for-sections', companyId, scopeFilters],
    async () => {
      if (!companyId) return [];

      let query = supabase
        .from('grade_levels')
        .select(`
          id, 
          grade_name,
          schools!grade_levels_school_id_fkey (
            id,
            name
          )
        `)
        .eq('status', 'active')
        .order('grade_order');

      // Apply school filtering
      if (!canAccessAll && scopeFilters.school_ids && scopeFilters.school_ids.length > 0) {
        query = query.in('school_id', scopeFilters.school_ids);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(grade => ({
        id: grade.id,
        label: `${grade.grade_name} - ${grade.schools?.name || 'Unknown School'}`,
        school_id: grade.schools?.id
      }));
    },
    {
      enabled: !!companyId,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Populate formState when editing
  useEffect(() => {
    if (isFormOpen) {
      if (editingSection) {
        setFormState({
          grade_level_id: editingSection.grade_level_id || '',
          section_name: editingSection.section_name || '',
          section_code: editingSection.section_code || '',
          max_students: editingSection.max_students || 30,
          current_students: editingSection.current_students || 0,
          room_number: editingSection.room_number || '',
          section_teacher_id: editingSection.section_teacher_id || '',
          status: editingSection.status || 'active',
        });
      } else {
        setFormState({
          grade_level_id: '',
          section_name: '',
          section_code: '',
          max_students: 30,
          current_students: 0,
          room_number: '',
          section_teacher_id: '',
          status: 'active'
        });
      }
      setFormErrors({});
    }
  }, [isFormOpen, editingSection]);

  // Fetch class sections
  const { 
    data: classSections = [], 
    isLoading, 
    isFetching 
  } = useQuery(
    ['class-sections', companyId, filters, scopeFilters],
    async () => {
      if (!companyId) return [];

      let query = supabase
        .from('class_sections')
        .select(`
          id,
          grade_level_id,
          section_name,
          section_code,
          max_students,
          current_students,
          room_number,
          section_teacher_id,
          status,
          created_at,
          grade_levels!class_sections_grade_level_id_fkey (
            grade_name,
            schools!grade_levels_school_id_fkey (
              name
            )
          )
        `)
        .order('section_name');

      // Apply filters
      if (filters.search) {
        query = query.or(`section_name.ilike.%${filters.search}%,section_code.ilike.%${filters.search}%,room_number.ilike.%${filters.search}%`);
      }

      if (filters.grade_level_ids.length > 0) {
        query = query.in('grade_level_id', filters.grade_level_ids);
      }

      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(section => ({
        ...section,
        grade_level_name: section.grade_levels?.grade_name || 'Unknown Grade',
        school_name: section.grade_levels?.schools?.name || 'Unknown School'
      }));
    },
    {
      enabled: !!companyId,
      keepPreviousData: true,
      staleTime: 2 * 60 * 1000,
    }
  );

  // Create/update mutation
  const sectionMutation = useMutation(
    async (data: FormState) => {
      const validatedData = classSectionSchema.parse({
        grade_level_id: data.grade_level_id,
        section_name: data.section_name,
        section_code: data.section_code || undefined,
        max_students: data.max_students,
        current_students: data.current_students || undefined,
        room_number: data.room_number || undefined,
        section_teacher_id: data.section_teacher_id || undefined,
        status: data.status
      });

      if (editingSection) {
        const { error } = await supabase
          .from('class_sections')
          .update(validatedData)
          .eq('id', editingSection.id);
        if (error) throw error;
        return { ...editingSection, ...validatedData };
      } else {
        const { data: newSection, error } = await supabase
          .from('class_sections')
          .insert([validatedData])
          .select()
          .single();

        if (error) throw error;
        return newSection;
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['class-sections']);
        setIsFormOpen(false);
        setEditingSection(null);
        setFormErrors({});
        toast.success(`Class section ${editingSection ? 'updated' : 'created'} successfully`);
      },
      onError: (error) => {
        if (error instanceof z.ZodError) {
          const errors: Record<string, string> = {};
          error.errors.forEach((err) => {
            if (err.path.length > 0) {
              errors[err.path[0]] = err.message;
            }
          });
          setFormErrors(errors);
        } else {
          console.error('Error saving class section:', error);
          setFormErrors({ form: 'Failed to save class section. Please try again.' });
          toast.error('Failed to save class section');
        }
      }
    }
  );

  // Delete mutation
  const deleteMutation = useMutation(
    async (sections: ClassSection[]) => {
      const { error } = await supabase
        .from('class_sections')
        .delete()
        .in('id', sections.map(s => s.id));

      if (error) throw error;
      return sections;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['class-sections']);
        setIsConfirmDialogOpen(false);
        setSectionsToDelete([]);
        toast.success('Class section(s) deleted successfully');
      },
      onError: (error) => {
        console.error('Error deleting class sections:', error);
        toast.error('Failed to delete class section(s)');
        setIsConfirmDialogOpen(false);
        setSectionsToDelete([]);
      }
    }
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    sectionMutation.mutate(formState);
  };

  const handleDelete = (sections: ClassSection[]) => {
    setSectionsToDelete(sections);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(sectionsToDelete);
  };

  const cancelDelete = () => {
    setIsConfirmDialogOpen(false);
    setSectionsToDelete([]);
  };

  const columns = [
    {
      id: 'section_name',
      header: 'Section Name',
      accessorKey: 'section_name',
      enableSorting: true,
    },
    {
      id: 'section_code',
      header: 'Code',
      accessorKey: 'section_code',
      enableSorting: true,
      cell: (row: ClassSection) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {row.section_code || '-'}
        </span>
      ),
    },
    {
      id: 'grade_level_name',
      header: 'Grade Level',
      accessorKey: 'grade_level_name',
      enableSorting: true,
    },
    {
      id: 'school_name',
      header: 'School',
      accessorKey: 'school_name',
      enableSorting: true,
    },
    {
      id: 'room_number',
      header: 'Room',
      accessorKey: 'room_number',
      enableSorting: true,
      cell: (row: ClassSection) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {row.room_number || '-'}
        </span>
      ),
    },
    {
      id: 'students',
      header: 'Students',
      enableSorting: true,
      cell: (row: ClassSection) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900 dark:text-white">
            {row.current_students || 0} / {row.max_students}
          </div>
          <div className="text-gray-500 dark:text-gray-400">
            {Math.round(((row.current_students || 0) / row.max_students) * 100)}% full
          </div>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: true,
      cell: (row: ClassSection) => (
        <StatusBadge status={row.status} />
      ),
    },
    {
      id: 'created_at',
      header: 'Created At',
      accessorKey: 'created_at',
      enableSorting: true,
      cell: (row: ClassSection) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Class Sections</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage class sections and student capacity
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingSection(null);
            setIsFormOpen(true);
          }}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add Class Section
        </Button>
      </div>

      <FilterCard
        title="Filters"
        onApply={() => {}}
        onClear={() => {
          setFilters({
            search: '',
            school_ids: [],
            grade_level_ids: [],
            status: []
          });
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FormField id="search" label="Search">
            <Input
              id="search"
              placeholder="Search by name, code, or room..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </FormField>

          <SearchableMultiSelect
            label="School"
            options={schools.map(s => ({
              value: s.id,
              label: s.name
            }))}
            selectedValues={filters.school_ids}
            onChange={(values) => setFilters({ ...filters, school_ids: values })}
            placeholder="Select schools..."
          />

          <SearchableMultiSelect
            label="Grade Level"
            options={gradeLevels.map(g => ({
              value: g.id,
              label: g.label
            }))}
            selectedValues={filters.grade_level_ids}
            onChange={(values) => setFilters({ ...filters, grade_level_ids: values })}
            placeholder="Select grade levels..."
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
        data={classSections}
        columns={columns}
        keyField="id"
        caption="List of class sections with their capacity and assignments"
        ariaLabel="Class sections data table"
        loading={isLoading}
        isFetching={isFetching}
        onEdit={(section) => {
          setEditingSection(section);
          setIsFormOpen(true);
        }}
        onDelete={handleDelete}
        emptyMessage="No class sections found"
      />

      <SlideInForm
        key={editingSection?.id || 'new'}
        title={editingSection ? 'Edit Class Section' : 'Create Class Section'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingSection(null);
          setFormErrors({});
        }}
        onSave={() => {
          const form = document.querySelector('form');
          if (form) form.requestSubmit();
        }}
        loading={sectionMutation.isLoading}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.form && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {formErrors.form}
            </div>
          )}

          <FormField
            id="grade_level_id"
            label="Grade Level"
            required
            error={formErrors.grade_level_id}
          >
            <SearchableMultiSelect
              label=""
              options={gradeLevels.map(grade => ({
                value: grade.id,
                label: grade.label
              }))}
              selectedValues={formState.grade_level_id ? [formState.grade_level_id] : []}
              onChange={(values) => {
                setFormState(prev => ({ ...prev, grade_level_id: values[0] || '' }));
              }}
              isMulti={false}
              placeholder="Select grade level..."
            />
          </FormField>

          <FormField
            id="section_name"
            label="Section Name"
            required
            error={formErrors.section_name}
          >
            <Input
              id="section_name"
              name="section_name"
              placeholder="e.g., Section A, Blue House"
              value={formState.section_name}
              onChange={(e) => setFormState(prev => ({ ...prev, section_name: e.target.value }))}
              leftIcon={<Users className="h-5 w-5 text-gray-400" />}
            />
          </FormField>

          <FormField
            id="section_code"
            label="Section Code"
            error={formErrors.section_code}
          >
            <Input
              id="section_code"
              name="section_code"
              placeholder="e.g., SEC-A, BH-01"
              value={formState.section_code}
              onChange={(e) => setFormState(prev => ({ ...prev, section_code: e.target.value }))}
              leftIcon={<Hash className="h-5 w-5 text-gray-400" />}
            />
          </FormField>

          <FormField
            id="room_number"
            label="Room Number"
            error={formErrors.room_number}
          >
            <Input
              id="room_number"
              name="room_number"
              placeholder="e.g., Room 101, Lab A"
              value={formState.room_number}
              onChange={(e) => setFormState(prev => ({ ...prev, room_number: e.target.value }))}
              leftIcon={<School className="h-5 w-5 text-gray-400" />}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              id="max_students"
              label="Max Students"
              required
              error={formErrors.max_students}
            >
              <Input
                id="max_students"
                name="max_students"
                type="number"
                min="1"
                placeholder="30"
                value={formState.max_students.toString()}
                onChange={(e) => setFormState(prev => ({ ...prev, max_students: parseInt(e.target.value) || 30 }))}
              />
            </FormField>

            <FormField
              id="current_students"
              label="Current Students"
              error={formErrors.current_students}
            >
              <Input
                id="current_students"
                name="current_students"
                type="number"
                min="0"
                placeholder="0"
                value={formState.current_students.toString()}
                onChange={(e) => setFormState(prev => ({ ...prev, current_students: parseInt(e.target.value) || 0 }))}
              />
            </FormField>
          </div>

          <FormField
            id="status"
            label="Status"
            required
            error={formErrors.status}
          >
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Section Status
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formState.status === 'active'
                    ? 'Section is currently active' 
                    : 'Section is currently inactive'}
                </p>
              </div>
              <ToggleSwitch
                checked={formState.status === 'active'}
                onChange={(checked) => {
                  setFormState(prev => ({ ...prev, status: checked ? 'active' : 'inactive' }));
                }}
                label="Active"
              />
            </div>
          </FormField>
        </form>
      </SlideInForm>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        title="Delete Class Section"
        message={`Are you sure you want to delete ${sectionsToDelete.length} class section(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}