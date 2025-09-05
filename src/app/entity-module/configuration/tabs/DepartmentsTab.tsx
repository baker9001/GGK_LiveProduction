/**
 * File: /src/app/entity-module/configuration/tabs/DepartmentsTab.tsx
 * 
 * Departments Configuration Tab
 * Manages organizational departments with hierarchical structure
 * 
 * FIXED: Removed validateField calls that were causing ReferenceError
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Building2, 
  Users, 
  Mail, 
  Phone, 
  Edit, 
  Trash2,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Clock
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

// Schema validation
const departmentSchema = z.object({
  name: z.string().min(1, 'Department name is required').max(200, 'Name is too long'),
  code: z.string().optional(),
  description: z.string().optional(),
  department_type: z.enum(['academic', 'administrative', 'support', 'operations', 'other']),
  head_name: z.string().optional(),
  head_email: z.string().email('Invalid email format').optional().or(z.literal('')),
  contact_email: z.string().email('Invalid email format').optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  parent_department_id: z.string().uuid().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive'])
});

interface FilterState {
  search: string;
  school_ids: string[];
  branch_ids: string[];
  department_type: string[];
  status: string[];
  parent_department_id: string;
}

interface FormState {
  name: string;
  code: string;
  description: string;
  department_type: 'academic' | 'administrative' | 'support' | 'operations' | 'other';
  head_name: string;
  head_email: string;
  contact_email: string;
  contact_phone: string;
  parent_department_id: string;
  status: 'active' | 'inactive';
  school_ids: string[];
  branch_ids: string[];
}

type Department = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  department_type: string;
  head_name: string | null;
  head_email: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  parent_department_id: string | null;
  parent_department_name?: string;
  status: 'active' | 'inactive';
  company_id: string;
  school_id?: string;
  branch_id?: string;
  created_at: string;
  updated_at: string;
  children_count?: number;
  school_names?: string[];
  branch_names?: string[];
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
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());
  
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    school_ids: [],
    branch_ids: [],
    department_type: [],
    status: [],
    parent_department_id: ''
  });

  const [formState, setFormState] = useState<FormState>({
    name: '',
    code: '',
    description: '',
    department_type: 'academic',
    head_name: '',
    head_email: '',
    contact_email: '',
    contact_phone: '',
    parent_department_id: '',
    status: 'active',
    school_ids: [],
    branch_ids: []
  });

  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [departmentsToDelete, setDepartmentsToDelete] = useState<Department[]>([]);

  // Get scope filters
  const scopeFilters = getScopeFilters('departments');
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

      // Filter branches based on scope
      if (!canAccessAll) {
        const orConditions: string[] = [];
        
        if (scopeFilters.school_ids && scopeFilters.school_ids.length > 0) {
          orConditions.push(`school_id.in.(${scopeFilters.school_ids.join(',')})`);
        }
        
        if (scopeFilters.branch_ids && scopeFilters.branch_ids.length > 0) {
          orConditions.push(`id.in.(${scopeFilters.branch_ids.join(',')})`);
        }
        
        if (orConditions.length > 0) {
          query = query.or(orConditions.join(','));
        }
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
          name: editingDepartment.name || '',
          code: editingDepartment.code || '',
          description: editingDepartment.description || '',
          department_type: editingDepartment.department_type as any || 'academic',
          head_name: editingDepartment.head_name || '',
          head_email: editingDepartment.head_email || '',
          contact_email: editingDepartment.contact_email || '',
          contact_phone: editingDepartment.contact_phone || '',
          parent_department_id: editingDepartment.parent_department_id || '',
          status: editingDepartment.status || 'active',
          school_ids: editingDepartment.school_names ? [] : [], // TODO: Load from junction table
          branch_ids: editingDepartment.branch_names ? [] : []  // TODO: Load from junction table
        });
      } else {
        setFormState({
          name: '',
          code: '',
          description: '',
          department_type: 'academic',
          head_name: '',
          head_email: '',
          contact_email: '',
          contact_phone: '',
          parent_department_id: '',
          status: 'active',
          school_ids: [],
          branch_ids: []
        });
      }
      setFormErrors({});
    }
  }, [isFormOpen, editingDepartment]);

  // Fetch departments with enhanced filtering
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
          name,
          code,
          description,
          department_type,
          head_name,
          head_email,
          contact_email,
          contact_phone,
          parent_department_id,
          status,
          company_id,
          school_id,
          branch_id,
          created_at,
          updated_at,
          parent_department:departments!parent_department_id (
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
        }
      }

      // Apply filters
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

      if (filters.parent_department_id) {
        if (filters.parent_department_id === 'none') {
          query = query.is('parent_department_id', null);
        } else {
          query = query.eq('parent_department_id', filters.parent_department_id);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      // Count children for each department
      const enhancedData = await Promise.all((data || []).map(async (dept) => {
        const { count } = await supabase
          .from('departments')
          .select('id', { count: 'exact', head: true })
          .eq('parent_department_id', dept.id);

        return {
          ...dept,
          parent_department_name: dept.parent_department?.name || null,
          children_count: count || 0
        };
      }));

      return enhancedData;
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
        ...data,
        head_email: data.head_email || undefined,
        contact_email: data.contact_email || undefined,
        parent_department_id: data.parent_department_id || undefined
      });

      const departmentData = {
        name: validatedData.name,
        code: validatedData.code || null,
        description: validatedData.description || null,
        department_type: validatedData.department_type,
        head_name: validatedData.head_name || null,
        head_email: validatedData.head_email || null,
        contact_email: validatedData.contact_email || null,
        contact_phone: validatedData.contact_phone || null,
        parent_department_id: validatedData.parent_department_id || null,
        status: validatedData.status,
        company_id: companyId
      };

      if (editingDepartment) {
        const { error } = await supabase
          .from('departments')
          .update(departmentData)
          .eq('id', editingDepartment.id);
        
        if (error) throw error;
        return { ...editingDepartment, ...departmentData };
      } else {
        const { data: newDepartment, error } = await supabase
          .from('departments')
          .insert([departmentData])
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
        setSelectedRows([]);
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
        } else if (error instanceof Error) {
          setFormErrors({ form: error.message });
          toast.error(error.message);
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
      onSuccess: (deletedDepartments) => {
        queryClient.invalidateQueries(['departments']);
        setIsConfirmDialogOpen(false);
        setDepartmentsToDelete([]);
        setSelectedRows([]);
        toast.success(`${deletedDepartments.length} department(s) deleted successfully`);
      },
      onError: (error) => {
        console.error('Error deleting departments:', error);
        toast.error('Failed to delete department(s). They may have child departments or associated data.');
        setIsConfirmDialogOpen(false);
        setDepartmentsToDelete([]);
      }
    }
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Clear previous errors
    setFormErrors({});
    
    // Basic validation
    if (!formState.name.trim()) {
      setFormErrors({ name: 'Department name is required' });
      return;
    }
    
    // Email validation
    if (formState.head_email && !z.string().email().safeParse(formState.head_email).success) {
      setFormErrors({ head_email: 'Invalid email format' });
      return;
    }
    
    if (formState.contact_email && !z.string().email().safeParse(formState.contact_email).success) {
      setFormErrors({ contact_email: 'Invalid email format' });
      return;
    }
    
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

  // FIXED: Removed validateField calls from updateFormData
  const updateFormData = (field: keyof FormState, value: any) => {
    setFormState(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      const newErrors = { ...formErrors };
      delete newErrors[field];
      setFormErrors(newErrors);
    }
  };

  // Calculate department statistics
  const statistics = useMemo(() => {
    const totalDepartments = departments.length;
    const activeDepartments = departments.filter(d => d.status === 'active').length;
    const departmentsByType = departments.reduce((acc, dept) => {
      acc[dept.department_type] = (acc[dept.department_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      total: totalDepartments,
      active: activeDepartments,
      inactive: totalDepartments - activeDepartments,
      byType: departmentsByType
    };
  }, [departments]);

  // Build hierarchical structure
  const hierarchicalDepartments = useMemo(() => {
    const departmentMap = new Map(departments.map(d => [d.id, d]));
    const rootDepartments: Department[] = [];
    const childrenMap = new Map<string, Department[]>();

    departments.forEach(dept => {
      if (!dept.parent_department_id) {
        rootDepartments.push(dept);
      } else {
        if (!childrenMap.has(dept.parent_department_id)) {
          childrenMap.set(dept.parent_department_id, []);
        }
        childrenMap.get(dept.parent_department_id)!.push(dept);
      }
    });

    return { rootDepartments, childrenMap };
  }, [departments]);

  // Toggle department expansion
  const toggleDepartment = (departmentId: string) => {
    setExpandedDepartments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(departmentId)) {
        newSet.delete(departmentId);
      } else {
        newSet.add(departmentId);
      }
      return newSet;
    });
  };

  // Enhanced table columns
  const columns = [
    {
      id: 'name',
      header: 'Department',
      accessorKey: 'name',
      enableSorting: true,
      cell: (row: Department) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-gray-400" />
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {row.name}
            </div>
            {row.code && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Code: {row.code}
              </div>
            )}
            {row.parent_department_name && (
              <div className="text-xs text-gray-400 dark:text-gray-500">
                Parent: {row.parent_department_name}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      accessorKey: 'department_type',
      enableSorting: true,
      cell: (row: Department) => (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
          {row.department_type.charAt(0).toUpperCase() + row.department_type.slice(1)}
        </span>
      ),
    },
    {
      id: 'head',
      header: 'Department Head',
      enableSorting: true,
      cell: (row: Department) => (
        <div className="text-sm">
          {row.head_name ? (
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {row.head_name}
              </div>
              {row.head_email && (
                <div className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {row.head_email}
                </div>
              )}
            </div>
          ) : (
            <span className="text-gray-500 dark:text-gray-400 italic">
              No head assigned
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'contact',
      header: 'Contact',
      enableSorting: false,
      cell: (row: Department) => (
        <div className="text-sm space-y-1">
          {row.contact_email && (
            <div className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {row.contact_email}
            </div>
          )}
          {row.contact_phone && (
            <div className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {row.contact_phone}
            </div>
          )}
          {!row.contact_email && !row.contact_phone && (
            <span className="text-gray-400 dark:text-gray-500 italic">
              No contact info
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'hierarchy',
      header: 'Hierarchy',
      enableSorting: false,
      cell: (row: Department) => (
        <div className="text-sm">
          {row.children_count ? (
            <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
              <Users className="h-3 w-3" />
              {row.children_count} sub-department{row.children_count > 1 ? 's' : ''}
            </div>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">
              No sub-departments
            </span>
          )}
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
  ];

  return (
    <div className="space-y-6">
      {/* Header with statistics */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Departments</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage organizational departments and their hierarchical structure
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Total:</span>
              <span className="font-medium text-gray-900 dark:text-white">{statistics.total}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Active:</span>
              <span className="font-medium text-green-600 dark:text-green-400">{statistics.active}</span>
            </div>
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
      </div>

      {/* Enhanced Filters */}
      <FilterCard
        title="Filters"
        onApply={() => {}}
        onClear={() => {
          setFilters({
            search: '',
            school_ids: [],
            branch_ids: [],
            department_type: [],
            status: [],
            parent_department_id: ''
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
              className="focus:ring-[#8CC63F] focus:border-[#8CC63F]"
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
            className="green-theme"
          />

          <SearchableMultiSelect
            label="Department Type"
            options={[
              { value: 'academic', label: 'Academic' },
              { value: 'administrative', label: 'Administrative' },
              { value: 'support', label: 'Support' },
              { value: 'operations', label: 'Operations' },
              { value: 'other', label: 'Other' }
            ]}
            selectedValues={filters.department_type}
            onChange={(values) => setFilters({ ...filters, department_type: values })}
            placeholder="Select types..."
            className="green-theme"
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
            className="green-theme"
          />
        </div>
      </FilterCard>

      {/* Data Table */}
      <DataTable
        data={departments}
        columns={columns}
        keyField="id"
        caption="List of departments with their hierarchy, contacts, and status"
        ariaLabel="Departments data table"
        loading={isLoading}
        isFetching={isFetching}
        onEdit={(department) => {
          setEditingDepartment(department);
          setIsFormOpen(true);
        }}
        onDelete={handleDelete}
        emptyMessage="No departments found. Create your first department to get started."
        onSelectionChange={setSelectedRows}
      />

      {/* Enhanced Form Slide-In */}
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
        loading={departmentMutation.isPending}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.form && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{formErrors.form}</span>
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
              value={formState.name}
              onChange={(e) => updateFormData('name', e.target.value)}
              placeholder="Enter department name"
              leftIcon={<Building2 className="h-5 w-5 text-gray-400" />}
              className="focus:ring-[#8CC63F] focus:border-[#8CC63F]"
            />
          </FormField>

          <FormField
            id="code"
            label="Department Code"
            error={formErrors.code}
          >
            <Input
              id="code"
              value={formState.code}
              onChange={(e) => updateFormData('code', e.target.value)}
              placeholder="e.g., DEPT-001"
              className="focus:ring-[#8CC63F] focus:border-[#8CC63F]"
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
              options={[
                { value: 'academic', label: 'Academic' },
                { value: 'administrative', label: 'Administrative' },
                { value: 'support', label: 'Support' },
                { value: 'operations', label: 'Operations' },
                { value: 'other', label: 'Other' }
              ]}
              value={formState.department_type}
              onChange={(value) => updateFormData('department_type', value)}
            />
          </FormField>

          <FormField
            id="parent_department_id"
            label="Parent Department"
            error={formErrors.parent_department_id}
          >
            <SearchableMultiSelect
              label=""
              options={[
                { value: '', label: 'No parent (root department)' },
                ...departments
                  .filter(d => d.id !== editingDepartment?.id) // Prevent self-reference
                  .map(d => ({
                    value: d.id,
                    label: d.name
                  }))
              ]}
              selectedValues={formState.parent_department_id ? [formState.parent_department_id] : []}
              onChange={(values) => updateFormData('parent_department_id', values[0] || '')}
              isMulti={false}
              placeholder="Select parent department..."
              className="green-theme"
            />
          </FormField>

          <FormField
            id="description"
            label="Description"
            error={formErrors.description}
          >
            <Textarea
              id="description"
              value={formState.description}
              onChange={(e) => updateFormData('description', e.target.value)}
              placeholder="Enter department description"
              rows={3}
              className="focus:ring-[#8CC63F] focus:border-[#8CC63F]"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              id="head_name"
              label="Department Head Name"
              error={formErrors.head_name}
            >
              <Input
                id="head_name"
                value={formState.head_name}
                onChange={(e) => updateFormData('head_name', e.target.value)}
                placeholder="Enter head name"
                leftIcon={<Users className="h-5 w-5 text-gray-400" />}
                className="focus:ring-[#8CC63F] focus:border-[#8CC63F]"
              />
            </FormField>

            <FormField
              id="head_email"
              label="Department Head Email"
              error={formErrors.head_email}
            >
              <Input
                id="head_email"
                type="email"
                value={formState.head_email}
                onChange={(e) => updateFormData('head_email', e.target.value)}
                placeholder="head@department.com"
                leftIcon={<Mail className="h-5 w-5 text-gray-400" />}
                className="focus:ring-[#8CC63F] focus:border-[#8CC63F]"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              id="contact_email"
              label="Contact Email"
              error={formErrors.contact_email}
            >
              <Input
                id="contact_email"
                type="email"
                value={formState.contact_email}
                onChange={(e) => updateFormData('contact_email', e.target.value)}
                placeholder="contact@department.com"
                leftIcon={<Mail className="h-5 w-5 text-gray-400" />}
                className="focus:ring-[#8CC63F] focus:border-[#8CC63F]"
              />
            </FormField>

            <FormField
              id="contact_phone"
              label="Contact Phone"
              error={formErrors.contact_phone}
            >
              <Input
                id="contact_phone"
                type="tel"
                value={formState.contact_phone}
                onChange={(e) => updateFormData('contact_phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
                leftIcon={<Phone className="h-5 w-5 text-gray-400" />}
                className="focus:ring-[#8CC63F] focus:border-[#8CC63F]"
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
                onChange={(checked) => updateFormData('status', checked ? 'active' : 'inactive')}
              />
            </div>
          </FormField>
        </form>
      </SlideInForm>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        title="Delete Department"
        message={`Are you sure you want to delete ${departmentsToDelete.length} department(s)? This action cannot be undone and may affect sub-departments and associated data.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}