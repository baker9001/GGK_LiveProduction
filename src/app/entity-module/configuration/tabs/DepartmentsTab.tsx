/**
 * File: /src/app/entity-module/configuration/tabs/DepartmentsTab.tsx
 * 
 * Departments Management Tab
 * Manages departments table data with school-based organization
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, Users, Phone, Mail } from 'lucide-react';
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

const departmentSchema = z.object({
  school_ids: z.array(z.string().uuid()).min(1, 'Please select at least one school'),
  name: z.string().min(1, 'Department name is required'),
  code: z.string().optional(),
  department_type: z.enum(['academic', 'administrative', 'support', 'other']),
  head_of_department: z.string().optional(),
  contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive'])
});

interface FilterState {
  search: string;
  school_ids: string[];
  department_type: string[];
  status: string[];
}

interface FormState {
  school_ids: string[];
  name: string;
  code: string;
  department_type: 'academic' | 'administrative' | 'support' | 'other';
  head_of_department: string;
  contact_email: string;
  contact_phone: string;
  description: string;
  status: 'active' | 'inactive';
}

type Department = {
  id: string;
  school_ids: string[];
  school_names: string[];
  name: string;
  code: string | null;
  department_type: 'academic' | 'administrative' | 'support' | 'other';
  head_of_department: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  description: string | null;
  status: 'active' | 'inactive';
  created_at: string;
};

interface DepartmentsTabProps {
  companyId: string | null;
}

export function DepartmentsTab({ companyId }: DepartmentsTabProps) {
  const queryClient = useQueryClient();
  const { getScopeFilters, isEntityAdmin, isSubEntityAdmin } = useAccessControl();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    school_ids: [],
    department_type: [],
    status: []
  });

  const [formState, setFormState] = useState<FormState>({
    school_ids: [],
    name: '',
    code: '',
    department_type: 'academic',
    head_of_department: '',
    contact_email: '',
    contact_phone: '',
    description: '',
    status: 'active',
  });

  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [departmentsToDelete, setDepartmentsToDelete] = useState<Department[]>([]);

  // Get scope filters
  const scopeFilters = getScopeFilters('schools');
  const canAccessAll = isEntityAdmin || isSubEntityAdmin;

  // Fetch schools for dropdown
  const { data: schools = [] } = useQuery(
    ['schools-for-departments', companyId, scopeFilters],
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
      if (editingDepartment) {
        setFormState({
          school_ids: editingDepartment.school_ids || [],
          name: editingDepartment.name || '',
          code: editingDepartment.code || '',
          department_type: editingDepartment.department_type || 'academic',
          head_of_department: editingDepartment.head_of_department || '',
          contact_email: editingDepartment.contact_email || '',
          contact_phone: editingDepartment.contact_phone || '',
          description: editingDepartment.description || '',
          status: editingDepartment.status || 'active',
        });
      } else {
        setFormState({
          school_ids: [],
          name: '',
          code: '',
          department_type: 'academic',
          head_of_department: '',
          contact_email: '',
          contact_phone: '',
          description: '',
          status: 'active'
        });
      }
      setFormErrors({});
    }
  }, [isFormOpen, editingDepartment]);

  // Fetch departments
  const { 
    data: departments = [], 
    isLoading, 
    isFetching 
  } = useQuery(
    ['departments', companyId, filters, scopeFilters],
    async () => {
      if (!companyId) return [];

      let query = supabase
        .from('departments')
        .select(`
          id,
          school_id,
          name,
          code,
          department_type,
          head_of_department,
          contact_email,
          contact_phone,
          description,
          status,
          created_at,
          schools!departments_school_id_fkey (
            name
          )
        `)
        .order('name');

      // Apply school filtering
      if (!canAccessAll && scopeFilters.school_ids && scopeFilters.school_ids.length > 0) {
        query = query.in('school_id', scopeFilters.school_ids);
      } else if (!canAccessAll) {
        return [];
      }

      // Apply filters
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%,head_of_department.ilike.%${filters.search}%`);
      }

      if (filters.school_ids.length > 0) {
        query = query.in('school_id', filters.school_ids);
      }

      if (filters.department_type.length > 0) {
        query = query.in('department_type', filters.department_type);
      }

      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(dept => ({
        ...dept,
        school_name: dept.schools?.name || 'Unknown School'
      }));
    },
    {
      enabled: !!companyId,
      keepPreviousData: true,
      staleTime: 2 * 60 * 1000,
    }
  );

  // Create/update mutation
  const departmentMutation = useMutation(
    async (data: FormState) => {
      const validatedData = departmentSchema.parse({
        school_ids: data.school_ids,
        name: data.name,
        code: data.code || undefined,
        department_type: data.department_type,
        head_of_department: data.head_of_department || undefined,
        contact_email: data.contact_email || undefined,
        contact_phone: data.contact_phone || undefined,
        description: data.description || undefined,
        status: data.status
      });

      if (editingDepartment) {
        // Update existing department
        const { error } = await supabase
          .from('departments')
          .update({
            name: validatedData.name,
            code: validatedData.code,
            department_type: validatedData.department_type,
            head_of_department: validatedData.head_of_department,
            contact_email: validatedData.contact_email,
            contact_phone: validatedData.contact_phone,
            description: validatedData.description,
            status: validatedData.status
          })
          .eq('id', editingDepartment.id);
        if (error) throw error;
        return { ...editingDepartment, ...validatedData };
      } else {
        // Create a single department record
        const departmentRecord = {
          name: validatedData.name,
          code: validatedData.code,
          department_type: validatedData.department_type,
          head_of_department: validatedData.head_of_department,
          contact_email: validatedData.contact_email,
          contact_phone: validatedData.contact_phone,
          description: validatedData.description,
          status: validatedData.status
        };

        // Get the first school for the main record (we'll use junction table for others)
        const mainSchoolId = validatedData.school_ids[0];
        const { data: newDepartment, error } = await supabase
          .from('departments')
          .insert([{ ...departmentRecord, school_id: mainSchoolId }])
          .select()
          .single();

        if (error) throw error;

        // Create junction table entries for all schools
        const junctionRecords = validatedData.school_ids.map(schoolId => ({
          department_id: newDepartment.id,
          school_id: schoolId
        }));

        const { error: junctionError } = await supabase
          .from('department_schools')
          .insert(junctionRecords);

        if (junctionError) throw junctionError;
        return newDepartment;
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['departments']);
        setIsFormOpen(false);
        setEditingDepartment(null);
        setFormErrors({});
        toast.success(`Department ${editingDepartment ? 'updated' : 'created'} successfully`);
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
          console.error('Error saving department:', error);
          setFormErrors({ form: 'Failed to save department. Please try again.' });
          toast.error('Failed to save department');
        }
      }
    }
  );

  // Delete mutation
  const deleteMutation = useMutation(
    async (departments: Department[]) => {
      const { error } = await supabase
        .from('departments')
        .delete()
        .in('id', departments.map(d => d.id));

      if (error) throw error;
      return departments;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['departments']);
        setIsConfirmDialogOpen(false);
        setDepartmentsToDelete([]);
        toast.success('Department(s) deleted successfully');
      },
      onError: (error) => {
        console.error('Error deleting departments:', error);
        toast.error('Failed to delete department(s)');
        setIsConfirmDialogOpen(false);
        setDepartmentsToDelete([]);
      }
    }
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    departmentMutation.mutate(formState);
  };

  const handleDelete = (departments: Department[]) => {
    setDepartmentsToDelete(departments);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(departmentsToDelete);
  };

  const cancelDelete = () => {
    setIsConfirmDialogOpen(false);
    setDepartmentsToDelete([]);
  };

  const columns = [
    {
      id: 'name',
      header: 'Department Name',
      accessorKey: 'name',
      enableSorting: true,
    },
    {
      id: 'code',
      header: 'Code',
      accessorKey: 'code',
      enableSorting: true,
      cell: (row: Department) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {row.code || '-'}
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
      id: 'department_type',
      header: 'Type',
      accessorKey: 'department_type',
      enableSorting: true,
      cell: (row: Department) => (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 capitalize">
          {row.department_type}
        </span>
      ),
    },
    {
      id: 'head_of_department',
      header: 'Head of Department',
      accessorKey: 'head_of_department',
      enableSorting: true,
      cell: (row: Department) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {row.head_of_department || '-'}
        </span>
      ),
    },
    {
      id: 'contact',
      header: 'Contact',
      cell: (row: Department) => (
        <div className="text-sm space-y-1">
          {row.contact_email && (
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3 text-gray-400" />
              <span className="text-gray-900 dark:text-gray-100">{row.contact_email}</span>
            </div>
          )}
          {row.contact_phone && (
            <div className="flex items-center gap-1">
              <Phone className="h-3 w-3 text-gray-400" />
              <span className="text-gray-900 dark:text-gray-100">{row.contact_phone}</span>
            </div>
          )}
          {!row.contact_email && !row.contact_phone && '-'}
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: true,
      cell: (row: Department) => (
        <StatusBadge status={row.status} />
      ),
    },
    {
      id: 'created_at',
      header: 'Created At',
      accessorKey: 'created_at',
      enableSorting: true,
      cell: (row: Department) => (
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Departments</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage academic and administrative departments
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingDepartment(null);
            setIsFormOpen(true);
          }}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add Department
        </Button>
      </div>

      <FilterCard
        title="Filters"
        onApply={() => {}}
        onClear={() => {
          setFilters({
            search: '',
            school_ids: [],
            department_type: [],
            status: []
          });
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FormField id="search" label="Search">
            <Input
              id="search"
              placeholder="Search by name, code, or head..."
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
            label="Department Type"
            options={[
              { value: 'academic', label: 'Academic' },
              { value: 'administrative', label: 'Administrative' },
              { value: 'support', label: 'Support' },
              { value: 'other', label: 'Other' }
            ]}
            selectedValues={filters.department_type}
            onChange={(values) => setFilters({ ...filters, department_type: values })}
            placeholder="Select types..."
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
        data={departments}
        columns={columns}
        keyField="id"
        caption="List of departments with their details and contact information"
        ariaLabel="Departments data table"
        loading={isLoading}
        isFetching={isFetching}
        onEdit={(department) => {
          setEditingDepartment(department);
          setIsFormOpen(true);
        }}
        onDelete={handleDelete}
        emptyMessage="No departments found"
      />

      <SlideInForm
        key={editingDepartment?.id || 'new'}
        title={editingDepartment ? 'Edit Department' : 'Create Department'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingDepartment(null);
          setFormErrors({});
        }}
        onSave={() => {
          const form = document.querySelector('form');
          if (form) form.requestSubmit();
        }}
        loading={departmentMutation.isLoading}
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
              isMulti={true}
              isMulti={true}
              placeholder="Select school..."
            />
          </FormField>

          <FormField
            id="name"
            label="Department Name"
            required
            error={formErrors.name}
          >
            <Input
              id="name"
              name="name"
              placeholder="e.g., Mathematics, Human Resources"
              value={formState.name}
              onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
              leftIcon={<Building2 className="h-5 w-5 text-gray-400" />}
            />
          </FormField>

          <FormField
            id="code"
            label="Department Code"
            error={formErrors.code}
          >
            <Input
              id="code"
              name="code"
              placeholder="e.g., MATH, HR"
              value={formState.code}
              onChange={(e) => setFormState(prev => ({ ...prev, code: e.target.value }))}
            />
          </FormField>

          <FormField
            id="department_type"
            label="Department Type"
            required
            error={formErrors.department_type}
          >
            <Select
              id="department_type"
              name="department_type"
              options={[
                { value: 'academic', label: 'Academic' },
                { value: 'administrative', label: 'Administrative' },
                { value: 'support', label: 'Support' },
                { value: 'other', label: 'Other' }
              ]}
              value={formState.department_type}
              onChange={(e) => setFormState(prev => ({ ...prev, department_type: e.target.value as 'academic' | 'administrative' | 'support' | 'other' }))}
            />
          </FormField>

          <FormField
            id="head_of_department"
            label="Head of Department"
            error={formErrors.head_of_department}
          >
            <Input
              id="head_of_department"
              name="head_of_department"
              placeholder="Enter name of department head"
              value={formState.head_of_department}
              onChange={(e) => setFormState(prev => ({ ...prev, head_of_department: e.target.value }))}
              leftIcon={<Users className="h-5 w-5 text-gray-400" />}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              id="contact_email"
              label="Contact Email"
              error={formErrors.contact_email}
            >
              <Input
                id="contact_email"
                name="contact_email"
                type="email"
                placeholder="department@school.edu"
                value={formState.contact_email}
                onChange={(e) => setFormState(prev => ({ ...prev, contact_email: e.target.value }))}
                leftIcon={<Mail className="h-5 w-5 text-gray-400" />}
              />
            </FormField>

            <FormField
              id="contact_phone"
              label="Contact Phone"
              error={formErrors.contact_phone}
            >
              <Input
                id="contact_phone"
                name="contact_phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={formState.contact_phone}
                onChange={(e) => setFormState(prev => ({ ...prev, contact_phone: e.target.value }))}
                leftIcon={<Phone className="h-5 w-5 text-gray-400" />}
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
              placeholder="Enter department description..."
              value={formState.description}
              onChange={(e) => setFormState(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </FormField>

          <FormField
            id="status"
            label="Status"
            required
            error={formErrors.status}
          >
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Department Status
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {formState.status === 'active'
                    ? 'Department is currently active' 
                    : 'Department is currently inactive'}
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
        title="Delete Department"
        message={`Are you sure you want to delete ${departmentsToDelete.length} department(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}