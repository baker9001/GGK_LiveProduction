/**
 * File: /src/app/entity-module/configuration/tabs/AcademicYearsTab.tsx
 * Dependencies: 
 *   - @/lib/supabase
 *   - @/hooks/useAccessControl
 *   - @/components/shared/* (DataTable, FilterCard, SlideInForm, etc.)
 *   - External: react, @tanstack/react-query, lucide-react, zod
 * 
 * Preserved Features:
 *   - All original filtering functionality
 *   - Multi-school support via junction table
 *   - Access control and scope filtering
 *   - CRUD operations for academic years
 *   - Form validation with Zod
 *   - Toast notifications
 * 
 * Added/Modified:
 *   - FIXED: Removed 'description' field (doesn't exist in DB)
 *   - ADDED: total_terms and current_term fields
 *   - ENHANCED: Better data display with academic statistics
 *   - ENHANCED: Improved error handling and loading states
 *   - ADDED: Academic year templates for quick creation
 *   - ADDED: Bulk operations support
 *   - ENHANCED: Better date validation and formatting
 *   - FIXED: Replaced all blue theme colors with green (#8CC63F)
 * 
 * Database Tables:
 *   - academic_years (id, school_id, year_name, start_date, end_date, total_terms, current_term, is_current, status)
 *   - academic_year_schools (junction table for multi-school support)
 * 
 * Connected Files:
 *   - Used by: /src/app/entity-module/configuration/page.tsx
 *   - Depends on: All shared components and hooks listed above
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Calendar, 
  School, 
  CalendarClock, 
  BookOpen, 
  Copy, 
  TrendingUp,
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
const academicYearSchema = z.object({
  school_ids: z.array(z.string().uuid()).min(1, 'Please select at least one school'),
  year_name: z.string().min(1, 'Year name is required').max(100, 'Year name is too long'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  total_terms: z.number().min(1, 'Must have at least 1 term').max(12, 'Maximum 12 terms allowed').nullable(),
  current_term: z.number().min(1).nullable(),
  is_current: z.boolean(),
  status: z.enum(['active', 'inactive', 'completed'])
}).refine((data) => {
  if (data.current_term && data.total_terms) {
    return data.current_term <= data.total_terms;
  }
  return true;
}, {
  message: "Current term cannot exceed total terms",
  path: ["current_term"]
});

interface FilterState {
  search: string;
  school_ids: string[];
  is_current: boolean | null;
  status: string[];
  year_range: string;
}

interface FormState {
  school_ids: string[];
  year_name: string;
  start_date: string;
  end_date: string;
  total_terms: number | null;
  current_term: number | null;
  is_current: boolean;
  status: 'active' | 'inactive' | 'completed';
}

type AcademicYear = {
  id: string;
  school_id: string;
  school_name?: string;
  school_ids?: string[]; // For multi-school support
  year_name: string;
  start_date: string;
  end_date: string;
  total_terms: number | null;
  current_term: number | null;
  is_current: boolean;
  status: 'active' | 'inactive' | 'completed';
  created_at: string;
};

interface AcademicYearsTabProps {
  companyId: string | null;
}

// Predefined academic year templates
const YEAR_TEMPLATES = [
  { 
    label: 'Standard Academic Year (2 Terms)', 
    total_terms: 2,
    duration_months: 9,
    template_name: '{{year}}-{{next_year}} Academic Year'
  },
  { 
    label: 'Trimester System (3 Terms)', 
    total_terms: 3,
    duration_months: 9,
    template_name: '{{year}}-{{next_year}} Academic Year'
  },
  { 
    label: 'Quarter System (4 Terms)', 
    total_terms: 4,
    duration_months: 12,
    template_name: '{{year}} Academic Year'
  },
  { 
    label: 'Full Year Program', 
    total_terms: 1,
    duration_months: 12,
    template_name: '{{year}} Full Year Program'
  }
];

export function AcademicYearsTab({ companyId }: AcademicYearsTabProps) {
  const queryClient = useQueryClient();
  const { getScopeFilters, isEntityAdmin, isSubEntityAdmin } = useAccessControl();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [selectedTemplate, setSelectedTemplate] = useState<typeof YEAR_TEMPLATES[0] | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    school_ids: [],
    is_current: null,
    status: [],
    year_range: 'all'
  });

  const [formState, setFormState] = useState<FormState>({
    school_ids: [],
    year_name: '',
    start_date: '',
    end_date: '',
    total_terms: null,
    current_term: null,
    is_current: false,
    status: 'active'
  });

  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [yearsToDelete, setYearsToDelete] = useState<AcademicYear[]>([]);

  // Get scope filters
  const scopeFilters = getScopeFilters('schools');
  const canAccessAll = isEntityAdmin || isSubEntityAdmin;

  // Fetch schools for dropdown
  const { data: schools = [] } = useQuery({
    queryKey: ['schools-for-years', companyId, scopeFilters],
    queryFn: async () => {
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
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });

  // Apply template to form
  const applyTemplate = (template: typeof YEAR_TEMPLATES[0]) => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const nextYear = currentYear + 1;
    
    let yearName = template.template_name
      .replace('{{year}}', currentYear.toString())
      .replace('{{next_year}}', nextYear.toString());
    
    const startDate = new Date(currentYear, 8, 1); // September 1st
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + template.duration_months);
    
    setFormState(prev => ({
      ...prev,
      year_name: yearName,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      total_terms: template.total_terms,
      current_term: 1
    }));
    
    setSelectedTemplate(template);
  };

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
            total_terms: editingYear.total_terms,
            current_term: editingYear.current_term,
            is_current: editingYear.is_current || false,
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
          total_terms: null,
          current_term: null,
          is_current: false,
          status: 'active'
        });
      }
      setFormErrors({});
      setSelectedTemplate(null);
    }
  }, [isFormOpen, editingYear]);

  // Fetch academic years with enhanced filtering
  const { 
    data: academicYears = [], 
    isLoading, 
    isFetching 
  } = useQuery({
    queryKey: ['academic-years', companyId, filters, scopeFilters],
    queryFn: async () => {
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

      // Year range filter
      if (filters.year_range !== 'all') {
        const now = new Date();
        let dateFilter = new Date();
        
        switch(filters.year_range) {
          case 'current':
            query = query.lte('start_date', now.toISOString())
                        .gte('end_date', now.toISOString());
            break;
          case 'upcoming':
            query = query.gt('start_date', now.toISOString());
            break;
          case 'past':
            query = query.lt('end_date', now.toISOString());
            break;
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      // Enhance data with additional school information from junction table
      const enhancedData = await Promise.all((data || []).map(async (year) => {
        const { data: associations } = await supabase
          .from('academic_year_schools')
          .select('school_id, schools(name)')
          .eq('academic_year_id', year.id);

        const schoolIds = associations?.map(a => a.school_id) || [year.school_id];
        const schoolNames = associations?.map(a => a.schools?.name).filter(Boolean) || [year.schools?.name];

        return {
          ...year,
          school_name: year.schools?.name || 'Unknown School',
          school_ids: schoolIds,
          school_names: schoolNames
        };
      }));

      return enhancedData;
    },
    enabled: !!companyId,
    placeholderData: (previousData) => previousData,
    staleTime: 2 * 60 * 1000,
  });

  // Create/update mutation with enhanced validation
  const yearMutation = useMutation(
    async (data: FormState) => {
      const validatedData = academicYearSchema.parse({
        ...data,
        total_terms: data.total_terms || null,
        current_term: data.current_term || null
      });

      // Validate dates
      const startDate = new Date(validatedData.start_date);
      const endDate = new Date(validatedData.end_date);
      
      if (startDate >= endDate) {
        throw new Error('End date must be after start date');
      }
      
      if (endDate.getTime() - startDate.getTime() < 30 * 24 * 60 * 60 * 1000) {
        throw new Error('Academic year must be at least 30 days long');
      }

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
            total_terms: validatedData.total_terms,
            current_term: validatedData.current_term,
            is_current: validatedData.is_current,
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
          total_terms: validatedData.total_terms,
          current_term: validatedData.current_term,
          is_current: validatedData.is_current,
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
        setSelectedRows([]);
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

  // Delete mutation with enhanced feedback
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
      onSuccess: (deletedYears) => {
        queryClient.invalidateQueries(['academic-years']);
        setIsConfirmDialogOpen(false);
        setYearsToDelete([]);
        setSelectedRows([]);
        toast.success(`${deletedYears.length} academic year(s) deleted successfully`);
      },
      onError: (error) => {
        console.error('Error deleting academic years:', error);
        toast.error('Failed to delete academic year(s). They may have associated data.');
        setIsConfirmDialogOpen(false);
        setYearsToDelete([]);
      }
    }
  );

  // Duplicate academic year functionality
  const duplicateYear = (year: AcademicYear) => {
    const nextYear = new Date(year.start_date).getFullYear() + 1;
    const newYearName = year.year_name.replace(/\d{4}/g, (match) => {
      const yearNum = parseInt(match);
      return (yearNum + 1).toString();
    });
    
    const newStartDate = new Date(year.start_date);
    newStartDate.setFullYear(newStartDate.getFullYear() + 1);
    
    const newEndDate = new Date(year.end_date);
    newEndDate.setFullYear(newEndDate.getFullYear() + 1);
    
    setFormState({
      school_ids: year.school_ids || [year.school_id],
      year_name: newYearName,
      start_date: newStartDate.toISOString().split('T')[0],
      end_date: newEndDate.toISOString().split('T')[0],
      total_terms: year.total_terms,
      current_term: 1,
      is_current: false,
      status: 'active'
    });
    
    setEditingYear(null);
    setIsFormOpen(true);
    toast.info('Duplicating academic year with updated dates');
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Clear previous errors
    setFormErrors({});
    
    // Validate required fields
    if (!formState.school_ids || formState.school_ids.length === 0) {
      setFormErrors({ school_ids: 'Please select at least one school' });
      return;
    }
    
    if (!formState.year_name) {
      setFormErrors({ year_name: 'Year name is required' });
      return;
    }
    
    if (!formState.start_date) {
      setFormErrors({ start_date: 'Start date is required' });
      return;
    }
    
    if (!formState.end_date) {
      setFormErrors({ end_date: 'End date is required' });
      return;
    }
    
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

  // Calculate academic year statistics
  const statistics = useMemo(() => {
    const currentYears = academicYears.filter(y => y.is_current);
    const activeYears = academicYears.filter(y => y.status === 'active');
    const upcomingYears = academicYears.filter(y => 
      new Date(y.start_date) > new Date()
    );
    
    return {
      total: academicYears.length,
      current: currentYears.length,
      active: activeYears.length,
      upcoming: upcomingYears.length
    };
  }, [academicYears]);

  // Enhanced table columns
  const columns = [
    {
      id: 'year_name',
      header: 'Academic Year',
      accessorKey: 'year_name',
      enableSorting: true,
      cell: (row: AcademicYear) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {row.year_name}
            </div>
            {row.is_current && (
              <span className="text-xs text-green-600 dark:text-green-400">
                Current Year
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'schools',
      header: 'School(s)',
      enableSorting: true,
      cell: (row: AcademicYear) => (
        <div className="flex items-center gap-2">
          <School className="h-4 w-4 text-gray-400" />
          <div>
            <div className="text-sm text-gray-900 dark:text-white">
              {row.school_names?.length > 1 
                ? `${row.school_names[0]} +${row.school_names.length - 1}`
                : row.school_name}
            </div>
            {row.school_names?.length > 1 && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {row.school_names.length} schools
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'duration',
      header: 'Duration',
      enableSorting: true,
      cell: (row: AcademicYear) => {
        const startDate = new Date(row.start_date);
        const endDate = new Date(row.end_date);
        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const months = Math.round(days / 30);
        
        return (
          <div className="text-sm">
            <div className="font-medium text-gray-900 dark:text-white">
              {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="text-gray-500 dark:text-gray-400">
              to {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {months} months ({days} days)
            </div>
          </div>
        );
      },
    },
    {
      id: 'terms',
      header: 'Terms',
      enableSorting: true,
      cell: (row: AcademicYear) => (
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-gray-400" />
          <div>
            {row.total_terms ? (
              <>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  Term {row.current_term || 1} of {row.total_terms}
                </div>
                <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                  <div 
                    className="bg-[#8CC63F] h-1.5 rounded-full"
                    style={{ width: `${((row.current_term || 1) / row.total_terms) * 100}%` }}
                  />
                </div>
              </>
            ) : (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Not configured
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: true,
      cell: (row: AcademicYear) => {
        const now = new Date();
        const start = new Date(row.start_date);
        const end = new Date(row.end_date);
        let timeStatus = '';
        let icon = null;
        
        if (now < start) {
          const daysUntil = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          timeStatus = `Starts in ${daysUntil} days`;
          icon = <Clock className="h-3 w-3" />;
        } else if (now > end) {
          timeStatus = 'Completed';
          icon = <CheckCircle2 className="h-3 w-3" />;
        } else {
          const progress = ((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100;
          timeStatus = `${Math.round(progress)}% complete`;
          icon = <TrendingUp className="h-3 w-3" />;
        }
        
        return (
          <div className="space-y-1">
            <StatusBadge status={row.status} />
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              {icon}
              {timeStatus}
            </div>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (row: AcademicYear) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => duplicateYear(row)}
            className="p-1 text-gray-500 hover:text-[#8CC63F] dark:text-gray-400 dark:hover:text-[#8CC63F] transition-colors"
            title="Duplicate for next year"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with statistics */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Academic Years</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage academic years, terms, and schedules across schools
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
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Current:</span>
              <span className="font-medium text-[#8CC63F]">{statistics.current}</span>
            </div>
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
      </div>

      {/* Enhanced Filters */}
      <FilterCard
        title="Filters"
        onApply={() => {}}
        onClear={() => {
          setFilters({
            search: '',
            school_ids: [],
            is_current: null,
            status: [],
            year_range: 'all'
          });
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <FormField id="search" label="Search">
            <Input
              id="search"
              placeholder="Search by year name..."
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

          <FormField id="year_range" label="Time Period">
            <Select
              id="year_range"
              options={[
                { value: 'all', label: 'All Years' },
                { value: 'current', label: 'Current Year' },
                { value: 'upcoming', label: 'Upcoming' },
                { value: 'past', label: 'Past Years' }
              ]}
              value={filters.year_range}
              onChange={(e) => setFilters({ ...filters, year_range: e.target.value })}
            />
          </FormField>

          <FormField id="is_current" label="Current Status">
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
            className="green-theme"
          />
        </div>
      </FilterCard>

      {/* Data Table */}
      <DataTable
        data={academicYears}
        columns={columns}
        keyField="id"
        caption="List of academic years with their duration, terms, and status"
        ariaLabel="Academic years data table"
        loading={isLoading}
        isFetching={isFetching}
        onEdit={(year) => {
          setEditingYear(year);
          setIsFormOpen(true);
        }}
        onDelete={handleDelete}
        emptyMessage="No academic years found. Create your first academic year to get started."
        bulkActions={selectedRows.length > 0}
        onSelectionChange={setSelectedRows}
        selectedRows={selectedRows}
      />

      {/* Enhanced Form Slide-In */}
      <SlideInForm
        key={editingYear?.id || 'new'}
        title={editingYear ? 'Edit Academic Year' : 'Create Academic Year'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingYear(null);
          setFormErrors({});
          setSelectedTemplate(null);
        }}
        onSave={() => {
          const form = document.querySelector('form');
          if (form) form.requestSubmit();
        }}
        loading={yearMutation.isLoading}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.form && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{formErrors.form}</span>
            </div>
          )}

          {/* Template Selection for new years */}
          {!editingYear && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quick Templates
              </label>
              <div className="grid grid-cols-2 gap-2">
                {YEAR_TEMPLATES.map((template, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className={`p-2 text-xs text-left rounded-md border transition-colors ${
                      selectedTemplate === template
                        ? 'border-[#8CC63F] bg-[#8CC63F]/10 dark:bg-[#8CC63F]/20 text-[#8CC63F] dark:text-[#8CC63F]'
                        : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="font-medium">{template.label}</div>
                    <div className="text-gray-500 dark:text-gray-400 mt-1">
                      {template.total_terms} terms, {template.duration_months} months
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <FormField
            id="school_ids"
            label="School(s)"
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
              placeholder="Select one or more schools..."
              className="green-theme"
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
              maxLength={100}
              className="focus:ring-[#8CC63F] focus:border-[#8CC63F]"
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
                className="focus:ring-[#8CC63F] focus:border-[#8CC63F]"
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
                min={formState.start_date}
                className="focus:ring-[#8CC63F] focus:border-[#8CC63F]"
              />
            </FormField>
          </div>

          {/* Duration display */}
          {formState.start_date && formState.end_date && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Duration: {(() => {
                  const start = new Date(formState.start_date);
                  const end = new Date(formState.end_date);
                  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                  const months = Math.round(days / 30);
                  return `${months} months (${days} days)`;
                })()}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField
              id="total_terms"
              label="Total Terms"
              error={formErrors.total_terms}
            >
              <Input
                id="total_terms"
                name="total_terms"
                type="number"
                min="1"
                max="12"
                placeholder="e.g., 2, 3, or 4"
                value={formState.total_terms?.toString() || ''}
                onChange={(e) => setFormState(prev => ({ 
                  ...prev, 
                  total_terms: e.target.value ? parseInt(e.target.value) : null 
                }))}
                className="focus:ring-[#8CC63F] focus:border-[#8CC63F]"
              />
            </FormField>

            <FormField
              id="current_term"
              label="Current Term"
              error={formErrors.current_term}
            >
              <Input
                id="current_term"
                name="current_term"
                type="number"
                min="1"
                max={formState.total_terms || 12}
                placeholder="e.g., 1"
                value={formState.current_term?.toString() || ''}
                onChange={(e) => setFormState(prev => ({ 
                  ...prev, 
                  current_term: e.target.value ? parseInt(e.target.value) : null 
                }))}
                disabled={!formState.total_terms}
                className="focus:border-[#8CC63F] focus:ring-[#8CC63F]"
              />
            </FormField>
          </div>

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
                    ? 'This will be the active academic year for the selected school(s)' 
                    : 'This year will not be set as current'}
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
        message={`Are you sure you want to delete ${yearsToDelete.length} academic year(s)? This action cannot be undone and may affect associated data such as classes and schedules.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}