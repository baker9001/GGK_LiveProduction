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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/shared/Tabs';
import { toast } from '../../../../components/shared/Toast';

const gradeLevelSchema = z.object({
  school_id: z.string().uuid('Please select a school'),
  grade_name: z.string().min(1, 'Grade name is required'),
  grade_code: z.string().optional(),
  grade_order: z.number().min(1, 'Grade order must be at least 1'),
  education_level: z.enum(['kindergarten', 'primary', 'middle', 'secondary', 'senior']),
  max_students_per_section: z.number().min(1, 'Must be at least 1 student'),
  total_sections: z.number().min(1, 'Must be at least 1 section'),
  status: z.enum(['active', 'inactive']),
  // NEW: Enhanced linking fields
  assigned_branches: z.array(z.string().uuid()).optional(),
  department_associations: z.array(z.string().uuid()).optional(),
  capacity_per_branch: z.record(z.number().min(1)).optional()
});

interface FilterState {
  search: string;
  school_ids: string[];
  education_level: string[];
  status: string[];
}

interface FormState {
  school_id: string;
  grade_name: string;
  grade_code: string;
  grade_order: number;
  education_level: 'kindergarten' | 'primary' | 'middle' | 'secondary' | 'senior';
  max_students_per_section: number;
  total_sections: number;
  status: 'active' | 'inactive';
  // NEW: Enhanced linking fields
  assigned_branches: string[];
  department_associations: string[];
  capacity_per_branch: Record<string, number>;
}

