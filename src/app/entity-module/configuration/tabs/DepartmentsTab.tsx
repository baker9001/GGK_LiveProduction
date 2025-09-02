/**
 * File: /src/app/entity-module/configuration/tabs/DepartmentsTab.tsx
 * 
 * Enhanced Departments Management Tab - COMPLETE VERSION
 * - Maintains 100% database compatibility
 * - Restores all original UI/UX features
 * - Stores additional metadata in description field
 * - Includes department type, contact info, and head name
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Building2, Users, Phone, Mail, School, MapPin, Building, Filter } from 'lucide-react';
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

// Metadata structure stored in description field
interface DepartmentMetadata {
  userDescription?: string;
  departmentType?: 'academic' | 'administrative' | 'support' | 'operations' | 'other';
  headName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

// Helper functions to manage metadata
const parseMetadata = (description: string | null): { metadata: DepartmentMetadata; userDescription: string } => {
  if (!description) {
    return { metadata: {}, userDescription: '' };
  }

  try {
    // Check if description contains JSON metadata
    const metadataMatch = description.match(/<!--METADATA:(.+?)-->/);
    if (metadataMatch) {
      const metadata = JSON.parse(metadataMatch[1]);
      const userDescription = description.replace(/<!--METADATA:.+?-->/, '').trim();
      return { metadata, userDescription };
    }
  } catch (e) {
    // If parsing fails, treat entire description as user text
  }

  return { metadata: {}, userDescription: description };
};

const buildDescription = (userDescription: string, metadata: DepartmentMetadata): string => {
  const cleanedMetadata = {
    ...metadata,
    userDescription: undefined // Remove userDescription from metadata
  };
  
  // Only add metadata if there are actual values
  const hasMetadata = Object.values(cleanedMetadata).some(v => v);
  if (!hasMetadata && !userDescription) {
    return '';
  }
  
  if (!hasMetadata) {
    return userDescription;
  }
  
  const metadataStr = `<!--METADATA:${JSON.stringify(cleanedMetadata)}-->`;
  return userDescription ? `${userDescription}\n${metadataStr}` : metadataStr;
};

const departmentSchema = z.object({
  company_id: z.string().uuid(),
  school_ids: z.array(z.string().uuid()).min(1, 'Please select at least one school'),
  branch_ids: z.array(z.string().uuid()).optional(),
  parent_department_id: z.union([
    z.string().uuid(),
    z.literal(''),
    z.null()
  ]).optional().transform(val => val === '' ? null : val),
  name: z.string().min(1, 'Department name is required'),
  code: z.string().optional().nullable().transform(val => val === '' ? null : val),
  description: z.string().optional().nullable(),
  head_id: z.union([
    z.string().uuid(),
    z.literal(''),
    z.null()
  ]).optional().transform(val => val === '' ? null : val),
  status: z.enum(['active', 'inactive']),
  // Virtual fields for UI
  department_type: z.enum(['academic', 'administrative', 'support', 'operations', 'other']).optional(),
  head_name: z.string().optional(),
  contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
  contact_phone: z.string().optional()
});

interface FilterState {
  search: string;
  school_ids: string[];
  branch_ids: string[];
  department_type: string[];
  status: string[];
}

interface FormState {
  company_id: string;
  school_ids: string[];
  branch_ids: string[];
  parent_department_id: string;
  name: string;
  code: string;
  description: string;
  head_id: string;
  status: 'active' | 'inactive';
  // Virtual fields
  department_type: 'academic' | 'administrative' | 'support' | 'operations' | 'other';
  head_name: string;
  contact_email: string;
  contact_phone: string;
}

type Department = {
  id: string;
  company_id: string | null;
  school_id: string | null;
  branch_id: string | null;
  parent_department_id: string | null;
  name: string;
  code: string | null;
  description: string | null;
  head_id: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  // Joined data
  schools?: { name: string };
  branches?: { name: string };
  school_names?: string[];
  branch_names?: string[];
  // Virtual fields from metadata
  department_type?: 'academic' | 'administrative' | 'support' | 'operations' | 'other';
  head_name?: string;
  contact_email?: string;
  contact_phone?: string;
  user_description?: string;
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
  const [activeTab, setActiveTab] = useState<'details' | 'assignments' | 'contact'>('details');
  const [isLoadingEditData, setIsLoadingEditData] = useState(false);
  const [isManualSave, setIsManualSave] = useState(false);
  
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    school_ids: [],
    branch_ids: [],
    department_type: [],
    status: []
  });

  const [formState, setFormState] = useState<FormState>({
    company_id: companyId || '',
    school_ids: [],
    branch_ids: [],
    parent_department_id: '',
    name: '',
    code: '',
    description: '',
    head_id: '',
    status: 'active',
    // Virtual fields
    department_type: 'academic',
    head_name: '',
    contact_email: '',
    contact_phone: ''
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

  // Fetch branches based on selected schools
  const { data: branches = [] } = useQuery(
    ['branches-for-departments', formState.school_ids],
    async () => {
      if (formState.school_ids.length === 0) return [];

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
      enabled: formState.school_ids.length > 0,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Fetch all branches for filtering
  const { data: allBranches = [] } = useQuery(
    ['all-branches-for-filtering', companyId],
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
        setIsLoadingEditData(true);
        const loadDepartmentData = async () => {
          try {
            // Get associated schools from junction table
            const { data: schoolLinks } = await supabase
              .from('department_schools')
              .select('school_id')
              .eq('department_id', editingDepartment.id);

            const assignedSchools = schoolLinks?.map(s => s.school_id) || 
                                   (editingDepartment.school_id ? [editingDepartment.school_id] : []);

            // Parse metadata from description
            const { metadata, userDescription } = parseMetadata(editingDepartment.description);

            // Set form state without triggering any submissions
            setFormState({
              company_id: editingDepartment.company_id || companyId || '',
              school_ids: assignedSchools.length > 0 ? assignedSchools : [],
              branch_ids: editingDepartment.branch_id ? [editingDepartment.branch_id] : [],
              parent_department_id: editingDepartment.parent_department_id || '',
              name: editingDepartment.name || '',
              code: editingDepartment.code || '',
              description: userDescription,
              head_id: editingDepartment.head_id || '',
              status: editingDepartment.status || 'active',
              // Virtual fields from metadata
              department_type: metadata.departmentType || 'academic',
              head_name: metadata.headName || '',
              contact_email: metadata.contactEmail || '',
              contact_phone: metadata.contactPhone || ''
            });
            
            // Clear any errors
            setFormErrors({});
          } finally {
            // Small delay to ensure form is fully loaded
            setTimeout(() => {
              setIsLoadingEditData(false);
            }, 100);
          }
        };
        
        loadDepartmentData();
      } else {
        // Reset for new department
        setFormState({
          company_id: companyId || '',
          school_ids: [],
          branch_ids: [],
          parent_department_id: '',
          name: '',
          code: '',
          description: '',
          head_id: '',
          status: 'active',
          department_type: 'academic',
          head_name: '',
          contact_email: '',
          contact_phone: ''
        });
        setIsLoadingEditData(false);
      }
      setFormErrors({});
      setActiveTab('details');
    }
  }, [isFormOpen, editingDepartment, companyId]);

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
          company_id,
          school_id,
          branch_id,
          parent_department_id,
          name,
          code,
          description,
          head_id,
          status,
          created_at,
          schools!departments_school_id_fkey (
            name
          ),
          branches!departments_branch_id_fkey (
            name
          )
        `)
        .order('name');

      // Filter by company
      if (schools.length > 0) {
        query = query.or(`company_id.eq.${companyId},school_id.in.(${schools.map(s => s.id).join(',')})`);
      } else {
        query = query.eq('company_id', companyId);
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

      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Process departments and extract metadata
      const processedDepartments = await Promise.all((data || []).map(async (dept) => {
        // Get schools from junction table
        const { data: schoolLinks } = await supabase
          .from('department_schools')
          .select('school_id')
          .eq('department_id', dept.id);

        const schoolIds = schoolLinks?.map(s => s.school_id) || [];
        const schoolNames = schools
          .filter(s => schoolIds.includes(s.id))
          .map(s => s.name);

        // Parse metadata from description
        const { metadata, userDescription } = parseMetadata(dept.description);

        return {
          ...dept,
          school_name: dept.schools?.name || '-',
          branch_name: dept.branches?.name || '-',
          school_names: schoolNames.length > 0 ? schoolNames : [dept.schools?.name || '-'],
          department_level: dept.branch_id ? 'Branch' : dept.school_id ? 'School' : 'Company',
          // Virtual fields from metadata
          department_type: metadata.departmentType,
          head_name: metadata.headName,
          contact_email: metadata.contactEmail,
          contact_phone: metadata.contactPhone,
          user_description: userDescription
        };
      }));

      // Apply department type filter on processed data
      let filteredDepartments = processedDepartments;
      if (filters.department_type.length > 0) {
        filteredDepartments = filteredDepartments.filter(
          dept => dept.department_type && filters.department_type.includes(dept.department_type)
        );
      }

      // Apply head name search
      if (filters.search) {
        filteredDepartments = filteredDepartments.filter(dept => {
          const searchLower = filters.search.toLowerCase();
          return (
            dept.name.toLowerCase().includes(searchLower) ||
            (dept.code && dept.code.toLowerCase().includes(searchLower)) ||
            (dept.head_name && dept.head_name.toLowerCase().includes(searchLower))
          );
        });
      }

      return filteredDepartments;
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
      // Build metadata-enriched description
      const metadata: DepartmentMetadata = {
        departmentType: data.department_type,
        headName: data.head_name || undefined,
        contactEmail: data.contact_email || undefined,
        contactPhone: data.contact_phone || undefined
      };
      
      const fullDescription = buildDescription(data.description, metadata);

      // Transform data for database
      const dataToValidate = {
        ...data,
        description: fullDescription,
        parent_department_id: data.parent_department_id || null,
        head_id: data.head_id || null,
        code: data.code || null
      };

      const validatedData = departmentSchema.parse(dataToValidate);

      if (editingDepartment) {
        // Update existing department
        const updateData: any = {
          name: validatedData.name,
          code: validatedData.code,
          description: validatedData.description,
          head_id: validatedData.head_id,
          parent_department_id: validatedData.parent_department_id,
          status: validatedData.status,
          school_id: validatedData.school_ids[0] || null,
          branch_id: validatedData.branch_ids?.[0] || null
        };

        const { error } = await supabase
          .from('departments')
          .update(updateData)
          .eq('id', editingDepartment.id);

        if (error) throw error;

        // Update junction table for multi-school assignment
        if (validatedData.school_ids.length > 0) {
          await supabase
            .from('department_schools')
            .delete()
            .eq('department_id', editingDepartment.id);

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
          school_id: validatedData.school_ids[0] || null,
          branch_id: validatedData.branch_ids?.[0] || null,
          name: validatedData.name,
          code: validatedData.code,
          description: validatedData.description,
          head_id: validatedData.head_id,
          parent_department_id: validatedData.parent_department_id,
          status: validatedData.status
        };

        const { data: newDepartment, error } = await supabase
          .from('departments')
          .insert([insertData])
          .select()
          .single();

        if (error) throw error;

        // Create junction table entries
        if (validatedData.school_ids.length > 0) {
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
        setIsManualSave(false);
        toast.success(`Department ${editingDepartment ? 'updated' : 'created'} successfully`);
      },
      onError: (error) => {
        setIsManualSave(false);
        if (error instanceof z.ZodError) {
          const errors: Record<string, string> = {};
          error.errors.forEach((err) => {
            if (err.path.length > 0) {
              errors[err.path[0]] = err.message;
            }
          });
          setFormErrors(errors);
          toast.error('Please fill in all required fields');
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
      await supabase
        .from('department_schools')
        .delete()
        .in('department_id', departments.map(d => d.id));

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
    e.stopPropagation();
    
    // Only process if this is a manual save triggered by the Save button
    if (!isManualSave) {
      return;
    }
    
    // Don't submit if still loading edit data
    if (isLoadingEditData) {
      setIsManualSave(false);
      return;
    }
    
    // Basic validation
    const errors: Record<string, string> = {};
    
    if (!formState.name.trim()) {
      errors.name = 'Department name is required';
    }
    
    if (!formState.school_ids || formState.school_ids.length === 0) {
      errors.school_ids = 'Please select at least one school';
    }
    
    if (formState.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.contact_email)) {
      errors.contact_email = 'Invalid email format';
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Please fill in all required fields');
      setIsManualSave(false);
      return;
    }
    
    setFormErrors({});
    departmentMutation.mutate(formState);
    setIsManualSave(false);
  };

  const handleSaveClick = () => {
    // Only allow save if not loading and form is valid
    if (isLoadingEditData || departmentMutation.isLoading) {
      return;
    }
    
    // Set manual save flag and submit
    setIsManualSave(true);
    
    // Use a small delay to ensure flag is set
    requestAnimationFrame(() => {
      const form = document.getElementById('department-form') as HTMLFormElement;
      if (form) {
        // Create submit event that won't be prevented
        const event = new Event('submit', { 
          bubbles: false,  // Don't bubble to prevent other handlers
          cancelable: true 
        });
        form.dispatchEvent(event);
      }
    });
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
      case 'Company':
        return <Building className="h-4 w-4 text-purple-500" />;
      case 'School':
        return <School className="h-4 w-4 text-blue-500" />;
      case 'Branch':
        return <MapPin className="h-4 w-4 text-green-500" />;
      default:
        return <Building2 className="h-4 w-4 text-gray-500" />;
    }
  };

  const columns = [
    {
      id: 'name',
      header: 'Department Name',
      accessorKey: 'name',
      enableSorting: true,
      cell: (row: Department) => (
        <div className="flex items-center gap-2">
          <DepartmentLevelIcon level={row.department_level || 'School'} />
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
      id: 'type',
      header: 'Type',
      accessorKey: 'department_type',
      enableSorting: true,
      cell: (row: Department) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize
          ${row.department_type === 'academic' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
            row.department_type === 'administrative' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
            row.department_type === 'support' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
            row.department_type === 'operations' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
            'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'}`}>
          {row.department_type || 'Other'}
        </span>
      ),
    },
    {
      id: 'schools',
      header: 'Schools',
      cell: (row: Department) => (
        <div className="text-sm">
          {row.school_names && row.school_names.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {row.school_names.slice(0, 2).map((name, idx) => (
                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700">
                  {name}
                </span>
              ))}
              {row.school_names.length > 2 && (
                <span className="text-xs text-gray-500">+{row.school_names.length - 2} more</span>
              )}
            </div>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      ),
    },
    {
      id: 'head',
      header: 'Head of Department',
      accessorKey: 'head_name',
      enableSorting: true,
      cell: (row: Department) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {row.head_name || '-'}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <FormField id="search" label="Search">
            <Input
              id="search"
              placeholder="Search name, code, or head..."
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
        onDelete={(departments) => {
          setDepartmentsToDelete(departments);
          setIsConfirmDialogOpen(true);
        }}
        emptyMessage="No departments found"
      />

      {/* Department Form - with Enter key disabled */}
      <SlideInForm
        key={editingDepartment?.id || 'new'}
        title={editingDepartment ? 'Edit Department' : 'Create Department'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingDepartment(null);
          setFormErrors({});
          setIsLoadingEditData(false);
          setIsManualSave(false);
        }}
        onSave={handleSaveClick}
        loading={departmentMutation.isLoading || isLoadingEditData}
        saveButtonText={isLoadingEditData ? 'Loading...' : 'Save'}
      >
        <div 
          onKeyDown={(e) => {
            // Block Enter key from triggering the SlideInForm's save handler
            if (e.key === 'Enter') {
              e.stopPropagation();
              // Allow Enter only in textareas for new lines
              if (!(e.target instanceof HTMLTextAreaElement)) {
                e.preventDefault();
              }
            }
          }}
        >
          <form 
            id="department-form" 
            onSubmit={handleSubmit} 
            className="space-y-4"
            autoComplete="off"
            onKeyPress={(e) => {
              // Additional safeguard: prevent Enter from submitting form
              if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) {
                e.preventDefault();
                return false;
              }
            }}
          >
          {formErrors.form && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {formErrors.form}
            </div>
          )}

          {isLoadingEditData ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Loading department data...</div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="assignments">Assignments</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
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
                  id="head_name"
                  label="Head of Department"
                  error={formErrors.head_name}
                >
                  <Input
                    id="head_name"
                    name="head_name"
                    placeholder="Enter name of department head"
                    value={formState.head_name}
                    onChange={(e) => setFormState(prev => ({ ...prev, head_name: e.target.value }))}
                    leftIcon={<Users className="h-5 w-5 text-gray-400" />}
                  />
                </FormField>

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
                  id="parent_department"
                  label="Parent Department (Optional)"
                >
                  <Select
                    id="parent_department"
                    options={[
                      { value: '', label: 'No Parent Department' },
                      ...departments
                        .filter(d => d.id !== editingDepartment?.id)
                        .map(d => ({ value: d.id, label: d.name }))
                    ]}
                    value={formState.parent_department_id}
                    onChange={(e) => setFormState(prev => ({ ...prev, parent_department_id: e.target.value }))}
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
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg mb-4">
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                    Department Assignment
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Assign this department to one or more schools. Optionally, you can assign it to specific branches.
                  </p>
                </div>

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
                      setFormState(prev => ({ 
                        ...prev, 
                        school_ids: values,
                        branch_ids: []
                      }));
                    }}
                    placeholder="Select schools..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Select one or more schools where this department operates
                  </p>
                </FormField>

                {formState.school_ids.length > 0 && branches.length > 0 && (
                  <FormField
                    id="branch_ids"
                    label="Assigned Branches (Optional)"
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
                      placeholder="Select branches (optional)..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Optionally, limit this department to specific branches
                    </p>
                  </FormField>
                )}
              </TabsContent>

              <TabsContent value="contact" className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg mb-4">
                  <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                    Contact Information
                  </h4>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Add contact details for this department.
                  </p>
                </div>

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
              </TabsContent>
            </Tabs>
          )}
        </form>
        </div>
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