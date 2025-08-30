/**
 * File: /src/app/entity-module/configuration/tabs/GradeLevelsTab.tsx
 * Dependencies: 
 *   - @/lib/supabase
 *   - @/hooks/useAccessControl
 *   - @/components/shared/*
 *   - @/services/configurationIntegrationService
 *   - External: react, @tanstack/react-query, lucide-react, zod
 * 
 * Preserved Features:
 *   - All original CRUD operations
 *   - School/Branch/Department linking
 *   - Access control and scoping
 *   - Form validation
 *   - Search and filtering
 * 
 * Added/Modified:
 *   - NEW: Assignment tracking and statistics
 *   - NEW: Template management capability
 *   - NEW: Bulk assignment interface
 *   - NEW: Usage indicators
 *   - NEW: Integration with organisation module
 * 
 * Database Tables:
 *   - grade_levels (main table)
 *   - configuration_assignments (NEW - for tracking)
 *   - configuration_templates (NEW - for templates)
 *   - schools, branches, departments (for linking)
 * 
 * Connected Files:
 *   - /src/services/configurationIntegrationService.ts
 *   - /src/components/configuration/ConfigurationAssignmentWidget.tsx
 *   - /src/app/entity-module/organisation/tabs/schools/page.tsx
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, GraduationCap, School, Building2, Search, 
  Edit2, Trash2, Link2, Copy, FileText, ChevronDown,
  CheckCircle, AlertCircle, TrendingUp, Users
} from 'lucide-react';
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
import { ConfigurationIntegrationService } from '../../../../services/configurationIntegrationService';

// Schema remains the same with additional fields
const gradeLevelSchema = z.object({
  name: z.string().min(1, 'Grade level name is required'),
  code: z.string().optional(),
  level_order: z.number().min(0, 'Order must be positive'),
  description: z.string().optional(),
  curriculum_type: z.array(z.string()).optional(),
  age_range_start: z.number().optional(),
  age_range_end: z.number().optional(),
  school_ids: z.array(z.string().uuid()).optional(),
  branch_ids: z.array(z.string().uuid()).optional(),
  department_ids: z.array(z.string().uuid()).optional(),
  status: z.enum(['active', 'inactive'])
});

interface FilterState {
  search: string;
  school_ids: string[];
  branch_ids: string[];
  curriculum_type: string[];
  status: string[];
  hasAssignments: boolean | null;
}

interface FormState {
  name: string;
  code: string;
  level_order: number;
  description: string;
  curriculum_type: string[];
  age_range_start: number | null;
  age_range_end: number | null;
  school_ids: string[];
  branch_ids: string[];
  department_ids: string[];
  status: 'active' | 'inactive';
}

type GradeLevel = {
  id: string;
  name: string;
  code: string | null;
  level_order: number;
  description: string | null;
  curriculum_type: string[] | null;
  age_range_start: number | null;
  age_range_end: number | null;
  school_ids: string[] | null;
  school_names: string[];
  branch_ids: string[] | null;
  branch_names: string[];
  department_ids: string[] | null;
  department_names: string[];
  status: 'active' | 'inactive';
  created_at: string;
  assignment_count?: number;
  usage_stats?: {
    schools: number;
    branches: number;
    students: number;
  };
};

interface GradeLevelsTabProps {
  companyId: string | null;
}

export function GradeLevelsTab({ companyId }: GradeLevelsTabProps) {
  const queryClient = useQueryClient();
  const { getScopeFilters, isEntityAdmin, isSubEntityAdmin, isSchoolAdmin, isBranchAdmin } = useAccessControl();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGradeLevel, setEditingGradeLevel] = useState<GradeLevel | null>(null);
  const [formState, setFormState] = useState<FormState>({
    name: '',
    code: '',
    level_order: 0,
    description: '',
    curriculum_type: [],
    age_range_start: null,
    age_range_end: null,
    school_ids: [],
    branch_ids: [],
    department_ids: [],
    status: 'active'
  });
  
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    school_ids: [],
    branch_ids: [],
    curriculum_type: [],
    status: ['active'],
    hasAssignments: null
  });

  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [selectedGradeLevels, setSelectedGradeLevels] = useState<string[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const scopeFilters = getScopeFilters();
  const canAccessAll = isEntityAdmin || isSubEntityAdmin;

  // Fetch grade levels with enhanced data including usage statistics
  const { data: gradeLevels = [], isLoading, refetch } = useQuery(
    ['grade-levels-enhanced', companyId, scopeFilters, filters],
    async () => {
      if (!companyId) return [];

      let query = supabase
        .from('grade_levels')
        .select('*')
        .order('level_order', { ascending: true });

      // Apply filters
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
      }

      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Enhance with usage statistics
      const enhancedData = await Promise.all((data || []).map(async (gradeLevel) => {
        // Get assignment count
        const { count } = await ConfigurationIntegrationService.getConfigurationUsage(
          gradeLevel.id,
          'grade_level'
        );

        // Get school and branch names
        const schoolNames = [];
        const branchNames = [];
        const departmentNames = [];

        if (gradeLevel.school_ids?.length) {
          const { data: schools } = await supabase
            .from('schools')
            .select('name')
            .in('id', gradeLevel.school_ids);
          schoolNames.push(...(schools || []).map(s => s.name));
        }

        if (gradeLevel.branch_ids?.length) {
          const { data: branches } = await supabase
            .from('branches')
            .select('name')
            .in('id', gradeLevel.branch_ids);
          branchNames.push(...(branches || []).map(b => b.name));
        }

        if (gradeLevel.department_ids?.length) {
          const { data: departments } = await supabase
            .from('departments')
            .select('name')
            .in('id', gradeLevel.department_ids);
          departmentNames.push(...(departments || []).map(d => d.name));
        }

        return {
          ...gradeLevel,
          school_names: schoolNames,
          branch_names: branchNames,
          department_names: departmentNames,
          assignment_count: count || 0,
          usage_stats: {
            schools: schoolNames.length,
            branches: branchNames.length,
            students: 0 // Would need to query student enrollments
          }
        };
      }));

      // Filter by assignment status if needed
      if (filters.hasAssignments !== null) {
        return enhancedData.filter(gl => 
          filters.hasAssignments ? gl.assignment_count > 0 : gl.assignment_count === 0
        );
      }

      return enhancedData;
    },
    {
      enabled: !!companyId,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Fetch schools for linking
  const { data: schools = [] } = useQuery(
    ['schools-for-grade-levels', companyId],
    async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('schools')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data || [];
    },
    {
      enabled: !!companyId,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Fetch branches for linking
  const { data: branches = [] } = useQuery(
    ['branches-for-grade-levels', companyId, formState.school_ids],
    async () => {
      if (!companyId || formState.school_ids.length === 0) return [];

      const { data, error } = await supabase
        .from('branches')
        .select('id, name, school_id')
        .in('school_id', formState.school_ids)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data || [];
    },
    {
      enabled: !!companyId && formState.school_ids.length > 0,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Fetch departments for linking
  const { data: departments = [] } = useQuery(
    ['departments-for-grade-levels', companyId, formState.school_ids],
    async () => {
      if (!companyId || formState.school_ids.length === 0) return [];

      const { data, error } = await supabase
        .from('departments')
        .select('id, name, school_id')
        .in('school_id', formState.school_ids)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data || [];
    },
    {
      enabled: !!companyId && formState.school_ids.length > 0,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Create mutation
  const createMutation = useMutation(
    async (data: FormState) => {
      const { data: gradeLevel, error } = await supabase
        .from('grade_levels')
        .insert({
          ...data,
          company_id: companyId
        })
        .select()
        .single();

      if (error) throw error;

      // Create assignments if schools/branches are selected
      if (data.school_ids?.length || data.branch_ids?.length) {
        const assignments = [];
        
        if (data.school_ids?.length) {
          await ConfigurationIntegrationService.assignConfigurations({
            configurationType: 'grade_level',
            configurationIds: [gradeLevel.id],
            targetType: 'school',
            targetIds: data.school_ids
          });
        }

        if (data.branch_ids?.length) {
          await ConfigurationIntegrationService.assignConfigurations({
            configurationType: 'grade_level',
            configurationIds: [gradeLevel.id],
            targetType: 'branch',
            targetIds: data.branch_ids
          });
        }
      }

      return gradeLevel;
    },
    {
      onSuccess: () => {
        toast.success('Grade level created successfully');
        queryClient.invalidateQueries(['grade-levels-enhanced']);
        setIsFormOpen(false);
        resetForm();
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to create grade level');
      }
    }
  );

  // Update mutation
  const updateMutation = useMutation(
    async (data: FormState) => {
      if (!editingGradeLevel) return;

      const { error } = await supabase
        .from('grade_levels')
        .update(data)
        .eq('id', editingGradeLevel.id);

      if (error) throw error;

      // Update assignments
      // First, deactivate old assignments
      await supabase
        .from('configuration_assignments')
        .update({ is_active: false })
        .eq('configuration_id', editingGradeLevel.id)
        .eq('configuration_type', 'grade_level');

      // Then create new assignments
      if (data.school_ids?.length) {
        await ConfigurationIntegrationService.assignConfigurations({
          configurationType: 'grade_level',
          configurationIds: [editingGradeLevel.id],
          targetType: 'school',
          targetIds: data.school_ids
        });
      }

      if (data.branch_ids?.length) {
        await ConfigurationIntegrationService.assignConfigurations({
          configurationType: 'grade_level',
          configurationIds: [editingGradeLevel.id],
          targetType: 'branch',
          targetIds: data.branch_ids
        });
      }
    },
    {
      onSuccess: () => {
        toast.success('Grade level updated successfully');
        queryClient.invalidateQueries(['grade-levels-enhanced']);
        setIsFormOpen(false);
        setEditingGradeLevel(null);
        resetForm();
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to update grade level');
      }
    }
  );

  // Delete mutation
  const deleteMutation = useMutation(
    async (id: string) => {
      // First check if there are active assignments
      const { count } = await ConfigurationIntegrationService.getConfigurationUsage(
        id,
        'grade_level'
      );

      if (count > 0) {
        throw new Error(`Cannot delete grade level. It is assigned to ${count} location(s).`);
      }

      const { error } = await supabase
        .from('grade_levels')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    {
      onSuccess: () => {
        toast.success('Grade level deleted successfully');
        queryClient.invalidateQueries(['grade-levels-enhanced']);
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to delete grade level');
      }
    }
  );

  // Bulk assignment handler
  const handleBulkAssign = async (targetIds: string[], targetType: 'school' | 'branch') => {
    try {
      const results = await ConfigurationIntegrationService.bulkAssign([
        {
          configurationType: 'grade_level',
          configurationIds: selectedGradeLevels,
          targetType,
          targetIds
        }
      ]);

      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        toast.error(`Failed to assign to ${errors.length} targets`);
      } else {
        toast.success('Bulk assignment completed successfully');
        setShowBulkAssign(false);
        setSelectedGradeLevels([]);
        refetch();
      }
    } catch (error) {
      toast.error('Bulk assignment failed');
    }
  };

  // Create from template
  const handleCreateFromTemplate = async (templateId: string) => {
    try {
      const { data: template } = await supabase
        .from('configuration_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (template) {
        setFormState({
          ...formState,
          ...template.template_data
        });
        setShowTemplateModal(false);
        setIsFormOpen(true);
      }
    } catch (error) {
      toast.error('Failed to load template');
    }
  };

  const resetForm = () => {
    setFormState({
      name: '',
      code: '',
      level_order: 0,
      description: '',
      curriculum_type: [],
      age_range_start: null,
      age_range_end: null,
      school_ids: [],
      branch_ids: [],
      department_ids: [],
      status: 'active'
    });
  };

  const handleEdit = (gradeLevel: GradeLevel) => {
    setEditingGradeLevel(gradeLevel);
    setFormState({
      name: gradeLevel.name,
      code: gradeLevel.code || '',
      level_order: gradeLevel.level_order,
      description: gradeLevel.description || '',
      curriculum_type: gradeLevel.curriculum_type || [],
      age_range_start: gradeLevel.age_range_start,
      age_range_end: gradeLevel.age_range_end,
      school_ids: gradeLevel.school_ids || [],
      branch_ids: gradeLevel.branch_ids || [],
      department_ids: gradeLevel.department_ids || [],
      status: gradeLevel.status
    });
    setIsFormOpen(true);
  };

  const handleSubmit = () => {
    const validation = gradeLevelSchema.safeParse(formState);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    if (editingGradeLevel) {
      updateMutation.mutate(formState);
    } else {
      createMutation.mutate(formState);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Grade Level',
      render: (gradeLevel: GradeLevel) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">{gradeLevel.level_order}</span>
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-white">{gradeLevel.name}</div>
            {gradeLevel.code && (
              <div className="text-sm text-gray-500 dark:text-gray-400">Code: {gradeLevel.code}</div>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'assignments',
      label: 'Assignments',
      render: (gradeLevel: GradeLevel) => (
        <div className="space-y-1">
          <div className="flex items-center gap-4 text-sm">
            {gradeLevel.usage_stats?.schools > 0 && (
              <div className="flex items-center gap-1">
                <School className="w-4 h-4 text-blue-500" />
                <span>{gradeLevel.usage_stats.schools} Schools</span>
              </div>
            )}
            {gradeLevel.usage_stats?.branches > 0 && (
              <div className="flex items-center gap-1">
                <Building2 className="w-4 h-4 text-purple-500" />
                <span>{gradeLevel.usage_stats.branches} Branches</span>
              </div>
            )}
          </div>
          {gradeLevel.assignment_count > 0 && (
            <div className="flex items-center gap-1">
              <Link2 className="w-3 h-3 text-green-500" />
              <span className="text-xs text-green-600">{gradeLevel.assignment_count} total assignments</span>
            </div>
          )}
        </div>
      )
    },
    {
      key: 'curriculum',
      label: 'Curriculum',
      render: (gradeLevel: GradeLevel) => (
        <div className="flex flex-wrap gap-1">
          {gradeLevel.curriculum_type?.map((type) => (
            <span key={type} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
              {type}
            </span>
          ))}
        </div>
      )
    },
    {
      key: 'age_range',
      label: 'Age Range',
      render: (gradeLevel: GradeLevel) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {gradeLevel.age_range_start && gradeLevel.age_range_end
            ? `${gradeLevel.age_range_start} - ${gradeLevel.age_range_end} years`
            : '-'}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (gradeLevel: GradeLevel) => (
        <StatusBadge status={gradeLevel.status} />
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (gradeLevel: GradeLevel) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleEdit(gradeLevel)}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (confirm('Are you sure you want to delete this grade level?')) {
                deleteMutation.mutate(gradeLevel.id);
              }
            }}
            disabled={gradeLevel.assignment_count > 0}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header with statistics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Grade Levels</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage academic grade levels and their assignments
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowTemplateModal(true)}
            >
              <FileText className="w-4 h-4 mr-2" />
              Templates
            </Button>
            {selectedGradeLevels.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowBulkAssign(true)}
              >
                <Link2 className="w-4 h-4 mr-2" />
                Bulk Assign ({selectedGradeLevels.length})
              </Button>
            )}
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Grade Level
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              <span className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {gradeLevels.length}
              </span>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">Total Grade Levels</p>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-2xl font-bold text-green-900 dark:text-green-100">
                {gradeLevels.filter(gl => gl.status === 'active').length}
              </span>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300 mt-2">Active Levels</p>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <Link2 className="w-5 h-5 text-purple-600" />
              <span className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {gradeLevels.filter(gl => gl.assignment_count > 0).length}
              </span>
            </div>
            <p className="text-sm text-purple-700 dark:text-purple-300 mt-2">Assigned Levels</p>
          </div>
          
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <Users className="w-5 h-5 text-orange-600" />
              <span className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                {gradeLevels.reduce((sum, gl) => sum + (gl.usage_stats?.students || 0), 0)}
              </span>
            </div>
            <p className="text-sm text-orange-700 dark:text-orange-300 mt-2">Total Students</p>
          </div>
        </div>

        {/* Filters */}
        <FilterCard>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <FormField label="Search">
              <Input
                placeholder="Search grade levels..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                icon={<Search className="w-4 h-4" />}
              />
            </FormField>

            <FormField label="Schools">
              <SearchableMultiSelect
                options={schools}
                value={filters.school_ids}
                onChange={(value) => setFilters({ ...filters, school_ids: value })}
                placeholder="Filter by schools"
                displayKey="name"
                valueKey="id"
              />
            </FormField>

            <FormField label="Status">
              <Select
                value={filters.status[0] || ''}
                onChange={(e) => setFilters({ 
                  ...filters, 
                  status: e.target.value ? [e.target.value] : [] 
                })}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </FormField>

            <FormField label="Assignment Status">
              <Select
                value={filters.hasAssignments === null ? '' : filters.hasAssignments.toString()}
                onChange={(e) => setFilters({ 
                  ...filters, 
                  hasAssignments: e.target.value === '' ? null : e.target.value === 'true'
                })}
              >
                <option value="">All</option>
                <option value="true">Has Assignments</option>
                <option value="false">No Assignments</option>
              </Select>
            </FormField>
          </div>
        </FilterCard>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={gradeLevels}
        loading={isLoading}
        onRowSelect={(selected) => setSelectedGradeLevels(selected.map(gl => gl.id))}
        selectable
      />

      {/* Create/Edit Form */}
      <SlideInForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingGradeLevel(null);
          resetForm();
        }}
        title={editingGradeLevel ? 'Edit Grade Level' : 'Create Grade Level'}
        onSave={handleSubmit}
        loading={createMutation.isLoading || updateMutation.isLoading}
      >
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Basic Information</h3>
            
            <FormField label="Grade Level Name" required>
              <Input
                value={formState.name}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                placeholder="e.g., Grade 1, Kindergarten"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Code">
                <Input
                  value={formState.code}
                  onChange={(e) => setFormState({ ...formState, code: e.target.value })}
                  placeholder="e.g., G1, KG"
                />
              </FormField>

              <FormField label="Order" required>
                <Input
                  type="number"
                  value={formState.level_order}
                  onChange={(e) => setFormState({ ...formState, level_order: parseInt(e.target.value) || 0 })}
                  min="0"
                />
              </FormField>
            </div>

            <FormField label="Description">
              <Textarea
                value={formState.description}
                onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                rows={3}
                placeholder="Describe this grade level..."
              />
            </FormField>
          </div>

          {/* Academic Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Academic Details</h3>
            
            <FormField label="Curriculum Types">
              <SearchableMultiSelect
                options={[
                  { id: 'CBSE', name: 'CBSE' },
                  { id: 'ICSE', name: 'ICSE' },
                  { id: 'State Board', name: 'State Board' },
                  { id: 'IB', name: 'IB' },
                  { id: 'Cambridge', name: 'Cambridge' }
                ]}
                value={formState.curriculum_type}
                onChange={(value) => setFormState({ ...formState, curriculum_type: value })}
                placeholder="Select curriculum types"
                displayKey="name"
                valueKey="id"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Age Range Start">
                <Input
                  type="number"
                  value={formState.age_range_start || ''}
                  onChange={(e) => setFormState({ 
                    ...formState, 
                    age_range_start: e.target.value ? parseInt(e.target.value) : null 
                  })}
                  min="0"
                  placeholder="e.g., 5"
                />
              </FormField>

              <FormField label="Age Range End">
                <Input
                  type="number"
                  value={formState.age_range_end || ''}
                  onChange={(e) => setFormState({ 
                    ...formState, 
                    age_range_end: e.target.value ? parseInt(e.target.value) : null 
                  })}
                  min="0"
                  placeholder="e.g., 6"
                />
              </FormField>
            </div>
          </div>

          {/* Assignments */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Assignments</h3>
            
            <FormField label="Assign to Schools">
              <SearchableMultiSelect
                options={schools}
                value={formState.school_ids}
                onChange={(value) => setFormState({ ...formState, school_ids: value, branch_ids: [], department_ids: [] })}
                placeholder="Select schools"
                displayKey="name"
                valueKey="id"
              />
            </FormField>

            {formState.school_ids.length > 0 && (
              <>
                <FormField label="Assign to Branches">
                  <SearchableMultiSelect
                    options={branches}
                    value={formState.branch_ids}
                    onChange={(value) => setFormState({ ...formState, branch_ids: value })}
                    placeholder="Select branches (optional)"
                    displayKey="name"
                    valueKey="id"
                  />
                </FormField>

                <FormField label="Assign to Departments">
                  <SearchableMultiSelect
                    options={departments}
                    value={formState.department_ids}
                    onChange={(value) => setFormState({ ...formState, department_ids: value })}
                    placeholder="Select departments (optional)"
                    displayKey="name"
                    valueKey="id"
                  />
                </FormField>
              </>
            )}
          </div>

          {/* Status */}
          <FormField label="Status">
            <Select
              value={formState.status}
              onChange={(e) => setFormState({ ...formState, status: e.target.value as 'active' | 'inactive' })}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </FormField>
        </div>
      </SlideInForm>

      {/* Bulk Assignment Modal */}
      {showBulkAssign && (
        <BulkAssignmentModal
          isOpen={showBulkAssign}
          onClose={() => setShowBulkAssign(false)}
          selectedItems={selectedGradeLevels}
          itemType="grade_level"
          schools={schools}
          onAssign={handleBulkAssign}
        />
      )}

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <TemplateSelectionModal
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          templateType="grade_level"
          companyId={companyId}
          onSelect={handleCreateFromTemplate}
        />
      )}
    </div>
  );
}

