/**
 * File: /src/app/entity-module/organisation/tabs/organization-structure/page.tsx
 * Dependencies: 
 *   - @/lib/supabase
 *   - @/lib/layout/treeLayout
 *   - @/hooks/useNodeMeasurements
 *   - @/components/forms/BranchFormContent
 *   - @/components/shared/SlideInForm
 *   - External: react, @tanstack/react-query, lucide-react, react-hot-toast
 * 
 * CORRECTED VERSION - Preserves Original Functionality with Better Centering
 * 
 * ✅ Features:
 *   - PRESERVED: All original zoom/pan functionality
 *   - ENHANCED: Better diagram centering and positioning
 *   - PRESERVED: Original auto-resize logic
 *   - ENHANCED: Improved fitToScreen behavior
 *   - PRESERVED: All original state management
 *   - PRESERVED: All original event handlers
 *   - PRESERVED: Original container structure with enhancements
 * 
 * Database Tables:
 *   - companies, schools, branches, grade_levels, class_sections
 *   - companies_additional, schools_additional, branches_additional
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
    
    if (logoPath.startsWith('http')) {
      return logoPath;
    }
    
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
            { label: 'Max/Section', value: item.max_students_per_section || 30, icon: Users },
            { label: 'Total Sections', value: item.total_sections || item.class_sections?.length || 0, icon: BookOpen }
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
            { label: 'Current', value: item.current_students || 0, icon: GraduationCap },
            { label: 'Room', value: item.room_number || item.classroom_number || 'N/A', icon: Building2 }
          ]
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;
  const managerName = item.additional?.[config.nameField] || item[config.nameField];
  const logoUrl = getLogoUrl();

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onItemClick(item, type);
  };

  const getDisplayName = () => {
    switch (type) {
      case 'year':
        return item.grade_name || item.name;
      case 'section':
        return item.section_name || item.name;
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

// ===== LEVEL TABS =====
const LevelTabs = ({ visibleLevels, onToggleLevel }: {
  visibleLevels: Set<string>;
  onToggleLevel: (level: string) => void;
}) => {
  const levels = [
    { id: 'entity', label: 'Entity', icon: Building2, color: 'blue' },
    { id: 'schools', label: 'Schools', icon: School, color: 'green' },
    { id: 'branches', label: 'Branches', icon: MapPin, color: 'purple' },
    { id: 'years', label: 'Grade/Years', icon: GraduationCap, color: 'orange' },
    { id: 'sections', label: 'Class/Section', icon: BookOpen, color: 'indigo' }
  ];

  const getColorClasses = (color: string, isVisible: boolean) => {
    if (!isVisible) {
      return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
    }
    
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
  // PRESERVED: All original state management
  const [visibleLevels, setVisibleLevels] = useState<Set<string>>(
    new Set(['entity', 'schools'])  // Default: Entity and Schools visible
  );
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['company']));
  const [lazyLoadedData, setLazyLoadedData] = useState<Map<string, any[]>>(new Map());
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
  const [zoomLevel, setZoomLevel] = useState(1); // PRESERVED: Original zoom state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [layoutPositions, setLayoutPositions] = useState<Map<string, NodePosition>>(new Map());
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // PRESERVED: Branch form state
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [branchFormData, setBranchFormData] = useState<any>({});
  const [branchFormErrors, setBranchFormErrors] = useState<Record<string, string>>({});
  const [branchFormActiveTab, setBranchFormActiveTab] = useState<'basic' | 'additional' | 'contact'>('basic');
  
  // PRESERVED: All original refs
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

  // Fetch schools for form dropdown
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

  // Fetch complete hierarchical data including grade levels and sections
  const { data: completeHierarchyData, isLoading: isHierarchyLoading } = useQuery(
    ['complete-hierarchy', companyId, showInactive, expandedNodes],
    async () => {
      if (!companyId || !filteredSchools || filteredSchools.length === 0) return null;

      const schoolIds = filteredSchools.map((s: any) => s.id);
      
      // Fetch all branches
      let branchQuery = supabase
        .from('branches')
        .select(`
          *,
          branches_additional (*)
        `)
        .in('school_id', schoolIds)
        .order('name');
      
      if (!showInactive) {
        branchQuery = branchQuery.eq('status', 'active');
      }
      
      const { data: branches, error: branchError } = await branchQuery;
      if (branchError) throw branchError;
      
      const branchIds = branches?.map(b => b.id) || [];
      
      // Fetch grade levels (both school-level and branch-level)
      let gradeLevelsQuery = supabase
        .from('grade_levels')
        .select('*')
        .order('grade_order');

      if (schoolIds.length > 0 || branchIds.length > 0) {
        const conditions = [];
        
        if (schoolIds.length > 0) {
          conditions.push(`school_id.in.(${schoolIds.join(',')})`);
        }
        
        if (branchIds.length > 0) {
          conditions.push(`branch_id.in.(${branchIds.join(',')})`);
        }
        
        if (conditions.length > 0) {
          gradeLevelsQuery = gradeLevelsQuery.or(conditions.join(','));
        }
      }
      
      if (!showInactive) {
        gradeLevelsQuery = gradeLevelsQuery.eq('status', 'active');
      }
      
      const { data: gradeLevels, error: gradeError } = await gradeLevelsQuery;
      if (gradeError) throw gradeError;
      
      // Fetch class sections for all grade levels
      let classSections: any[] = [];
      if (gradeLevels && gradeLevels.length > 0) {
        const { data: sections, error: sectionError } = await supabase
          .from('class_sections')
          .select('*')
          .in('grade_level_id', gradeLevels.map(g => g.id))
          .order('class_section_order');
        
        if (sectionError) throw sectionError;
        classSections = sections || [];
      }
      
      // Build complete hierarchy
      return {
        branches: branches?.map(b => ({
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
        })) || [],
        gradeLevels: gradeLevels || [],
        classSections: classSections || []
      };
    },
    {
      enabled: !!companyId && filteredSchools.length > 0,
      staleTime: 60 * 1000,
      cacheTime: 5 * 60 * 1000
    }
  );

  // Process hierarchy data for tree building
  const processedSchoolData = useMemo(() => {
    if (!filteredSchools || !completeHierarchyData) return [];
    
    return filteredSchools.map((school: any) => {
      // Get branches for this school
      const schoolBranches = completeHierarchyData.branches.filter(b => b.school_id === school.id);
      
      // Get school-level grades (grades without branch_id but with school_id)
      const schoolGrades = completeHierarchyData.gradeLevels.filter(g => 
        g.school_id === school.id && !g.branch_id
      );
      
      // Add sections to school-level grades
      const schoolGradesWithSections = schoolGrades.map(grade => ({
        ...grade,
        class_sections: completeHierarchyData.classSections.filter(s => 
          s.grade_level_id === grade.id
        )
      }));
      
      // Process branches with their grades
      const branchesWithGrades = schoolBranches.map(branch => {
        // Get branch-level grades
        const branchGrades = completeHierarchyData.gradeLevels.filter(g => 
          g.branch_id === branch.id
        );
        
        // Add sections to branch grades
        const branchGradesWithSections = branchGrades.map(grade => ({
          ...grade,
          class_sections: completeHierarchyData.classSections.filter(s => 
            s.grade_level_id === grade.id
          )
        }));
        
        return {
          ...branch,
          grade_levels: branchGradesWithSections,
          grade_count: branchGradesWithSections.length
        };
      });
      
      return {
        ...school,
        branches: branchesWithGrades,
        grade_levels: schoolGradesWithSections, // School-level grades
        total_grades: schoolGradesWithSections.length + 
                     branchesWithGrades.reduce((sum, b) => sum + b.grade_levels.length, 0)
      };
    });
  }, [filteredSchools, completeHierarchyData]);

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
    1, // Use base zoom for measurements
    [expandedNodes, visibleLevels, processedSchoolData.length, showInactive]
  );

  // Build tree structure from processed data
  const treeNodes = useMemo(() => {
    if (!companyData) return new Map();
    
    const filteredCompanyData = {
      ...companyData,
      schools: processedSchoolData
    };
    
    return buildTreeFromData(
      filteredCompanyData,
      expandedNodes,
      new Map(),
      new Map(),
      visibleLevels
    );
  }, [companyData, processedSchoolData, expandedNodes, visibleLevels]);

  // ENHANCED: Layout calculation with better centering but preserve structure
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
      
      // ENHANCED: Better canvas sizing with centering but keep original approach
      const containerWidth = scrollAreaRef.current?.clientWidth || 1200;
      const containerHeight = scrollAreaRef.current?.clientHeight || 800;
      
      // Calculate minimum canvas size based on content with better margins
      const paddingX = 200; // More generous horizontal padding
      const paddingY = 150; // More generous vertical padding
      
      const contentWidth = result.totalSize.width;
      const contentHeight = result.totalSize.height;
      
      const optimalCanvasWidth = Math.max(contentWidth + paddingX, containerWidth);
      const optimalCanvasHeight = Math.max(contentHeight + paddingY, containerHeight);
      
      // ENHANCED: Center content within canvas
      const centeringOffsetX = (optimalCanvasWidth - contentWidth) / 2;
      const centeringOffsetY = paddingY / 2; // Start from top with padding
      
      const centeredPositions = new Map<string, NodePosition>();
      result.positions.forEach((pos, nodeId) => {
        centeredPositions.set(nodeId, {
          x: pos.x + centeringOffsetX,
          y: pos.y + centeringOffsetY
        });
      });
      
      setLayoutPositions(centeredPositions);
      setCanvasSize({
        width: optimalCanvasWidth,
        height: optimalCanvasHeight
      });
      
      if (!hasInitialized) {
        setTimeout(() => {
          checkAndAutoResize(); // PRESERVED: Use original function
          setHasInitialized(true);
        }, 200);
      }
    }, 200);
    
    return () => {
      if (layoutUpdateTimeoutRef.current) {
        clearTimeout(layoutUpdateTimeoutRef.current);
      }
    };
  }, [treeNodes, nodeDimensions, layoutConfig, hasInitialized]);

  // Calculate hierarchical data
  const hierarchicalData = useMemo(() => {
    if (!processedSchoolData || processedSchoolData.length === 0) {
      return { totalSchools: 0, totalBranches: 0, totalStudents: 0, totalTeachers: 0, totalUsers: 0 };
    }
    
    const totalSchools = processedSchoolData.length;
    const totalBranches = processedSchoolData.reduce((sum: number, school: any) => 
      sum + (school.branches?.length || 0), 0
    );
    const totalStudents = processedSchoolData.reduce((sum: number, school: any) => 
      sum + (school.student_count || school.additional?.student_count || 0), 0
    );
    const totalTeachers = processedSchoolData.reduce((sum: number, school: any) => 
      sum + (school.additional?.teachers_count || 0), 0
    );
    const totalUsers = processedSchoolData.reduce((sum: number, school: any) => 
      sum + (school.additional?.admin_users_count || 0), 0
    ) + (companyData?.additional?.admin_users_count || 0);
    
    return { totalSchools, totalBranches, totalStudents, totalTeachers, totalUsers };
  }, [processedSchoolData, companyData]);

  // PRESERVED: Handle branch editing from diagram
  const handleBranchEdit = useCallback(async (branch: any) => {
    try {
      const { data: additionalData, error } = await supabase
        .from('branches_additional')
        .select('*')
        .eq('branch_id', branch.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching branch additional data:', error);
      }
      
      const combinedData = {
        ...branch,
        ...(additionalData || branch.additional || {})
      };
      
      setBranchFormData(combinedData);
      setBranchFormErrors({});
      setEditingBranch(branch);
      setBranchFormActiveTab('basic');
      setShowBranchForm(true);
    } catch (error) {
      console.error('Error preparing branch form:', error);
      toast.error('Failed to load branch details');
    }
  }, []);

  // PRESERVED: Handle branch form submission
  const handleBranchFormSubmit = useCallback(async () => {
    const errors: Record<string, string> = {};
    
    if (!branchFormData.name) errors.name = 'Name is required';
    if (!branchFormData.code) errors.code = 'Code is required';
    if (!branchFormData.school_id) errors.school_id = 'School is required';
    if (!branchFormData.status) errors.status = 'Status is required';
    
    if (branchFormData.branch_head_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(branchFormData.branch_head_email)) {
      errors.branch_head_email = 'Invalid email address';
    }
    
    if (Object.keys(errors).length > 0) {
      setBranchFormErrors(errors);
      toast.error('Please fix the errors before submitting');
      return;
    }
    
    try {
      const mainData = {
        name: branchFormData.name,
        code: branchFormData.code,
        school_id: branchFormData.school_id,
        status: branchFormData.status,
        address: branchFormData.address,
        notes: branchFormData.notes,
        logo: branchFormData.logo
      };
      
      const { error } = await supabase
        .from('branches')
        .update(mainData)
        .eq('id', editingBranch.id);
      
      if (error) throw error;
      
      const additionalData: any = {
        branch_id: editingBranch.id,
        student_capacity: branchFormData.student_capacity,
        current_students: branchFormData.current_students,
        teachers_count: branchFormData.teachers_count,
        active_teachers_count: branchFormData.active_teachers_count,
        branch_head_name: branchFormData.branch_head_name,
        branch_head_email: branchFormData.branch_head_email,
        branch_head_phone: branchFormData.branch_head_phone,
        building_name: branchFormData.building_name,
        floor_details: branchFormData.floor_details,
        opening_time: branchFormData.opening_time,
        closing_time: branchFormData.closing_time,
        working_days: branchFormData.working_days
      };
      
      const { error: updateError } = await supabase
        .from('branches_additional')
        .update(additionalData)
        .eq('branch_id', editingBranch.id);
      
      if (updateError?.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('branches_additional')
          .insert([additionalData]);
        
        if (insertError && insertError.code !== '23505') {
          console.error('Additional insert error:', insertError);
        }
      }
      
      toast.success('Branch updated successfully');
      setShowBranchForm(false);
      setEditingBranch(null);
      setBranchFormData({});
      setBranchFormErrors({});
      
      if (refreshData) {
        refreshData();
      }
    } catch (error) {
      console.error('Error updating branch:', error);
      toast.error('Failed to update branch');
    }
  }, [branchFormData, editingBranch, refreshData]);

  // Initial loading simulation
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Toggle node expansion
  const toggleNode = useCallback((nodeId: string, nodeType: string) => {
    const key = nodeType === 'company' ? 'company' : `${nodeType}-${nodeId}`;
    
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }, []);

  // Toggle level visibility with proper hierarchical rules
  const toggleLevel = useCallback((level: string) => {
    setVisibleLevels(prev => {
      const newSet = new Set(prev);
      
      // Entity tab can never be turned off
      if (level === 'entity' && newSet.has('entity')) {
        return prev;
      }
      
      if (newSet.has(level)) {
        // Turning OFF a level - cascade down
        newSet.delete(level);
        
        if (level === 'schools') {
          newSet.delete('branches');
          newSet.delete('years');
          newSet.delete('sections');
          setExpandedNodes(prevExpanded => {
            const newExpanded = new Set(prevExpanded);
            processedSchoolData.forEach((school: any) => {
              newExpanded.delete(`school-${school.id}`);
            });
            return newExpanded;
          });
        } else if (level === 'branches') {
          newSet.delete('years');
          newSet.delete('sections');
          setExpandedNodes(prevExpanded => {
            const newExpanded = new Set(prevExpanded);
            processedSchoolData.forEach((school: any) => {
              school.branches?.forEach((branch: any) => {
                newExpanded.delete(`branch-${branch.id}`);
              });
            });
            return newExpanded;
          });
        } else if (level === 'years') {
          newSet.delete('sections');
          setExpandedNodes(prevExpanded => {
            const newExpanded = new Set(prevExpanded);
            Array.from(newExpanded).forEach(node => {
              if (node.startsWith('grade-')) {
                newExpanded.delete(node);
              }
            });
            return newExpanded;
          });
        }
      } else {
        // Turning ON a level - cascade up
        newSet.add(level);
        
        if (level === 'sections') {
          if (!newSet.has('years')) newSet.add('years');
          if (!newSet.has('branches')) newSet.add('branches');
          if (!newSet.has('schools')) newSet.add('schools');
        } else if (level === 'years') {
          if (!newSet.has('branches')) newSet.add('branches');
          if (!newSet.has('schools')) newSet.add('schools');
        } else if (level === 'branches') {
          if (!newSet.has('schools')) newSet.add('schools');
        }
      }
      
      return newSet;
    });
  }, [processedSchoolData]);

  // PRESERVED: Original zoom controls
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => {
    checkAndAutoResize(); // PRESERVED: Use original function
  };
  
  const handleFitToScreen = useCallback(() => {
    checkAndAutoResize(); // PRESERVED: Use original function
  }, []);

  // PRESERVED: Original auto-resize function with ENHANCEMENTS
  const checkAndAutoResize = useCallback(() => {
    const viewport = scrollAreaRef.current;
    const container = chartContainerRef.current;
    if (!viewport || !container || canvasSize.width === 0 || canvasSize.height === 0) return;

    // ENHANCED: Better available space calculation
    const availableWidth = viewport.clientWidth - 128; // 64px padding on each side
    const availableHeight = viewport.clientHeight - 128;
    
    // Calculate what zoom would be needed to fit
    const scaleX = availableWidth / canvasSize.width;
    const scaleY = availableHeight / canvasSize.height;
    const optimalZoom = Math.min(scaleX, scaleY);
    
    // ENHANCED: Better bounds for different modes
    const maxZoom = isFullscreen ? 1.0 : 1.2; // Slightly lower max zoom for better appearance
    const minZoom = 0.25; // Allow more zoom out
    const boundedZoom = Math.max(minZoom, Math.min(maxZoom, optimalZoom));
    
    setZoomLevel(boundedZoom);
    
    // ENHANCED: Better centering logic
    requestAnimationFrame(() => {
      if (viewport && container) {
        // Calculate centered scroll position
        const scrollLeft = Math.max(0, (container.scrollWidth - viewport.clientWidth) / 2);
        const scrollTop = Math.max(0, (container.scrollHeight - viewport.clientHeight) / 4); // Slight top bias
        
        viewport.scrollTo({ 
          left: scrollLeft, 
          top: scrollTop, 
          behavior: 'smooth' 
        });
      }
    });
  }, [canvasSize, isFullscreen]);

  // PRESERVED: Original resize observer behavior
  useEffect(() => {
    if (!hasInitialized) return;
    
    const viewport = scrollAreaRef.current;
    if (!viewport) return;

    const handleWindowResize = () => {
      if (autoResizeTimeoutRef.current) {
        clearTimeout(autoResizeTimeoutRef.current);
      }
      autoResizeTimeoutRef.current = setTimeout(() => {
        checkAndAutoResize();
      }, 300);
    };

    window.addEventListener('resize', handleWindowResize);

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      if (autoResizeTimeoutRef.current) {
        clearTimeout(autoResizeTimeoutRef.current);
      }
    };
  }, [hasInitialized, checkAndAutoResize]);

  // PRESERVED: Toggle fullscreen with ENHANCEMENTS
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
      setTimeout(() => {
        checkAndAutoResize();
      }, 300);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
        setTimeout(() => {
          checkAndAutoResize();
        }, 300);
      }
    }
  };

  // PRESERVED: Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      setTimeout(() => {
        checkAndAutoResize();
      }, 100);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [checkAndAutoResize]);

  if (!companyData) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
        <Building2 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">No organization data available</p>
      </div>
    );
  }

  // Render the organizational chart
  const renderChart = () => {
    if (!companyData) {
      return (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading organization data...</p>
        </div>
      );
    }
    
    if (treeNodes.size === 0) {
      return (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No organization structure to display</p>
          <p className="text-xs text-gray-400 mt-2">Try enabling different levels or check your data</p>
        </div>
      );
    }

    const shouldShowConnections = visibleLevels.has('schools') && expandedNodes.has('company');

    return (
      <div 
        className="relative"
        style={{
          width: `${canvasSize.width}px`,
          height: `${canvasSize.height}px`,
          minHeight: '400px'
        }}
      >
        {/* Render all nodes with absolute positioning */}
        {Array.from(treeNodes.entries()).map(([nodeId, node]) => {
          const position = layoutPositions.get(nodeId);
          const dimensions = nodeDimensions.get(nodeId) || { width: 260, height: 140 };
          
          if (!position) return null;

          if (initialLoading && nodeId !== 'company') return null;
          
          const nodeTypeToLevel = {
            'company': 'entity',
            'school': 'schools', 
            'branch': 'branches',
            'year': 'years',
            'section': 'sections'
          };
          
          const levelKey = nodeTypeToLevel[node.type as keyof typeof nodeTypeToLevel];
          
          if (node.type === 'branch') {
            const parentSchoolId = node.parentId;
            const isSchoolExpanded = parentSchoolId && expandedNodes.has(parentSchoolId);
            
            if (!isSchoolExpanded || !visibleLevels.has('branches')) {
              return null;
            }
          } else if (node.type === 'year') {
            const parentId = node.parentId;
            const isParentExpanded = parentId && expandedNodes.has(parentId);
            
            if (!isParentExpanded || !visibleLevels.has('years')) {
              return null;
            }
          } else if (node.type === 'section') {
            const parentGradeId = node.parentId;
            const isGradeExpanded = parentGradeId && expandedNodes.has(parentGradeId);
            
            if (!isGradeExpanded || !visibleLevels.has('sections')) {
              return null;
            }
          } else if (levelKey && !visibleLevels.has(levelKey)) {
            return null;
          }
          
          const isLoading = loadingNodes.has(nodeId);
          if (isLoading) {
            return (
              <div
                key={`${nodeId}-skeleton`}
                style={{
                  position: 'absolute',
                  transform: `translate3d(${position.x - dimensions.width / 2}px, ${position.y}px, 0)`,
                  zIndex: 1
                }}
              >
                <CardSkeleton />
              </div>
            );
          }

          let item = node.data;
          let hasChildren = false;
          let isExpanded = false;

          if (node.type === 'company') {
            item = companyData;
            hasChildren = processedSchoolData?.length > 0;
            isExpanded = expandedNodes.has('company');
          } else if (node.type === 'school') {
            const schoolId = node.id.replace('school-', '');
            const school = processedSchoolData.find((s: any) => s.id === schoolId);
            item = school;
            
            const hasBranches = school?.branches && school.branches.length > 0;
            const hasGradeLevels = school?.grade_levels && school.grade_levels.length > 0;
            
            hasChildren = (hasBranches && visibleLevels.has('branches')) || 
                         (hasGradeLevels && visibleLevels.has('years'));
            isExpanded = expandedNodes.has(node.id);
          } else if (node.type === 'branch') {
            const branchId = node.id.replace('branch-', '');
            for (const school of processedSchoolData) {
              const branch = school.branches?.find((b: any) => b.id === branchId);
              if (branch) {
                item = branch;
                hasChildren = branch.grade_levels && branch.grade_levels.length > 0 && visibleLevels.has('years');
                isExpanded = expandedNodes.has(node.id);
                break;
              }
            }
          } else if (node.type === 'year') {
            item = node.data;
            hasChildren = item?.class_sections && item.class_sections.length > 0 && visibleLevels.has('sections');
            isExpanded = expandedNodes.has(node.id);
          } else if (node.type === 'section') {
            item = node.data;
            hasChildren = false;
          }

          if (!item) return null;

          return (
            <div
              key={nodeId}
              style={{
                position: 'absolute',
                transform: `translate3d(${position.x - dimensions.width / 2}px, ${position.y}px, 0)`,
                zIndex: 2
              }}
            >
              <OrgCard
                ref={getCardRef(nodeId)}
                item={item}
                type={node.type}
                onItemClick={(clickedItem, clickedType) => {
                  if (clickedType === 'branch') {
                    handleBranchEdit(clickedItem);
                  } else {
                    onItemClick(clickedItem, clickedType);
                  }
                }}
                onAddClick={onAddClick}
                hasChildren={hasChildren}
                isExpanded={isExpanded}
                onToggleExpand={() => {
                  if (node.type === 'company') {
                    setExpandedNodes(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has('company')) {
                        newSet.delete('company');
                      } else {
                        newSet.add('company');
                      }
                      return newSet;
                    });
                  } else {
                    const id = node.id.replace(`${node.type}-`, '');
                    toggleNode(id, node.type);
                  }
                }}
                hierarchicalData={node.type === 'company' ? hierarchicalData : undefined}
              />
            </div>
          );
        })}

        {/* SVG Connections */}
        {shouldShowConnections && (
          <svg
            className="absolute pointer-events-none z-0"
            style={{
              left: '0px',
              top: '0px',
              width: `${canvasSize.width}px`,
              height: `${canvasSize.height}px`,
              overflow: 'visible'
            }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#9CA3AF"
                  className="dark:fill-gray-500"
                />
              </marker>
            </defs>
            {Array.from(treeNodes.entries()).map(([nodeId, node]) => {
              if (!node.parentId) return null;
              
              const nodeTypeToLevel = {
                'company': 'entity',
                'school': 'schools', 
                'branch': 'branches',
                'year': 'years',
                'section': 'sections'
              };
              
              const parentNode = treeNodes.get(node.parentId);
              if (!parentNode) return null;
              
              const childLevel = nodeTypeToLevel[node.type as keyof typeof nodeTypeToLevel];
              const parentLevel = nodeTypeToLevel[parentNode.type as keyof typeof nodeTypeToLevel];
              
              if (node.type === 'branch') {
                if (!visibleLevels.has('branches') || !expandedNodes.has(node.parentId)) {
                  return null;
                }
              } else if (node.type === 'year') {
                if (!visibleLevels.has('years') || !expandedNodes.has(node.parentId)) {
                  return null;
                }
              } else if (node.type === 'section') {
                if (!visibleLevels.has('sections') || !expandedNodes.has(node.parentId)) {
                  return null;
                }
              } else {
                if (!visibleLevels.has(childLevel) || !visibleLevels.has(parentLevel)) {
                  return null;
                }
              }

              const parentPos = layoutPositions.get(node.parentId);
              const childPos = layoutPositions.get(nodeId);
              const parentDim = nodeDimensions.get(node.parentId);
              const childDim = nodeDimensions.get(nodeId);

              const parentDimensions = parentDim || { width: 260, height: 140 };
              const childDimensions = childDim || { width: 260, height: 140 };
              
              if (!parentPos || !childPos) return null;

              const path = generateConnectionPath(
                { x: parentPos.x, y: parentPos.y },
                { x: childPos.x, y: childPos.y },
                parentDimensions.height,
                childDimensions.height,
                layoutConfig.gapY
              );

              return (
                <path
                  key={`${node.parentId}-${nodeId}`}
                  d={path}
                  stroke="#9CA3AF"
                  strokeWidth="2"
                  fill="none"
                  markerEnd="url(#arrowhead)"
                  className="dark:stroke-gray-500"
                />
              );
            })}
          </svg>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 w-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Organization Structure
            </h2>
            
            <div className="text-xs text-gray-500 dark:text-gray-400">Show/Hide:</div>
            
            <LevelTabs visibleLevels={visibleLevels} onToggleLevel={toggleLevel} />
            
            <button
              onClick={() => setShowInactive(!showInactive)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium
                         bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300
                         hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {showInactive ? (
                <ToggleRight className="w-4 h-4 text-orange-500" />
              ) : (
                <ToggleLeft className="w-4 h-4" />
              )}
              <span>Show Inactive</span>
            </button>
          </div>

          {/* PRESERVED: Original Zoom Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              disabled={zoomLevel <= 0.5}
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[3rem] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              disabled={zoomLevel >= 2}
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={handleFitToScreen}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Fit to screen"
            >
              <Expand className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Reset and center"
            >
              <RotateCcw className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <Maximize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* PRESERVED: Chart Container with SVG Overlay */}
      <div 
        ref={scrollAreaRef}
        className={`overflow-auto bg-gradient-to-b from-gray-50 to-white dark:from-gray-900/50 dark:to-gray-800 ${isFullscreen ? 'h-screen' : 'h-[calc(100vh-300px)]'} w-full relative`}
      >
        <div 
          ref={chartContainerRef}
          className="relative"
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'center top',
            transition: 'transform 0.2s ease-out',
            width: `${Math.max(canvasSize.width, 1200)}px`,
            height: `${Math.max(canvasSize.height, 800)}px`,
            padding: '64px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start'
          }}
        >
          <div className="relative">
            {isHierarchyLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-[#8CC63F]" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">
                  Loading organization structure...
                </span>
              </div>
            ) : (
              renderChart()
            )}
          </div>
        </div>
      </div>

      {/* PRESERVED: Branch Edit Form */}
      <SlideInForm
        title="Edit Branch"
        isOpen={showBranchForm}
        onClose={() => {
          setShowBranchForm(false);
          setEditingBranch(null);
          setBranchFormData({});
          setBranchFormErrors({});
        }}
        onSave={handleBranchFormSubmit}
      >
        <BranchFormContent
          formData={branchFormData}
          setFormData={setBranchFormData}
          formErrors={branchFormErrors}
          setFormErrors={setBranchFormErrors}
          activeTab={branchFormActiveTab}
          setActiveTab={setBranchFormActiveTab}
          schools={schoolsForForm}
          isEditing={true}
        />
      </SlideInForm>
    </div>
  );
}