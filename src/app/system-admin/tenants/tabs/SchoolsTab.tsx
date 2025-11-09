import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Plus, ImageOff } from 'lucide-react';
import { ActionButtons } from '../../../../components/shared/ActionButtons';
import { z } from 'zod';
import { supabase } from '../../../../lib/supabase';
import { DataTable } from '../../../../components/shared/DataTable';
import { FilterCard } from '../../../../components/shared/FilterCard';
import { SlideInForm } from '../../../../components/shared/SlideInForm';
import { FormField, Input, Select, Textarea } from '../../../../components/shared/FormField';
import { StatusBadge } from '../../../../components/shared/StatusBadge';
import { Button } from '../../../../components/shared/Button';
import { ImageUpload } from '../../../../components/shared/ImageUpload';
import { SearchableMultiSelect } from '../../../../components/shared/SearchableMultiSelect';
import { ConfirmationDialog } from '../../../../components/shared/ConfirmationDialog';
import { toast } from '../../../../components/shared/Toast';
import { Users, GraduationCap, Grid3x3 } from 'lucide-react';

const schoolSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().optional(),
  company_id: z.string().uuid('Please select a company'),
  logo: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive'])
});

interface FilterState {
  search: string;
  company_ids: string[];
  status: string[];
}

type School = {
  id: string;
  name: string;
  code: string | null;
  company_id: string;
  company_name: string;
  region_name: string;
  logo: string | null;
  address: string | null;
  notes: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  // Enhanced statistics
  branches_count?: number;
  students_count?: number;
  teachers_count?: number;
  admin_users_count?: number;
  grade_levels_count?: number;
  class_sections_count?: number;
};

type Company = {
  id: string;
  name: string;
  region_id: string;
  region_name: string;
  status: 'active' | 'inactive';
};

