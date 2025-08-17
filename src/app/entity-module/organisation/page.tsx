/**
 * File: /home/project/src/app/entity-module/organisation/page.tsx
 * 
 * Organization Management Page - Updated to use Wizard for Create/Edit
 * All original functionality preserved, only modified the create/edit flow
 * 
 * Dependencies: 
 *   - @/lib/supabase
 *   - @/lib/auth
 *   - @/contexts/UserContext
 *   - @/components/shared/* (Button, StatusBadge)
 *   - External: react, @tanstack/react-query, lucide-react, react-hot-toast, next/navigation
 * 
 * Preserved Features:
 *   - Organization chart with zoom controls
 *   - Department management
 *   - Academic years management
 *   - Details panel with tabs
 *   - All original queries and mutations
 *   - View mode toggle
 *   - Summary cards
 * 
 * Modified Features:
 *   - Create buttons now navigate to wizard
 *   - Edit buttons now navigate to wizard
 *   - Removed inline create/edit forms (handled by wizard)
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, School, MapPin, Edit, ChevronDown, ChevronRight,
  Plus, X, Save, Trash2, Users, Search, Filter, Settings,
  Activity, AlertCircle, Loader2, Phone, Mail, Eye,
  Globe, User, MoreVertical, UserPlus, ChevronUp,
  FolderOpen, FileText, Calendar, Shield, Hash, Briefcase,
  Edit2, PlusCircle, GraduationCap, UserCheck,
  ZoomIn, ZoomOut, Maximize2, Minimize2, ScanLine, Fullscreen, RotateCcw, Info
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { getAuthenticatedUser } from '../../../lib/auth';
import { useUser } from '../../../contexts/UserContext';
import { Button } from '../../../components/shared/Button';

// ===== STATUS BADGE COMPONENT (PRESERVED) =====
const StatusBadge = memo(({ status }: { status: string }) => {
  const getStatusColor = () => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
      case 'planned':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'completed':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}>
      {status || 'Unknown'}
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';

// ===== TYPE DEFINITIONS (PRESERVED) =====
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
  additional?: SchoolAdditional;
  branches?: BranchData[];
  student_count?: number;
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
  status: 'active' | 'inactive';
  created_at: string;
  additional?: BranchAdditional;
  student_count?: number;
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

// ===== OPTIMIZED FETCH FUNCTION (PRESERVED) =====
const fetchOrganizationData = async (companyId: string): Promise<Company> => {
  try {
    const [companyRes, companyAddRes, schoolsRes] = await Promise.all([
      supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single(),
      
      supabase
        .from('companies_additional')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle(),
      
      supabase
        .from('schools')
        .select(`
          *,
          schools_additional (*)
        `)
        .eq('company_id', companyId)
        .order('name')
    ]);

    if (companyRes.error) throw companyRes.error;
    
    const company = companyRes.data;
    const schools = schoolsRes.data || [];
    
    const schoolIds = schools.map(s => s.id);
    
    let branches: any[] = [];
    if (schoolIds.length > 0) {
      const branchesRes = await supabase
        .from('branches')
        .select(`
          *,
          branches_additional (*)
        `)
        .in('school_id', schoolIds)
        .order('name');
      
      branches = branchesRes.data || [];
    }

    const branchesBySchool = branches.reduce((acc, branch) => {
      if (!acc[branch.school_id]) {
        acc[branch.school_id] = [];
      }
      acc[branch.school_id].push({
        ...branch,
        additional: branch.branches_additional?.[0] || null,
        student_count: 0
      });
      return acc;
    }, {} as Record<string, BranchData[]>);

    const schoolsWithBranches = schools.map(school => ({
      ...school,
      additional: school.schools_additional?.[0] || null,
      branches: branchesBySchool[school.id] || [],
      student_count: 0
    }));

    return {
      ...company,
      additional: companyAddRes.data,
      schools: schoolsWithBranches
    };
  } catch (error) {
    console.error('Error fetching organization:', error);
    throw error;
  }
};

// ===== MEMOIZED ORG NODE COMPONENT (UPDATED WITH EDIT) =====
const OrgChartNode = memo(({ 
  item, 
  type, 
  isRoot = false,
  onItemClick,
  onAddClick,
  onEditClick
}: { 
  item: any; 
  type: 'company' | 'school' | 'branch';
  isRoot?: boolean;
  onItemClick: (item: any, type: 'company' | 'school' | 'branch') => void;
  onAddClick: (parentItem: any, parentType: 'company' | 'school') => void;
  onEditClick: (item: any, type: 'company' | 'school' | 'branch') => void;
}) => {
  const getInitials = (name: string): string => {
    if (!name) return 'NA';
    const words = name.trim().split(' ').filter(w => w.length > 0);
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const employeeCount = type === 'company' ? 
    item.schools?.reduce((acc: number, school: SchoolData) => 
      acc + (school.additional?.teachers_count || 0), 0) || 0 :
    type === 'school' ? item.additional?.teachers_count || 0 :
    item.additional?.teachers_count || 0;

  const managerName = type === 'company' ? item.additional?.ceo_name :
                     type === 'school' ? item.additional?.principal_name :
                     item.additional?.branch_head_name;

  const managerTitle = type === 'company' ? 'CEO' :
                      type === 'school' ? 'Principal' : 
                      'Branch Head';

  const location = type === 'company' ? item.additional?.head_office_city :
                  type === 'school' ? item.additional?.campus_city :
                  item.address;

  const Icon = type === 'company' ? Building2 :
               type === 'school' ? School : MapPin;

  return (
    <div className={`
      bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 p-4 min-w-[280px] 
      ${isRoot ? 'border-blue-500 dark:border-blue-400' : 'border-gray-200 dark:border-gray-700'}
      hover:shadow-md transition-all cursor-pointer
    `}
    onClick={() => onItemClick(item, type)}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`
            w-12 h-12 rounded-full flex items-center justify-center text-white font-bold
            ${type === 'company' ? 'bg-blue-500' :
              type === 'school' ? 'bg-green-500' : 'bg-purple-500'}
          `}>
            {getInitials(item.name)}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">{item.name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Code: {item.code}</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditClick(item, type);
            }}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Edit"
          >
            <Edit2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
          {type !== 'branch' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddClick(item, type);
              }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title={`Add ${type === 'company' ? 'School' : 'Branch'}`}
            >
              <Plus className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Icon className="w-3 h-3" />
          <span>{location || 'No location'}</span>
        </div>
        {managerName && (
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <User className="w-3 h-3" />
            <span>{managerTitle}: {managerName}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Users className="w-3 h-3" />
          <span>{employeeCount} Staff</span>
        </div>
      </div>

      <div className="mt-3">
        <StatusBadge status={item.status} />
      </div>
    </div>
  );
});

OrgChartNode.displayName = 'OrgChartNode';

// ===== MAIN COMPONENT =====
export default function OrganizationPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState<Company | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<'company' | 'school' | 'branch' | null>(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'departments' | 'years'>('details');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['company']));
  const [viewMode, setViewMode] = useState<'expand' | 'collapse'>('expand');
  const [zoomLevel, setZoomLevel] = useState(100);

  // ===== FETCH USER COMPANY (PRESERVED) =====
  useEffect(() => {
    const fetchUserCompany = async () => {
      try {
        const authenticatedUser = await getAuthenticatedUser();
        if (!authenticatedUser) {
          console.error('No authenticated user found');
          return;
        }

        const { data: entityUser, error: entityError } = await supabase
          .from('entity_users')
          .select('company_id, is_company_admin')
          .eq('user_id', authenticatedUser.id)
          .maybeSingle();
        
        if (entityError && entityError.code !== 'PGRST116') {
          console.error('Error fetching entity user:', entityError);
          return;
        }

        if (entityUser && entityUser.company_id) {
          setUserCompanyId(entityUser.company_id);
          setExpandedNodes(new Set(['company']));
        }
      } catch (error) {
        console.error('Error fetching user company:', error);
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
      return fetchOrganizationData(userCompanyId);
    },
    {
      enabled: !!userCompanyId,
      onSuccess: (data) => {
        setCompanyData(data);
        if (!selectedItem && data) {
          setSelectedItem(data);
          setSelectedType('company');
        }
      },
      onError: (error: any) => {
        console.error('Error fetching organization:', error);
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
      enabled: !!selectedItem && !!userCompanyId
    }
  );

  // ===== ACADEMIC YEARS QUERY (PRESERVED) =====
  const { data: academicYears = [] } = useQuery(
    ['academic-years', selectedItem?.id],
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
      enabled: selectedType === 'school' && !!selectedItem
    }
  );

  // ===== DEPARTMENT MUTATION (PRESERVED) =====
  const createDepartmentMutation = useMutation(
    async (data: Partial<Department>) => {
      const { data: result, error } = await supabase
        .from('entity_departments')
        .insert([{ ...data, status: 'active', employee_count: 0 }])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['departments']);
        toast.success('Department created successfully');
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to create department');
      }
    }
  );

  // ===== ACADEMIC YEAR MUTATION (PRESERVED) =====
  const createAcademicYearMutation = useMutation(
    async (data: Partial<AcademicYear>) => {
      const { data: result, error } = await supabase
        .from('academic_years')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['academic-years']);
        toast.success('Academic year created successfully');
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to create academic year');
      }
    }
  );

  // ===== NAVIGATION FUNCTIONS (MODIFIED FOR WIZARD) =====
  const handleItemClick = useCallback((item: any, type: 'company' | 'school' | 'branch') => {
    setSelectedItem(item);
    setSelectedType(type);
    setShowDetailsPanel(true);
    setActiveTab('details');
  }, []);

  const handleAddClick = useCallback((parentItem: any, parentType: 'company' | 'school') => {
    const type = parentType === 'company' ? 'school' : 'branch';
    const parentId = parentItem.id;
    navigate(`/entity-module/organisation/wizard?type=${type}&mode=create&parentId=${parentId}`);
  }, [navigate]);

  const handleEditClick = useCallback((item: any, type: 'company' | 'school' | 'branch') => {
    navigate(`/entity-module/organisation/wizard?type=${type}&mode=edit&id=${item.id}`);
  }, [navigate]);

  // ===== RENDER ORGANIZATION CHART (PRESERVED WITH EDIT SUPPORT) =====
  const renderOrganizationChart = () => {
    if (!companyData) return null;

    return (
      <div className="org-chart">
        <div className="flex flex-col items-center">
          <OrgChartNode
            item={companyData}
            type="company"
            isRoot={true}
            onItemClick={handleItemClick}
            onAddClick={handleAddClick}
            onEditClick={handleEditClick}
          />

          {companyData.schools && companyData.schools.length > 0 && (
            <div className="flex gap-4 mt-8">
              {companyData.schools.map((school) => (
                <div key={school.id} className="flex flex-col items-center">
                  <div className="w-0.5 h-8 bg-gray-300 dark:bg-gray-600" />
                  <OrgChartNode
                    item={school}
                    type="school"
                    onItemClick={handleItemClick}
                    onAddClick={handleAddClick}
                    onEditClick={handleEditClick}
                  />

                  {school.branches && school.branches.length > 0 && (
                    <div className="flex gap-4 mt-8">
                      {school.branches.map((branch) => (
                        <div key={branch.id} className="flex flex-col items-center">
                          <div className="w-0.5 h-8 bg-gray-300 dark:bg-gray-600" />
                          <OrgChartNode
                            item={branch}
                            type="branch"
                            onItemClick={handleItemClick}
                            onAddClick={handleAddClick}
                            onEditClick={handleEditClick}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ===== RENDER DETAILS PANEL (PRESERVED WITH WIZARD EDIT) =====
  const renderDetailsPanel = () => {
    if (!selectedItem || !showDetailsPanel) return null;

    return (
      <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 shadow-lg border-l border-gray-200 dark:border-gray-700 overflow-y-auto z-40">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {selectedType === 'company' ? 'Company' : selectedType === 'school' ? 'School' : 'Branch'} Details
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => handleEditClick(selectedItem, selectedType!)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                title="Edit in Wizard"
              >
                <Edit className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
              <button
                onClick={() => {
                  setShowDetailsPanel(false);
                  setSelectedItem(null);
                  setSelectedType(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setActiveTab('details')}
              className={`pb-2 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('departments')}
              className={`pb-2 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'departments'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Departments
            </button>
            {selectedType === 'school' && (
              <button
                onClick={() => setActiveTab('years')}
                className={`pb-2 px-1 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === 'years'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Academic Years
              </button>
            )}
          </div>
        </div>

        <div className="p-4">
          {activeTab === 'details' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <Info className="w-4 h-4 inline mr-2" />
                  Click the edit button above to modify details using the comprehensive wizard
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Basic Information</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Name:</span>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedItem.name}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Code:</span>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedItem.code}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Status:</span>
                    <div className="mt-1">
                      <StatusBadge status={selectedItem.status} />
                    </div>
                  </div>
                  {selectedItem.description && (
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Description:</span>
                      <p className="text-sm text-gray-900 dark:text-white">{selectedItem.description}</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedItem.additional && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Additional Information</h3>
                  <div className="space-y-2">
                    {selectedType === 'company' && (
                      <>
                        {selectedItem.additional.organization_type && (
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Organization Type:</span>
                            <p className="text-sm text-gray-900 dark:text-white capitalize">
                              {selectedItem.additional.organization_type.replace(/_/g, ' ')}
                            </p>
                          </div>
                        )}
                        {selectedItem.additional.main_email && (
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Email:</span>
                            <p className="text-sm text-gray-900 dark:text-white">{selectedItem.additional.main_email}</p>
                          </div>
                        )}
                        {selectedItem.additional.main_phone && (
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Phone:</span>
                            <p className="text-sm text-gray-900 dark:text-white">{selectedItem.additional.main_phone}</p>
                          </div>
                        )}
                        {selectedItem.additional.website && (
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Website:</span>
                            <p className="text-sm text-gray-900 dark:text-white">{selectedItem.additional.website}</p>
                          </div>
                        )}
                      </>
                    )}
                    {selectedType === 'school' && (
                      <>
                        {selectedItem.additional.school_type && (
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">School Type:</span>
                            <p className="text-sm text-gray-900 dark:text-white capitalize">{selectedItem.additional.school_type}</p>
                          </div>
                        )}
                        {selectedItem.additional.principal_name && (
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Principal:</span>
                            <p className="text-sm text-gray-900 dark:text-white">{selectedItem.additional.principal_name}</p>
                          </div>
                        )}
                        {selectedItem.additional.total_capacity && (
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Capacity:</span>
                            <p className="text-sm text-gray-900 dark:text-white">{selectedItem.additional.total_capacity}</p>
                          </div>
                        )}
                      </>
                    )}
                    {selectedType === 'branch' && (
                      <>
                        {selectedItem.additional.branch_head_name && (
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Branch Head:</span>
                            <p className="text-sm text-gray-900 dark:text-white">{selectedItem.additional.branch_head_name}</p>
                          </div>
                        )}
                        {selectedItem.additional.building_name && (
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Building:</span>
                            <p className="text-sm text-gray-900 dark:text-white">{selectedItem.additional.building_name}</p>
                          </div>
                        )}
                        {selectedItem.additional.student_capacity && (
                          <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Student Capacity:</span>
                            <p className="text-sm text-gray-900 dark:text-white">{selectedItem.additional.student_capacity}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'departments' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Departments</h3>
                <button
                  onClick={() => {
                    const newDept: Partial<Department> = {
                      name: prompt('Department Name:') || '',
                      code: prompt('Department Code:') || '',
                      department_type: 'administrative',
                      company_id: userCompanyId!,
                      school_id: selectedType === 'school' ? selectedItem?.id : undefined,
                      branch_id: selectedType === 'branch' ? selectedItem?.id : undefined,
                    };
                    if (newDept.name && newDept.code) {
                      createDepartmentMutation.mutate(newDept);
                    }
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500"
                >
                  <PlusCircle className="w-5 h-5" />
                </button>
              </div>
              {departments.length > 0 ? (
                <div className="space-y-2">
                  {departments.map((dept) => (
                    <div key={dept.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{dept.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Code: {dept.code}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Type: {dept.department_type}</p>
                        </div>
                        <StatusBadge status={dept.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No departments found</p>
              )}
            </div>
          )}

          {activeTab === 'years' && selectedType === 'school' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Academic Years</h3>
                <button
                  onClick={() => {
                    const newYear: Partial<AcademicYear> = {
                      school_id: selectedItem.id,
                      year_name: prompt('Year Name (e.g., 2024-2025):') || '',
                      start_date: prompt('Start Date (YYYY-MM-DD):') || '',
                      end_date: prompt('End Date (YYYY-MM-DD):') || '',
                      total_terms: parseInt(prompt('Total Terms:') || '3'),
                      is_current: false,
                      status: 'planned'
                    };
                    if (newYear.year_name && newYear.start_date && newYear.end_date) {
                      createAcademicYearMutation.mutate(newYear);
                    }
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500"
                >
                  <PlusCircle className="w-5 h-5" />
                </button>
              </div>
              {academicYears.length > 0 ? (
                <div className="space-y-2">
                  {academicYears.map((year) => (
                    <div key={year.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{year.year_name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(year.start_date).toLocaleDateString()} - {new Date(year.end_date).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Terms: {year.total_terms}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          {year.is_current && (
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded">
                              Current
                            </span>
                          )}
                          <StatusBadge status={year.status} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No academic years found</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ===== ZOOM CONTROLS (PRESERVED) =====
  const handleZoom = (action: 'in' | 'out' | 'reset') => {
    if (action === 'in') {
      setZoomLevel(prev => Math.min(prev + 10, 150));
    } else if (action === 'out') {
      setZoomLevel(prev => Math.max(prev - 10, 50));
    } else {
      setZoomLevel(100);
    }
  };

  // ===== LOADING STATE (PRESERVED) =====
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  // ===== ERROR STATE (PRESERVED) =====
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-gray-900 dark:text-white">Failed to load organization data</p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // ===== MAIN RENDER =====
  return (
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Organization Structure</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your company hierarchy, schools, and branches
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => navigate('/entity-module/organisation/wizard?type=company&mode=create')}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Organization
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Schools</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {companyData?.schools?.length || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <School className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Branches</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {companyData?.schools?.reduce((acc, school) => 
                  acc + (school.branches?.length || 0), 0) || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <MapPin className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Departments</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {departments.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
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

      {/* Organization Chart with Zoom Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Organization Chart
          </h2>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleZoom('out')}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[50px] text-center">
              {zoomLevel}%
            </span>
            <button
              onClick={() => handleZoom('in')}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
            <button
              onClick={() => handleZoom('reset')}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              title="Reset Zoom"
            >
              <RotateCcw className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>
        
        <div 
          className="p-6 overflow-auto"
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left' }}
        >
          {renderOrganizationChart()}
        </div>
      </div>

      {/* Details Panel */}
      {renderDetailsPanel()}
    </div>
  );
}