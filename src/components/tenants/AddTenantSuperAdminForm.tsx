import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Building2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { FormField, Input, Select } from '../shared/FormField';
import { Button } from '../shared/Button';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';

interface Company {
  id: string;
  name: string;
  code?: string;
}

interface AddTenantSuperAdminFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddTenantSuperAdminForm({ onSuccess, onCancel }: AddTenantSuperAdminFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    companyId: ''
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const toast = useToast();

  // Fetch companies for dropdown
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('id, name, code')
          .eq('status', 'active')
          .order('name');

        if (error) throw error;
        setCompanies(data || []);
      } catch (error) {
        console.error('Error fetching companies:', error);
        toast.error('Failed to load companies');
      } finally {
        setLoadingCompanies(false);
      }
    };

    fetchCompanies();
  }, [toast]);

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.companyId) {
      newErrors.companyId = 'Company selection is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create user in auth.users using Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: undefined, // Disable email confirmation for admin-created users
        }
      });

      if (authError) {
        throw new Error(`Authentication error: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Step 2: Get the Tenant Super Admin role ID
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'Tenant Super Admin')
        .single();

      if (roleError || !roleData) {
        // If role doesn't exist, create it
        const { data: newRoleData, error: createRoleError } = await supabase
          .from('roles')
          .insert({
            name: 'Tenant Super Admin',
            description: 'Super administrator for a specific tenant/company'
          })
          .select('id')
          .single();

        if (createRoleError) {
          throw new Error(`Failed to create role: ${createRoleError.message}`);
        }

        roleData = newRoleData;
      }

      // Step 3: Insert profile into entity_users
      const { error: profileError } = await supabase
        .from('entity_users')
        .insert({
          user_id: authData.user.id,
          name: formData.name.trim(),
          company_id: formData.companyId,
          position: 'Tenant Super Admin',
          department: 'Administration',
          is_company_admin: true,
          hire_date: new Date().toISOString().split('T')[0], // Today's date
        });

      if (profileError) {
        // If entity_users insert fails, we should clean up the auth user
        // Note: In production, you might want to handle this more gracefully
        console.error('Failed to create user profile:', profileError);
        throw new Error(`Failed to create user profile: ${profileError.message}`);
      }

      toast.success('Tenant Super Admin created successfully');
      onSuccess();
    } catch (error) {
      console.error('Error creating tenant super admin:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create tenant super admin');
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const companyOptions = companies.map(company => ({
    value: company.id,
    label: `${company.name}${company.code ? ` (${company.code})` : ''}`
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Creating Tenant Super Admin
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              This user will have full administrative access to their assigned company's data and portal.
            </p>
          </div>
        </div>
      </div>

      <FormField
        id="name"
        label="Full Name"
        required
        error={errors.name}
      >
        <Input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="Enter full name"
          disabled={loading}
          leftIcon={<User className="h-5 w-5 text-gray-400" />}
          error={!!errors.name}
        />
      </FormField>

      <FormField
        id="email"
        label="Email Address"
        required
        error={errors.email}
      >
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          placeholder="Enter email address"
          disabled={loading}
          leftIcon={<Mail className="h-5 w-5 text-gray-400" />}
          error={!!errors.email}
        />
      </FormField>

      <FormField
        id="password"
        label="Password"
        required
        error={errors.password}
        description="Password must be at least 8 characters long"
      >
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            placeholder="Enter password"
            disabled={loading}
            leftIcon={<Lock className="h-5 w-5 text-gray-400" />}
            error={!!errors.password}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 text-gray-400" />
            ) : (
              <Eye className="h-5 w-5 text-gray-400" />
            )}
          </button>
        </div>
      </FormField>

      <FormField
        id="company"
        label="Assign to Company"
        required
        error={errors.companyId}
      >
        {loadingCompanies ? (
          <div className="flex items-center justify-center py-2">
            <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
            <span className="text-sm text-gray-500">Loading companies...</span>
          </div>
        ) : (
          <Select
            id="company"
            options={companyOptions}
            value={formData.companyId}
            onChange={(value) => handleInputChange('companyId', value)}
            placeholder="Select a company"
            disabled={loading}
            error={!!errors.companyId}
          />
        )}
      </FormField>

      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
          Default Settings
        </h4>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex justify-between">
            <span>Role:</span>
            <span className="font-medium">Tenant Super Admin</span>
          </div>
          <div className="flex justify-between">
            <span>Department:</span>
            <span className="font-medium">Administration</span>
          </div>
          <div className="flex justify-between">
            <span>Status:</span>
            <span className="font-medium text-green-600 dark:text-green-400">Active</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading || loadingCompanies}
          leftIcon={loading ? (
            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <User className="h-4 w-4" />
          )}
        >
          {loading ? 'Creating...' : 'Create Tenant Super Admin'}
        </Button>
      </div>
    </form>
  );
}