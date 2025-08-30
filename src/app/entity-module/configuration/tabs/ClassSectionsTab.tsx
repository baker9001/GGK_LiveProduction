/**
 * File: /src/app/entity-module/configuration/tabs/ClassSectionsTab.tsx
 * 
 * Class Sections Management Tab
 * Manages class_sections table data with grade level organization
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Hash, School, Building2 } from 'lucide-react';
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
  grade_level_ids: z.array(z.string().uuid()).min(1, 'Please select at least one grade level'),
  section_name: z.string().min(1, 'Section name is required'),
  section_code: z.string().optional(),
  max_capacity: z.number().min(1, 'Must be at least 1'),
  current_enrollment: z.number().min(0, 'Cannot be negative').optional(),
  room_number: z.string().optional(),
  classroom_number: z.string().optional(),
  building: z.string().optional(),
  floor: z.number().optional(),
  status: z.enum(['active', 'inactive'])
});

interface FilterState {
  search: string;
  school_ids: string[];
  grade_level_ids: string[];
  status: string[];
}

interface FormState {
  grade_level_ids: string[];
  section_name: string;
  section_code: string;
  max_capacity: number;
  current_enrollment: number;
  room_number: string;
  classroom_number: string;
  building: string;
  floor: number;
  status: 'active' | 'inactive';
}

type ClassSection = {
  id: string;
  grade_level_ids: string[];
  grade_level_names: string[];
  school_names: string[];
  section_name: string;
  section_code: string | null;
  max_capacity: number;
  current_enrollment: number | null;
  room_number: string | null;
  classroom_number: string | null;
  building: string | null;
  floor: number | null;
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
    grade_level_ids: [],
    section_name: '',
    section_code: '',
    max_capacity: 30,
    current_enrollment: 0,
    room_number: '',
    classroom_number: '',
    building: '',
    floor: 1,
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
          grade_level_ids: editingSection.grade_level_ids || [],
          section_name: editingSection.section_name || '',
          section_code: editingSection.section_code || '',
          max_capacity: editingSection.max_capacity || 30,
          current_enrollment: editingSection.current_enrollment || 0,
          room_number: editingSection.room_number || '',
          classroom_number: editingSection.classroom_number || '',
          building: editingSection.building || '',
          floor: editingSection.floor || 1,
          status: editingSection.status || 'active',
        });
      } else {
        setFormState({
          grade_level_ids: [],
          section_name: '',
          section_code: '',
          max_capacity: 30,
          current_enrollment: 0,
          room_number: '',
          classroom_number: '',
          building: '',
          floor: 1,
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
          max_capacity,
          current_enrollment,
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
        grade_level_ids: data.grade_level_ids,
        section_name: data.section_name,
        section_code: data.section_code || undefined,
        max_capacity: data.max_capacity,
        current_enrollment: data.current_enrollment || undefined,
        room_number: data.room_number || undefined,
        classroom_number: data.classroom_number || undefined,
        building: data.building || undefined,
        floor: data.floor || undefined,
        status: data.status
      });

      if (editingSection) {
        // Update existing class section
        const { error } = await supabase
          .from('class_sections')
          .update({
            section_name: validatedData.section_name,
            section_code: validatedData.section_code,
            max_capacity: validatedData.max_capacity,
            current_enrollment: validatedData.current_enrollment,
            room_number: validatedData.room_number,
            classroom_number: validatedData.classroom_number,
            building: validatedData.building,
            floor: validatedData.floor,
            status: validatedData.status
          })
          .eq('id', editingSection.id);
        if (error) throw error;
        return { ...editingSection, ...validatedData };
      } else {
        // Create a single class section record
        const sectionRecord = {
          section_name: validatedData.section_name,
          section_code: validatedData.section_code,
          max_capacity: validatedData.max_capacity,
          current_enrollment: validatedData.current_enrollment,
          room_number: validatedData.room_number,
          classroom_number: validatedData.classroom_number,
          building: validatedData.building,
          floor: validatedData.floor,
          status: validatedData.status
        };

        // Get the first grade level for the main record
        const mainGradeLevelId = validatedData.grade_level_ids[0];
        
        // Get academic year for the grade level's school
        const { data: gradeLevel } = await supabase
          .from('grade_levels')
          .select('school_id')
          .eq('id', mainGradeLevelId)
          .single();

        const { data: academicYear } = await supabase
          .from('academic_years')
          .select('id')
          .eq('school_id', gradeLevel?.school_id)
          .eq('is_current', true)
          .maybeSingle();

        const { data: newSection, error } = await supabase
          .from('class_sections')
          .insert([{
            ...sectionRecord,
            grade_level_id: mainGradeLevelId,
            academic_year_id: academicYear?.id || null
          }])
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
            {row.current_enrollment || 0} / {row.max_capacity}
          </div>
          <div className="text-gray-500 dark:text-gray-400">
            {Math.round(((row.current_enrollment || 0) / row.max_capacity) * 100)}% full
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
            id="grade_level_ids"
            label="Grade Level"
            required
            error={formErrors.grade_level_ids}
          >
            <SearchableMultiSelect
              label=""
              options={gradeLevels.map(grade => ({
                value: grade.id,
                label: grade.label
              }))}
              selectedValues={formState.grade_level_ids}
              onChange={(values) => {
                setFormState(prev => ({ ...prev, grade_level_ids: values }));
              }}
              isMulti={true}
              isMulti={true}
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
            id="classroom_number"
            label="Room Number"
            error={formErrors.classroom_number}
          >
            <Input
              id="classroom_number"
              name="classroom_number"
              placeholder="e.g., Room 101, Lab A"
              value={formState.classroom_number}
              onChange={(e) => setFormState(prev => ({ ...prev, classroom_number: e.target.value }))}
              leftIcon={<School className="h-5 w-5 text-gray-400" />}
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
                placeholder="e.g., Main Building, Science Block"
                value={formState.building}
                onChange={(e) => setFormState(prev => ({ ...prev, building: e.target.value }))}
                leftIcon={<Building2 className="h-5 w-5 text-gray-400" />}
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
                value={formState.floor.toString()}
                onChange={(e) => setFormState(prev => ({ ...prev, floor: parseInt(e.target.value) || 1 }))}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              id="max_capacity"
              label="Max Students"
              required
              error={formErrors.max_capacity}
            >
              <Input
                id="max_capacity"
                name="max_capacity"
                type="number"
                min="1"
                placeholder="30"
                value={formState.max_capacity.toString()}
                onChange={(e) => setFormState(prev => ({ ...prev, max_capacity: parseInt(e.target.value) || 30 }))}
              />
            </FormField>

            <FormField
              id="current_enrollment"
              label="Current Students"
              error={formErrors.current_enrollment}
            >
              <Input
                id="current_enrollment"
                name="current_enrollment"
                type="number"
                min="0"
                placeholder="0"
                value={formState.current_enrollment.toString()}
                onChange={(e) => setFormState(prev => ({ ...prev, current_enrollment: parseInt(e.target.value) || 0 }))}
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