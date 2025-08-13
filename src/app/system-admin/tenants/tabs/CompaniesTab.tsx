// /src/app/system-admin/tenants/tabs/CompaniesTab.tsx

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ImageOff, UserPlus, Shield, AlertCircle, Edit, Trash2, Users, X, Mail, Phone, Briefcase, Building, Check, Calendar, Hash, Globe, Key } from 'lucide-react';
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
import { PhoneInput } from '../../../../components/shared/PhoneInput';

const companySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().optional(),
  region_id: z.string().uuid('Please select a region'),
  country_id: z.string().uuid('Please select a country'),
  logo: z.union([z.string(), z.null()]).optional(),
  address: z.string().optional(),
  notes: z.union([z.string(), z.null()]).optional(),
  status: z.enum(['active', 'inactive'])
});

// Tenant Admin Schema
const tenantAdminSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  employee_id: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

interface FilterState {
  search: string;
  region_ids: string[];
  country_ids: string[];
  status: string[];
}

type Company = {
  id: string;
  name: string;
  code: string | null;
  region_id: string;
  region_name: string;
  country_id: string;
  country_name: string;
  logo: string | null;
  address: string | null;
  notes: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  admin_count?: number;
  entity_users?: any[];
};

type Region = {
  id: string;
  name: string;
  status: 'active' | 'inactive';
};

type Country = {
  id: string;
  name: string;
  region_id: string;
  status: 'active' | 'inactive';
};

interface FormState {
  name: string;
  code: string;
  region_id: string;
  country_id: string;
  logo: string;
  address: string;
  notes: string;
  status: 'active' | 'inactive';
}

interface TenantAdminFormData {
  email: string;
  phone: string;
  position: string;
  department: string;
  employee_id: string;
  password: string;
  confirmPassword: string;
}