type GradeLevel = {
  id: string;
  school_id: string;
  school_name: string;
  grade_name: string;
  grade_code: string | null;
  grade_order: number;
  education_level: 'kindergarten' | 'primary' | 'middle' | 'secondary' | 'senior';
  max_students_per_section: number;
  total_sections: number;
  status: 'active' | 'inactive';
  created_at: string;
  // NEW: Enhanced fields for display
  assigned_branches?: string[];
  department_associations?: string[];
  branch_names?: string[];
  department_names?: string[];
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
  const [formTab, setFormTab] = useState<'basic' | 'branches' | 'departments'>('basic');
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
    max_students_per_section: 30,
    total_sections: 1,
    status: 'active',
    // NEW: Initialize enhanced fields
    assigned_branches: [],
    department_associations: [],
    capacity_per_branch: {},
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

  // Fetch branches for linking (NEW)
  const { data: branches = [] } = useQuery(
    ['branches-for-grade-levels', companyId, scopeFilters],
    async () => {
      if (!companyId) return [];

      // Get school IDs that user has access to
      const accessibleSchoolIds = !canAccessAll && scopeFilters.school_ids 
        ? scopeFilters.school_ids 
        : schools.map(s => s.id);

      if (accessibleSchoolIds.length === 0) return [];

      const { data, error } = await supabase
        .from('branches')
        .select('id, name, school_id, schools!branches_school_id_fkey(name)')
        .in('school_id', accessibleSchoolIds)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return (data || []).map(branch => ({
        ...branch,
        school_name: branch.schools?.name || 'Unknown School'
      }));
    },
    {
      enabled: !!companyId && schools.length > 0,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Fetch departments for linking (NEW)
  const { data: departments = [] } = useQuery(
    ['departments-for-grade-levels', companyId, scopeFilters],
    async () => {
      if (!companyId) return [];

      const accessibleSchoolIds = !canAccessAll && scopeFilters.school_ids 
        ? scopeFilters.school_ids 
        : schools.map(s => s.id);

      if (accessibleSchoolIds.length === 0) return [];

      const { data, error } = await supabase
        .from('departments')
        .select('id, name, school_id, schools!departments_school_id_fkey(name)')
        .in('school_id', accessibleSchoolIds)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return (data || []).map(dept => ({
        ...dept,
        school_name: dept.schools?.name || 'Unknown School'
      }));
    },
    {
      enabled: !!companyId && schools.length > 0,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Populate formState when editing
  React.useEffect(() => {
    if (isFormOpen) {
      if (editingGradeLevel) {
        setFormState({
          school_id: editingGradeLevel.school_id || '',
          grade_name: editingGradeLevel.grade_name || '',
          grade_code: editingGradeLevel.grade_code || '',
          grade_order: editingGradeLevel.grade_order || 1,
          education_level: editingGradeLevel.education_level || 'primary',
          max_students_per_section: editingGradeLevel.max_students_per_section || 30,
          total_sections: editingGradeLevel.total_sections || 1,
          status: editingGradeLevel.status || 'active',
        });
      } else {
        setFormState({
          school_id: '',
          grade_name: '',
          grade_code: '',
          grade_order: 1,
          education_level: 'primary',
          max_students_per_section: 30,
          total_sections: 1,
          status: 'active'
        });
      }
      setFormErrors({});
    }
  }, [isFormOpen, editingGradeLevel]);

  // Load existing relationships for editing (NEW)
  const loadExistingRelationships = async (gradeLevelId: string) => {
    try {
      // Load branch associations
      const { data: branchLinks } = await supabase
        .from('grade_level_branches')
        .select('branch_id, capacity')
        .eq('grade_level_id', gradeLevelId)
        .eq('is_active', true);

      // Load department associations  
      const { data: deptLinks } = await supabase
        .from('grade_level_departments')
        .select('department_id, is_primary')
        .eq('grade_level_id', gradeLevelId);

      if (branchLinks) {
        const branchIds = branchLinks.map(bl => bl.branch_id);
        const capacityMap = branchLinks.reduce((acc, bl) => {
          acc[bl.branch_id] = bl.capacity;
          return acc;
        }, {} as Record<string, number>);

        setFormState(prev => ({
          ...prev,
          assigned_branches: branchIds,
          capacity_per_branch: capacityMap
        }));
      }

      if (deptLinks) {
        const deptIds = deptLinks.map(dl => dl.department_id);
        setFormState(prev => ({
          ...prev,
          department_associations: deptIds
        }));
      }
    } catch (error) {
      console.error('Error loading existing relationships:', error);
    }
  };

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
        .order('school_id', { ascending: true })
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

  // Create/update mutation
  const gradeLevelMutation = useMutation(
    async (data: FormState) => {
      // Validate basic grade level data (preserve existing validation)
      const validatedData = gradeLevelSchema.parse({
        school_id: data.school_id,
        grade_name: data.grade_name,
        grade_code: data.grade_code || undefined,
        grade_order: data.grade_order,
        education_level: data.education_level,
        max_students_per_section: data.max_students_per_section,
        total_sections: data.total_sections,
        status: data.status,
        // NEW: Include enhanced fields
        assigned_branches: data.assigned_branches,
        department_associations: data.department_associations,
        capacity_per_branch: data.capacity_per_branch
      });
      
      let gradeLevelId: string;

      // Load existing relationships when editing
      if (editingGradeLevel.id) {
        loadExistingRelationships(editingGradeLevel.id);
      }

      if (editingGradeLevel) {
        // Update existing grade level
        const { error } = await supabase
          .from('grade_levels')
          .update({
            school_id: validatedData.school_id,
            grade_name: validatedData.grade_name,
            grade_code: validatedData.grade_code,
            grade_order: validatedData.grade_order,
            education_level: validatedData.education_level,
            max_students_per_section: validatedData.max_students_per_section,
            total_sections: validatedData.total_sections,
            status: validatedData.status
          })
          .eq('id', editingGradeLevel.id);
        if (error) throw error;
        gradeLevelId = editingGradeLevel.id;
      } else {
        // Create new grade level
        const { data: newGradeLevel, error } = await supabase
          .from('grade_levels')
          .insert([{
            school_id: validatedData.school_id,
            grade_name: validatedData.grade_name,
            grade_code: validatedData.grade_code,
            grade_order: validatedData.grade_order,
            education_level: validatedData.education_level,
            max_students_per_section: validatedData.max_students_per_section,
            total_sections: validatedData.total_sections,
            status: validatedData.status
          }])
          .select()
          .single();
        if (error) throw error;
        gradeLevelId = newGradeLevel.id;
      }

      // NEW: Handle branch associations
      if (validatedData.assigned_branches && validatedData.assigned_branches.length > 0) {
        // Remove existing branch associations
        await supabase
          .from('grade_level_branches')
          .delete()
          .eq('grade_level_id', gradeLevelId);

        // Create new branch associations
        const branchAssociations = validatedData.assigned_branches.map(branchId => ({
          grade_level_id: gradeLevelId,
          branch_id: branchId,
          capacity: validatedData.capacity_per_branch?.[branchId] || validatedData.max_students_per_section,
          is_active: true
        }));

        const { error: branchError } = await supabase
          .from('grade_level_branches')
          .insert(branchAssociations);

        if (branchError) {
          console.error('Error creating branch associations:', branchError);
          // Don't throw - allow grade level creation to succeed
        }
      }

      // NEW: Handle department associations
      if (validatedData.department_associations && validatedData.department_associations.length > 0) {
        // Remove existing department associations
        await supabase
          .from('grade_level_departments')
          .delete()
          .eq('grade_level_id', gradeLevelId);

        // Create new department associations
        const deptAssociations = validatedData.department_associations.map((deptId, index) => ({
          grade_level_id: gradeLevelId,
          department_id: deptId,
          is_primary: index === 0, // First department is primary
          relationship_type: index === 0 ? 'primary' : 'associated'
        }));

        const { error: deptError } = await supabase
          .from('grade_level_departments')
          .insert(deptAssociations);

        if (deptError) {
          console.error('Error creating department associations:', deptError);
          // Don't throw - allow grade level creation to succeed
        }
      }

      return { id: gradeLevelId, ...validatedData };
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
      accessorKey: 'school_name',
      enableSorting: true,
      cell: (row: GradeLevel) => (
        <div className="flex items-center gap-2">
          <School className="w-4 h-4 text-green-500" />
          <span className="text-sm text-gray-900 dark:text-white">{row.school_name}</span>
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
      id: 'relationships',
      header: 'Relationships',
      enableSorting: false,
      cell: (row: GradeLevel) => (
        <div className="text-xs space-y-1">
          {row.branch_names && row.branch_names.length > 0 ? (
            <div className="text-blue-600 dark:text-blue-400">
              📍 {row.branch_names.length} branch{row.branch_names.length !== 1 ? 'es' : ''}
            </div>
          ) : null}
          {row.department_names && row.department_names.length > 0 ? (
            <div className="text-purple-600 dark:text-purple-400">
              🏢 {row.department_names.length} dept{row.department_names.length !== 1 ? 's' : ''}
            </div>
          ) : null}
          {(!row.branch_names?.length && !row.department_names?.length) && (
            <span className="text-gray-400">No links</span>
          )}
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

          {/* NEW: Enhanced form with tabs */}
          <Tabs value={formTab} onValueChange={setFormTab}>
            <TabsList>
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="branches">Branch Links</TabsTrigger>
              <TabsTrigger value="departments">Departments</TabsTrigger>
            </TabsList>

            <TabsContent value="basic">
              <div className="space-y-4">
                <FormField
                  id="school_id"
                  label="School"
                  required
                  error={formErrors.school_id}
                >
                  <Select
                    id="school_id"
                    name="school_id"
                    options={[
                      { value: '', label: 'Select school...' },
                      ...schools.map(school => ({
                        value: school.id,
                        label: school.name
                      }))
                    ]}
                    value={formState.school_id}
                    onChange={(value) => setFormState(prev => ({ ...prev, school_id: value }))}
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    id="max_students_per_section"
                    label="Max Students per Section"
                    required
                    error={formErrors.max_students_per_section}
                  >
                    <Input
                      id="max_students_per_section"
                      name="max_students_per_section"
                      type="number"
                      min="1"
                      placeholder="30"
                      value={formState.max_students_per_section.toString()}
                      onChange={(e) => setFormState(prev => ({ ...prev, max_students_per_section: parseInt(e.target.value) || 30 }))}
                    />
                  </FormField>

                  <FormField
                    id="total_sections"
                    label="Total Sections"
                    required
                    error={formErrors.total_sections}
                  >
                    <Input
                      id="total_sections"
                      name="total_sections"
                      type="number"
                      min="1"
                      placeholder="1"
                      value={formState.total_sections.toString()}
                      onChange={(e) => setFormState(prev => ({ ...prev, total_sections: parseInt(e.target.value) || 1 }))}
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
              </div>
            </TabsContent>

            <TabsContent value="branches">
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                    Branch Assignment
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Link this grade level to specific branches. Each branch can have different capacity settings.
                  </p>
                </div>

                <FormField
                  id="assigned_branches"
                  label="Assigned Branches"
                  error={formErrors.assigned_branches}
                >
                  <SearchableMultiSelect
                    label=""
                    options={branches.map(branch => ({
                      value: branch.id,
                      label: `${branch.name} (${branch.school_name})`
                    }))}
                    selectedValues={formState.assigned_branches}
                    onChange={(values) => {
                      setFormState(prev => ({ ...prev, assigned_branches: values }));
                    }}
                    placeholder="Select branches..."
                  />
                </FormField>

                {/* Capacity per branch */}
                {formState.assigned_branches.length > 0 && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Capacity per Branch
                    </label>
                    {formState.assigned_branches.map(branchId => {
                      const branch = branches.find(b => b.id === branchId);
                      return (
                        <div key={branchId} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {branch?.name || 'Unknown Branch'}
                            </span>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {branch?.school_name}
                            </div>
                          </div>
                          <div className="w-24">
                            <Input
                              type="number"
                              min="1"
                              placeholder="30"
                              value={formState.capacity_per_branch[branchId] || formState.max_students_per_section}
                              onChange={(e) => {
                                const capacity = parseInt(e.target.value) || formState.max_students_per_section;
                                setFormState(prev => ({
                                  ...prev,
                                  capacity_per_branch: {
                                    ...prev.capacity_per_branch,
                                    [branchId]: capacity
                                  }
                                }));
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="departments">
              <div className="space-y-4">
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-2">
                    Department Association
                  </h4>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    Associate this grade level with academic departments. The first department selected will be the primary department.
                  </p>
                </div>

                <FormField
                  id="department_associations"
                  label="Associated Departments"
                  error={formErrors.department_associations}
                >
                  <SearchableMultiSelect
                    label=""
                    options={departments.map(dept => ({
                      value: dept.id,
                      label: `${dept.name} (${dept.school_name})`
                    }))}
                    selectedValues={formState.department_associations}
                    onChange={(values) => {
                      setFormState(prev => ({ ...prev, department_associations: values }));
                    }}
                    placeholder="Select departments..."
                  />
                </FormField>

                {formState.department_associations.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      Department Priority Order:
                    </div>
                    {formState.department_associations.map((deptId, index) => {
                      const dept = departments.find(d => d.id === deptId);
                      return (
                        <div key={deptId} className="flex items-center gap-2 text-sm">
                          <span className={`px-2 py-1 rounded text-xs ${
                            index === 0 
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' 
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {index === 0 ? 'Primary' : 'Associated'}
                          </span>
                          <span className="text-gray-900 dark:text-white">
                            {dept?.name || 'Unknown Department'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
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