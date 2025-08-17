/**
 * File: /src/app/entity-module/organisation/wizard/page.tsx
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

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Building2, School, MapPin, ChevronLeft, ChevronRight,
  Save, X, Check, AlertCircle, Loader2, User, Phone,
  Mail, Globe, Calendar, Hash, Shield, Clock, Users,
  FileText, Navigation, Info, Briefcase, GraduationCap,
  Home, Flag, CreditCard, BookOpen, FlaskConical, Dumbbell,
  Coffee, ArrowLeft, CheckCircle2, AlertTriangle, Building,
  MapPinned, Sparkles, Zap, Target, TrendingUp, RotateCcw,
  UserCheck
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
  validation?: (data: FormData) => Record<string, string>;
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
  teachers_count?: number;
}

// ===== VALIDATION HELPERS =====
const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validateUrl = (url: string): boolean => {
  return /^https?:\/\/.+/.test(url);
};

const validatePhone = (phone: string): boolean => {
  return /^\+?[\d\s-()]+$/.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

// ===== WIZARD STEPS CONFIGURATION =====
const COMPANY_STEPS: WizardStep[] = [
  {
    id: 'basic',
    title: 'Basic Information',
    subtitle: 'Essential company details',
    icon: Building2,
    fields: ['name', 'code', 'status', 'description', 'organization_type'],
    validation: (data: FormData) => {
      const errors: Record<string, string> = {};
      if (!data.name) errors.name = 'Company name is required';
      if (!data.code) errors.code = 'Company code is required';
      if (data.code && data.code.length < 3) errors.code = 'Code must be at least 3 characters';
      if (!data.status) errors.status = 'Status is required';
      return errors;
    }
  },
  {
    id: 'location',
    title: 'Location & Registration',
    subtitle: 'Address and legal information',
    icon: Navigation,
    fields: ['region_id', 'country_id', 'head_office_address', 'head_office_city', 'head_office_country', 'registration_number', 'tax_id', 'fiscal_year_start'],
    validation: (data: FormData) => {
      const errors: Record<string, string> = {};
      if (data.fiscal_year_start && (data.fiscal_year_start < 1 || data.fiscal_year_start > 12)) {
        errors.fiscal_year_start = 'Month must be between 1 and 12';
      }
      return errors;
    }
  },
  {
    id: 'contact',
    title: 'Contact Information',
    subtitle: 'Communication details',
    icon: Phone,
    fields: ['main_phone', 'main_email', 'website', 'ceo_name', 'ceo_email', 'ceo_phone'],
    validation: (data: FormData) => {
      const errors: Record<string, string> = {};
      if (data.main_email && !validateEmail(data.main_email)) {
        errors.main_email = 'Invalid email address';
      }
      if (data.ceo_email && !validateEmail(data.ceo_email)) {
        errors.ceo_email = 'Invalid email address';
      }
      if (data.website && !validateUrl(data.website)) {
        errors.website = 'URL must start with http:// or https://';
      }
      if (data.main_phone && !validatePhone(data.main_phone)) {
        errors.main_phone = 'Invalid phone number';
      }
      if (data.ceo_phone && !validatePhone(data.ceo_phone)) {
        errors.ceo_phone = 'Invalid phone number';
      }
      return errors;
    }
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
    fields: ['name', 'code', 'status', 'description', 'school_type', 'curriculum_type'],
    validation: (data: FormData) => {
      const errors: Record<string, string> = {};
      if (!data.name) errors.name = 'School name is required';
      if (!data.code) errors.code = 'School code is required';
      if (data.code && data.code.length < 3) errors.code = 'Code must be at least 3 characters';
      if (!data.status) errors.status = 'Status is required';
      return errors;
    }
  },
  {
    id: 'leadership',
    title: 'Leadership & Staff',
    subtitle: 'Principal and teacher information',
    icon: User,
    fields: ['principal_name', 'principal_email', 'principal_phone', 'teachers_count', 'active_teachers_count'],
    validation: (data: FormData) => {
      const errors: Record<string, string> = {};
      if (data.principal_email && !validateEmail(data.principal_email)) {
        errors.principal_email = 'Invalid email address';
      }
      if (data.principal_phone && !validatePhone(data.principal_phone)) {
        errors.principal_phone = 'Invalid phone number';
      }
      if (data.active_teachers_count && data.teachers_count && 
          data.active_teachers_count > data.teachers_count) {
        errors.active_teachers_count = 'Cannot exceed total teachers';
      }
      return errors;
    }
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
    fields: ['total_capacity', 'student_count', 'established_date', 'academic_year_start', 'academic_year_end'],
    validation: (data: FormData) => {
      const errors: Record<string, string> = {};
      if (data.student_count && data.total_capacity && 
          data.student_count > data.total_capacity) {
        errors.student_count = 'Cannot exceed total capacity';
      }
      if (data.academic_year_start && (data.academic_year_start < 1 || data.academic_year_start > 12)) {
        errors.academic_year_start = 'Month must be between 1 and 12';
      }
      if (data.academic_year_end && (data.academic_year_end < 1 || data.academic_year_end > 12)) {
        errors.academic_year_end = 'Month must be between 1 and 12';
      }
      return errors;
    }
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
    fields: ['name', 'code', 'status', 'description', 'building_name', 'floor_details'],
    validation: (data: FormData) => {
      const errors: Record<string, string> = {};
      if (!data.name) errors.name = 'Branch name is required';
      if (!data.code) errors.code = 'Branch code is required';
      if (data.code && data.code.length < 3) errors.code = 'Code must be at least 3 characters';
      if (!data.status) errors.status = 'Status is required';
      return errors;
    }
  },
  {
    id: 'leadership',
    title: 'Branch Management',
    subtitle: 'Branch head information',
    icon: User,
    fields: ['branch_head_name', 'branch_head_email', 'branch_head_phone', 'teachers_count'],
    validation: (data: FormData) => {
      const errors: Record<string, string> = {};
      if (data.branch_head_email && !validateEmail(data.branch_head_email)) {
        errors.branch_head_email = 'Invalid email address';
      }
      if (data.branch_head_phone && !validatePhone(data.branch_head_phone)) {
        errors.branch_head_phone = 'Invalid phone number';
      }
      return errors;
    }
  },
  {
    id: 'capacity',
    title: 'Capacity',
    subtitle: 'Student and staff numbers',
    icon: Users,
    fields: ['student_capacity', 'current_students', 'student_count', 'active_teachers_count'],
    validation: (data: FormData) => {
      const errors: Record<string, string> = {};
      if (data.current_students && data.student_capacity && 
          data.current_students > data.student_capacity) {
        errors.current_students = 'Cannot exceed student capacity';
      }
      return errors;
    }
  },
  {
    id: 'schedule',
    title: 'Operating Schedule',
    subtitle: 'Working hours and days',
    icon: Clock,
    fields: ['opening_time', 'closing_time', 'working_days', 'address', 'notes']
  }
];

// ===== PROGRESS INDICATOR COMPONENT =====
const StepProgressIndicator = ({ 
  steps, 
  currentStep, 
  completedSteps,
  onStepClick 
}: { 
  steps: WizardStep[];
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick: (index: number) => void;
}) => {
  return (
    <div className="flex justify-between items-center relative">
      {/* Progress Line */}
      <div className="absolute top-5 left-8 right-8 h-0.5 bg-gray-200 dark:bg-gray-700">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
          style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
        />
      </div>
      
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = index === currentStep;
        const isCompleted = completedSteps.has(index);
        const isClickable = index <= currentStep || isCompleted;
        
        return (
          <div
            key={step.id}
            className={`relative flex flex-col items-center ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'} group`}
            onClick={() => isClickable && onStepClick(index)}
          >
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all duration-300 transform
              ${isActive ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg scale-110 ring-4 ring-blue-200 dark:ring-blue-800' :
                isCompleted ? 'bg-green-500 text-white shadow-md hover:scale-105' :
                'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'}
            `}>
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Icon className="w-5 h-5" />
              )}
            </div>
            
            {/* Step Label */}
            <div className="absolute top-12 text-center">
              <span className={`text-xs font-medium whitespace-nowrap ${
                isActive ? 'text-blue-600 dark:text-blue-400' :
                isCompleted ? 'text-green-600 dark:text-green-400' :
                'text-gray-400 dark:text-gray-500'
              }`}>
                {step.title}
              </span>
              
              {/* Tooltip on hover */}
              <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap transition-opacity pointer-events-none">
                {step.subtitle}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ===== MAIN WIZARD COMPONENT =====
export default function OrganizationWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const formRef = useRef<HTMLFormElement>(null);
  
  // Parse URL parameters
  const entityType = (searchParams.get('type') as EntityType) || 'company';
  const mode = (searchParams.get('mode') as WizardMode) || 'create';
  const entityId = searchParams.get('id');
  const parentId = searchParams.get('parentId');
  
  // State
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState<FormData>({ status: 'active' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [regionName, setRegionName] = useState<string>('');
  const [countryName, setCountryName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  
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
    
    // Run custom validation if defined
    if (step.validation) {
      Object.assign(errors, step.validation(formData));
    }
    
    // Mark all fields in this step as touched
    const newTouchedFields = new Set(touchedFields);
    step.fields.forEach(field => newTouchedFields.add(field));
    setTouchedFields(newTouchedFields);
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // ===== HANDLE FIELD CHANGE =====
  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Mark field as touched
    setTouchedFields(prev => new Set(prev).add(field));
    
    // Clear error for this field if it exists
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  
  // ===== HANDLE STEP NAVIGATION =====
  const handleStepClick = (stepIndex: number) => {
    // Validate current step before allowing navigation
    if (stepIndex > currentStep && !validateStep(currentStep)) {
      toast.error('Please complete the current step before proceeding');
      return;
    }
    
    if (stepIndex <= currentStep || completedSteps.has(stepIndex)) {
      setCurrentStep(stepIndex);
    }
  };
  
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCompletedSteps(prev => new Set(prev).add(currentStep));
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    } else {
      toast.error('Please fix the errors before proceeding');
    }
  };
  
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // ===== HANDLE SUBMIT =====
  const handleSubmit = async () => {
    // Validate all steps
    let hasErrors = false;
    for (let i = 0; i < steps.length; i++) {
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
      
      // Show success animation
      setShowSuccessAnimation(true);
      toast.success(`${entityType} ${mode === 'create' ? 'created' : 'updated'} successfully!`);
      
      // Redirect after animation
      setTimeout(() => {
        navigate('/entity-module/organisation');
      }, 1500);
      
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(error.message || 'Failed to save data');
      setIsSubmitting(false);
    }
  };
  
  // ===== RENDER FIELD (Simplified version) =====
  const renderField = (fieldName: string) => {
    const value = formData[fieldName as keyof FormData];
    const hasError = touchedFields.has(fieldName) && formErrors[fieldName];
    
    // Simple text input for most fields
    return (
      <FormField
        key={fieldName}
        id={fieldName}
        label={fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        error={hasError ? formErrors[fieldName] : undefined}
      >
        <Input
          id={fieldName}
          value={value as string || ''}
          onChange={(e) => handleFieldChange(fieldName, e.target.value)}
        />
      </FormField>
    );
  };
  
  // ===== RENDER UI =====
  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  
  // Success Animation Component
  if (showSuccessAnimation) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 bg-green-200 dark:bg-green-800/30 rounded-full animate-ping" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Success!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {entityType} {mode === 'create' ? 'created' : 'updated'} successfully
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Redirecting to organization page...
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/entity-module/organisation')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Organization
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                {mode === 'create' ? (
                  <>
                    <Sparkles className="w-8 h-8 text-blue-500" />
                    Create New {entityType === 'company' ? 'Company' : entityType === 'school' ? 'School' : 'Branch'}
                  </>
                ) : (
                  <>
                    <Edit className="w-8 h-8 text-blue-500" />
                    Edit {entityType === 'company' ? 'Company' : entityType === 'school' ? 'School' : 'Branch'}
                  </>
                )}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Complete all steps to {mode === 'create' ? 'create your new' : 'update the'} {entityType}
              </p>
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Step {currentStep + 1} of {steps.length}
              </span>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                {currentStepData.title}
              </h2>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {Math.round(progress)}%
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-500">Complete</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-blue-500 to-indigo-500 relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>
        </div>
        
        {/* Step Indicators */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <StepProgressIndicator
            steps={steps}
            currentStep={currentStep}
            completedSteps={completedSteps}
            onStepClick={handleStepClick}
          />
        </div>
        
        {/* Form Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          {/* Step Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-t-xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white dark:bg-gray-700 rounded-lg flex items-center justify-center shadow-sm">
                <currentStepData.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {currentStepData.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  {currentStepData.subtitle}
                </p>
              </div>
            </div>
          </div>
          
          {/* Form Fields */}
          <form ref={formRef} className="p-6" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-6">
              {currentStepData.fields.map(fieldName => renderField(fieldName))}
            </div>
          </form>
          
          {/* Navigation Buttons */}
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-xl">
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="min-w-[120px]"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              
              <div className="flex items-center gap-4">
                {/* Step Counter */}
                <div className="flex items-center gap-2">
                  {steps.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentStep 
                          ? 'w-8 bg-blue-600 dark:bg-blue-400' 
                          : completedSteps.has(index)
                          ? 'bg-green-500'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => navigate('/entity-module/organisation')}
                  >
                    Cancel
                  </Button>
                  
                  {currentStep === steps.length - 1 ? (
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="min-w-[140px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
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
                      onClick={handleNext}
                      className="min-w-[120px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
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
      </div>
    </div>
  );
}