export default function CompaniesTab() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    region_ids: [],
    country_ids: [],
    status: []
  });

  // Confirmation dialog state
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [companiesToDelete, setCompaniesToDelete] = useState<Company[]>([]);

  // Tenant Admin state
  const [isAdminFormOpen, setIsAdminFormOpen] = useState(false);
  const [selectedCompanyForAdmin, setSelectedCompanyForAdmin] = useState<Company | null>(null);
  const [adminFormErrors, setAdminFormErrors] = useState<Record<string, string>>({});
  const [adminFormState, setAdminFormState] = useState<TenantAdminFormData>({
    email: '',
    phone: '',
    position: '',
    department: '',
    employee_id: '',
    password: '',
    confirmPassword: ''
  });

  // View/Manage Admins state
  const [isViewAdminsOpen, setIsViewAdminsOpen] = useState(false);
  const [selectedCompanyForView, setSelectedCompanyForView] = useState<Company | null>(null);
  const [companyAdmins, setCompanyAdmins] = useState<any[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [returnToViewAfterAdd, setReturnToViewAfterAdd] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [editAdminData, setEditAdminData] = useState<any>({});

  const [formState, setFormState] = useState<FormState>({
    name: '',
    code: '',
    region_id: '',
    country_id: '',
    logo: '',
    address: '',
    notes: '',
    status: 'active'
  });

  // Fetch regions
  const { data: regions = [] } = useQuery<Region[]>(
    ['regions'],
    async () => {
      const { data, error } = await supabase
        .from('regions')
        .select('id, name, status')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data || [];
    },
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  // Fetch countries based on selected regions for filter
  const { data: filterCountries = [] } = useQuery<Country[]>(
    ['filter-countries', filters.region_ids],
    async () => {
      let query = supabase
        .from('countries')
        .select('id, name, region_id, status')
        .or('status.eq.active,status.eq.Active')
        .order('name');

      if (filters.region_ids.length > 0) {
        query = query.in('region_id', filters.region_ids);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(country => ({
        ...country,
        status: country.status?.toLowerCase() as 'active' | 'inactive'
      }));
    },
    {
      staleTime: 5 * 60 * 1000,
    }
  );

  // Fetch countries for the form based on selected region
  const { data: formCountries = [] } = useQuery<Country[]>(
    ['form-countries', formState.region_id],
    async () => {
      if (!formState.region_id) return [];

      const { data, error } = await supabase
        .from('countries')
        .select('id, name, region_id, status')
        .eq('region_id', formState.region_id)
        .or('status.eq.active,status.eq.Active')
        .order('name');

      if (error) throw error;
      
      return (data || []).map(country => ({
        ...country,
        status: country.status?.toLowerCase() as 'active' | 'inactive'
      }));
    },
    {
      enabled: !!formState.region_id,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Fetch companies with filters
  const { 
    data: companies = [], 
    isLoading, 
    isFetching 
  } = useQuery<Company[]>(
    ['companies', filters],
    async () => {
      let query = supabase
        .from('companies')
        .select(`
          id,
          name,
          code,
          region_id,
          country_id,
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

      if (filters.region_ids.length > 0) {
        const regionIds = filters.region_ids.filter(id => typeof id === 'string' && id.trim() !== '');
        if (regionIds.length > 0) {
          query = query.in('region_id', regionIds);
        }
      }

      if (filters.country_ids.length > 0) {
        const countryIds = filters.country_ids.filter(id => typeof id === 'string' && id.trim() !== '');
        if (countryIds.length > 0) {
          query = query.in('country_id', countryIds);
        }
      }

      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch related data separately
      const companyIds = data?.map(item => item.id) || [];
      const regionIds = [...new Set(data?.map(item => item.region_id) || [])].filter(Boolean);
      const countryIds = [...new Set(data?.map(item => item.country_id) || [])].filter(Boolean);

      const [regionsData, countriesData, adminCounts] = await Promise.all([
        regionIds.length > 0 ? supabase.from('regions').select('id, name').in('id', regionIds) : Promise.resolve({ data: [] }),
        countryIds.length > 0 ? supabase.from('countries').select('id, name').in('id', countryIds) : Promise.resolve({ data: [] }),
        companyIds.length > 0 ? supabase
          .from('entity_users')
          .select('company_id')
          .in('company_id', companyIds)
          .eq('is_company_admin', true) : Promise.resolve({ data: [] })
      ]);

      // Create lookup maps
      const regionMap = new Map(regionsData.data?.map(r => [r.id, r.name]) || []);
      const countryMap = new Map(countriesData.data?.map(c => [c.id, c.name]) || []);
      
      // Count admins per company
      const adminCountMap = new Map();
      adminCounts.data?.forEach(item => {
        const count = adminCountMap.get(item.company_id) || 0;
        adminCountMap.set(item.company_id, count + 1);
      });

      return (data || []).map(company => ({
        ...company,
        region_name: regionMap.get(company.region_id) || 'Unknown Region',
        country_name: countryMap.get(company.country_id) || 'Unknown Country',
        admin_count: adminCountMap.get(company.id) || 0
      }));
    },
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000,
    }
  );

  // Create/update company mutation
  const mutation = useMutation(
    async (formData: FormState) => {
      const data = {
        name: formData.name.trim(),
        code: formData.code.trim() || null,
        region_id: formData.region_id,
        country_id: formData.country_id,
        logo: formData.logo || null,
        address: formData.address.trim() || null,
        notes: formData.notes.trim() || null,
        status: formData.status
      };

      companySchema.parse(data);

      if (editingCompany) {
        const { error } = await supabase
          .from('companies')
          .update(data)
          .eq('id', editingCompany.id);

        if (error) throw error;
        return { ...editingCompany, ...data };
      } else {
        const { data: newCompany, error } = await supabase
          .from('companies')
          .insert([data])
          .select()
          .single();

        if (error) throw error;
        return newCompany;
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['companies']);
        setIsFormOpen(false);
        setEditingCompany(null);
        setFormErrors({});
        toast.success(`Company ${editingCompany ? 'updated' : 'created'} successfully`);
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
          console.error('Error saving company:', error);
          setFormErrors({ form: 'Failed to save company. Please try again.' });
          toast.error('Failed to save company');
        }
      }
    }
  );

  // Create tenant admin mutation - FIXED to properly use Supabase Auth
  const tenantAdminMutation = useMutation(
    async (formData: TenantAdminFormData) => {
      // Validate with zod
      tenantAdminSchema.parse(formData);

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Please enter a valid email address');
      }

      if (!selectedCompanyForAdmin?.id) {
        throw new Error('No company selected');
      }

      const companyId = selectedCompanyForAdmin.id;

      // Step 1: Check if email already exists in auth.users via the users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', formData.email)
        .maybeSingle();

      if (existingUser) {
        // User exists, check if they're already linked to this company
        const { data: existingEntityUser } = await supabase
          .from('entity_users')
          .select('id')
          .eq('user_id', existingUser.id)
          .eq('company_id', companyId)
          .maybeSingle();

        if (existingEntityUser) {
          throw new Error('This user is already associated with this company');
        }

        // Link existing user to company as admin
        const { error: linkError } = await supabase
          .from('entity_users')
          .insert([{
            user_id: existingUser.id,
            company_id: companyId,
            position: formData.position || 'Administrator',
            department: formData.department || 'Management',
            employee_id: formData.employee_id || null,
            hire_date: new Date().toISOString().split('T')[0],
            is_company_admin: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);

        if (linkError) throw linkError;

        return { type: 'linked', user: existingUser };
      }

      // Step 2: Create new user using Supabase Auth
      // Use signUp to create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.email.split('@')[0],
            phone: formData.phone,
            user_type: 'entity',
            company_id: companyId,
            position: formData.position,
            department: formData.department
          },
          emailRedirectTo: undefined // Disable email confirmation for admin-created users
        }
      });

      if (authError) {
        console.error('Auth error:', authError);
        
        // Check if it's a rate limit or email issue
        if (authError.message?.includes('rate limit') || authError.message?.includes('email')) {
          // For development/testing, inform the user
          throw new Error('Unable to send confirmation email. User creation may be rate limited. Please try again later.');
        }
        throw authError;
      }

      if (!authData?.user) {
        throw new Error('Failed to create user account');
      }

      const userId = authData.user.id;

      // Step 3: Create or update users table record
      // Check if trigger already created the user record
      let { data: userRecord } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!userRecord) {
        // Create user record if trigger didn't
        const { data: newUserRecord, error: createUserError } = await supabase
          .from('users')
          .insert([{
            id: userId,
            email: formData.email,
            phone: formData.phone || null,
            user_type: 'entity',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_sign_in_at: null,
            raw_app_meta_data: authData.user.app_metadata || {},
            raw_user_meta_data: authData.user.user_metadata || {}
          }])
          .select()
          .single();

        if (createUserError) {
          console.error('Failed to create user record:', createUserError);
          // Try to clean up auth user
          try {
            // Note: We can't delete auth users from client-side
            // This would need a server-side function
          } catch (e) {
            console.error('Failed to clean up auth user:', e);
          }
          throw new Error(`Failed to create user record: ${createUserError.message}`);
        }
        userRecord = newUserRecord;
      }

      // Step 4: Create entity_users record
      const { data: entityUser, error: entityError } = await supabase
        .from('entity_users')
        .insert([{
          user_id: userId,
          company_id: companyId,
          position: formData.position || 'Administrator',
          department: formData.department || 'Management',
          employee_id: formData.employee_id || null,
          hire_date: new Date().toISOString().split('T')[0],
          is_company_admin: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (entityError) {
        console.error('Failed to create entity_users record:', entityError);
        
        // Clean up: delete user record
        await supabase.from('users').delete().eq('id', userId);
        
        throw new Error(`Failed to link user to company: ${entityError.message}`);
      }

      return { type: 'created', user: authData.user };
    },
    {
      onSuccess: (result) => {
        const companyName = selectedCompanyForAdmin?.name;
        const companyId = selectedCompanyForAdmin?.id;
        
        queryClient.invalidateQueries(['companies']);
        setIsAdminFormOpen(false);
        setSelectedCompanyForAdmin(null);
        setAdminFormErrors({});
        resetAdminForm();
        
        // Return to View Admins modal if we came from there
        if (returnToViewAfterAdd && selectedCompanyForView && companyId) {
          fetchCompanyAdmins(companyId);
          setIsViewAdminsOpen(true);
          setReturnToViewAfterAdd(false);
        }
        
        if (result.type === 'linked') {
          toast.success(`Existing user linked as tenant admin for ${companyName}`);
        } else {
          toast.success(`Tenant admin created for ${companyName}. They will receive an email to confirm their account.`);
        }
      },
      onError: (error: any) => {
        if (error instanceof z.ZodError) {
          const errors: Record<string, string> = {};
          error.errors.forEach((err) => {
            if (err.path.length > 0) {
              errors[err.path[0]] = err.message;
            }
          });
          setAdminFormErrors(errors);
        } else {
          console.error('Error creating tenant admin:', error);
          const errorMessage = error.message || 'Failed to create tenant admin';
          setAdminFormErrors({ form: errorMessage });
          toast.error(errorMessage);
        }
      }
    }
  );

  // Delete company mutation
  const deleteMutation = useMutation(
    async (companies: Company[]) => {
      // Delete logos from storage
      for (const company of companies) {
        if (company.logo) {
          const logoPath = company.logo.split('/').pop();
          if (logoPath) {
            await supabase.storage
              .from('company-logos')
              .remove([logoPath]);
          }
        }
      }

      // Delete companies from database
      const { error } = await supabase
        .from('companies')
        .delete()
        .in('id', companies.map(c => c.id));

      if (error) throw error;
      return companies;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['companies']);
        setIsConfirmDialogOpen(false);
        setCompaniesToDelete([]);
        toast.success('Company(s) deleted successfully');
      },
      onError: (error) => {
        console.error('Error deleting companies:', error);
        toast.error('Failed to delete company(s)');
        setIsConfirmDialogOpen(false);
        setCompaniesToDelete([]);
      }
    }
  );

  // Reset admin form
  const resetAdminForm = () => {
    setAdminFormState({
      email: '',
      phone: '',
      position: '',
      department: '',
      employee_id: '',
      password: '',
      confirmPassword: ''
    });
    setAdminFormErrors({});
  };

  // Fetch company admins
  const fetchCompanyAdmins = async (companyId: string) => {
    setLoadingAdmins(true);
    try {
      // First fetch entity_users
      const { data: entityUsers, error: entityError } = await supabase
        .from('entity_users')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_company_admin', true)
        .order('created_at', { ascending: false });

      if (entityError) throw entityError;

      if (!entityUsers || entityUsers.length === 0) {
        setCompanyAdmins([]);
        return;
      }

      // Then fetch user details separately
      const userIds = entityUsers.map(eu => eu.user_id);
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .in('id', userIds);

      if (usersError) throw usersError;

      // Create a map of users
      const userMap = new Map(users?.map(u => [u.id, u]) || []);

      // Combine the data
      const adminsWithUsers = entityUsers.map(entityUser => ({
        ...entityUser,
        users: userMap.get(entityUser.user_id) || null
      }));

      setCompanyAdmins(adminsWithUsers);
    } catch (error) {
      console.error('Error fetching company admins:', error);
      toast.error('Failed to fetch company admins');
      setCompanyAdmins([]);
    } finally {
      setLoadingAdmins(false);
    }
  };

  // Update admin mutation
  const updateAdminMutation = useMutation(
    async ({ entityUserId, data }: { entityUserId: string; data: any }) => {
      // Update entity_users record
      const { error: entityError } = await supabase
        .from('entity_users')
        .update({
          position: data.position,
          department: data.department,
          employee_id: data.employee_id,
          hire_date: data.hire_date,
          updated_at: new Date().toISOString()
        })
        .eq('id', entityUserId);

      if (entityError) throw entityError;

      // Update user record (email and phone)
      if (data.email || data.phone !== undefined) {
        const updates: any = {
          updated_at: new Date().toISOString()
        };
        
        if (data.email) updates.email = data.email;
        if (data.phone !== undefined) updates.phone = data.phone;
        
        const { error: userError } = await supabase
          .from('users')
          .update(updates)
          .eq('id', data.user_id);

        if (userError) throw userError;
      }

      return { success: true };
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['companies']);
        if (selectedCompanyForView?.id) {
          fetchCompanyAdmins(selectedCompanyForView.id);
        }
        setEditingAdminId(null);
        toast.success('Admin updated successfully');
      },
      onError: (error) => {
        console.error('Error updating admin:', error);
        toast.error('Failed to update admin');
      }
    }
  );

  // Remove admin mutation
  const removeAdminMutation = useMutation(
    async ({ entityUserId, userId }: { entityUserId: string; userId: string }) => {
      // Remove from entity_users
      const { error } = await supabase
        .from('entity_users')
        .delete()
        .eq('id', entityUserId);

      if (error) throw error;

      return { entityUserId };
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['companies']);
        if (selectedCompanyForView?.id) {
          fetchCompanyAdmins(selectedCompanyForView.id);
        }
        toast.success('Admin removed successfully');
      },
      onError: (error) => {
        console.error('Error removing admin:', error);
        toast.error('Failed to remove admin');
      }
    }
  );

  // Update form state when editing company changes
  React.useEffect(() => {
    if (editingCompany) {
      setFormState({
        name: editingCompany.name,
        code: editingCompany.code || '',
        region_id: editingCompany.region_id,
        country_id: editingCompany.country_id,
        logo: editingCompany.logo || '',
        address: editingCompany.address || '',
        notes: editingCompany.notes || '',
        status: editingCompany.status
      });
    } else {
      setFormState({
        name: '',
        code: '',
        region_id: '',
        country_id: '',
        logo: '',
        address: '',
        notes: '',
        status: 'active'
      });
    }
  }, [editingCompany]);

  // Reset admin form when modal closes
  React.useEffect(() => {
    if (!isAdminFormOpen) {
      resetAdminForm();
    }
  }, [isAdminFormOpen]);

  const getLogoUrl = (path: string | null) => {
    if (!path) return null;
    
    // If path is already a full URL, return it
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    // Otherwise, get public URL from Supabase storage
    const { data } = supabase.storage
      .from('company-logos')
      .getPublicUrl(path);
    
    return data?.publicUrl || null;
  };

  const handleRegionChange = (regionId: string) => {
    setFormState(prev => ({
      ...prev,
      region_id: regionId,
      country_id: '' // Reset country when region changes
    }));
  };

  const handleCountryChange = (countryId: string) => {
    setFormState(prev => ({
      ...prev,
      country_id: countryId
    }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors({});
    mutation.mutate(formState);
  };

  const handleAdminSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAdminFormErrors({});
    tenantAdminMutation.mutate(adminFormState);
  };

  const handleDelete = (companies: Company[]) => {
    setCompaniesToDelete(companies);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(companiesToDelete);
  };

  const cancelDelete = () => {
    setIsConfirmDialogOpen(false);
    setCompaniesToDelete([]);
  };

  const columns = [
    {
      id: 'logo',
      header: 'Logo',
      enableSorting: false,
      cell: (row: Company) => (
        <div className="w-10 h-10 flex items-center justify-center">
          {row.logo ? (
            <img
              src={getLogoUrl(row.logo)}
              alt={`${row.name} logo`}
              className="w-10 h-10 object-contain rounded-md"
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
      accessorKey: 'name',
      enableSorting: true,
      cell: (row: Company) => (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {row.name}
          </span>
          {row.admin_count && row.admin_count > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
              {row.admin_count} admin{row.admin_count > 1 ? 's' : ''}
            </span>
          )}
        </div>
      ),
    },
    {
      id: 'code',
      header: 'Code',
      accessorKey: 'code',
      enableSorting: true,
      cell: (row: Company) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {row.code || '-'}
        </span>
      ),
    },
    {
      id: 'region',
      header: 'Region',
      accessorKey: 'region_name',
      enableSorting: true,
    },
    {
      id: 'country',
      header: 'Country',
      accessorKey: 'country_name',
      enableSorting: true,
    },
    {
      id: 'admins',
      header: 'Admins',
      accessorKey: 'admin_count',
      enableSorting: true,
      cell: (row: Company) => (
        <div className="flex items-center justify-center gap-1">
          <Users className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {row.admin_count || 0}
          </span>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      enableSorting: true,
      cell: (row: Company) => (
        <StatusBadge status={row.status} />
      ),
    },
    {
      id: 'created_at',
      header: 'Created At',
      accessorKey: 'created_at',
      enableSorting: true,
      cell: (row: Company) => (
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Companies</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {companies.length} companies • {companies.reduce((acc, c) => acc + (c.admin_count || 0), 0)} total admins
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingCompany(null);
            setIsFormOpen(true);
          }}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add Company
        </Button>
      </div>

      <FilterCard
        title="Filters"
        onApply={() => {}}
        onClear={() => {
          setFilters({
            search: '',
            region_ids: [],
            country_ids: [],
            status: []
          });
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            label="Region"
            options={regions.map(r => ({
              value: r.id,
              label: r.name
            }))}
            selectedValues={filters.region_ids}
            onChange={(values) => setFilters({ ...filters, region_ids: values, country_ids: [] })}
            placeholder="Select regions..."
          />

          <SearchableMultiSelect
            label="Country"
            options={filterCountries.map(c => ({
              value: c.id,
              label: c.name
            }))}
            selectedValues={filters.country_ids}
            onChange={(values) => setFilters({ ...filters, country_ids: values })}
            disabled={filters.region_ids.length === 0}
            placeholder="Select countries..."
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
        data={companies}
        columns={columns}
        keyField="id"
        caption="List of companies with their details and status"
        ariaLabel="Companies data table"
        loading={isLoading}
        isFetching={isFetching}
        renderActions={(company) => (
          <div className="flex items-center justify-end gap-1">
            {/* View/Manage Admins Button */}
            <button
              onClick={() => {
                setSelectedCompanyForView(company);
                setIsViewAdminsOpen(true);
                fetchCompanyAdmins(company.id);
              }}
              className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20 rounded-lg transition-colors relative group"
              title={`View/Manage Admins (${company.admin_count || 0})`}
            >
              <Users className="h-4 w-4" />
              {company.admin_count && company.admin_count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-green-600 rounded-full"></span>
              )}
            </button>
            
            {/* Add Tenant Admin Button */}
            <button
              onClick={() => {
                setSelectedCompanyForAdmin(company);
                setIsAdminFormOpen(true);
              }}
              className="p-1.5 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
              title="Add Tenant Admin"
            >
              <UserPlus className="h-4 w-4" />
            </button>
            
            {/* Edit Button */}
            <button
              onClick={() => {
                setEditingCompany(company);
                setIsFormOpen(true);
              }}
              className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Edit Company"
            >
              <Edit className="h-4 w-4" />
            </button>
            
            {/* Delete Button */}
            <button
              onClick={() => handleDelete([company])}
              className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Delete Company"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
        emptyMessage="No companies found"
      />

      <SlideInForm
        key={editingCompany?.id || 'new'}
        title={editingCompany ? 'Edit Company' : 'Create Company'}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingCompany(null);
          setFormErrors({});
        }}
        onSave={() => {
          const form = document.querySelector('form#company-form');
          if (form) form.requestSubmit();
        }}
        loading={mutation.isLoading}
      >
        <form id="company-form" onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="Enter company name"
              value={formState.name}
              onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
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
              placeholder="Enter company code"
              value={formState.code}
              onChange={(e) => setFormState(prev => ({ ...prev, code: e.target.value }))}
            />
          </FormField>

          <FormField
            id="region_id"
            label="Region"
            required
            error={formErrors.region_id}
          >
            <Select
              id="region_id"
              name="region_id"
              options={regions.map(region => ({
                value: region.id,
                label: region.name
              }))}
              value={formState.region_id}
              onChange={(value) => handleRegionChange(value)}
            />
          </FormField>

          <FormField
            id="country_id"
            label="Country"
            required
            error={formErrors.country_id}
          >
            <Select
              id="country_id"
              name="country_id"
              options={(formCountries || []).map(country => ({
                value: country.id,
                label: country.name
              }))}
              value={formState.country_id}
              onChange={(value) => handleCountryChange(value)}
              disabled={!formState.region_id}
            />
          </FormField>

          <FormField
            id="logo"
            label="Company Logo"
          >
            <input
              type="hidden"
              name="logo"
              value={formState.logo}
            />
            <ImageUpload
              id="logo"
              bucket="company-logos"
              value={formState.logo}
              publicUrl={formState.logo ? getLogoUrl(formState.logo) : null}
              onChange={(path) => {
                setFormState(prev => ({ ...prev, logo: path || '' }));
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
              placeholder="Enter company address"
              value={formState.address}
              onChange={(e) => setFormState(prev => ({ ...prev, address: e.target.value }))}
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
              placeholder="Enter company notes"
              value={formState.notes}
              onChange={(e) => setFormState(prev => ({ ...prev, notes: e.target.value }))}
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
              value={formState.status}
              onChange={(value) => setFormState(prev => ({ ...prev, status: value as 'active' | 'inactive' }))}
            />
          </FormField>
        </form>
      </SlideInForm>

      {/* Tenant Admin Form */}
      <SlideInForm
        key={selectedCompanyForAdmin?.id || 'admin-new'}
        title={`Add Tenant Admin for ${selectedCompanyForAdmin?.name || ''}`}
        isOpen={isAdminFormOpen}
        onClose={() => {
          setIsAdminFormOpen(false);
          setSelectedCompanyForAdmin(null);
          resetAdminForm();
          setReturnToViewAfterAdd(false);
        }}
        onSave={() => {
          const form = document.querySelector('form#admin-form');
          if (form) form.requestSubmit();
        }}
        loading={tenantAdminMutation.isLoading}
      >
        <form id="admin-form" onSubmit={handleAdminSubmit} className="space-y-6">
          {adminFormErrors.form && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md flex items-start gap-2">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <span>{adminFormErrors.form}</span>
            </div>
          )}

          {/* Account Information Section */}
          <div className="space-y-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Account Information</h3>
            
            <FormField
              id="tenant-email"
              label="Email Address"
              required
              error={adminFormErrors.email}
            >
              <Input
                id="tenant-email"
                type="email"
                value={adminFormState.email}
                onChange={(e) => setAdminFormState(prev => ({ ...prev, email: e.target.value }))}
                placeholder="admin@company.com"
              />
            </FormField>

            <FormField
              id="tenant-phone"
              label="Phone Number"
              error={adminFormErrors.phone}
            >
              <PhoneInput
                value={adminFormState.phone}
                onChange={(value) => setAdminFormState(prev => ({ ...prev, phone: value }))}
                placeholder="XXXX XXXX"
              />
            </FormField>
          </div>

          {/* Employee Information Section */}
          <div className="space-y-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Employee Information</h3>
            
            <FormField
              id="tenant-position"
              label="Position"
              error={adminFormErrors.position}
            >
              <Input
                id="tenant-position"
                type="text"
                value={adminFormState.position}
                onChange={(e) => setAdminFormState(prev => ({ ...prev, position: e.target.value }))}
                placeholder="e.g., IT Administrator"
              />
            </FormField>

            <FormField
              id="tenant-department"
              label="Department"
              error={adminFormErrors.department}
            >
              <Input
                id="tenant-department"
                type="text"
                value={adminFormState.department}
                onChange={(e) => setAdminFormState(prev => ({ ...prev, department: e.target.value }))}
                placeholder="e.g., Information Technology"
              />
            </FormField>

            <FormField
              id="tenant-employee-id"
              label="Employee ID"
              error={adminFormErrors.employee_id}
            >
              <Input
                id="tenant-employee-id"
                type="text"
                value={adminFormState.employee_id}
                onChange={(e) => setAdminFormState(prev => ({ ...prev, employee_id: e.target.value }))}
                placeholder="e.g., EMP001"
              />
            </FormField>
          </div>

          {/* Password Section */}
          <div className="space-y-4 pb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Security</h3>
            
            <FormField
              id="tenant-password"
              label="Password"
              required
              error={adminFormErrors.password}
            >
              <Input
                id="tenant-password"
                type="password"
                value={adminFormState.password}
                onChange={(e) => setAdminFormState(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Minimum 8 characters"
              />
            </FormField>

            <FormField
              id="tenant-confirm-password"
              label="Confirm Password"
              required
              error={adminFormErrors.confirmPassword}
            >
              <Input
                id="tenant-confirm-password"
                type="password"
                value={adminFormState.confirmPassword}
                onChange={(e) => setAdminFormState(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Re-enter password"
              />
            </FormField>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-2">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Company Administrator Access
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  This user will be set as a company administrator with full access to:
                </p>
                <ul className="text-xs text-blue-700 dark:text-blue-300 mt-2 list-disc list-inside space-y-1">
                  <li>Manage company settings and data</li>
                  <li>Access all company modules</li>
                  <li>Manage other company users</li>
                  <li>View company reports and analytics</li>
                </ul>
              </div>
            </div>
          </div>
        </form>
      </SlideInForm>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        title="Delete Company"
        message={`Are you sure you want to delete ${companiesToDelete.length} company(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      {/* View/Manage Admins Modal */}
      {isViewAdminsOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => {
              setIsViewAdminsOpen(false);
              setSelectedCompanyForView(null);
              setCompanyAdmins([]);
              setReturnToViewAfterAdd(false);
              setEditingAdminId(null);
              setEditAdminData({});
            }}></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Tenant Admins for {selectedCompanyForView?.name}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Manage administrators who have full access to this company
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setIsViewAdminsOpen(false);
                    setSelectedCompanyForView(null);
                    setCompanyAdmins([]);
                    setReturnToViewAfterAdd(false);
                    setEditingAdminId(null);
                    setEditAdminData({});
                  }} 
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {loadingAdmins ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
                </div>
              ) : companyAdmins.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No administrators found</p>
                  <Button
                    onClick={() => {
                      setIsViewAdminsOpen(false);
                      setSelectedCompanyForAdmin(selectedCompanyForView);
                      setIsAdminFormOpen(true);
                      setReturnToViewAfterAdd(true);
                    }}
                    className="mt-4"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add First Admin
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {companyAdmins.map((admin) => {
                    const isEditing = editingAdminId === admin.id;
                    return (
                      <div 
                        key={admin.id} 
                        className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                      >
                        {/* Header Section */}
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 border-b border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                <Shield className="h-6 w-6 text-white" />
                              </div>
                              <div>
                                {isEditing ? (
                                  <input
                                    type="email"
                                    value={editAdminData.email || ''}
                                    onChange={(e) => setEditAdminData({ ...editAdminData, email: e.target.value })}
                                    placeholder="Email address"
                                    className="text-lg font-semibold px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  />
                                ) : (
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {admin.users?.email || 'Unknown'}
                                  </h3>
                                )}
                                <div className="flex items-center gap-3 mt-1">
                                  {admin.users?.is_active ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                      Active
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                      Inactive
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    Admin since {admin.hire_date ? new Date(admin.hire_date).toLocaleDateString() : 'Unknown'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => {
                                      updateAdminMutation.mutate({
                                        entityUserId: admin.id,
                                        data: { ...editAdminData, user_id: admin.user_id }
                                      });
                                    }}
                                    disabled={updateAdminMutation.isLoading}
                                    className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50"
                                    title="Save Changes"
                                  >
                                    <Check className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingAdminId(null);
                                      setEditAdminData({});
                                    }}
                                    className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    title="Cancel"
                                  >
                                    <X className="h-5 w-5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingAdminId(admin.id);
                                      setEditAdminData({
                                        email: admin.users?.email || '',
                                        phone: admin.users?.phone || '',
                                        position: admin.position || '',
                                        department: admin.department || '',
                                        employee_id: admin.employee_id || '',
                                        hire_date: admin.hire_date || ''
                                      });
                                    }}
                                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                    title="Edit Admin"
                                  >
                                    <Edit className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm('Are you sure you want to remove this admin? They will lose all administrative access to this company.')) {
                                        removeAdminMutation.mutate({
                                          entityUserId: admin.id,
                                          userId: admin.user_id
                                        });
                                      }
                                    }}
                                    disabled={removeAdminMutation.isLoading}
                                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                    title="Remove Admin"
                                  >
                                    <Trash2 className="h-5 w-5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Details Section */}
                        <div className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Contact Information */}
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Contact Information</h4>
                              
                              <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                  <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  {isEditing ? (
                                    <PhoneInput
                                      value={editAdminData.phone || ''}
                                      onChange={(value) => setEditAdminData({ ...editAdminData, phone: value })}
                                      placeholder="Phone number"
                                      className="flex-1"
                                    />
                                  ) : (
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                      {admin.users?.phone || '—'}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {admin.users?.email || '—'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Employment Information */}
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Employment Details</h4>
                              
                              <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                  <Briefcase className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={editAdminData.position || ''}
                                      onChange={(e) => setEditAdminData({ ...editAdminData, position: e.target.value })}
                                      placeholder="Position"
                                      className="flex-1 text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  ) : (
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                      {admin.position || '—'}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  <Building className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={editAdminData.department || ''}
                                      onChange={(e) => setEditAdminData({ ...editAdminData, department: e.target.value })}
                                      placeholder="Department"
                                      className="flex-1 text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  ) : (
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                      {admin.department || '—'}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  <Hash className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={editAdminData.employee_id || ''}
                                      onChange={(e) => setEditAdminData({ ...editAdminData, employee_id: e.target.value })}
                                      placeholder="Employee ID"
                                      className="flex-1 text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  ) : (
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                      {admin.employee_id ? `ID: ${admin.employee_id}` : 'ID: —'}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  {isEditing ? (
                                    <input
                                      type="date"
                                      value={editAdminData.hire_date || ''}
                                      onChange={(e) => setEditAdminData({ ...editAdminData, hire_date: e.target.value })}
                                      className="flex-1 text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  ) : (
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                      Hire Date: {admin.hire_date ? new Date(admin.hire_date).toLocaleDateString() : '—'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Footer Info */}
                          {admin.users?.last_sign_in_at && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Last login: {new Date(admin.users.last_sign_in_at).toLocaleDateString()} at {new Date(admin.users.last_sign_in_at).toLocaleTimeString()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button
                      onClick={() => {
                        setIsViewAdminsOpen(false);
                        setSelectedCompanyForAdmin(selectedCompanyForView);
                        setIsAdminFormOpen(true);
                        setReturnToViewAfterAdd(true);
                      }}
                      variant="secondary"
                      className="w-full"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Another Admin
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}