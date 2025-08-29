/**
 * File: /src/app/entity-module/configuration/tabs/ClassSectionsTab.tsx
 * 
 * Class Sections Management Tab
 * Manages class_sections table data with grade level and academic year organization
 */

'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Hash, MapPin, Building, User } from 'lucide-react';
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

const classSectionSchema = z.object({
  grade_level_id: z.string().uuid('Please select a grade level'),
  academic_year_id: z.string().uuid('Please select an academic year'),
  section_name: z.string().min(1, 'Section name is required'),
  section_code: z.string().optional(),
  max_capacity: z.number().min(1, 'Capacity must be at least 1'),
  current_enrollment: z.number().min(0).optional(),
  class_teacher_id: z.string().uuid().optional(),
  class_teacher_name: z.string().optional(),
  classroom_number: z.string().optional(),
  building: z.string().optional(),
  floor: z.number().min(0).optional(),
  status: z.enum(['active', 'inactive', 'archived'])
});

interface FilterState {
  search: string;
  school_ids: string[];
  grade_level_ids: string[];
  academic_year_ids: string[];
  status: string[];
}

type ClassSection = {
  id: string;
  grade_level_id: string;
  academic_year_id: string;
  section_name: string;
  section_code: string | null;
  max_capacity: number;
  current_enrollment: number | null;
  class_teacher_id: string | null;
  class_teacher_name: string | null;
  classroom_number: string | null;
  building: string | null;
  floor: number | null;
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
  grade_name?: string;
  school_name?: string;
  academic_year_name?: string;
};

interface ClassSectionsTabProps {
  companyId: string | null;
}

