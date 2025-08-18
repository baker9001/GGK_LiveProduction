/**
 * File: /src/app/entity-module/organisation/tabs/organization-structure/page.tsx
 * 
 * ENHANCED Organization Structure with SVG Connection Lines
 * 
 * Features:
 * ✅ SVG-based connection lines for perfect alignment
 * ✅ Dynamic line calculation based on actual card positions
 * ✅ Responsive and scalable connections
 * ✅ Clean visual hierarchy
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

// ===== ENHANCED ORG CARD WITH REF FORWARDING =====
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
          nameField: 'coordinator_name',
          stats: [
            { label: 'Sections', value: item.section_count || 0, icon: BookOpen },
            { label: 'Students', value: item.student_count || 0, icon: GraduationCap }
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
          nameField: 'teacher_name',
          stats: [
            { label: 'Students', value: item.student_count || 0, icon: GraduationCap }
          ]
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;
  const managerName = item.additional?.[config.nameField] || item[config.nameField];

  return (
    <div className="relative inline-block">
      <div 
        ref={ref}
        onClick={() => onItemClick(item, type)}
        className={`${config.cardBg} ${config.borderColor} rounded-xl border-2
                   hover:shadow-lg transition-all duration-200 cursor-pointer
                   min-w-[260px] max-w-[300px] flex-grow p-4 relative`}
        data-card-id={`${type}-${item.id}`}
        data-card-type={type}
      >
        {/* Header with Icon */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Color-coded Icon Badge */}
            <div className={`w-12 h-12 ${config.iconBg} rounded-lg flex items-center justify-center text-white font-bold shadow-md`}>
              <span className="text-sm font-bold">
                {item.code?.substring(0, 2).toUpperCase() || (type === 'branch' && item.code) || (type === 'branch' && item.name?.substring(0, 2).toUpperCase()) || <Icon className="w-6 h-6" />}
              </span>
            </div>
            
            {/* Title and Code */}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                {item.name || item.year_name || item.section_name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {item.code}
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
        
        {/* Users count (if present) */}
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
    { id: 'years', label: 'Years', icon: GraduationCap, color: 'orange' },
    { id: 'sections', label: 'Sections', icon: BookOpen, color: 'indigo' }
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
  const [visibleLevels, setVisibleLevels] = useState<Set<string>>(
    new Set(['entity', 'schools'])  // Default: Entity and Schools visible
  );
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['company']));
  const [lazyLoadedData, setLazyLoadedData] = useState<Map<string, any[]>>(new Map());
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInactive, setShowInactive] = useState(false); // Default to false = show active only
  const [initialLoading, setInitialLoading] = useState(true);
  const [branchesData, setBranchesData] = useState<Map<string, any[]>>(new Map());
  const [layoutPositions, setLayoutPositions] = useState<Map<string, NodePosition>>(new Map());
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
  
  // Refs for SVG connections
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, React.RefObject<HTMLDivElement>>>(new Map());

  // Filter schools based on active/inactive toggle - MUST BE BEFORE allBranches query
  const filteredSchools = useMemo(() => {
    if (!companyData?.schools) return [];
    
    // Default behavior: show only active schools
    // When showInactive is true: show all schools (active + inactive)
    return showInactive 
      ? companyData.schools 
      : companyData.schools.filter((s: any) => s.status === 'active');
  }, [companyData?.schools, showInactive]);

  // Fetch branches for all schools when branches tab is enabled
  const { data: allBranches = [], isLoading: isAllBranchesLoading } = useQuery(
    ['all-branches', companyId, showInactive],
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
      
      // Always filter branches by active status unless showInactive is true
      if (!showInactive) {
        query = query.eq('status', 'active');
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return (data || []).map(b => ({
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
    },
    {
      enabled: !!filteredSchools && filteredSchools.length > 0 && visibleLevels.has('branches'),
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
    gapX: 48, // Minimum horizontal gap between siblings
    gapY: 80, // Vertical gap between levels
    centerParents: true,
    minCardWidth: 260,
    maxCardWidth: 300
  }), []);

  // Measure node dimensions
  const nodeDimensions = useNodeMeasurements(
    cardRefs,
    zoomLevel,
    [expandedNodes, visibleLevels, filteredSchools, allBranches, showInactive]
  );

  // Build tree structure from data
  const treeNodes = useMemo(() => {
    if (!companyData) return new Map();
    
    return buildTreeFromData(
      companyData,
      expandedNodes,
      visibleLevels,
      lazyLoadedData,
      branchesData
    );
  }, [companyData, expandedNodes, visibleLevels, lazyLoadedData, branchesData]);

  // Calculate layout positions
  useEffect(() => {
    if (treeNodes.size === 0) return;
    
    // Always use default dimensions if measurements aren't available yet
    const dimensionsToUse = new Map<string, NodeDimensions>();
    treeNodes.forEach((node, nodeId) => {
      const measured = nodeDimensions.get(nodeId);
      dimensionsToUse.set(nodeId, measured || { width: 260, height: 140 });
    });

    const layoutEngine = new TreeLayoutEngine(treeNodes, dimensionsToUse, layoutConfig);
    const result = layoutEngine.layout('company');
    
    setLayoutPositions(result.positions);
    setCanvasSize(result.totalSize);
  }, [treeNodes, nodeDimensions, layoutConfig]);
  // Calculate hierarchical data from actual data
  const hierarchicalData = useMemo(() => {
    if (!filteredSchools || filteredSchools.length === 0) {
      return { totalSchools: 0, totalBranches: 0, totalStudents: 0, totalTeachers: 0, totalUsers: 0 };
    }
    
    const totalSchools = filteredSchools.length;
    const totalBranches = filteredSchools.reduce((sum: number, school: any) => 
      sum + (school.branch_count || 0), 0
    );
    const totalStudents = filteredSchools.reduce((sum: number, school: any) => 
      sum + (school.student_count || school.additional?.student_count || 0), 0
    );
    const totalTeachers = filteredSchools.reduce((sum: number, school: any) => 
      sum + (school.additional?.teachers_count || 0), 0
    );
    const totalUsers = filteredSchools.reduce((sum: number, school: any) => 
      sum + (school.additional?.admin_users_count || 0), 0
    ) + (companyData.additional?.admin_users_count || 0);
    
    return { totalSchools, totalBranches, totalStudents, totalTeachers, totalUsers };
  }, [filteredSchools, companyData]);

  // Group branches by school when data is available
  useEffect(() => {
    if (allBranches.length > 0) {
      const branchesBySchool = new Map<string, any[]>();
      
      allBranches.forEach(branch => {
        const schoolId = branch.school_id;
        if (!branchesBySchool.has(schoolId)) {
          branchesBySchool.set(schoolId, []);
        }
        branchesBySchool.get(schoolId)!.push(branch);
      });
      
      setBranchesData(branchesBySchool);
      
      // Update lazy loaded data for consistency
      setLazyLoadedData(prev => {
        const newMap = new Map(prev);
        branchesBySchool.forEach((branches, schoolId) => {
          newMap.set(`school-${schoolId}`, branches);
        });
        return newMap;
      });
    }
  }, [allBranches]);

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);


  // Load data for expanded nodes
  const loadNodeData = useCallback(async (nodeId: string, nodeType: string) => {
    const key = `${nodeType}-${nodeId}`;
    
    // For school branches, check if we already have the data from allBranches query
    if (nodeType === 'school' && branchesData.has(nodeId)) {
      const branches = branchesData.get(nodeId) || [];
      setLazyLoadedData(prev => {
        const newMap = new Map(prev);
        newMap.set(key, branches);
        return newMap;
      });
      return;
    }
    
    if (lazyLoadedData.has(key) || loadingNodes.has(key)) return;

    setLoadingNodes(prev => new Set(prev).add(key));

    try {
      let data = [];

      if (nodeType === 'school') {
        // Fetch branches for school
        if (branchesData.has(nodeId)) {
          data = branchesData.get(nodeId) || [];
        } else {
          // Fallback to individual fetch
          let query = supabase
            .from('branches')
            .select(`
              *,
              branches_additional (*)
            `)
            .eq('school_id', nodeId)
            .order('name');
          
          if (!showInactive) {
            query = query.eq('status', 'active');
          }
          
          const { data: branches, error } = await query;

          if (!error && branches) {
            data = branches.map(b => ({
              ...b,
              school_id: nodeId,
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
          }
        }
      }

      setLazyLoadedData(prev => {
        const newMap = new Map(prev);
        newMap.set(key, data);
        return newMap;
      });
    } catch (error) {
      console.error(`Error loading ${nodeType} data:`, error);
    } finally {
      setLoadingNodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  }, [showInactive, branchesData, lazyLoadedData, loadingNodes]);

  // Toggle node expansion - Always loads data when expanding
  const toggleNode = useCallback((nodeId: string, nodeType: string) => {
    const key = nodeType === 'company' ? 'company' : `${nodeType}-${nodeId}`;
    
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
        // Always load data when expanding
        if (nodeType === 'school' && nodeId) {
          loadNodeData(nodeId, nodeType);
        } else if (nodeType === 'branch' && nodeId) {
          loadNodeData(nodeId, nodeType);
        } else if (nodeType === 'year' && nodeId) {
          loadNodeData(nodeId, nodeType);
        }
      }
      return newSet;
    });
  }, [loadNodeData]);

  // Toggle level visibility with hierarchical rules and global expansion
  const toggleLevel = useCallback((level: string) => {
    setVisibleLevels(prev => {
      const newSet = new Set(prev);
      
      // Entity tab can never be turned off
      if (level === 'entity' && newSet.has('entity')) {
        return prev;
      }
      
      if (newSet.has(level)) {
        // Turning OFF a level
        newSet.delete(level);
        
        // When turning off a parent level, turn off all child levels
        if (level === 'schools') {
          newSet.delete('branches');
          newSet.delete('years');
          newSet.delete('sections');
          // Collapse all schools when turning off schools
          setExpandedNodes(prevExpanded => {
            const newExpanded = new Set(prevExpanded);
            if (filteredSchools) {
              filteredSchools.forEach((school: any) => {
                newExpanded.delete(`school-${school.id}`);
              });
            }
            return newExpanded;
          });
        } else if (level === 'branches') {
          // When turning OFF branches, collapse all schools
          setExpandedNodes(prevExpanded => {
            const newExpanded = new Set(prevExpanded);
            if (filteredSchools) {
              filteredSchools.forEach((school: any) => {
                newExpanded.delete(`school-${school.id}`);
              });
            }
            return newExpanded;
          });
        } else if (level === 'years') {
          newSet.delete('sections');
        }
      } else {
        // Turning ON a level
        newSet.add(level);
        
        // When turning on a child level, ensure parent levels are also on
        if (level === 'branches') {
          if (!newSet.has('schools')) newSet.add('schools');
          
          // When turning ON branches, expand all schools that have branches
          setExpandedNodes(prevExpanded => {
            const newExpanded = new Set(prevExpanded);
            if (filteredSchools) {
              filteredSchools.forEach((school: any) => {
                if (school.branch_count > 0) {
                  newExpanded.add(`school-${school.id}`);
                  // Load data for these schools
                  loadNodeData(school.id, 'school');
                }
              });
            }
            return newExpanded;
          });
        } else if (level === 'years') {
          if (!newSet.has('schools')) newSet.add('schools');
          if (!newSet.has('branches')) newSet.add('branches');
        } else if (level === 'sections') {
          if (!newSet.has('schools')) newSet.add('schools');
          if (!newSet.has('branches')) newSet.add('branches');
          if (!newSet.has('years')) newSet.add('years');
        } else if (level === 'schools') {
          // Turning ON schools
          newSet.add(level);
          
          // If branches are also visible, expand schools with branches
          if (newSet.has('branches')) {
            setExpandedNodes(prevExpanded => {
              const newExpanded = new Set(prevExpanded);
              if (filteredSchools) {
                filteredSchools.forEach((school: any) => {
                  if (school.branch_count > 0) {
                    newExpanded.add(`school-${school.id}`);
                    loadNodeData(school.id, 'school');
                  }
                });
              }
              return newExpanded;
            });
          }
        }
      }
      
      return newSet;
    });
  }, [filteredSchools, loadNodeData]);

  // Zoom controls
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => setZoomLevel(1);
  
  // Helper functions for fit to screen
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const computeContentBounds = useCallback(() => {
    const container = chartContainerRef.current;
    if (!container) return { width: 0, height: 0 };

    const containerRect = container.getBoundingClientRect();

    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;

    cardRefs.current.forEach(ref => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x1 = r.left - containerRect.left;
      const x2 = r.right - containerRect.left;
      const y1 = r.top - containerRect.top;
      const y2 = r.bottom - containerRect.top;
      left = Math.min(left, x1);
      right = Math.max(right, x2);
      top = Math.min(top, y1);
      bottom = Math.max(bottom, y2);
    });

    if (left === Infinity) {
      // fallback if nothing measured yet
      return {
        width: container.scrollWidth,
        height: container.scrollHeight
      };
    }

    return { width: right - left, height: bottom - top };
  }, []);

  const SAFE_PADDING = 32; // px padding inside the viewport

  const handleFitToScreen = useCallback(() => {
    const viewport = scrollAreaRef.current;
    const container = chartContainerRef.current;
    if (!viewport || !container) return;

    // visible viewport inside the scroll area (minus a bit of padding)
    const viewportW = Math.max(0, viewport.clientWidth - SAFE_PADDING * 2);
    const viewportH = Math.max(0, viewport.clientHeight - SAFE_PADDING * 2);

    // size of our content (sum of cards), pre-scale
    const { width: contentW, height: contentH } = computeContentBounds();
    if (!contentW || !contentH) return;

    // pick the limiting dimension
    const scaleX = viewportW / contentW;
    const scaleY = viewportH / contentH;
    const nextZoom = clamp(Math.min(scaleX, scaleY), 0.5, 2);

    setZoomLevel(nextZoom);

    // after zoom state applies, center scroll to content
    requestAnimationFrame(() => {
      const scaledW = contentW * nextZoom;
      const scaledH = contentH * nextZoom;

      // center content within viewport
      const targetLeft = Math.max(0, (scaledW - viewportW) / 2);
      const targetTop  = Math.max(0, (scaledH - viewportH) / 2);

      viewport.scrollTo({ left: targetLeft, top: targetTop, behavior: 'smooth' });
    });
  }, [computeContentBounds]);

  // Optional: fit once after first meaningful paint
  useEffect(() => {
    const t = setTimeout(() => handleFitToScreen(), 200);
    return () => clearTimeout(t);
  }, [visibleLevels, expandedNodes, companyData, handleFitToScreen]);

  const handleFitToPage = useCallback(() => {
    if (!chartContainerRef.current || canvasSize.width === 0) return;
    
    const container = chartContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    // Get available space (subtract padding)
    const availableWidth = containerRect.width - 64; // 32px padding on each side
    const availableHeight = containerRect.height - 64;
    
    // Calculate zoom to fit content
    const scaleX = availableWidth / canvasSize.width;
    const scaleY = availableHeight / canvasSize.height;
    
    // Use the smaller scale to ensure everything fits, with reasonable bounds
    const optimalZoom = Math.min(scaleX, scaleY);
    const boundedZoom = Math.max(0.3, Math.min(1.5, optimalZoom));
    
    setZoomLevel(boundedZoom);
  }, [canvasSize, chartContainerRef]);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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

          // Determine if this node should be rendered based on loading states
          if (initialLoading && nodeId !== 'company') return null;
          
          const isSchoolLoading = loadingNodes.has(nodeId);
          if (isSchoolLoading) {
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

          // Get the actual data for this node
          let item = node.data;
          let hasChildren = false;
          let isExpanded = false;

          if (node.type === 'company') {
            item = companyData;
            hasChildren = filteredSchools?.length > 0;
            isExpanded = expandedNodes.has('company');
          } else if (node.type === 'school') {
            const schoolId = node.id.replace('school-', '');
            const school = filteredSchools.find((s: any) => s.id === schoolId);
            item = school;
            const branches = lazyLoadedData.get(node.id) || branchesData.get(schoolId) || [];
            hasChildren = school?.branch_count > 0 || branches.length > 0;
            isExpanded = expandedNodes.has(node.id);
          } else if (node.type === 'branch') {
            const branchId = node.id.replace('branch-', '');
            // Find branch in the data
            for (const branches of branchesData.values()) {
              const branch = branches.find(b => b.id === branchId);
              if (branch) {
                item = branch;
                break;
              }
            }
            // Also check lazy loaded data
            for (const branches of lazyLoadedData.values()) {
              const branch = branches.find(b => b.id === branchId);
              if (branch) {
                item = branch;
                break;
              }
            }
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
                onItemClick={onItemClick}
                onAddClick={onAddClick}
                hasChildren={hasChildren}
                isExpanded={isExpanded}
                onToggleExpand={() => {
                  if (node.type === 'company') {
                    toggleNode('company', 'company');
                  } else if (node.type === 'school') {
                    const schoolId = node.id.replace('school-', '');
                    toggleNode(schoolId, 'school');
                  }
                }}
                hierarchicalData={node.type === 'company' ? hierarchicalData : undefined}
              />
            </div>
          );
        })}

        {/* SVG Connections */}
        <svg
          className="absolute inset-0 pointer-events-none z-1"
          width="100%"
          height="100%"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${canvasSize.width}px`,
            height: `${canvasSize.height}px`
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

            const parentPos = layoutPositions.get(node.parentId);
            const childPos = layoutPositions.get(nodeId);
            const parentDim = nodeDimensions.get(node.parentId);
            const childDim = nodeDimensions.get(nodeId);

            // Use default dimensions if not measured yet
            const parentDimensions = parentDim || { width: 260, height: 140 };
            const childDimensions = childDim || { width: 260, height: 140 };
            
            if (!parentPos || !childPos) return null;

            const path = generateConnectionPath(
              parentPos,
              childPos,
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

        {/* Helper messages for better UX */}
        {!expandedNodes.has('company') && filteredSchools?.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Click the arrow on the company card to view schools</p>
            </div>
          </div>
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
            
            {/* Show/Hide Controls */}
            <div className="text-xs text-gray-500 dark:text-gray-400">Show/Hide:</div>
            
            <LevelTabs visibleLevels={visibleLevels} onToggleLevel={toggleLevel} />
            
            {/* Show Inactive Toggle */}
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

          {/* Zoom Controls */}
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
              title="Reset zoom to 100%"
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

      {/* Chart Container with SVG Overlay */}
      <div className={`overflow-auto bg-gradient-to-b from-gray-50 to-white dark:from-gray-900/50 dark:to-gray-800 ${isFullscreen ? 'h-screen' : 'h-[calc(100vh-300px)]'} w-full relative`}>
        <div 
          ref={scrollAreaRef}
          className={`overflow-auto bg-gradient-to-b from-gray-50 to-white dark:from-gray-900/50 dark:to-gray-800 ${isFullscreen ? 'h-screen' : 'h-[calc(100vh-300px)]'} w-full relative`}
        >
          <div 
          ref={chartContainerRef}
            className="p-8 w-full min-w-full h-full flex flex-col items-center relative"
          style={{
            transform: `scale(${zoomLevel})`,
              transformOrigin: 'left top',
            transition: 'transform 0.2s',
            minWidth: `${canvasSize.width}px`,
            minHeight: `${canvasSize.height}px`
          }}
          >
            {/* Organization Chart Content */}
            <div className="relative">
              {renderChart()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}