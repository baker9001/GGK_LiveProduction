/**
 * File: /src/app/entity-module/organisation/EnhancedOrgStructure.tsx
 * Dependencies: 
 *   - @/lib/supabase
 *   - @/lib/auth
 *   - @/contexts/UserContext
 *   - @/components/shared/* (SlideInForm, FormField, Input, Select, Button)
 *   - External: react, @tanstack/react-query, lucide-react, react-hot-toast
 * 
 * Preserved Features:
 *   - All CRUD mutations (createSchool, createBranch, createDepartment, updateCompany)
 *   - Department management with queries and tab
 *   - Academic years management with queries and tab
 *   - Complete details panel with tabs
 *   - Edit mode functionality
 *   - Create modal with SlideInForm (system standard)
 *   - All original state management
 * 
 * Added/Modified:
 *   - Proper card backgrounds matching system standards
 *   - SlideInForm for create/edit modals (system standard)
 *   - Consistent dark mode support throughout
 *   - System-standard button and form field components
 * 
 * Database Tables:
 *   - companies → companies_additional (via company_id)
 *   - schools → schools_additional (via school_id)
 *   - branches → branches_additional (via branch_id)
 *   - entity_departments (company/school/branch relationships)
 *   - academic_years (school_id relationship)
 *   - entity_users (user profiles)
 * 
 * Connected Files:
 *   - Imported by /src/app/entity-module/organisation/page.tsx
 *   - Uses shared components from /src/components/shared/*
 */

