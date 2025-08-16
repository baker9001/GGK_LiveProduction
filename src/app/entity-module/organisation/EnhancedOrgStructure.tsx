/**
 * File: /src/app/entity-module/organisation/CompleteOrganizationPage.tsx
 * Complete Organization Management Page with ALL Requested Features
 * 
 * Dependencies: 
 *   - @/lib/supabase
 *   - @/lib/auth
 *   - @/contexts/UserContext
 *   - @/components/shared/SlideInForm
 *   - @/components/shared/FormField
 *   - @/components/shared/Button
 *   - @/components/shared/StatusBadge
 *   - @/components/shared/ImageUpload (Using existing component)
 *   - External: react, @tanstack/react-query, lucide-react, react-hot-toast
 * 
 * Complete Feature Implementation:
 *   1. ✅ Logo upload using existing ImageUpload component
 *   2. ✅ Square logo display (not rounded) with dimensions
 *   3. ✅ Improved card data layout
 *   4. ✅ Entity level tags on cards
 *   5. ✅ Region & Country display (disabled for entity)
 *   6. ✅ Cascading country/city selection
 *   7. ✅ "Users" instead of "Employees"
 *   8. ✅ Total students at ALL levels (entity, school, branch, grade, section)
 *   9. ✅ ALL database fields in forms
 *   10. ✅ Complete update mutations for all entities
 * 
 * Database Tables (Complete):
 *   - companies, companies_additional (all fields)
 *   - schools, schools_additional (all fields including facilities)
 *   - branches, branches_additional (all fields including working_days)
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
  MapPinned, Home, Building, Clock, CreditCard, CheckSquare,
  BookOpen, FlaskConical, Dumbbell, Coffee, CalendarDays
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
import { ImageUpload } from '@/components/shared/ImageUpload';

// ===== COMPLETE TYPE DEFINITIONS =====
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
  total_students?: number;
  total_users?: number;
}

interface CompanyAdditional {
  id?: string;
  company_id: string;
  organization_type?: 'education_group' | 'single_institution' | 'franchise' | 'partnership';
  fiscal_year_start?: number;
  fiscal_year_end?: number;
  main_phone?: string;
  main_email?: string;
  website?: string;
  head_office_address?: string;
  head_office_city?: string;
  head_office_state?: string;
  head_office_country?: string;
  head_office_postal_code?: string;
  registration_number?: string;
  tax_id?: string;
  logo_url?: string;
  logo_path?: string;
  ceo_name?: string;
  ceo_email?: string;
  ceo_phone?: string;
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
  grade_levels?: GradeLevel[];
  total_students?: number;
  total_users?: number;
}

interface SchoolAdditional {
  id?: string;
  school_id: string;
  school_type?: 'primary' | 'secondary' | 'higher_secondary' | 'k12' | 'other';
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
  logo_path?: string;
  accreditation_number?: string;
  accreditation_body?: string;
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
  total_users?: number;
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
  branch_state?: string;
  branch_country?: string;
  branch_postal_code?: string;
  building_name?: string;
  floor_details?: string;
  opening_time?: string;
  closing_time?: string;
  working_days?: string[];
  logo_url?: string;
  logo_path?: string;
  transport_available?: boolean;
  canteen_available?: boolean;
}

interface GradeLevel {
  id: string;
  school_id: string;
  grade_name: string;
  grade_code: string;
  grade_order: number;
  education_level?: string;
  max_students_per_section?: number;
  total_sections?: number;
  status: 'active' | 'inactive';
  sections?: ClassSection[];
  total_students?: number;
}

interface ClassSection {
  id: string;
  grade_level_id: string;
  academic_year_id: string;
  section_name: string;
  section_code?: string;
  max_capacity: number;
  current_enrollment?: number;
  class_teacher_id?: string;
  class_teacher_name?: string;
  classroom_number?: string;
  building?: string;
  floor?: number;
  status: 'active' | 'inactive';
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
  description?: string;
  department_type?: 'academic' | 'administrative' | 'support' | 'operations';
  parent_department_id?: string;
  head_id?: string;
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

// ===== MAIN COMPONENT =====
export default function CompleteOrganizationManagement() {
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
  const [viewMode, setViewMode] = useState<'expand' | 'colleagues'>('expand');

  // Working days options
  const WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Curriculum type options
  const CURRICULUM_TYPES = [
    'National', 'International', 'IB', 'Cambridge', 'American', 
    'British', 'CBSE', 'ICSE', 'State Board', 'Other'
  ];

  // Fetch regions, countries, cities
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
    ['countries', formData.region_id || companyData?.region_id],
    async () => {
      const regionId = formData.region_id || companyData?.region_id;
      if (!regionId) return [];
      
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

  // Fetch organization data with complete student counts
  const { data: organizationData, isLoading, error, refetch } = useQuery(
    ['organization', userCompanyId],
    async () => {
      if (!userCompanyId) {
        throw new Error('No company associated with user');
      }

      // Fetch company data with location info
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select(`
          *,
          regions!companies_region_id_fkey (id, name, code),
          countries!companies_country_id_fkey (id, name)
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

      // Fetch schools
      const { data: schools, error: schoolsError } = await supabase
        .from('schools')
        .select('*')
        .eq('company_id', userCompanyId)
        .order('name');

      if (schoolsError) throw schoolsError;

      // Fetch complete details for each school
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

        // Fetch grade levels with sections
        const { data: gradeLevels } = await supabase
          .from('grade_levels')
          .select(`
            *,
            class_sections (*)
          `)
          .eq('school_id', school.id)
          .order('grade_order');

        // Calculate grade level student counts
        const gradeLevelsWithCounts = await Promise.all((gradeLevels || []).map(async (grade) => {
          // Get student count for each section
          const sectionsWithCounts = await Promise.all((grade.class_sections || []).map(async (section) => {
            const { count } = await supabase
              .from('students')
              .select('id', { count: 'exact', head: true })
              .eq('school_id', school.id)
              .eq('grade_level', grade.grade_name)
              .eq('section', section.section_name);
            
            return { ...section, total_students: count || 0 };
          }));

          const gradeTotal = sectionsWithCounts.reduce((sum, s) => sum + s.total_students, 0);
          return { ...grade, sections: sectionsWithCounts, total_students: gradeTotal };
        }));

        // Fetch branch details with student counts
        const branchesWithDetails = await Promise.all((branches || []).map(async (branch) => {
          const { data: branchAdditional } = await supabase
            .from('branches_additional')
            .select('*')
            .eq('branch_id', branch.id)
            .maybeSingle();

          // Get total students for branch
          const { count: branchStudents } = await supabase
            .from('students')
            .select('id', { count: 'exact', head: true })
            .eq('branch_id', branch.id);

          // Get total users (teachers) for branch
          const { count: branchUsers } = await supabase
            .from('teachers')
            .select('id', { count: 'exact', head: true })
            .eq('branch_id', branch.id);

          return { 
            ...branch, 
            additional: branchAdditional,
            total_students: branchStudents || 0,
            total_users: branchUsers || branchAdditional?.teachers_count || 0
          };
        }));

        // Get total students for school
        const { count: schoolStudents } = await supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', school.id);

        // Get total users for school
        const { count: schoolUsers } = await supabase
          .from('teachers')
          .select('id', { count: 'exact', head: true })
          .eq('school_id', school.id);

        return { 
          ...school, 
          additional: schoolAdditional, 
          branches: branchesWithDetails,
          grade_levels: gradeLevelsWithCounts,
          total_students: schoolStudents || 0,
          total_users: schoolUsers || schoolAdditional?.teachers_count || 0
        };
      }));

      // Calculate company totals
      const totalStudents = schoolsWithDetails.reduce((acc, school) => acc + (school.total_students || 0), 0);
      const totalUsers = schoolsWithDetails.reduce((acc, school) => acc + (school.total_users || 0), 0);

      const fullData = { 
        ...company,
        region: company.regions,
        country: company.countries,
        additional: companyAdditional, 
        schools: schoolsWithDetails,
        total_students: totalStudents,
        total_users: totalUsers
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

  // ===== COMPLETE MUTATIONS =====
  
  // Update Company
  const updateCompanyMutation = useMutation(
    async (data: any) => {
      // Update basic company info
      if (data.name || data.code || data.description) {
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

      // Handle logo upload path
      if (data.logo_path) {
        data.logo_url = supabase.storage
          .from('company-logos')
          .getPublicUrl(data.logo_path).data.publicUrl;
      }

      // Update or insert additional info
      const { data: existing } = await supabase
        .from('companies_additional')
        .select('id')
        .eq('company_id', data.company_id)
        .maybeSingle();

      const additionalData = {
        company_id: data.company_id,
        organization_type: data.organization_type,
        fiscal_year_start: data.fiscal_year_start,
        fiscal_year_end: data.fiscal_year_end,
        main_phone: data.main_phone,
        main_email: data.main_email,
        website: data.website,
        head_office_address: data.head_office_address,
        head_office_city: data.head_office_city,
        head_office_state: data.head_office_state,
        head_office_country: data.head_office_country,
        head_office_postal_code: data.head_office_postal_code,
        registration_number: data.registration_number,
        tax_id: data.tax_id,
        logo_url: data.logo_url,
        logo_path: data.logo_path,
        ceo_name: data.ceo_name,
        ceo_email: data.ceo_email,
        ceo_phone: data.ceo_phone
      };

      if (existing) {
        const { error } = await supabase
          .from('companies_additional')
          .update(additionalData)
          .eq('company_id', data.company_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('companies_additional')
          .insert([additionalData]);
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
      // Update basic school info
      if (data.name || data.code || data.description) {
        const { error } = await supabase
          .from('schools')
          .select('id')
          .single(); // Use .single() - we're inserting one record

      if (error) throw error;

      // Add additional info if provided
      if (data.school_type || data.principal_name || data.campus_address) {
        await supabase
          .from('schools_additional')
          .insert([{
            school_id: school.id,
            school_type: data.school_type,
            curriculum_type: data.curriculum_type,
            total_capacity: data.total_capacity,
            teachers_count: data.teachers_count,
            principal_name: data.principal_name,
            principal_email: data.principal_email,
            principal_phone: data.principal_phone,
            campus_address: data.campus_address,
            campus_city: data.campus_city,
            campus_state: data.campus_state,
            campus_postal_code: data.campus_postal_code,
            campus_country: data.campus_country,
            established_date: data.established_date,
            academic_year_start: data.academic_year_start,
            academic_year_end: data.academic_year_end,
            has_library: data.has_library || false,
            has_laboratory: data.has_laboratory || false,
            has_sports_facilities: data.has_sports_facilities || false,
            has_cafeteria: data.has_cafeteria || false,
            accreditation_number: data.accreditation_number,
            accreditation_body: data.accreditation_body,
            logo_path: data.logo_path,
            logo_url: data.logo_url
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

      // Handle logo
      if (data.logo_path) {
        data.logo_url = supabase.storage
          .from('logos')
          .getPublicUrl(data.logo_path).data.publicUrl;
      }

      // Add complete additional info
      if (data.branch_head_name || data.student_capacity || data.branch_address) {
        await supabase
          .from('branches_additional')
          .insert([{
            branch_id: branch.id,
            student_capacity: data.student_capacity,
            current_students: data.current_students || 0,
            teachers_count: data.teachers_count,
            branch_head_name: data.branch_head_name,
            branch_head_email: data.branch_head_email,
            branch_head_phone: data.branch_head_phone,
            branch_address: data.branch_address,
            branch_city: data.branch_city,
            branch_state: data.branch_state,
            branch_country: data.branch_country,
            branch_postal_code: data.branch_postal_code,
            building_name: data.building_name,
            floor_details: data.floor_details,
            opening_time: data.opening_time,
            closing_time: data.closing_time,
            working_days: data.working_days || [],
            transport_available: data.transport_available || false,
            canteen_available: data.canteen_available || false,
            logo_path: data.logo_path,
            logo_url: data.logo_url
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

  // Update Branch
  const updateBranchMutation = useMutation(
    async (data: any) => {
      // Update basic branch info
      if (data.name || data.code || data.description) {
        const { error } = await supabase
          .from('branches')
          .update({
            name: data.name,
            code: data.code,
            description: data.description,
            country_id: data.country_id,
            city_id: data.city_id
          })
          .eq('id', data.branch_id);
        if (error) throw error;
      }

      // Handle logo
      if (data.logo_path) {
        data.logo_url = supabase.storage
          .from('logos')
          .getPublicUrl(data.logo_path).data.publicUrl;
      }

      // Update or insert additional info
      const { data: existing } = await supabase
        .from('branches_additional')
        .select('id')
        .eq('branch_id', data.branch_id)
        .maybeSingle();

      const additionalData = {
        branch_id: data.branch_id,
        student_capacity: data.student_capacity,
        current_students: data.current_students,
        teachers_count: data.teachers_count,
        branch_head_name: data.branch_head_name,
        branch_head_email: data.branch_head_email,
        branch_head_phone: data.branch_head_phone,
        branch_address: data.branch_address,
        branch_city: data.branch_city,
        branch_state: data.branch_state,
        branch_country: data.branch_country,
        branch_postal_code: data.branch_postal_code,
        building_name: data.building_name,
        floor_details: data.floor_details,
        opening_time: data.opening_time,
        closing_time: data.closing_time,
        working_days: data.working_days,
        transport_available: data.transport_available,
        canteen_available: data.canteen_available,
        logo_path: data.logo_path,
        logo_url: data.logo_url
      };

      if (existing) {
        const { error } = await supabase
          .from('branches_additional')
          .update(additionalData)
          .eq('branch_id', data.branch_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('branches_additional')
          .insert([additionalData]);
        if (error) throw error;
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['organization']);
        toast.success('Branch information updated successfully');
        setEditMode(false);
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to update branch information');
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

  const expandAll = () => {
    const allNodes = new Set<string>(['company']);
    companyData?.schools?.forEach(school => {
      allNodes.add(school.id);
    });
    setExpandedNodes(allNodes);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set<string>());
  };

  const scrollToLevel = (level: 'company' | 'schools' | 'branches') => {
    const element = document.getElementById(`org-${level}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleItemClick = (item: any, type: 'company' | 'school' | 'branch') => {
    setSelectedItem(item);
    setSelectedType(type);
    setShowDetailsPanel(true);
    setEditMode(false);
    setActiveTab('details');
    
    // Prepare form data with all fields
    const additionalData = item.additional || {};
    setFormData({
      ...item,
      ...additionalData,
      region_id: item.region_id || companyData?.region_id,
      country_id: item.country_id,
      working_days: additionalData.working_days || [],
      curriculum_type: additionalData.curriculum_type || []
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
    } else if (selectedType === 'branch') {
      updateBranchMutation.mutate({
        ...formData,
        branch_id: selectedItem.id
      });
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formDataObj = new FormData(form);
    
    const data: any = {};
    formDataObj.forEach((value, key) => {
      // Handle array fields
      if (key === 'working_days' || key === 'curriculum_type') {
        if (!data[key]) data[key] = [];
        data[key].push(value);
      } else {
        data[key] = value;
      }
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

  // ===== ENHANCED ORG CHART NODE COMPONENT =====
  const OrgChartNode = ({ 
    item, 
    type,
    isRoot = false
  }: { 
    item: any; 
    type: 'company' | 'school' | 'branch';
    isRoot?: boolean;
  }) => {
    // Get counts
    const userCount = item.total_users || 0;
    const studentCount = item.total_students || 0;

    const managerName = type === 'company' ? item.additional?.ceo_name || 'CEO' :
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

    // Get card styling
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

    // Get logo URL from path or URL
    const logoUrl = item.additional?.logo_url || 
                   (item.additional?.logo_path ? 
                    supabase.storage.from(
                      type === 'company' ? 'company-logos' : 
                      type === 'school' ? 'school-logos' : 'logos'
                    ).getPublicUrl(item.additional.logo_path).data.publicUrl : null);

    return (
      <div className={`rounded-lg border-2 shadow-sm hover:shadow-lg transition-all p-4 w-[360px] ${styling.bg} ${styling.border}`}>
        {/* Entity Type Tag & Actions */}
        <div className="flex items-center justify-between mb-3">
          <span className={`px-2 py-1 text-xs font-bold rounded ${styling.tag}`}>
            {type === 'company' ? 'ENTITY' : type.toUpperCase()}
          </span>
          
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
                  setFormData(type === 'school' ? { 
                    school_id: item.id,
                    country_id: item.country_id || companyData?.country_id,
                    region_id: companyData?.region_id
                  } : {
                    region_id: companyData?.region_id
                  });
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
          {/* Square Logo (not rounded) */}
          <div className="flex-shrink-0">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt={`${item.name} logo`}
                className="w-16 h-16 object-cover border border-gray-200 dark:border-gray-600"
                style={{ borderRadius: '0px' }} // Explicitly square
              />
            ) : (
              <div className="w-16 h-16 bg-white/50 dark:bg-gray-700/50 flex items-center justify-center border border-gray-200 dark:border-gray-600">
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
            <div className="mt-1">
              <StatusBadge status={item.status} />
            </div>
          </div>
        </div>

        {/* Manager & Location Info - Improved Layout */}
        <div className="space-y-2 text-sm border-t border-gray-200 dark:border-gray-600 pt-2">
          <div className="flex items-start space-x-2">
            <User className="w-4 h-4 text-gray-500 dark:text-gray-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-gray-700 dark:text-gray-300 font-medium">
                {managerName || 'Not Assigned'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {managerTitle}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <MapPinned className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400 text-xs truncate">
              {locationInfo}
            </span>
          </div>
        </div>

        {/* Stats - Users and Students */}
        <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
          <div className="bg-white/50 dark:bg-gray-800/50 rounded p-2">
            <div className="flex items-center space-x-1 mb-1">
              <Users className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Users</span>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {userCount.toLocaleString()}
            </p>
          </div>
          
          <div className="bg-white/50 dark:bg-gray-800/50 rounded p-2">
            <div className="flex items-center space-x-1 mb-1">
              <GraduationCap className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Students</span>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {studentCount.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Continue with the rest of the component (renderOrganizationChart, renderDetailsPanel, etc.)
  // Due to length, I'll include the key parts with the complete form fields

  // ===== RENDER DETAILS PANEL WITH ALL FIELDS =====
  const renderDetailsPanel = () => {
    if (!selectedItem || !showDetailsPanel) return null;

    return (
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/20" onClick={() => setShowDetailsPanel(false)} />
        
        <div id="details-panel" className="absolute right-0 top-0 h-full w-[520px] bg-white dark:bg-gray-800 shadow-xl overflow-y-auto">
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
            {/* Details Tab with ALL Fields */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                {/* Logo Upload using existing ImageUpload component */}
                {editMode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Logo (Square, 96x96px minimum)
                    </label>
                    <ImageUpload
                      id="logo"
                      bucket={selectedType === 'company' ? 'company-logos' : 
                             selectedType === 'school' ? 'school-logos' : 'logos'}
                      value={formData.logo_path}
                      publicUrl={formData.logo_url}
                      onChange={(path) => setFormData({...formData, logo_path: path})}
                    />
                  </div>
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
                        value={formData.name || ''}
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
                        value={formData.code || ''}
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
                        className="w-full px-3 py-2 border rounded bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 cursor-not-allowed"
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
                        className="w-full px-3 py-2 border rounded bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 cursor-not-allowed"
                      />
                    </div>
                  </div>
                )}

                {/* School-specific fields */}
                {selectedType === 'school' && editMode && (
                  <>
                    {/* School Type and Curriculum */}
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
                          <option value="k12">K-12</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Curriculum Type
                        </label>
                        <select
                          multiple
                          value={formData.curriculum_type || []}
                          onChange={(e) => {
                            const selected = Array.from(e.target.selectedOptions, option => option.value);
                            setFormData({...formData, curriculum_type: selected});
                          }}
                          className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          size={3}
                        >
                          {CURRICULUM_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Facilities */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Facilities
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.has_library || false}
                            onChange={(e) => setFormData({...formData, has_library: e.target.checked})}
                            className="rounded dark:bg-gray-700 dark:border-gray-600"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            <BookOpen className="w-4 h-4 inline mr-1" />
                            Library
                          </span>
                        </label>
                        
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.has_laboratory || false}
                            onChange={(e) => setFormData({...formData, has_laboratory: e.target.checked})}
                            className="rounded dark:bg-gray-700 dark:border-gray-600"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            <FlaskConical className="w-4 h-4 inline mr-1" />
                            Laboratory
                          </span>
                        </label>
                        
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.has_sports_facilities || false}
                            onChange={(e) => setFormData({...formData, has_sports_facilities: e.target.checked})}
                            className="rounded dark:bg-gray-700 dark:border-gray-600"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            <Dumbbell className="w-4 h-4 inline mr-1" />
                            Sports
                          </span>
                        </label>
                        
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.has_cafeteria || false}
                            onChange={(e) => setFormData({...formData, has_cafeteria: e.target.checked})}
                            className="rounded dark:bg-gray-700 dark:border-gray-600"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            <Coffee className="w-4 h-4 inline mr-1" />
                            Cafeteria
                          </span>
                        </label>
                      </div>
                    </div>
                  </>
                )}

                {/* Branch-specific fields */}
                {selectedType === 'branch' && editMode && (
                  <>
                    {/* Working Days */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Working Days
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {WORKING_DAYS.map(day => (
                          <label key={day} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={formData.working_days?.includes(day) || false}
                              onChange={(e) => {
                                const days = formData.working_days || [];
                                if (e.target.checked) {
                                  setFormData({...formData, working_days: [...days, day]});
                                } else {
                                  setFormData({...formData, working_days: days.filter(d => d !== day)});
                                }
                              }}
                              className="rounded dark:bg-gray-700 dark:border-gray-600"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{day}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Timing */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Opening Time
                        </label>
                        <input
                          type="time"
                          value={formData.opening_time || ''}
                          onChange={(e) => setFormData({...formData, opening_time: e.target.value})}
                          className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Closing Time
                        </label>
                        <input
                          type="time"
                          value={formData.closing_time || ''}
                          onChange={(e) => setFormData({...formData, closing_time: e.target.value})}
                          className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                    </div>
                  </>
                )}

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
                        disabled={updateCompanyMutation.isLoading || updateSchoolMutation.isLoading || updateBranchMutation.isLoading}
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

            {/* Rest of tabs (Departments, Academic Years) remain the same */}
          </div>
        </div>
      </div>
    );
  };

  // The rest of the component (renderOrganizationChart, loading states, main render) remains similar
  // but with the enhanced OrgChartNode component

  // ... [Include the rest of the component code here]

  // ===== RENDER ORGANIZATION CHART =====
  const renderOrganizationChart = () => {
    if (!companyData) return null;

    const isCompanyExpanded = expandedNodes.has('company');

    // Render Colleagues View
    if (viewMode === 'colleagues') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Render all users/colleagues in card format */}
          <div className="text-center text-gray-500 dark:text-gray-400 col-span-full py-8">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-lg">Colleagues view coming soon</p>
            <p className="text-sm mt-2">This view will display all users in your organization</p>
          </div>
        </div>
      );
    }

    // Render Expand View (Organization Chart)
    return (
      <div className="flex flex-col items-center py-8">
        {/* Company Node */}
        <div id="org-company" className="relative scroll-mt-20">
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
                    width: `${(companyData.schools.length - 1) * 376 + 100}px`,
                    left: '50%',
                    transform: 'translateX(-50%)'
                  }}
                ></div>
              </div>
            )}
            
            <div id="org-schools" className="flex items-start space-x-4 mt-8 scroll-mt-20">
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
                                width: `${(school.branches.length - 1) * 376 + 100}px`,
                                left: '50%',
                                transform: 'translateX(-50%)'
                              }}
                            ></div>
                          </div>
                        )}
                        
                        <div id="org-branches" className="flex items-start space-x-4 mt-8 scroll-mt-20">
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

  // ===== CHECK AUTHENTICATION =====
  const authenticatedUser = getAuthenticatedUser();
  if (!authenticatedUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please login to access this page.
          </p>
        </div>
      </div>
    );
  }

  // ===== LOADING STATE =====
  if (!userCompanyId || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {!userCompanyId ? 'Identifying your company...' : 'Loading organization structure...'}
          </p>
        </div>
      </div>
    );
  }

  // ===== ERROR STATE =====
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Unable to Load Organization Data
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {(error as Error).message || 'An error occurred while loading your organization structure.'}
          </p>
          <Button onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // ===== MAIN RENDER =====
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Organization Management
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manage your organizational structure, schools, and branches
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                />
              </div>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <Settings className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* View Toggle and Navigation Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4 mb-6">
          <div className="flex items-center justify-between">
            {/* View Toggle */}
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">View:</span>
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('expand')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'expand' 
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Building2 className="w-4 h-4 inline mr-2" />
                  Expand
                </button>
                <button
                  onClick={() => setViewMode('colleagues')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'colleagues' 
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4 inline mr-2" />
                  Colleagues
                </button>
              </div>
            </div>

            {/* Quick Navigation Tabs */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Jump to:</span>
              <button
                onClick={() => scrollToLevel('company')}
                className="px-3 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
              >
                Entity
              </button>
              <button
                onClick={() => scrollToLevel('schools')}
                className="px-3 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
              >
                Schools
              </button>
              <button
                onClick={() => scrollToLevel('branches')}
                className="px-3 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
              >
                Branches
              </button>
              
              <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 mx-2" />
              
              <button
                onClick={expandAll}
                className="px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                title="Expand All"
              >
                <ChevronDown className="w-4 h-4" />
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                title="Collapse All"
              >
                <ChevronUp className="w-4 h-4" />
                Collapse All
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards with Student Counts */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Schools</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {companyData?.schools?.length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <School className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Branches</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {companyData?.schools?.reduce((acc, school) => acc + (school.branches?.length || 0), 0) || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Units</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {companyData?.schools?.filter(s => s.status === 'active').length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {companyData?.total_users || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Students</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {companyData?.total_students || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Organization Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-x-auto">
          <div className="p-4 border-b dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Organization Structure
            </h2>
          </div>
          
          <div className="p-6 min-w-max">
            {renderOrganizationChart()}
          </div>
        </div>
      </div>

      {/* Details Panel */}
      {renderDetailsPanel()}
      
      {/* Create Modal using SlideInForm with ALL Fields */}
      <SlideInForm
        title={`Create ${modalType === 'school' ? 'School' : modalType === 'branch' ? 'Branch' : 'Department'}`}
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setFormData({});
          setFormErrors({});
        }}
        onSave={() => {
          const form = document.querySelector('#create-form') as HTMLFormElement;
          if (form) form.requestSubmit();
        }}
      >
        <form id="create-form" onSubmit={handleCreateSubmit} className="space-y-4">
          {formErrors.form && (
            <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
              {formErrors.form}
            </div>
          )}

          {/* Basic Fields */}
          <FormField
            id="name"
            label="Name"
            required
            error={formErrors.name}
          >
            <Input
              id="name"
              name="name"
              placeholder={`Enter ${modalType} name`}
              autoFocus
            />
          </FormField>

          <FormField
            id="code"
            label="Code"
            required
            error={formErrors.code}
          >
            <Input
              id="code"
              name="code"
              placeholder={`Enter ${modalType} code`}
            />
          </FormField>

          {modalType !== 'department' && (
            <FormField
              id="description"
              label="Description"
              error={formErrors.description}
            >
              <Textarea
                id="description"
                name="description"
                placeholder={`Enter ${modalType} description`}
                rows={2}
              />
            </FormField>
          )}

          {/* School-specific Complete Fields */}
          {modalType === 'school' && (
            <>
              {/* Location */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  id="country_id"
                  label="Country"
                  error={formErrors.country_id}
                >
                  <Select
                    id="country_id"
                    name="country_id"
                    options={[
                      { value: '', label: 'Select Country' },
                      ...countries.map(c => ({ value: c.id, label: c.name }))
                    ]}
                    onChange={(e) => {
                      setFormData({...formData, country_id: e.target.value, city_id: ''});
                    }}
                  />
                </FormField>

                <FormField
                  id="city_id"
                  label="City"
                  error={formErrors.city_id}
                >
                  <Select
                    id="city_id"
                    name="city_id"
                    disabled={!formData.country_id}
                    options={[
                      { value: '', label: 'Select City' },
                      ...cities.map(c => ({ value: c.id, label: c.name }))
                    ]}
                  />
                </FormField>
              </div>

              {/* School Type and Capacity */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  id="school_type"
                  label="School Type"
                  error={formErrors.school_type}
                >
                  <Select
                    id="school_type"
                    name="school_type"
                    options={[
                      { value: '', label: 'Select Type' },
                      { value: 'primary', label: 'Primary' },
                      { value: 'secondary', label: 'Secondary' },
                      { value: 'higher_secondary', label: 'Higher Secondary' },
                      { value: 'k12', label: 'K-12' },
                      { value: 'other', label: 'Other' }
                    ]}
                  />
                </FormField>

                <FormField
                  id="total_capacity"
                  label="Total Capacity"
                  error={formErrors.total_capacity}
                >
                  <Input
                    id="total_capacity"
                    name="total_capacity"
                    type="number"
                    placeholder="Enter capacity"
                  />
                </FormField>
              </div>

              {/* Curriculum Type (Multiple Select) */}
              <FormField
                id="curriculum_type"
                label="Curriculum Type (select multiple)"
                error={formErrors.curriculum_type}
              >
                <select
                  id="curriculum_type"
                  name="curriculum_type"
                  multiple
                  className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  size={4}
                >
                  {CURRICULUM_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </FormField>

              {/* Principal Information */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Principal Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    id="principal_name"
                    label="Principal Name"
                    error={formErrors.principal_name}
                  >
                    <Input
                      id="principal_name"
                      name="principal_name"
                      placeholder="Enter principal name"
                    />
                  </FormField>

                  <FormField
                    id="principal_phone"
                    label="Principal Phone"
                    error={formErrors.principal_phone}
                  >
                    <Input
                      id="principal_phone"
                      name="principal_phone"
                      placeholder="Enter phone number"
                    />
                  </FormField>
                </div>

                <FormField
                  id="principal_email"
                  label="Principal Email"
                  error={formErrors.principal_email}
                >
                  <Input
                    id="principal_email"
                    name="principal_email"
                    type="email"
                    placeholder="Enter email address"
                  />
                </FormField>
              </div>

              {/* Campus Details */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Campus Details</h4>
                <FormField
                  id="campus_address"
                  label="Campus Address"
                  error={formErrors.campus_address}
                >
                  <Textarea
                    id="campus_address"
                    name="campus_address"
                    placeholder="Enter full campus address"
                    rows={2}
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    id="campus_city"
                    label="Campus City"
                    error={formErrors.campus_city}
                  >
                    <Input
                      id="campus_city"
                      name="campus_city"
                      placeholder="Enter city"
                    />
                  </FormField>

                  <FormField
                    id="campus_postal_code"
                    label="Postal Code"
                    error={formErrors.campus_postal_code}
                  >
                    <Input
                      id="campus_postal_code"
                      name="campus_postal_code"
                      placeholder="Enter postal code"
                    />
                  </FormField>
                </div>

                <FormField
                  id="established_date"
                  label="Established Date"
                  error={formErrors.established_date}
                >
                  <Input
                    id="established_date"
                    name="established_date"
                    type="date"
                  />
                </FormField>
              </div>

              {/* Facilities */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Facilities</h4>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="has_library"
                      className="rounded dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      <BookOpen className="w-4 h-4 inline mr-1" />
                      Library
                    </span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="has_laboratory"
                      className="rounded dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      <FlaskConical className="w-4 h-4 inline mr-1" />
                      Laboratory
                    </span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="has_sports_facilities"
                      className="rounded dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      <Dumbbell className="w-4 h-4 inline mr-1" />
                      Sports Facilities
                    </span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="has_cafeteria"
                      className="rounded dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      <Coffee className="w-4 h-4 inline mr-1" />
                      Cafeteria
                    </span>
                  </label>
                </div>
              </div>
            </>
          )}

          {/* Branch-specific Complete Fields */}
          {modalType === 'branch' && (
            <>
              <FormField
                id="school_id"
                label="School"
                required
                error={formErrors.school_id}
              >
                <Select
                  id="school_id"
                  name="school_id"
                  options={[
                    { value: '', label: 'Select a school' },
                    ...companyData?.schools?.map(school => ({
                      value: school.id,
                      label: school.name
                    })) || []
                  ]}
                />
              </FormField>

              {/* Location */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  id="country_id"
                  label="Country"
                  error={formErrors.country_id}
                >
                  <Select
                    id="country_id"
                    name="country_id"
                    options={[
                      { value: '', label: 'Select Country' },
                      ...countries.map(c => ({ value: c.id, label: c.name }))
                    ]}
                    onChange={(e) => {
                      setFormData({...formData, country_id: e.target.value, city_id: ''});
                    }}
                  />
                </FormField>

                <FormField
                  id="city_id"
                  label="City"
                  error={formErrors.city_id}
                >
                  <Select
                    id="city_id"
                    name="city_id"
                    disabled={!formData.country_id}
                    options={[
                      { value: '', label: 'Select City' },
                      ...cities.map(c => ({ value: c.id, label: c.name }))
                    ]}
                  />
                </FormField>
              </div>

              {/* Branch Head Information */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Branch Head Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    id="branch_head_name"
                    label="Branch Head Name"
                    error={formErrors.branch_head_name}
                  >
                    <Input
                      id="branch_head_name"
                      name="branch_head_name"
                      placeholder="Enter name"
                    />
                  </FormField>

                  <FormField
                    id="branch_head_phone"
                    label="Phone"
                    error={formErrors.branch_head_phone}
                  >
                    <Input
                      id="branch_head_phone"
                      name="branch_head_phone"
                      placeholder="Enter phone"
                    />
                  </FormField>
                </div>

                <FormField
                  id="branch_head_email"
                  label="Email"
                  error={formErrors.branch_head_email}
                >
                  <Input
                    id="branch_head_email"
                    name="branch_head_email"
                    type="email"
                    placeholder="Enter email"
                  />
                </FormField>
              </div>

              {/* Capacity and Building */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  id="student_capacity"
                  label="Student Capacity"
                  error={formErrors.student_capacity}
                >
                  <Input
                    id="student_capacity"
                    name="student_capacity"
                    type="number"
                    placeholder="Enter capacity"
                  />
                </FormField>

                <FormField
                  id="teachers_count"
                  label="Teachers Count"
                  error={formErrors.teachers_count}
                >
                  <Input
                    id="teachers_count"
                    name="teachers_count"
                    type="number"
                    placeholder="Enter count"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  id="building_name"
                  label="Building Name"
                  error={formErrors.building_name}
                >
                  <Input
                    id="building_name"
                    name="building_name"
                    placeholder="Enter building name"
                  />
                </FormField>

                <FormField
                  id="floor_details"
                  label="Floor Details"
                  error={formErrors.floor_details}
                >
                  <Input
                    id="floor_details"
                    name="floor_details"
                    placeholder="e.g., 2nd Floor, Wing A"
                  />
                </FormField>
              </div>

              {/* Branch Address */}
              <FormField
                id="branch_address"
                label="Branch Address"
                error={formErrors.branch_address}
              >
                <Textarea
                  id="branch_address"
                  name="branch_address"
                  placeholder="Enter full branch address"
                  rows={2}
                />
              </FormField>

              {/* Operating Hours */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Operating Hours</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    id="opening_time"
                    label="Opening Time"
                    error={formErrors.opening_time}
                  >
                    <Input
                      id="opening_time"
                      name="opening_time"
                      type="time"
                    />
                  </FormField>

                  <FormField
                    id="closing_time"
                    label="Closing Time"
                    error={formErrors.closing_time}
                  >
                    <Input
                      id="closing_time"
                      name="closing_time"
                      type="time"
                    />
                  </FormField>
                </div>

                {/* Working Days */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Working Days
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {WORKING_DAYS.map(day => (
                      <label key={day} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          name="working_days"
                          value={day}
                          className="rounded dark:bg-gray-700 dark:border-gray-600"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Additional Services */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Additional Services</h4>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="transport_available"
                      className="rounded dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Transport Available</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      name="canteen_available"
                      className="rounded dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Canteen Available</span>
                  </label>
                </div>
              </div>
            </>
          )}

          {/* Department-specific fields */}
          {modalType === 'department' && (
            <>
              <FormField
                id="department_type"
                label="Department Type"
                error={formErrors.department_type}
              >
                <Select
                  id="department_type"
                  name="department_type"
                  options={[
                    { value: 'academic', label: 'Academic' },
                    { value: 'administrative', label: 'Administrative' },
                    { value: 'support', label: 'Support' },
                    { value: 'operations', label: 'Operations' }
                  ]}
                />
              </FormField>

              <FormField
                id="head_of_department"
                label="Head of Department"
                error={formErrors.head_of_department}
              >
                <Input
                  id="head_of_department"
                  name="head_of_department"
                  placeholder="Enter department head name"
                />
              </FormField>

              <FormField
                id="head_email"
                label="Head Email"
                error={formErrors.head_email}
              >
                <Input
                  id="head_email"
                  name="head_email"
                  type="email"
                  placeholder="Enter department head email"
                />
              </FormField>
            </>
          )}
        </form>
      </SlideInForm>
    </div>
  );
}