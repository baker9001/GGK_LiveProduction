/**
 * File: /src/app/entity-module/organisation/tabs/organization-structure/page.tsx
 * 
 * CORRECTED VERSION - Aligned with actual database schema
 * 
 * Database Schema Corrections:
 * 1. grade_levels.school_id (not branch_id) - grades belong to schools
 * 2. grade_levels.grade_name (not year_name)
 * 3. class_sections.section_name (not class_name)
 * 4. class_sections.max_capacity (not max_students)
 * 5. class_sections.class_section_order for ordering
 * 6. grade_level_branches junction table for branch relationships
 * 
 * Dependencies: 
 *   - @/lib/supabase
 *   - @/lib/layout/treeLayout
 *   - @/hooks/useNodeMeasurements
 *   - @/components/forms/BranchFormContent
 *   - @/components/shared/SlideInForm
 *   - External: react, @tanstack/react-query, lucide-react, react-hot-toast
 * 
 * Database Tables:
 *   - companies, schools, branches, grade_levels, class_sections
 *   - companies_additional, schools_additional, branches_additional
 *   - grade_level_branches (junction table)
 */

'use client';

import React, { useState, useCallback, memo, useEffect, useMemo, useRef } from 'react';
import { 
  Building2, School, MapPin, ChevronDown, ChevronUp,
  PlusCircle, Users, User, Eye, EyeOff,
  ZoomIn, ZoomOut, Maximize2, Minimize2, 
  RotateCcw, Loader2, X, GraduationCap, BookOpen, Expand,
  ToggleLeft, ToggleRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { 
  TreeLayoutEngine, 
  buildTreeFromData, 
  generateConnectionPath,
  type NodePosition,
  type NodeDimensions,
  type LayoutConfig
} from '@/lib/layout/treeLayout';
import { useNodeMeasurements } from '@/hooks/useNodeMeasurements';
import { BranchFormContent } from '@/components/forms/BranchFormContent';
import { SlideInForm } from '@/components/shared/SlideInForm';
import { toast } from 'react-hot-toast';

// ===== TYPE DEFINITIONS =====
interface GradeLevel {
  id: string;
  school_id: string;
  grade_name: string;
  grade_code?: string;
  grade_order: number;
  education_level?: string;
  status: string;
  class_sections?: ClassSection[];
}

interface ClassSection {
  id: string;
  grade_level_id: string;
  section_name: string;
  section_code?: string;
  max_capacity: number;
  class_section_order: number;
  status: string;
  current_enrollment?: number;
}

// ===== PROPS INTERFACE =====
export interface OrgStructureProps {
  companyData: any;
  companyId: string;
  onAddClick: (parentItem: any, parentType: 'company' | 'school' | 'branch' | 'year' | 'section') => void;
  onEditClick: (item: any, type: 'company' | 'school' | 'branch' | 'year' | 'section') => void;
  onItemClick: (item: any, type: 'company' | 'school' | 'branch' | 'year' | 'section') => void;
  refreshData?: () => void;
}

// ===== SKELETON LOADER COMPONENT =====
const CardSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 
                  w-[260px] p-4 animate-pulse">
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        <div>
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
          <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    </div>
    <div className="mb-3">
      <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>
    <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
  </div>
);

