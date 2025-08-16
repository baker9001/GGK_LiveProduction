/**
 * File: /src/app/entity-module/organisation/page.tsx
 * Complete Organization Management Page with System Standard Components
 * 
 * Dependencies: 
 *   - @/lib/supabase
 *   - @/lib/auth
 *   - @/contexts/UserContext
 *   - @/components/shared/SlideInForm
 *   - @/components/shared/FormField
 *   - @/components/shared/Button
 *   - @/components/shared/StatusBadge
 *   - External: react, @tanstack/react-query, lucide-react, react-hot-toast
 * 
 * Features:
 *   - Navigation tabs (Expand/Colleagues view toggle)
 *   - Quick navigation to Entity/Schools/Branches
 *   - Expand/Collapse all controls
 *   - Organization chart with proper hierarchy
 *   - Complete CRUD operations
 *   - Department and Academic Year management
 *   - Dark mode support throughout
 * 
 * Database Tables:
 *   - companies → companies_additional
 *   - schools → schools_additional
 *   - branches → branches_additional
 *   - entity_departments
 *   - academic_years
 *   - entity_users
 */

'use client';

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
import { FormField, Input, Select, Textarea } from '../../../components/shared/FormField';
import { Button } from '../../../components/shared/Button';
import { StatusBadge } from '../../../components/shared/StatusBadge';

