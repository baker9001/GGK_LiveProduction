/**
 * File: /src/app/entity-module/organisation/EnhancedOrgStructure.tsx
 * Dependencies: 
 *   - @/lib/supabase
 *   - @/lib/auth
 *   - @/contexts/UserContext
 *   - External: react, @tanstack/react-query, lucide-react, react-hot-toast
 * 
 * Preserved Features:
 *   - All CRUD mutations (createSchool, createBranch, createDepartment, updateCompany)
 *   - Department management with queries and tab
 *   - Academic years management with queries and tab
 *   - Complete details panel with tabs
 *   - Edit mode functionality
 *   - Create modal with form validation
 *   - All original state management
 * 
 * Added/Modified:
 *   - Clean hierarchical org chart matching sample design
 *   - Proper connection lines between nodes
 *   - Centered layout with proper spacing
 *   - Inline action icons (edit, add, more)
 *   - Avatar badges for managers
 *   - Clean white cards with subtle shadows
 * 
 * Database Tables:
 *   - companies
 *   - companies_additional
 *   - schools
 *   - schools_additional
 *   - branches
 *   - branches_additional
 *   - entity_departments
 *   - academic_years
 *   - entity_users
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
  
  // Tab states for detail panel
  const [activeTab, setActiveTab] = useState<'details' | 'departments' | 'academic'>('details');
  
  // Form states
  const [formData, setFormData] = useState<any>({});

  // ===== FETCH USER'S COMPANY (PRESERVED WITH CUSTOM AUTH) =====
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
          .maybeSingle();
        
        if (entityError) {
          console.error('Error fetching entity user:', entityError);
          toast.error('Failed to fetch user information');
          return;
        }

        if (entityUser && entityUser.company_id) {
          console.log('Found company ID:', entityUser.company_id);
          setUserCompanyId(entityUser.company_id);
          // Auto-expand company node
          setExpandedNodes(new Set(['company']));
        } else {
          console.error('No company associated with user');
          toast.error('No company associated with your account');
        }
      } catch (error) {
        console.error('Error fetching user company:', error);
        toast.error('Failed to identify your company');
      }
    };
    
    fetchUserCompany();
  }, [user]);

  // ===== FETCH ORGANIZATION DATA (PRESERVED) =====
  const { data: organizationData, isLoading, error, refetch } = useQuery(
    ['organization', userCompanyId],
    async () => {
      if (!userCompanyId) {
        throw new Error('No company associated with user');
      }

      console.log('Fetching organization data for company:', userCompanyId);

      // Fetch company data
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', userCompanyId)
        .single();

      if (companyError) {
        console.error('Company fetch error:', companyError);
        throw companyError;
      }

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

      // Fetch details for each school
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

      setCompanyData(fullData);
      return fullData;
    },
    {
      enabled: !!userCompanyId,
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false
    }
  );

  // ===== FETCH DEPARTMENTS (PRESERVED) =====
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

  // ===== FETCH ACADEMIC YEARS (PRESERVED) =====
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

  // ===== MUTATIONS (ALL PRESERVED FROM ORIGINAL) =====
  
  // Update Company Additional Info
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

  // Create School
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
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to create school');
      }
    }
  );

  // Create Branch
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

  // ===== ORG CHART NODE COMPONENT - Matching Sample Design =====
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
      managerName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : 
      'NA';

    // Get avatar color based on type
    const getAvatarColor = () => {
      if (type === 'company') return 'bg-blue-500';
      if (type === 'school') return 'bg-green-500';
      return 'bg-purple-500';
    };

    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4 min-w-[280px] max-w-[320px]">
        {/* Header with Actions */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            {/* Avatar */}
            <div className={`w-10 h-10 rounded-full ${getAvatarColor()} flex items-center justify-center text-white font-medium text-sm`}>
              {managerInitials}
            </div>
            
            {/* Title and Role */}
            <div>
              <h3 className="font-semibold text-gray-900 text-base">
                {item.name}
              </h3>
              <p className="text-xs text-gray-500">
                {item.code || type.charAt(0).toUpperCase() + type.slice(1)}
              </p>
            </div>
          </div>

          {/* Action Icons */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => {
                handleItemClick(item, type);
                setEditMode(true);
              }}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Edit"
            >
              <Edit2 className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
            
            {(type === 'company' || type === 'school') && (
              <button
                onClick={() => {
                  setModalType(type === 'company' ? 'school' : 'branch');
                  setFormData(type === 'school' ? { school_id: item.id } : {});
                  setShowModal(true);
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title={`Add ${type === 'company' ? 'School' : 'Branch'}`}
              >
                <PlusCircle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
            
            <button
              onClick={() => handleItemClick(item, type)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="More Actions"
            >
              <MoreVertical className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          </div>
        </div>

        {/* Manager Info */}
        {managerName && (
          <div className="mb-3">
            <p className="text-sm font-medium text-gray-700">{managerName}</p>
            <p className="text-xs text-gray-500">{managerTitle}</p>
          </div>
        )}

        {/* Employee Count */}
        <div className="text-sm text-gray-600">
          <span className="font-medium">{employeeCount}</span> Employees
        </div>
      </div>
    );
  };

  // ===== RENDER ORGANIZATION CHART - Clean Hierarchical Layout =====
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
              className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 z-10"
            >
              {isCompanyExpanded ? (
                <ChevronUp className="h-3 w-3 text-gray-600" />
              ) : (
                <ChevronDown className="h-3 w-3 text-gray-600" />
              )}
            </button>
          )}
        </div>

        {/* Vertical Connection Line */}
        {isCompanyExpanded && companyData.schools && companyData.schools.length > 0 && (
          <>
            <div className="w-px h-12 bg-gray-300"></div>
            
            {/* Horizontal Line for Multiple Schools */}
            {companyData.schools.length > 1 && (
              <div className="relative">
                <div 
                  className="h-px bg-gray-300 absolute top-0"
                  style={{
                    width: `${(companyData.schools.length - 1) * 320 + 100}px`,
                    left: '50%',
                    transform: 'translateX(-50%)'
                  }}
                ></div>
              </div>
            )}
            
            {/* Schools Container */}
            <div className="flex items-start space-x-8 mt-8">
              {companyData.schools.map((school, schoolIndex) => {
                const isSchoolExpanded = expandedNodes.has(school.id);
                
                return (
                  <div key={school.id} className="flex flex-col items-center">
                    {/* Connection line from horizontal to school */}
                    {companyData.schools!.length > 1 && (
                      <div className="w-px h-8 bg-gray-300 -mt-8"></div>
                    )}
                    
                    {/* School Node */}
                    <div className="relative">
                      <OrgChartNode item={school} type="school" />
                      
                      {/* Expand/Collapse Button for School */}
                      {school.branches && school.branches.length > 0 && (
                        <button
                          onClick={() => toggleNode(school.id)}
                          className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 z-10"
                        >
                          {isSchoolExpanded ? (
                            <ChevronUp className="h-3 w-3 text-gray-600" />
                          ) : (
                            <ChevronDown className="h-3 w-3 text-gray-600" />
                          )}
                        </button>
                      )}
                    </div>
                    
                    {/* Branches under School */}
                    {isSchoolExpanded && school.branches && school.branches.length > 0 && (
                      <>
                        <div className="w-px h-12 bg-gray-300"></div>
                        
                        {/* Horizontal Line for Multiple Branches */}
                        {school.branches.length > 1 && (
                          <div className="relative">
                            <div 
                              className="h-px bg-gray-300 absolute top-0"
                              style={{
                                width: `${(school.branches.length - 1) * 320 + 100}px`,
                                left: '50%',
                                transform: 'translateX(-50%)'
                              }}
                            ></div>
                          </div>
                        )}
                        
                        {/* Branches Container */}
                        <div className="flex items-start space-x-8 mt-8">
                          {school.branches.map((branch) => (
                            <div key={branch.id} className="flex flex-col items-center">
                              {/* Connection line from horizontal to branch */}
                              {school.branches!.length > 1 && (
                                <div className="w-px h-8 bg-gray-300 -mt-8"></div>
                              )}
                              
                              {/* Branch Node */}
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

  // ===== RENDER DETAILS PANEL (PRESERVED FROM ORIGINAL) =====
  const renderDetailsPanel = () => {
    if (!selectedItem || !showDetailsPanel) return null;

    return (
      <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 shadow-xl z-50 overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {selectedType === 'company' ? 'Company' : selectedType === 'school' ? 'School' : 'Branch'} Details
            </h2>
            <button
              onClick={() => setShowDetailsPanel(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-5 h-5" />
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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                {editMode ? (
                  <input
                    type="text"
                    value={selectedItem.name}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    disabled
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">{selectedItem.name}</p>
                )}
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
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                  selectedItem.status === 'active' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {selectedItem.status}
                </span>
              </div>
              
              {selectedItem.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <p className="text-gray-700 dark:text-gray-300">{selectedItem.description}</p>
                </div>
              )}
              
              {/* Additional fields based on type */}
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
                      className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
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
                      className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
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
                      className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                </>
              )}
              
              {/* Action buttons */}
              <div className="flex space-x-3 pt-4">
                {editMode ? (
                  <>
                    <button
                      onClick={handleSaveDetails}
                      disabled={updateCompanyMutation.isLoading}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4 inline mr-2" />
                      {updateCompanyMutation.isLoading ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setEditMode(false);
                        setFormData(selectedItem.additional || {});
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditMode(true)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    <Edit className="w-4 h-4 inline mr-2" />
                    Edit Details
                  </button>
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
                    <div key={dept.id} className="p-3 border rounded dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{dept.name}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {dept.code} • {dept.employee_count || 0} employees
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded ${
                          dept.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {dept.status}
                        </span>
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

          {/* Academic Years Tab */}
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
                    <div key={year.id} className="p-3 border rounded dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{year.year_name}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(year.start_date).toLocaleDateString()} - {new Date(year.end_date).toLocaleDateString()}
                          </p>
                        </div>
                        {year.is_current && (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
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
    );
  };

  // ===== RENDER CREATE MODAL (PRESERVED FROM ORIGINAL) =====
  const renderCreateModal = () => {
    if (!showModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Create New {modalType === 'school' ? 'School' : modalType === 'branch' ? 'Branch' : 'Department'}
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                placeholder="Enter name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Code *
              </label>
              <input
                type="text"
                value={formData.code || ''}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
                className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                placeholder="Enter code"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                rows={3}
                placeholder="Enter description"
              />
            </div>

            {modalType === 'department' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Department Type
                </label>
                <select
                  value={formData.department_type || 'administrative'}
                  onChange={(e) => setFormData({...formData, department_type: e.target.value})}
                  className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="academic">Academic</option>
                  <option value="administrative">Administrative</option>
                  <option value="support">Support</option>
                  <option value="operations">Operations</option>
                </select>
              </div>
            )}
            
            <div className="flex space-x-3 pt-4">
              <button
                onClick={() => {
                  if (!formData.name || !formData.code) {
                    toast.error('Please fill in required fields');
                    return;
                  }

                  if (modalType === 'school') {
                    createSchoolMutation.mutate(formData);
                  } else if (modalType === 'branch') {
                    createBranchMutation.mutate(formData);
                  } else if (modalType === 'department') {
                    createDepartmentMutation.mutate({
                      ...formData,
                      employee_count: 0,
                      status: 'active'
                    });
                  }
                }}
                disabled={createSchoolMutation.isLoading || createBranchMutation.isLoading || createDepartmentMutation.isLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {(createSchoolMutation.isLoading || createBranchMutation.isLoading || createDepartmentMutation.isLoading) 
                  ? 'Creating...' 
                  : 'Create'}
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  setFormData({});
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ===== CHECK AUTHENTICATION (PRESERVED) =====
  const authenticatedUser = getAuthenticatedUser();
  if (!authenticatedUser) {
    return (
      <div className="flex items-center justify-center h-screen">
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

  // ===== LOADING STATE (PRESERVED) =====
  if (!userCompanyId || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {!userCompanyId ? 'Identifying your company...' : 'Loading organization structure...'}
          </p>
        </div>
      </div>
    );
  }

  // ===== ERROR STATE (PRESERVED) =====
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Unable to Load Organization Data
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {(error as Error).message || 'An error occurred while loading your organization structure.'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ===== MAIN RENDER - Clean Org Chart Design =====
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Organization Management
              </h1>
              <p className="text-sm text-gray-600 mt-1">
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
                  className="pl-10 pr-4 py-2 border rounded-lg text-sm"
                />
              </div>
              <button className="p-2 hover:bg-gray-100 rounded">
                <Filter className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Schools</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {companyData?.schools?.length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <School className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Branches</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {companyData?.schools?.reduce((acc, school) => acc + (school.branches?.length || 0), 0) || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Units</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {companyData?.schools?.filter(s => s.status === 'active').length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Staff</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {companyData?.schools?.reduce((acc, school) => 
                    acc + (school.additional?.teachers_count || 0), 0) || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Organization Chart */}
        <div className="bg-white rounded-lg border overflow-x-auto">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
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
      
      {/* Create Modal */}
      {renderCreateModal()}
    </div>
  );
}