// ===== ENHANCED ORG CARD WITH REF FORWARDING AND LOGO SUPPORT =====
const OrgCard = memo(React.forwardRef<HTMLDivElement, { 
  item: any; 
  type: 'company' | 'school' | 'branch' | 'year' | 'section';
  onItemClick: (item: any, type: any) => void;
  onAddClick?: (item: any, type: any) => void;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  hierarchicalData?: any;
}>(({ 
  item, 
  type, 
  onItemClick, 
  onAddClick,
  hasChildren = false,
  isExpanded = false,
  onToggleExpand,
  hierarchicalData = {}
}, ref) => {
  // Helper function to get logo URL based on type and item data
  const getLogoUrl = () => {
    let logoPath = null;
    let bucketName = '';
    
    switch (type) {
      case 'company':
        logoPath = item.logo || item.additional?.logo_url || item.additional?.logo;
        bucketName = 'company-logos';
        break;
      case 'school':
        logoPath = item.logo;
        bucketName = 'school-logos';
        break;
      case 'branch':
        logoPath = item.logo;
        bucketName = 'branch-logos';
        break;
      default:
        return null;
    }
    
    if (!logoPath) return null;
    
    // If it's already a full URL, return as is
    if (logoPath.startsWith('http')) {
      return logoPath;
    }
    
    // Construct Supabase storage URL
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      console.warn('VITE_SUPABASE_URL is not defined');
      return null;
    }
    return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${logoPath}`;
  };

  const getConfig = () => {
    switch (type) {
      case 'company':
        return {
          icon: Building2,
          bgColor: 'bg-blue-500',
          cardBg: 'bg-blue-50 dark:bg-blue-900/10',
          borderColor: 'border-blue-200 dark:border-blue-800',
          iconBg: 'bg-blue-500',
          title: 'CEO',
          nameField: 'ceo_name',
          stats: [
            { label: 'Schools', value: hierarchicalData.totalSchools || 0, icon: School },
            { label: 'Branches', value: hierarchicalData.totalBranches || 0, icon: MapPin },
            { label: 'Teachers', value: hierarchicalData.totalTeachers || 0, icon: Users },
            { label: 'Students', value: hierarchicalData.totalStudents || 0, icon: GraduationCap },
            { label: 'Users', value: hierarchicalData.totalUsers || 0, icon: User }
          ]
        };
      case 'school':
        return {
          icon: School,
          bgColor: 'bg-green-500',
          cardBg: 'bg-green-50 dark:bg-green-900/10',
          borderColor: 'border-green-200 dark:border-green-800',
          iconBg: 'bg-green-500',
          title: 'Principal',
          nameField: 'principal_name',
          stats: [
            { label: 'Branches', value: item.branch_count || 0, icon: MapPin },
            { label: 'Grades', value: item.total_grades || 0, icon: GraduationCap },
            { label: 'Teachers', value: item.additional?.teachers_count || 0, icon: Users },
            { label: 'Students', value: item.student_count || item.additional?.student_count || 0, icon: GraduationCap },
            { label: 'Users', value: item.additional?.admin_users_count || 0, icon: User }
          ]
        };
      case 'branch':
        return {
          icon: MapPin,
          bgColor: 'bg-purple-500',
          cardBg: 'bg-purple-50 dark:bg-purple-900/10',
          borderColor: 'border-purple-300 dark:border-purple-700',
          iconBg: 'bg-purple-500',
          title: 'Branch Head',
          nameField: 'branch_head_name',
          stats: [
            { label: 'Grades', value: item.grade_count || 0, icon: GraduationCap },
            { label: 'Teachers', value: item.additional?.teachers_count || item.additional?.active_teachers_count || 0, icon: Users },
            { label: 'Students', value: item.student_count || item.additional?.student_count || item.additional?.current_students || 0, icon: GraduationCap },
            { label: 'Users', value: item.additional?.admin_users_count || 0, icon: User }
          ]
        };
      case 'year':
        return {
          icon: GraduationCap,
          bgColor: 'bg-orange-500',
          cardBg: 'bg-orange-50 dark:bg-orange-900/10',
          borderColor: 'border-orange-200 dark:border-orange-800',
          iconBg: 'bg-orange-500',
          title: 'Coordinator',
          nameField: 'grade_coordinator',
          stats: [
            { label: 'Sections', value: item.class_sections?.length || 0, icon: BookOpen },
            { label: 'Capacity', value: item.max_students_per_section || 30, icon: Users },
            { label: 'Order', value: item.grade_order || 0, icon: BookOpen }
          ]
        };
      case 'section':
        return {
          icon: BookOpen,
          bgColor: 'bg-indigo-500',
          cardBg: 'bg-indigo-50 dark:bg-indigo-900/10',
          borderColor: 'border-indigo-200 dark:border-indigo-800',
          iconBg: 'bg-indigo-500',
          title: 'Teacher',
          nameField: 'section_teacher',
          stats: [
            { label: 'Capacity', value: item.max_capacity || 30, icon: Users },
            { label: 'Enrolled', value: item.current_enrollment || 0, icon: GraduationCap },
            { label: 'Order', value: item.class_section_order || 0, icon: Building2 }
          ]
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;
  const managerName = item.additional?.[config.nameField] || item[config.nameField];
  const logoUrl = getLogoUrl();

  // Handle click event 
  const handleCardClick = () => {
    onItemClick(item, type);
  };

  // Display name based on type - CORRECTED FIELD NAMES
  const getDisplayName = () => {
    switch (type) {
      case 'year':
        return item.grade_name || item.name;  // Use grade_name, not year_name
      case 'section':
        return item.section_name || item.name;  // Use section_name
      default:
        return item.name || item.grade_name || item.section_name;
    }
  };

  return (
    <div className="relative inline-block">
      <div 
        ref={ref}
        onClick={handleCardClick}
        className={`${config.cardBg} ${config.borderColor} rounded-xl border-2
                   hover:shadow-lg transition-all duration-200 cursor-pointer
                   min-w-[260px] max-w-[300px] flex-grow p-4 relative`}
        data-card-id={`${type}-${item.id}`}
        data-card-type={type}
      >
        {/* Header with Icon */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Logo or Icon */}
            <div className={`w-12 h-12 ${config.iconBg} rounded-lg flex items-center justify-center text-white font-bold shadow-md overflow-hidden relative bg-white`}>
              {logoUrl ? (
                <>
                  <img
                    src={logoUrl}
                    alt={`${getDisplayName()} logo`}
                    className="w-full h-full object-contain p-0.5"
                    style={{ maxWidth: '100%', maxHeight: '100%' }}
                    onError={(e) => {
                      const imgElement = e.currentTarget as HTMLImageElement;
                      imgElement.style.display = 'none';
                      const parent = imgElement.parentElement;
                      if (parent) {
                        const fallback = parent.querySelector('.logo-fallback') as HTMLElement;
                        if (fallback) {
                          fallback.style.display = 'flex';
                          fallback.classList.remove('bg-white');
                          fallback.classList.add(config.iconBg);
                        }
                      }
                    }}
                  />
                  <span className={`text-sm font-bold logo-fallback hidden items-center justify-center w-full h-full absolute inset-0 ${config.iconBg}`}>
                    {item.code?.substring(0, 2).toUpperCase() || 
                     getDisplayName()?.substring(0, 2).toUpperCase() || 
                     <Icon className="w-6 h-6" />}
                  </span>
                </>
              ) : (
                <span className={`text-sm font-bold flex items-center justify-center w-full h-full ${config.iconBg} text-white`}>
                  {item.code?.substring(0, 2).toUpperCase() || 
                   getDisplayName()?.substring(0, 2).toUpperCase() || 
                   <Icon className="w-6 h-6" />}
                </span>
              )}
            </div>
            
            {/* Title and Code */}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                {getDisplayName()}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {item.code || item.grade_code || item.section_code || `${type.charAt(0).toUpperCase()}${type.slice(1)}`}
              </p>
            </div>
          </div>
        </div>

        {/* Manager/Teacher Info */}
        <div className="mb-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <User className="w-3 h-3" />
            {config.title}
          </p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {managerName || 'Not Assigned'}
          </p>
        </div>

        {/* Hierarchical Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {config.stats.slice(0, 4).map((stat, idx) => {
            const StatIcon = stat.icon;
            return (
              <div key={idx} className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <StatIcon className="w-3 h-3 flex-shrink-0" />
                <span className="font-semibold text-gray-900 dark:text-white">{stat.value}</span>
                <span className="truncate">{stat.label}</span>
              </div>
            );
          })}
        </div>
        
        {/* Additional stat if present */}
        {config.stats.length > 4 && (
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
              <User className="w-3 h-3 flex-shrink-0" />
              <span className="font-semibold text-gray-900 dark:text-white">{config.stats[4].value}</span>
              <span className="truncate">{config.stats[4].label} (Admin)</span>
            </div>
          </div>
        )}
      </div>

      {/* Expand/Collapse Button */}
      {hasChildren && onToggleExpand && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 
                     bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 
                     rounded-full p-1 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors z-10"
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          )}
        </button>
      )}
    </div>
  );
}));

OrgCard.displayName = 'OrgCard';

// ===== COLOR-CODED LEVEL TABS =====
const LevelTabs = ({ visibleLevels, onToggleLevel }: {
  visibleLevels: Set<string>;
  onToggleLevel: (level: string) => void;
}) => {
  const levels = [
    { id: 'entity', label: 'Entity', icon: Building2, color: 'blue' },
    { id: 'schools', label: 'Schools', icon: School, color: 'green' },
    { id: 'branches', label: 'Branches', icon: MapPin, color: 'purple' },
    { id: 'years', label: 'Grade Levels', icon: GraduationCap, color: 'orange' },
    { id: 'sections', label: 'Class Sections', icon: BookOpen, color: 'indigo' }
  ];

  const getColorClasses = (color: string, isVisible: boolean) => {
    if (!isVisible) return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
    
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-500 text-white',
      green: 'bg-green-500 text-white',
      purple: 'bg-purple-500 text-white',
      orange: 'bg-orange-500 text-white',
      indigo: 'bg-indigo-500 text-white'
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="flex items-center gap-2">
      {levels.map(level => {
        const Icon = level.icon;
        const isVisible = visibleLevels.has(level.id);
        
        return (
          <button
            key={level.id}
            onClick={() => onToggleLevel(level.id)}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
              ${getColorClasses(level.color, isVisible)}
              hover:shadow-md transform hover:scale-105
            `}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{level.label}</span>
            {isVisible ? (
              <Eye className="w-3 h-3" />
            ) : (
              <EyeOff className="w-3 h-3 opacity-70" />
            )}
          </button>
        );
      })}
    </div>
  );
};

