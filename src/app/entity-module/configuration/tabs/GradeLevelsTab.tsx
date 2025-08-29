/**
 * File: /src/app/entity-module/configuration/tabs/GradeLevelsTab.tsx
 * 
 * Grade Levels Management Tab
 * Manages grade_levels table data with school-based organization
 */

'use client';

import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, GraduationCap, School, Hash, Users } from 'lucide-react';
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

const gradeLevelSchema = z.object({
  school_id: z.string().uuid('Please select a school'),
  grade_name: z.string().min(1, 'Grade name is required'),
  grade_code: z.string().optional(),
  grade_order: z.number().min(1, 'Grade order must be at least 1'),
  education_level: z.enum(['kindergarten', 'primary', 'middle', 'secondary', 'senior']).optional(),
  max_students_per_section: z.number().min(1, 'Must be at least 1').optional(),
  total_sections: z.number().min(1, 'Must be at least 1').optional(),
  status: z.enum(['active', 'inactive'])
});

interface FilterState {
  search: string;
  school_ids: string[];
  education_level: string[];
  status: string[];
}

type GradeLevel = {
  id: string;
  school_id: string;
  school_name: string;
  grade_name: string;
  grade_code: string | null;
  grade_order: number;
  education_level: string | null;
  max_students_per_section: number | null;
  total_sections: number | null;
  status: 'active' | 'inactive';
  created_at: string;
};

interface GradeLevelsTabProps {
  companyId: string | null;
}