import React, { useState, useEffect } from 'react';
import { 
  Building2, School, MapPin, Edit, ChevronDown, ChevronRight,
  Plus, X, Save, Trash2, Users, Search, Filter, Settings,
  Activity, AlertCircle, Loader2, Phone, Mail, Eye,
  Globe, User, MoreVertical, UserPlus, ChevronUp,
  FolderOpen, FileText, Calendar, Shield, Hash, Briefcase,
  Edit2, PlusCircle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { getAuthenticatedUser } from '../../../lib/auth';
import { useUser } from '../../../contexts/UserContext';
import { SlideInForm } from '../../../components/shared/SlideInForm';
import { FormField, Input, Select } from '../../../components/shared/FormField';
import { Button } from '../../../components/shared/Button';
import { StatusBadge } from '../../../components/shared/StatusBadge';

// ===== TYPE DEFINITIONS (PRESERVED FROM ORIGINAL) =====
interface Company {
  id: string;
  name: string;
  code: string;
  description: string;
  status: 'active' | 'inactive';
  created_at: string;
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
  additional?: SchoolAdditional;
  branches?: BranchData[];
}

interface SchoolAdditional {
  id?: string;
  school_id: string;
  school_type?: 'primary' | 'secondary' | 'other';
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
}

interface BranchData {
  id: string;
  name: string;
  code: string;
  school_id: string;
  description: string;
  status: 'active' | 'inactive';
  created_at: string;
  additional?: BranchAdditional;
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
  building_name?: string;
  floor_details?: string;
  opening_time?: string;
  closing_time?: string;
  working_days?: string[];
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

// ===== MAIN COMPONENT =====
export default function EnhancedOrgStructure() {
  const queryClient = useQueryClient();
  const { user } = useUser();
  
  // PRESERVED: All original state management
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['company']));
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
  
  // Tab states for detail panel
  const [activeTab, setActiveTab] = useState<'details' | 'departments' | 'academic'>('details');
  
  // Form states
  const [formData, setFormData] = useState<any>({});

  // ===== FETCH USER'S COMPANY (FIXED WITH PROPER ERROR HANDLING) =====
  useEffect(() => {
    const fetchUserCompany = async () => {
      try {
        const authenticatedUser = getAuthenticatedUser();
        
        if (!authenticatedUser) {
          console.error('No authenticated user found');
          return;
        }

        // Fetch entity_user record - should exist
        const { data: entityUser, error: entityError } = await supabase
          .from('entity_users')
          .select('company_id, is_company_admin')
          .eq('user_id', authenticatedUser.id)
          .single();

        if (entityError) {
          console.error('Error fetching entity user:', entityError);
          toast.error('Failed to fetch user company information');
          return;
        }

        if (entityUser?.company_id) {
          setUserCompanyId(entityUser.company_id);
        }
      } catch (error) {
        console.error('Error in fetchUserCompany:', error);
        toast.error('An error occurred while fetching company data');
      }
    };

    fetchUserCompany();
  }, []);

  // ===== FETCH COMPANY DATA WITH RELATIONSHIPS (FIXED) =====
  const { data: fetchedCompanyData, isLoading, error: fetchError } = useQuery(
    ['company', userCompanyId],
    async () => {
      if (!userCompanyId) return null;

      // Fetch company with additional data
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', userCompanyId)
        .single();

      if (companyError) throw companyError;

      // Fetch additional company data (may not exist)
      const { data: additional } = await supabase
        .from('companies_additional')
        .select('*')
        .eq('company_id', userCompanyId)
        .maybeSingle();

      // Fetch schools with their additional data
      const { data: schools, error: schoolsError } = await supabase
        .from('schools')
        .select('*')
        .eq('company_id', userCompanyId);

      if (schoolsError) throw schoolsError;

      // Fetch additional data for each school
      const schoolsWithAdditional = await Promise.all(
        (schools || []).map(async (school) => {
          const { data: schoolAdditional } = await supabase
            .from('schools_additional')
            .select('*')
            .eq('school_id', school.id)
            .maybeSingle();

          // Fetch branches for this school
          const { data: branches } = await supabase
            .from('branches')
            .select('*')
            .eq('school_id', school.id);

          // Fetch additional data for each branch
          const branchesWithAdditional = await Promise.all(
            (branches || []).map(async (branch) => {
              const { data: branchAdditional } = await supabase
                .from('branches_additional')
                .select('*')
                .eq('branch_id', branch.id)
                .maybeSingle();

              return {
                ...branch,
                additional: branchAdditional
              };
            })
          );

          return {
            ...school,
            additional: schoolAdditional,
            branches: branchesWithAdditional
          };
        })
      );

      return {
        ...company,
        additional,
        schools: schoolsWithAdditional
      };
    },
    {
      enabled: !!userCompanyId,
      onSuccess: (data) => {
        if (data) {
          setCompanyData(data);
        }
      },
      onError: (error: any) => {
        console.error('Error fetching company data:', error);
        toast.error('Failed to load organization data');
      }
    }
  );

  // ===== DEPARTMENTS QUERY (PRESERVED) =====
  const { data: departments = [] } = useQuery(
    ['departments', selectedItem?.id, selectedType],
    async () => {
      if (!selectedItem) return [];

      let query = supabase
        .from('entity_departments')
        .select('*')
        .eq('company_id', userCompanyId!);

      if (selectedType === 'school') {
        query = query.eq('school_id', selectedItem.id);
      } else if (selectedType === 'branch') {
        query = query.eq('branch_id', selectedItem.id);
      } else if (selectedType === 'company') {
        query = query.is('school_id', null).is('branch_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    {
      enabled: !!selectedItem && activeTab === 'departments'
    }
  );

  // ===== ACADEMIC YEARS QUERY (PRESERVED) =====
  const { data: academicYears = [] } = useQuery(
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
    {
      enabled: selectedType === 'school' && activeTab === 'academic'
    }
  );

  // ===== MUTATIONS (PRESERVED) =====
  const updateCompanyMutation = useMutation(
    async (data: CompanyAdditional) => {
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
        queryClient.invalidateQueries(['company']);
        toast.success('Company details updated successfully');
        setEditMode(false);
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to update company details');
      }
    }
  );

  const createSchoolMutation = useMutation(
    async (data: any) => {
      const { error } = await supabase
        .from('schools')
        .insert([{
          name: data.name,
          code: data.code,
          company_id: userCompanyId,
          description: data.description || '',
          status: 'active'
        }]);

      if (error) throw error;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['company']);
        toast.success('School created successfully');
        setShowModal(false);
        setFormData({});
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to create school');
      }
    }
  );

  const createBranchMutation = useMutation(
    async (data: any) => {
      const { error } = await supabase
        .from('branches')
        .insert([{
          name: data.name,
          code: data.code,
          school_id: data.school_id,
          description: data.description || '',
          status: 'active'
        }]);

      if (error) throw error;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['company']);
        toast.success('Branch created successfully');
        setShowModal(false);
        setFormData({});
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to create branch');
      }
    }
  );

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
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to create department');
      }
    }
  );

  // ===== UI HELPER FUNCTIONS (PRESERVED) =====
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
    setFormData(item.additional || {});
  };

  const handleSaveDetails = () => {
    if (selectedType === 'company') {
      updateCompanyMutation.mutate({
        ...formData,
        company_id: selectedItem.id
      });
    }
    // Add similar handlers for school and branch updates
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const data = {
      name: formData.get('name') as string,
      code: formData.get('code') as string,
      description: formData.get('description') as string,
      school_id: formData.get('school_id') as string,
    };

    if (!data.name || !data.code) {
      toast.error('Please fill in required fields');
      return;
    }

    if (modalType === 'school') {
      createSchoolMutation.mutate(data);
    } else if (modalType === 'branch') {
      if (!data.school_id) {
        toast.error('Please select a school');
        return;
      }
      createBranchMutation.mutate(data);
    } else if (modalType === 'department') {
      const deptData: Partial<Department> = {
        ...data,
        company_id: userCompanyId!,
        school_id: selectedType === 'school' ? selectedItem?.id : undefined,
        branch_id: selectedType === 'branch' ? selectedItem?.id : undefined,
        department_type: formData.get('department_type') as any,
        employee_count: 0,
        status: 'active'
      };
      createDepartmentMutation.mutate(deptData);
    }
  };

  // ===== ORG CHART NODE COMPONENT - WITH PROPER DARK MODE =====
  const OrgChartNode = ({ 
    item, 
    type,
    isRoot = false
  }: { 
    item: any; 
    type: 'company' | 'school' | 'branch';
    isRoot?: boolean;
  }) => {
    const employeeCount = type === 'company' ? 
      item.schools?.reduce((acc: number, school: SchoolData) => 
        acc + (school.additional?.teachers_count || 0), 0) || 0 :
      type === 'school' ? item.additional?.teachers_count || 0 :
      item.additional?.teachers_count || 0;

    const managerName = type === 'company' ? 'CEO' :
                       type === 'school' ? item.additional?.principal_name :
                       item.additional?.branch_head_name;

    const managerTitle = type === 'school' ? 'Principal' : 
                        type === 'branch' ? 'Branch Head' : 'CEO';

    const managerInitials = managerName ? 
      managerName.split(' ').map((n: string) => n[0]).join('').toUpperCase() : 
      'NA';

    const Icon = type === 'company' ? Building2 : 
                 type === 'school' ? School : 
                 MapPin;

    return (
      <div 
        className={`bg-white dark:bg-gray-800 rounded-lg border ${
          isRoot ? 'border-blue-500 dark:border-blue-600' : 'border-gray-300 dark:border-gray-600'
        } p-4 min-w-[250px] shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
        onClick={() => handleItemClick(item, type)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-medium ${
            type === 'company' ? 'bg-blue-500' : 
            type === 'school' ? 'bg-green-500' : 
            'bg-purple-500'
          }`}>
            {managerInitials}
          </div>
          <div className="flex gap-1">
            <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              <Edit className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
            <button 
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              onClick={(e) => {
                e.stopPropagation();
                if (type === 'company') {
                  setModalType('school');
                  setFormData({ company_id: item.id });
                } else if (type === 'school') {
                  setModalType('branch');
                  setFormData({ school_id: item.id });
                }
                setShowModal(true);
              }}
            >
              <Plus className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
            <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{item.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{item.code}</p>
          </div>
          
          <div className="text-sm">
            <p className="text-gray-600 dark:text-gray-300 font-medium">{managerTitle}</p>
            <p className="text-gray-500 dark:text-gray-400">{managerTitle}</p>
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400">
            {employeeCount} Employees
          </div>
        </div>
      </div>
    );
  };

  // ===== RENDER ORGANIZATION CHART =====
  const renderOrganizationChart = () => {
    if (!companyData) return null;

    return (
      <div className="flex flex-col items-center space-y-8">
        {/* Company Node */}
        <OrgChartNode item={companyData} type="company" isRoot={true} />

        {/* Connection Line */}
        {companyData.schools && companyData.schools.length > 0 && (
          <div className="w-0.5 h-8 bg-gray-300 dark:bg-gray-600" />
        )}

        {/* Schools Row */}
        {companyData.schools && companyData.schools.length > 0 && (
          <div className="flex gap-8">
            {companyData.schools.map((school, index) => (
              <div key={school.id} className="flex flex-col items-center space-y-4">
                <OrgChartNode item={school} type="school" />
                
                {/* Connection to branches */}
                {school.branches && school.branches.length > 0 && (
                  <>
                    <div className="w-0.5 h-6 bg-gray-300 dark:bg-gray-600" />
                    <div className="flex gap-6">
                      {school.branches.map((branch) => (
                        <OrgChartNode key={branch.id} item={branch} type="branch" />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ===== RENDER DETAILS PANEL (WITH PROPER DARK MODE) =====
  const renderDetailsPanel = () => {
    if (!showDetailsPanel || !selectedItem) return null;

    return (
      <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-800 shadow-xl border-l dark:border-gray-700 z-40 transform transition-transform duration-300">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedType === 'company' ? 'Company' : 
                 selectedType === 'school' ? 'School' : 
                 'Branch'} Details
              </h2>
              <button
                onClick={() => setShowDetailsPanel(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b dark:border-gray-700">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 px-4 py-2 text-sm font-medium ${
                activeTab === 'details'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('departments')}
              className={`flex-1 px-4 py-2 text-sm font-medium ${
                activeTab === 'departments'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Departments
            </button>
            {selectedType === 'school' && (
              <button
                onClick={() => setActiveTab('academic')}
                className={`flex-1 px-4 py-2 text-sm font-medium ${
                  activeTab === 'academic'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Academic Years
              </button>
            )}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'details' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-md font-medium text-gray-900 dark:text-white">Basic Information</h3>
                  {!editMode ? (
                    <button
                      onClick={() => setEditMode(true)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveDetails}
                        className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-500"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditMode(false);
                          setFormData(selectedItem.additional || {});
                        }}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Basic Fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                  <input
                    type="text"
                    value={selectedItem.name}
                    disabled
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code</label>
                  <input
                    type="text"
                    value={selectedItem.code}
                    disabled
                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <StatusBadge status={selectedItem.status} />
                </div>

                {/* Additional fields based on type */}
                {selectedType === 'company' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Organization Type
                      </label>
                      {editMode ? (
                        <select
                          value={formData.organization_type || ''}
                          onChange={(e) => setFormData({...formData, organization_type: e.target.value})}
                          className="w-full px-3 py-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="">Select type</option>
                          <option value="education_group">Education Group</option>
                          <option value="single_institution">Single Institution</option>
                          <option value="franchise">Franchise</option>
                          <option value="partnership">Partnership</option>
                        </select>
                      ) : (
                        <p className="text-gray-900 dark:text-white">
                          {formData.organization_type || 'Not specified'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Main Phone
                      </label>
                      {editMode ? (
                        <input
                          type="tel"
                          value={formData.main_phone || ''}
                          onChange={(e) => setFormData({...formData, main_phone: e.target.value})}
                          className="w-full px-3 py-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-white">
                          {formData.main_phone || 'Not specified'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Main Email
                      </label>
                      {editMode ? (
                        <input
                          type="email"
                          value={formData.main_email || ''}
                          onChange={(e) => setFormData({...formData, main_email: e.target.value})}
                          className="w-full px-3 py-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-white">
                          {formData.main_email || 'Not specified'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Website
                      </label>
                      {editMode ? (
                        <input
                          type="url"
                          value={formData.website || ''}
                          onChange={(e) => setFormData({...formData, website: e.target.value})}
                          className="w-full px-3 py-2 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      ) : (
                        <p className="text-gray-900 dark:text-white">
                          {formData.website || 'Not specified'}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'departments' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-md font-medium text-gray-900 dark:text-white">Departments</h3>
                  <button
                    onClick={() => {
                      setModalType('department');
                      setFormData({
                        company_id: userCompanyId,
                        school_id: selectedType === 'school' ? selectedItem.id : null,
                        branch_id: selectedType === 'branch' ? selectedItem.id : null
                      });
                      setShowModal(true);
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500"
                  >
                    <PlusCircle className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  {departments.length > 0 ? (
                    departments.map((dept) => (
                      <div key={dept.id} className="p-3 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">{dept.name}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {dept.code} • {dept.department_type || 'General'}
                            </p>
                          </div>
                          <StatusBadge status={dept.status} />
                        </div>
                        {dept.head_of_department && (
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                            Head: {dept.head_of_department}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                      No departments found
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'academic' && selectedType === 'school' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-md font-medium text-gray-900 dark:text-white">Academic Years</h3>
                  <button
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500"
                  >
                    <PlusCircle className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  {academicYears.length > 0 ? (
                    academicYears.map((year) => (
                      <div key={year.id} className="p-3 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">{year.year_name}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(year.start_date).toLocaleDateString()} - {new Date(year.end_date).toLocaleDateString()}
                            </p>
                          </div>
                          {year.is_current && (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                              Current
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                      No academic years found
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ===== CHECK AUTHENTICATION (PRESERVED) =====
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

  // ===== LOADING STATE (WITH PROPER DARK MODE) =====
  if (!userCompanyId || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {!userCompanyId ? 'Loading user information...' : 'Loading organization data...'}
          </p>
        </div>
      </div>
    );
  }

  // ===== ERROR STATE (WITH PROPER DARK MODE) =====
  if (fetchError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Error Loading Organization
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {fetchError instanceof Error ? fetchError.message : 'Failed to load organization data'}
          </p>
          <button
            onClick={() => queryClient.invalidateQueries(['company'])}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ===== MAIN RENDER (WITH PROPER DARK MODE) =====
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Organization Structure
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage your organization hierarchy and structure
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setModalType('school');
                  setFormData({ company_id: userCompanyId });
                  setShowModal(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add School
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
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

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Active Schools</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {companyData?.schools?.filter(s => s.status === 'active').length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Staff</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {companyData?.schools?.reduce((acc, school) => 
                      acc + (school.additional?.teachers_count || 0), 0) || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Organization Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
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
      
      {/* Create Modal using SlideInForm */}
      <SlideInForm
        title={`Create ${modalType === 'school' ? 'School' : modalType === 'branch' ? 'Branch' : 'Department'}`}
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setFormData({});
          setFormErrors({});
        }}
        onSave={() => {
          const form = document.querySelector('form');
          if (form) form.requestSubmit();
        }}
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {formErrors.form && (
            <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
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
              placeholder={`Enter ${modalType} name`}
              defaultValue={formData.name}
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
              defaultValue={formData.code}
            />
          </FormField>

          <FormField
            id="description"
            label="Description"
            error={formErrors.description}
          >
            <Input
              id="description"
              name="description"
              placeholder={`Enter ${modalType} description`}
              defaultValue={formData.description}
            />
          </FormField>

          {modalType === 'branch' && companyData?.schools && (
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
                  ...companyData.schools.map(school => ({
                    value: school.id,
                    label: school.name
                  }))
                ]}
                defaultValue={formData.school_id}
              />
            </FormField>
          )}

          {modalType === 'department' && (
            <FormField
              id="department_type"
              label="Department Type"
              error={formErrors.department_type}
            >
              <Select
                id="department_type"
                name="department_type"
                options={[
                  { value: '', label: 'Select type' },
                  { value: 'academic', label: 'Academic' },
                  { value: 'administrative', label: 'Administrative' },
                  { value: 'support', label: 'Support' },
                  { value: 'operations', label: 'Operations' }
                ]}
                defaultValue={formData.department_type}
              />
            </FormField>
          )}
        </form>
      </SlideInForm>
    </div>
  );
}