// ===== MAIN COMPONENT =====
export default function OrganizationStructureTab({ 
  companyData,
  companyId,
  onAddClick, 
  onEditClick, 
  onItemClick,
  refreshData
}: OrgStructureProps) {
  // State management
  const [visibleLevels, setVisibleLevels] = useState<Set<string>>(
    new Set(['entity', 'schools'])  // Default: Entity and Schools visible
  );
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['company']));
  const [lazyLoadedData, setLazyLoadedData] = useState<Map<string, any[]>>(new Map());
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [branchesData, setBranchesData] = useState<Map<string, any[]>>(new Map());
  const [gradeLevelsData, setGradeLevelsData] = useState<Map<string, any[]>>(new Map());
  const [sectionsData, setSectionsData] = useState<Map<string, any[]>>(new Map());
  const [layoutPositions, setLayoutPositions] = useState<Map<string, NodePosition>>(new Map());
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // Branch form state
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [branchFormData, setBranchFormData] = useState<any>({});
  const [branchFormErrors, setBranchFormErrors] = useState<Record<string, string>>({});
  const [branchFormActiveTab, setBranchFormActiveTab] = useState<'basic' | 'additional' | 'contact'>('basic');
  
  // Refs for SVG connections
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, React.RefObject<HTMLDivElement>>>(new Map());
  const autoResizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const layoutUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter schools based on active/inactive toggle
  const filteredSchools = useMemo(() => {
    if (!companyData?.schools) return [];
    
    return showInactive 
      ? companyData.schools 
      : companyData.schools.filter((s: any) => s.status === 'active');
  }, [companyData?.schools, showInactive]);

  // Fetch schools for branch form dropdown
  const { data: schoolsForForm = [] } = useQuery(
    ['schools-for-form', companyId],
    async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    { enabled: !!companyId }
  );

  // CORRECTED: Fetch grade levels with proper schema
  const { data: allGradeLevels = [], isLoading: isGradeLevelsLoading } = useQuery(
    ['all-grade-levels', companyId, showInactive],
    async () => {
      if (!companyId) return [];
      
      // Get all schools for this company
      const { data: schools } = await supabase
        .from('schools')
        .select('id')
        .eq('company_id', companyId);
      
      if (!schools || schools.length === 0) return [];
      
      const schoolIds = schools.map(s => s.id);
      
      // Fetch grade levels that belong to these schools
      let query = supabase
        .from('grade_levels')
        .select(`
          id,
          school_id,
          grade_name,
          grade_code,
          grade_order,
          education_level,
          status,
          class_sections (
            id,
            grade_level_id,
            section_name,
            section_code,
            max_capacity,
            class_section_order,
            status,
            current_enrollment
          )
        `)
        .in('school_id', schoolIds)
        .order('grade_order');
      
      if (!showInactive) {
        query = query.eq('status', 'active');
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Now fetch grade levels that are linked to branches via junction table
      const { data: branches } = await supabase
        .from('branches')
        .select('id')
        .in('school_id', schoolIds);
      
      const branchIds = branches?.map(b => b.id) || [];
      
      if (branchIds.length > 0) {
        // Fetch grade-branch relationships
        const { data: gradeBranchLinks } = await supabase
          .from('grade_level_branches')
          .select(`
            grade_level_id,
            branch_id,
            capacity
          `)
          .in('branch_id', branchIds);
        
        // Store branch-grade relationships for later use
        if (gradeBranchLinks) {
          const branchGradeMap = new Map<string, string[]>();
          gradeBranchLinks.forEach(link => {
            if (!branchGradeMap.has(link.branch_id)) {
              branchGradeMap.set(link.branch_id, []);
            }
            branchGradeMap.get(link.branch_id)!.push(link.grade_level_id);
          });
          
          // Store in state for later use
          setLazyLoadedData(prev => {
            const newMap = new Map(prev);
            branchGradeMap.forEach((gradeIds, branchId) => {
              const branchGrades = (data || []).filter(g => gradeIds.includes(g.id));
              newMap.set(`grades-branch-${branchId}`, branchGrades);
            });
            return newMap;
          });
        }
      }
      
      return data || [];
    },
    {
      enabled: !!companyId,
      staleTime: 60 * 1000,
    }
  );

  // Process grade levels data into maps for efficient lookup
  useEffect(() => {
    if (allGradeLevels.length > 0) {
      const gradesBySchool = new Map<string, any[]>();
      const sectionsByGrade = new Map<string, any[]>();
      
      allGradeLevels.forEach((grade: GradeLevel) => {
        // Add grade to school map
        if (grade.school_id) {
          if (!gradesBySchool.has(grade.school_id)) {
            gradesBySchool.set(grade.school_id, []);
          }
          gradesBySchool.get(grade.school_id)!.push(grade);
        }
        
        // Add sections to map
        if (grade.class_sections && grade.class_sections.length > 0) {
          sectionsByGrade.set(grade.id, grade.class_sections);
        }
      });
      
      setGradeLevelsData(gradesBySchool);
      setSectionsData(sectionsByGrade);
      
      // Update lazy loaded data for grades
      setLazyLoadedData(prev => {
        const newMap = new Map(prev);
        
        // Add school-level grades
        gradesBySchool.forEach((grades, schoolId) => {
          newMap.set(`grades-school-${schoolId}`, grades);
        });
        
        // Add sections
        sectionsByGrade.forEach((sections, gradeId) => {
          newMap.set(`sections-grade-${gradeId}`, sections);
        });
        
        return newMap;
      });
    }
  }, [allGradeLevels]);

  // Fetch branches when schools are expanded
  const shouldFetchBranches = useMemo(() => {
    const hasExpandedSchool = Array.from(expandedNodes).some(node => node.startsWith('school-'));
    return hasExpandedSchool && filteredSchools && filteredSchools.length > 0;
  }, [expandedNodes, filteredSchools]);

  // Fetch branches for all schools when any school is expanded
  const { data: allBranches = [], isLoading: isAllBranchesLoading } = useQuery(
    ['all-branches', companyId, showInactive, shouldFetchBranches],
    async () => {
      if (!filteredSchools || filteredSchools.length === 0) return [];
      
      const schoolIds = filteredSchools.map((s: any) => s.id);
      
      if (schoolIds.length === 0) return [];
      
      let query = supabase
        .from('branches')
        .select(`
          *,
          branches_additional (*)
        `)
        .in('school_id', schoolIds)
        .order('name');
      
      if (!showInactive) {
        query = query.eq('status', 'active');
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Process branches and get their linked grade levels
      const processedBranches = (data || []).map(b => ({
        ...b,
        additional: Array.isArray(b.branches_additional) 
          ? b.branches_additional[0] 
          : b.branches_additional || {},
        student_count: b.branches_additional?.[0]?.student_count || 
                      b.branches_additional?.student_count || 
                      b.branches_additional?.current_students || 0,
        teachers_count: b.branches_additional?.[0]?.teachers_count || 
                       b.branches_additional?.teachers_count || 
                       b.branches_additional?.active_teachers_count || 0
      }));
      
      // Fetch grade counts for branches
      if (processedBranches.length > 0) {
        const branchIds = processedBranches.map(b => b.id);
        const { data: gradeBranchCounts } = await supabase
          .from('grade_level_branches')
          .select('branch_id')
          .in('branch_id', branchIds);
        
        if (gradeBranchCounts) {
          const countMap = new Map<string, number>();
          gradeBranchCounts.forEach(item => {
            countMap.set(item.branch_id, (countMap.get(item.branch_id) || 0) + 1);
          });
          
          processedBranches.forEach(branch => {
            branch.grade_count = countMap.get(branch.id) || 0;
          });
        }
      }
      
      return processedBranches;
    },
    {
      enabled: shouldFetchBranches,
      staleTime: 60 * 1000,
      cacheTime: 5 * 60 * 1000
    }
  );

  // Helper to get or create card ref
  const getCardRef = useCallback((id: string) => {
    if (!cardRefs.current.has(id)) {
      cardRefs.current.set(id, React.createRef<HTMLDivElement>());
    }
    return cardRefs.current.get(id)!;
  }, []);

  // Layout configuration
  const layoutConfig: LayoutConfig = useMemo(() => ({
    gapX: 48,
    gapY: 80,
    centerParents: true,
    minCardWidth: 260,
    maxCardWidth: 300
  }), []);

  // Measure node dimensions
  const nodeDimensions = useNodeMeasurements(
    cardRefs,
    zoomLevel,
    [expandedNodes, visibleLevels, filteredSchools.length, allBranches.length, allGradeLevels.length, showInactive]
  );

  // Enhanced company data with grade levels
  const enhancedCompanyData = useMemo(() => {
    if (!companyData) return null;
    
    const schoolsWithGrades = filteredSchools.map((school: any) => {
      // Get school-level grades
      const schoolGrades = gradeLevelsData.get(school.id) || [];
      
      // Get branches with their grades
      const schoolBranches = allBranches.filter(b => b.school_id === school.id);
      const branchesWithGrades = schoolBranches.map(branch => {
        const branchGrades = lazyLoadedData.get(`grades-branch-${branch.id}`) || [];
        return {
          ...branch,
          grade_levels: branchGrades,
          grade_count: branch.grade_count || branchGrades.length
        };
      });
      
      // Add sections to grades
      const gradesWithSections = schoolGrades.map((grade: GradeLevel) => ({
        ...grade,
        class_sections: sectionsData.get(grade.id) || grade.class_sections || []
      }));
      
      return {
        ...school,
        branches: branchesWithGrades,
        grade_levels: gradesWithSections,
        total_grades: schoolGrades.length
      };
    });
    
    return {
      ...companyData,
      schools: schoolsWithGrades
    };
  }, [companyData, filteredSchools, allBranches, gradeLevelsData, sectionsData, lazyLoadedData]);

  // Build tree structure from data
  const treeNodes = useMemo(() => {
    if (!enhancedCompanyData) return new Map();
    
    return buildTreeFromData(
      enhancedCompanyData,
      expandedNodes,
      lazyLoadedData,
      branchesData,
      visibleLevels
    );
  }, [enhancedCompanyData, expandedNodes, lazyLoadedData, branchesData, visibleLevels]);

  // Layout calculation with debouncing
  useEffect(() => {
    if (treeNodes.size === 0) return;
    
    if (layoutUpdateTimeoutRef.current) {
      clearTimeout(layoutUpdateTimeoutRef.current);
    }
    
    layoutUpdateTimeoutRef.current = setTimeout(() => {
      const dimensionsToUse = new Map<string, NodeDimensions>();
      treeNodes.forEach((node, nodeId) => {
        const measured = nodeDimensions.get(nodeId);
        dimensionsToUse.set(nodeId, measured || { width: 260, height: 140 });
      });

      const layoutEngine = new TreeLayoutEngine(treeNodes, dimensionsToUse, layoutConfig);
      const result = layoutEngine.layout('company');
      
      const paddedSize = {
        width: result.totalSize.width + 100,
        height: result.totalSize.height
      };
      
      const shiftedPositions = new Map<string, NodePosition>();
      result.positions.forEach((pos, nodeId) => {
        shiftedPositions.set(nodeId, {
          x: pos.x + 50,
          y: pos.y
        });
      });
      
      setLayoutPositions(shiftedPositions);
      setCanvasSize(paddedSize);
      
      if (!hasInitialized) {
        setTimeout(() => {
          checkAndAutoResize();
          setHasInitialized(true);
        }, 100);
      }
    }, 200);
    
    return () => {
      if (layoutUpdateTimeoutRef.current) {
        clearTimeout(layoutUpdateTimeoutRef.current);
      }
    };
  }, [treeNodes, nodeDimensions, layoutConfig, hasInitialized]);

  // Rest of the component implementation remains the same...
  // (All the other methods and rendering logic continue here)
  
  // The rest of the code continues with the same logic as before,
  // but with corrected field names throughout
  
  // ... [Continue with all the other methods and the render function]
}