export default function ClassSectionsTab({ companyId }: ClassSectionsTabProps) {
  const queryClient = useQueryClient();
  const { getScopeFilters, isEntityAdmin, isSubEntityAdmin } = useAccessControl();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClassSection, setEditingClassSection] = useState<ClassSection | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    school_ids: [],
    grade_level_ids: [],
    academic_year_ids: [],
    status: []
  });

  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [classSectionsToDelete, setClassSectionsToDelete] = useState<ClassSection[]>([]);

  // Get scope filters
  const scopeFilters = getScopeFilters('schools');
  const canAccessAll = isEntityAdmin || isSubEntityAdmin;

  // Fetch schools for filtering
  const { data: schools = [] } = useQuery(
    ['schools-for-class-sections', companyId, scopeFilters],
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

  // Fetch grade levels for dropdown
  const { data: gradeLevels = [] } = useQuery(
    ['grade-levels-for-sections', companyId, scopeFilters],
    async () => {
      if (!companyId) return [];

      let query = supabase
        .from('grade_levels')
        .select('id, grade_name, school_id, schools!grade_levels_school_id_fkey(name)')
        .eq('status', 'active')
        .order('grade_order');

      if (!canAccessAll && scopeFilters.school_ids && scopeFilters.school_ids.length > 0) {
        query = query.in('school_id', scopeFilters.school_ids);
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
      staleTime: 5 * 60 * 1000,
    }
  );

  // Fetch academic years for dropdown
  const { data: academicYears = [] } = useQuery(
    ['academic-years-for-sections', companyId, scopeFilters],
    async () => {
      if (!companyId) return [];

      let query = supabase
        .from('academic_years')
        .select('id, year_name, school_id, schools!academic_years_school_id_fkey(name)')
        .eq('status', 'active')
        .order('start_date', { ascending: false });

      if (!canAccessAll && scopeFilters.school_ids && scopeFilters.school_ids.length > 0) {
        query = query.in('school_id', scopeFilters.school_ids);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(year => ({
        ...year,
        school_name: year.schools?.name || 'Unknown School'
      }));
    },
    {
      enabled: !!companyId,
      staleTime: 5 * 60 * 1000,
    }
  );

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
          *,
          grade_levels!class_sections_grade_level_id_fkey (
            grade_name,
            school_id,
            schools!grade_levels_school_id_fkey (
              name
            )
          ),
          academic_years!class_sections_academic_year_id_fkey (
            year_name
          )
        `)
        .order('section_name');

      // Apply scope filtering through grade levels
      if (!canAccessAll && scopeFilters.school_ids && scopeFilters.school_ids.length > 0) {
        // Get grade levels for accessible schools
        const { data: accessibleGrades } = await supabase
          .from('grade_levels')
          .select('id')
          .in('school_id', scopeFilters.school_ids);
        
        const gradeIds = accessibleGrades?.map(g => g.id) || [];
        if (gradeIds.length > 0) {
          query = query.in('grade_level_id', gradeIds);
        } else {
          return [];
        }
      } else if (!canAccessAll) {
        return [];
      }

      // Apply additional filters
      if (filters.search) {
        query = query.or(`section_name.ilike.%${filters.search}%,section_code.ilike.%${filters.search}%`);
      }

      if (filters.grade_level_ids.length > 0) {
        query = query.in('grade_level_id', filters.grade_level_ids);
      }

      if (filters.academic_year_ids.length > 0) {
        query = query.in('academic_year_id', filters.academic_year_ids);
      }

      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(section => ({
        ...section,
        grade_name: section.grade_levels?.grade_name || 'Unknown Grade',
        school_name: section.grade_levels?.schools?.name || 'Unknown School',
        academic_year_name: section.academic_years?.year_name || 'Unknown Year'
      }));
    },
    {
      enabled: !!companyId,
      keepPreviousData: true,
      staleTime: 2 * 60 * 1000,
    }
  );

  // Create/update class section mutation
  const classSectionMutation = useMutation(
    async (formData: FormData) => {
      const data = {
        grade_level_id: formData.get('grade_level_id') as string,
        academic_year_id: formData.get('academic_year_id') as string,
        section_name: formData.get('section_name') as string,
        section_code: formData.get('section_code') as string || undefined,
        max_capacity: parseInt(formData.get('max_capacity') as string),
        current_enrollment: parseInt(formData.get('current_enrollment') as string) || undefined,
        class_teacher_name: formData.get('class_teacher_name') as string || undefined,
        classroom_number: formData.get('classroom_number') as string || undefined,
        building: formData.get('building') as string || undefined,
        floor: parseInt(formData.get('floor') as string) || undefined,
        status: formData.get('status') as 'active' | 'inactive' | 'archived'
      };

      const validatedData = classSectionSchema.parse(data);

      if (editingClassSection) {
        const { error } = await supabase
          .from('class_sections')
          .update(validatedData)
          .eq('id', editingClassSection.id);

        if (error) throw error;
        return { ...editingClassSection, ...validatedData };
      } else {
        const { data: newClassSection, error } = await supabase
          .from('class_sections')
          .insert([validatedData])
          .select()
          .single();

        if (error) throw error;
        return newClassSection;
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['class-sections']);
        setIsFormOpen(false);
        setEditingClassSection(null);
        setFormErrors({});
        toast.success(`Class section ${editingClassSection ? 'updated' : 'created'} successfully`);
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

  // Delete class sections mutation
  const deleteMutation = useMutation(
    async (classSections: ClassSection[]) => {
      const { error } = await supabase
        .from('class_sections')
        .delete()
        .in('id', classSections.map(c => c.id));

      if (error) throw error;
      return classSections;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['class-sections']);
        setIsConfirmDialogOpen(false);
        setClassSectionsToDelete([]);
        toast.success('Class section(s) deleted successfully');
      },
      onError: (error) => {
        console.error('Error deleting class sections:', error);
        toast.error('Failed to delete class section(s)');
        setIsConfirmDialogOpen(false);
        setClassSectionsToDelete([]);
      }
    }
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    classSectionMutation.mutate(new FormData(e.currentTarget));
  };

  const handleDelete = (classSections: ClassSection[]) => {
    setClassSectionsToDelete(classSections);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(classSectionsToDelete);
  };

  const cancelDelete = () => {
    setIsConfirmDialogOpen(false);
    setClassSectionsToDelete([]);
  };

  const columns = [
    {
      id: 'section_info',
      header: 'Section',
      enableSorting: true,
      cell: (row: ClassSection) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {row.section_name}
            </div>
            {row.section_code && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Code: {row.section_code}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'grade_name',
      header: 'Grade Level',
      accessorKey: 'grade_name',
      enableSorting: true,
    },
    {
      id: 'school_name',
      header: 'School',
      accessorKey: 'school_name',
      enableSorting: true,
    },
    {
      id: 'academic_year_name',
      header: 'Academic Year',
      accessorKey: 'academic_year_name',
      enableSorting: true,
    },
    {
      id: 'enrollment',
      header: 'Enrollment',
      enableSorting: true,
      cell: (row: ClassSection) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900 dark:text-white">
            {row.current_enrollment || 0} / {row.max_capacity}
          </div>
          <div className="text-gray-500 dark:text-gray-400">
            {Math.round(((row.current_enrollment || 0) / row.max_capacity) * 100)}% full
          </div>
        </div>
      ),
    },
    {
      id: 'class_teacher',
      header: 'Class Teacher',
      enableSorting: true,
      cell: (row: ClassSection) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {row.class_teacher_name || 'Not assigned'}
        </span>
      ),
    },
    {
      id: 'classroom',
      header: 'Classroom',
      enableSorting: false,
      cell: (row: ClassSection) => (
        <div className="text-sm">
          {row.classroom_number && (
            <div className="font-medium text-gray-900 dark:text-white">
              Room {row.classroom_number}
            </div>
          )}
          {(row.building || row.floor !== null) && (
            <div className="text-gray-500 dark:text-gray-400">
              {row.building && `${row.building}`}
              {row.floor !== null && `, Floor ${row.floor}`}
            </div>
          )}
          {!row.classroom_number && !row.building && row.floor === null && (
            <span className="text-gray-400 dark:text-gray-500">Not assigned</span>
          )}
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
            Manage class sections, enrollment capacity, and classroom assignments
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingClassSection(null);
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
            academic_year_ids: [],
            status: []
          });
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField id="search" label="Search">
            <Input
              id="search"
              placeholder="Search by section name or code..."
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
              label: `${g.grade_name} (${g.school_name})`
            }))}
            selectedValues={filters.grade_level_ids}
            onChange={(values) => setFilters({ ...filters, grade_level_ids: values })}
            placeholder="Select grades..."
          />

          <SearchableMultiSelect
            label="Academic Year"
            options={academicYears.map(y => ({
              value: y.id,
              label: `${y.year_name} (${y.school_name})`
            }))}
            selectedValues={filters.academic_year_ids}
            onChange={(values) => setFilters({ ...filters, academic_year_ids: values })}
            placeholder="Select years..."
          />

          <SearchableMultiSelect
            label="Status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'archived', label: 'Archived' }
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
        caption="List of class sections with their grade levels and enrollment details"
        ariaLabel="Class sections data table"
        loading={isLoading}
        isFetching={isFetching}
        onEdit={(classSection) => {
          setEditingClassSection(classSection);
          setIsFormOpen(true);
        }}
        onDelete={handleDelete}
        emptyMessage="No class sections found"
      />

      <SlideInForm
        key={editingClassSection?.id || 'new'}
        title={editingClassSection ? 'Edit Class Section' : 'Create Class Section'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingClassSection(null);
          setFormErrors({});
        }}
        onSave={() => {
          const form = document.querySelector('form');
          if (form) form.requestSubmit();
        }}
        loading={classSectionMutation.isLoading}
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
                label: `${grade.grade_name} (${grade.school_name})`
              }))}
              selectedValues={editingClassSection?.grade_level_id ? [editingClassSection.grade_level_id] : []}
              onChange={(values) => {
                const input = document.querySelector('input[name="grade_level_id"]') as HTMLInputElement;
                if (input) input.value = values[0] || '';
              }}
              isMulti={false}
              placeholder="Select grade level..."
            />
            <input
              type="hidden"
              id="grade_level_id"
              name="grade_level_id"
              defaultValue={editingClassSection?.grade_level_id || ''}
            />
          </FormField>

          <FormField
            id="academic_year_id"
            label="Academic Year"
            required
            error={formErrors.academic_year_id}
          >
            <SearchableMultiSelect
              label=""
              options={academicYears.map(year => ({
                value: year.id,
                label: `${year.year_name} (${year.school_name})`
              }))}
              selectedValues={editingClassSection?.academic_year_id ? [editingClassSection.academic_year_id] : []}
              onChange={(values) => {
                const input = document.querySelector('input[name="academic_year_id"]') as HTMLInputElement;
                if (input) input.value = values[0] || '';
              }}
              isMulti={false}
              placeholder="Select academic year..."
            />
            <input
              type="hidden"
              id="academic_year_id"
              name="academic_year_id"
              defaultValue={editingClassSection?.academic_year_id || ''}
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
              placeholder="e.g., Section A, Blue Class, Morning"
              defaultValue={editingClassSection?.section_name}
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
              placeholder="e.g., A, B1, MOR"
              defaultValue={editingClassSection?.section_code || ''}
              leftIcon={<Hash className="h-5 w-5 text-gray-400" />}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              id="max_capacity"
              label="Max Capacity"
              required
              error={formErrors.max_capacity}
            >
              <Input
                id="max_capacity"
                name="max_capacity"
                type="number"
                min="1"
                placeholder="30"
                defaultValue={editingClassSection?.max_capacity}
              />
            </FormField>

            <FormField
              id="current_enrollment"
              label="Current Enrollment"
              error={formErrors.current_enrollment}
            >
              <Input
                id="current_enrollment"
                name="current_enrollment"
                type="number"
                min="0"
                placeholder="0"
                defaultValue={editingClassSection?.current_enrollment}
              />
            </FormField>
          </div>

          <FormField
            id="class_teacher_name"
            label="Class Teacher"
            error={formErrors.class_teacher_name}
          >
            <Input
              id="class_teacher_name"
              name="class_teacher_name"
              placeholder="Enter class teacher name"
              defaultValue={editingClassSection?.class_teacher_name || ''}
              leftIcon={<User className="h-5 w-5 text-gray-400" />}
            />
          </FormField>

          <FormField
            id="classroom_number"
            label="Classroom Number"
            error={formErrors.classroom_number}
          >
            <Input
              id="classroom_number"
              name="classroom_number"
              placeholder="e.g., 101, A-205"
              defaultValue={editingClassSection?.classroom_number || ''}
              leftIcon={<MapPin className="h-5 w-5 text-gray-400" />}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              id="building"
              label="Building"
              error={formErrors.building}
            >
              <Input
                id="building"
                name="building"
                placeholder="e.g., Main Building, Block A"
                defaultValue={editingClassSection?.building || ''}
                leftIcon={<Building className="h-5 w-5 text-gray-400" />}
              />
            </FormField>

            <FormField
              id="floor"
              label="Floor"
              error={formErrors.floor}
            >
              <Input
                id="floor"
                name="floor"
                type="number"
                min="0"
                placeholder="1"
                defaultValue={editingClassSection?.floor}
              />
            </FormField>
          </div>

          <FormField
            id="status"
            label="Status"
            required
            error={formErrors.status}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Class Section Status
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {editingClassSection?.status === 'active' || !editingClassSection
                      ? 'Class section is currently active' 
                      : editingClassSection?.status === 'archived'
                        ? 'Class section has been archived'
                        : 'Class section is currently inactive'}
                  </p>
                </div>
                <input
                  type="hidden"
                  name="status"
                  defaultValue={editingClassSection?.status || 'active'}
                />
                <ToggleSwitch
                  checked={editingClassSection?.status === 'active' || !editingClassSection}
                  onChange={(checked) => {
                    const input = document.querySelector('input[name="status"]') as HTMLInputElement;
                    if (input) input.value = checked ? 'active' : 'inactive';
                  }}
                  label="Active"
                />
              </div>
              
              {/* Additional status option for archived */}
              <FormField id="status_select" label="Or select specific status">
                <Select
                  id="status_select"
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                    { value: 'archived', label: 'Archived' }
                  ]}
                  value={editingClassSection?.status || 'active'}
                  onChange={(value) => {
                    const input = document.querySelector('input[name="status"]') as HTMLInputElement;
                    if (input) input.value = value;
                  }}
                />
              </FormField>
            </div>
          </FormField>
        </form>
      </SlideInForm>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        title="Delete Class Section"
        message={`Are you sure you want to delete ${classSectionsToDelete.length} class section(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}