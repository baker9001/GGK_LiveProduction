/**
 * File: /src/app/entity-module/organisation/page.tsx
 * 
 * Organization Management Page - Complete with Simple Create/Edit Forms
 * All wizard functionality removed, replaced with comprehensive forms
 * 
 * Dependencies: 
 *   - @/lib/supabase
 *   - @/lib/auth
 *   - @/contexts/UserContext
 *   - @/components/shared/* (SlideInForm, FormField, Button)
 *   - External: react, @tanstack/react-query, lucide-react, react-hot-toast
 * 
 * Database Tables:
 *   - companies & companies_additional
 *   - schools & schools_additional  
 *   - branches & branches_additional
 *   - regions, countries (for reference data)
 */

'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { 
  Building2, School, MapPin, Edit, ChevronDown, ChevronRight,
  Plus, X, Save, Trash2, Users, Search, Filter, Settings,
  Activity, AlertCircle, Loader2, Phone, Mail, Eye,
  Globe, User, MoreVertical, UserPlus, ChevronUp,
  FolderOpen, FileText, Calendar, Shield, Hash, Briefcase,
  Edit2, PlusCircle, GraduationCap, UserCheck,
  ZoomIn, ZoomOut, Maximize2, Minimize2, ScanLine, Fullscreen, RotateCcw, Info,
  Building, Flag, MapPinned, Clock, CheckCircle2, XCircle, AlertTriangle,
  Home, CreditCard, BookOpen, FlaskConical, Dumbbell, Coffee, Navigation
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import { getAuthenticatedUser } from '../../../lib/auth';
import { useUser } from '../../../contexts/UserContext';
import { SlideInForm } from '../../../components/shared/SlideInForm';
import { FormField, Input, Select, Textarea } from '../../../components/shared/FormField';
import { Button } from '../../../components/shared/Button';

// ===== STATUS BADGE COMPONENT =====
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
  region_id?: string;
  country_id?: string;
  address?: string;
  notes?: string;
  logo?: string;
  created_at: string;
  additional?: CompanyAdditional;
  schools?: SchoolData[];
}

interface CompanyAdditional {
  id?: string;
  company_id: string;
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
}

interface SchoolData {
  id: string;
  name: string;
  code: string;
  company_id: string;
  description: string;
  status: 'active' | 'inactive';
  address?: string;
  notes?: string;
  logo?: string;
  created_at: string;
  additional?: SchoolAdditional;
  branches?: BranchData[];
  student_count?: number;
}

interface SchoolAdditional {
  id?: string;
  school_id: string;
  school_type?: string;
  curriculum_type?: string[];
  total_capacity?: number;
  teachers_count?: number;
  student_count?: number;
  active_teachers_count?: number;
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
  address?: string;
  notes?: string;
  created_at: string;
  additional?: BranchAdditional;
  student_count?: number;
}

interface BranchAdditional {
  id?: string;
  branch_id: string;
  student_capacity?: number;
  current_students?: number;
  student_count?: number;
  teachers_count?: number;
  active_teachers_count?: number;
  branch_head_name?: string;
  branch_head_email?: string;
  branch_head_phone?: string;
  building_name?: string;
  floor_details?: string;
  opening_time?: string;
  closing_time?: string;
  working_days?: string[];
}

// ===== FETCH ORGANIZATION DATA =====
const fetchOrganizationData = async (companyId: string): Promise<Company> => {
  try {
    // Fetch company main data
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (companyError) throw companyError;
    
    // Fetch company additional data
    const { data: companyAdditional } = await supabase
      .from('companies_additional')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle();
    
    // Fetch all schools for this company
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('*')
      .eq('company_id', companyId)
      .order('name');
    
    if (schoolsError) throw schoolsError;
    
    // Fetch additional data for all schools
    const schoolsWithAdditional = await Promise.all((schools || []).map(async (school) => {
      const { data: schoolAdditional } = await supabase
        .from('schools_additional')
        .select('*')
        .eq('school_id', school.id)
        .maybeSingle();
      
      return {
        ...school,
        additional: schoolAdditional
      };
    }));
    
    // Get all school IDs to fetch branches
    const schoolIds = schools?.map(s => s.id) || [];
    
    let branchesWithAdditional: any[] = [];
    
    if (schoolIds.length > 0) {
      // Fetch all branches for all schools
      const { data: branches } = await supabase
        .from('branches')
        .select('*')
        .in('school_id', schoolIds)
        .order('name');
      
      // Fetch additional data for all branches
      branchesWithAdditional = await Promise.all((branches || []).map(async (branch) => {
        const { data: branchAdditional } = await supabase
          .from('branches_additional')
          .select('*')
          .eq('branch_id', branch.id)
          .maybeSingle();
        
        return {
          ...branch,
          additional: branchAdditional
        };
      }));
    }

    // Group branches by school
    const branchesBySchool = branchesWithAdditional.reduce((acc, branch) => {
      if (!acc[branch.school_id]) {
        acc[branch.school_id] = [];
      }
      acc[branch.school_id].push(branch);
      return acc;
    }, {} as Record<string, BranchData[]>);

    // Combine schools with their branches
    const schoolsWithBranches = schoolsWithAdditional.map(school => ({
      ...school,
      branches: branchesBySchool[school.id] || [],
      student_count: school.additional?.student_count || 0
    }));

    return {
      ...company,
      additional: companyAdditional,
      schools: schoolsWithBranches
    };
  } catch (error) {
    console.error('Error fetching organization:', error);
    throw error;
  }
};

