/**
 * File: /src/app/entity-module/configuration/tabs/GradeLevelsTab.tsx
 * 
 * Grade Levels Management Tab
 * Manages grade_levels table data with class sections integration
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, GraduationCap, Users, School } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '../../../../lib/supabase';
import { useAccessControl } from '../../../../hooks/useAccessControl';
import { DataTable } from '../../../../components/shared/DataTable';
import { FilterCard } from '../../../../components/shared/FilterCard';
import { SlideInForm } from '../../../../components/shared/SlideInForm';
import { FormField, Input, Select } from '../../../../components/shared/FormField';
import { StatusBadge } from '../../../../components/shared/StatusBadge';
import { Button } from '../../../../components/shared/Button';
import { SearchableMultiSelect } from '../../../../components/shared/SearchableMultiSelect';
import { ToggleSwitch } from '../../../../components/shared/ToggleSwitch';
import { ConfirmationDialog } from '../../../../components/shared/ConfirmationDialog';
import { toast } from '../../../../components/shared/Toast';
import { GradeLevelFormContent } from '../../../../components/forms/GradeLevelFormContent';

const gradeLevelSchema = z.object({
  school_ids: z.array(z.string().uuid()).min(1, 'Please select at least one school'),
  grade_name: z.string().min(1, 'Grade name is required'),
  grade_code: z.string().optional(),
  grade_order: z.number().min(1, 'Grade order must be at least 1'),
  education_level: z.enum(['kindergarten', 'primary', 'middle', 'secondary', 'senior']),
  status: z.enum(['active', 'inactive'])
});

interface FilterState {
  search: string;
  school_ids: string[];
  education_level: string[];
  status: string[];
}

interface FormState {
  school_ids: string[];
  grade_name: string;
  grade_code: string;
  grade_order: number;
  education_level: 'kindergarten' | 'primary' | 'middle' | 'secondary' | 'senior';
  status: 'active' | 'inactive';
  class_sections: any[];
}

type GradeLevel = {
  id: string;
  school_ids: string[];
  school_names: string[];
  grade_name: string;
  grade_code: string | null;
  grade_order: number;
  education_level: string;
  status: 'active' | 'inactive';
  created_at: string;
  class_sections_count: number;
};

interface GradeLevelsTabProps {
  companyId: string | null;
}

export function GradeLevelsTab({ companyId }: GradeLevelsTabProps) {
  const queryClient = useQueryClient();
  const { getScopeFilters, isEntityAdmin, isSubEntityAdmin } = useAccessControl();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<GradeLevel | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    school_ids: [],
    education_level: [],
    status: []
  });

  const [formState, setFormState] = useState<FormState>({
    school_ids: [],
    grade_name: '',
    grade_code: '',
    grade_order: 1,
    education_level: 'primary',
    status: 'active',
    class_sections: []
  });

  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [gradesToDelete, setGradesToDelete] = useState<GradeLevel[]>([]);

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

  // Populate formState when editing
  useEffect(() => {
    if (isFormOpen) {
      if (editingGrade) {
        setFormState({
          school_ids: editingGrade.school_ids || [],
          grade_name: editingGrade.grade_name || '',
          grade_code: editingGrade.grade_code || '',
          grade_order: editingGrade.grade_order || 1,
          education_level: editingGrade.education_level as any || 'primary',
          status: editingGrade.status || 'active',
          class_sections: []
        });
      } else {
        setFormState({
          school_ids: [],
          grade_name: '',
          grade_code: '',
          grade_order: 1,
          education_level: 'primary',
          status: 'active',
          class_sections: []
        });
      }
      setFormErrors({});
    }
  }, [isFormOpen, editingGrade]);

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
          status,
          created_at,
          schools!grade_levels_school_id_fkey (
            name
          )
        `)
        .order('grade_order');

      // Apply school filtering
      if (!canAccessAll && scopeFilters.school_ids && scopeFilters.school_ids.length > 0) {
        query = query.in('school_id', scopeFilters.school_ids);
      } else if (!canAccessAll) {
        return [];
      }

      // Apply filters
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

      // Get class sections count for each grade level
      const enrichedData = await Promise.all((data || []).map(async (grade) => {
        const { count } = await supabase
          .from('class_sections')
          .select('*', { count: 'exact', head: true })
          .eq('grade_level_id', grade.id)
          .eq('status', 'active');

        return {
          ...grade,
          school_name: grade.schools?.name || 'Unknown School',
          class_sections_count: count || 0
        };
      }));

      return enrichedData;
    },
    {
      enabled: !!companyId,
      keepPreviousData: true,
      staleTime: 2 * 60 * 1000,
    }
  );

  // Create/update mutation
  const gradeMutation = useMutation(
    async (data: FormState) => {
      const validatedData = gradeLevelSchema.parse({
        school_ids: data.school_ids,
        grade_name: data.grade_name,
        grade_code: data.grade_code || undefined,
        grade_order: data.grade_order,
        education_level: data.education_level,
        status: data.status
      });

      if (editingGrade) {
        // Update existing grade level
        const { error } = await supabase
          .from('grade_levels')
          .update({
            grade_name: validatedData.grade_name,
            grade_code: validatedData.grade_code,
            grade_order: validatedData.grade_order,
            education_level: validatedData.education_level,
            status: validatedData.status
          })
          .eq('id', editingGrade.id);
        if (error) throw error;
        return { ...editingGrade, ...validatedData };
      } else {
        // Create new grade level
        const gradeRecord = {
          grade_name: validatedData.grade_name,
          grade_code: validatedData.grade_code,
          grade_order: validatedData.grade_order,
          education_level: validatedData.education_level,
          status: validatedData.status
        };

        // Get the first school for the main record
        const mainSchoolId = validatedData.school_ids[0];
        const { data: newGrade, error } = await supabase
          .from('grade_levels')
          .insert([{ ...gradeRecord, school_id: mainSchoolId }])
          .select()
          .single();

        if (error) throw error;

        // Create class sections if provided
        if (data.class_sections && data.class_sections.length > 0) {
          const sectionsToCreate = data.class_sections.map((section: any) => ({
            grade_level_id: newGrade.id,
            section_name: section.section_name,
            section_code: section.section_code,
            max_capacity: section.max_capacity,
            class_section_order: section.class_section_order,
            status: section.status
          }));

          const { error: sectionsError } = await supabase
            .from('class_sections')
            .insert(sectionsToCreate);

          if (sectionsError) {
            console.error('Error creating class sections:', sectionsError);
          }
        }

        return newGrade;
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['grade-levels']);
        setIsFormOpen(false);
        setEditingGrade(null);
        setFormErrors({});
        toast.success(`Grade level ${editingGrade ? 'updated' : 'created'} successfully`);
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

  // Delete mutation
  const deleteMutation = useMutation(
    async (grades: GradeLevel[]) => {
      const { error } = await supabase
        .from('grade_levels')
        .delete()
        .in('id', grades.map(g => g.id));

      if (error) throw error;
      return grades;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['grade-levels']);
        setIsConfirmDialogOpen(false);
        setGradesToDelete([]);
        toast.success('Grade level(s) deleted successfully');
      },
      onError: (error) => {
        console.error('Error deleting grade levels:', error);
        toast.error('Failed to delete grade level(s)');
        setIsConfirmDialogOpen(false);
        setGradesToDelete([]);
      }
    }
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    gradeMutation.mutate(formState);
  };

  const handleDelete = (grades: GradeLevel[]) => {
    setGradesToDelete(grades);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(gradesToDelete);
  };

  const cancelDelete = () => {
    setIsConfirmDialogOpen(false);
    setGradesToDelete([]);
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
      id: 'school_name',
      header: 'School',
      accessorKey: 'school_name',
      enableSorting: true,
    },
    {
      id: 'grade_order',
      header: 'Order',
      accessorKey: 'grade_order',
      enableSorting: true,
      cell: (row: GradeLevel) => (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          {row.grade_order}
        </span>
      ),
    },
    {
      id: 'education_level',
      header: 'Level',
      accessorKey: 'education_level',
      enableSorting: true,
      cell: (row: GradeLevel) => (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 capitalize">
          {row.education_level}
        </span>
      ),
    },
    {
      id: 'class_sections_count',
      header: 'Sections',
      enableSorting: true,
      cell: (row: GradeLevel) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900 dark:text-white">
            {row.class_sections_count}
          </div>
          <div className="text-gray-500 dark:text-gray-400">
            section{row.class_sections_count !== 1 ? 's' : ''}
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
            Manage grade levels and class sections
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingGrade(null);
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
              { value: 'middle', label: 'Middle School' },
              { value: 'secondary', label: 'Secondary' },
              { value: 'senior', label: 'Senior Secondary' }
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
        caption="List of grade levels with their details and class sections count"
        ariaLabel="Grade levels data table"
        loading={isLoading}
        isFetching={isFetching}
        onEdit={(grade) => {
          setEditingGrade(grade);
          setIsFormOpen(true);
        }}
        onDelete={handleDelete}
        emptyMessage="No grade levels found"
      />

      <SlideInForm
        key={editingGrade?.id || 'new'}
        title={editingGrade ? 'Edit Grade Level' : 'Create Grade Level'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingGrade(null);
          setFormErrors({});
        }}
        onSave={() => {
          const form = document.querySelector('form');
          if (form) form.requestSubmit();
        }}
        loading={gradeMutation.isPending}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.form && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {formErrors.form}
            </div>
          )}

          <GradeLevelFormContent
            formData={formState}
            setFormData={setFormState}
            formErrors={formErrors}
            setFormErrors={setFormErrors}
            schools={schools}
            isEditing={!!editingGrade}
            isLoadingSchools={false}
            schoolsError={null}
          />
        </form>
      </SlideInForm>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        title="Delete Grade Level"
        message={`Are you sure you want to delete ${gradesToDelete.length} grade level(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}