export default function SchoolsTab() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    company_ids: [],
    status: []
  });

  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [schoolsToDelete, setSchoolsToDelete] = useState<School[]>([]);

  // ===== CORRECTED LOGO HELPER FUNCTIONS =====
  
  // Get logo URL - handles both old and new path formats
  const getLogoUrl = (path: string | null) => {
    if (!path) return null;
    
    // If path is already a full URL, return it
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    // Get public URL from Supabase
    const { data } = supabase.storage
      .from('school-logos')
      .getPublicUrl(path);
    
    return data?.publicUrl || null;
  };

  // Delete logo from storage - handles both old and new formats
  const deleteLogoFromStorage = async (path: string | null): Promise<void> => {
    if (!path) return;
    
    try {
      // Try to delete with the stored path
      const { error } = await supabase.storage
        .from('school-logos')
        .remove([path]);
      
      if (error) {
        console.warn(`Failed to delete logo at: ${path}`, error);
        
        // If path has 'schools/' prefix, try without it
        if (path.startsWith('schools/')) {
          const fileNameOnly = path.replace('schools/', '');
          const { error: retryError } = await supabase.storage
            .from('school-logos')
            .remove([fileNameOnly]);
          
          if (retryError) {
            console.error(`Also failed to delete at: ${fileNameOnly}`, retryError);
          }
        } 
        // If path doesn't have prefix, try with it (for old files)
        else {
          const withPrefix = `schools/${path}`;
          const { error: retryError } = await supabase.storage
            .from('school-logos')
            .remove([withPrefix]);
          
          if (retryError) {
            console.error(`Also failed to delete at: ${withPrefix}`, retryError);
          }
        }
      }
    } catch (error) {
      console.error('Error deleting logo:', error);
    }
  };

  // Fetch companies with React Query
  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data: companiesData, error } = await supabase
        .from('companies')
        .select(`
          id,
          name,
          region_id
        `)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;

      // Fetch regions for companies
      let regionsData = { data: [] };
      if (companiesData && companiesData.length > 0) {
        const regionIds = [...new Set(companiesData.map(c => c.region_id))];
        regionsData = await supabase.from('regions').select('id, name').in('id', regionIds);
      }

      const regionMap = new Map(regionsData.data?.map(r => [r.id, r.name]) || []);

      return companiesData.map(company => ({
        ...company,
        region_name: regionMap.get(company.region_id) ?? 'Unknown Region',
        status: 'active' as const
      }));
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch schools with React Query
  const {
    data: schools = [],
    isLoading,
    isFetching
  } = useQuery<School[]>({
    queryKey: ['schools', filters],
    queryFn: async () => {
      console.log('=== SCHOOLS QUERY DEBUG START ===');

      // Check authentication status
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Auth session exists:', !!session);
      console.log('Auth user ID:', session?.user?.id);

      // Check if user is admin
      if (session?.user?.id) {
        const { data: adminCheck, error: adminCheckError } = await supabase
          .rpc('is_admin_user', { user_id: session.user.id });
        console.log('Is admin user:', adminCheck);
        if (adminCheckError) console.error('Admin check error:', adminCheckError);
      }

      let query = supabase
        .from('schools')
        .select(`
          id,
          name,
          code,
          company_id,
          logo,
          address,
          notes,
          status,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
      }

      if (filters.company_ids.length > 0) {
        query = query.in('company_id', filters.company_ids);
      }

      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      console.log('Executing schools query...');
      const { data, error } = await query;

      if (error) {
        console.error('❌ SCHOOLS QUERY ERROR:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('✅ Schools query successful. Count:', data?.length || 0);

      // Fetch related data separately
      const companyIds = [...new Set(data.map(item => item.company_id))];

      const [companiesData] = await Promise.all([
        companyIds.length > 0 ? supabase
          .from('companies')
          .select(`
            id,
            name,
            region_id
          `)
          .in('id', companyIds) : Promise.resolve({ data: [] })
      ]);

      // Fetch regions for companies
      let regionsData = { data: [] };
      if (companiesData.data && companiesData.data.length > 0) {
        const regionIds = [...new Set(companiesData.data.map(c => c.region_id))];
        regionsData = await supabase.from('regions').select('id, name').in('id', regionIds);
      }

      // Create lookup maps
      const regionMap = new Map(regionsData.data?.map(r => [r.id, r.name]) || []);
      const companyMap = new Map(companiesData.data?.map(c => [c.id, { name: c.name, region_id: c.region_id }]) || []);

      // Enhanced data fetching with statistics for each school
      const enhancedSchools = await Promise.all(data.map(async (school) => {
        const company = companyMap.get(school.company_id);
        
        // Fetch additional statistics for each school
        const [branchesCount, studentsCount, teachersCount, adminUsersCount, gradeLevelsCount, classSectionsCount] = await Promise.all([
          // Count branches
          supabase
            .from('branches')
            .select('id', { count: 'exact', head: true })
            .eq('school_id', school.id)
            .eq('status', 'active'),
          
          // Count students
          supabase
            .from('students')
            .select('id', { count: 'exact', head: true })
            .eq('school_id', school.id)
            .eq('is_active', true),
          
          // Count teachers
          supabase
            .from('teachers')
            .select('id', { count: 'exact', head: true })
            .eq('school_id', school.id)
            .eq('is_active', true),
          
          // Count admin users assigned to this school
          supabase
            .from('entity_admin_scope')
            .select('id', { count: 'exact', head: true })
            .eq('scope_type', 'school')
            .eq('scope_id', school.id)
            .eq('is_active', true),
          
          // Count grade levels
          supabase
            .from('grade_levels')
            .select('id', { count: 'exact', head: true })
            .eq('school_id', school.id)
            .eq('status', 'active'),
          
          // Count class sections (through grade levels)
          supabase
            .from('class_sections')
            .select(`
              id,
              grade_levels!inner(school_id)
            `, { count: 'exact', head: true })
            .eq('grade_levels.school_id', school.id)
            .eq('status', 'active')
        ]);
        
        return {
          ...school,
          company_name: company?.name ?? 'Unknown Company',
          region_name: company ? regionMap.get(company.region_id) ?? 'Unknown Region' : 'Unknown Region',
          // Enhanced statistics
          branches_count: branchesCount.count || 0,
          students_count: studentsCount.count || 0,
          teachers_count: teachersCount.count || 0,
          admin_users_count: adminUsersCount.count || 0,
          grade_levels_count: gradeLevelsCount.count || 0,
          class_sections_count: classSectionsCount.count || 0
        };
      }));

      console.log('=== SCHOOLS QUERY DEBUG END ===');
      return enhancedSchools;
    },
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    onError: (error: any) => {
        console.error('❌ SCHOOLS QUERY FAILED:', error);
        const errorMessage = error?.message || 'Unknown error';
        const errorCode = error?.code || 'N/A';
        const errorDetails = error?.details || 'No details available';

        console.error('Full error object:', JSON.stringify(error, null, 2));

        let userMessage = 'Failed to fetch schools';
        if (errorCode === 'PGRST301' || errorMessage.includes('policy')) {
          userMessage = 'Access denied. Please ensure you have proper permissions.';
        } else if (errorCode === '42501') {
          userMessage = 'Permission denied. Contact your administrator.';
        }

        toast.error(`${userMessage} (Code: ${errorCode})`);
      }
  });

  // Create/update school mutation
  const schoolMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const data = {
        name: formData.get('name') as string,
        code: formData.get('code') as string || undefined,
        company_id: formData.get('company_id') as string,
        logo: formData.get('logo') as string || undefined,
        address: formData.get('address') as string || undefined,
        notes: formData.get('notes') as string || undefined,
        status: formData.get('status') as 'active' | 'inactive'
      };

      // Validate with zod
      schoolSchema.parse(data);

      if (editingSchool) {
        const { error } = await supabase
          .from('schools')
          .update(data)
          .eq('id', editingSchool.id);

        if (error) throw error;
        return { ...editingSchool, ...data };
      } else {
        const { data: newSchool, error } = await supabase
          .from('schools')
          .insert([data])
          .select()
          .single();

        if (error) throw error;
        return newSchool;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      setIsFormOpen(false);
      setEditingSchool(null);
      setFormErrors({});
      toast.success(`School ${editingSchool ? 'updated' : 'created'} successfully`);
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
        console.error('Error saving school:', error);
        setFormErrors({ form: 'Failed to save school. Please try again.' });
        toast.error('Failed to save school');
      }
    }
  });

  // CORRECTED Delete school mutation
  const deleteMutation = useMutation({
    mutationFn: async (schools: School[]) => {
      // Delete logos from storage
      for (const school of schools) {
        await deleteLogoFromStorage(school.logo);
      }

      // Delete schools from database (cascade will handle related records)
      const { error } = await supabase
        .from('schools')
        .delete()
        .in('id', schools.map(s => s.id));

      if (error) throw error;
      return schools;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      setIsConfirmDialogOpen(false);
      setSchoolsToDelete([]);
      toast.success('School(s) deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting schools:', error);
      toast.error('Failed to delete school(s)');
      setIsConfirmDialogOpen(false);
      setSchoolsToDelete([]);
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    schoolMutation.mutate(new FormData(e.currentTarget));
  };

  const handleDelete = (schools: School[]) => {
    setSchoolsToDelete(schools);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(schoolsToDelete);
  };

  const cancelDelete = () => {
    setIsConfirmDialogOpen(false);
    setSchoolsToDelete([]);
  };

  const columns = [
    {
      id: 'logo',
      header: 'Logo',
      enableSorting: false,
      cell: (row: School) => (
        <div className="w-10 h-10 flex items-center justify-center">
          {row.logo ? (
            <img
              src={getLogoUrl(row.logo)}
              alt={`${row.name} logo`}
              className="w-10 h-10 object-contain rounded-md"
              onError={(e) => {
                console.error('Failed to load logo:', row.logo);
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center">
              <ImageOff className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'name',
      header: 'Name',
      enableSorting: true,
      cell: (row: School) => (
        <div className="space-y-3">
          {/* School Header */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="font-semibold text-gray-900 dark:text-white text-lg">
                {row.name}
              </div>
              {row.code && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Code: {row.code}
                </div>
              )}
            </div>
            <StatusBadge status={row.status} />
          </div>
          
          {/* Enhanced Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {/* Branches */}
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center border border-purple-200 dark:border-purple-800">
              <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {row.branches_count || 0}
              </div>
              <div className="text-xs text-purple-700 dark:text-purple-300">Branches</div>
            </div>
            
            {/* Students */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center border border-blue-200 dark:border-blue-800">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {row.students_count || 0}
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300">Students</div>
            </div>
            
            {/* Teachers */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center border border-green-200 dark:border-green-800">
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {row.teachers_count || 0}
              </div>
              <div className="text-xs text-green-700 dark:text-green-300">Teachers</div>
            </div>
            
            {/* Admin Users */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 text-center border border-indigo-200 dark:border-indigo-800">
              <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                {row.admin_users_count || 0}
              </div>
              <div className="text-xs text-indigo-700 dark:text-indigo-300 flex items-center justify-center gap-1">
                <Users className="w-3 h-3" />
                Users
              </div>
            </div>
            
            {/* Grade Levels */}
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center border border-orange-200 dark:border-orange-800">
              <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                {row.grade_levels_count || 0}
              </div>
              <div className="text-xs text-orange-700 dark:text-orange-300 flex items-center justify-center gap-1">
                <GraduationCap className="w-3 h-3" />
                Grades
              </div>
            </div>
            
            {/* Class Sections */}
            <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-3 text-center border border-teal-200 dark:border-teal-800">
              <div className="text-lg font-bold text-teal-600 dark:text-teal-400">
                {row.class_sections_count || 0}
              </div>
              <div className="text-xs text-teal-700 dark:text-teal-300 flex items-center justify-center gap-1">
                <Grid3x3 className="w-3 h-3" />
                Sections
              </div>
            </div>
          </div>
          
          {/* School Details */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <div>Company: {row.company_name}</div>
            <div>Region: {row.region_name}</div>
            <div>Created: {new Date(row.created_at).toLocaleDateString()}</div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Schools</h2>
        <Button
          onClick={() => {
            setEditingSchool(null);
            setIsFormOpen(true);
          }}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add School
        </Button>
      </div>

      <FilterCard
        title="Filters"
        onApply={() => {}} // No need for explicit apply with React Query
        onClear={() => {
          setFilters({
            search: '',
            company_ids: [],
            status: []
          });
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            id="search"
            label="Search"
          >
            <Input
              id="search"
              placeholder="Search by name or code..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </FormField>

          <SearchableMultiSelect
            label="Company"
            options={companies.map(c => ({
              value: c.id,
              label: `${c.name} (${c.region_name})`
            }))}
            selectedValues={filters.company_ids}
            onChange={(values) => setFilters({ ...filters, company_ids: values })}
            placeholder="Select companies..."
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
        data={schools}
        columns={columns}
        keyField="id"
        caption="List of schools with their company associations and status"
        ariaLabel="Schools data table"
        loading={isLoading}
        isFetching={isFetching}
        onEdit={(school) => {
          setEditingSchool(school);
          setIsFormOpen(true);
        }}
        onDelete={handleDelete}
        emptyMessage="No schools found"
        getRowClassName={() => "!p-0"}
      />

      <SlideInForm
        key={editingSchool?.id || 'new'}
        title={editingSchool ? 'Edit School' : 'Create School'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingSchool(null);
          setFormErrors({});
        }}
        onSave={() => {
          const form = document.querySelector('form');
          if (form) form.requestSubmit();
        }}
        loading={schoolMutation.isLoading}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.form && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {formErrors.form}
            </div>
          )}

          <FormField
            id="name"
            label="Name"
            required
            error={formErrors.name}
          >
            <Input
              id="name"
              name="name"
              placeholder="Enter school name"
              defaultValue={editingSchool?.name}
            />
          </FormField>

          <FormField
            id="code"
            label="Code"
            error={formErrors.code}
          >
            <Input
              id="code"
              name="code"
              placeholder="Enter school code"
              defaultValue={editingSchool?.code || ''}
            />
          </FormField>

          <FormField
            id="company_id"
            label="Company"
            required
            error={formErrors.company_id}
          >
            <Select
              id="company_id"
              name="company_id"
              options={companies.map(company => ({
                value: company.id,
                label: `${company.name} (${company.region_name})`
              }))}
              defaultValue={editingSchool?.company_id || ''}
            />
          </FormField>

          <FormField
            id="logo"
            label="School Logo"
          >
            <input
              type="hidden"
              name="logo"
              value={editingSchool?.logo || ''}
            />
            <ImageUpload
              id="logo"
              bucket="school-logos"
              value={editingSchool?.logo}
              publicUrl={editingSchool?.logo ? getLogoUrl(editingSchool.logo) : null}
              onChange={(path) => {
                const input = document.querySelector('input[name="logo"]') as HTMLInputElement;
                if (input) input.value = path || '';
              }}
            />
          </FormField>

          <FormField
            id="address"
            label="Address"
            error={formErrors.address}
          >
            <Textarea
              id="address"
              name="address"
              placeholder="Enter school address"
              defaultValue={editingSchool?.address || ''}
              rows={3}
            />
          </FormField>

          <FormField
            id="notes"
            label="Notes"
            error={formErrors.notes}
          >
            <Textarea
              id="notes"
              name="notes"
              placeholder="Enter school notes"
              defaultValue={editingSchool?.notes || ''}
              rows={3}
            />
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
                { value: 'inactive', label: 'Inactive' }
              ]}
              defaultValue={editingSchool?.status || 'active'}
            />
          </FormField>
        </form>
      </SlideInForm>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        title="Delete School"
        message={`Are you sure you want to delete ${schoolsToDelete.length} school(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}