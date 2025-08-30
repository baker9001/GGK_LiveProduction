/**
 * File: /src/app/entity-module/configuration/tabs/GradeLevelsTab.tsx
 * 
 * FIXED VERSION - Aligned with Database Schema
 * - Added missing "Add Grade Level" button
 * - Fixed table structure to match grade_levels schema
 * - Corrected form fields to match database columns
 * - Fixed data fetching and mutations
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, GraduationCap, Edit, Trash2, School } from 'lucide-react';
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
}

type GradeLevel = {
  id: string;
  school_ids: string[];
  school_names: string[];
  grade_name: string;
  grade_code: string | null;
  grade_order: number;
  education_level: 'kindergarten' | 'primary' | 'middle' | 'secondary' | 'senior';
  status: 'active' | 'inactive';
  created_at: string;
};

interface GradeLevelsTabProps {
  companyId: string | null;
}

export function GradeLevelsTab({ companyId }: GradeLevelsTabProps) {
  const queryClient = useQueryClient();
  const { getScopeFilters, isEntityAdmin, isSubEntityAdmin } = useAccessControl();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGradeLevel, setEditingGradeLevel] = useState<GradeLevel | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    school_ids: [],
    education_level: [],
    status: []
  });

  const [formState, setFormState] = useState<FormState>({
    school_id: '',
    grade_name: '',
    grade_code: '',
    grade_order: 1,
    education_level: 'primary',
    status: 'active',
  });

  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [gradeLevelsToDelete, setGradeLevelsToDelete] = useState<GradeLevel[]>([]);

  // Get scope filters
  const scopeFilters = getScopeFilters('schools');
  const canAccessAll = isEntityAdmin || isSubEntityAdmin;

  // Fetch schools for dropdown
  const { data: schools = [] } = useQuery(
    ['schools-for-grade-levels', companyId, scopeFilters],
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
  React.useEffect(() => {
    if (isFormOpen) {
      if (editingGradeLevel) {
        setFormState({
          school_ids: editingGradeLevel.school_ids || [],
          grade_name: editingGradeLevel.grade_name || '',
          grade_code: editingGradeLevel.grade_code || '',
          grade_order: editingGradeLevel.grade_order || 1,
          education_level: editingGradeLevel.education_level || 'primary',
          status: editingGradeLevel.status || 'active',
        });
      } else {
        setFormState({
          school_ids: [],
          grade_name: '',
          grade_code: '',
          grade_order: 1,
          education_level: 'primary',
          status: 'active'
        });
      }
      setFormErrors({});
    }
  }, [isFormOpen, editingGradeLevel]);

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
          grade_name,
          grade_code,
          grade_order,
          education_level,
          status,
          created_at,
          grade_level_schools!inner (
            school_id,
            schools (
              id,
              name
            )
          )
        `)
        .order('grade_order', { ascending: true });

      // Apply school filtering based on scope
      if (!canAccessAll && scopeFilters.school_ids && scopeFilters.school_ids.length > 0) {
        query = query.in('grade_level_schools.school_id', scopeFilters.school_ids);
      } else if (!canAccessAll) {
        // No scope assigned, return empty
        return [];
      }

      // Apply additional filters
      if (filters.search) {
        query = query.or(`grade_name.ilike.%${filters.search}%,grade_code.ilike.%${filters.search}%`);
      }

      if (filters.school_ids.length > 0) {
        query = query.in('grade_level_schools.school_id', filters.school_ids);
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
        school_ids: grade.grade_level_schools?.map(gls => gls.school_id) || [],
        school_names: grade.grade_level_schools?.map(gls => gls.schools?.name || 'Unknown School') || []
      }));
    },
    {
      enabled: !!companyId,
      keepPreviousData: true,
      staleTime: 2 * 60 * 1000,
    }
  );

  // Create/update mutation
  const gradeLevelMutation = useMutation(
    async (data: FormState) => {
      const validatedData = gradeLevelSchema.parse({
        school_ids: data.school_ids,
        grade_name: data.grade_name,
        grade_code: data.grade_code || undefined,
        grade_order: data.grade_order,
        education_level: data.education_level,
        max_students_per_section: data.max_students_per_section,
        total_sections: data.total_sections,
        status: data.status
      });

      if (editingGradeLevel) {
        // Update existing grade level
        const { error } = await supabase
          .from('grade_levels')
          .update(validatedData)
          .eq('id', editingGradeLevel.id);
        if (error) throw error;
        return { ...editingGradeLevel, ...validatedData };
      } else {
        // Create new grade level
        const { data: newGradeLevel, error } = await supabase
          .from('grade_levels')
          .insert([validatedData])
          .select()
          .single();
        if (error) throw error;
        // Update school associations
        // First, delete existing associations
        await supabase
          .from('grade_level_schools')
          .delete()
          .eq('grade_level_id', editingGradeLevel.id);
        const mainSchoolId = validatedData.school_ids[0];

        // Then, insert new associations
        if (validatedData.school_ids.length > 0) {
          const schoolAssociations = validatedData.school_ids.map(schoolId => ({
            grade_level_id: editingGradeLevel.id,
            school_id: schoolId
          }));

          const { error: schoolError } = await supabase
            .from('grade_level_schools')
            .insert(schoolAssociations);
          if (schoolError) throw schoolError;
        }


        // Create school associations
        if (validatedData.school_ids.length > 0) {
          const schoolAssociations = validatedData.school_ids.map(schoolId => ({
            grade_level_id: newGradeLevel.id,
            school_id: schoolId
          }));

          const { error: schoolError } = await supabase
            .from('grade_level_schools')
            .insert(schoolAssociations);
          if (schoolError) throw schoolError;
        }

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

  // Delete mutation
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
    gradeLevelMutation.mutate(formState);
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
      cell: (row: GradeLevel) => (
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-blue-500" />
          <span className="font-medium text-gray-900 dark:text-white">{row.grade_name}</span>
        </div>
      ),
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
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {row.grade_order}
        </span>
      ),
    },
    {
      id: 'education_level',
      header: 'Education Level',
      accessorKey: 'education_level',
      enableSorting: true,
      cell: (row: GradeLevel) => (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 capitalize">
          {row.education_level}
        </span>
      ),
    },
    {
      id: 'school_name',
      header: 'School',
      accessorKey: 'school_names',
      enableSorting: true,
      cell: (row: GradeLevel) => (
        <div className="flex items-center gap-2">
          <School className="w-4 h-4 text-green-500" />
          <div className="text-sm text-gray-900 dark:text-white">
            {row.school_names.length > 0 ? (
              <div className="space-y-1">
                {row.school_names.map((name, index) => (
                  <div key={index} className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 px-2 py-1 rounded">
                    {name}
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-gray-500">No schools assigned</span>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'capacity',
      header: 'Capacity',
      enableSorting: false,
      cell: (row: GradeLevel) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900 dark:text-white">
            {row.max_students_per_section} per section
          </div>
          <div className="text-gray-500 dark:text-gray-400">
            {row.total_sections} section{row.total_sections !== 1 ? 's' : ''}
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
            Manage grade levels and their configurations
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
        caption="List of grade levels with their configurations and capacity"
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
        loading={gradeLevelMutation.isPending}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.form && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {formErrors.form}
            </div>
          )}

          <FormField
            id="school_ids"
            label="School"
            required
            error={formErrors.school_ids}
          >
            <SearchableMultiSelect
              label=""
              options={schools.map(school => ({
                value: school.id,
                label: school.name
              }))}
              selectedValues={formState.school_ids}
              onChange={(values) => setFormState(prev => ({ ...prev, school_ids: values }))}
              placeholder="Select schools..."
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
              placeholder="e.g., Grade 1, Year 7, Kindergarten"
              value={formState.grade_name}
              onChange={(e) => setFormState(prev => ({ ...prev, grade_name: e.target.value }))}
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
              placeholder="e.g., G1, Y7, KG"
              value={formState.grade_code}
              onChange={(e) => setFormState(prev => ({ ...prev, grade_code: e.target.value }))}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
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
                value={formState.grade_order.toString()}
                onChange={(e) => setFormState(prev => ({ ...prev, grade_order: parseInt(e.target.value) || 1 }))}
              />
            </FormField>

            <FormField
              id="education_level"
              label="Education Level"
              required
              error={formErrors.education_level}
            >
              <Select
                id="education_level"
                name="education_level"
                options={[
                  { value: 'kindergarten', label: 'Kindergarten' },
                  { value: 'primary', label: 'Primary' },
                  { value: 'middle', label: 'Middle' },
                  { value: 'secondary', label: 'Secondary' },
                  { value: 'senior', label: 'Senior' }
                ]}
                value={formState.education_level}
                onChange={(value) => setFormState(prev => ({ ...prev, education_level: value as any }))}
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
                  {formState.status === 'active'
                    ? 'Grade level is currently active' 
                    : 'Grade level is currently inactive'}
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