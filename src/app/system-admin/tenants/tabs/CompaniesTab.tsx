/**
 * File: /src/app/system-admin/tenants/tabs/CompaniesTab.tsx
 * Updated Version - Supabase Auth Integration with Invitation Flow
 * 
 * Key Changes:
 * - Uses Supabase Auth Admin API for invitations
 * - Sends invitation emails instead of creating users directly
 * - Properly syncs with auth.users table
 * - Handles auth_user_id field in entity_users table
 * - Falls back gracefully when service role key not available
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, ImageOff, UserPlus, Shield, AlertCircle, Edit, Trash2, Users, X, 
  Mail, Phone, Briefcase, Building, Check, Calendar, Hash, Globe, Key,
  Eye, EyeOff, Copy, CheckCircle, XCircle, Printer, Loader2, RefreshCw,
  Send
} from 'lucide-react';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { supabase } from '../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
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
import { getAuthenticatedUser } from '../../../../lib/auth';

// ===== SUPABASE ADMIN CLIENT =====
const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Check if we have admin capabilities
const hasAdminCapabilities = !!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// ===== VALIDATION SCHEMAS =====
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
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address').transform(e => e.toLowerCase()),
  phone: z.string().optional(),
  position: z.string().optional(),
  sendInvitation: z.boolean().optional()
});

const passwordChangeSchema = z.object({
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number')
    .regex(/[!@#$%^&*]/, 'Password must contain special character'),
  sendEmail: z.boolean().optional()
});

// ===== PASSWORD REQUIREMENTS =====
interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'Contains uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { label: 'Contains lowercase letter (a-z)', test: (p) => /[a-z]/.test(p) },
  { label: 'Contains number (0-9)', test: (p) => /[0-9]/.test(p) },
  { label: 'Contains special character (!@#$%^&*)', test: (p) => /[!@#$%^&*]/.test(p) }
];

// Password Requirements Checker Component
const PasswordRequirementsChecker: React.FC<{ password: string }> = ({ password }) => {
  return (
    <div className="mt-2 space-y-1">
      {passwordRequirements.map((req, index) => {
        const isMet = password ? req.test(password) : false;
        return (
          <div 
            key={index} 
            className={`flex items-center gap-2 text-xs transition-all ${
              isMet ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {isMet ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            <span>{req.label}</span>
          </div>
        );
      })}
    </div>
  );
};

// ===== TYPE DEFINITIONS =====
interface FilterState {
  search: string;
  region_ids: string[];
  country_ids: string[];
  status: string[];
}

interface Company {
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
}

interface Region {
  id: string;
  name: string;
  status: 'active' | 'inactive';
}

interface Country {
  id: string;
  name: string;
  region_id: string;
  status: 'active' | 'inactive';
}

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
  name: string;
  email: string;
  phone: string;
  position: string;
  sendInvitation: boolean;
}

interface CompanyAdmin {
  id: string;
  user_id: string;
  company_id: string;
  position?: string;
  department?: string;
  employee_id?: string;
  hire_date?: string;
  employee_status?: string;
  department_id?: string | null;
  is_company_admin: boolean;
  phone?: string;
  created_at: string;
  updated_at: string;
  email: string;
  name: string;
  auth_user_id?: string;
  users?: {
    id: string;
    email: string;
    user_type: string;
    is_active: boolean;
    last_sign_in_at?: string;
    last_login_at?: string;
    requires_password_change?: boolean;
    email_verified?: boolean;
    raw_user_meta_data?: any;
    auth_user_id?: string;
  };
}

// ===== HELPER FUNCTIONS =====

function generateComplexPassword(length: number = 12): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const allChars = uppercase + lowercase + numbers + special;
  
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ===== MAIN COMPONENT =====
export default function CompaniesTab() {
  const queryClient = useQueryClient();
  const currentUser = getAuthenticatedUser();
  
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
  const [editingAdmin, setEditingAdmin] = useState<CompanyAdmin | null>(null);
  
  // Password management state
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [generateNewPassword, setGenerateNewPassword] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false);
  const [selectedAdminForPassword, setSelectedAdminForPassword] = useState<CompanyAdmin | null>(null);
  const [invitationSent, setInvitationSent] = useState(false);
  
  const [adminFormState, setAdminFormState] = useState<TenantAdminFormData>({
    name: '',
    email: '',
    phone: '',
    position: '',
    sendInvitation: true
  });

  const [passwordFormState, setPasswordFormState] = useState({
    newPassword: '',
    sendEmail: false
  });

  // View/Manage Admins state
  const [isViewAdminsOpen, setIsViewAdminsOpen] = useState(false);
  const [selectedCompanyForView, setSelectedCompanyForView] = useState<Company | null>(null);
  const [companyAdmins, setCompanyAdmins] = useState<CompanyAdmin[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [returnToViewAfterAdd, setReturnToViewAfterAdd] = useState(false);

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
    },
    {
      staleTime: 10 * 60 * 1000,
    }
  );

  // Fetch countries for filter
  const { data: filterCountries = [] } = useQuery<Country[]>(
    ['filter-countries', filters.region_ids],
    async () => {
      let query = supabase
        .from('countries')
        .select('id, name, region_id, status')
        .eq('status', 'active')
        .order('name');

      if (filters.region_ids.length > 0) {
        query = query.in('region_id', filters.region_ids);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    {
      staleTime: 5 * 60 * 1000,
    }
  );

  // Fetch countries for form
  const { data: formCountries = [] } = useQuery<Country[]>(
    ['form-countries', formState.region_id],
    async () => {
      if (!formState.region_id) return [];

      const { data, error } = await supabase
        .from('countries')
        .select('id, name, region_id, status')
        .eq('region_id', formState.region_id)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data || [];
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
    isFetching,
    refetch: refetchCompanies
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
        query = query.in('region_id', filters.region_ids);
      }

      if (filters.country_ids.length > 0) {
        query = query.in('country_id', filters.country_ids);
      }

      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch related data
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

  // ===== MUTATIONS =====
  
  // Company mutation
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
              errors[err.path[0] as string] = err.message;
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

  // Tenant admin mutation with Supabase Auth invitation
  const tenantAdminMutation = useMutation(
    async (formData: TenantAdminFormData) => {
      try {
        const { name, email, phone, position, sendInvitation } = formData;

        // Validation
        const validatedData = tenantAdminSchema.parse(formData);

        if (!selectedCompanyForAdmin?.id) {
          throw new Error('No company selected');
        }

        const companyId = selectedCompanyForAdmin.id;

        if (editingAdmin) {
          // ===== UPDATE EXISTING ADMIN =====
          
          // Update entity_users table
          const entityUpdates: any = {
            name: name,
            email: email.toLowerCase(),
            position: position || 'Administrator',
            phone: phone || null,
            updated_at: new Date().toISOString()
          };

          const { error: entityError } = await supabase
            .from('entity_users')
            .update(entityUpdates)
            .eq('id', editingAdmin.id);

          if (entityError) throw entityError;

          // Update users table if linked
          if (editingAdmin.user_id) {
            const userUpdates: any = {
              email: email.toLowerCase(),
              updated_at: new Date().toISOString(),
              raw_user_meta_data: {
                name: name,
                company_id: companyId,
                company_name: selectedCompanyForAdmin.name,
                updated_by: currentUser?.email,
                updated_at: new Date().toISOString()
              }
            };

            const { error: userError } = await supabase
              .from('users')
              .update(userUpdates)
              .eq('id', editingAdmin.user_id);

            if (userError) throw userError;

            // Update Supabase Auth if linked
            if (hasAdminCapabilities && editingAdmin.auth_user_id) {
              try {
                await supabaseAdmin.auth.admin.updateUserById(editingAdmin.auth_user_id, {
                  email: email.toLowerCase(),
                  user_metadata: {
                    name: name,
                    position: position || 'Administrator',
                    company_id: companyId,
                    company_name: selectedCompanyForAdmin.name,
                    updated_by: currentUser?.email,
                    updated_at: new Date().toISOString()
                  }
                });
              } catch (authError) {
                console.error('Auth update error (non-fatal):', authError);
              }
            }
          }

          // Log the update
          await supabase
            .from('audit_logs')
            .insert({
              user_id: currentUser?.id,
              action: 'update_entity_admin',
              entity_type: 'entity_user',
              entity_id: editingAdmin.id,
              details: {
                company_id: companyId,
                updated_fields: { name, email, phone, position },
                updated_by: currentUser?.email
              },
              created_at: new Date().toISOString()
            });

          return { 
            success: true, 
            message: 'Admin updated successfully',
            type: 'updated'
          };

        } else {
          // ===== CREATE NEW ADMIN =====
          
          // Check if admin already exists for this company
          const { data: existingAdmin } = await supabase
            .from('entity_users')
            .select('id')
            .eq('email', email.toLowerCase())
            .eq('company_id', companyId)
            .maybeSingle();

          if (existingAdmin) {
            throw new Error('An admin with this email already exists for this company');
          }

          // Check if user exists in users table
          const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .maybeSingle();

          let userId: string;
          let authUserId: string | null = null;
          let temporaryPassword: string | null = null;

          if (existingUser) {
            // User exists - link to company
            userId = existingUser.id;
            authUserId = existingUser.auth_user_id;

            // Create entity_user record
            const { error: entityError } = await supabase
              .from('entity_users')
              .insert({
                user_id: userId,
                company_id: companyId,
                name: name,
                email: email.toLowerCase(),
                position: position || 'Administrator',
                phone: phone || null,
                department: null,
                employee_id: null,
                hire_date: new Date().toISOString().split('T')[0],
                is_company_admin: true,
                employee_status: 'active',
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                auth_user_id: authUserId
              });

            if (entityError) throw entityError;

            toast.info('Existing user linked as company admin');

          } else {
            // New user - create and send invitation
            
            if (sendInvitation && hasAdminCapabilities) {
              // ===== SUPABASE AUTH INVITATION FLOW =====
              try {
                // Send invitation through Supabase Auth
                const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
                  email.toLowerCase(),
                  {
                    data: {
                      name: name,
                      position: position || 'Administrator',
                      company_id: companyId,
                      company_name: selectedCompanyForAdmin.name,
                      invited_by: currentUser?.email,
                      invited_at: new Date().toISOString(),
                      user_type: 'entity',
                      is_company_admin: true
                    }
                  }
                );

                if (inviteError) {
                  console.error('Invitation error:', inviteError);
                  throw new Error('Failed to send invitation email');
                }

                // Get the created auth user
                authUserId = inviteData.user?.id || null;

                // Create placeholder in users table
                temporaryPassword = generateComplexPassword();
                const salt = await bcrypt.genSalt(10);
                const passwordHash = await bcrypt.hash(temporaryPassword, salt);

                const { data: newUser, error: userError } = await supabase
                  .from('users')
                  .insert({
                    email: email.toLowerCase(),
                    password_hash: passwordHash,
                    user_type: 'entity',
                    is_active: false, // Inactive until they accept invitation
                    email_verified: false,
                    verification_token: generateVerificationToken(),
                    verification_sent_at: new Date().toISOString(),
                    requires_password_change: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    auth_user_id: authUserId,
                    auth_invitation_sent_at: new Date().toISOString(),
                    raw_user_meta_data: {
                      name: name,
                      company_id: companyId,
                      company_name: selectedCompanyForAdmin.name,
                      invited_by: currentUser?.email,
                      invitation_pending: true
                    }
                  })
                  .select()
                  .single();

                if (userError) {
                  // Try to clean up auth user if database insert fails
                  if (authUserId) {
                    try {
                      await supabaseAdmin.auth.admin.deleteUser(authUserId);
                    } catch (deleteError) {
                      console.error('Failed to rollback auth user:', deleteError);
                    }
                  }
                  throw userError;
                }

                userId = newUser.id;
                setInvitationSent(true);

              } catch (authError) {
                console.error('Auth invitation error:', authError);
                
                // Fallback: Create user without auth invitation
                temporaryPassword = generateComplexPassword();
                const salt = await bcrypt.genSalt(10);
                const passwordHash = await bcrypt.hash(temporaryPassword, salt);

                const { data: newUser, error: userError } = await supabase
                  .from('users')
                  .insert({
                    email: email.toLowerCase(),
                    password_hash: passwordHash,
                    user_type: 'entity',
                    is_active: true,
                    email_verified: false,
                    verification_token: generateVerificationToken(),
                    verification_sent_at: new Date().toISOString(),
                    requires_password_change: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    raw_user_meta_data: {
                      name: name,
                      company_id: companyId,
                      company_name: selectedCompanyForAdmin.name,
                      created_by: currentUser?.email
                    }
                  })
                  .select()
                  .single();

                if (userError) throw userError;
                userId = newUser.id;
                
                // Show generated password since invitation failed
                setGeneratedPassword(temporaryPassword);
              }
            } else {
              // Create without invitation
              temporaryPassword = generateComplexPassword();
              const salt = await bcrypt.genSalt(10);
              const passwordHash = await bcrypt.hash(temporaryPassword, salt);

              const { data: newUser, error: userError } = await supabase
                .from('users')
                .insert({
                  email: email.toLowerCase(),
                  password_hash: passwordHash,
                  user_type: 'entity',
                  is_active: true,
                  email_verified: false,
                  verification_token: generateVerificationToken(),
                  verification_sent_at: new Date().toISOString(),
                  requires_password_change: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  raw_user_meta_data: {
                    name: name,
                    company_id: companyId,
                    company_name: selectedCompanyForAdmin.name,
                    created_by: currentUser?.email
                  }
                })
                .select()
                .single();

              if (userError) throw userError;
              userId = newUser.id;
              
              // Show generated password
              setGeneratedPassword(temporaryPassword);
            }

            // Create entity_user record
            const { error: entityError } = await supabase
              .from('entity_users')
              .insert({
                user_id: userId,
                company_id: companyId,
                name: name,
                email: email.toLowerCase(),
                position: position || 'Administrator',
                phone: phone || null,
                department: null,
                employee_id: null,
                hire_date: new Date().toISOString().split('T')[0],
                is_company_admin: true,
                employee_status: 'active',
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                auth_user_id: authUserId
              });

            if (entityError) {
              // Rollback user creation
              await supabase.from('users').delete().eq('id', userId);
              if (authUserId) {
                try {
                  await supabaseAdmin.auth.admin.deleteUser(authUserId);
                } catch (deleteError) {
                  console.error('Failed to rollback auth user:', deleteError);
                }
              }
              throw entityError;
            }
          }

          // Log the creation
          await supabase
            .from('audit_logs')
            .insert({
              user_id: currentUser?.id,
              action: 'create_entity_admin',
              entity_type: 'entity_user',
              entity_id: userId,
              details: {
                email: email,
                company_id: companyId,
                company_name: selectedCompanyForAdmin.name,
                is_company_admin: true,
                created_by: currentUser?.email,
                invitation_sent: sendInvitation && !generatedPassword,
                auth_synced: !!authUserId
              },
              created_at: new Date().toISOString()
            });

          return {
            success: true,
            type: 'created',
            user: {
              id: userId,
              email: email,
              name: name,
              temporary_password: temporaryPassword,
              invitation_sent: sendInvitation && !generatedPassword
            },
            company: selectedCompanyForAdmin,
            message: invitationSent 
              ? 'Admin created and invitation sent successfully' 
              : (temporaryPassword ? 'Admin created with temporary password' : 'Admin created successfully')
          };
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw { validationErrors: error.flatten().fieldErrors };
        }
        throw error;
      }
    },
    {
      onSuccess: (result) => {
        queryClient.invalidateQueries(['companies']);
        
        if (result.user?.invitation_sent) {
          // Show success message for invitation
          setIsAdminFormOpen(false);
          setSelectedCompanyForAdmin(null);
          setEditingAdmin(null);
          setAdminFormErrors({});
          resetAdminForm();
          
          toast.success('Invitation sent successfully! The user will receive an email to set up their account.');
          
          // Return to View Admins if needed
          if (returnToViewAfterAdd && selectedCompanyForView) {
            fetchCompanyAdmins(selectedCompanyForView.id);
            setIsViewAdminsOpen(true);
            setReturnToViewAfterAdd(false);
          }
        } else if (result.user?.temporary_password) {
          // Show password modal for manual setup
          setGeneratedPassword(result.user.temporary_password);
          toast.success('Admin created successfully. Copy the temporary password!');
        } else {
          setIsAdminFormOpen(false);
          setSelectedCompanyForAdmin(null);
          setEditingAdmin(null);
          setAdminFormErrors({});
          resetAdminForm();
          
          toast.success(result.message || 'Operation successful');
          
          // Return to View Admins if needed
          if (returnToViewAfterAdd && selectedCompanyForView) {
            fetchCompanyAdmins(selectedCompanyForView.id);
            setIsViewAdminsOpen(true);
            setReturnToViewAfterAdd(false);
          }
        }
      },
      onError: (error: any) => {
        if (error.validationErrors) {
          const errors: Record<string, string> = {};
          Object.entries(error.validationErrors).forEach(([key, value]) => {
            errors[key] = Array.isArray(value) ? value[0] : value as string;
          });
          setAdminFormErrors(errors);
        } else {
          console.error('Error:', error);
          const errorMessage = error.message || 'Operation failed';
          setAdminFormErrors({ form: errorMessage });
          toast.error(errorMessage);
        }
      }
    }
  );

  // Change password mutation
  const changePasswordMutation = useMutation(
    async (data: { userId: string; password: string; sendEmail: boolean }) => {
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(data.password, salt);
      
      // Get user to check for auth_user_id
      const { data: user } = await supabase
        .from('users')
        .select('auth_user_id, email')
        .eq('id', data.userId)
        .single();
      
      // Update password in Supabase Auth if linked
      if (hasAdminCapabilities && user?.auth_user_id) {
        try {
          await supabaseAdmin.auth.admin.updateUserById(user.auth_user_id, {
            password: data.password,
            app_metadata: {
              requires_password_change: false,
              password_changed_at: new Date().toISOString(),
              password_changed_by: currentUser?.email
            }
          });
        } catch (authError) {
          console.error('Auth password sync error (non-fatal):', authError);
        }
      }
      
      // Update password in users table
      const { error: updateError } = await supabase
        .from('users')
        .update({
          password_hash: passwordHash,
          password_updated_at: new Date().toISOString(),
          requires_password_change: false,
          failed_login_attempts: 0,
          locked_until: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.userId);
      
      if (updateError) throw updateError;
      
      // Log the change
      await supabase
        .from('audit_logs')
        .insert({
          user_id: currentUser?.id,
          action: 'admin_password_change',
          entity_type: 'entity_user',
          entity_id: data.userId,
          details: {
            changed_by: currentUser?.email,
            target_user: selectedAdminForPassword?.email,
            notification_sent: data.sendEmail,
            auth_synced: !!(hasAdminCapabilities && user?.auth_user_id)
          },
          created_at: new Date().toISOString()
        });
      
      // Send email notification if requested
      if (data.sendEmail && user?.email) {
        console.log('Password change email would be sent to:', user.email);
      }
      
      return { success: true, password: data.password };
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries(['companies']);
        
        if (data.password) {
          setGeneratedPassword(data.password);
          toast.success('Password changed successfully. Copy the new password!');
        } else {
          setIsPasswordFormOpen(false);
          setSelectedAdminForPassword(null);
          toast.success('Password changed successfully');
        }
        
        setFormErrors({});
      },
      onError: (error: any) => {
        console.error('Error changing password:', error);
        toast.error(error.message || 'Failed to change password');
      }
    }
  );

  // Resend invitation mutation
  const resendInvitationMutation = useMutation(
    async (admin: CompanyAdmin) => {
      if (!hasAdminCapabilities) {
        throw new Error('Admin capabilities required to send invitations');
      }

      // Resend invitation through Supabase Auth
      const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        admin.email.toLowerCase(),
        {
          data: {
            name: admin.name,
            position: admin.position || 'Administrator',
            company_id: admin.company_id,
            company_name: selectedCompanyForView?.name,
            reinvited_by: currentUser?.email,
            reinvited_at: new Date().toISOString(),
            user_type: 'entity',
            is_company_admin: true
          }
        }
      );

      if (inviteError) throw inviteError;

      // Update invitation sent timestamp
      await supabase
        .from('users')
        .update({
          auth_invitation_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', admin.user_id);

      return { success: true };
    },
    {
      onSuccess: () => {
        toast.success('Invitation resent successfully');
        if (selectedCompanyForView?.id) {
          fetchCompanyAdmins(selectedCompanyForView.id);
        }
      },
      onError: (error: any) => {
        console.error('Error:', error);
        toast.error(error.message || 'Failed to resend invitation');
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

      // Delete companies from database (cascade will handle related records)
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

  // Remove admin mutation
  const removeAdminMutation = useMutation(
    async ({ entityUserId, userId, authUserId }: { entityUserId: string; userId: string; authUserId?: string }) => {
      // Remove from entity_users
      const { error } = await supabase
        .from('entity_users')
        .delete()
        .eq('id', entityUserId);

      if (error) throw error;

      // If this was the only company for the user, consider deactivating them
      const { data: otherCompanies } = await supabase
        .from('entity_users')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (!otherCompanies || otherCompanies.length === 0) {
        // Deactivate user if no other companies
        await supabase
          .from('users')
          .update({
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        // Also deactivate in Supabase Auth if linked
        if (hasAdminCapabilities && authUserId) {
          try {
            await supabaseAdmin.auth.admin.updateUserById(authUserId, {
              app_metadata: {
                is_active: false,
                deactivated_at: new Date().toISOString(),
                deactivated_by: currentUser?.email
              }
            });
          } catch (authError) {
            console.error('Auth deactivation error (non-fatal):', authError);
          }
        }
      }

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
  
  const resetAdminForm = () => {
    setAdminFormState({
      name: '',
      email: '',
      phone: '',
      position: '',
      sendInvitation: true
    });
    setAdminFormErrors({});
    setInvitationSent(false);
  };

  const fetchCompanyAdmins = async (companyId: string) => {
    setLoadingAdmins(true);
    try {
      // Fetch entity_users with user details joined
      const { data: admins, error } = await supabase
        .from('entity_users')
        .select(`
          *,
          users!entity_users_user_id_fkey (
            id,
            email,
            user_type,
            is_active,
            email_verified,
            requires_password_change,
            last_sign_in_at,
            last_login_at,
            raw_user_meta_data,
            auth_user_id
          )
        `)
        .eq('company_id', companyId)
        .eq('is_company_admin', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCompanyAdmins(admins || []);
    } catch (error) {
      console.error('Error fetching company admins:', error);
      toast.error('Failed to fetch company admins');
      setCompanyAdmins([]);
    } finally {
      setLoadingAdmins(false);
    }
  };

  const getLogoUrl = (path: string | null) => {
    if (!path) return null;
    
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    const { data } = supabase.storage
      .from('company-logos')
      .getPublicUrl(path);
    
    return data?.publicUrl || null;
  };

  const handleRegionChange = (regionId: string) => {
    setFormState(prev => ({
      ...prev,
      region_id: regionId,
      country_id: ''
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

  const handlePasswordChange = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormErrors({});
    
    if (!selectedAdminForPassword) return;
    
    const formData = new FormData(e.currentTarget);
    const newPassword = formData.get('newPassword') as string;
    const sendEmail = formData.get('sendEmail') === 'on';
    
    try {
      passwordChangeSchema.parse({ newPassword, sendEmail });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setFormErrors(errors);
        return;
      }
    }
    
    const passwordToSet = generateNewPassword ? generateComplexPassword() : newPassword;
    
    changePasswordMutation.mutate({
      userId: selectedAdminForPassword.user_id,
      password: passwordToSet,
      sendEmail
    });
  };

  const handleDelete = (companies: Company[]) => {
    setCompaniesToDelete(companies);
    setIsConfirmDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteMutation.mutate(companiesToDelete);
  };

  const copyPassword = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
      toast.success('Password copied to clipboard');
    }
  };
  
  const printPassword = () => {
    if (generatedPassword) {
      const adminInfo = editingAdmin || selectedAdminForPassword || 
        (selectedCompanyForAdmin ? { email: adminFormState.email, name: adminFormState.name } : null);
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Password for ${adminInfo?.name || 'User'}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .header { font-size: 18px; font-weight: bold; margin-bottom: 20px; }
                .info { margin: 10px 0; }
                .password { 
                  font-family: monospace; 
                  font-size: 16px; 
                  background: #f3f4f6; 
                  padding: 10px; 
                  border: 1px solid #d1d5db;
                  margin: 20px 0;
                }
                .footer { margin-top: 30px; font-size: 12px; color: #6b7280; }
              </style>
            </head>
            <body>
              <div class="header">GGK Learning System - Password Information</div>
              <div class="info"><strong>User:</strong> ${adminInfo?.name || 'N/A'}</div>
              <div class="info"><strong>Email:</strong> ${adminInfo?.email || 'N/A'}</div>
              <div class="info"><strong>Company:</strong> ${selectedCompanyForAdmin?.name || selectedCompanyForView?.name || 'N/A'}</div>
              <div class="info"><strong>Generated:</strong> ${new Date().toLocaleString()}</div>
              <div class="password">${generatedPassword}</div>
              <div class="footer">
                Please share this password securely with the user. 
                They should change this password after first login.
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const closePasswordModal = () => {
    setGeneratedPassword(null);
    setIsAdminFormOpen(false);
    setIsPasswordFormOpen(false);
    setSelectedCompanyForAdmin(null);
    setSelectedAdminForPassword(null);
    setEditingAdmin(null);
    resetAdminForm();
    setPasswordFormState({
      newPassword: '',
      sendEmail: false
    });
    setGenerateNewPassword(true);
    
    if (returnToViewAfterAdd && selectedCompanyForView) {
      fetchCompanyAdmins(selectedCompanyForView.id);
      setIsViewAdminsOpen(true);
      setReturnToViewAfterAdd(false);
    }
  };

  // ===== EFFECTS =====
  
  useEffect(() => {
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

  useEffect(() => {
    if (editingAdmin) {
      setAdminFormState({
        name: editingAdmin.name || editingAdmin.users?.raw_user_meta_data?.name || '',
        email: editingAdmin.email || editingAdmin.users?.email || '',
        phone: editingAdmin.phone || '',
        position: editingAdmin.position || '',
        sendInvitation: false
      });
    } else {
      resetAdminForm();
    }
  }, [editingAdmin]);

  useEffect(() => {
    if (!isPasswordFormOpen) {
      setPasswordFormState({
        newPassword: '',
        sendEmail: false
      });
      setGenerateNewPassword(true);
      setShowNewPassword(false);
    }
  }, [isPasswordFormOpen]);

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

  // ===== RENDER =====
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Companies</h2>
          <button
            onClick={() => refetchCompanies()}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
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

      {/* Show Auth status in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className={`p-2 text-xs rounded ${hasAdminCapabilities ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'}`}>
          Supabase Auth: {hasAdminCapabilities ? '✓ Admin API enabled (invitations available)' : '⚠ Limited mode (manual password setup only)'}
        </div>
      )}

      {/* Filter Card */}
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
            options={regions.map(r => ({ value: r.id, label: r.name }))}
            selectedValues={filters.region_ids}
            onChange={(values) => setFilters({ ...filters, region_ids: values, country_ids: [] })}
            placeholder="Select regions..."
          />

          <SearchableMultiSelect
            label="Country"
            options={filterCountries.map(c => ({ value: c.id, label: c.name }))}
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

      {/* Data Table */}
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
            
            <button
              onClick={() => {
                setSelectedCompanyForAdmin(company);
                setEditingAdmin(null);
                resetAdminForm();
                setIsAdminFormOpen(true);
              }}
              className="p-1.5 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
              title="Add Tenant Admin"
            >
              <UserPlus className="h-4 w-4" />
            </button>
            
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

      {/* Company Form Modal - Unchanged */}
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
          const form = document.querySelector('form#company-form') as HTMLFormElement;
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

          <FormField id="name" label="Name" required error={formErrors.name}>
            <Input
              id="name"
              name="name"
              placeholder="Enter company name"
              value={formState.name}
              onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
            />
          </FormField>

          <FormField id="code" label="Code" error={formErrors.code}>
            <Input
              id="code"
              name="code"
              placeholder="Enter company code"
              value={formState.code}
              onChange={(e) => setFormState(prev => ({ ...prev, code: e.target.value }))}
            />
          </FormField>

          <FormField id="region_id" label="Region" required error={formErrors.region_id}>
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

          <FormField id="country_id" label="Country" required error={formErrors.country_id}>
            <Select
              id="country_id"
              name="country_id"
              options={(formCountries || []).map(country => ({
                value: country.id,
                label: country.name
              }))}
              value={formState.country_id}
              onChange={(value) => setFormState(prev => ({ ...prev, country_id: value }))}
              disabled={!formState.region_id}
            />
          </FormField>

          <FormField id="logo" label="Company Logo">
            <input type="hidden" name="logo" value={formState.logo} />
            <ImageUpload
              id="logo"
              bucket="company-logos"
              value={formState.logo}
              publicUrl={formState.logo ? getLogoUrl(formState.logo) : null}
              onChange={(path) => setFormState(prev => ({ ...prev, logo: path || '' }))}
            />
          </FormField>

          <FormField id="address" label="Address" error={formErrors.address}>
            <Textarea
              id="address"
              name="address"
              placeholder="Enter company address"
              value={formState.address}
              onChange={(e) => setFormState(prev => ({ ...prev, address: e.target.value }))}
              rows={3}
            />
          </FormField>

          <FormField id="notes" label="Notes" error={formErrors.notes}>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Enter company notes"
              value={formState.notes}
              onChange={(e) => setFormState(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </FormField>

          <FormField id="status" label="Status" required error={formErrors.status}>
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

      {/* Tenant Admin Form Modal - Updated for Invitations */}
      <SlideInForm
        key={`${selectedCompanyForAdmin?.id || 'admin-new'}-${editingAdmin?.id || 'new'}`}
        title={editingAdmin ? `Edit Admin for ${selectedCompanyForAdmin?.name}` : `Add Tenant Admin for ${selectedCompanyForAdmin?.name || ''}`}
        isOpen={isAdminFormOpen && !generatedPassword}
        onClose={() => {
          setIsAdminFormOpen(false);
          setSelectedCompanyForAdmin(null);
          setEditingAdmin(null);
          resetAdminForm();
          setReturnToViewAfterAdd(false);
        }}
        onSave={() => {
          const form = document.querySelector('form#admin-form') as HTMLFormElement;
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

          {/* Basic Information Section */}
          <div className="space-y-4">
            <FormField id="tenant-name" label="Name" required error={adminFormErrors.name}>
              <Input
                id="tenant-name"
                name="name"
                type="text"
                value={adminFormState.name}
                onChange={(e) => setAdminFormState(prev => ({ ...prev, name: e.target.value }))}
                placeholder="John Doe"
              />
            </FormField>

            <FormField 
              id="tenant-email" 
              label="Email Address" 
              required 
              error={adminFormErrors.email}
              helpText={editingAdmin ? "Changing email will update the admin's login credentials" : "An invitation will be sent to this email"}
            >
              <Input
                id="tenant-email"
                name="email"
                type="email"
                value={adminFormState.email}
                onChange={(e) => setAdminFormState(prev => ({ ...prev, email: e.target.value }))}
                placeholder="admin@company.com"
              />
            </FormField>

            <FormField id="tenant-phone" label="Phone Number" error={adminFormErrors.phone}>
              <PhoneInput
                name="phone"
                value={adminFormState.phone}
                onChange={(value) => setAdminFormState(prev => ({ ...prev, phone: value }))}
                placeholder="XXXX XXXX"
              />
            </FormField>

            <FormField id="tenant-position" label="Position" error={adminFormErrors.position}>
              <Input
                id="tenant-position"
                name="position"
                type="text"
                value={adminFormState.position}
                onChange={(e) => setAdminFormState(prev => ({ ...prev, position: e.target.value }))}
                placeholder="e.g., IT Administrator"
              />
            </FormField>
          </div>

          {/* Invitation Options (only for new admins) */}
          {!editingAdmin && (
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Invitation Options</h3>
              
              {hasAdminCapabilities ? (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adminFormState.sendInvitation}
                      onChange={(e) => setAdminFormState(prev => ({ ...prev, sendInvitation: e.target.checked }))}
                      className="rounded border-gray-300 text-[#8CC63F] mt-1"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Send email invitation
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {adminFormState.sendInvitation 
                          ? "The user will receive an email to set up their account and choose their password"
                          : "A temporary password will be generated that you must share with the user"}
                      </p>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Email invitations are not available. A temporary password will be generated.
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        To enable email invitations, configure VITE_SUPABASE_SERVICE_ROLE_KEY in your environment.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {adminFormState.sendInvitation && hasAdminCapabilities && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
                  <div className="flex items-start gap-2">
                    <Send className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        An invitation email will be sent automatically
                      </p>
                      <ul className="text-xs text-green-600 dark:text-green-400 mt-2 list-disc list-inside space-y-1">
                        <li>User receives secure link to set password</li>
                        <li>Account is activated upon accepting invitation</li>
                        <li>No temporary password needed</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {editingAdmin && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Note:</strong> To change the user's password, use the password reset option from the admins list.
              </p>
            </div>
          )}

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-2">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Company Administrator Access
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  This user will be set as a company administrator with full access to manage company settings and users.
                </p>
              </div>
            </div>
          </div>
        </form>
      </SlideInForm>

      {/* View/Manage Admins Modal - Updated */}
      {isViewAdminsOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => {
              setIsViewAdminsOpen(false);
              setSelectedCompanyForView(null);
              setCompanyAdmins([]);
              setReturnToViewAfterAdd(false);
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
                      setEditingAdmin(null);
                      resetAdminForm();
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
                    const userInfo = admin.users || {};
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
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                  {admin.name || userInfo.raw_user_meta_data?.name || admin.email?.split('@')[0] || 'Unknown'}
                                </h3>
                                <div className="flex items-center gap-3 mt-1">
                                  {(admin.is_active || userInfo.is_active) ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                      Active
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                      Inactive
                                    </span>
                                  )}
                                  {userInfo.email_verified ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                      Verified
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                      Unverified
                                    </span>
                                  )}
                                  {userInfo.requires_password_change && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                      <Key className="h-3 w-3 mr-1" />
                                      Password Change Required
                                    </span>
                                  )}
                                  {(admin.auth_user_id || userInfo.auth_user_id) && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                      Auth Synced
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {/* Resend Invitation */}
                              {hasAdminCapabilities && !userInfo.email_verified && admin.auth_user_id && (
                                <button
                                  onClick={() => resendInvitationMutation.mutate(admin)}
                                  disabled={resendInvitationMutation.isLoading}
                                  className="p-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:text-amber-300 dark:hover:bg-amber-900/20 rounded-lg transition-colors disabled:opacity-50"
                                  title="Resend invitation email"
                                >
                                  {resendInvitationMutation.isLoading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                  ) : (
                                    <Send className="h-5 w-5" />
                                  )}
                                </button>
                              )}
                              
                              {/* Change Password */}
                              {(admin.is_active || userInfo.is_active) && (
                                <button
                                  onClick={() => {
                                    setSelectedAdminForPassword(admin);
                                    setIsPasswordFormOpen(true);
                                    setGenerateNewPassword(true);
                                    setPasswordFormState({
                                      newPassword: '',
                                      sendEmail: false
                                    });
                                  }}
                                  className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                                  title="Change password"
                                >
                                  <Key className="h-5 w-5" />
                                </button>
                              )}
                              
                              {/* Edit */}
                              <button
                                onClick={() => {
                                  setSelectedCompanyForAdmin(selectedCompanyForView);
                                  setEditingAdmin(admin);
                                  setIsViewAdminsOpen(false);
                                  setIsAdminFormOpen(true);
                                  setReturnToViewAfterAdd(true);
                                }}
                                className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                title="Edit Admin"
                              >
                                <Edit className="h-5 w-5" />
                              </button>
                              
                              {/* Remove */}
                              <button
                                onClick={() => {
                                  if (confirm('Are you sure you want to remove this admin? They will lose all administrative access to this company.')) {
                                    removeAdminMutation.mutate({
                                      entityUserId: admin.id,
                                      userId: admin.user_id,
                                      authUserId: admin.auth_user_id || userInfo.auth_user_id
                                    });
                                  }
                                }}
                                disabled={removeAdminMutation.isLoading}
                                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                title="Remove Admin"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
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
                                  <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {admin.email || userInfo.email || '—'}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {admin.phone || '—'}
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
                                  <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {admin.position || 'Administrator'}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  <Building className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {admin.department || 'Not set'}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  <Hash className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {admin.employee_id ? `ID: ${admin.employee_id}` : 'ID: Not set'}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <span className="text-sm text-gray-600 dark:text-gray-400">
                                    Hire Date: {admin.hire_date ? new Date(admin.hire_date).toLocaleDateString() : '—'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Footer Info */}
                          {userInfo.last_sign_in_at && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Last login: {new Date(userInfo.last_sign_in_at).toLocaleDateString()} at {new Date(userInfo.last_sign_in_at).toLocaleTimeString()}
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
                        setEditingAdmin(null);
                        resetAdminForm();
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

      {/* Password Change Form - Unchanged from original */}
      <SlideInForm
        key={`${selectedAdminForPassword?.id || 'new'}-password`}
        title={`Change Password for ${selectedAdminForPassword?.name || selectedAdminForPassword?.email || ''}`}
        isOpen={isPasswordFormOpen && !generatedPassword}
        onClose={() => {
          setIsPasswordFormOpen(false);
          setSelectedAdminForPassword(null);
          setFormErrors({});
          setShowNewPassword(false);
          setGenerateNewPassword(true);
          setPasswordFormState({
            newPassword: '',
            sendEmail: false
          });
        }}
        onSave={() => {
          const form = document.querySelector('form[name="passwordForm"]') as HTMLFormElement;
          if (form) form.requestSubmit();
        }}
        loading={changePasswordMutation.isLoading}
      >
        <form name="passwordForm" onSubmit={handlePasswordChange} className="space-y-4">
          {formErrors.form && (
            <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
              {formErrors.form}
            </div>
          )}

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <Shield className="h-4 w-4 inline mr-1" />
              You can directly set a new password for this user.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Password Options
              </p>
              
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="passwordChangeOption"
                    checked={generateNewPassword}
                    onChange={() => {
                      setGenerateNewPassword(true);
                      setPasswordFormState({ ...passwordFormState, newPassword: '' });
                    }}
                    className="text-[#8CC63F]"
                  />
                  <div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                      Generate secure password
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      System will create a strong 12-character password
                    </p>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="passwordChangeOption"
                    checked={!generateNewPassword}
                    onChange={() => setGenerateNewPassword(false)}
                    className="text-[#8CC63F]"
                  />
                  <div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                      Set custom password
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Enter your own password meeting complexity requirements
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {!generateNewPassword && (
              <FormField 
                id="newPassword" 
                label="New Password" 
                required 
                error={formErrors.newPassword}
              >
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      type={showNewPassword ? "text" : "password"}
                      id="newPassword"
                      name="newPassword"
                      placeholder="Enter new password"
                      value={passwordFormState.newPassword}
                      onChange={(e) => setPasswordFormState({ ...passwordFormState, newPassword: e.target.value })}
                      className={`pr-10 ${
                        passwordFormState.newPassword && 
                        passwordRequirements.every(req => req.test(passwordFormState.newPassword))
                          ? 'border-green-500 focus:border-green-500'
                          : ''
                      }`}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <PasswordRequirementsChecker password={passwordFormState.newPassword} />
                </div>
              </FormField>
            )}
            
            {generateNewPassword && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  A strong password will be generated automatically
                </p>
              </div>
            )}

            <div className="border-t pt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  id="sendEmail"
                  name="sendEmail"
                  checked={passwordFormState.sendEmail}
                  onChange={(e) => setPasswordFormState({ ...passwordFormState, sendEmail: e.target.checked })}
                  className="rounded border-gray-300 text-[#8CC63F]"
                />
                <div>
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                    Send password to user's email
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Email the new password to {selectedAdminForPassword?.email}
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              <strong>Note:</strong> The user can log in immediately with the new password.
              {passwordFormState.sendEmail && " They will receive an email with their new credentials."}
            </p>
          </div>
        </form>
      </SlideInForm>

      {/* Generated Password Modal - Unchanged */}
      {generatedPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[80]">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 relative z-[81]">
            <h3 className="text-lg font-semibold mb-4">
              {selectedAdminForPassword ? 'Password Changed Successfully' : 'Admin Created Successfully'}
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {selectedAdminForPassword 
                  ? `A new password has been set for ${selectedAdminForPassword.name || selectedAdminForPassword.email}.`
                  : `A temporary password has been generated for the new admin.`
                }
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Please share this password securely with the user. They should change it after first login.
              </p>
            </div>

            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md mb-4">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                Generated Password
              </p>
              <div className="flex items-center justify-between">
                <code className="text-base font-mono font-semibold break-all pr-2">
                  {generatedPassword}
                </code>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={copyPassword}
                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    title="Copy password"
                  >
                    {copiedPassword ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={printPassword}
                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    title="Print password"
                  >
                    <Printer className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md mb-4 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <strong>Important:</strong> This password will not be shown again. Make sure to:
              </p>
              <ul className="mt-2 text-sm text-amber-700 dark:text-amber-400 list-disc list-inside">
                <li>Copy or print the password now</li>
                <li>Share it securely with the user</li>
                <li>Advise the user to change it after first login</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={printPassword}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
              <Button onClick={closePasswordModal}>
                Close
              </Button>
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
        onCancel={() => {
          setIsConfirmDialogOpen(false);
          setCompaniesToDelete([]);
        }}
      />
    </div>
  );
}