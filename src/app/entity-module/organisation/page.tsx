/**
 * File: /home/project/src/app/entity-module/organisation/page.tsx
 * 
 * Organization Management Page - Enhanced with Wizard Integration
 * ALL original functionality preserved, navigation to wizard fixed
 * 
 * Dependencies: 
 *   - @/lib/supabase
 *   - @/lib/auth
 *   - @/contexts/UserContext
 *   - @/components/shared/* (SlideInForm, FormField, Button)
 *   - External: react, @tanstack/react-query, lucide-react, react-hot-toast
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, School, MapPin, Edit, ChevronDown, ChevronRight,
  Plus, X, Save, Trash2, Users, Search, Filter, Settings,
  Activity, AlertCircle, Loader2, Phone, Mail, Eye,
  Globe, User, MoreVertical, UserPlus, ChevronUp,
  FolderOpen, FileText, Calendar, Shield, Hash, Briefcase,
  Edit2, PlusCircle, GraduationCap, UserCheck,
  ZoomIn, ZoomOut, Maximize2, Minimize2, ScanLine, Fullscreen, RotateCcw, Info, ExternalLink,
  Building, Flag, MapPinned, Clock, CheckCircle2, XCircle, AlertTriangle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { getAuthenticatedUser } from '../../../lib/auth';
import { useUser } from '../../../contexts/UserContext';
import { SlideInForm } from '../../../components/shared/SlideInForm';
import { FormField, Input, Select, Textarea } from '../../../components/shared/FormField';
import { Button } from '../../../components/shared/Button';

// ===== STATUS BADGE COMPONENT WITH ENHANCED STYLING =====
const StatusBadge = memo(({ status, size = 'sm' }: { status: string; size?: 'xs' | 'sm' | 'md' }) => {
  const getStatusConfig = () => {
    switch (status?.toLowerCase()) {
      case 'active':
        return {
          color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-700',
          icon: <CheckCircle2 className="w-3 h-3" />,
          pulse: true
        };
      case 'inactive':
        return {
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300 border-gray-200 dark:border-gray-600',
          icon: <XCircle className="w-3 h-3" />,
          pulse: false
        };
      case 'pending':
        return {
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700',
          icon: <Clock className="w-3 h-3" />,
          pulse: true
        };
      case 'planned':
        return {
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
          icon: <Calendar className="w-3 h-3" />,
          pulse: false
        };
      case 'completed':
        return {
          color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
          icon: <CheckCircle2 className="w-3 h-3" />,
          pulse: false
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300 border-gray-200 dark:border-gray-600',
          icon: <AlertTriangle className="w-3 h-3" />,
          pulse: false
        };
    }
  };

  const config = getStatusConfig();
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-xs',
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm'
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium border ${config.color} ${sizeClasses[size]} relative`}>
      {config.pulse && status?.toLowerCase() === 'active' && (
        <span className="absolute -top-0.5 -right-0.5 h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
      )}
      {config.icon}
      {status || 'Unknown'}
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';

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
  student_count?: number;
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

// ===== OPTIMIZED FETCH FUNCTION =====
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

// ===== ENHANCED ORG NODE COMPONENT =====
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
  onEditClick?: (item: any, type: 'company' | 'school' | 'branch') => void;
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
                  item.additional?.building_name;

  const getCardBackground = () => {
    if (type === 'company') {
      return 'bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600';
    }
    if (type === 'school') {
      return 'bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700 hover:border-green-300 dark:hover:border-green-600';
    }
    return 'bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700 hover:border-purple-300 dark:hover:border-purple-600';
  };

  const getAvatarColor = () => {
    if (type === 'company') return 'bg-gradient-to-br from-blue-500 to-blue-600';
    if (type === 'school') return 'bg-gradient-to-br from-green-500 to-green-600';
    return 'bg-gradient-to-br from-purple-500 to-purple-600';
  };

  const getTypeIcon = () => {
    if (type === 'company') return <Building2 className="w-4 h-4" />;
    if (type === 'school') return <School className="w-4 h-4" />;
    return <MapPin className="w-4 h-4" />;
  };

  return (
    <div 
      className={`rounded-xl border-2 shadow-sm hover:shadow-xl transition-all duration-300 p-4 w-[300px] cursor-pointer group ${getCardBackground()}`}
      onClick={() => onItemClick(item, type)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 rounded-lg ${getAvatarColor()} flex items-center justify-center text-white font-bold text-sm shadow-lg transform group-hover:scale-105 transition-transform`}>
            {getInitials(item.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {getTypeIcon()}
              <h3 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1">
                {item.name}
              </h3>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                {item.code}
              </span>
              <StatusBadge status={item.status} size="xs" />
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEditClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditClick(item, type);
              }}
              className="p-1.5 bg-white/70 dark:bg-gray-700/70 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all transform hover:scale-110"
              title="Edit in Wizard"
            >
              <ExternalLink className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </button>
          )}
          {(type === 'company' || type === 'school') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddClick(item, type);
              }}
              className="p-1.5 bg-white/70 dark:bg-gray-700/70 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all transform hover:scale-110"
              title={`Add ${type === 'company' ? 'School' : 'Branch'}`}
            >
              <PlusCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            </button>
          )}
        </div>
      </div>

      <div className="mb-3 bg-white/60 dark:bg-gray-900/60 backdrop-blur rounded-lg p-2">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-1">
          <User className="w-3 h-3" />
          <span>{managerTitle}</span>
        </div>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
          {managerName || 'Not Assigned'}
        </p>
      </div>

      <div className="flex items-center justify-between text-xs border-t dark:border-gray-600 pt-3">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <Users className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-700 dark:text-gray-300">
              <span className="font-bold">{employeeCount}</span> Staff
            </span>
          </div>
          {type === 'school' && item.branches && item.branches.length > 0 && (
            <div className="flex items-center space-x-1.5">
              <Building className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">
                <span className="font-bold">{item.branches.length}</span> Branches
              </span>
            </div>
          )}
        </div>
      </div>

      {location && (
        <div className="mt-2 flex items-center space-x-1.5 text-xs">
          <MapPinned className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <p className="text-gray-600 dark:text-gray-400 truncate">
            {location}
          </p>
        </div>
      )}
    </div>
  );
});

OrgChartNode.displayName = 'OrgChartNode';

// ===== MAIN COMPONENT =====
export default function OrganisationManagement() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const authenticatedUser = getAuthenticatedUser();
  
  // State management
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['company']));
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<'company' | 'school' | 'branch' | null>(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'school' | 'branch' | 'department' | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState<Company | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'expand' | 'colleagues'>('expand');
  const [activeTab, setActiveTab] = useState<'details' | 'departments' | 'academic'>('details');
  const [formData, setFormData] = useState<any>({});
  
  // Zoom state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 2;
  const ZOOM_STEP = 0.1;

  // ===== ZOOM CONTROLS =====
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(1);
  }, []);

  const handleFitToScreen = useCallback(() => {
    const container = document.getElementById('org-chart-container');
    const chart = document.getElementById('org-chart');
    
    if (container && chart) {
      const containerWidth = container.clientWidth;
      const chartWidth = chart.scrollWidth;
      
      const optimalZoom = Math.min(containerWidth / chartWidth, 1);
      setZoomLevel(Math.max(optimalZoom, MIN_ZOOM));
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    const element = document.querySelector('.org-main-container') as HTMLElement;
    
    if (!isFullscreen && element) {
      if (element.requestFullscreen) {
        element.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // ===== FETCH USER'S COMPANY =====
  useEffect(() => {
    const fetchUserCompany = async () => {
      try {
        if (!authenticatedUser) {
          console.error('No authenticated user found');
          return;
        }

        const { data: entityUser, error } = await supabase
          .from('entity_users')
          .select('company_id')
          .eq('user_id', authenticatedUser.id)
          .single();
        
        if (!error && entityUser?.company_id) {
          setUserCompanyId(entityUser.company_id);
        } else {
          console.error('Error fetching entity user:', error);
        }
      } catch (error) {
        console.error('Error fetching user company:', error);
      }
    };
    
    if (authenticatedUser) {
      fetchUserCompany();
    }
  }, [authenticatedUser]);

  // ===== FETCH ORGANIZATION DATA =====
  const { data: organizationData, isLoading, error, refetch } = useQuery(
    ['organization', userCompanyId],
    () => fetchOrganizationData(userCompanyId!),
    {
      enabled: !!userCompanyId,
      staleTime: 60 * 1000,
      cacheTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      keepPreviousData: true
    }
  );

  useEffect(() => {
    if (organizationData) {
      setCompanyData(organizationData);
    }
  }, [organizationData]);

  // ===== LAZY LOAD DEPARTMENTS =====
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

  // ===== LAZY LOAD ACADEMIC YEARS =====
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

  // ===== ALL MUTATIONS =====
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
          status: data.status || 'active'
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
          status: data.status || 'active'
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
  const toggleNode = useCallback((id: string) => {
    setExpandedNodes(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      return newExpanded;
    });
  }, []);

  const handleItemClick = useCallback((item: any, type: 'company' | 'school' | 'branch') => {
    setSelectedItem(item);
    setSelectedType(type);
    setShowDetailsPanel(true);
    setEditMode(false);
    setActiveTab('details');
    setFormData(item.additional || {});
  }, []);

  const handleAddClick = useCallback((parentItem: any, parentType: 'company' | 'school') => {
    setFormData({});
    setFormErrors({});
    
    if (parentType === 'company') {
      setModalType('school');
    } else if (parentType === 'school') {
      setModalType('branch');
      setFormData({ school_id: parentItem.id });
    }
    
    setShowModal(true);
  }, []);

  const handleEditInWizard = useCallback((item: any, type: 'company' | 'school' | 'branch') => {
    router.push(`/app/entity-module/organisation/wizard?type=${type}&mode=edit&id=${item.id}`);
  }, [router]);

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
    const formDataFromForm = new FormData(form);
    
    const data: any = {
      name: formDataFromForm.get('name') as string,
      code: formDataFromForm.get('code') as string,
      status: formDataFromForm.get('status') as string || 'active',
    };

    if (modalType === 'school') {
      data.description = formDataFromForm.get('description') as string;
    }

    const errors: Record<string, string> = {};
    if (!data.name) errors.name = 'Name is required';
    if (!data.code) errors.code = 'Code is required';
    
    if (modalType === 'branch') {
      data.school_id = formData.school_id;
      if (!data.school_id) errors.school_id = 'School is required';
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
        department_type: formDataFromForm.get('department_type') as any,
        employee_count: 0,
        status: data.status || 'active'
      };
      createDepartmentMutation.mutate(deptData);
    }
  };

  const handleExpandAll = () => {
    if (!companyData) return;
    const allNodes = new Set<string>(['company']);
    companyData.schools?.forEach(school => {
      allNodes.add(school.id);
    });
    setExpandedNodes(allNodes);
  };

  const handleCollapseAll = () => {
    setExpandedNodes(new Set());
  };

  // ===== RENDER ORGANIZATION CHART =====
  const renderOrganizationChart = () => {
    if (!companyData) return null;

    const showSchools = expandedNodes.has('company');

    return (
      <div 
        className="flex flex-col items-center py-8"
        style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center top' }}
      >
        <div id="org-company" className="relative">
          <OrgChartNode 
            item={companyData} 
            type="company" 
            isRoot={true}
            onItemClick={handleItemClick}
            onAddClick={handleAddClick}
            onEditClick={handleEditInWizard}
          />
          {companyData.schools && companyData.schools.length > 0 && (
            <button
              onClick={() => toggleNode('company')}
              className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-full p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 z-10 shadow-lg hover:shadow-xl transition-all"
              title={showSchools ? 'Collapse Schools' : 'Expand Schools'}
            >
              {showSchools ? (
                <ChevronUp className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          )}
        </div>

        <div id="org-schools">
          {showSchools && companyData.schools && companyData.schools.length > 0 && (
            <>
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Students</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {companyData?.schools?.reduce((acc, school) => 
                    acc + (school.additional?.student_count || 0), 0) || 0}
                </p>
              </div>
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Organization Chart */}
        <div id="org-chart-wrapper" className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 relative">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-20">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {viewMode === 'expand' ? 'Organization Structure' : 'All Colleagues'}
              </h2>
              
              {viewMode === 'expand' && (
                <div className="flex items-center gap-2">
                  {/* Zoom Controls */}
                  <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mr-4">
                    <button
                      onClick={handleZoomOut}
                      disabled={zoomLevel <= MIN_ZOOM}
                      className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Zoom Out (Ctrl+-)"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    
                    <span className="px-2 text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[3rem] text-center">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    
                    <button
                      onClick={handleZoomIn}
                      disabled={zoomLevel >= MAX_ZOOM}
                      className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Zoom In (Ctrl++)"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    
                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                    
                    <button
                      onClick={handleZoomReset}
                      className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-600 rounded transition-colors"
                      title="Reset Zoom to 100% (Ctrl+0)"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={handleFitToScreen}
                      className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-600 rounded transition-colors"
                      title="Fit to Screen"
                    >
                      <ScanLine className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={toggleFullscreen}
                      className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-600 rounded transition-colors"
                      title={isFullscreen ? "Exit Fullscreen (Esc)" : "Enter Fullscreen (F11)"}
                    >
                      {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Fullscreen className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Show/Hide Controls */}
                  <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Show/Hide:</span>
                  
                  <button
                    onClick={() => {
                      setExpandedNodes(new Set());
                    }}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      expandedNodes.size === 0
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    }`}
                  >
                    Entity
                  </button>
                  
                  <button
                    onClick={() => {
                      const newExpanded = new Set<string>();
                      newExpanded.add('company');
                      setExpandedNodes(newExpanded);
                    }}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      expandedNodes.has('company') && !companyData?.schools?.some(s => expandedNodes.has(s.id))
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                    }`}
                  >
                    Schools
                  </button>
                  
                  <button
                    onClick={() => {
                      if (!companyData) return;
                      const newExpanded = new Set<string>();
                      newExpanded.add('company');
                      companyData.schools?.forEach(school => {
                        if (school.branches && school.branches.length > 0) {
                          newExpanded.add(school.id);
                        }
                      });
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
          
          <div id="org-chart-container" className="p-6 overflow-x-auto overflow-y-hidden" style={{ minHeight: '600px' }}>
            {viewMode === 'expand' ? (
              <div id="org-chart" className="inline-block min-w-full">
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
          
          {/* Zoom Hint */}
          {viewMode === 'expand' && (
            <div className="absolute bottom-4 left-4 text-xs text-gray-500 dark:text-gray-400 bg-white/90 dark:bg-gray-800/90 px-2 py-1 rounded">
              Tip: Use Ctrl+Mouse Wheel or Ctrl+/- to zoom
            </div>
          )}
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

          <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-md border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <Info className="w-4 h-4 inline mr-2" />
              This is a quick create form. For comprehensive data entry with all fields, use the wizard.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                const type = modalType === 'school' ? 'school' : modalType === 'branch' ? 'branch' : 'company';
                const parentId = modalType === 'branch' ? formData.school_id : userCompanyId;
                router.push(`/app/entity-module/organisation/wizard?type=${type}&mode=create&parentId=${parentId}`);
              }}
              className="mt-2 text-xs"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Use Wizard Instead
            </Button>
          </div>

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
              placeholder={`Enter unique ${modalType} code`}
            />
          </FormField>

          <FormField
            id="status"
            label="Status"
            required
            error={formErrors.status}
          >
            <Select
              id="status"
              name="status"
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
              defaultValue="active"
            />
          </FormField>

          {modalType === 'school' && (
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

          {modalType === 'branch' && formData.school_id && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-200">
                <School className="w-4 h-4 inline mr-2" />
                Adding branch to: <strong>{companyData?.schools?.find(s => s.id === formData.school_id)?.name}</strong>
              </p>
            </div>
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
}0.5 h-16 bg-gradient-to-b from-gray-300 to-gray-200 dark:from-gray-600 dark:to-gray-700"></div>
              {companyData.schools.length > 1 && (
                <div className="relative h-0.5">
                  <div 
                    className="h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 absolute top-0"
                    style={{
                      width: `${(companyData.schools.length - 1) * 316 + 100}px`,
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
                        <OrgChartNode 
                          item={school} 
                          type="school"
                          onItemClick={handleItemClick}
                          onAddClick={handleAddClick}
                          onEditClick={handleEditInWizard}
                        />
                        {school.branches && school.branches.length > 0 && (
                          <button
                            onClick={() => toggleNode(school.id)}
                            className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-full p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 z-10 shadow-lg hover:shadow-xl transition-all"
                            title={isSchoolExpanded ? 'Collapse Branches' : 'Expand Branches'}
                          >
                            {isSchoolExpanded ? (
                              <ChevronUp className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            )}
                          </button>
                        )}
                      </div>
                      
                      <div>
                        {isSchoolExpanded && school.branches && school.branches.length > 0 && (
                          <>
                            <div className="w-0.5 h-16 bg-gradient-to-b from-gray-300 to-gray-200 dark:from-gray-600 dark:to-gray-700 mt-6"></div>
                            {school.branches.length > 1 && (
                              <div className="relative h-0.5">
                                <div 
                                  className="h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 absolute top-0"
                                  style={{
                                    width: `${(school.branches.length - 1) * 316 + 100}px`,
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
                                  <OrgChartNode 
                                    item={branch} 
                                    type="branch"
                                    onItemClick={handleItemClick}
                                    onAddClick={() => {}}
                                    onEditClick={handleEditInWizard}
                                  />
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
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowDetailsPanel(false)} />
        <div className="absolute right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto">
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4 z-10">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedType === 'company' ? 'Company' : selectedType === 'school' ? 'School' : 'Branch'} Details
              </h2>
              <button
                onClick={() => setShowDetailsPanel(false)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="flex mt-4 space-x-4 border-b dark:border-gray-700">
              <button
                onClick={() => setActiveTab('details')}
                className={`pb-2 px-1 ${activeTab === 'details' 
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('departments')}
                className={`pb-2 px-1 ${activeTab === 'departments' 
                  ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
              >
                Departments
              </button>
              {selectedType === 'school' && (
                <button
                  onClick={() => setActiveTab('academic')}
                  className={`pb-2 px-1 ${activeTab === 'academic' 
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                >
                  Academic Years
                </button>
              )}
            </div>
          </div>
          
          <div className="p-6">
            {activeTab === 'details' && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-200 flex items-start gap-2">
                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>For comprehensive editing with all fields and advanced options, use the wizard editor</span>
                  </p>
                  <Button
                    onClick={() => handleEditInWizard(selectedItem, selectedType!)}
                    variant="outline"
                    className="mt-3 w-full"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in Wizard Editor
                  </Button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Name
                    </label>
                    <p className="text-gray-900 dark:text-white font-medium">{selectedItem.name}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Code
                    </label>
                    <p className="text-gray-900 dark:text-white font-mono text-sm">{selectedItem.code}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Status
                    </label>
                    <StatusBadge status={selectedItem.status} size="md" />
                  </div>
                  {selectedItem.description && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Description
                      </label>
                      <p className="text-gray-700 dark:text-gray-300 text-sm">{selectedItem.description}</p>
                    </div>
                  )}
                </div>

                {selectedType === 'company' && editMode && (
                  <div className="space-y-4 pt-4 border-t dark:border-gray-700">
                    <FormField
                      id="ceo_name"
                      label="CEO Name"
                    >
                      <Input
                        id="ceo_name"
                        value={formData.ceo_name || ''}
                        onChange={(e) => setFormData({...formData, ceo_name: e.target.value})}
                        placeholder="Enter CEO name"
                      />
                    </FormField>
                    <FormField
                      id="ceo_email"
                      label="CEO Email"
                    >
                      <Input
                        id="ceo_email"
                        type="email"
                        value={formData.ceo_email || ''}
                        onChange={(e) => setFormData({...formData, ceo_email: e.target.value})}
                        placeholder="ceo@company.com"
                      />
                    </FormField>
                    <FormField
                      id="ceo_phone"
                      label="CEO Phone"
                    >
                      <Input
                        id="ceo_phone"
                        type="tel"
                        value={formData.ceo_phone || ''}
                        onChange={(e) => setFormData({...formData, ceo_phone: e.target.value})}
                        placeholder="+1234567890"
                      />
                    </FormField>
                  </div>
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
                      Quick Edit (Basic Fields)
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
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {departments && departments.length > 0 ? (
                    departments.map((dept: Department) => (
                      <div key={dept.id} className="p-3 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">{dept.name}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {dept.code} • {dept.employee_count || 0} employees
                            </p>
                          </div>
                          <StatusBadge status={dept.status} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <FolderOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">
                        No departments found
                      </p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        Click the + button to add a department
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'academic' && selectedType === 'school' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Academic Years</h3>
                  <button className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {academicYears && academicYears.length > 0 ? (
                    academicYears.map((year: AcademicYear) => (
                      <div key={year.id} className="p-3 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">{year.year_name}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(year.start_date).toLocaleDateString()} - {new Date(year.end_date).toLocaleDateString()}
                            </p>
                          </div>
                          {year.is_current && (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">
                        No academic years found
                      </p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        Click the + button to add an academic year
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ===== LOADING & ERROR STATES =====
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
    <div className="org-main-container min-h-screen bg-gray-50 dark:bg-gray-900 p-6 relative">
      <div className="max-w-full mx-auto space-y-6">
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
            <Button
              onClick={() => router.push('/app/entity-module/organisation/wizard?type=company&mode=create')}
              variant="outline"
              title="Create new organization with comprehensive wizard"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Create with Wizard
            </Button>
          </div>

          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1 w-fit">
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Schools</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {companyData?.schools?.length || 0}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <School className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Branches</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {companyData?.schools?.reduce((acc, school) => acc + (school.branches?.length || 0), 0) || 0}
                </p>
              </div>
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Schools</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {companyData?.schools?.filter(s => s.status === 'active').length || 0}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
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
              <div className="w-