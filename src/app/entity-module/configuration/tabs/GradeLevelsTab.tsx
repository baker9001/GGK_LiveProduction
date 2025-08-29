///home/project/src/app/entity-module/configuration/tabs/GradeLevelsTab.tsx

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../lib/supabase';
import { DataTable } from '../../../../components/shared/DataTable';
import { Button } from '../../../../components/shared/Button';
import { SearchableMultiSelect } from '../../../../components/shared/SearchableMultiSelect';
import { SlideInForm } from '../../../../components/shared/SlideInForm';
import { FormField } from '../../../../components/shared/FormField';
import { StatusBadge } from '../../../../components/shared/StatusBadge';
import { FilterCard } from '../../../../components/shared/FilterCard';
import { Toast } from '../../../../components/shared/Toast';
import { Plus, Edit, Trash2, GraduationCap } from 'lucide-react';
import { useAccessControl } from '../../../../hooks/useAccessControl';

interface GradeLevelsTabProps {
  companyId: string;
}

interface GradeLevel {
  id: string;
  grade_name: string;
  grade_code: string;
  grade_order: number;
  education_level: string;
  max_students_per_section: number;
  total_sections: number;
  status: string;
  created_at: string;
  school_ids: string[];
  school_names: string[];
}

interface GradeLevelFormData {
  grade_name: string;
  grade_code: string;
  grade_order: number;
  education_level: string;
  max_students_per_section: number;
  total_sections: number;
  status: string;
  school_ids: string[];
}

const initialFormData: GradeLevelFormData = {
  grade_name: '',
  grade_code: '',
  grade_order: 1,
  education_level: 'primary',
  max_students_per_section: 30,
  total_sections: 1,
  status: 'active',
  school_ids: []
};

