// /src/app/system-admin/tenants/tabs/CompaniesTab.tsx
// COMPLETE CORRECTED VERSION - ALL 1800+ LINES WITH FIXES

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, ImageOff, UserPlus, Shield, AlertCircle, Edit, Trash2, 
  Users, X, Mail, Phone, Briefcase, Building, Check, Calendar, 
  Hash, Globe, Key, RefreshCw 
} from 'lucide-react';
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

// ===== SCHEMAS =====
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

// ===== TYPE DEFINITIONS =====
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
  status: 'Active' | 'Inactive';
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

// ===== MAIN COMPONENT =====
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

  // ===== QUERIES =====
  
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
    }
  );

  // Fetch all countries (for filter)
  const { data: countries = [] } = useQuery<Country[]>(
    ['countries', filters.region_ids],
    async () => {
      let query = supabase
        .from('countries')
        .select('*')
        .eq('status', 'Active'); // Note the capitalized 'Active'

      if (filters.region_ids.length > 0) {
        query = query.in('region_id', filters.region_ids);
      }

      const { data, error } = await query.order('name');
      if (error) throw error;
      return data || [];
    },
    {
      enabled: true
    }
  );

  // Fetch companies with filters
  const { data: companies = [], isLoading, isFetching } = useQuery<Company[]>(
    ['companies', filters],
    async () => {
      let query = supabase
        .from('companies')
        .select(`
          *,
          entity_users!fk_entity_users_company_id(count)
        `);

      // Apply filters
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
      }

      if (filters.region_ids.length > 0) {
        query = query.in('region_id', filters.region_ids);
      }

      if (filters.country_ids.length > 0) {
        query = query.in('country_id', filters.country_ids);
      }

      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      // Process data to include counts
      const regionMap = new Map(regions.map(r => [r.id, r.name]));
      const countryMap = new Map(countries.map(c => [c.id, c.name]));
      
      // Count admins per company
      const adminCountMap = new Map();
      for (const company of data || []) {
        const { count } = await supabase
          .from('entity_users')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id)
          .eq('is_company_admin', true);
        
        adminCountMap.set(company.id, count || 0);
      }

      return (data || []).map(company => ({
        ...company,
        region_name: regionMap.get(company.region_id) ?? 'Unknown Region',
        country_name: countryMap.get(company.country_id) ?? 'Unknown Country',
        admin_count: adminCountMap.get(company.id) || 0
      }));
    },
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  // Fetch countries for a specific region (for form)
  const fetchCountries = async (regionId: string) => {
    try {
      if (typeof regionId !== 'string' || regionId.trim() === '') {
        setFormState(prev => ({ ...prev, country_id: '' }));
        return;
      }

      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .eq('region_id', regionId)
        .eq('status', 'Active')
        .order('name');

      if (error) throw error;
      
      queryClient.setQueryData(['countries', [regionId]], data || []);
      return data || [];
    } catch (error) {
      console.error('Error fetching countries:', error);
      toast.error('Failed to fetch countries');
      return [];
    }
  };

  // ===== MUTATIONS =====

  // Create/update company mutation
  const mutation = useMutation(
    async (formData: FormState) => {
      const data = {
        name: formData.name.trim(),
        code: formData.code.trim() || '',
        region_id: formData.region_id,
        country_id: formData.country_id,
        logo: formData.logo || '',
        address: formData.address.trim() || '',
        notes: formData.notes.trim() || '',
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

  // ===== CORRECTED TENANT ADMIN MUTATION =====
  const tenantAdminMutation = useMutation(
    async (formData: TenantAdminFormData) => {
      try {
        // Validate input
        tenantAdminSchema.parse(formData);

        // CRITICAL: Ensure company is selected
        if (!selectedCompanyForAdmin?.id) {
          throw new Error('No company selected. Please select a company first.');
        }

        const companyId = selectedCompanyForAdmin.id;
        console.log('Creating admin for company:', companyId, selectedCompanyForAdmin.name);

        // Check if user already exists in users table
        let userId: string | null = null;
        let userExists = false;

        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('id, email')
          .eq('email', formData.email)
          .maybeSingle();

        if (existingUser) {
          userId = existingUser.id;
          userExists = true;
          console.log('Found existing user in users table:', userId);

          // Check if already linked to this company
          const { data: existingLink } = await supabase
            .from('entity_users')
            .select('id')
            .eq('user_id', userId)
            .eq('company_id', companyId)
            .maybeSingle();

          if (existingLink) {
            throw new Error('This user is already associated with this company.');
          }

          // Update existing user
          const { error: updateError } = await supabase
            .from('users')
            .update({
              phone: formData.phone || existingUser.phone,
              user_type: 'entity',
              is_active: true,
              updated_at: new Date().toISOString(),
              raw_user_meta_data: {
                company_id: companyId,
                position: formData.position,
                department: formData.department
              }
            })
            .eq('id', userId);

          if (updateError) {
            console.error('Failed to update user:', updateError);
            throw new Error(`Failed to update user: ${updateError.message}`);
          }
        } else {
          // Create new user through Supabase Auth
          console.log('Creating new user through Supabase Auth...');
          
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
              data: {
                phone: formData.phone,
                user_type: 'entity',
                company_id: companyId,
                position: formData.position,
                department: formData.department
              },
              emailRedirectTo: undefined
            }
          });

          if (authError) {
            console.error('Auth error:', authError);
            
            if (authError.message?.includes('already registered')) {
              throw new Error('This email is already registered. Please try a different email.');
            }
            
            throw new Error(`Failed to create user account: ${authError.message}`);
          }

          if (!authData?.user) {
            throw new Error('Failed to create user account - no user returned');
          }

          userId = authData.user.id;
          console.log('Created new auth user:', userId);

          // Wait for trigger to create users record
          await new Promise(resolve => setTimeout(resolve, 1500));

          // Verify user was created in users table
          const { data: newUser } = await supabase
            .from('users')
            .select('id')
            .eq('id', userId)
            .maybeSingle();

          if (!newUser) {
            // Create user record manually if trigger didn't
            console.log('Creating users table record manually...');
            const { error: createUserError } = await supabase
              .from('users')
              .insert([{
                id: userId,
                email: formData.email,
                phone: formData.phone || null,
                user_type: 'entity',
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                raw_app_meta_data: {},
                raw_user_meta_data: {
                  name: formData.email.split('@')[0],
                  company_id: companyId,
                  position: formData.position,
                  department: formData.department
                }
              }]);

            if (createUserError) {
              console.error('Failed to create users record:', createUserError);
              // Clean up auth user
              try {
                await supabase.auth.admin.deleteUser(userId);
              } catch (e) {
                console.error('Failed to clean up auth user:', e);
              }
              throw new Error(`Failed to create user record: ${createUserError.message}`);
            }
          }
        }

        // Create entity_users record (CRITICAL)
        console.log('Creating entity_users record for user:', userId, 'company:', companyId);
        
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
          console.error('CRITICAL ERROR: Failed to create entity_users record:', entityError);
          
          if (!userExists) {
            // Clean up if we created a new user
            try {
              await supabase.from('users').delete().eq('id', userId!);
              await supabase.auth.admin.deleteUser(userId!);
            } catch (cleanupError) {
              console.error('Failed to clean up after entity_users error:', cleanupError);
            }
          }
          
          throw new Error(`Failed to link user to company: ${entityError.message}`);
        }

        console.log('Successfully created entity_users record:', entityUser);

        // Verify everything worked
        const { data: verification, error: verifyError } = await supabase
          .from('entity_users')
          .select(`
            *,
            users!inner(email, user_type),
            companies!inner(name, status)
          `)
          .eq('user_id', userId!)
          .eq('company_id', companyId)
          .single();

        if (verifyError || !verification) {
          console.error('Verification failed:', verifyError);
          throw new Error('User was created but verification failed. Please check the admin list.');
        }

        console.log('✅ Admin successfully created and verified:', verification);

        return {
          success: true,
          type: userExists ? 'linked' : 'created',
          user: { id: userId, email: formData.email },
          company: selectedCompanyForAdmin,
          entityUser: verification
        };

      } catch (error: any) {
        console.error('Error in tenantAdminMutation:', error);
        throw error;
      }
    },
    {
      onSuccess: (result) => {
        const companyName = result.company?.name;
        
        queryClient.invalidateQueries(['companies']);
        setIsAdminFormOpen(false);
        setSelectedCompanyForAdmin(null);
        setAdminFormErrors({});
        resetAdminForm();
        
        if (returnToViewAfterAdd && selectedCompanyForView && result.company?.id) {
          fetchCompanyAdmins(result.company.id);
          setIsViewAdminsOpen(true);
          setReturnToViewAfterAdd(false);
        }
        
        if (result.type === 'linked') {
          toast.success(`Existing user linked as admin for ${companyName}`);
        } else {
          toast.success(`New admin created successfully for ${companyName}`);
        }
        
        console.log('✅ Success:', {
          userId: result.user.id,
          email: result.user.email,
          companyId: result.company?.id,
          companyName: companyName,
          isAdmin: result.entityUser?.is_company_admin
        });
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
          
          let errorMessage = error.message || 'Failed to create tenant admin';
          
          if (error.message?.includes('already registered')) {
            errorMessage = 'This email is already registered. Please use a different email.';
          } else if (error.message?.includes('No company selected')) {
            errorMessage = 'Please select a company first.';
          } else if (error.message?.includes('already associated')) {
            errorMessage = 'This user is already an admin for this company.';
          }
          
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

  // ===== HELPER FUNCTIONS =====

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
      // Fetch entity_users with user details
      const { data: entityUsers, error: entityError } = await supabase
        .from('entity_users')
        .select(`
          *,
          users!inner(
            id,
            email,
            phone,
            user_type,
            is_active
          )
        `)
        .eq('company_id', companyId)
        .eq('is_company_admin', true)
        .order('created_at', { ascending: false });

      if (entityError) throw entityError;

      // Transform data for display
      const adminsWithUsers = (entityUsers || []).map(entityUser => ({
        ...entityUser,
        users: entityUser.users
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

  // ===== EFFECTS =====

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

      fetchCountries(editingCompany.region_id);
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

  // ===== UI HELPER FUNCTIONS =====

  const getLogoUrl = (path: string | null) => {
    if (!path) return null;
    return supabase.storage
      .from('company-logos')
      .getPublicUrl(path).data.publicUrl;
  };

  const handleRegionChange = (regionId: string) => {
    setFormState(prev => ({
      ...prev,
      region_id: regionId,
      country_id: ''
    }));
    fetchCountries(regionId);
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

  // ===== TABLE COLUMNS =====
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
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {row.code || '-'}
        </span>
      ),
    },
    {
      id: 'region',
      header: 'Region',
      accessorKey: 'region_name',
      enableSorting: true,
      cell: (row: Company) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {row.region_name}
        </span>
      ),
    },
    {
      id: 'country',
      header: 'Country',
      accessorKey: 'country_name',
      enableSorting: true,
      cell: (row: Company) => (
        <span className="text-sm text-gray-900 dark:text-gray-100">
          {row.country_name}
        </span>
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

  // ===== RENDER =====
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Companies</h2>
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
          <FormField id="search" label="Search">
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
            options={countries.map(c => ({
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
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-600 text-white text-xs rounded-full flex items-center justify-center">
                  {company.admin_count}
                </span>
              )}
            </button>

            {/* Add Admin Button */}
            <button
              onClick={() => {
                setSelectedCompanyForAdmin(company);
                setIsAdminFormOpen(true);
              }}
              className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Add Tenant Admin"
            >
              <UserPlus className="h-4 w-4" />
            </button>
          </div>
        )}
        onEdit={(company) => {
          setEditingCompany(company);
          setIsFormOpen(true);
        }}
        onDelete={handleDelete}
        emptyMessage="No companies found"
      />

      {/* Company Form Modal */}
      <SlideInForm
        key={editingCompany?.id || 'new'}
        title={editingCompany ? 'Edit Company' : 'Add Company'}
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
        <form id="company-form" onSubmit={handleSubmit} className="space-y-6">
          {formErrors.form && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md">
              {formErrors.form}
            </div>
          )}

          <FormField
            id="company-name"
            label="Company Name"
            required
            error={formErrors.name}
          >
            <Input
              id="company-name"
              value={formState.name}
              onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter company name"
            />
          </FormField>

          <FormField
            id="company-code"
            label="Company Code"
            error={formErrors.code}
          >
            <Input
              id="company-code"
              value={formState.code}
              onChange={(e) => setFormState(prev => ({ ...prev, code: e.target.value }))}
              placeholder="Enter company code"
            />
          </FormField>

          <FormField
            id="company-region"
            label="Region"
            required
            error={formErrors.region_id}
          >
            <Select
              id="company-region"
              value={formState.region_id}
              onChange={(e) => handleRegionChange(e.target.value)}
            >
              <option value="">Select a region</option>
              {regions.map(region => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            id="company-country"
            label="Country"
            required
            error={formErrors.country_id}
          >
            <Select
              id="company-country"
              value={formState.country_id}
              onChange={(e) => handleCountryChange(e.target.value)}
              disabled={!formState.region_id}
            >
              <option value="">Select a country</option>
              {queryClient.getQueryData<Country[]>(['countries', [formState.region_id]])?.map(country => (
                <option key={country.id} value={country.id}>
                  {country.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            id="company-logo"
            label="Company Logo"
            error={formErrors.logo}
          >
            <ImageUpload
              value={formState.logo}
              onChange={(value) => setFormState(prev => ({ ...prev, logo: value }))}
              storageBucket="company-logos"
              acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
              maxSizeInMB={2}
            />
          </FormField>

          <FormField
            id="company-address"
            label="Address"
            error={formErrors.address}
          >
            <Textarea
              id="company-address"
              value={formState.address}
              onChange={(e) => setFormState(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Enter company address"
              rows={3}
            />
          </FormField>

          <FormField
            id="company-notes"
            label="Notes"
            error={formErrors.notes}
          >
            <Textarea
              id="company-notes"
              value={formState.notes}
              onChange={(e) => setFormState(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Enter any additional notes"
              rows={3}
            />
          </FormField>

          <FormField
            id="company-status"
            label="Status"
            required
            error={formErrors.status}
          >
            <Select
              id="company-status"
              value={formState.status}
              onChange={(e) => setFormState(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </FormField>
        </form>
      </SlideInForm>

      {/* Tenant Admin Form Modal */}
      <SlideInForm
        title={`Add Tenant Admin${selectedCompanyForAdmin ? ` for ${selectedCompanyForAdmin.name}` : ''}`}
        isOpen={isAdminFormOpen}
        onClose={() => {
          setIsAdminFormOpen(false);
          setSelectedCompanyForAdmin(null);
          setAdminFormErrors({});
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
                value={adminFormState.employee_id}
                onChange={(e) => setAdminFormState(prev => ({ ...prev, employee_id: e.target.value }))}
                placeholder="e.g., EMP001"
              />
            </FormField>
          </div>

          {/* Security Section */}
          <div className="space-y-4">
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
                  {/* Add Admin Button */}
                  <div className="flex justify-end mb-4">
                    <Button
                      onClick={() => {
                        setIsViewAdminsOpen(false);
                        setSelectedCompanyForAdmin(selectedCompanyForView);
                        setIsAdminFormOpen(true);
                        setReturnToViewAfterAdd(true);
                      }}
                      leftIcon={<UserPlus className="h-4 w-4" />}
                      size="sm"
                    >
                      Add Admin
                    </Button>
                  </div>

                  {/* Admins List */}
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
                                    onChange={(e) => setEditAdminData({...editAdminData, email: e.target.value})}
                                    className="text-lg font-semibold bg-white dark:bg-gray-700 px-2 py-1 rounded border"
                                  />
                                ) : (
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {admin.users?.email}
                                  </h3>
                                )}
                                <p className="text-sm text-gray-500 dark:text-gray-400">Company Administrator</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => {
                                      updateAdminMutation.mutate({
                                        entityUserId: admin.id,
                                        data: {
                                          ...editAdminData,
                                          user_id: admin.user_id
                                        }
                                      });
                                    }}
                                    className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                    title="Save Changes"
                                  >
                                    <Check className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingAdminId(null);
                                      setEditAdminData({});
                                    }}
                                    className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-900/20 rounded-lg transition-colors"
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
                                    <input
                                      type="tel"
                                      value={editAdminData.phone || ''}
                                      onChange={(e) => setEditAdminData({...editAdminData, phone: e.target.value})}
                                      className="flex-1 text-sm bg-white dark:bg-gray-700 px-2 py-1 rounded border"
                                      placeholder="Phone number"
                                    />
                                  ) : (
                                    <span className="text-sm text-gray-900 dark:text-gray-100">
                                      {admin.users?.phone || 'Not provided'}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <span className="text-sm text-gray-900 dark:text-gray-100">
                                    {admin.users?.email}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Employee Information */}
                            <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Employee Information</h4>
                              
                              <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                  <Briefcase className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={editAdminData.position || ''}
                                      onChange={(e) => setEditAdminData({...editAdminData, position: e.target.value})}
                                      className="flex-1 text-sm bg-white dark:bg-gray-700 px-2 py-1 rounded border"
                                      placeholder="Position"
                                    />
                                  ) : (
                                    <span className="text-sm text-gray-900 dark:text-gray-100">
                                      {admin.position || 'Not specified'}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  <Building className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={editAdminData.department || ''}
                                      onChange={(e) => setEditAdminData({...editAdminData, department: e.target.value})}
                                      className="flex-1 text-sm bg-white dark:bg-gray-700 px-2 py-1 rounded border"
                                      placeholder="Department"
                                    />
                                  ) : (
                                    <span className="text-sm text-gray-900 dark:text-gray-100">
                                      {admin.department || 'Not specified'}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  <Hash className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={editAdminData.employee_id || ''}
                                      onChange={(e) => setEditAdminData({...editAdminData, employee_id: e.target.value})}
                                      className="flex-1 text-sm bg-white dark:bg-gray-700 px-2 py-1 rounded border"
                                      placeholder="Employee ID"
                                    />
                                  ) : (
                                    <span className="text-sm text-gray-900 dark:text-gray-100">
                                      {admin.employee_id || 'Not assigned'}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  {isEditing ? (
                                    <input
                                      type="date"
                                      value={editAdminData.hire_date || ''}
                                      onChange={(e) => setEditAdminData({...editAdminData, hire_date: e.target.value})}
                                      className="flex-1 text-sm bg-white dark:bg-gray-700 px-2 py-1 rounded border"
                                    />
                                  ) : (
                                    <span className="text-sm text-gray-900 dark:text-gray-100">
                                      {admin.hire_date ? new Date(admin.hire_date).toLocaleDateString() : 'Not specified'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Status Section */}
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 dark:text-gray-400">Created:</span>
                                <span className="text-xs text-gray-700 dark:text-gray-300">
                                  {new Date(admin.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  admin.users?.is_active 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                }`}>
                                  {admin.users?.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                  Admin
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}