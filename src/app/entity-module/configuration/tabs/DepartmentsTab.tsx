/**
 * File: /src/app/entity-module/configuration/tabs/DepartmentsTab.tsx
 * 
 * Departments Management Tab
 * Manages entity_departments table data with hierarchical organization
 */

'use client';

import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, Hash, User, Mail, Users } from 'lucide-react';
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
  company_id: z.string().uuid('Company ID is required'),
  school_id: z.string().uuid().optional(),
  branch_id: z.string().uuid().optional(),
  name: z.string().min(1, 'Department name is required'),
  code: z.string().min(1, 'Department code is required'),
  department_type: z.enum(['academic', 'administrative', 'support', 'operations']).optional(),
  parent_department_id: z.string().uuid().optional(),
  head_of_department: z.string().optional(),
  head_email: z.string().email().optional(),
  employee_count: z.number().min(0).optional(),
  status: z.enum(['active', 'inactive'])
});

interface FilterState {
  search: string;
  school_ids: string[];
  branch_ids: string[];
  department_type: string[];
  status: string[];
}

type Department = {
  id: string;
  company_id: string;
  school_id: string | null;
  branch_id: string | null;
  name: string;
  code: string;
  department_type: string | null;
  parent_department_id: string | null;
  head_of_department: string | null;
  head_email: string | null;
  employee_count: number | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  school_name?: string;
  branch_name?: string;
  parent_department_name?: string;
};

interface DepartmentsTabProps {
  companyId: string | null;
}