// ===== TYPE DEFINITIONS =====
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
export default function OrganisationManagement() {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const authenticatedUser = getAuthenticatedUser();
  
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
  const [viewMode, setViewMode] = useState<'expand' | 'colleagues'>('expand');
  const [expandAll, setExpandAll] = useState(true);
  
  // Tab states for detail panel
  const [activeTab, setActiveTab] = useState<'details' | 'departments' | 'academic'>('details');
  
  // Form states
  const [formData, setFormData] = useState<any>({});

  // ===== FETCH USER'S COMPANY =====
  useEffect(() => {
    const fetchUserCompany = async () => {
      try {
        if (!authenticatedUser) {
          console.error('No authenticated user found');
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
          console.log('Found company ID:', entityUser.company_id);
          setUserCompanyId(entityUser.company_id);
        } else {
          console.error('No company associated with user');
          toast.error('No company associated with your account');
        }
      } catch (error) {
        console.error('Error fetching user company:', error);
        toast.error('Failed to identify your company');
      }
    };
    
    if (authenticatedUser) {
      fetchUserCompany();
    }
  }, [authenticatedUser]);

  // Initialize all nodes as expanded when company data is loaded
  useEffect(() => {
    if (companyData && expandAll) {
      const allNodes = new Set<string>(['company']);
      companyData.schools?.forEach(school => {
        allNodes.add(school.id);
      });
      setExpandedNodes(allNodes);
    }
  }, [companyData, expandAll]);

  // ===== FETCH ORGANIZATION DATA =====
  const { data: organizationData, isLoading, error, refetch } = useQuery(
    ['organization', userCompanyId],
    async () => {
      if (!userCompanyId) {
        throw new Error('No company associated with user');
      }

      console.log('Fetching organization data for company:', userCompanyId);

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', userCompanyId)
        .single();

      if (companyError) {
        console.error('Company fetch error:', companyError);
        throw companyError;
      }

      const { data: companyAdditional } = await supabase
        .from('companies_additional')
        .select('*')
        .eq('company_id', userCompanyId)
        .maybeSingle();

      const { data: schools, error: schoolsError } = await supabase
        .from('schools')
        .select('*')
        .eq('company_id', userCompanyId)
        .order('name');

      if (schoolsError) throw schoolsError;

      const schoolsWithDetails = await Promise.all((schools || []).map(async (school) => {
        const { data: schoolAdditional } = await supabase
          .from('schools_additional')
          .select('*')
          .eq('school_id', school.id)
          .maybeSingle();

        const { data: branches } = await supabase
          .from('branches')
          .select('*')
          .eq('school_id', school.id)
          .order('name');

        const branchesWithDetails = await Promise.all((branches || []).map(async (branch) => {
          const { data: branchAdditional } = await supabase
            .from('branches_additional')
            .select('*')
            .eq('branch_id', branch.id)
            .maybeSingle();

          return { ...branch, additional: branchAdditional };
        }));

        return { ...school, additional: schoolAdditional, branches: branchesWithDetails };
      }));

      const fullData = { 
        ...company, 
        additional: companyAdditional, 
        schools: schoolsWithDetails 
      };

      return fullData;
    },
    {
      enabled: !!userCompanyId,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      keepPreviousData: true
    }
  );

  // Update companyData whenever organizationData changes
  useEffect(() => {
    if (organizationData) {
      setCompanyData(organizationData);
    }
  }, [organizationData]);

  // ===== FETCH DEPARTMENTS =====
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
    {
      enabled: !!selectedItem && activeTab === 'departments'
    }
  );

  // ===== FETCH ACADEMIC YEARS =====
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
    {
      enabled: selectedType === 'school' && activeTab === 'academic'
    }
  );

  // ===== MUTATIONS =====
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
        queryClient.invalidateQueries(['organization']);
        toast.success('Company information updated successfully');
        setEditMode(false);
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to update company information');
      }
    }
  );

  const createSchoolMutation = useMutation(
    async (data: Partial<SchoolData>) => {
      const { data: school, error } = await supabase
        .from('schools')
        .insert([{
          name: data.name,
          code: data.code,
          company_id: userCompanyId,
          description: data.description || '',
          status: 'active'
        }])
        .select()
        .single();

      if (error) throw error;
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

  const createBranchMutation = useMutation(
    async (data: Partial<BranchData>) => {
      const { data: branch, error } = await supabase
        .from('branches')
        .insert([{
          name: data.name,
          code: data.code,
          school_id: data.school_id,
          description: data.description || '',
          status: 'active'
        }])
        .select()
        .single();

      if (error) throw error;
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
    setFormData(item.additional || {});
  };

  const handleSaveDetails = () => {
    if (selectedType === 'company') {
      updateCompanyMutation.mutate({
        ...formData,
        company_id: selectedItem.id
      });
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const data: any = {
      name: formData.get('name') as string,
      code: formData.get('code') as string,
    };

    if (modalType !== 'department') {
      data.description = formData.get('description') as string;
    }

    const errors: Record<string, string> = {};
    if (!data.name) errors.name = 'Name is required';
    if (!data.code) errors.code = 'Code is required';
    
    if (modalType === 'branch') {
      data.school_id = formData.get('school_id') as string;
      if (!data.school_id) errors.school_id = 'Please select a school';
    }

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
        department_type: formData.get('department_type') as any,
        employee_count: 0,
        status: 'active'
      };
      createDepartmentMutation.mutate(deptData);
    }
  };

  // Function to handle expand/collapse all
  const handleExpandAll = () => {
    if (!companyData) return;
    const allNodes = new Set<string>(['company']);
    companyData.schools?.forEach(school => {
      allNodes.add(school.id);
    });
    setExpandedNodes(allNodes);
    setExpandAll(true);
  };

  const handleCollapseAll = () => {
    setExpandedNodes(new Set());
    setExpandAll(false);
  };

  // Function to scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // ===== ORG CHART NODE COMPONENT =====
  const OrgChartNode = ({ item, type, isRoot = false }: { item: any; type: 'company' | 'school' | 'branch'; isRoot?: boolean; }) => {
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
      managerName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : 
      'NA';

    const getAvatarColor = () => {
      if (type === 'company') return 'bg-blue-500';
      if (type === 'school') return 'bg-green-500';
      return 'bg-purple-500';
    };

    const getCardBackground = () => {
      if (type === 'company') {
        return 'bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700';
      }
      if (type === 'school') {
        return 'bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700';
      }
      return 'bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700';
    };

    return (
      <div 
        className={`rounded-lg border-2 shadow-sm hover:shadow-lg transition-all p-4 w-[320px] cursor-pointer ${getCardBackground()}`}
        onClick={() => handleItemClick(item, type)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-full ${getAvatarColor()} flex items-center justify-center text-white font-semibold text-sm shadow-md`}>
              {managerInitials}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white text-base line-clamp-1">
                {item.name}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {item.code || type.charAt(0).toUpperCase() + type.slice(1)}
              </p>
            </div>
          </div>
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
              title="More Actions"
            >
              <MoreVertical className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
        <div className="mb-3 min-h-[40px]">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-1">
            {managerName || 'Not Assigned'}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">{managerTitle}</p>
        </div>
        <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">
          <span className="text-lg font-semibold">{employeeCount}</span> Users
        </div>
      </div>
    );
  };

  // ===== RENDER ORGANIZATION CHART WITH SECTION IDS =====
  const renderOrganizationChart = () => {
    if (!companyData) return null;

    const isCompanyExpanded = expandedNodes.has('company');

    return (
      <div className="flex flex-col items-center py-8">
        {/* Company Node */}
        <div id="org-company" className="relative">
          <OrgChartNode item={companyData} type="company" isRoot={true} />
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

        {/* Schools Section */}
        <div id="org-schools">
          {isCompanyExpanded && companyData.schools && companyData.schools.length > 0 && (
            <>
              <div className="w-0.5 h-16 bg-gradient-to-b from-gray-300 to-gray-200 dark:from-gray-600 dark:to-gray-700"></div>
              {companyData.schools.length > 1 && (
                <div className="relative h-0.5">
                  <div 
                    className="h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 absolute top-0"
                    style={{
                      width: `${(companyData.schools.length - 1) * 336 + 100}px`,
                      left: '50%',
                      transform: 'translateX(-50%)'
                    }}
                  ></div>
                </div>
              )}
              <div className="flex items-stretch space-x-4 mt-8">
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
                      
                      {/* Branches Section */}
                      <div id={school.id === companyData.schools![0].id ? 'org-branches' : undefined}>
                        {isSchoolExpanded && school.branches && school.branches.length > 0 && (
                          <>
                            <div className="w-0.5 h-16 bg-gradient-to-b from-gray-300 to-gray-200 dark:from-gray-600 dark:to-gray-700 mt-6"></div>
                            {school.branches.length > 1 && (
                              <div className="relative h-0.5">
                                <div 
                                  className="h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 absolute top-0"
                                  style={{
                                    width: `${(school.branches.length - 1) * 336 + 100}px`,
                                    left: '50%',
                                    transform: 'translateX(-50%)'
                                  }}
                                ></div>
                              </div>
                            )}
                            <div className="flex items-stretch space-x-4 mt-8">
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
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // ===== RENDER DETAILS PANEL =====
  const renderDetailsPanel = () => {
    if (!selectedItem || !showDetailsPanel) return null;

    return (
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/20" onClick={() => setShowDetailsPanel(false)} />
        <div id="details-panel" className="absolute right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 shadow-xl overflow-y-auto">
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedType === 'company' ? 'Company' : selectedType === 'school' ? 'School' : 'Branch'} Details
              </h2>
              <button
                onClick={() => setShowDetailsPanel(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                title="Close (ESC)"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
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
            {activeTab === 'details' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <p className="text-gray-900 dark:text-white">{selectedItem.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Code
                  </label>
                  <p className="text-gray-900 dark:text-white">{selectedItem.code}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <StatusBadge status={selectedItem.status} />
                </div>
                {selectedItem.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <p className="text-gray-700 dark:text-gray-300">{selectedItem.description}</p>
                  </div>
                )}
                {selectedType === 'company' && editMode && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Main Phone
                      </label>
                      <input
                        type="text"
                        value={formData.main_phone || ''}
                        onChange={(e) => setFormData({...formData, main_phone: e.target.value})}
                        className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Main Email
                      </label>
                      <input
                        type="email"
                        value={formData.main_email || ''}
                        onChange={(e) => setFormData({...formData, main_email: e.target.value})}
                        className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Website
                      </label>
                      <input
                        type="text"
                        value={formData.website || ''}
                        onChange={(e) => setFormData({...formData, website: e.target.value})}
                        className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                  </>
                )}
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
                        disabled={updateCompanyMutation.isLoading}
                        className="flex-1"
                      >
                        <Save className="w-4 h-4 inline mr-2" />
                        {updateCompanyMutation.isLoading ? 'Saving...' : 'Save'}
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
                              {dept.code} • {dept.employee_count || 0} users
                            </p>
                          </div>
                          <StatusBadge status={dept.status} />
                        </div>
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
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Academic Years</h3>
                  <button className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {academicYears && academicYears.length > 0 ? (
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

  // ===== CHECK AUTHENTICATION =====
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

          {/* Navigation Bar */}
          <div className="border-t dark:border-gray-700 pt-4 mt-4">
            <div className="flex items-center justify-between">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('expand')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'expand'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <ChevronRight className="w-4 h-4 inline-block mr-2" />
                  Expand View
                </button>
                <button
                  onClick={() => setViewMode('colleagues')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'colleagues'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4 inline-block mr-2" />
                  Colleagues
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
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
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {viewMode === 'expand' ? 'Organization Structure' : 'All Colleagues'}
              </h2>
              
              {/* Level Navigation Controls */}
              {viewMode === 'expand' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Show/Hide:</span>
                  <button
                    onClick={() => {
                      if (!companyData) return;
                      // Toggle entity level (show/hide schools)
                      const newExpanded = new Set(expandedNodes);
                      if (newExpanded.has('company')) {
                        // If company is expanded, collapse it
                        newExpanded.delete('company');
                        // Also remove all school expansions
                        companyData.schools?.forEach(school => {
                          newExpanded.delete(school.id);
                        });
                      } else {
                        // If company is collapsed, expand it
                        newExpanded.add('company');
                      }
                      setExpandedNodes(newExpanded);
                    }}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      expandedNodes.has('company')
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    }`}
                  >
                    Entity
                  </button>
                  <button
                    onClick={() => {
                      if (!companyData || !companyData.schools?.length) return;
                      
                      // First ensure company is expanded to show schools
                      const newExpanded = new Set(expandedNodes);
                      newExpanded.add('company');
                      
                      // Check if any school is currently expanded
                      const anySchoolExpanded = companyData.schools.some(school => 
                        expandedNodes.has(school.id)
                      );
                      
                      if (anySchoolExpanded) {
                        // If any school is expanded, collapse all schools (hide branches)
                        companyData.schools.forEach(school => {
                          newExpanded.delete(school.id);
                        });
                      } else {
                        // If no schools are expanded, expand all schools (show branches)
                        companyData.schools.forEach(school => {
                          if (school.branches && school.branches.length > 0) {
                            newExpanded.add(school.id);
                          }
                        });
                      }
                      
                      setExpandedNodes(newExpanded);
                    }}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      companyData?.schools?.some(s => expandedNodes.has(s.id))
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                    }`}
                  >
                    Schools
                  </button>
                  <button
                    onClick={() => {
                      if (!companyData) return;
                      
                      // This button controls branch visibility
                      const newExpanded = new Set<string>(['company']);
                      
                      // Check if any branches are currently visible
                      const anyBranchesVisible = companyData.schools?.some(school => 
                        school.branches?.length && expandedNodes.has(school.id)
                      );
                      
                      if (anyBranchesVisible) {
                        // If branches are visible, hide them (but keep schools visible)
                        // Just keep company expanded
                      } else {
                        // If branches are not visible, show them
                        companyData.schools?.forEach(school => {
                          if (school.branches && school.branches.length > 0) {
                            newExpanded.add(school.id);
                          }
                        });
                      }
                      
                      setExpandedNodes(newExpanded);
                    }}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      companyData?.schools?.some(school => 
                        school.branches?.length && expandedNodes.has(school.id)
                      )
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        : 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                    }`}
                  >
                    Branches
                  </button>
                  
                  <div className="flex items-center gap-2 border-l dark:border-gray-600 pl-4 ml-2">
                    <button
                      onClick={handleExpandAll}
                      className="px-3 py-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                    >
                      <ChevronDown className="w-4 h-4 inline-block mr-1" />
                      Expand All
                    </button>
                    <button
                      onClick={handleCollapseAll}
                      className="px-3 py-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                    >
                      <ChevronUp className="w-4 h-4 inline-block mr-1" />
                      Collapse All
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-6 min-w-max">
            {viewMode === 'expand' ? (
              <div id="org-chart">
                {renderOrganizationChart()}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Colleagues view will display all users in card format
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  This feature is coming soon
                </p>
              </div>
            )}
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
                rows={3}
              />
            </FormField>
          )}

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
                  { value: 'academic', label: 'Academic' },
                  { value: 'administrative', label: 'Administrative' },
                  { value: 'support', label: 'Support' },
                  { value: 'operations', label: 'Operations' }
                ]}
              />
            </FormField>
          )}
        </form>
      </SlideInForm>
    </div>
  );
}