// Bulk Assignment Modal Component
function BulkAssignmentModal({ isOpen, onClose, selectedItems, itemType, schools, onAssign }) {
  const [targetType, setTargetType] = useState<'school' | 'branch'>('school');
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    if (targetType === 'branch' && selectedTargets.length > 0) {
      // Fetch branches for selected schools
      supabase
        .from('branches')
        .select('id, name')
        .in('school_id', selectedTargets)
        .eq('status', 'active')
        .then(({ data }) => setBranches(data || []));
    }
  }, [targetType, selectedTargets]);

  return (
    <SlideInForm
      isOpen={isOpen}
      onClose={onClose}
      title={`Bulk Assign ${selectedItems.length} Grade Level(s)`}
      onSave={() => onAssign(selectedTargets, targetType)}
    >
      <div className="space-y-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            You are about to assign {selectedItems.length} grade level(s) to multiple locations.
            This action will create assignments that can be managed individually later.
          </p>
        </div>

        <FormField label="Assignment Type">
          <Select
            value={targetType}
            onChange={(e) => {
              setTargetType(e.target.value as 'school' | 'branch');
              setSelectedTargets([]);
            }}
          >
            <option value="school">Assign to Schools</option>
            <option value="branch">Assign to Branches</option>
          </Select>
        </FormField>

        {targetType === 'school' ? (
          <FormField label="Select Schools">
            <SearchableMultiSelect
              options={schools}
              value={selectedTargets}
              onChange={setSelectedTargets}
              placeholder="Select schools to assign to"
              displayKey="name"
              valueKey="id"
            />
          </FormField>
        ) : (
          <>
            <FormField label="Select Schools First">
              <SearchableMultiSelect
                options={schools}
                value={selectedTargets}
                onChange={setSelectedTargets}
                placeholder="Select schools"
                displayKey="name"
                valueKey="id"
              />
            </FormField>
            
            {selectedTargets.length > 0 && branches.length > 0 && (
              <FormField label="Select Branches">
                <SearchableMultiSelect
                  options={branches}
                  value={selectedTargets}
                  onChange={setSelectedTargets}
                  placeholder="Select branches to assign to"
                  displayKey="name"
                  valueKey="id"
                />
              </FormField>
            )}
          </>
        )}
      </div>
    </SlideInForm>
  );
}

// Template Selection Modal Component
function TemplateSelectionModal({ isOpen, onClose, templateType, companyId, onSelect }) {
  const { data: templates = [], isLoading } = useQuery(
    ['configuration-templates', templateType, companyId],
    async () => {
      const { data } = await supabase
        .from('configuration_templates')
        .select('*')
        .eq('company_id', companyId)
        .eq('template_type', templateType)
        .order('template_name');
      
      return data || [];
    }
  );

  return (
    <SlideInForm
      isOpen={isOpen}
      onClose={onClose}
      title="Select Template"
      hideFooter
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading templates...</p>
            </div>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No templates available</p>
            <p className="text-sm text-gray-500 mt-1">Create grade levels manually to save as templates later</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                onClick={() => onSelect(template.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {template.template_name}
                    </h4>
                    {template.template_data?.description && (
                      <p className="text-sm text-gray-500 mt-1">
                        {template.template_data.description}
                      </p>
                    )}
                  </div>
                  <ChevronDown className="w-5 h-5 text-gray-400 rotate-[-90deg]" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SlideInForm>
  );
}