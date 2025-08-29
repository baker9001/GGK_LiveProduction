/**
 * File: /src/app/entity-module/configuration/tabs/AcademicYearsTab.tsx
 * 
 * Academic Years Management Tab
 * Manages academic_years table data with school-based organization
 */

'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, School, Hash, Clock } from 'lucide-react';
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
import { ConfirmationDialog } from '../../../../components/shared/ConfirmationDialog';
import { ToggleSwitch } from '../../../../components/shared/ToggleSwitch';
import { toast } from '../../../../components/shared/Toast';

const academicYearSchema = z.object({
  school_id: z.string().uuid('Please select a school'),
  year_name: z.string().min(1, 'Year name is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  total_terms: z.number().min(1, 'Must have at least 1 term').max(4, 'Cannot exceed 4 terms'),
  current_term: z.number().min(1).optional(),
  is_current: z.boolean(),
  status: z.enum(['planned', 'active', 'completed'])
}).refine((data) => {
  const start = new Date(data.start_date);
  const end = new Date(data.end_date);
  return end > start;
}, {
  message: "End date must be after start date",
  path: ["end_date"]
});

interface FilterState {
  search: string;
  school_ids: string[];
  status: string[];
  is_current: string[];
}

type AcademicYear = {
  id: string;
  school_id: string;
  school_name: string;
  year_name: string;
  start_date: string;
  end_date: string;
  total_terms: number | null;
  current_term: number | null;
  is_current: boolean | null;
  status: 'planned' | 'active' | 'completed';
  created_at: string;
};

interface AcademicYearsTabProps {
  companyId: string | null;
}

export default function AcademicYearsTab({ companyId }: AcademicYearsTabProps) {
  const queryClient = useQueryClient();
  const { getScopeFilters, isEntityAdmin, isSubEntityAdmin } = useAccessControl();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAcademicYear, setEditingAcademicYear] = useState<AcademicYear | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    school_ids: [],
    status: [],
    is_current: []
  });

  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [academicYearsToDelete, setAcademicYearsToDelete] = useState<AcademicYear[]>([]);

  // Get scope filters
  const scopeFilters = getScopeFilters('schools');
  const canAccessAll = isEntityAdmin || isSubEntityAdmin;

  // Fetch schools for dropdown
  const { data: schools = [] } = useQuery(
    ['schools-for-academic-years', companyId, scopeFilters],
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

  // Fetch academic years
  const { 
    data: academicYears = [], 
    isLoading, 
    isFetching 
  } = useQuery(
    ['academic-years', companyId, filters, scopeFilters],
    async () => {
      if (!companyId) return [];

      let query = supabase
        .from('academic_years')
        .select(`
          id,
          school_id,
          year_name,
          start_date,
          end_date,
          total_terms,
          current_term,
          is_current,
          status,
          created_at,
          schools!academic_years_school_id_fkey (
            name
          )
        `)
        .order('start_date', { ascending: false });

      // Apply school filtering based on scope
      if (!canAccessAll && scopeFilters.school_ids && scopeFilters.school_ids.length > 0) {
        query = query.in('school_id', scopeFilters.school_ids);
      } else if (!canAccessAll) {
        return [];
      }

      // Apply additional filters
      if (filters.search) {
        query = query.ilike('year_name', `%${filters.search}%`);
      }

      if (filters.school_ids.length > 0) {
        query = query.in('school_id', filters.school_ids);
      }

      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      if (filters.is_current.length > 0) {
        const boolValues = filters.is_current.map(v => v === 'true');
        query = query.in('is_current', boolValues);
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
      keepPreviousData: true,
      staleTime: 2 * 60 * 1000,
    }
  );

  // Create/update academic year mutation
  const academicYearMutation = useMutation(
    async (formData: FormData) => {
      const data = {
        school_id: formData.get('school_id') as string,
        year_name: formData.get('year_name') as string,
        start_date: formData.get('start_date') as string,
        end_date: formData.get('end_date') as string,
        total_terms: parseInt(formData.get('total_terms') as string) || 3,
        current_term: parseInt(formData.get('current_term') as string) || undefined,
        is_current: formData.get('is_current') === 'true',
        status: formData.get('status') as 'planned' | 'active' | 'completed'
      };

      const validatedData = academicYearSchema.parse(data);

      if (editingAcademicYear) {
        const { error } = await supabase
          .from('academic_years')
          .update(validatedData)
          .eq('id', editingAcademicYear.id);

        if (error) throw error;
        return { ...editingAcademicYear, ...validatedData };
      } else {
        const { data: newAcademicYear, error } = await supabase
          .from('academic_years')
          .insert([validatedData])
          .select()
          .single();

        if (error) throw error;
        return newAcademicYear;
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['academic-years']);
        setIsFormOpen(false);
        setEditingAcademicYear(null);
        setFormErrors({});
        toast.success(`Academic year ${editingAcademicYear ? 'updated' : 'created'} successfully`);
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
          console.error('Error saving academic year:', error);
          setFormErrors({ form: 'Failed to save academic year. Please try again.' });
          toast.error('Failed to save academic year');
        }
      }
    }
  );

  // Delete academic years mutation
  const deleteMutation = useMutation(
    async (academicYears: AcademicYear[]) => {
      const { error } = await supabase
        .from('academic_years')
        .delete()
        .in('id', academicYears.map(y => y.id));

      if (error) throw error;
      return academicYears;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['academic-years']);
        setIsConfirmDialogOpen(false);
        setAcademicYearsToDelete([]);
        toast.success('Academic year(s) deleted successfully');
      },
      onError: (error) => {
        console.error('Error deleting academic years:', error);
        toast.error('Failed to delete academic year(s)');
        setIsConfirmDialogOpen(false);
        setAcademicYearsToDelete([]);
      }
    }
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    academicYearMutation.mutate(new FormData(e.currentTarget));
  };

  const handleDelete = (academicYears: AcademicYear[]) => {
    setAcademicYearsToDelete(academicYears);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(academicYearsToDelete);
  };

  const cancelDelete = () => {
    setIsConfirmDialogOpen(false);
    setAcademicYearsToDelete([]);
  };

  const columns = [
    {
      id: 'year_name',
      header: 'Academic Year',
      accessorKey: 'year_name',
      enableSorting: true,
    },
    {
      id: 'school_name',
      header: 'School',
      accessorKey: 'school_name',
      enableSorting: true,
    },
    {
      id: 'duration',
      header: 'Duration',
      enableSorting: true,
      cell: (row: AcademicYear) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900 dark:text-white">
            {new Date(row.start_date).toLocaleDateString()} - {new Date(row.end_date).toLocaleDateString()}
          </div>
          <div className="text-gray-500 dark:text-gray-400">
            {Math.ceil((new Date(row.end_date).getTime() - new Date(row.start_date).getTime()) / (1000 * 60 * 60 * 24))} days
          </div>
        </div>
      ),
    },
    {
      id: 'terms',
      header: 'Terms',
      enableSorting: true,
      cell: (row: AcademicYear) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900 dark:text-white">
            {row.total_terms || 3} terms
          </div>
          {row.current_term && (
            <div className="text-gray-500 dark:text-gray-400">
              Current: Term {row.current_term}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'is_current',
      header: 'Current',
      enableSorting: true,
      cell: (row: AcademicYear) => (
        <StatusBadge 
          status={row.is_current ? 'active' : 'inactive'} 
          size="sm"
        />
      ),
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: true,
      cell: (row: AcademicYear) => (
        <StatusBadge status={row.status} />
      ),
    },
    {
      id: 'created_at',
      header: 'Created At',
      accessorKey: 'created_at',
      enableSorting: true,
      cell: (row: AcademicYear) => (
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Academic Years</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage academic year schedules and term structures
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingAcademicYear(null);
            setIsFormOpen(true);
          }}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add Academic Year
        </Button>
      </div>

      <FilterCard
        title="Filters"
        onApply={() => {}}
        onClear={() => {
          setFilters({
            search: '',
            school_ids: [],
            status: [],
            is_current: []
          });
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FormField id="search" label="Search">
            <Input
              id="search"
              placeholder="Search by year name..."
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
            label="Status"
            options={[
              { value: 'planned', label: 'Planned' },
              { value: 'active', label: 'Active' },
              { value: 'completed', label: 'Completed' }
            ]}
            selectedValues={filters.status}
            onChange={(values) => setFilters({ ...filters, status: values })}
            placeholder="Select status..."
          />

          <SearchableMultiSelect
            label="Current Year"
            options={[
              { value: 'true', label: 'Current' },
              { value: 'false', label: 'Not Current' }
            ]}
            selectedValues={filters.is_current}
            onChange={(values) => setFilters({ ...filters, is_current: values })}
            placeholder="Select current..."
          />
        </div>
      </FilterCard>

      <DataTable
        data={academicYears}
        columns={columns}
        keyField="id"
        caption="List of academic years with their schedules and term structures"
        ariaLabel="Academic years data table"
        loading={isLoading}
        isFetching={isFetching}
        onEdit={(academicYear) => {
          setEditingAcademicYear(academicYear);
          setIsFormOpen(true);
        }}
        onDelete={handleDelete}
        emptyMessage="No academic years found"
      />

      <SlideInForm
        key={editingAcademicYear?.id || 'new'}
        title={editingAcademicYear ? 'Edit Academic Year' : 'Create Academic Year'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingAcademicYear(null);
          setFormErrors({});
        }}
        onSave={() => {
          const form = document.querySelector('form');
          if (form) form.requestSubmit();
        }}
        loading={academicYearMutation.isLoading}
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
            <Select
              id="school_id"
              name="school_id"
              options={schools.map(school => ({
                value: school.id,
                label: school.name
              }))}
              defaultValue={editingAcademicYear?.school_id || ''}
              searchable={true}
              usePortal={true}
            />
          </FormField>

          <FormField
            id="year_name"
            label="Academic Year Name"
            required
            error={formErrors.year_name}
          >
            <Input
              id="year_name"
              name="year_name"
              placeholder="e.g., 2024-2025, Academic Year 2024"
              defaultValue={editingAcademicYear?.year_name}
              leftIcon={<Calendar className="h-5 w-5 text-gray-400" />}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              id="start_date"
              label="Start Date"
              required
              error={formErrors.start_date}
            >
              <Input
                id="start_date"
                name="start_date"
                type="date"
                defaultValue={editingAcademicYear?.start_date}
              />
            </FormField>

            <FormField
              id="end_date"
              label="End Date"
              required
              error={formErrors.end_date}
            >
              <Input
                id="end_date"
                name="end_date"
                type="date"
                defaultValue={editingAcademicYear?.end_date}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              id="total_terms"
              label="Total Terms"
              required
              error={formErrors.total_terms}
            >
              <Select
                id="total_terms"
                name="total_terms"
                options={[
                  { value: '1', label: '1 Term' },
                  { value: '2', label: '2 Terms' },
                  { value: '3', label: '3 Terms' },
                  { value: '4', label: '4 Terms' }
                ]}
                defaultValue={editingAcademicYear?.total_terms?.toString() || '3'}
              />
            </FormField>

            <FormField
              id="current_term"
              label="Current Term"
              error={formErrors.current_term}
            >
              <Select
                id="current_term"
                name="current_term"
                options={[
                  { value: '', label: 'Not set' },
                  { value: '1', label: 'Term 1' },
                  { value: '2', label: 'Term 2' },
                  { value: '3', label: 'Term 3' },
                  { value: '4', label: 'Term 4' }
                ]}
                defaultValue={editingAcademicYear?.current_term?.toString() || ''}
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
                    Academic Year Status
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {editingAcademicYear?.status === 'active' || (!editingAcademicYear && 'active')
                      ? 'Academic year is currently active' 
                      : editingAcademicYear?.status === 'completed'
                        ? 'Academic year has been completed'
                        : 'Academic year is in planning phase'}
                  </p>
                </div>
                <input
                  type="hidden"
                  name="status"
                  defaultValue={editingAcademicYear?.status || 'planned'}
                />
                <ToggleSwitch
                  checked={editingAcademicYear?.status === 'active' || false}
                  onChange={(checked) => {
                    const input = document.querySelector('input[name="status"]') as HTMLInputElement;
                    if (input) input.value = checked ? 'active' : 'planned';
                  }}
                  label="Active"
                />
              </div>
              
              {/* Additional status option for completed */}
              <FormField id="status_select" label="Or select specific status">
                <Select
                  id="status_select"
                  options={[
                    { value: 'planned', label: 'Planned' },
                    { value: 'active', label: 'Active' },
                    { value: 'completed', label: 'Completed' }
                  ]}
                  value={editingAcademicYear?.status || 'planned'}
                  onChange={(value) => {
                    const input = document.querySelector('input[name="status"]') as HTMLInputElement;
                    if (input) input.value = value;
                  }}
                />
              </FormField>
            </div>
          </FormField>

          <FormField id="is_current" label="Current Academic Year">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Set as Current Year
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Only one academic year can be current per school
                </p>
              </div>
              <input
                type="hidden"
                name="is_current"
                value={editingAcademicYear?.is_current ? 'true' : 'false'}
              />
              <ToggleSwitch
                checked={editingAcademicYear?.is_current || false}
                onChange={(checked) => {
                  const input = document.querySelector('input[name="is_current"]') as HTMLInputElement;
                  if (input) input.value = checked ? 'true' : 'false';
                }}
                label="Current"
              />
            </div>
          </FormField>
        </form>
      </SlideInForm>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        title="Delete Academic Year"
        message={`Are you sure you want to delete ${academicYearsToDelete.length} academic year(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}