// ===== ORG CHART NODE COMPONENT =====
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
              title="Edit"
            >
              <Edit2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
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
  const queryClient = useQueryClient();
  const { user } = useUser();
  const authenticatedUser = getAuthenticatedUser();
  
  // State management
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['company']));
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<'company' | 'school' | 'branch' | null>(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [modalType, setModalType] = useState<'company' | 'school' | 'branch' | 'department' | null>(null);
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState<Company | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<any>({});
  const [activeTab, setActiveTab] = useState<'basic' | 'additional' | 'contact'>('basic');
  const [detailsTab, setDetailsTab] = useState<'details' | 'departments' | 'academic'>('details');
  const [viewMode, setViewMode] = useState<'expand' | 'colleagues'>('expand');
  const [editMode, setEditMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Zoom state
  const [zoomLevel, setZoomLevel] = useState(1);
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 2;
  const ZOOM_STEP = 0.1;

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
          
          // Fetch company's region and country for default values
          const { data: company } = await supabase
            .from('companies')
            .select('region_id, country_id')
            .eq('id', entityUser.company_id)
            .single();
          
          if (company) {
            // Store default region and country for new entities
            setFormData(prev => ({
              ...prev,
              region_id: company.region_id,
              country_id: company.country_id
            }));
          }
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
    async () => {
      if (!userCompanyId) return null;
      
      try {
        // Step 1: Fetch company data
        const companyResponse = await supabase
          .from('companies')
          .select('*')
          .eq('id', userCompanyId)
          .single();

        if (companyResponse.error) throw companyResponse.error;
        const company = companyResponse.data;
        
        // Step 2: Fetch company additional data separately
        const companyAdditionalResponse = await supabase
          .from('companies_additional')
          .select('*')
          .eq('company_id', userCompanyId)
          .maybeSingle();
        
        // Step 3: Fetch all schools for this company (no nested select)
        const schoolsResponse = await supabase
          .from('schools')
          .select('*')
          .eq('company_id', userCompanyId)
          .order('name');
        
        if (schoolsResponse.error) throw schoolsResponse.error;
        const schools = schoolsResponse.data || [];
        
        // Step 4: For each school, fetch additional data and branches separately
        const schoolsWithDetails = [];
        for (const school of schools) {
          // Fetch school additional data
          const schoolAdditionalResponse = await supabase
            .from('schools_additional')
            .select('*')
            .eq('school_id', school.id)
            .maybeSingle();
          
          // Fetch branches for this school
          const branchesResponse = await supabase
            .from('branches')
            .select('*')
            .eq('school_id', school.id)
            .order('name');
          
          const branches = branchesResponse.data || [];
          
          // For each branch, fetch additional data
          const branchesWithDetails = [];
          for (const branch of branches) {
            const branchAdditionalResponse = await supabase
              .from('branches_additional')
              .select('*')
              .eq('branch_id', branch.id)
              .maybeSingle();
            
            branchesWithDetails.push({
              ...branch,
              additional: branchAdditionalResponse.data
            });
          }
          
          schoolsWithDetails.push({
            ...school,
            additional: schoolAdditionalResponse.data,
            branches: branchesWithDetails,
            student_count: schoolAdditionalResponse.data?.student_count || 0
          });
        }

        return {
          ...company,
          additional: companyAdditionalResponse.data,
          schools: schoolsWithDetails
        };
      } catch (error) {
        console.error('Error fetching organization:', error);
        throw error;
      }
    },
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

  // ===== FETCH DEPARTMENTS =====
  const { data: departments = [] } = useQuery(
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
      
      if (error && error.code !== 'PGRST116') throw error;
      return data || [];
    },
    {
      enabled: !!selectedItem && detailsTab === 'departments'
    }
  );

  // ===== FETCH ACADEMIC YEARS =====
  const { data: academicYears = [] } = useQuery(
    ['academicYears', selectedItem?.id],
    async () => {
      if (!selectedItem || selectedType !== 'school') return [];
      
      const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .eq('school_id', selectedItem.id)
        .order('start_date', { ascending: false });
      
      if (error && error.code !== 'PGRST116') throw error;
      return data || [];
    },
    {
      enabled: selectedType === 'school' && detailsTab === 'academic'
    }
  );
  const { data: companies = [] } = useQuery(
    ['companies-list'],
    async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  );

  const { data: schools = [] } = useQuery(
    ['schools-list', formData.company_id || userCompanyId],
    async () => {
      const companyId = formData.company_id || userCompanyId;
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
    { enabled: modalType === 'branch' }
  );

  const { data: regions = [] } = useQuery(
    ['regions'],
    async () => {
      const { data, error } = await supabase
        .from('regions')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  );

  const { data: countries = [] } = useQuery(
    ['countries'],
    async () => {
      const { data, error } = await supabase
        .from('countries')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  );

  // ===== MUTATIONS =====
  const createEntityMutation = useMutation(
    async ({ type, data }: { type: 'company' | 'school' | 'branch', data: any }) => {
      const tableName = type === 'company' ? 'companies' : `${type}s`;
      const additionalTableName = `${tableName}_additional`;
      
      // Prepare main data
      const mainFields = type === 'company' 
        ? ['name', 'code', 'description', 'status', 'region_id', 'country_id', 'address', 'notes', 'logo']
        : type === 'school'
        ? ['name', 'code', 'description', 'status', 'company_id', 'address', 'notes', 'logo']
        : ['name', 'code', 'description', 'status', 'school_id', 'address', 'notes'];
      
      const mainData: any = {};
      mainFields.forEach(field => {
        if (data[field] !== undefined) {
          mainData[field] = data[field];
        }
      });
      
      // Create main record
      const { data: entity, error } = await supabase
        .from(tableName)
        .insert([mainData])
        .select()
        .single();
      
      if (error) throw error;
      
      // Create additional record
      const additionalData: any = {
        [`${type}_id`]: entity.id
      };
      
      Object.keys(data).forEach(key => {
        if (!mainFields.includes(key) && data[key] !== undefined) {
          additionalData[key] = data[key];
        }
      });
      
      if (Object.keys(additionalData).length > 1) {
        const { error: additionalError } = await supabase
          .from(additionalTableName)
          .insert([additionalData]);
        
        if (additionalError && additionalError.code !== '23505') {
          console.error('Additional data error:', additionalError);
        }
      }
      
      return entity;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['organization']);
        toast.success(`${modalType} created successfully`);
        setShowCreateModal(false);
        // Clear form data after modal closes
        setTimeout(() => {
          setFormData({});
          setFormErrors({});
          setActiveTab('basic');
        }, 300);
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to create entity');
      }
    }
  );

  const updateEntityMutation = useMutation(
    async ({ type, id, data }: { type: 'company' | 'school' | 'branch', id: string, data: any }) => {
      const tableName = type === 'company' ? 'companies' : `${type}s`;
      const additionalTableName = `${tableName}_additional`;
      
      // Prepare main data
      const mainFields = type === 'company' 
        ? ['name', 'code', 'description', 'status', 'region_id', 'country_id', 'address', 'notes', 'logo']
        : type === 'school'
        ? ['name', 'code', 'description', 'status', 'company_id', 'address', 'notes', 'logo']
        : ['name', 'code', 'description', 'status', 'school_id', 'address', 'notes'];
      
      const mainData: any = {};
      mainFields.forEach(field => {
        if (data[field] !== undefined) {
          mainData[field] = data[field];
        }
      });
      
      // Update main record
      const { error } = await supabase
        .from(tableName)
        .update(mainData)
        .eq('id', id);
      
      if (error) throw error;
      
      // Update or insert additional record
      const additionalData: any = {
        [`${type}_id`]: id
      };
      
      Object.keys(data).forEach(key => {
        if (!mainFields.includes(key) && data[key] !== undefined) {
          additionalData[key] = data[key];
        }
      });
      
      if (Object.keys(additionalData).length > 1) {
        // Try update first
        const { error: updateError } = await supabase
          .from(additionalTableName)
          .update(additionalData)
          .eq(`${type}_id`, id);
        
        // If no rows updated, insert
        if (updateError?.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from(additionalTableName)
            .insert([additionalData]);
          
          if (insertError && insertError.code !== '23505') {
            console.error('Additional insert error:', insertError);
          }
        }
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['organization']);
        toast.success(`${modalType} updated successfully`);
        setShowEditModal(false);
        setEditMode(false);
        // Clear form data after modal closes
        setTimeout(() => {
          setFormData({});
          setFormErrors({});
          setActiveTab('basic');
        }, 300);
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to update entity');
      }
    }
  );

  const createDepartmentMutation = useMutation(
    async (data: any) => {
      const { error } = await supabase
        .from('entity_departments')
        .insert([data]);

      if (error) throw error;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['departments']);
        toast.success('Department created successfully');
        setShowCreateModal(false);
        setFormData({});
        setFormErrors({});
      },
      onError: (error: any) => {
        toast.error(error.message || 'Failed to create department');
      }
    }
  );

  // ===== UI HELPER FUNCTIONS =====
  // ===== UI HELPER FUNCTIONS =====
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

  const handleExpandAll = useCallback(() => {
    if (!companyData) return;
    const allNodes = new Set<string>(['company']);
    companyData.schools?.forEach(school => {
      allNodes.add(school.id);
    });
    setExpandedNodes(allNodes);
  }, [companyData]);

  const handleCollapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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
    setDetailsTab('details');
    setEditMode(false);
  }, []);

  const handleAddClick = useCallback((parentItem: any, parentType: 'company' | 'school') => {
    const newFormData: any = {
      status: 'active',
      ...(parentType === 'company' ? { company_id: parentItem.id } : { school_id: parentItem.id })
    };
    
    // For new companies, inherit region and country from user's company
    if (parentType === 'company' && companyData) {
      newFormData.region_id = companyData.region_id;
      newFormData.country_id = companyData.country_id;
    }
    
    setFormData(newFormData);
    setFormErrors({});
    setModalType(parentType === 'company' ? 'school' : 'branch');
    setActiveTab('basic');
    // Small delay to prevent flickering
    setTimeout(() => {
      setShowCreateModal(true);
    }, 50);
  }, [companyData]);

  const handleEditClick = useCallback((item: any, type: 'company' | 'school' | 'branch') => {
    // Combine main data with additional data
    const combinedData = {
      ...item,
      ...(item.additional || {})
    };
    
    // Ensure region and country are set for companies
    if (type === 'company' && companyData) {
      combinedData.region_id = combinedData.region_id || companyData.region_id;
      combinedData.country_id = combinedData.country_id || companyData.country_id;
    }
    
    setFormData(combinedData);
    setFormErrors({});
    setModalType(type);
    setSelectedItem(item);
    setActiveTab('basic');
    // Small delay to prevent flickering
    setTimeout(() => {
      setShowEditModal(true);
    }, 50);
  }, [companyData]);

  const handleSaveDetails = () => {
    if (selectedType === 'company' && editMode) {
      updateEntityMutation.mutate({
        type: 'company',
        id: selectedItem.id,
        data: formData
      });
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.name) errors.name = 'Name is required';
    if (!formData.code) errors.code = 'Code is required';
    if (!formData.status) errors.status = 'Status is required';
    
    // Email validations
    if (formData.main_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.main_email)) {
      errors.main_email = 'Invalid email address';
    }
    if (formData.ceo_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ceo_email)) {
      errors.ceo_email = 'Invalid email address';
    }
    if (formData.principal_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.principal_email)) {
      errors.principal_email = 'Invalid email address';
    }
    if (formData.branch_head_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.branch_head_email)) {
      errors.branch_head_email = 'Invalid email address';
    }
    
    // URL validation
    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      errors.website = 'URL must start with http:// or https://';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (mode: 'create' | 'edit') => {
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }
    
    if (modalType === 'department') {
      const deptData = {
        ...formData,
        company_id: userCompanyId!,
        school_id: selectedType === 'school' ? selectedItem?.id : undefined,
        branch_id: selectedType === 'branch' ? selectedItem?.id : undefined,
        employee_count: 0,
        status: formData.status || 'active'
      };
      createDepartmentMutation.mutate(deptData);
    } else if (mode === 'create') {
      createEntityMutation.mutate({ type: modalType as 'company' | 'school' | 'branch', data: formData });
    } else {
      updateEntityMutation.mutate({ 
        type: modalType as 'company' | 'school' | 'branch', 
        id: selectedItem.id, 
        data: formData 
      });
    }
  };

  // ===== RENDER FORMS =====
  const renderCompanyForm = () => (
    <>
      {activeTab === 'basic' && (
        <div className="space-y-4">
          <FormField id="name" label="Company Name" required error={formErrors.name}>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Enter company name"
            />
          </FormField>

          <FormField id="code" label="Company Code" required error={formErrors.code}>
            <Input
              id="code"
              value={formData.code || ''}
              onChange={(e) => setFormData({...formData, code: e.target.value})}
              placeholder="e.g., COMP-001"
            />
          </FormField>

          <FormField id="status" label="Status" required error={formErrors.status}>
            <Select
              id="status"
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
              value={formData.status || 'active'}
              onChange={(value) => setFormData({...formData, status: value})}
            />
          </FormField>

          <FormField id="organization_type" label="Organization Type">
            <Select
              id="organization_type"
              options={[
                { value: 'education_group', label: 'Education Group' },
                { value: 'single_institution', label: 'Single Institution' },
                { value: 'franchise', label: 'Franchise' },
                { value: 'partnership', label: 'Partnership' }
              ]}
              value={formData.organization_type || ''}
              onChange={(value) => setFormData({...formData, organization_type: value})}
              placeholder="Select organization type"
            />
          </FormField>

          <FormField id="description" label="Description">
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Enter company description"
              rows={3}
            />
          </FormField>

          <FormField 
            id="region_id" 
            label="Region"
            description="Region is determined by your company assignment and cannot be changed"
          >
            <div className="relative">
              <Select
                id="region_id"
                options={regions.map(r => ({ value: r.id, label: r.name }))}
                value={formData.region_id || ''}
                onChange={() => {}}
                disabled={true}
                placeholder="Region is auto-assigned"
              />
              <div className="absolute inset-0 bg-gray-50/50 dark:bg-gray-900/20 rounded cursor-not-allowed" />
            </div>
          </FormField>

          <FormField 
            id="country_id" 
            label="Country"
            description="Country is determined by your company assignment and cannot be changed"
          >
            <div className="relative">
              <Select
                id="country_id"
                options={countries.map(c => ({ value: c.id, label: c.name }))}
                value={formData.country_id || ''}
                onChange={() => {}}
                disabled={true}
                placeholder="Country is auto-assigned"
              />
              <div className="absolute inset-0 bg-gray-50/50 dark:bg-gray-900/20 rounded cursor-not-allowed" />
            </div>
          </FormField>
        </div>
      )}

      {activeTab === 'additional' && (
        <div className="space-y-4">
          <FormField id="registration_number" label="Registration Number">
            <Input
              id="registration_number"
              value={formData.registration_number || ''}
              onChange={(e) => setFormData({...formData, registration_number: e.target.value})}
              placeholder="Enter registration number"
            />
          </FormField>

          <FormField id="tax_id" label="Tax ID">
            <Input
              id="tax_id"
              value={formData.tax_id || ''}
              onChange={(e) => setFormData({...formData, tax_id: e.target.value})}
              placeholder="Enter tax ID"
            />
          </FormField>

          <FormField id="fiscal_year_start" label="Fiscal Year Start Month">
            <Input
              id="fiscal_year_start"
              type="number"
              min="1"
              max="12"
              value={formData.fiscal_year_start || ''}
              onChange={(e) => setFormData({...formData, fiscal_year_start: parseInt(e.target.value)})}
              placeholder="1-12"
            />
          </FormField>

          <FormField id="head_office_address" label="Head Office Address">
            <Input
              id="head_office_address"
              value={formData.head_office_address || ''}
              onChange={(e) => setFormData({...formData, head_office_address: e.target.value})}
              placeholder="Enter head office address"
            />
          </FormField>

          <FormField id="head_office_city" label="Head Office City">
            <Input
              id="head_office_city"
              value={formData.head_office_city || ''}
              onChange={(e) => setFormData({...formData, head_office_city: e.target.value})}
              placeholder="Enter city"
            />
          </FormField>

          <FormField id="head_office_country" label="Head Office Country">
            <Input
              id="head_office_country"
              value={formData.head_office_country || ''}
              onChange={(e) => setFormData({...formData, head_office_country: e.target.value})}
              placeholder="Enter country"
            />
          </FormField>

          <FormField id="logo_url" label="Logo URL">
            <Input
              id="logo_url"
              type="url"
              value={formData.logo_url || ''}
              onChange={(e) => setFormData({...formData, logo_url: e.target.value})}
              placeholder="https://example.com/logo.png"
            />
          </FormField>

          <FormField id="notes" label="Notes">
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Additional notes"
              rows={3}
            />
          </FormField>
        </div>
      )}

      {activeTab === 'contact' && (
        <div className="space-y-4">
          <FormField id="main_phone" label="Main Phone">
            <Input
              id="main_phone"
              type="tel"
              value={formData.main_phone || ''}
              onChange={(e) => setFormData({...formData, main_phone: e.target.value})}
              placeholder="+1 (555) 123-4567"
            />
          </FormField>

          <FormField id="main_email" label="Main Email" error={formErrors.main_email}>
            <Input
              id="main_email"
              type="email"
              value={formData.main_email || ''}
              onChange={(e) => setFormData({...formData, main_email: e.target.value})}
              placeholder="contact@company.com"
            />
          </FormField>

          <FormField id="website" label="Website" error={formErrors.website}>
            <Input
              id="website"
              type="url"
              value={formData.website || ''}
              onChange={(e) => setFormData({...formData, website: e.target.value})}
              placeholder="https://www.example.com"
            />
          </FormField>

          <FormField id="ceo_name" label="CEO Name">
            <Input
              id="ceo_name"
              value={formData.ceo_name || ''}
              onChange={(e) => setFormData({...formData, ceo_name: e.target.value})}
              placeholder="Enter CEO name"
            />
          </FormField>

          <FormField id="ceo_email" label="CEO Email" error={formErrors.ceo_email}>
            <Input
              id="ceo_email"
              type="email"
              value={formData.ceo_email || ''}
              onChange={(e) => setFormData({...formData, ceo_email: e.target.value})}
              placeholder="ceo@company.com"
            />
          </FormField>

          <FormField id="ceo_phone" label="CEO Phone">
            <Input
              id="ceo_phone"
              type="tel"
              value={formData.ceo_phone || ''}
              onChange={(e) => setFormData({...formData, ceo_phone: e.target.value})}
              placeholder="+1 (555) 123-4567"
            />
          </FormField>
        </div>
      )}
    </>
  );

  const renderSchoolForm = () => (
    <>
      {activeTab === 'basic' && (
        <div className="space-y-4">
          <FormField id="name" label="School Name" required error={formErrors.name}>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Enter school name"
            />
          </FormField>

          <FormField id="code" label="School Code" required error={formErrors.code}>
            <Input
              id="code"
              value={formData.code || ''}
              onChange={(e) => setFormData({...formData, code: e.target.value})}
              placeholder="e.g., SCH-001"
            />
          </FormField>

          <FormField id="status" label="Status" required error={formErrors.status}>
            <Select
              id="status"
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
              value={formData.status || 'active'}
              onChange={(value) => setFormData({...formData, status: value})}
            />
          </FormField>

          <FormField id="school_type" label="School Type">
            <Select
              id="school_type"
              options={[
                { value: 'primary', label: 'Primary School' },
                { value: 'secondary', label: 'Secondary School' },
                { value: 'other', label: 'Other' }
              ]}
              value={formData.school_type || ''}
              onChange={(value) => setFormData({...formData, school_type: value})}
              placeholder="Select school type"
            />
          </FormField>

          <FormField id="description" label="Description">
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Enter school description"
              rows={3}
            />
          </FormField>

          <FormField id="curriculum_type" label="Curriculum Types">
            <div className="space-y-2">
              {['national', 'cambridge', 'ib', 'american', 'other'].map(type => (
                <label key={type} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={(formData.curriculum_type || []).includes(type)}
                    onChange={(e) => {
                      const current = formData.curriculum_type || [];
                      if (e.target.checked) {
                        setFormData({...formData, curriculum_type: [...current, type]});
                      } else {
                        setFormData({...formData, curriculum_type: current.filter((t: string) => t !== type)});
                      }
                    }}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm capitalize">{type}</span>
                </label>
              ))}
            </div>
          </FormField>

          <FormField id="total_capacity" label="Total Capacity">
            <Input
              id="total_capacity"
              type="number"
              value={formData.total_capacity || ''}
              onChange={(e) => setFormData({...formData, total_capacity: parseInt(e.target.value)})}
              placeholder="Maximum student capacity"
            />
          </FormField>

          <FormField id="student_count" label="Current Students">
            <Input
              id="student_count"
              type="number"
              value={formData.student_count || ''}
              onChange={(e) => setFormData({...formData, student_count: parseInt(e.target.value)})}
              placeholder="Current number of students"
            />
          </FormField>
        </div>
      )}

      {activeTab === 'additional' && (
        <div className="space-y-4">
          <FormField id="campus_address" label="Campus Address">
            <Input
              id="campus_address"
              value={formData.campus_address || ''}
              onChange={(e) => setFormData({...formData, campus_address: e.target.value})}
              placeholder="Enter campus address"
            />
          </FormField>

          <FormField id="campus_city" label="Campus City">
            <Input
              id="campus_city"
              value={formData.campus_city || ''}
              onChange={(e) => setFormData({...formData, campus_city: e.target.value})}
              placeholder="Enter city"
            />
          </FormField>

          <FormField id="campus_state" label="Campus State">
            <Input
              id="campus_state"
              value={formData.campus_state || ''}
              onChange={(e) => setFormData({...formData, campus_state: e.target.value})}
              placeholder="Enter state/province"
            />
          </FormField>

          <FormField id="campus_postal_code" label="Postal Code">
            <Input
              id="campus_postal_code"
              value={formData.campus_postal_code || ''}
              onChange={(e) => setFormData({...formData, campus_postal_code: e.target.value})}
              placeholder="Enter postal code"
            />
          </FormField>

          <FormField id="established_date" label="Established Date">
            <Input
              id="established_date"
              type="date"
              value={formData.established_date || ''}
              onChange={(e) => setFormData({...formData, established_date: e.target.value})}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField id="academic_year_start" label="Academic Year Start">
              <Input
                id="academic_year_start"
                type="number"
                min="1"
                max="12"
                value={formData.academic_year_start || ''}
                onChange={(e) => setFormData({...formData, academic_year_start: parseInt(e.target.value)})}
                placeholder="Month (1-12)"
              />
            </FormField>

            <FormField id="academic_year_end" label="Academic Year End">
              <Input
                id="academic_year_end"
                type="number"
                min="1"
                max="12"
                value={formData.academic_year_end || ''}
                onChange={(e) => setFormData({...formData, academic_year_end: parseInt(e.target.value)})}
                placeholder="Month (1-12)"
              />
            </FormField>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Facilities</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.has_library || false}
                  onChange={(e) => setFormData({...formData, has_library: e.target.checked})}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm">Has Library</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.has_laboratory || false}
                  onChange={(e) => setFormData({...formData, has_laboratory: e.target.checked})}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm">Has Laboratory</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.has_sports_facilities || false}
                  onChange={(e) => setFormData({...formData, has_sports_facilities: e.target.checked})}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm">Has Sports Facilities</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.has_cafeteria || false}
                  onChange={(e) => setFormData({...formData, has_cafeteria: e.target.checked})}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm">Has Cafeteria</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'contact' && (
        <div className="space-y-4">
          <FormField id="principal_name" label="Principal Name">
            <Input
              id="principal_name"
              value={formData.principal_name || ''}
              onChange={(e) => setFormData({...formData, principal_name: e.target.value})}
              placeholder="Enter principal name"
            />
          </FormField>

          <FormField id="principal_email" label="Principal Email" error={formErrors.principal_email}>
            <Input
              id="principal_email"
              type="email"
              value={formData.principal_email || ''}
              onChange={(e) => setFormData({...formData, principal_email: e.target.value})}
              placeholder="principal@school.com"
            />
          </FormField>

          <FormField id="principal_phone" label="Principal Phone">
            <Input
              id="principal_phone"
              type="tel"
              value={formData.principal_phone || ''}
              onChange={(e) => setFormData({...formData, principal_phone: e.target.value})}
              placeholder="+1 (555) 123-4567"
            />
          </FormField>

          <FormField id="teachers_count" label="Total Teachers">
            <Input
              id="teachers_count"
              type="number"
              value={formData.teachers_count || ''}
              onChange={(e) => setFormData({...formData, teachers_count: parseInt(e.target.value)})}
              placeholder="Number of teachers"
            />
          </FormField>

          <FormField id="active_teachers_count" label="Active Teachers">
            <Input
              id="active_teachers_count"
              type="number"
              value={formData.active_teachers_count || ''}
              onChange={(e) => setFormData({...formData, active_teachers_count: parseInt(e.target.value)})}
              placeholder="Number of active teachers"
            />
          </FormField>
        </div>
      )}
    </>
  );

  const renderBranchForm = () => (
    <>
      {activeTab === 'basic' && (
        <div className="space-y-4">
          {modalType === 'branch' && !showEditModal && (
            <FormField id="school_id" label="School" required>
              <Select
                id="school_id"
                options={schools.map(s => ({ value: s.id, label: s.name }))}
                value={formData.school_id || ''}
                onChange={(value) => setFormData({...formData, school_id: value})}
                placeholder="Select school"
              />
            </FormField>
          )}

          <FormField id="name" label="Branch Name" required error={formErrors.name}>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Enter branch name"
            />
          </FormField>

          <FormField id="code" label="Branch Code" required error={formErrors.code}>
            <Input
              id="code"
              value={formData.code || ''}
              onChange={(e) => setFormData({...formData, code: e.target.value})}
              placeholder="e.g., BR-001"
            />
          </FormField>

          <FormField id="status" label="Status" required error={formErrors.status}>
            <Select
              id="status"
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
              value={formData.status || 'active'}
              onChange={(value) => setFormData({...formData, status: value})}
            />
          </FormField>

          <FormField id="building_name" label="Building Name">
            <Input
              id="building_name"
              value={formData.building_name || ''}
              onChange={(e) => setFormData({...formData, building_name: e.target.value})}
              placeholder="Enter building name"
            />
          </FormField>

          <FormField id="floor_details" label="Floor Details">
            <Input
              id="floor_details"
              value={formData.floor_details || ''}
              onChange={(e) => setFormData({...formData, floor_details: e.target.value})}
              placeholder="e.g., 2nd Floor, Wing A"
            />
          </FormField>

          <FormField id="description" label="Description">
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Enter branch description"
              rows={3}
            />
          </FormField>
        </div>
      )}

      {activeTab === 'additional' && (
        <div className="space-y-4">
          <FormField id="student_capacity" label="Student Capacity">
            <Input
              id="student_capacity"
              type="number"
              value={formData.student_capacity || ''}
              onChange={(e) => setFormData({...formData, student_capacity: parseInt(e.target.value)})}
              placeholder="Maximum students"
            />
          </FormField>

          <FormField id="current_students" label="Current Students">
            <Input
              id="current_students"
              type="number"
              value={formData.current_students || ''}
              onChange={(e) => setFormData({...formData, current_students: parseInt(e.target.value)})}
              placeholder="Current number of students"
            />
          </FormField>

          <FormField id="teachers_count" label="Teachers Count">
            <Input
              id="teachers_count"
              type="number"
              value={formData.teachers_count || ''}
              onChange={(e) => setFormData({...formData, teachers_count: parseInt(e.target.value)})}
              placeholder="Number of teachers"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField id="opening_time" label="Opening Time">
              <Input
                id="opening_time"
                type="time"
                value={formData.opening_time || ''}
                onChange={(e) => setFormData({...formData, opening_time: e.target.value})}
              />
            </FormField>

            <FormField id="closing_time" label="Closing Time">
              <Input
                id="closing_time"
                type="time"
                value={formData.closing_time || ''}
                onChange={(e) => setFormData({...formData, closing_time: e.target.value})}
              />
            </FormField>
          </div>

          <FormField id="working_days" label="Working Days">
            <div className="space-y-2">
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                <label key={day} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={(formData.working_days || []).includes(day)}
                    onChange={(e) => {
                      const current = formData.working_days || [];
                      if (e.target.checked) {
                        setFormData({...formData, working_days: [...current, day]});
                      } else {
                        setFormData({...formData, working_days: current.filter((d: string) => d !== day)});
                      }
                    }}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm capitalize">{day}</span>
                </label>
              ))}
            </div>
          </FormField>

          <FormField id="address" label="Address">
            <Textarea
              id="address"
              value={formData.address || ''}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              placeholder="Enter branch address"
              rows={3}
            />
          </FormField>

          <FormField id="notes" label="Notes">
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Additional notes"
              rows={3}
            />
          </FormField>
        </div>
      )}

      {activeTab === 'contact' && (
        <div className="space-y-4">
          <FormField id="branch_head_name" label="Branch Head Name">
            <Input
              id="branch_head_name"
              value={formData.branch_head_name || ''}
              onChange={(e) => setFormData({...formData, branch_head_name: e.target.value})}
              placeholder="Enter branch head name"
            />
          </FormField>

          <FormField id="branch_head_email" label="Branch Head Email" error={formErrors.branch_head_email}>
            <Input
              id="branch_head_email"
              type="email"
              value={formData.branch_head_email || ''}
              onChange={(e) => setFormData({...formData, branch_head_email: e.target.value})}
              placeholder="branchhead@school.com"
            />
          </FormField>

          <FormField id="branch_head_phone" label="Branch Head Phone">
            <Input
              id="branch_head_phone"
              type="tel"
              value={formData.branch_head_phone || ''}
              onChange={(e) => setFormData({...formData, branch_head_phone: e.target.value})}
              placeholder="+1 (555) 123-4567"
            />
          </FormField>
        </div>
      )}
    </>
  );

  const renderDepartmentForm = () => (
    <div className="space-y-4">
      <FormField id="name" label="Department Name" required error={formErrors.name}>
        <Input
          id="name"
          value={formData.name || ''}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          placeholder="Enter department name"
        />
      </FormField>

      <FormField id="code" label="Department Code" required error={formErrors.code}>
        <Input
          id="code"
          value={formData.code || ''}
          onChange={(e) => setFormData({...formData, code: e.target.value})}
          placeholder="e.g., DEPT-001"
        />
      </FormField>

      <FormField id="department_type" label="Department Type">
        <Select
          id="department_type"
          options={[
            { value: 'academic', label: 'Academic' },
            { value: 'administrative', label: 'Administrative' },
            { value: 'support', label: 'Support' },
            { value: 'operations', label: 'Operations' }
          ]}
          value={formData.department_type || ''}
          onChange={(value) => setFormData({...formData, department_type: value})}
          placeholder="Select department type"
        />
      </FormField>

      <FormField id="head_of_department" label="Head of Department">
        <Input
          id="head_of_department"
          value={formData.head_of_department || ''}
          onChange={(e) => setFormData({...formData, head_of_department: e.target.value})}
          placeholder="Enter department head name"
        />
      </FormField>

      <FormField id="head_email" label="Head Email">
        <Input
          id="head_email"
          type="email"
          value={formData.head_email || ''}
          onChange={(e) => setFormData({...formData, head_email: e.target.value})}
          placeholder="head@department.com"
        />
      </FormField>

      <FormField id="status" label="Status" required error={formErrors.status}>
        <Select
          id="status"
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' }
          ]}
          value={formData.status || 'active'}
          onChange={(value) => setFormData({...formData, status: value})}
        />
      </FormField>
    </div>
  );

  const renderForm = () => {
    if (modalType === 'company') return renderCompanyForm();
    if (modalType === 'school') return renderSchoolForm();
    if (modalType === 'branch') return renderBranchForm();
    if (modalType === 'department') return renderDepartmentForm();
    return null;
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
        <div className="relative">
          <OrgChartNode 
            item={companyData} 
            type="company" 
            isRoot={true}
            onItemClick={handleItemClick}
            onAddClick={handleAddClick}
            onEditClick={handleEditClick}
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

        {showSchools && companyData.schools && companyData.schools.length > 0 && (
          <>
            <div className="w-0.5 h-16 bg-gradient-to-b from-gray-300 to-gray-200 dark:from-gray-600 dark:to-gray-700"></div>
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
                        onEditClick={handleEditClick}
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
                                onEditClick={handleEditClick}
                              />
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-full mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Organization Structure
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage your organization hierarchy and structure
              </p>
            </div>
            <Button
              onClick={() => {
                setFormData({ status: 'active' });
                setFormErrors({});
                setModalType('company');
                setShowCreateModal(true);
                setActiveTab('basic');
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Company
            </Button>
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 relative">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Organization Structure
                </h2>
                
                {/* View Mode Toggle */}
                <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('expand')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      viewMode === 'expand'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <ChevronRight className="w-4 h-4 inline-block mr-1" />
                    Expand
                  </button>
                  <button
                    onClick={() => setViewMode('colleagues')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      viewMode === 'colleagues'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <Users className="w-4 h-4 inline-block mr-1" />
                    Colleagues
                  </button>
                </div>
              </div>
              
              {viewMode === 'expand' && (
                <div className="flex items-center gap-2">
                  {/* Show/Hide Controls */}
                  <div className="flex items-center gap-2 mr-4">
                    <button
                      onClick={() => setExpandedNodes(new Set())}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                        expandedNodes.size === 0
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      }`}
                    >
                      Entity
                    </button>
                    <button
                      onClick={() => setExpandedNodes(new Set(['company']))}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                        expandedNodes.has('company') && !Array.from(expandedNodes).some(id => id !== 'company')
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                      }`}
                    >
                      Schools
                    </button>
                    <button
                      onClick={handleExpandAll}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                        companyData?.schools?.every(s => expandedNodes.has(s.id))
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                          : 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                      }`}
                    >
                      Branches
                    </button>
                    
                    <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
                    
                    <button onClick={handleExpandAll} className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                      <ChevronDown className="w-3 h-3 inline mr-1" />
                      Expand All
                    </button>
                    <button onClick={handleCollapseAll} className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                      <ChevronUp className="w-3 h-3 inline mr-1" />
                      Collapse All
                    </button>
                  </div>
                  
                  {/* Zoom Controls */}
                  <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                    <button
                      onClick={handleZoomOut}
                      disabled={zoomLevel <= MIN_ZOOM}
                      className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={handleZoomReset}
                      className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-600 rounded transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={handleFitToScreen}
                      className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-600 rounded transition-colors"
                    >
                      <ScanLine className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={toggleFullscreen}
                      className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-600 rounded transition-colors"
                    >
                      {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Fullscreen className="w-4 h-4" />}
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
        </div>
      </div>

      {/* Details Panel */}
      {showDetailsPanel && selectedItem && (
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
                  onClick={() => setDetailsTab('details')}
                  className={`pb-2 px-1 ${detailsTab === 'details' 
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                >
                  Details
                </button>
                <button
                  onClick={() => setDetailsTab('departments')}
                  className={`pb-2 px-1 ${detailsTab === 'departments' 
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                >
                  Departments
                </button>
                {selectedType === 'school' && (
                  <button
                    onClick={() => setDetailsTab('academic')}
                    className={`pb-2 px-1 ${detailsTab === 'academic' 
                      ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                  >
                    Academic Years
                  </button>
                )}
              </div>
            </div>
            
            <div className="p-6">
              {detailsTab === 'details' && (
                <div className="space-y-4">
                  {!editMode ? (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Name</label>
                        <p className="text-gray-900 dark:text-white font-medium">{selectedItem.name}</p>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Code</label>
                        <p className="text-gray-900 dark:text-white font-mono text-sm">{selectedItem.code}</p>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
                        <StatusBadge status={selectedItem.status} size="md" />
                      </div>
                      
                      {selectedItem.description && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
                          <p className="text-gray-700 dark:text-gray-300 text-sm">{selectedItem.description}</p>
                        </div>
                      )}
                      
                      {selectedType === 'company' && (
                        <Button onClick={() => {
                          setEditMode(true);
                          setFormData(selectedItem.additional || {});
                        }} className="w-full">
                          <Edit className="w-4 h-4 mr-2" />
                          Quick Edit Additional Info
                        </Button>
                      )}
                      
                      <Button onClick={() => handleEditClick(selectedItem, selectedType!)} variant="outline" className="w-full">
                        <Edit2 className="w-4 h-4 mr-2" />
                        Full Edit
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <FormField id="ceo_name" label="CEO Name">
                        <Input
                          id="ceo_name"
                          value={formData.ceo_name || ''}
                          onChange={(e) => setFormData({...formData, ceo_name: e.target.value})}
                        />
                      </FormField>
                      <FormField id="ceo_email" label="CEO Email">
                        <Input
                          id="ceo_email"
                          type="email"
                          value={formData.ceo_email || ''}
                          onChange={(e) => setFormData({...formData, ceo_email: e.target.value})}
                        />
                      </FormField>
                      <FormField id="ceo_phone" label="CEO Phone">
                        <Input
                          id="ceo_phone"
                          type="tel"
                          value={formData.ceo_phone || ''}
                          onChange={(e) => setFormData({...formData, ceo_phone: e.target.value})}
                        />
                      </FormField>
                      <div className="flex space-x-3">
                        <Button variant="outline" onClick={() => {
                          setEditMode(false);
                          setFormData(selectedItem.additional || {});
                        }} className="flex-1">
                          Cancel
                        </Button>
                        <Button onClick={handleSaveDetails} className="flex-1">
                          <Save className="w-4 h-4 mr-2" />
                          Save
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {detailsTab === 'departments' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Departments</h3>
                    <button
                      onClick={() => {
                        setModalType('department');
                        setFormData({
                          status: 'active',
                          company_id: userCompanyId!,
                          school_id: selectedType === 'school' ? selectedItem?.id : undefined,
                          branch_id: selectedType === 'branch' ? selectedItem?.id : undefined
                        });
                        setShowCreateModal(true);
                      }}
                      className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {departments && departments.length > 0 ? (
                      departments.map((dept: any) => (
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
                        <p className="text-gray-500 dark:text-gray-400">No departments found</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {detailsTab === 'academic' && selectedType === 'school' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Academic Years</h3>
                    <button className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {academicYears && academicYears.length > 0 ? (
                      academicYears.map((year: any) => (
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
                        <p className="text-gray-500 dark:text-gray-400">No academic years found</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Create Modal */}
      <SlideInForm
        title={`Create ${modalType === 'company' ? 'Company' : modalType === 'school' ? 'School' : 'Branch'}`}
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setFormData({});
          setFormErrors({});
        }}
        onSave={() => handleSubmit('create')}
      >
        <div className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex space-x-4 border-b dark:border-gray-700">
            <button
              onClick={() => setActiveTab('basic')}
              className={`pb-2 px-1 ${activeTab === 'basic' 
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'text-gray-600 dark:text-gray-400'}`}
            >
              Basic Info
            </button>
            <button
              onClick={() => setActiveTab('additional')}
              className={`pb-2 px-1 ${activeTab === 'additional' 
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'text-gray-600 dark:text-gray-400'}`}
            >
              Additional
            </button>
            <button
              onClick={() => setActiveTab('contact')}
              className={`pb-2 px-1 ${activeTab === 'contact' 
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'text-gray-600 dark:text-gray-400'}`}
            >
              Contact
            </button>
          </div>

          {/* Form Content */}
          <div className="mt-4">
            {renderForm()}
          </div>
        </div>
      </SlideInForm>

      {/* Edit Modal */}
      <SlideInForm
        title={`Edit ${modalType === 'company' ? 'Company' : modalType === 'school' ? 'School' : 'Branch'}`}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setFormData({});
          setFormErrors({});
        }}
        onSave={() => handleSubmit('edit')}
      >
        <div className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex space-x-4 border-b dark:border-gray-700">
            <button
              onClick={() => setActiveTab('basic')}
              className={`pb-2 px-1 ${activeTab === 'basic' 
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'text-gray-600 dark:text-gray-400'}`}
            >
              Basic Info
            </button>
            <button
              onClick={() => setActiveTab('additional')}
              className={`pb-2 px-1 ${activeTab === 'additional' 
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'text-gray-600 dark:text-gray-400'}`}
            >
              Additional
            </button>
            <button
              onClick={() => setActiveTab('contact')}
              className={`pb-2 px-1 ${activeTab === 'contact' 
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'text-gray-600 dark:text-gray-400'}`}
            >
              Contact
            </button>
          </div>

          {/* Form Content */}
          <div className="mt-4">
            {renderForm()}
          </div>
        </div>
      </SlideInForm>
    </div>
  );
}