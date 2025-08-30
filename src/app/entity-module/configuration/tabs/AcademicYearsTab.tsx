/**
 * File: /src/app/entity-module/configuration/tabs/AcademicYearsTab.tsx
 * 
 * Academic Years Management Tab - CORRECTED VERSION
 * Fixed: Multi-school selection, date validation, junction table handling
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, School, CalendarClock } from 'lucide-react';
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

const academicYearSchema = z.object({
  school_ids: z.array(z.string().uuid()).min(1, 'Please select at least one school'),
  year_name: z.string().min(1, 'Year name is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  is_current: z.boolean(),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive', 'completed'])
}).refine(data => {
  const start = new Date(data.start_date);
  const end = new Date(data.end_date);
  return start < end;
}, {
  message: "End date must be after start date",
  path: ["end_date"]
});

interface FilterState {
  search: string;
  school_ids: string[];
  is_current: boolean | null;
  status: string[];
}

interface FormState {
  school_ids: string[];
  year_name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  description: string;
  status: 'active' | 'inactive' | 'completed';
}

type AcademicYear = {
  id: string;
  school_id: string;
  school_name: string;
  year_name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  description: string | null;
  status: 'active' | 'inactive' | 'completed';
  created_at: string;
};

interface AcademicYearsTabProps {
  companyId: string | null;
}

export function AcademicYearsTab({ companyId }: AcademicYearsTabProps) {
  const queryClient = useQueryClient();
  const { getScopeFilters, isEntityAdmin, isSubEntityAdmin } = useAccessControl();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    school_ids: [],
    is_current: null,
    status: []
  });

  const [formState, setFormState] = useState<FormState>({
    school_ids: [],
    year_name: '',
    start_date: '',
    end_date: '',
    is_current: false,
    description: '',
    status: 'active',
  });

  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [yearsToDelete, setYearsToDelete] = useState<AcademicYear[]>([]);

  // Get scope filters
  const scopeFilters = getScopeFilters('schools');
  const canAccessAll = isEntityAdmin || isSubEntityAdmin;

  // Fetch schools for dropdown
  const { data: schools = [] } = useQuery(
    ['schools-for-years', companyId, scopeFilters],
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
      if (editingYear) {
        // When editing, get associated schools from junction table
        const loadAssociatedSchools = async () => {
          const { data: schoolAssociations } = await supabase
            .from('academic_year_schools')
            .select('school_id')
            .eq('academic_year_id', editingYear.id);
          
          const associatedSchoolIds = schoolAssociations?.map(s => s.school_id) || [editingYear.school_id];
          
          setFormState({
            school_ids: associatedSchoolIds,
            year_name: editingYear.year_name || '',
            start_date: editingYear.start_date || '',
            end_date: editingYear.end_date || '',
            is_current: editingYear.is_current || false,
            description: editingYear.description || '',
            status: editingYear.status || 'active',
          });
        };
        
        loadAssociatedSchools();
      } else {
        setFormState({
          school_ids: [],
          year_name: '',
          start_date: '',
          end_date: '',
          is_current: false,
          description: '',
          status: 'active'
        });
      }
      setFormErrors({});
    }
  }, [isFormOpen, editingYear]);

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
          is_current,
          description,
          status,
          created_at,
          schools!academic_years_school_id_fkey (
            name
          )
        `)
        .order('start_date', { ascending: false });

      // Apply school filtering
      if (!canAccessAll && scopeFilters.school_ids && scopeFilters.school_ids.length > 0) {
        query = query.in('school_id', scopeFilters.school_ids);
      } else if (!canAccessAll) {
        return [];
      }

      // Apply filters
      if (filters.search) {
        query = query.or(`year_name.ilike.%${filters.search}%`);
      }

      if (filters.school_ids.length > 0) {
        query = query.in('school_id', filters.school_ids);
      }

      if (filters.is_current !== null) {
        query = query.eq('is_current', filters.is_current);
      }

      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
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

  // Create/update mutation
  const yearMutation = useMutation(
    async (data: FormState) => {
      const validatedData = academicYearSchema.parse(data);

      // If setting as current, unset other current years for the same schools
      if (validatedData.is_current) {
        for (const schoolId of validatedData.school_ids) {
          await supabase
            .from('academic_years')
            .update({ is_current: false })
            .eq('school_id', schoolId)
            .neq('id', editingYear?.id || '');
        }
      }

      if (editingYear) {
        // Update existing academic year
        const { error } = await supabase
          .from('academic_years')
          .update({
            year_name: validatedData.year_name,
            start_date: validatedData.start_date,
            end_date: validatedData.end_date,
            is_current: validatedData.is_current,
            description: validatedData.description,
            status: validatedData.status
          })
          .eq('id', editingYear.id);
        
        if (error) throw error;

        // Update junction table entries
        await supabase
          .from('academic_year_schools')
          .delete()
          .eq('academic_year_id', editingYear.id);

        const junctionRecords = validatedData.school_ids.map(schoolId => ({
          academic_year_id: editingYear.id,
          school_id: schoolId
        }));

        const { error: junctionError } = await supabase
          .from('academic_year_schools')
          .insert(junctionRecords);

        if (junctionError) throw junctionError;

        return { ...editingYear, ...validatedData };
      } else {
        // Create new academic year
        const yearRecord = {
          year_name: validatedData.year_name,
          start_date: validatedData.start_date,
          end_date: validatedData.end_date,
          is_current: validatedData.is_current,
          description: validatedData.description,
          status: validatedData.status,
          school_id: validatedData.school_ids[0] // Primary school
        };

        const { data: newYear, error } = await supabase
          .from('academic_years')
          .insert([yearRecord])
          .select()
          .single();

        if (error) throw error;

        // Create junction table entries for all schools
        const junctionRecords = validatedData.school_ids.map(schoolId => ({
          academic_year_id: newYear.id,
          school_id: schoolId
        }));

        const { error: junctionError } = await supabase
          .from('academic_year_schools')
          .insert(junctionRecords);

        if (junctionError) throw junctionError;

        return newYear;
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['academic-years']);
        setIsFormOpen(false);
        setEditingYear(null);
        setFormErrors({});
        toast.success(`Academic year ${editingYear ? 'updated' : 'created'} successfully`);
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
        } else if (error instanceof Error) {
          setFormErrors({ form: error.message });
          toast.error(error.message);
        } else {
          console.error('Error saving academic year:', error);
          setFormErrors({ form: 'Failed to save academic year. Please try again.' });
          toast.error('Failed to save academic year');
        }
      }
    }
  );

  // Delete mutation
  const deleteMutation = useMutation(
    async (years: AcademicYear[]) => {
      const { error } = await supabase
        .from('academic_years')
        .delete()
        .in('id', years.map(y => y.id));

      if (error) throw error;
      return years;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['academic-years']);
        setIsConfirmDialogOpen(false);
        setYearsToDelete([]);
        toast.success('Academic year(s) deleted successfully');
      },
      onError: (error) => {
        console.error('Error deleting academic years:', error);
        toast.error('Failed to delete academic year(s)');
        setIsConfirmDialogOpen(false);
        setYearsToDelete([]);
      }
    }
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    yearMutation.mutate(formState);
  };

  const handleDelete = (years: AcademicYear[]) => {
    setYearsToDelete(years);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(yearsToDelete);
  };

  const cancelDelete = () => {
    setIsConfirmDialogOpen(false);
    setYearsToDelete([]);
  };

  const columns = [
    {
      id: 'year_name',
      header: 'Year Name',
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
      id: 'dates',
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
      id: 'is_current',
      header: 'Current',
      accessorKey: 'is_current',
      enableSorting: true,
      cell: (row: AcademicYear) => (
        row.is_current ? (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Current Year
          </span>
        ) : null
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
            Manage academic years and term schedules
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingYear(null);
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
            is_current: null,
            status: []
          });
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FormField id="search" label="Search">
            <Input
              id="search"
              placeholder="Search by name..."
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

          <FormField id="is_current" label="Current Year">
            <Select
              id="is_current"
              options={[
                { value: '', label: 'All' },
                { value: 'true', label: 'Current Only' },
                { value: 'false', label: 'Non-Current' }
              ]}
              value={filters.is_current === null ? '' : filters.is_current.toString()}
              onChange={(e) => setFilters({ 
                ...filters, 
                is_current: e.target.value === '' ? null : e.target.value === 'true' 
              })}
            />
          </FormField>

          <SearchableMultiSelect
            label="Status"
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'completed', label: 'Completed' }
            ]}
            selectedValues={filters.status}
            onChange={(values) => setFilters({ ...filters, status: values })}
            placeholder="Select status..."
          />
        </div>
      </FilterCard>

      <DataTable
        data={academicYears}
        columns={columns}
        keyField="id"
        caption="List of academic years with their duration and status"
        ariaLabel="Academic years data table"
        loading={isLoading}
        isFetching={isFetching}
        onEdit={(year) => {
          setEditingYear(year);
          setIsFormOpen(true);
        }}
        onDelete={handleDelete}
        emptyMessage="No academic years found"
      />

      <SlideInForm
        key={editingYear?.id || 'new'}
        title={editingYear ? 'Edit Academic Year' : 'Create Academic Year'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingYear(null);
          setFormErrors({});
        }}
        onSave={() => {
          const form = document.querySelector('form');
          if (form) form.requestSubmit();
        }}
        loading={yearMutation.isLoading}
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
              onChange={(values) => {
                setFormState(prev => ({ ...prev, school_ids: values }));
              }}
              placeholder="Select schools..."
            />
          </FormField>

          <FormField
            id="year_name"
            label="Year Name"
            required
            error={formErrors.year_name}
          >
            <Input
              id="year_name"
              name="year_name"
              placeholder="e.g., 2024-2025 Academic Year"
              value={formState.year_name}
              onChange={(e) => setFormState(prev => ({ ...prev, year_name: e.target.value }))}
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
                value={formState.start_date}
                onChange={(e) => setFormState(prev => ({ ...prev, start_date: e.target.value }))}
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
                value={formState.end_date}
                onChange={(e) => setFormState(prev => ({ ...prev, end_date: e.target.value }))}
              />
            </FormField>
          </div>

          <FormField
            id="description"
            label="Description"
            error={formErrors.description}
          >
            <Textarea
              id="description"
              name="description"
              placeholder="Enter academic year description..."
              value={formState.description}
              onChange={(e) => setFormState(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </FormField>

          <FormField
            id="is_current"
            label="Current Academic Year"
            error={formErrors.is_current}
          >
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Set as Current Year
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formState.is_current
                    ? 'This will be set as the current academic year' 
                    : 'This is not the current academic year'}
                </p>
              </div>
              <ToggleSwitch
                checked={formState.is_current}
                onChange={(checked) => {
                  setFormState(prev => ({ ...prev, is_current: checked }));
                }}
                label="Current"
              />
            </div>
          </FormField>

          <FormField
            id="status"
            label="Status"
            required
            error={formErrors.status}
          >
            <Select
              id="status"
              name="status"
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'completed', label: 'Completed' }
              ]}
              value={formState.status}
              onChange={(e) => setFormState(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' | 'completed' }))}
            />
          </FormField>
        </form>
      </SlideInForm>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        title="Delete Academic Year"
        message={`Are you sure you want to delete ${yearsToDelete.length} academic year(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}