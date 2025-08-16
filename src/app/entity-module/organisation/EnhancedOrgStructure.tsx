/**
 * File: /src/app/entity-module/organisation/EnhancedOrganizationPage.tsx
 * Enhanced Organization Management Page with All Requested Features
 * 
 * Dependencies: 
 *   - @/lib/supabase
 *   - @/lib/auth
 *   - @/contexts/UserContext
 *   - @/components/shared/SlideInForm
 *   - @/components/shared/FormField
 *   - @/components/shared/Button
 *   - @/components/shared/StatusBadge
 *   - @/components/shared/ImageUpload
 *   - External: react, @tanstack/react-query, lucide-react, react-hot-toast
 * 
 * Enhanced Features:
 *   1. Logo upload on each level (company, school, branch)
 *   2. Square logo display with dimensions helper
 *   3. Improved card data layout for better readability
 *   4. Entity level tags on cards
 *   5. Region & Country display for entity (disabled)
 *   6. Cascading country/city selection for schools/branches
 *   7. Changed "employees" to "users" terminology
 *   8. Added total students at all levels
 *   9. Comprehensive form fields from database tables
 *   10. Better visual hierarchy and dark mode support
 * 
 * Database Tables:
 *   - companies, companies_additional
 *   - schools, schools_additional  
 *   - branches, branches_additional
 *   - entity_departments, academic_years
 *   - regions, countries, cities
 *   - students, class_sections, grade_levels
 */

