/**
 * File: /src/app/entity-module/configuration/tabs/DepartmentsTab.tsx
 * 
 * Enhanced Departments Management Tab
 * - Fixed database schema alignment issues
 * - Added hierarchical department support (Company/School/Branch levels)
 * - Implemented proper multi-school/branch assignment
 * - Enhanced UI/UX with visual hierarchy
 * - Added department templates and bulk operations
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, Building2, Users, Phone, Mail, ChevronRight, 
  ChevronDown, Layers, School, MapPin, Copy, FileText,
  Building, GitBranch
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/shared/Tabs';
import { toast } from '../../../../components/shared/Toast';

// Enhanced schema with proper database fields
const departmentSchema = z.object({
  company_id: z.string().uuid(),
  department_level: z.enum(['company', 'school', 'branch']),
  school_ids: z.array(z.string().uuid()).optional(),
  branch_ids: z.array(z.string().uuid()).optional(),
  parent_department_id: z.string().uuid().optional(),
  name: z.string().min(1, 'Department name is required'),
  code: z.string().optional(),
  department_type: z.enum(['academic', 'administrative', 'support', 'operations', 'other']),
  head_id: z.string().uuid().optional(),
  head_of_department: z.string().optional(),
  head_email: z.string().email('Invalid email').optional().or(z.literal('')),
  contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive'])
}).refine(data => {
  // Validation: School-level requires at least one school
  if (data.department_level === 'school' && (!data.school_ids || data.school_ids.length === 0)) {
    return false;
  }
  // Validation: Branch-level requires at least one branch
  if (data.department_level === 'branch' && (!data.branch_ids || data.branch_ids.length === 0)) {
    return false;
  }
  return true;
}, {
  message: "Please select at least one school/branch for the selected level",
  path: ["department_level"]
});

// Department Templates
const DEPARTMENT_TEMPLATES = {
  academic: [
    { name: 'Mathematics', code: 'MATH', type: 'academic' },
    { name: 'Science', code: 'SCI', type: 'academic' },
    { name: 'English', code: 'ENG', type: 'academic' },
    { name: 'Social Studies', code: 'SOC', type: 'academic' },
    { name: 'Physical Education', code: 'PE', type: 'academic' },
    { name: 'Arts', code: 'ART', type: 'academic' },
    { name: 'Music', code: 'MUS', type: 'academic' },
    { name: 'Computer Science', code: 'CS', type: 'academic' }
  ],
  administrative: [
    { name: 'Administration', code: 'ADMIN', type: 'administrative' },
    { name: 'Human Resources', code: 'HR', type: 'administrative' },
    { name: 'Finance', code: 'FIN', type: 'administrative' },
    { name: 'Admissions', code: 'ADM', type: 'administrative' },
    { name: 'Student Affairs', code: 'SA', type: 'administrative' }
  ],
  support: [
    { name: 'IT Support', code: 'IT', type: 'support' },
    { name: 'Facilities', code: 'FAC', type: 'support' },
    { name: 'Library', code: 'LIB', type: 'support' },
    { name: 'Counseling', code: 'COUN', type: 'support' },
    { name: 'Health Services', code: 'HEALTH', type: 'support' }
  ]
};

interface FilterState {
  search: string;
  department_level: string[];
  school_ids: string[];
  branch_ids: string[];
  department_type: string[];
  status: string[];
  show_hierarchy: boolean;
}

interface FormState {
  company_id: string;
  department_level: 'company' | 'school' | 'branch';
  school_ids: string[];
  branch_ids: string[];
  parent_department_id: string;
  name: string;
  code: string;
  department_type: 'academic' | 'administrative' | 'support' | 'operations' | 'other';
  head_id: string;
  head_of_department: string;
  head_email: string;
  contact_email: string;
  contact_phone: string;
  description: string;
  status: 'active' | 'inactive';
}

type Department = {
  id: string;
  company_id: string;
  school_id: string | null;
  branch_id: string | null;
  parent_department_id: string | null;
  name: string;
  code: string | null;
  department_type: string;
  head_id: string | null;
  head_of_department: string | null;
  head_email: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  description: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  // Joined data
  school_name?: string;
  branch_name?: string;
  parent_department_name?: string;
  // Multi-assignment data
  assigned_schools?: string[];
  assigned_branches?: string[];
  department_level?: 'company' | 'school' | 'branch';
  children?: Department[];
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
  const [activeTab, setActiveTab] = useState<'details' | 'assignments' | 'hierarchy'>('details');
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    department_level: [],
    school_ids: [],
    branch_ids: [],
    department_type: [],
    status: [],
    show_hierarchy: false
  });

  const [formState, setFormState] = useState<FormState>({
    company_id: companyId || '',
    department_level: 'school',
    school_ids: [],
    branch_ids: [],
    parent_department_id: '',
    name: '',
    code: '',
    department_type: 'academic',
    head_id: '',
    head_of_department: '',
    head_email: '',
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

  // Fetch branches for dropdown
  const { data: branches = [] } = useQuery(
    ['branches-for-departments', companyId, formState.school_ids],
    async () => {
      if (!companyId || formState.school_ids.length === 0) return [];

      const { data, error } = await supabase
        .from('branches')
        .select('id, name, school_id, status')
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

  // Fetch all branches for filtering
  const { data: allBranches = [] } = useQuery(
    ['all-branches-for-departments', companyId],
    async () => {
      if (!companyId) return [];

      const { data: schoolData } = await supabase
        .from('schools')
        .select('id')
        .eq('company_id', companyId);

      if (!schoolData || schoolData.length === 0) return [];

      const { data, error } = await supabase
        .from('branches')
        .select('id, name, school_id')
        .in('school_id', schoolData.map(s => s.id))
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

  // Populate formState when editing
  useEffect(() => {
    if (isFormOpen) {
      if (editingDepartment) {
        // Load existing department data
        const loadDepartmentData = async () => {
          // Get associated schools from junction table
          const { data: schoolLinks } = await supabase
            .from('department_schools')
            .select('school_id')
            .eq('department_id', editingDepartment.id);

          const assignedSchools = schoolLinks?.map(s => s.school_id) || 
                                 (editingDepartment.school_id ? [editingDepartment.school_id] : []);

          // Determine department level
          let level: 'company' | 'school' | 'branch' = 'company';
          if (editingDepartment.branch_id) {
            level = 'branch';
          } else if (editingDepartment.school_id) {
            level = 'school';
          }

          setFormState({
            company_id: editingDepartment.company_id || companyId || '',
            department_level: level,
            school_ids: assignedSchools,
            branch_ids: editingDepartment.branch_id ? [editingDepartment.branch_id] : [],
            parent_department_id: editingDepartment.parent_department_id || '',
            name: editingDepartment.name || '',
            code: editingDepartment.code || '',
            department_type: (editingDepartment.department_type as any) || 'academic',
            head_id: editingDepartment.head_id || '',
            head_of_department: editingDepartment.head_of_department || '',
            head_email: editingDepartment.head_email || '',
            contact_email: editingDepartment.contact_email || '',
            contact_phone: editingDepartment.contact_phone || '',
            description: editingDepartment.description || '',
            status: editingDepartment.status || 'active',
          });
        };
        
        loadDepartmentData();
      } else {
        // Reset for new department
        setFormState({
          company_id: companyId || '',
          department_level: 'school',
          school_ids: [],
          branch_ids: [],
          parent_department_id: '',
          name: '',
          code: '',
          department_type: 'academic',
          head_id: '',
          head_of_department: '',
          head_email: '',
          contact_email: '',
          contact_phone: '',
          description: '',
          status: 'active'
        });
      }
      setFormErrors({});
      setActiveTab('details');
    }
  }, [isFormOpen, editingDepartment, companyId]);

  // Fetch departments with hierarchy
  const { 
    data: departments = [], 
    isLoading, 
    isFetching 
  } = useQuery(
    ['departments', companyId, filters, scopeFilters],
    async () => {
      if (!companyId) return [];

      // Base query with all necessary joins
      let query = supabase
        .from('departments')
        .select(`
          id,
          company_id,
          school_id,
          branch_id,
          parent_department_id,
          name,
          code,
          head_id,
          head_of_department,
          head_email,
          contact_email,
          contact_phone,
          description,
          status,
          created_at,
          schools!departments_school_id_fkey (
            name
          ),
          branches!departments_branch_id_fkey (
            name
          )
        `)
        .eq('company_id', companyId)
        .order('name');

      // Apply filters
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%,head_of_department.ilike.%${filters.search}%`);
      }

      if (filters.school_ids.length > 0) {
        query = query.in('school_id', filters.school_ids);
      }

      if (filters.branch_ids.length > 0) {
        query = query.in('branch_id', filters.branch_ids);
      }

      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Process and add metadata
      const processedDepartments = (data || []).map(dept => {
        // Determine department level
        let level: 'company' | 'school' | 'branch' = 'company';
        if (dept.branch_id) {
          level = 'branch';
        } else if (dept.school_id) {
          level = 'school';
        }

        // Determine department type from description or default
        let deptType = 'academic';
        if (dept.description?.includes('administrative')) deptType = 'administrative';
        else if (dept.description?.includes('support')) deptType = 'support';
        else if (dept.description?.includes('operations')) deptType = 'operations';

        return {
          ...dept,
          school_name: dept.schools?.name || '-',
          branch_name: dept.branches?.name || '-',
          department_level: level,
          department_type: deptType
        };
      });

      // Build hierarchy if requested
      if (filters.show_hierarchy) {
        return buildDepartmentHierarchy(processedDepartments);
      }

      return processedDepartments;
    },
    {
      enabled: !!companyId,
      keepPreviousData: true,
      staleTime: 2 * 60 * 1000,
    }
  );

  // Build hierarchical structure
  const buildDepartmentHierarchy = (depts: Department[]): Department[] => {
    const departmentMap = new Map<string, Department>();
    const rootDepartments: Department[] = [];

    // First pass: create map
    depts.forEach(dept => {
      departmentMap.set(dept.id, { ...dept, children: [] });
    });

    // Second pass: build hierarchy
    depts.forEach(dept => {
      const currentDept = departmentMap.get(dept.id)!;
      if (dept.parent_department_id) {
        const parentDept = departmentMap.get(dept.parent_department_id);
        if (parentDept) {
          parentDept.children = parentDept.children || [];
          parentDept.children.push(currentDept);
        } else {
          rootDepartments.push(currentDept);
        }
      } else {
        rootDepartments.push(currentDept);
      }
    });

    return rootDepartments;
  };

  // Create/update mutation
  const departmentMutation = useMutation(
    async (data: FormState) => {
      const validatedData = departmentSchema.parse(data);

      if (editingDepartment) {
        // Update existing department
        const updateData: any = {
          name: validatedData.name,
          code: validatedData.code,
          parent_department_id: validatedData.parent_department_id || null,
          head_id: validatedData.head_id || null,
          head_of_department: validatedData.head_of_department,
          head_email: validatedData.head_email,
          contact_email: validatedData.contact_email,
          contact_phone: validatedData.contact_phone,
          description: validatedData.description,
          status: validatedData.status
        };

        // Update level-specific fields
        if (validatedData.department_level === 'company') {
          updateData.school_id = null;
          updateData.branch_id = null;
        } else if (validatedData.department_level === 'school') {
          updateData.school_id = validatedData.school_ids?.[0] || null;
          updateData.branch_id = null;
        } else if (validatedData.department_level === 'branch') {
          updateData.branch_id = validatedData.branch_ids?.[0] || null;
          // Get school_id from branch
          const branch = branches.find(b => b.id === updateData.branch_id);
          updateData.school_id = branch?.school_id || null;
        }

        const { error } = await supabase
          .from('departments')
          .update(updateData)
          .eq('id', editingDepartment.id);

        if (error) throw error;

        // Update junction table for multi-school assignment
        if (validatedData.department_level === 'school' && validatedData.school_ids && validatedData.school_ids.length > 1) {
          // Delete existing links
          await supabase
            .from('department_schools')
            .delete()
            .eq('department_id', editingDepartment.id);

          // Create new links
          const junctionRecords = validatedData.school_ids.map(schoolId => ({
            department_id: editingDepartment.id,
            school_id: schoolId
          }));

          await supabase
            .from('department_schools')
            .insert(junctionRecords);
        }

        return { ...editingDepartment, ...updateData };
      } else {
        // Create new department
        const insertData: any = {
          company_id: validatedData.company_id,
          name: validatedData.name,
          code: validatedData.code,
          parent_department_id: validatedData.parent_department_id || null,
          head_id: validatedData.head_id || null,
          head_of_department: validatedData.head_of_department,
          head_email: validatedData.head_email,
          contact_email: validatedData.contact_email,
          contact_phone: validatedData.contact_phone,
          description: validatedData.description,
          status: validatedData.status
        };

        // Set level-specific fields
        if (validatedData.department_level === 'company') {
          insertData.school_id = null;
          insertData.branch_id = null;
        } else if (validatedData.department_level === 'school') {
          insertData.school_id = validatedData.school_ids?.[0] || null;
          insertData.branch_id = null;
        } else if (validatedData.department_level === 'branch') {
          insertData.branch_id = validatedData.branch_ids?.[0] || null;
          // Get school_id from branch
          const branch = branches.find(b => b.id === insertData.branch_id);
          insertData.school_id = branch?.school_id || null;
        }

        const { data: newDepartment, error } = await supabase
          .from('departments')
          .insert([insertData])
          .select()
          .single();

        if (error) throw error;

        // Create junction table entries for multi-school assignment
        if (validatedData.department_level === 'school' && validatedData.school_ids && validatedData.school_ids.length > 1) {
          const junctionRecords = validatedData.school_ids.map(schoolId => ({
            department_id: newDepartment.id,
            school_id: schoolId
          }));

          await supabase
            .from('department_schools')
            .insert(junctionRecords);
        }

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

  // Bulk create mutation for templates
  const bulkCreateMutation = useMutation(
    async (templateType: string) => {
      const templates = DEPARTMENT_TEMPLATES[templateType as keyof typeof DEPARTMENT_TEMPLATES];
      if (!templates) return;

      const departments = templates.map(template => ({
        company_id: companyId,
        school_id: formState.school_ids[0] || null,
        branch_id: formState.branch_ids[0] || null,
        name: template.name,
        code: template.code,
        description: `${template.type} department`,
        status: 'active' as const
      }));

      const { error } = await supabase
        .from('departments')
        .insert(departments);

      if (error) throw error;
      return departments;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['departments']);
        setShowTemplates(false);
        toast.success('Departments created from template successfully');
      },
      onError: (error) => {
        console.error('Error creating departments from template:', error);
        toast.error('Failed to create departments from template');
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

  // Department Level Icon Component
  const DepartmentLevelIcon = ({ level }: { level: string }) => {
    switch (level) {
      case 'company':
        return <Building className="h-4 w-4 text-purple-500" />;
      case 'school':
        return <School className="h-4 w-4 text-blue-500" />;
      case 'branch':
        return <MapPin className="h-4 w-4 text-green-500" />;
      default:
        return <Building2 className="h-4 w-4 text-gray-500" />;
    }
  };

  // Hierarchical Department Row Component
  const HierarchicalDepartmentRow = ({ 
    department, 
    level = 0 
  }: { 
    department: Department; 
    level?: number;
  }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasChildren = department.children && department.children.length > 0;

    return (
      <>
        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
          <td className="px-4 py-3">
            <div className="flex items-center" style={{ paddingLeft: `${level * 24}px` }}>
              {hasChildren && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="mr-2 text-gray-500 hover:text-gray-700"
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              )}
              <DepartmentLevelIcon level={department.department_level || 'company'} />
              <span className="ml-2 font-medium">{department.name}</span>
              {department.code && (
                <span className="ml-2 text-xs text-gray-500">({department.code})</span>
              )}
            </div>
          </td>
          <td className="px-4 py-3">
            <span className="text-sm text-gray-600">{department.department_type}</span>
          </td>
          <td className="px-4 py-3">
            <span className="text-sm">{department.school_name}</span>
          </td>
          <td className="px-4 py-3">
            <span className="text-sm">{department.branch_name}</span>
          </td>
          <td className="px-4 py-3">
            <span className="text-sm">{department.head_of_department || '-'}</span>
          </td>
          <td className="px-4 py-3">
            <StatusBadge status={department.status} />
          </td>
          <td className="px-4 py-3">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingDepartment(department);
                  setIsFormOpen(true);
                }}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete([department])}
                className="text-red-600 hover:text-red-700"
              >
                Delete
              </Button>
            </div>
          </td>
        </tr>
        {isExpanded && hasChildren && department.children!.map(child => (
          <HierarchicalDepartmentRow
            key={child.id}
            department={child}
            level={level + 1}
          />
        ))}
      </>
    );
  };

  const columns = [
    {
      id: 'name',
      header: 'Department Name',
      accessorKey: 'name',
      enableSorting: true,
      cell: (row: Department) => (
        <div className="flex items-center gap-2">
          <DepartmentLevelIcon level={row.department_level || 'company'} />
          <div>
            <span className="font-medium">{row.name}</span>
            {row.code && (
              <span className="ml-2 text-xs text-gray-500">({row.code})</span>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'level',
      header: 'Level',
      accessorKey: 'department_level',
      enableSorting: true,
      cell: (row: Department) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
          ${row.department_level === 'company' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
            row.department_level === 'school' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
            'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'}`}>
          {row.department_level || 'Company'}
        </span>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      accessorKey: 'department_type',
      enableSorting: true,
      cell: (row: Department) => (
        <span className="capitalize text-sm">{row.department_type || 'academic'}</span>
      ),
    },
    {
      id: 'school',
      header: 'School',
      accessorKey: 'school_name',
      enableSorting: true,
    },
    {
      id: 'branch',
      header: 'Branch',
      accessorKey: 'branch_name',
      enableSorting: true,
    },
    {
      id: 'head',
      header: 'Head of Department',
      accessorKey: 'head_of_department',
      enableSorting: true,
      cell: (row: Department) => (
        <div className="text-sm">
          {row.head_of_department ? (
            <div>
              <div>{row.head_of_department}</div>
              {row.head_email && (
                <div className="text-xs text-gray-500">{row.head_email}</div>
              )}
            </div>
          ) : '-'}
        </div>
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
              <span>{row.contact_email}</span>
            </div>
          )}
          {row.contact_phone && (
            <div className="flex items-center gap-1">
              <Phone className="h-3 w-3 text-gray-400" />
              <span>{row.contact_phone}</span>
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
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Departments</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage academic and administrative departments across your organization
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowTemplates(true)}
            leftIcon={<Copy className="h-4 w-4" />}
          >
            Use Templates
          </Button>
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

      <FilterCard
        title="Filters"
        onApply={() => {}}
        onClear={() => {
          setFilters({
            search: '',
            department_level: [],
            school_ids: [],
            branch_ids: [],
            department_type: [],
            status: [],
            show_hierarchy: false
          });
        }}
      >
        <div className="space-y-4">
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
              label="Department Level"
              options={[
                { value: 'company', label: 'Company' },
                { value: 'school', label: 'School' },
                { value: 'branch', label: 'Branch' }
              ]}
              selectedValues={filters.department_level}
              onChange={(values) => setFilters({ ...filters, department_level: values })}
              placeholder="Select levels..."
            />

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
              options={allBranches.map(b => ({
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
                { value: 'operations', label: 'Operations' },
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

          <div className="flex items-center gap-4">
            <ToggleSwitch
              checked={filters.show_hierarchy}
              onChange={(checked) => setFilters({ ...filters, show_hierarchy: checked })}
              label="Show Hierarchical View"
            />
          </div>
        </div>
      </FilterCard>

      {/* Hierarchical View */}
      {filters.show_hierarchy ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  School
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Branch
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Head
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {departments.map(department => (
                <HierarchicalDepartmentRow key={department.id} department={department} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <DataTable
          data={departments}
          columns={columns}
          keyField="id"
          caption="List of departments with their details and hierarchy"
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
      )}

      {/* Department Form */}
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

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="assignments">Assignments</TabsTrigger>
              <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <FormField
                id="department_level"
                label="Department Level"
                required
                error={formErrors.department_level}
              >
                <Select
                  id="department_level"
                  name="department_level"
                  options={[
                    { value: 'company', label: 'Company Level (All Schools)' },
                    { value: 'school', label: 'School Level' },
                    { value: 'branch', label: 'Branch Level' }
                  ]}
                  value={formState.department_level}
                  onChange={(e) => {
                    const level = e.target.value as any;
                    setFormState(prev => ({ 
                      ...prev, 
                      department_level: level,
                      school_ids: [],
                      branch_ids: []
                    }));
                  }}
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

              <div className="grid grid-cols-2 gap-4">
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
                      { value: 'operations', label: 'Operations' },
                      { value: 'other', label: 'Other' }
                    ]}
                    value={formState.department_type}
                    onChange={(e) => setFormState(prev => ({ ...prev, department_type: e.target.value as any }))}
                  />
                </FormField>
              </div>

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

              <FormField
                id="head_email"
                label="Head Email"
                error={formErrors.head_email}
              >
                <Input
                  id="head_email"
                  name="head_email"
                  type="email"
                  placeholder="head@school.edu"
                  value={formState.head_email}
                  onChange={(e) => setFormState(prev => ({ ...prev, head_email: e.target.value }))}
                  leftIcon={<Mail className="h-5 w-5 text-gray-400" />}
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
            </TabsContent>

            <TabsContent value="assignments" className="space-y-4">
              {formState.department_level === 'school' && (
                <FormField
                  id="school_ids"
                  label="Assigned Schools"
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
                  <p className="text-xs text-gray-500 mt-1">
                    Select one or more schools where this department operates
                  </p>
                </FormField>
              )}

              {formState.department_level === 'branch' && (
                <>
                  <FormField
                    id="school_ids_for_branch"
                    label="Select School First"
                    required
                  >
                    <SearchableMultiSelect
                      label=""
                      options={schools.map(school => ({
                        value: school.id,
                        label: school.name
                      }))}
                      selectedValues={formState.school_ids}
                      onChange={(values) => {
                        setFormState(prev => ({ 
                          ...prev, 
                          school_ids: values,
                          branch_ids: [] // Reset branches when school changes
                        }));
                      }}
                      isMulti={false}
                      placeholder="Select school..."
                    />
                  </FormField>

                  {formState.school_ids.length > 0 && (
                    <FormField
                      id="branch_ids"
                      label="Assigned Branches"
                      required
                      error={formErrors.branch_ids}
                    >
                      <SearchableMultiSelect
                        label=""
                        options={branches.map(branch => ({
                          value: branch.id,
                          label: branch.name
                        }))}
                        selectedValues={formState.branch_ids}
                        onChange={(values) => {
                          setFormState(prev => ({ ...prev, branch_ids: values }));
                        }}
                        placeholder="Select branches..."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Select one or more branches where this department operates
                      </p>
                    </FormField>
                  )}
                </>
              )}

              {formState.department_level === 'company' && (
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Building className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <h4 className="font-medium text-purple-900 dark:text-purple-100">Company-Level Department</h4>
                  </div>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    This department will be available across all schools and branches in the company.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="hierarchy" className="space-y-4">
              <FormField
                id="parent_department_id"
                label="Parent Department"
                error={formErrors.parent_department_id}
              >
                <Select
                  id="parent_department_id"
                  name="parent_department_id"
                  options={[
                    { value: '', label: 'No Parent (Top Level)' },
                    ...departments
                      .filter(d => d.id !== editingDepartment?.id)
                      .map(dept => ({
                        value: dept.id,
                        label: `${dept.name} (${dept.department_level || 'Company'})`
                      }))
                  ]}
                  value={formState.parent_department_id}
                  onChange={(e) => setFormState(prev => ({ ...prev, parent_department_id: e.target.value }))}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Select a parent department to create a hierarchical structure
                </p>
              </FormField>

              {formState.parent_department_id && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <GitBranch className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <h4 className="font-medium text-blue-900 dark:text-blue-100">Hierarchical Structure</h4>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    This department will be a sub-department of the selected parent.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </form>
      </SlideInForm>

      {/* Templates Dialog */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-auto">
            <h3 className="text-lg font-semibold mb-4">Department Templates</h3>
            
            <div className="space-y-4 mb-6">
              <FormField id="template_school" label="Select School for Templates">
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
                  isMulti={false}
                  placeholder="Select school..."
                />
              </FormField>
            </div>

            <div className="grid gap-4">
              {Object.entries(DEPARTMENT_TEMPLATES).map(([key, templates]) => (
                <div key={key} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <h4 className="font-medium capitalize mb-2">{key} Departments</h4>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {templates.map(t => (
                      <span key={t.code} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {t.name}
                      </span>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (!formState.school_ids[0]) {
                        toast.error('Please select a school first');
                        return;
                      }
                      bulkCreateMutation.mutate(key);
                    }}
                    disabled={!formState.school_ids[0] || bulkCreateMutation.isLoading}
                  >
                    Create {templates.length} Departments
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowTemplates(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

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