export default function GradeLevelsTab({ companyId }: GradeLevelsTabProps) {
  const queryClient = useQueryClient();
  const { getScopeFilters, isEntityAdmin, isSubEntityAdmin } = useAccessControl();
  
  // Refs for hidden inputs
  const schoolIdRef = useRef<HTMLInputElement>(null);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGradeLevel, setEditingGradeLevel] = useState<GradeLevel | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    school_ids: [],
    education_level: [],
    status: []
  });

  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [gradeLevelsToDelete, setGradeLevelsToDelete] = useState<GradeLevel[]>([]);

  // Get scope filters
  const scopeFilters = getScopeFilters('schools');
  const canAccessAll = isEntityAdmin || isSubEntityAdmin;

  // Fetch schools for dropdown
  const { data: schools = [] } = useQuery(
    ['schools-for-grades', companyId, scopeFilters],
    async () => {
      if (!companyId) return [];

      let query = supabase
        .from('schools')
        .select('id, name, status')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name');

      // Apply scope filtering for non-entity admins
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

  // Fetch grade levels
  const { 
    data: gradeLevels = [], 
    isLoading, 
    isFetching 
  } = useQuery(
    ['grade-levels', companyId, filters, scopeFilters],
    async () => {
      if (!companyId) return [];

      let query = supabase
        .from('grade_levels')
        .select(`
          id,
          school_id,
          grade_name,
          grade_code,
          grade_order,
          education_level,
          max_students_per_section,
          total_sections,
          status,
          created_at,
          schools!grade_levels_school_id_fkey (
            name
          )
        `)
        .order('grade_order', { ascending: true });

      // Apply school filtering based on scope
      if (!canAccessAll && scopeFilters.school_ids && scopeFilters.school_ids.length > 0) {
        query = query.in('school_id', scopeFilters.school_ids);
      } else if (!canAccessAll) {
        // No scope assigned, return empty
        return [];
      }

      // Apply additional filters
      if (filters.search) {
        query = query.or(`grade_name.ilike.%${filters.search}%,grade_code.ilike.%${filters.search}%`);
      }

      if (filters.school_ids.length > 0) {
        query = query.in('school_id', filters.school_ids);
      }

      if (filters.education_level.length > 0) {
        query = query.in('education_level', filters.education_level);
      }

      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(grade => ({
        ...grade,
        school_name: grade.schools?.name || 'Unknown School'
      }));
    },
    {
      enabled: !!companyId,
      keepPreviousData: true,
      staleTime: 2 * 60 * 1000,
    }
  );

  // Create/update grade level mutation
  const gradeLevelMutation = useMutation(
    async (formData: FormData) => {
      const data = {
        school_id: formData.get('school_id') as string,
        grade_name: formData.get('grade_name') as string,
        grade_code: formData.get('grade_code') as string || undefined,
        grade_order: parseInt(formData.get('grade_order') as string),
        education_level: formData.get('education_level') as string || undefined,
        max_students_per_section: parseInt(formData.get('max_students_per_section') as string) || undefined,
        total_sections: parseInt(formData.get('total_sections') as string) || undefined,
        status: formData.get('status') as 'active' | 'inactive'
      };

      const validatedData = gradeLevelSchema.parse(data);

      if (editingGradeLevel) {
        const { error } = await supabase
          .from('grade_levels')
          .update(validatedData)
          .eq('id', editingGradeLevel.id);

        if (error) throw error;
        return { ...editingGradeLevel, ...validatedData };
      } else {
        const { data: newGradeLevel, error } = await supabase
          .from('grade_levels')
          .insert([validatedData])
          .select()
          .single();

        if (error) throw error;
        return newGradeLevel;
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['grade-levels']);
        setIsFormOpen(false);
        setEditingGradeLevel(null);
        setFormErrors({});
        toast.success(`Grade level ${editingGradeLevel ? 'updated' : 'created'} successfully`);
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
          console.error('Error saving grade level:', error);
          setFormErrors({ form: 'Failed to save grade level. Please try again.' });
          toast.error('Failed to save grade level');
        }
      }
    }
  );

  // Delete grade levels mutation
  const deleteMutation = useMutation(
    async (gradeLevels: GradeLevel[]) => {
      const { error } = await supabase
        .from('grade_levels')
        .delete()
        .in('id', gradeLevels.map(g => g.id));

      if (error) throw error;
      return gradeLevels;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['grade-levels']);
        setIsConfirmDialogOpen(false);
        setGradeLevelsToDelete([]);
        toast.success('Grade level(s) deleted successfully');
      },
      onError: (error) => {
        console.error('Error deleting grade levels:', error);
        toast.error('Failed to delete grade level(s)');
        setIsConfirmDialogOpen(false);
        setGradeLevelsToDelete([]);
      }
    }
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    gradeLevelMutation.mutate(new FormData(e.currentTarget));
  };

  const handleDelete = (gradeLevels: GradeLevel[]) => {
    setGradeLevelsToDelete(gradeLevels);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(gradeLevelsToDelete);
  };

  const cancelDelete = () => {
    setIsConfirmDialogOpen(false);
    setGradeLevelsToDelete([]);
  };

  const columns = [
    {
      id: 'grade_name',
      header: 'Grade Name',
      accessorKey: 'grade_name',
      enableSorting: true,
    },
    {
      id: 'grade_code',
      header: 'Code',
      accessorKey: 'grade_code',
      enableSorting: true,
      cell: (row: GradeLevel) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {row.grade_code || '-'}
        </span>
      ),
    },
    {
      id: 'grade_order',
      header: 'Order',
      accessorKey: 'grade_order',
      enableSorting: true,
      cell: (row: GradeLevel) => (
        <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
          {row.grade_order}
        </span>
      ),
    },
    {
      id: 'school_name',
      header: 'School',
      accessorKey: 'school_name',
      enableSorting: true,
    },
    {
      id: 'education_level',
      header: 'Education Level',
      accessorKey: 'education_level',
      enableSorting: true,
      cell: (row: GradeLevel) => (
        <span className="text-sm text-gray-900 dark:text-gray-100 capitalize">
          {row.education_level || '-'}
        </span>
      ),
    },
    {
      id: 'sections',
      header: 'Sections',
      enableSorting: true,
      cell: (row: GradeLevel) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900 dark:text-white">
            {row.total_sections || 1}
          </div>
          <div className="text-gray-500 dark:text-gray-400">
            Max {row.max_students_per_section || 30} students
          </div>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: true,
      cell: (row: GradeLevel) => (
        <StatusBadge status={row.status} />
      ),
    },
    {
      id: 'created_at',
      header: 'Created At',
      accessorKey: 'created_at',
      enableSorting: true,
      cell: (row: GradeLevel) => (
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Grade Levels</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage grade levels and academic progression structure
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingGradeLevel(null);
            setIsFormOpen(true);
          }}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add Grade Level
        </Button>
      </div>

      <FilterCard
        title="Filters"
        onApply={() => {}}
        onClear={() => {
          setFilters({
            search: '',
            school_ids: [],
            education_level: [],
            status: []
          });
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FormField id="search" label="Search">
            <Input
              id="search"
              placeholder="Search by name or code..."
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
            label="Education Level"
            options={[
              { value: 'kindergarten', label: 'Kindergarten' },
              { value: 'primary', label: 'Primary' },
              { value: 'middle', label: 'Middle' },
              { value: 'secondary', label: 'Secondary' },
              { value: 'senior', label: 'Senior' }
            ]}
            selectedValues={filters.education_level}
            onChange={(values) => setFilters({ ...filters, education_level: values })}
            placeholder="Select levels..."
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
        data={gradeLevels}
        columns={columns}
        keyField="id"
        caption="List of grade levels with their schools and academic structure"
        ariaLabel="Grade levels data table"
        loading={isLoading}
        isFetching={isFetching}
        onEdit={(gradeLevel) => {
          setEditingGradeLevel(gradeLevel);
          setIsFormOpen(true);
        }}
        onDelete={handleDelete}
        emptyMessage="No grade levels found"
      />

      <SlideInForm
        key={editingGradeLevel?.id || 'new'}
        title={editingGradeLevel ? 'Edit Grade Level' : 'Create Grade Level'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingGradeLevel(null);
          setFormErrors({});
        }}
        onSave={() => {
          const form = document.querySelector('form');
          if (form) form.requestSubmit();
        }}
        loading={gradeLevelMutation.isLoading}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.form && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {formErrors.form}
            </div>
          )}

          <FormField
            id="school_id"
            label="School"
            required
            error={formErrors.school_id}
          >
            <input
              type="hidden"
              ref={schoolIdRef}
              name="school_id"
              defaultValue={editingGradeLevel?.school_id || ''}
            />
            <SearchableMultiSelect
              label=""
              options={schools.map(school => ({
                value: school.id,
                label: school.name
              }))}
              selectedValues={editingGradeLevel?.school_id ? [editingGradeLevel.school_id] : []}
              onChange={(values) => {
                if (schoolIdRef.current) {
                  schoolIdRef.current.value = values[0] || '';
                }
              }}
              isMulti={false}
              placeholder="Select school..."
            />
          </FormField>

          <FormField
            id="grade_name"
            label="Grade Name"
            required
            error={formErrors.grade_name}
          >
            <Input
              id="grade_name"
              name="grade_name"
              placeholder="e.g., Grade 1, Year 7, Form 1"
              defaultValue={editingGradeLevel?.grade_name}
              leftIcon={<GraduationCap className="h-5 w-5 text-gray-400" />}
            />
          </FormField>

          <FormField
            id="grade_code"
            label="Grade Code"
            error={formErrors.grade_code}
          >
            <Input
              id="grade_code"
              name="grade_code"
              placeholder="e.g., G1, Y7, F1"
              defaultValue={editingGradeLevel?.grade_code || ''}
              leftIcon={<Hash className="h-5 w-5 text-gray-400" />}
            />
          </FormField>

          <FormField
            id="grade_order"
            label="Grade Order"
            required
            error={formErrors.grade_order}
          >
            <Input
              id="grade_order"
              name="grade_order"
              type="number"
              min="1"
              placeholder="1"
              defaultValue={editingGradeLevel?.grade_order}
            />
          </FormField>

          <FormField
            id="education_level"
            label="Education Level"
            error={formErrors.education_level}
          >
            <Select
              id="education_level"
              name="education_level"
              options={[
                { value: '', label: 'Select level' },
                { value: 'kindergarten', label: 'Kindergarten' },
                { value: 'primary', label: 'Primary' },
                { value: 'middle', label: 'Middle' },
                { value: 'secondary', label: 'Secondary' },
                { value: 'senior', label: 'Senior' }
              ]}
              defaultValue={editingGradeLevel?.education_level || ''}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              id="max_students_per_section"
              label="Max Students per Section"
              error={formErrors.max_students_per_section}
            >
              <Input
                id="max_students_per_section"
                name="max_students_per_section"
                type="number"
                min="1"
                placeholder="30"
                defaultValue={editingGradeLevel?.max_students_per_section}
                leftIcon={<Users className="h-5 w-5 text-gray-400" />}
              />
            </FormField>

            <FormField
              id="total_sections"
              label="Total Sections"
              error={formErrors.total_sections}
            >
              <Input
                id="total_sections"
                name="total_sections"
                type="number"
                min="1"
                placeholder="1"
                defaultValue={editingGradeLevel?.total_sections}
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
                  Grade Level Status
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {editingGradeLevel?.status === 'active' || !editingGradeLevel
                    ? 'Grade level is currently active' 
                    : 'Grade level is currently inactive'}
                </p>
              </div>
              <input
                type="hidden"
                name="status"
                defaultValue={editingGradeLevel?.status || 'active'}
              />
              <ToggleSwitch
                checked={editingGradeLevel?.status === 'active' || !editingGradeLevel}
                onChange={(checked) => {
                  const input = document.querySelector('input[name="status"]') as HTMLInputElement;
                  if (input) input.value = checked ? 'active' : 'inactive';
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
        title="Delete Grade Level"
        message={`Are you sure you want to delete ${gradeLevelsToDelete.length} grade level(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}