export default function DepartmentsTab({ companyId }: DepartmentsTabProps) {
  const queryClient = useQueryClient();
  const { getScopeFilters, isEntityAdmin, isSubEntityAdmin } = useAccessControl();
  
  // Refs for hidden inputs
  const schoolIdRef = useRef<HTMLInputElement>(null);
  const branchIdRef = useRef<HTMLInputElement>(null);
  const parentDepartmentIdRef = useRef<HTMLInputElement>(null);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    school_ids: [],
    branch_ids: [],
    department_type: [],
    status: []
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

  // Fetch branches for dropdown
  const { data: branches = [] } = useQuery(
    ['branches-for-departments', companyId, scopeFilters],
    async () => {
      if (!companyId) return [];

      let query = supabase
        .from('branches')
        .select('id, name, school_id, status')
        .eq('status', 'active')
        .order('name');

      if (!canAccessAll && scopeFilters.branch_ids && scopeFilters.branch_ids.length > 0) {
        query = query.in('id', scopeFilters.branch_ids);
      } else if (!canAccessAll && scopeFilters.school_ids && scopeFilters.school_ids.length > 0) {
        query = query.in('school_id', scopeFilters.school_ids);
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
        .from('entity_departments')
        .select(`
          *,
          schools!entity_departments_school_id_fkey (
            name
          ),
          branches!entity_departments_branch_id_fkey (
            name
          ),
          parent_department:entity_departments (
            name
          )
        `)
        .eq('company_id', companyId)
        .order('name');

      // Apply scope filtering
      if (!canAccessAll) {
        const orConditions: string[] = [];
        
        if (scopeFilters.school_ids && scopeFilters.school_ids.length > 0) {
          orConditions.push(`school_id.in.(${scopeFilters.school_ids.join(',')})`);
        }
        
        if (scopeFilters.branch_ids && scopeFilters.branch_ids.length > 0) {
          orConditions.push(`branch_id.in.(${scopeFilters.branch_ids.join(',')})`);
        }
        
        if (orConditions.length > 0) {
          query = query.or(orConditions.join(','));
        } else {
          return [];
        }
      }

      // Apply additional filters
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
      }

      if (filters.school_ids.length > 0) {
        query = query.in('school_id', filters.school_ids);
      }

      if (filters.branch_ids.length > 0) {
        query = query.in('branch_id', filters.branch_ids);
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
        school_name: dept.schools?.name || null,
        branch_name: dept.branches?.name || null,
        parent_department_name: dept.parent_department?.name || null
      }));
    },
    {
      enabled: !!companyId,
      keepPreviousData: true,
      staleTime: 2 * 60 * 1000,
    }
  );

  // Create/update department mutation
  const departmentMutation = useMutation(
    async (formData: FormData) => {
      const data = {
        company_id: companyId!,
        school_id: formData.get('school_id') as string || undefined,
        branch_id: formData.get('branch_id') as string || undefined,
        name: formData.get('name') as string,
        code: formData.get('code') as string,
        department_type: formData.get('department_type') as string || undefined,
        parent_department_id: formData.get('parent_department_id') as string || undefined,
        head_of_department: formData.get('head_of_department') as string || undefined,
        head_email: formData.get('head_email') as string || undefined,
        employee_count: parseInt(formData.get('employee_count') as string) || undefined,
        status: formData.get('status') as 'active' | 'inactive'
      };

      const validatedData = departmentSchema.parse(data);

      if (editingDepartment) {
        const { error } = await supabase
          .from('entity_departments')
          .update(validatedData)
          .eq('id', editingDepartment.id);

        if (error) throw error;
        return { ...editingDepartment, ...validatedData };
      } else {
        const { data: newDepartment, error } = await supabase
          .from('entity_departments')
          .insert([validatedData])
          .select()
          .single();

        if (error) throw error;
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

  // Delete departments mutation
  const deleteMutation = useMutation(
    async (departments: Department[]) => {
      const { error } = await supabase
        .from('entity_departments')
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
    departmentMutation.mutate(new FormData(e.currentTarget));
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
        <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
          {row.code}
        </span>
      ),
    },
    {
      id: 'department_type',
      header: 'Type',
      accessorKey: 'department_type',
      enableSorting: true,
      cell: (row: Department) => (
        <span className="text-sm text-gray-900 dark:text-gray-100 capitalize">
          {row.department_type || '-'}
        </span>
      ),
    },
    {
      id: 'location',
      header: 'Location',
      enableSorting: false,
      cell: (row: Department) => (
        <div className="text-sm">
          {row.school_name && (
            <div className="font-medium text-gray-900 dark:text-white">
              {row.school_name}
            </div>
          )}
          {row.branch_name && (
            <div className="text-gray-500 dark:text-gray-400">
              {row.branch_name}
            </div>
          )}
          {!row.school_name && !row.branch_name && (
            <span className="text-gray-400 dark:text-gray-500">Company Level</span>
          )}
        </div>
      ),
    },
    {
      id: 'head_of_department',
      header: 'Department Head',
      accessorKey: 'head_of_department',
      enableSorting: true,
      cell: (row: Department) => (
        <div className="text-sm">
          {row.head_of_department ? (
            <>
              <div className="font-medium text-gray-900 dark:text-white">
                {row.head_of_department}
              </div>
              {row.head_email && (
                <div className="text-gray-500 dark:text-gray-400">
                  {row.head_email}
                </div>
              )}
            </>
          ) : (
            <span className="text-gray-400 dark:text-gray-500">Not assigned</span>
          )}
        </div>
      ),
    },
    {
      id: 'employee_count',
      header: 'Employees',
      accessorKey: 'employee_count',
      enableSorting: true,
      cell: (row: Department) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {row.employee_count || 0}
        </span>
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
            Manage organizational departments and their hierarchical structure
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
            branch_ids: [],
            department_type: [],
            status: []
          });
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            label="Branch"
            options={branches.map(b => ({
              value: b.id,
              label: b.name
            }))}
            selectedValues={filters.branch_ids}
            onChange={(values) => setFilters({ ...filters, branch_ids: values })}
            placeholder="Select branches..."
          />

          <SearchableMultiSelect
            label="Department Type"
            options={[
              { value: 'academic', label: 'Academic' },
              { value: 'administrative', label: 'Administrative' },
              { value: 'support', label: 'Support' },
              { value: 'operations', label: 'Operations' }
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
        caption="List of departments with their organizational structure"
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
            id="name"
            label="Department Name"
            required
            error={formErrors.name}
          >
            <Input
              id="name"
              name="name"
              placeholder="Enter department name"
              defaultValue={editingDepartment?.name}
              leftIcon={<Building2 className="h-5 w-5 text-gray-400" />}
            />
          </FormField>

          <FormField
            id="code"
            label="Department Code"
            required
            error={formErrors.code}
          >
            <Input
              id="code"
              name="code"
              placeholder="e.g., MATH, SCI, ADMIN"
              defaultValue={editingDepartment?.code}
              leftIcon={<Hash className="h-5 w-5 text-gray-400" />}
            />
          </FormField>

          <FormField
            id="department_type"
            label="Department Type"
            error={formErrors.department_type}
          >
            <Select
              id="department_type"
              name="department_type"
              options={[
                { value: '', label: 'Select type' },
                { value: 'academic', label: 'Academic' },
                { value: 'administrative', label: 'Administrative' },
                { value: 'support', label: 'Support' },
                { value: 'operations', label: 'Operations' }
              ]}
              defaultValue={editingDepartment?.department_type || ''}
            />
          </FormField>

          <FormField
            id="school_id"
            label="School (Optional)"
            error={formErrors.school_id}
          >
            <input
              type="hidden"
              ref={schoolIdRef}
              name="school_id"
              defaultValue={editingDepartment?.school_id || ''}
            />
            <SearchableMultiSelect
              label=""
              options={[
                { value: '', label: 'Select school (optional)...' },
                ...schools.map(school => ({
                  value: school.id,
                  label: school.name
                }))
              ]}
              selectedValues={editingDepartment?.school_id ? [editingDepartment.school_id] : []}
              onChange={(values) => {
                if (schoolIdRef.current) {
                  schoolIdRef.current.value = values[0] || '';
                }
              }}
              isMulti={false}
              placeholder="Select school (optional)..."
            />
          </FormField>

          <FormField
            id="branch_id"
            label="Branch (Optional)"
            error={formErrors.branch_id}
          >
            <input
              type="hidden"
              ref={branchIdRef}
              name="branch_id"
              defaultValue={editingDepartment?.branch_id || ''}
            />
            <SearchableMultiSelect
              label=""
              options={[
                { value: '', label: 'Select branch (optional)...' },
                ...branches.map(branch => ({
                  value: branch.id,
                  label: branch.name
                }))
              ]}
              selectedValues={editingDepartment?.branch_id ? [editingDepartment.branch_id] : []}
              onChange={(values) => {
                if (branchIdRef.current) {
                  branchIdRef.current.value = values[0] || '';
                }
              }}
              isMulti={false}
              placeholder="Select branch (optional)..."
            />
          </FormField>

          <FormField
            id="parent_department_id"
            label="Parent Department"
            error={formErrors.parent_department_id}
          >
            <input
              type="hidden"
              ref={parentDepartmentIdRef}
              name="parent_department_id"
              defaultValue={editingDepartment?.parent_department_id || ''}
            />
            <SearchableMultiSelect
              label=""
              options={[
                { value: '', label: 'Select parent department (optional)...' },
                ...departments
                  .filter(d => d.id !== editingDepartment?.id)
                  .map(dept => ({
                    value: dept.id,
                    label: dept.name
                  }))
              ]}
              selectedValues={editingDepartment?.parent_department_id ? [editingDepartment.parent_department_id] : []}
              onChange={(values) => {
                if (parentDepartmentIdRef.current) {
                  parentDepartmentIdRef.current.value = values[0] || '';
                }
              }}
              isMulti={false}
              placeholder="Select parent department (optional)..."
            />
          </FormField>

          <FormField
            id="head_of_department"
            label="Department Head"
            error={formErrors.head_of_department}
          >
            <Input
              id="head_of_department"
              name="head_of_department"
              placeholder="Enter department head name"
              defaultValue={editingDepartment?.head_of_department || ''}
              leftIcon={<User className="h-5 w-5 text-gray-400" />}
            />
          </FormField>

          <FormField
            id="head_email"
            label="Head Email"
            error={formErrors.head_email}
          >
            <Input
              id="head_email"
              name="head_email"
              type="email"
              placeholder="head@school.com"
              defaultValue={editingDepartment?.head_email || ''}
              leftIcon={<Mail className="h-5 w-5 text-gray-400" />}
            />
          </FormField>

          <FormField
            id="employee_count"
            label="Employee Count"
            error={formErrors.employee_count}
          >
            <Input
              id="employee_count"
              name="employee_count"
              type="number"
              min="0"
              placeholder="0"
              defaultValue={editingDepartment?.employee_count}
              leftIcon={<Users className="h-5 w-5 text-gray-400" />}
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
                  {editingDepartment?.status === 'active' || !editingDepartment
                    ? 'Department is currently active' 
                    : 'Department is currently inactive'}
                </p>
              </div>
              <input
                type="hidden"
                name="status"
                defaultValue={editingDepartment?.status || 'active'}
              />
              <ToggleSwitch
                checked={editingDepartment?.status === 'active' || !editingDepartment}
                onChange={(checked) => {
                  const input = document.querySelector('input[name="status"]') as HTMLInputElement;
                  if (input) input.value = checked ? 'active' : 'inactive';
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