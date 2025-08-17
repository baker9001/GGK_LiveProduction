/**
 * File: /home/project/src/app/entity-module/organisation/wizard/page.tsx
 * 
 * Multi-Step Wizard for Creating/Editing Organizations
 * Handles Companies, Schools, and Branches with all database fields
 * 
 * Dependencies:
 *   - @/lib/supabase
 *   - @/lib/auth
 *   - @/contexts/UserContext
 *   - @/components/shared/*
 *   - External: react, @tanstack/react-query, lucide-react, react-hot-toast
 * 
 * Database Tables:
 *   - companies & companies_additional
 *   - schools & schools_additional  
 *   - branches & branches_additional
 *   - regions, countries (for reference data)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2, School, MapPin, ChevronLeft, ChevronRight,
  Save, X, Check, AlertCircle, Loader2, User, Phone,
  Mail, Globe, Calendar, Hash, Shield, Clock, Users,
  FileText, Navigation, Info, Briefcase, GraduationCap,
  Home, Flag, CreditCard, BookOpen, FlaskConical, Dumbbell,
  Coffee, ArrowLeft
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { getAuthenticatedUser } from '../../../../lib/auth';
import { useUser } from '../../../../contexts/UserContext';
import { Button } from '../../../../components/shared/Button';
import { FormField, Input, Select, Textarea } from '../../../../components/shared/FormField';

// ===== TYPE DEFINITIONS =====
type EntityType = 'company' | 'school' | 'branch';
type WizardMode = 'create' | 'edit';

interface WizardStep {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  fields: string[];
}

interface FormData {
  // Company fields
  name?: string;
  code?: string;
  description?: string;
  status?: string;
  region_id?: string;
  country_id?: string;
  address?: string;
  notes?: string;
  logo?: string;
  
  // Company Additional fields
  organization_type?: string;
  fiscal_year_start?: number;
  main_phone?: string;
  main_email?: string;
  website?: string;
  head_office_address?: string;
  head_office_city?: string;
  head_office_country?: string;
  registration_number?: string;
  tax_id?: string;
  logo_url?: string;
  ceo_name?: string;
  ceo_email?: string;
  ceo_phone?: string;
  
  // School fields
  company_id?: string;
  
  // School Additional fields
  school_type?: string;
  curriculum_type?: string[];
  total_capacity?: number;
  teachers_count?: number;
  principal_name?: string;
  principal_email?: string;
  principal_phone?: string;
  campus_address?: string;
  campus_city?: string;
  campus_state?: string;
  campus_postal_code?: string;
  latitude?: number;
  longitude?: number;
  established_date?: string;
  academic_year_start?: number;
  academic_year_end?: number;
  has_library?: boolean;
  has_laboratory?: boolean;
  has_sports_facilities?: boolean;
  has_cafeteria?: boolean;
  student_count?: number;
  active_teachers_count?: number;
  
  // Branch fields
  school_id?: string;
  
  // Branch Additional fields
  student_capacity?: number;
  current_students?: number;
  branch_head_name?: string;
  branch_head_email?: string;
  branch_head_phone?: string;
  building_name?: string;
  floor_details?: string;
  opening_time?: string;
  closing_time?: string;
  working_days?: string[];
}

// ===== WIZARD STEPS CONFIGURATION =====
const COMPANY_STEPS: WizardStep[] = [
  {
    id: 'basic',
    title: 'Basic Information',
    subtitle: 'Essential company details',
    icon: Building2,
    fields: ['name', 'code', 'status', 'description', 'organization_type']
  },
  {
    id: 'location',
    title: 'Location & Registration',
    subtitle: 'Address and legal information',
    icon: Navigation,
    fields: ['region_id', 'country_id', 'head_office_address', 'head_office_city', 'head_office_country', 'registration_number', 'tax_id', 'fiscal_year_start']
  },
  {
    id: 'contact',
    title: 'Contact Information',
    subtitle: 'Communication details',
    icon: Phone,
    fields: ['main_phone', 'main_email', 'website', 'ceo_name', 'ceo_email', 'ceo_phone']
  },
  {
    id: 'additional',
    title: 'Additional Details',
    subtitle: 'Notes and branding',
    icon: FileText,
    fields: ['address', 'notes', 'logo', 'logo_url']
  }
];

const SCHOOL_STEPS: WizardStep[] = [
  {
    id: 'basic',
    title: 'Basic Information',
    subtitle: 'Essential school details',
    icon: School,
    fields: ['name', 'code', 'status', 'description', 'school_type', 'curriculum_type']
  },
  {
    id: 'leadership',
    title: 'Leadership & Staff',
    subtitle: 'Principal and teacher information',
    icon: User,
    fields: ['principal_name', 'principal_email', 'principal_phone', 'teachers_count', 'active_teachers_count']
  },
  {
    id: 'location',
    title: 'Campus Location',
    subtitle: 'School address and coordinates',
    icon: MapPin,
    fields: ['campus_address', 'campus_city', 'campus_state', 'campus_postal_code', 'latitude', 'longitude', 'address']
  },
  {
    id: 'capacity',
    title: 'Capacity & Schedule',
    subtitle: 'Student capacity and academic calendar',
    icon: Calendar,
    fields: ['total_capacity', 'student_count', 'established_date', 'academic_year_start', 'academic_year_end']
  },
  {
    id: 'facilities',
    title: 'Facilities',
    subtitle: 'Available amenities',
    icon: Building2,
    fields: ['has_library', 'has_laboratory', 'has_sports_facilities', 'has_cafeteria', 'notes', 'logo']
  }
];

const BRANCH_STEPS: WizardStep[] = [
  {
    id: 'basic',
    title: 'Basic Information',
    subtitle: 'Essential branch details',
    icon: MapPin,
    fields: ['name', 'code', 'status', 'description', 'building_name', 'floor_details']
  },
  {
    id: 'leadership',
    title: 'Branch Management',
    subtitle: 'Branch head information',
    icon: User,
    fields: ['branch_head_name', 'branch_head_email', 'branch_head_phone', 'teachers_count']
  },
  {
    id: 'capacity',
    title: 'Capacity',
    subtitle: 'Student and staff numbers',
    icon: Users,
    fields: ['student_capacity', 'current_students', 'student_count', 'active_teachers_count']
  },
  {
    id: 'schedule',
    title: 'Operating Schedule',
    subtitle: 'Working hours and days',
    icon: Clock,
    fields: ['opening_time', 'closing_time', 'working_days', 'address', 'notes']
  }
];

// ===== MAIN WIZARD COMPONENT =====
export default function OrganizationWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useUser();
  
  // Parse URL parameters
  const entityType = (searchParams.get('type') as EntityType) || 'company';
  const mode = (searchParams.get('mode') as WizardMode) || 'create';
  const entityId = searchParams.get('id');
  const parentId = searchParams.get('parentId');
  
  // State
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [regionName, setRegionName] = useState<string>('');
  const [countryName, setCountryName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get steps based on entity type
  const steps = entityType === 'company' ? COMPANY_STEPS :
                entityType === 'school' ? SCHOOL_STEPS : BRANCH_STEPS;
  
  // ===== FETCH USER COMPANY =====
  useEffect(() => {
    const fetchUserCompany = async () => {
      const authenticatedUser = await getAuthenticatedUser();
      if (!authenticatedUser) return;
      
      const { data: entityUser } = await supabase
        .from('entity_users')
        .select('company_id')
        .eq('user_id', authenticatedUser.id)
        .single();
      
      if (entityUser?.company_id) {
        setUserCompanyId(entityUser.company_id);
        
        // Fetch company region and country for display
        const { data: company } = await supabase
          .from('companies')
          .select(`
            region_id,
            country_id,
            regions!companies_region_id_fkey (name),
            countries!companies_country_id_fkey (name)
          `)
          .eq('id', entityUser.company_id)
          .single();
        
        if (company) {
          setFormData(prev => ({
            ...prev,
            region_id: company.region_id,
            country_id: company.country_id
          }));
          setRegionName(company.regions?.name || '');
          setCountryName(company.countries?.name || '');
        }
      }
    };
    
    fetchUserCompany();
  }, []);
  
  // ===== FETCH EXISTING DATA FOR EDIT MODE =====
  useQuery(
    ['entity-data', entityType, entityId],
    async () => {
      if (mode !== 'edit' || !entityId) return null;
      
      // Fetch main entity data
      const { data: mainData, error: mainError } = await supabase
        .from(`${entityType === 'company' ? 'companies' : entityType}s`)
        .select('*')
        .eq('id', entityId)
        .single();
      
      if (mainError) throw mainError;
      
      // Fetch additional data
      const { data: additionalData } = await supabase
        .from(`${entityType === 'company' ? 'companies' : entityType}s_additional`)
        .select('*')
        .eq(`${entityType}_id`, entityId)
        .maybeSingle();
      
      const combined = { ...mainData, ...additionalData };
      setFormData(combined);
      
      return combined;
    },
    {
      enabled: mode === 'edit' && !!entityId,
      onError: (error: any) => {
        toast.error('Failed to load data');
        console.error(error);
      }
    }
  );
  
  // ===== FETCH REFERENCE DATA =====
  const { data: companies = [] } = useQuery(
    ['companies-list'],
    async () => {
      if (entityType !== 'school') return [];
      
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    { enabled: entityType === 'school' }
  );
  
  const { data: schools = [] } = useQuery(
    ['schools-list', formData.company_id || parentId],
    async () => {
      if (entityType !== 'branch') return [];
      
      const companyId = formData.company_id || parentId || userCompanyId;
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('schools')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    { enabled: entityType === 'branch' }
  );
  
  // ===== VALIDATION =====
  const validateStep = (stepIndex: number): boolean => {
    const step = steps[stepIndex];
    const errors: Record<string, string> = {};
    
    // Required fields validation
    const requiredFields: Record<string, string[]> = {
      company: ['name', 'code', 'status'],
      school: ['name', 'code', 'status', 'company_id'],
      branch: ['name', 'code', 'status', 'school_id']
    };
    
    if (stepIndex === 0) { // Only validate required fields on first step
      requiredFields[entityType].forEach(field => {
        if (!formData[field as keyof FormData]) {
          errors[field] = `${field.replace('_', ' ')} is required`;
        }
      });
    }
    
    // Email validation
    ['main_email', 'ceo_email', 'principal_email', 'branch_head_email'].forEach(field => {
      const value = formData[field as keyof FormData];
      if (value && typeof value === 'string' && !value.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        errors[field] = 'Invalid email address';
      }
    });
    
    // URL validation
    if (formData.website && !formData.website.match(/^https?:\/\/.+/)) {
      errors.website = 'Invalid URL (must start with http:// or https://)';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // ===== HANDLE SUBMIT =====
  const handleSubmit = async () => {
    // Validate all steps
    let hasErrors = false;
    for (let i = 0; i <= currentStep; i++) {
      if (!validateStep(i)) {
        hasErrors = true;
        setCurrentStep(i); // Go to first step with errors
        break;
      }
    }
    
    if (hasErrors) {
      toast.error('Please fix all errors before submitting');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare main table data
      const mainFields = entityType === 'company' 
        ? ['name', 'code', 'description', 'status', 'region_id', 'country_id', 'address', 'notes', 'logo']
        : entityType === 'school'
        ? ['name', 'code', 'description', 'status', 'company_id', 'address', 'notes', 'logo']
        : ['name', 'code', 'description', 'status', 'school_id', 'address', 'notes'];
      
      const mainData: any = {};
      mainFields.forEach(field => {
        if (formData[field as keyof FormData] !== undefined) {
          mainData[field] = formData[field as keyof FormData];
        }
      });
      
      // Set default values
      mainData.status = mainData.status || 'active';
      
      // Add parent IDs
      if (entityType === 'school' && !mainData.company_id) {
        mainData.company_id = parentId || userCompanyId;
      }
      if (entityType === 'branch' && !mainData.school_id) {
        mainData.school_id = parentId;
      }
      
      let entityRecord;
      
      if (mode === 'create') {
        // Create main record
        const { data, error } = await supabase
          .from(`${entityType === 'company' ? 'companies' : entityType}s`)
          .insert([mainData])
          .select()
          .single();
        
        if (error) throw error;
        entityRecord = data;
        
        // Create additional record
        const additionalData: any = {
          [`${entityType}_id`]: data.id
        };
        
        // Add all other fields to additional data
        Object.keys(formData).forEach(key => {
          if (!mainFields.includes(key) && formData[key as keyof FormData] !== undefined) {
            additionalData[key] = formData[key as keyof FormData];
          }
        });
        
        if (Object.keys(additionalData).length > 1) {
          const { error: additionalError } = await supabase
            .from(`${entityType === 'company' ? 'companies' : entityType}s_additional`)
            .insert([additionalData]);
          
          if (additionalError && additionalError.code !== '23505') {
            console.error('Additional data error:', additionalError);
          }
        }
      } else {
        // Update main record
        const { data, error } = await supabase
          .from(`${entityType === 'company' ? 'companies' : entityType}s`)
          .update(mainData)
          .eq('id', entityId!)
          .select()
          .single();
        
        if (error) throw error;
        entityRecord = data;
        
        // Update or insert additional record
        const additionalData: any = {
          [`${entityType}_id`]: entityId
        };
        
        Object.keys(formData).forEach(key => {
          if (!mainFields.includes(key) && formData[key as keyof FormData] !== undefined) {
            additionalData[key] = formData[key as keyof FormData];
          }
        });
        
        if (Object.keys(additionalData).length > 1) {
          // Try update first
          const { error: updateError } = await supabase
            .from(`${entityType === 'company' ? 'companies' : entityType}s_additional`)
            .update(additionalData)
            .eq(`${entityType}_id`, entityId!);
          
          // If no rows updated, insert
          if (updateError?.code === 'PGRST116') {
            const { error: insertError } = await supabase
              .from(`${entityType === 'company' ? 'companies' : entityType}s_additional`)
              .insert([additionalData]);
            
            if (insertError && insertError.code !== '23505') {
              console.error('Additional insert error:', insertError);
            }
          }
        }
      }
      
      // Invalidate queries
      queryClient.invalidateQueries(['organization']);
      queryClient.invalidateQueries(['company']);
      queryClient.invalidateQueries(['schools']);
      queryClient.invalidateQueries(['branches']);
      
      toast.success(`${entityType} ${mode === 'create' ? 'created' : 'updated'} successfully!`);
      
      // Redirect back to organization page
      router.push('/entity-module/organisation');
      
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(error.message || 'Failed to save data');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // ===== RENDER FIELD =====
  const renderField = (fieldName: string) => {
    const fieldConfig: Record<string, any> = {
      // Text fields
      name: { label: 'Name', type: 'text', required: true, placeholder: `Enter ${entityType} name` },
      code: { label: 'Code', type: 'text', required: true, placeholder: `Enter unique code` },
      description: { label: 'Description', type: 'textarea', placeholder: 'Enter description' },
      
      // Status
      status: { 
        label: 'Status', 
        type: 'select', 
        required: true,
        options: [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' }
        ]
      },
      
      // Company fields
      organization_type: {
        label: 'Organization Type',
        type: 'select',
        options: [
          { value: 'education_group', label: 'Education Group' },
          { value: 'single_institution', label: 'Single Institution' },
          { value: 'franchise', label: 'Franchise' },
          { value: 'partnership', label: 'Partnership' }
        ]
      },
      fiscal_year_start: { label: 'Fiscal Year Start Month', type: 'number', min: 1, max: 12 },
      main_phone: { label: 'Main Phone', type: 'tel', placeholder: '+1234567890' },
      main_email: { label: 'Main Email', type: 'email', placeholder: 'contact@company.com' },
      website: { label: 'Website', type: 'url', placeholder: 'https://www.example.com' },
      head_office_address: { label: 'Head Office Address', type: 'text' },
      head_office_city: { label: 'Head Office City', type: 'text' },
      head_office_country: { label: 'Head Office Country', type: 'text' },
      registration_number: { label: 'Registration Number', type: 'text' },
      tax_id: { label: 'Tax ID', type: 'text' },
      logo_url: { label: 'Logo URL', type: 'url' },
      ceo_name: { label: 'CEO Name', type: 'text' },
      ceo_email: { label: 'CEO Email', type: 'email' },
      ceo_phone: { label: 'CEO Phone', type: 'tel' },
      address: { label: 'Address', type: 'textarea' },
      notes: { label: 'Notes', type: 'textarea' },
      logo: { label: 'Logo Path', type: 'text' },
      
      // School fields
      company_id: {
        label: 'Company',
        type: 'select',
        required: true,
        options: companies.map(c => ({ value: c.id, label: c.name }))
      },
      school_type: {
        label: 'School Type',
        type: 'select',
        options: [
          { value: 'primary', label: 'Primary' },
          { value: 'secondary', label: 'Secondary' },
          { value: 'other', label: 'Other' }
        ]
      },
      curriculum_type: {
        label: 'Curriculum Types',
        type: 'multiselect',
        options: [
          { value: 'national', label: 'National' },
          { value: 'cambridge', label: 'Cambridge' },
          { value: 'ib', label: 'International Baccalaureate' },
          { value: 'american', label: 'American' },
          { value: 'other', label: 'Other' }
        ]
      },
      total_capacity: { label: 'Total Capacity', type: 'number', min: 0 },
      student_count: { label: 'Current Students', type: 'number', min: 0 },
      teachers_count: { label: 'Total Teachers', type: 'number', min: 0 },
      active_teachers_count: { label: 'Active Teachers', type: 'number', min: 0 },
      principal_name: { label: 'Principal Name', type: 'text' },
      principal_email: { label: 'Principal Email', type: 'email' },
      principal_phone: { label: 'Principal Phone', type: 'tel' },
      campus_address: { label: 'Campus Address', type: 'text' },
      campus_city: { label: 'Campus City', type: 'text' },
      campus_state: { label: 'Campus State', type: 'text' },
      campus_postal_code: { label: 'Postal Code', type: 'text' },
      latitude: { label: 'Latitude', type: 'number', step: 0.000001 },
      longitude: { label: 'Longitude', type: 'number', step: 0.000001 },
      established_date: { label: 'Established Date', type: 'date' },
      academic_year_start: { label: 'Academic Year Start Month', type: 'number', min: 1, max: 12 },
      academic_year_end: { label: 'Academic Year End Month', type: 'number', min: 1, max: 12 },
      has_library: { label: 'Has Library', type: 'checkbox' },
      has_laboratory: { label: 'Has Laboratory', type: 'checkbox' },
      has_sports_facilities: { label: 'Has Sports Facilities', type: 'checkbox' },
      has_cafeteria: { label: 'Has Cafeteria', type: 'checkbox' },
      
      // Branch fields
      school_id: {
        label: 'School',
        type: 'select',
        required: true,
        options: schools.map(s => ({ value: s.id, label: s.name }))
      },
      student_capacity: { label: 'Student Capacity', type: 'number', min: 0 },
      current_students: { label: 'Current Students', type: 'number', min: 0 },
      branch_head_name: { label: 'Branch Head Name', type: 'text' },
      branch_head_email: { label: 'Branch Head Email', type: 'email' },
      branch_head_phone: { label: 'Branch Head Phone', type: 'tel' },
      building_name: { label: 'Building Name', type: 'text' },
      floor_details: { label: 'Floor Details', type: 'text' },
      opening_time: { label: 'Opening Time', type: 'time' },
      closing_time: { label: 'Closing Time', type: 'time' },
      working_days: {
        label: 'Working Days',
        type: 'multiselect',
        options: [
          { value: 'monday', label: 'Monday' },
          { value: 'tuesday', label: 'Tuesday' },
          { value: 'wednesday', label: 'Wednesday' },
          { value: 'thursday', label: 'Thursday' },
          { value: 'friday', label: 'Friday' },
          { value: 'saturday', label: 'Saturday' },
          { value: 'sunday', label: 'Sunday' }
        ]
      }
    };
    
    const config = fieldConfig[fieldName] || { label: fieldName, type: 'text' };
    
    // Special handling for region and country (disabled for company)
    if (fieldName === 'region_id' && entityType === 'company') {
      return (
        <FormField
          key={fieldName}
          id={fieldName}
          label="Region"
          required
          helpText="Region is set based on your company assignment"
        >
          <div className="flex items-center gap-2">
            <Input
              id={fieldName}
              value={regionName}
              disabled
              className="bg-gray-50 dark:bg-gray-700"
            />
            <Flag className="w-4 h-4 text-gray-400" />
          </div>
        </FormField>
      );
    }
    
    if (fieldName === 'country_id' && entityType === 'company') {
      return (
        <FormField
          key={fieldName}
          id={fieldName}
          label="Country"
          required
          helpText="Country is set based on your company assignment"
        >
          <div className="flex items-center gap-2">
            <Input
              id={fieldName}
              value={countryName}
              disabled
              className="bg-gray-50 dark:bg-gray-700"
            />
            <Globe className="w-4 h-4 text-gray-400" />
          </div>
        </FormField>
      );
    }
    
    // Render based on type
    if (config.type === 'select') {
      return (
        <FormField
          key={fieldName}
          id={fieldName}
          label={config.label}
          required={config.required}
          error={formErrors[fieldName]}
        >
          <Select
            id={fieldName}
            options={config.options}
            value={formData[fieldName as keyof FormData] as string}
            onChange={(value) => setFormData({ ...formData, [fieldName]: value })}
          />
        </FormField>
      );
    }
    
    if (config.type === 'multiselect') {
      const currentValue = formData[fieldName as keyof FormData] as string[] || [];
      return (
        <FormField
          key={fieldName}
          id={fieldName}
          label={config.label}
          required={config.required}
          error={formErrors[fieldName]}
        >
          <div className="space-y-2">
            {config.options.map((option: any) => (
              <label key={option.value} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={currentValue.includes(option.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({ ...formData, [fieldName]: [...currentValue, option.value] });
                    } else {
                      setFormData({ ...formData, [fieldName]: currentValue.filter(v => v !== option.value) });
                    }
                  }}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
              </label>
            ))}
          </div>
        </FormField>
      );
    }
    
    if (config.type === 'textarea') {
      return (
        <FormField
          key={fieldName}
          id={fieldName}
          label={config.label}
          required={config.required}
          error={formErrors[fieldName]}
        >
          <Textarea
            id={fieldName}
            placeholder={config.placeholder}
            value={formData[fieldName as keyof FormData] as string || ''}
            onChange={(e) => setFormData({ ...formData, [fieldName]: e.target.value })}
            rows={3}
          />
        </FormField>
      );
    }
    
    if (config.type === 'checkbox') {
      return (
        <div key={fieldName} className="flex items-center gap-2">
          <input
            type="checkbox"
            id={fieldName}
            checked={formData[fieldName as keyof FormData] as boolean || false}
            onChange={(e) => setFormData({ ...formData, [fieldName]: e.target.checked })}
            className="rounded border-gray-300 dark:border-gray-600"
          />
          <label htmlFor={fieldName} className="text-sm text-gray-700 dark:text-gray-300">
            {config.label}
          </label>
        </div>
      );
    }
    
    // Default input field
    return (
      <FormField
        key={fieldName}
        id={fieldName}
        label={config.label}
        required={config.required}
        error={formErrors[fieldName]}
      >
        <Input
          id={fieldName}
          type={config.type}
          placeholder={config.placeholder}
          value={formData[fieldName as keyof FormData] as string || ''}
          onChange={(e) => setFormData({ ...formData, [fieldName]: e.target.value })}
          min={config.min}
          max={config.max}
          step={config.step}
        />
      </FormField>
    );
  };
  
  // ===== RENDER UI =====
  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/entity-module/organisation')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Organization
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {mode === 'create' ? 'Create' : 'Edit'} {entityType === 'company' ? 'Company' : entityType === 'school' ? 'School' : 'Branch'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Complete all steps to {mode === 'create' ? 'create a new' : 'update the'} {entityType}
          </p>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        
        {/* Step Indicators */}
        <div className="flex justify-between mb-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div
                key={step.id}
                className={`flex flex-col items-center cursor-pointer ${
                  isActive ? 'text-blue-600 dark:text-blue-400' :
                  isCompleted ? 'text-green-600 dark:text-green-400' :
                  'text-gray-400 dark:text-gray-600'
                }`}
                onClick={() => {
                  if (index <= currentStep) {
                    setCurrentStep(index);
                  }
                }}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                  isActive ? 'bg-blue-100 dark:bg-blue-900' :
                  isCompleted ? 'bg-green-100 dark:bg-green-900' :
                  'bg-gray-100 dark:bg-gray-800'
                }`}>
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span className="text-xs text-center hidden sm:block">{step.title}</span>
              </div>
            );
          })}
        </div>
        
        {/* Form Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <currentStepData.icon className="w-5 h-5" />
              {currentStepData.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {currentStepData.subtitle}
            </p>
          </div>
          
          <div className="space-y-4">
            {currentStepData.fields.map(fieldName => renderField(fieldName))}
          </div>
          
          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => router.push('/entity-module/organisation')}
              >
                Cancel
              </Button>
              
              {currentStep === steps.length - 1 ? (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {mode === 'create' ? 'Create' : 'Update'} {entityType}
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    if (validateStep(currentStep)) {
                      setCurrentStep(Math.min(steps.length - 1, currentStep + 1));
                    }
                  }}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}