export function GradeLevelsTab({ companyId }: GradeLevelsTabProps) {
  const queryClient = useQueryClient();
  const { canCreate, canEdit, canDelete, isEntityAdmin, isSubEntityAdmin, getScopeFilters } = useAccessControl();
  
  const scopeFilters = getScopeFilters();
  const canAccessAll = isEntityAdmin || isSubEntityAdmin;

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGradeLevel, setEditingGradeLevel] = useState<GradeLevel | null>(null);
  const [formData, setFormData] = useState<GradeLevelFormData>(initialFormData);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    school_ids: [] as string[],
    education_level: [] as string[],
    status: [] as string[]
  });

  // Fetch schools for dropdown
  const { data: schools = [] } = useQuery(
    ['schools', companyId],
    async () => {
      if (!companyId) return [];

      let query = supabase
        .from('schools')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name');

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
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
          grade_name,
          grade_code,
          grade_order,
          education_level,
          max_students_per_section,
          total_sections,
          status,
          created_at,
          grade_level_schools!inner (
            schools!grade_level_schools_school_id_fkey (
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
        school_ids: grade.grade_level_schools?.map(gls => gls.schools?.id) || [],
        school_names: grade.grade_level_schools?.map(gls => gls.schools?.name) || []
      }));
    }
  );

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: GradeLevelFormData) => {
      // Create grade levels for each selected school
      const gradeRecords = data.school_ids.map(schoolId => ({
        grade_name: data.grade_name,
        grade_code: data.grade_code,
        grade_order: data.grade_order,
        education_level: data.education_level,
        max_students_per_section: data.max_students_per_section,
        total_sections: data.total_sections,
        status: data.status,
        school_id: schoolId
      }));

      const { data: newGrades, error } = await supabase
        .from('grade_levels')
        .insert(gradeRecords)
        .select();

      if (error) throw error;

      // Create junction table entries
      const junctionRecords = newGrades.flatMap(grade => 
        data.school_ids.map(schoolId => ({
          grade_level_id: grade.id,
          school_id: schoolId
        }))
      );

      const { error: junctionError } = await supabase
        .from('grade_level_schools')
        .insert(junctionRecords);

      if (junctionError) throw junctionError;
      return newGrades;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['grade-levels']);
      setIsFormOpen(false);
      setFormData(initialFormData);
      setToast({ message: 'Grade level created successfully', type: 'success' });
    },
    onError: (error) => {
      setToast({ message: `Error creating grade level: ${error.message}`, type: 'error' });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: GradeLevelFormData) => {
      if (!editingGradeLevel) throw new Error('No grade level selected for editing');

      const { error } = await supabase
        .from('grade_levels')
        .update({
          grade_name: data.grade_name,
          grade_code: data.grade_code,
          grade_order: data.grade_order,
          education_level: data.education_level,
          max_students_per_section: data.max_students_per_section,
          total_sections: data.total_sections,
          status: data.status
        })
        .eq('id', editingGradeLevel.id);

      if (error) throw error;

      // Update junction table entries
      await supabase
        .from('grade_level_schools')
        .delete()
        .eq('grade_level_id', editingGradeLevel.id);

      const junctionRecords = data.school_ids.map(schoolId => ({
        grade_level_id: editingGradeLevel.id,
        school_id: schoolId
      }));

      const { error: junctionError } = await supabase
        .from('grade_level_schools')
        .insert(junctionRecords);

      if (junctionError) throw junctionError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['grade-levels']);
      setIsFormOpen(false);
      setEditingGradeLevel(null);
      setFormData(initialFormData);
      setToast({ message: 'Grade level updated successfully', type: 'success' });
    },
    onError: (error) => {
      setToast({ message: `Error updating grade level: ${error.message}`, type: 'error' });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('grade_levels')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['grade-levels']);
      setToast({ message: 'Grade level deleted successfully', type: 'success' });
    },
    onError: (error) => {
      setToast({ message: `Error deleting grade level: ${error.message}`, type: 'error' });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGradeLevel) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (gradeLevel: GradeLevel) => {
    setEditingGradeLevel(gradeLevel);
    setFormData({
      grade_name: gradeLevel.grade_name,
      grade_code: gradeLevel.grade_code,
      grade_order: gradeLevel.grade_order,
      education_level: gradeLevel.education_level,
      max_students_per_section: gradeLevel.max_students_per_section,
      total_sections: gradeLevel.total_sections,
      status: gradeLevel.status,
      school_ids: gradeLevel.school_ids
    });
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this grade level?')) {
      deleteMutation.mutate(id);
    }
  };

  const columns = [
    {
      key: 'grade_name',
      label: 'Grade Name',
      render: (gradeLevel: GradeLevel) => (
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-blue-500" />
          <span className="font-medium">{gradeLevel.grade_name}</span>
        </div>
      )
    },
    {
      key: 'grade_code',
      label: 'Code',
      render: (gradeLevel: GradeLevel) => (
        <span className="text-sm text-gray-600">{gradeLevel.grade_code}</span>
      )
    },
    {
      key: 'grade_order',
      label: 'Order',
      render: (gradeLevel: GradeLevel) => (
        <span className="text-sm">{gradeLevel.grade_order}</span>
      )
    },
    {
      key: 'education_level',
      label: 'Education Level',
      render: (gradeLevel: GradeLevel) => (
        <span className="capitalize text-sm">{gradeLevel.education_level}</span>
      )
    },
    {
      key: 'schools',
      label: 'Schools',
      render: (gradeLevel: GradeLevel) => (
        <div className="text-sm">
          {gradeLevel.school_names.length > 0 ? (
            <span>{gradeLevel.school_names.join(', ')}</span>
          ) : (
            <span className="text-gray-400">No schools assigned</span>
          )}
        </div>
      )
    },
    {
      key: 'max_students_per_section',
      label: 'Max Students',
      render: (gradeLevel: GradeLevel) => (
        <span className="text-sm">{gradeLevel.max_students_per_section}</span>
      )
    },
    {
      key: 'total_sections',
      label: 'Sections',
      render: (gradeLevel: GradeLevel) => (
        <span className="text-sm">{gradeLevel.total_sections}</span>
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
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(gradeLevel)}
            >
              <Edit className="w-4 h-4" />
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(gradeLevel.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      )
    }
  ];

  const filteredSchools = useMemo(() => {
    if (canAccessAll) return schools;
    if (!scopeFilters.school_ids) return [];
    return schools.filter(school => scopeFilters.school_ids!.includes(school.id));
  }, [schools, scopeFilters.school_ids, canAccessAll]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Grade Levels</h2>
          <p className="text-gray-600">Manage grade levels and their configurations</p>
        </div>
        {canCreate && (
          <Button
            onClick={() => {
              setEditingGradeLevel(null);
              setFormData(initialFormData);
              setIsFormOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Grade Level
          </Button>
        )}
      </div>

      {/* Filters */}
      <FilterCard>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <FormField label="Search">
            <input
              type="text"
              placeholder="Search grade levels..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </FormField>

          <SearchableMultiSelect
            label="Schools"
            options={filteredSchools.map(s => ({
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

      {/* Data Table */}
      <DataTable
        data={gradeLevels}
        columns={columns}
        isLoading={isLoading || isFetching}
        emptyMessage="No grade levels found"
      />

      {/* Form Modal */}
      <SlideInForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingGradeLevel(null);
          setFormData(initialFormData);
        }}
        title={editingGradeLevel ? 'Edit Grade Level' : 'Create Grade Level'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Grade Name" required>
              <input
                type="text"
                value={formData.grade_name}
                onChange={(e) => setFormData({ ...formData, grade_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </FormField>

            <FormField label="Grade Code">
              <input
                type="text"
                value={formData.grade_code}
                onChange={(e) => setFormData({ ...formData, grade_code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FormField>

            <FormField label="Grade Order" required>
              <input
                type="number"
                min="1"
                value={formData.grade_order}
                onChange={(e) => setFormData({ ...formData, grade_order: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </FormField>

            <FormField label="Education Level" required>
              <select
                value={formData.education_level}
                onChange={(e) => setFormData({ ...formData, education_level: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="kindergarten">Kindergarten</option>
                <option value="primary">Primary</option>
                <option value="middle">Middle</option>
                <option value="secondary">Secondary</option>
                <option value="senior">Senior</option>
              </select>
            </FormField>

            <FormField label="Max Students per Section" required>
              <input
                type="number"
                min="1"
                value={formData.max_students_per_section}
                onChange={(e) => setFormData({ ...formData, max_students_per_section: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </FormField>

            <FormField label="Total Sections" required>
              <input
                type="number"
                min="1"
                value={formData.total_sections}
                onChange={(e) => setFormData({ ...formData, total_sections: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </FormField>
          </div>

          <FormField label="Schools" required>
            <SearchableMultiSelect
              options={filteredSchools.map(school => ({
                value: school.id,
                label: school.name
              }))}
              selectedValues={formData.school_ids}
              onChange={(values) => setFormData({ ...formData, school_ids: values })}
              placeholder="Select schools..."
              isMulti={true}
            />
          </FormField>

          <FormField label="Status" required>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </FormField>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsFormOpen(false);
                setEditingGradeLevel(null);
                setFormData(initialFormData);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={createMutation.isLoading || updateMutation.isLoading}
            >
              {editingGradeLevel ? 'Update' : 'Create'} Grade Level
            </Button>
          </div>
        </form>
      </SlideInForm>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}