import React, { useState, useEffect } from 'react';
import { 
  Building2, School, MapPin, Edit, ChevronDown, ChevronRight,
  Plus, X, Save, Trash2, Users, Search, Filter, Settings,
  Activity, AlertCircle, Loader2, Phone, Mail, Eye,
  Globe, User, MoreVertical, UserPlus, ChevronUp,
  FolderOpen, FileText, Calendar, Shield, Hash, Briefcase,
  Edit2, PlusCircle, Upload, Camera, GraduationCap,
  MapPinned, Home, Building, Clock, CreditCard
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { getAuthenticatedUser } from '@/lib/auth';
import { useUser } from '@/contexts/UserContext';
import { SlideInForm } from '@/components/shared/SlideInForm';
import { FormField, Input, Select, Textarea } from '@/components/shared/FormField';
import { Button } from '@/components/shared/Button';
import { StatusBadge } from '@/components/shared/StatusBadge';

// ===== TYPE DEFINITIONS =====
interface Company {
  id: string;
  name: string;
  code: string;
  description: string;
  status: 'active' | 'inactive';
  created_at: string;
  region_id?: string;
  country_id?: string;
  region?: Region;
  country?: Country;
  additional?: CompanyAdditional;
  schools?: SchoolData[];
}

interface CompanyAdditional {
  id?: string;
  company_id: string;
  organization_type?: 'education_group' | 'single_institution' | 'franchise' | 'partnership';
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
}

interface SchoolData {
  id: string;
  name: string;
  code: string;
  company_id: string;
  description: string;
  status: 'active' | 'inactive';
  created_at: string;
  country_id?: string;
  city_id?: string;
  additional?: SchoolAdditional;
  branches?: BranchData[];
  total_students?: number;
}

interface SchoolAdditional {
  id?: string;
  school_id: string;
  school_type?: 'primary' | 'secondary' | 'higher_secondary' | 'other';
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
  campus_country?: string;
  latitude?: number;
  longitude?: number;
  established_date?: string;
  academic_year_start?: number;
  academic_year_end?: number;
  has_library?: boolean;
  has_laboratory?: boolean;
  has_sports_facilities?: boolean;
  has_cafeteria?: boolean;
  logo_url?: string;
}

interface BranchData {
  id: string;
  name: string;
  code: string;
  school_id: string;
  description: string;
  status: 'active' | 'inactive';
  created_at: string;
  country_id?: string;
  city_id?: string;
  additional?: BranchAdditional;
  total_students?: number;
}

interface BranchAdditional {
  id?: string;
  branch_id: string;
  student_capacity?: number;
  current_students?: number;
  teachers_count?: number;
  branch_head_name?: string;
  branch_head_email?: string;
  branch_head_phone?: string;
  branch_address?: string;
  branch_city?: string;
  branch_country?: string;
  building_name?: string;
  floor_details?: string;
  opening_time?: string;
  closing_time?: string;
  working_days?: string[];
  logo_url?: string;
}

interface Region {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive';
}

interface Country {
  id: string;
  name: string;
  region_id: string;
  status: 'active' | 'inactive';
}

interface City {
  id: string;
  name: string;
  country_id: string;
  status: 'active' | 'inactive';
}

interface Department {
  id: string;
  company_id: string;
  school_id?: string;
  branch_id?: string;
  name: string;
  code: string;
  department_type?: 'academic' | 'administrative' | 'support' | 'operations';
  parent_department_id?: string;
  head_of_department?: string;
  head_email?: string;
  employee_count: number;
  status: 'active' | 'inactive';
}

interface AcademicYear {
  id: string;
  school_id: string;
  year_name: string;
  start_date: string;
  end_date: string;
  total_terms: number;
  current_term?: number;
  is_current: boolean;
  status: 'planned' | 'active' | 'completed';
}

// ===== IMAGE UPLOAD COMPONENT =====
const LogoUpload = ({ 
  currentUrl, 
  onUpload, 
  entityType,
  entityName 
}: { 
  currentUrl?: string; 
  onUpload: (url: string) => void;
  entityType: 'company' | 'school' | 'branch';
  entityName: string;
}) => {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match(/^image\/(jpeg|png|jpg|svg\+xml)$/)) {
      toast.error("Please upload an image file (PNG, JPG, JPEG, or SVG)");
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be less than 2MB");
      return;
    }

    setUploading(true);
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${entityType}_${entityName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.${fileExt}`;
      
      // Determine bucket based on entity type
      const bucket = entityType === 'company' ? 'company-logos' : 
                    entityType === 'school' ? 'school-logos' : 
                    'logos';
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      onUpload(publicUrl);
      toast.success('Logo uploaded successfully!');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Logo
      </label>
      <div className="flex items-center space-x-4">
        {/* Logo Preview */}
        <div className="relative">
          {currentUrl ? (
            <img 
              src={currentUrl} 
              alt="Logo" 
              className="w-24 h-24 object-cover border-2 border-gray-200 dark:border-gray-600 rounded"
            />
          ) : (
            <div className="w-24 h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded flex items-center justify-center bg-gray-50 dark:bg-gray-800">
              <Camera className="w-8 h-8 text-gray-400" />
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
        </div>

        {/* Upload Button */}
        <div className="flex-1">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
            <div className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload Logo'}
            </div>
          </label>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Square image recommended (96x96px min)
          </p>
        </div>
      </div>
    </div>
  );
};

// ===== MAIN COMPONENT =====
export default function EnhancedOrganizationManagement() {
  const queryClient = useQueryClient();
  const { user } = useUser();
  
  // State management
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<'company' | 'school' | 'branch' | null>(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'school' | 'branch' | 'department' | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState<Company | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'details' | 'departments' | 'academic'>('details');
  const [formData, setFormData] = useState<any>({});

  // Fetch regions, countries, cities for dropdowns
  const { data: regions = [] } = useQuery(['regions'], async () => {
    const { data, error } = await supabase
      .from('regions')
      .select('*')
      .eq('status', 'active')
      .order('name');
    if (error) throw error;
    return data || [];
  });

  const { data: countries = [] } = useQuery(
    ['countries', formData.region_id],
    async () => {
      if (!formData.region_id && !companyData?.region_id) return [];
      const regionId = formData.region_id || companyData?.region_id;
      
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .eq('region_id', regionId)
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data || [];
    },
    { enabled: !!(formData.region_id || companyData?.region_id) }
  );

  const { data: cities = [] } = useQuery(
    ['cities', formData.country_id],
    async () => {
      if (!formData.country_id) return [];
      
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .eq('country_id', formData.country_id)
        .eq('status', 'active')
        .order('name');
      if (error) throw error;
      return data || [];
    },
    { enabled: !!formData.country_id }
  );

  // Fetch user's company
  useEffect(() => {
    const fetchUserCompany = async () => {
      try {
        const authenticatedUser = getAuthenticatedUser();
        
        if (!authenticatedUser) {
          console.error('No authenticated user found');
          toast.error('Please login to access this page');
          return;
        }

        const { data: entityUser, error: entityError } = await supabase
          .from('entity_users')
          .select('company_id, is_company_admin')
          .eq('user_id', authenticatedUser.id)
          .single();
        
        if (entityError) {
          console.error('Error fetching entity user:', entityError);
          toast.error('Failed to fetch user information');
          return;
        }

        if (entityUser && entityUser.company_id) {
          setUserCompanyId(entityUser.company_id);
        } else {
          toast.error('No company associated with your account');
        }
      } catch (error) {
        console.error('Error fetching user company:', error);
        toast.error('Failed to identify your company');
      }
    };
    
    fetchUserCompany();
  }, [user]);

  // Initialize expanded nodes
  useEffect(() => {
    if (companyData) {
      const allNodes = new Set<string>(['company']);
      companyData.schools?.forEach(school => {
        allNodes.add(school.id);
      });
      setExpandedNodes(allNodes);
    }
  }, [companyData]);

  // Fetch organization data with student counts
  const { data: organizationData, isLoading, error, refetch } = useQuery(
    ['organization', userCompanyId],
    async () => {
      if (!userCompanyId) {
        throw new Error('No company associated with user');
      }

      // Fetch company data
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select(`
          *,
          regions (id, name, code),
          countries (id, name)
        `)
        .eq('id', userCompanyId)
        .single();

      if (companyError) throw companyError;

      // Fetch company additional data
      const { data: companyAdditional } = await supabase
        .from('companies_additional')
        .select('*')
        .eq('company_id', userCompanyId)
        .maybeSingle();

      // Fetch schools with student counts
      const { data: schools, error: schoolsError } = await supabase
        .from('schools')
        .select('*')
        .eq('company_id', userCompanyId)
        .order('name');

      if (schoolsError) throw schoolsError;

      // Fetch details for each school
      const schoolsWithDetails = await Promise.all((schools || []).map(async (school) => {
        // School additional data
        const { data: schoolAdditional } = await supabase
          .from('schools_additional')
          .select('*')
          .eq('school_id', school.id)
          .maybeSingle();

        // Fetch branches
        const { data: branches } = await supabase
          .from('branches')
          .select('*')
          .eq('school_id', school.id)
          .order('name');

        // Fetch branch details with student counts
        const branchesWithDetails = await Promise.all((branches || []).map(async (branch) => {
          const { data: branchAdditional } = await supabase
            .from('branches_additional')
            .select('*')
            .eq('branch_id', branch.id)
            .maybeSingle();

          // Get student count for branch
          const { data: branchStudents, count } = await supabase
            .from('students')
            .select('id', { count: 'exact', head: true })
            .eq('branch_id', branch.id);

          return { 
            ...branch, 
            additional: branchAdditional,
            total_students: count || 0
          };
        }));

        // Get total student count for school
        const { data: schoolStudents, count: schoolCount } = await supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', school.id);

        return { 
          ...school, 
          additional: schoolAdditional, 
          branches: branchesWithDetails,
          total_students: schoolCount || 0
        };
      }));

      const fullData = { 
        ...company,
        additional: companyAdditional, 
        schools: schoolsWithDetails,
        total_students: schoolsWithDetails.reduce((acc, school) => acc + (school.total_students || 0), 0)
      };

      setCompanyData(fullData);
      return fullData;
    },
    {
      enabled: !!userCompanyId,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false
    }
  );

  // Fetch departments
  const { data: departments } = useQuery(
    ['departments', selectedItem?.id, selectedType],
    async () => {
      if (!selectedItem) return [];
      
      let query = supabase.from('entity_departments').select('*');
      
      if (selectedType === 'company') {
        query = query.eq('company_id', selectedItem.id).is('school_id', null).is('branch_id', null);
      } else if (selectedType === 'school') {
        query = query.eq('school_id', selectedItem.id);
      } else if (selectedType === 'branch') {
        query = query.eq('branch_id', selectedItem.id);
      }
      
      const { data, error } = await query.order('name');
      
      if (error) throw error;
      return data || [];
    },
    { enabled: !!selectedItem && activeTab === 'departments' }
  );

  // Fetch academic years
  const { data: academicYears } = useQuery(
    ['academicYears', selectedItem?.id],
    async () => {
      if (!selectedItem || selectedType !== 'school') return [];
      
      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .eq('school_id', selectedItem.id)
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    { enabled: selectedType === 'school' && activeTab === 'academic' }
  );

  // ===== MUTATIONS =====
  
  // Update Company
  const updateCompanyMutation = useMutation(
    async (data: any) => {
      // Update company basic info if needed
      if (data.name || data.code) {
        const { error } = await supabase
          .from('companies')
          .update({
            name: data.name,
            code: data.code,
            description: data.description
          })
          .eq('id', data.company_id);
        if (error) throw error;
      }

      // Update additional info
      const { data: existing } = await supabase
        .from('companies_additional')
        .select('id')
        .eq('company_id', data.company_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('companies_additional')
          .update(data)
          .eq('company_id', data.company_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('companies_additional')
          .insert([data]);
        if (error) throw error;
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['organization']);
        toast.success('Company information updated successfully');
        setEditMode(false);
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to update company information');
      }
    }
  );

  // Update School
  const updateSchoolMutation = useMutation(
    async (data: any) => {
      // Update school basic info
      if (data.name || data.code) {
        const { error } = await supabase
          .from('schools')
          .update({
            name: data.name,
            code: data.code,
            description: data.description,
            country_id: data.country_id,
            city_id: data.city_id
          })
          .eq('id', data.school_id);
        if (error) throw error;
      }

      // Update additional info
      const { data: existing } = await supabase
        .from('schools_additional')
        .select('id')
        .eq('school_id', data.school_id)
        .maybeSingle();

      const additionalData = {
        school_id: data.school_id,
        school_type: data.school_type,
        curriculum_type: data.curriculum_type,
        total_capacity: data.total_capacity,
        teachers_count: data.teachers_count,
        principal_name: data.principal_name,
        principal_email: data.principal_email,
        principal_phone: data.principal_phone,
        campus_address: data.campus_address,
        campus_city: data.campus_city,
        campus_country: data.campus_country,
        established_date: data.established_date,
        logo_url: data.logo_url
      };

      if (existing) {
        const { error } = await supabase
          .from('schools_additional')
          .update(additionalData)
          .eq('school_id', data.school_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('schools_additional')
          .insert([additionalData]);
        if (error) throw error;
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['organization']);
        toast.success('School information updated successfully');
        setEditMode(false);
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to update school information');
      }
    }
  );

  // Create School
  const createSchoolMutation = useMutation(
    async (data: any) => {
      const { data: school, error } = await supabase
        .from('schools')
        .insert([{
          name: data.name,
          code: data.code,
          company_id: userCompanyId,
          description: data.description || '',
          status: 'active',
          country_id: data.country_id,
          city_id: data.city_id
        }])
        .select()
        .single();

      if (error) throw error;

      // Add additional info if provided
      if (data.school_type || data.principal_name) {
        await supabase
          .from('schools_additional')
          .insert([{
            school_id: school.id,
            school_type: data.school_type,
            principal_name: data.principal_name,
            principal_email: data.principal_email,
            principal_phone: data.principal_phone,
            campus_address: data.campus_address,
            campus_city: data.campus_city,
            campus_country: data.campus_country
          }]);
      }

      return school;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['organization']);
        toast.success('School created successfully');
        setShowModal(false);
        setFormData({});
        setFormErrors({});
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to create school');
      }
    }
  );

  // Create Branch
  const createBranchMutation = useMutation(
    async (data: any) => {
      const { data: branch, error } = await supabase
        .from('branches')
        .insert([{
          name: data.name,
          code: data.code,
          school_id: data.school_id,
          description: data.description || '',
          status: 'active',
          country_id: data.country_id,
          city_id: data.city_id
        }])
        .select()
        .single();

      if (error) throw error;

      // Add additional info if provided
      if (data.branch_head_name || data.student_capacity) {
        await supabase
          .from('branches_additional')
          .insert([{
            branch_id: branch.id,
            branch_head_name: data.branch_head_name,
            branch_head_email: data.branch_head_email,
            branch_head_phone: data.branch_head_phone,
            student_capacity: data.student_capacity,
            branch_address: data.branch_address,
            branch_city: data.branch_city,
            branch_country: data.branch_country,
            building_name: data.building_name,
            floor_details: data.floor_details
          }]);
      }

      return branch;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['organization']);
        toast.success('Branch created successfully');
        setShowModal(false);
        setFormData({});
        setFormErrors({});
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to create branch');
      }
    }
  );

  // Create Department
  const createDepartmentMutation = useMutation(
    async (data: Partial<Department>) => {
      const { error } = await supabase
        .from('entity_departments')
        .insert([data]);

      if (error) throw error;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['departments']);
        toast.success('Department created successfully');
        setShowModal(false);
        setFormData({});
        setFormErrors({});
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to create department');
      }
    }
  );

  // ===== UI HELPER FUNCTIONS =====
  const toggleNode = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const handleItemClick = (item: any, type: 'company' | 'school' | 'branch') => {
    setSelectedItem(item);
    setSelectedType(type);
    setShowDetailsPanel(true);
    setEditMode(false);
    setActiveTab('details');
    setFormData({
      ...item,
      ...item.additional,
      region_id: item.region_id || companyData?.region_id,
      country_id: item.country_id
    });
  };

  const handleSaveDetails = () => {
    if (selectedType === 'company') {
      updateCompanyMutation.mutate({
        ...formData,
        company_id: selectedItem.id
      });
    } else if (selectedType === 'school') {
      updateSchoolMutation.mutate({
        ...formData,
        school_id: selectedItem.id
      });
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formDataObj = new FormData(form);
    
    const data: any = {};
    formDataObj.forEach((value, key) => {
      data[key] = value;
    });

    // Validation
    const errors: Record<string, string> = {};
    if (!data.name) errors.name = 'Name is required';
    if (!data.code) errors.code = 'Code is required';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});

    if (modalType === 'school') {
      createSchoolMutation.mutate(data);
    } else if (modalType === 'branch') {
      createBranchMutation.mutate(data);
    } else if (modalType === 'department') {
      const deptData: Partial<Department> = {
        ...data,
        company_id: userCompanyId!,
        school_id: selectedType === 'school' ? selectedItem?.id : undefined,
        branch_id: selectedType === 'branch' ? selectedItem?.id : undefined,
        employee_count: 0,
        status: 'active'
      };
      createDepartmentMutation.mutate(deptData);
    }
  };

  // ===== ORG CHART NODE COMPONENT =====
  const OrgChartNode = ({ 
    item, 
    type,
    isRoot = false
  }: { 
    item: any; 
    type: 'company' | 'school' | 'branch';
    isRoot?: boolean;
  }) => {
    // Calculate user and student counts
    const userCount = type === 'company' ? 
      item.schools?.reduce((acc: number, school: SchoolData) => 
        acc + (school.additional?.teachers_count || 0), 0) || 0 :
      type === 'school' ? item.additional?.teachers_count || 0 :
      item.additional?.teachers_count || 0;

    const studentCount = type === 'company' ? item.total_students || 0 :
                        type === 'school' ? item.total_students || 0 :
                        item.total_students || 0;

    const managerName = type === 'company' ? 'CEO' :
                       type === 'school' ? item.additional?.principal_name :
                       item.additional?.branch_head_name;

    const managerTitle = type === 'school' ? 'Principal' : 
                        type === 'branch' ? 'Branch Head' : 'CEO';

    // Get location info
    const locationInfo = type === 'company' ? 
      `${item.region?.name || 'Region'}, ${item.country?.name || 'Country'}` :
      type === 'school' ? 
      `${item.additional?.campus_city || 'City'}, ${item.additional?.campus_country || 'Country'}` :
      `${item.additional?.branch_city || 'City'}, ${item.additional?.branch_country || 'Country'}`;

    // Get card styling based on type
    const getCardStyling = () => {
      if (type === 'company') {
        return {
          bg: 'bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20',
          border: 'border-blue-200 dark:border-blue-700',
          tag: 'bg-blue-500 text-white',
          icon: Building2
        };
      }
      if (type === 'school') {
        return {
          bg: 'bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/20',
          border: 'border-green-200 dark:border-green-700',
          tag: 'bg-green-500 text-white',
          icon: School
        };
      }
      return {
        bg: 'bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/20',
        border: 'border-purple-200 dark:border-purple-700',
        tag: 'bg-purple-500 text-white',
        icon: MapPin
      };
    };

    const styling = getCardStyling();
    const Icon = styling.icon;

    return (
      <div className={`rounded-lg border-2 shadow-sm hover:shadow-lg transition-all p-4 w-[340px] ${styling.bg} ${styling.border}`}>
        {/* Entity Type Tag */}
        <div className="flex items-center justify-between mb-3">
          <span className={`px-2 py-1 text-xs font-semibold rounded ${styling.tag}`}>
            {type.toUpperCase()}
          </span>
          
          {/* Action Icons */}
          <div className="flex items-center space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleItemClick(item, type);
                setEditMode(true);
              }}
              className="p-1.5 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
              title="Edit"
            >
              <Edit2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>
            
            {(type === 'company' || type === 'school') && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setModalType(type === 'company' ? 'school' : 'branch');
                  setFormData(type === 'school' ? { school_id: item.id } : {});
                  setShowModal(true);
                }}
                className="p-1.5 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                title={`Add ${type === 'company' ? 'School' : 'Branch'}`}
              >
                <PlusCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </button>
            )}
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleItemClick(item, type);
              }}
              className="p-1.5 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
              title="View Details"
            >
              <Eye className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Logo and Basic Info */}
        <div className="flex items-start space-x-3 mb-3">
          {/* Logo */}
          <div className="flex-shrink-0">
            {item.additional?.logo_url ? (
              <img 
                src={item.additional.logo_url} 
                alt={`${item.name} logo`}
                className="w-16 h-16 object-cover rounded border border-gray-200 dark:border-gray-600"
              />
            ) : (
              <div className="w-16 h-16 rounded bg-white/50 dark:bg-gray-700/50 flex items-center justify-center border border-gray-200 dark:border-gray-600">
                <Icon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
            )}
          </div>
          
          {/* Name and Code */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white text-base truncate">
              {item.name}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Code: {item.code}
            </p>
            {/* Status Badge */}
            <div className="mt-1">
              <StatusBadge status={item.status} />
            </div>
          </div>
        </div>

        {/* Manager Info */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center space-x-2">
            <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-700 dark:text-gray-300">
              {managerName || 'Not Assigned'} ({managerTitle})
            </span>
          </div>
          
          {/* Location */}
          <div className="flex items-center space-x-2">
            <MapPinned className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400 text-xs">
              {locationInfo}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
          <div>
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Users</span>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {userCount}
            </p>
          </div>
          
          <div>
            <div className="flex items-center space-x-1">
              <GraduationCap className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Students</span>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {studentCount}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // ===== RENDER ORGANIZATION CHART =====
  const renderOrganizationChart = () => {
    if (!companyData) return null;

    const isCompanyExpanded = expandedNodes.has('company');

    return (
      <div className="flex flex-col items-center py-8">
        {/* Company Node */}
        <div className="relative">
          <OrgChartNode item={companyData} type="company" isRoot={true} />
          
          {/* Expand/Collapse Button */}
          {companyData.schools && companyData.schools.length > 0 && (
            <button
              onClick={() => toggleNode('company')}
              className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-full p-1 hover:bg-gray-50 dark:hover:bg-gray-700 z-10 shadow-md"
              title={isCompanyExpanded ? 'Collapse Schools' : 'Expand Schools'}
            >
              {isCompanyExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          )}
        </div>

        {/* Schools and Branches */}
        {isCompanyExpanded && companyData.schools && companyData.schools.length > 0 && (
          <>
            <div className="w-0.5 h-16 bg-gradient-to-b from-gray-300 to-gray-200 dark:from-gray-600 dark:to-gray-700"></div>
            
            {companyData.schools.length > 1 && (
              <div className="relative h-0.5">
                <div 
                  className="h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 absolute top-0"
                  style={{
                    width: `${(companyData.schools.length - 1) * 356 + 100}px`,
                    left: '50%',
                    transform: 'translateX(-50%)'
                  }}
                ></div>
              </div>
            )}
            
            <div className="flex items-start space-x-4 mt-8">
              {companyData.schools.map((school) => {
                const isSchoolExpanded = expandedNodes.has(school.id);
                
                return (
                  <div key={school.id} className="flex flex-col items-center">
                    {companyData.schools!.length > 1 && (
                      <div className="w-0.5 h-8 bg-gradient-to-b from-gray-300 to-gray-200 dark:from-gray-600 dark:to-gray-700 -mt-8"></div>
                    )}
                    
                    <div className="relative">
                      <OrgChartNode item={school} type="school" />
                      
                      {school.branches && school.branches.length > 0 && (
                        <button
                          onClick={() => toggleNode(school.id)}
                          className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-full p-1 hover:bg-gray-50 dark:hover:bg-gray-700 z-10 shadow-md"
                          title={isSchoolExpanded ? 'Collapse Branches' : 'Expand Branches'}
                        >
                          {isSchoolExpanded ? (
                            <ChevronUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          )}
                        </button>
                      )}
                    </div>
                    
                    {/* Branches */}
                    {isSchoolExpanded && school.branches && school.branches.length > 0 && (
                      <>
                        <div className="w-0.5 h-16 bg-gradient-to-b from-gray-300 to-gray-200 dark:from-gray-600 dark:to-gray-700 mt-6"></div>
                        
                        {school.branches.length > 1 && (
                          <div className="relative h-0.5">
                            <div 
                              className="h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 absolute top-0"
                              style={{
                                width: `${(school.branches.length - 1) * 356 + 100}px`,
                                left: '50%',
                                transform: 'translateX(-50%)'
                              }}
                            ></div>
                          </div>
                        )}
                        
                        <div className="flex items-start space-x-4 mt-8">
                          {school.branches.map((branch) => (
                            <div key={branch.id} className="flex flex-col items-center">
                              {school.branches!.length > 1 && (
                                <div className="w-0.5 h-8 bg-gradient-to-b from-gray-300 to-gray-200 dark:from-gray-600 dark:to-gray-700 -mt-8"></div>
                              )}
                              <OrgChartNode item={branch} type="branch" />
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  // ===== RENDER DETAILS PANEL =====
  const renderDetailsPanel = () => {
    if (!selectedItem || !showDetailsPanel) return null;

    return (
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/20" onClick={() => setShowDetailsPanel(false)} />
        
        <div id="details-panel" className="absolute right-0 top-0 h-full w-[480px] bg-white dark:bg-gray-800 shadow-xl overflow-y-auto">
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedType === 'company' ? 'Entity' : selectedType === 'school' ? 'School' : 'Branch'} Details
              </h2>
              <button
                onClick={() => setShowDetailsPanel(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          
            {/* Tabs */}
            <div className="flex mt-4 space-x-4 border-b dark:border-gray-700">
              <button
                onClick={() => setActiveTab('details')}
                className={`pb-2 px-1 ${activeTab === 'details' 
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                  : 'text-gray-600 dark:text-gray-400'}`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('departments')}
                className={`pb-2 px-1 ${activeTab === 'departments' 
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                  : 'text-gray-600 dark:text-gray-400'}`}
              >
                Departments
              </button>
              {selectedType === 'school' && (
                <button
                  onClick={() => setActiveTab('academic')}
                  className={`pb-2 px-1 ${activeTab === 'academic' 
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                    : 'text-gray-600 dark:text-gray-400'}`}
                >
                  Academic Years
                </button>
              )}
            </div>
          </div>
        
          <div className="p-6">
            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                {/* Logo Upload (in edit mode) */}
                {editMode && (
                  <LogoUpload
                    currentUrl={formData.logo_url}
                    onUpload={(url) => setFormData({...formData, logo_url: url})}
                    entityType={selectedType!}
                    entityName={selectedItem.name}
                  />
                )}

                {/* Basic Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Name
                    </label>
                    {editMode ? (
                      <input
                        type="text"
                        value={formData.name || selectedItem.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white">{selectedItem.name}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Code
                    </label>
                    {editMode ? (
                      <input
                        type="text"
                        value={formData.code || selectedItem.code}
                        onChange={(e) => setFormData({...formData, code: e.target.value})}
                        className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white">{selectedItem.code}</p>
                    )}
                  </div>
                </div>

                {/* Location Information */}
                {selectedType === 'company' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Region
                      </label>
                      <input
                        type="text"
                        value={companyData?.region?.name || 'Not Set'}
                        disabled
                        className="w-full px-3 py-2 border rounded bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Country
                      </label>
                      <input
                        type="text"
                        value={companyData?.country?.name || 'Not Set'}
                        disabled
                        className="w-full px-3 py-2 border rounded bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400"
                      />
                    </div>
                  </div>
                )}

                {/* Location for Schools/Branches (editable) */}
                {(selectedType === 'school' || selectedType === 'branch') && editMode && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Country
                      </label>
                      <select
                        value={formData.country_id || ''}
                        onChange={(e) => setFormData({...formData, country_id: e.target.value, city_id: ''})}
                        className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="">Select Country</option>
                        {countries.map(country => (
                          <option key={country.id} value={country.id}>{country.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        City
                      </label>
                      <select
                        value={formData.city_id || ''}
                        onChange={(e) => setFormData({...formData, city_id: e.target.value})}
                        className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        disabled={!formData.country_id}
                      >
                        <option value="">Select City</option>
                        {cities.map(city => (
                          <option key={city.id} value={city.id}>{city.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Contact Information */}
                {editMode && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {selectedType === 'company' ? 'Main Phone' : 
                           selectedType === 'school' ? 'Principal Phone' : 'Branch Head Phone'}
                        </label>
                        <input
                          type="text"
                          value={formData[selectedType === 'company' ? 'main_phone' : 
                                         selectedType === 'school' ? 'principal_phone' : 
                                         'branch_head_phone'] || ''}
                          onChange={(e) => setFormData({
                            ...formData, 
                            [selectedType === 'company' ? 'main_phone' : 
                             selectedType === 'school' ? 'principal_phone' : 
                             'branch_head_phone']: e.target.value
                          })}
                          className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {selectedType === 'company' ? 'Main Email' : 
                           selectedType === 'school' ? 'Principal Email' : 'Branch Head Email'}
                        </label>
                        <input
                          type="email"
                          value={formData[selectedType === 'company' ? 'main_email' : 
                                         selectedType === 'school' ? 'principal_email' : 
                                         'branch_head_email'] || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            [selectedType === 'company' ? 'main_email' : 
                             selectedType === 'school' ? 'principal_email' : 
                             'branch_head_email']: e.target.value
                          })}
                          className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Additional fields based on type */}
                    {selectedType === 'school' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            School Type
                          </label>
                          <select
                            value={formData.school_type || ''}
                            onChange={(e) => setFormData({...formData, school_type: e.target.value})}
                            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          >
                            <option value="">Select Type</option>
                            <option value="primary">Primary</option>
                            <option value="secondary">Secondary</option>
                            <option value="higher_secondary">Higher Secondary</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Total Capacity
                          </label>
                          <input
                            type="number"
                            value={formData.total_capacity || ''}
                            onChange={(e) => setFormData({...formData, total_capacity: parseInt(e.target.value)})}
                            className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <StatusBadge status={selectedItem.status} />
                </div>
                
                {/* Action buttons */}
                <div className="flex space-x-3 pt-4">
                  {editMode ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditMode(false);
                          setFormData(selectedItem.additional || {});
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveDetails}
                        disabled={updateCompanyMutation.isLoading || updateSchoolMutation.isLoading}
                        className="flex-1"
                      >
                        <Save className="w-4 h-4 inline mr-2" />
                        Save
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => setEditMode(true)}
                      className="w-full"
                    >
                      <Edit className="w-4 h-4 inline mr-2" />
                      Edit Details
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Departments Tab */}
            {activeTab === 'departments' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Departments</h3>
                  <button
                    onClick={() => {
                      setModalType('department');
                      setFormData({
                        company_id: userCompanyId!,
                        school_id: selectedType === 'school' ? selectedItem?.id : undefined,
                        branch_id: selectedType === 'branch' ? selectedItem?.id : undefined
                      });
                      setShowModal(true);
                    }}
                    className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {departments && departments.length > 0 ? (
                    departments.map((dept) => (
                      <div key={dept.id} className="p-3 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">{dept.name}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {dept.code} • {dept.employee_count ||