/**
 * File: /src/app/entity-module/organisation/tabs/organization-structure/page.tsx
 * 
 * FINAL FIXED Organization Structure with Best Practices
 * 
 * Tab Logic:
 * - Tabs control global visibility of levels
 * - Hierarchical dependencies enforced (can't show child without parent)
 * 
 * Arrow Logic:
 * - Arrows control local expansion state
 * - Children visible when: expanded AND tab is ON
 * 
 * Best Practices Applied:
 * ✅ Clear separation of concerns
 * ✅ Intuitive UI/UX behavior
 * ✅ Proper hierarchical relationships
 */

'use client';

import React, { useState, useCallback, memo, useEffect, useMemo } from 'react';
import { 
  Building2, School, MapPin, ChevronDown, ChevronUp,
  PlusCircle, Users, User, Eye, EyeOff,
  ZoomIn, ZoomOut, Maximize2, Minimize2, 
  RotateCcw, Loader2, X, GraduationCap, BookOpen,
  ToggleLeft, ToggleRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// ===== PROPS INTERFACE =====
export interface OrgStructureProps {
  companyData: any;
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

// ===== COLOR-CODED CARD COMPONENT =====
const OrgCard = memo(({ 
  item, 
  type, 
  onItemClick, 
  onAddClick,
  hasChildren = false,
  isExpanded = false,
  onToggleExpand,
  hierarchicalData = {}
}: {
  item: any;
  type: 'company' | 'school' | 'branch' | 'year' | 'section';
  onItemClick: (item: any, type: any) => void;
  onAddClick?: (item: any, type: any) => void;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  hierarchicalData?: any;
}) => {
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
        onClick={() => onItemClick(item, type)}
        className={`${config.cardBg} ${config.borderColor} rounded-xl border-2
                   hover:shadow-lg transition-all duration-200 cursor-pointer
                   w-[260px] p-4 relative`}
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
});

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
  const [showInactive, setShowInactive] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [branchesData, setBranchesData] = useState<Map<string, any[]>>(new Map());

  // Calculate hierarchical data from actual data
  const hierarchicalData = useMemo(() => {
    if (!companyData?.schools) return { totalSchools: 0, totalBranches: 0, totalStudents: 0, totalTeachers: 0, totalUsers: 0 };
    
    const activeSchools = showInactive 
      ? companyData.schools 
      : companyData.schools.filter((s: any) => s.status === 'active');
    
    const totalSchools = activeSchools.length;
    const totalBranches = activeSchools.reduce((sum: number, school: any) => 
      sum + (school.branch_count || 0), 0
    );
    const totalStudents = activeSchools.reduce((sum: number, school: any) => 
      sum + (school.student_count || school.additional?.student_count || 0), 0
    );
    const totalTeachers = activeSchools.reduce((sum: number, school: any) => 
      sum + (school.additional?.teachers_count || 0), 0
    );
    const totalUsers = activeSchools.reduce((sum: number, school: any) => 
      sum + (school.additional?.admin_users_count || 0), 0
    ) + (companyData.additional?.admin_users_count || 0);
    
    return { totalSchools, totalBranches, totalStudents, totalTeachers, totalUsers };
  }, [companyData, showInactive]);

  // Fetch branches for all schools when branches tab is enabled
  const { data: allBranches = [] } = useQuery(
    ['all-branches', companyId, showInactive],
    async () => {
      if (!companyData?.schools) return [];
      
      const schoolIds = companyData.schools.map((s: any) => s.id);
      
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
      enabled: !!companyData?.schools && visibleLevels.has('branches'),
      staleTime: 60 * 1000,
      cacheTime: 5 * 60 * 1000
    }
  );

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
        // Check if we have branches data from the global query first
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
      } else if (nodeType === 'branch') {
        // Fetch years for branch
        const { data: years, error } = await supabase
          .from('academic_years')
          .select('*')
          .eq('branch_id', nodeId)
          .order('year_name');
        
        if (!error && years) {
          data = years;
        }
      } else if (nodeType === 'year') {
        // Fetch sections for year
        const { data: sections, error } = await supabase
          .from('class_sections')
          .select('*')
          .eq('academic_year_id', nodeId)
          .order('section_name');
        
        if (!error && sections) {
          data = sections;
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
  }, [showInactive]);

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
  }, [loadNodeData, branchesData]);

  // Toggle level visibility with hierarchical rules
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
        } else if (level === 'branches') {
          newSet.delete('years');
          newSet.delete('sections');
        } else if (level === 'years') {
          newSet.delete('sections');
        }
      } else {
        // Turning ON a level
        newSet.add(level);
        
        // When turning on a child level, ensure parent levels are also on
        if (level === 'branches' && !newSet.has('schools')) {
          newSet.add('schools');
        } else if (level === 'years') {
          if (!newSet.has('schools')) newSet.add('schools');
          if (!newSet.has('branches')) newSet.add('branches');
        } else if (level === 'sections') {
          if (!newSet.has('schools')) newSet.add('schools');
          if (!newSet.has('branches')) newSet.add('branches');
          if (!newSet.has('years')) newSet.add('years');
        }
      }
      
      return newSet;
    });
  }, []);

  // Zoom controls
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

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

  // Filter schools based on active/inactive toggle
  const filteredSchools = showInactive 
    ? companyData.schools 
    : companyData.schools?.filter((s: any) => s.status === 'active') || [];

  // Render the organizational chart
  const renderChart = () => {
    return (
      <div className="w-full">
        {/* LEVEL 1: Company/Entity */}
        {visibleLevels.has('entity') && (
          <div className="flex justify-center mb-12">
            {initialLoading ? (
              <CardSkeleton />
            ) : (
              <OrgCard
                item={companyData}
                type="company"
                onItemClick={onItemClick}
                onAddClick={onAddClick}
                hasChildren={filteredSchools?.length > 0}
                isExpanded={expandedNodes.has('company')}
                onToggleExpand={() => toggleNode('company', 'company')}
                hierarchicalData={hierarchicalData}
              />
            )}
          </div>
        )}

        {/* LEVEL 2: Schools WITH NESTED STRUCTURE */}
        {visibleLevels.has('schools') && expandedNodes.has('company') && filteredSchools?.length > 0 && (
          <div className="relative">
            {/* Connection from Company to Schools */}
            {visibleLevels.has('entity') && !initialLoading && (
              <div className="absolute left-1/2 transform -translate-x-1/2 pointer-events-none"
                   style={{ top: '-48px', height: '48px' }}>
                <div className="w-0.5 h-full bg-gray-300 dark:bg-gray-600"></div>
              </div>
            )}
            
            {/* Horizontal spreader for multiple schools */}
            {filteredSchools.length > 1 && !initialLoading && (
              <div className="absolute left-1/2 transform -translate-x-1/2 pointer-events-none"
                   style={{ 
                     top: '0',
                     width: `${320 * filteredSchools.length}px`,
                     height: '2px'
                   }}>
                <div className="w-full h-0.5 bg-gray-300 dark:bg-gray-600"></div>
                
                {/* Vertical drops to each school */}
                {filteredSchools.map((_: any, index: number) => {
                  const totalWidth = 320 * filteredSchools.length;
                  const spacing = totalWidth / filteredSchools.length;
                  const position = spacing * index + spacing / 2 - totalWidth / 2;
                  
                  return (
                    <div 
                      key={index}
                      className="absolute w-0.5 bg-gray-300 dark:bg-gray-600 pointer-events-none"
                      style={{ 
                        left: '50%',
                        transform: `translateX(${position}px)`,
                        top: '0',
                        height: '24px'
                      }}
                    />
                  );
                })}
              </div>
            )}
            
            {/* Schools Grid */}
            <div className="flex flex-wrap justify-center gap-16 pt-6">
              {initialLoading ? (
                <>
                  <CardSkeleton />
                  <CardSkeleton />
                  <CardSkeleton />
                </>
              ) : (
                filteredSchools.map((school: any) => {
                  const schoolKey = `school-${school.id}`;
                  const isExpanded = expandedNodes.has(schoolKey);
                  // Get branches from either lazy loaded data or branches data map
                  const branches = lazyLoadedData.get(schoolKey) || branchesData.get(school.id) || [];
                  const isLoading = loadingNodes.has(schoolKey);
                  
                  // Determine if school has children (branches)
                  const hasChildren = school.branch_count > 0 || 
                                    isLoading || 
                                    branches.length > 0 ||
                                    (visibleLevels.has('branches') && branchesData.has(school.id));

                  return (
                    <div key={school.id} className="flex flex-col items-center relative">
                      {/* School Card */}
                      <OrgCard
                        item={school}
                        type="school"
                        onItemClick={onItemClick}
                        onAddClick={onAddClick}
                        hasChildren={hasChildren}
                        isExpanded={isExpanded}
                        onToggleExpand={() => toggleNode(school.id, 'school')}
                      />

                      {/* BRANCHES - Show only if: expanded AND branches tab is ON */}
                      {isExpanded && visibleLevels.has('branches') && (
                        <>
                          {(isLoading || branches.length > 0 || branchesData.has(school.id)) && (
                            <div className="relative w-full flex flex-col items-center">
                              {/* Vertical line to branches */}
                              <div className="w-0.5 h-12 bg-gray-300 dark:bg-gray-600 pointer-events-none mt-6"></div>
                              
                              {/* Horizontal spreader for multiple branches */}
                              {branches.length > 1 && !isLoading && (
                                <div className="relative pointer-events-none"
                                     style={{ 
                                       width: `${320 * branches.length}px`,
                                       height: '2px'
                                     }}>
                                  <div className="w-full h-0.5 bg-gray-300 dark:bg-gray-600"></div>
                                  
                                  {/* Vertical drops to each branch */}
                                  {branches.map((_: any, index: number) => {
                                    const totalWidth = 320 * branches.length;
                                    const spacing = totalWidth / branches.length;
                                    const position = spacing * index + spacing / 2 - totalWidth / 2;
                                    
                                    return (
                                      <div 
                                        key={index}
                                        className="absolute w-0.5 bg-gray-300 dark:bg-gray-600"
                                        style={{ 
                                          left: '50%',
                                          transform: `translateX(${position}px)`,
                                          top: '0',
                                          height: '24px'
                                        }}
                                      />
                                    );
                                  })}
                                </div>
                              )}
                              
                              {/* Branch cards */}
                              <div className="flex flex-wrap justify-center gap-10 pt-6">
                                {isLoading ? (
                                  <div className="flex gap-4">
                                    <CardSkeleton />
                                    <CardSkeleton />
                                  </div>
                                ) : branches.length === 0 && visibleLevels.has('branches') ? (
                                  <div className="text-center py-4">
                                    <MapPin className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      No branches found for this school
                                    </p>
                                  </div>
                                ) : (
                                  branches.map((branch: any) => {
                                    const branchKey = `branch-${branch.id}`;
                                    const isBranchExpanded = expandedNodes.has(branchKey);
                                    const years = lazyLoadedData.get(branchKey) || [];
                                    const isBranchLoading = loadingNodes.has(branchKey);
                                    
                                    return (
                                      <div key={branch.id} className="flex flex-col items-center">
                                        <OrgCard
                                          item={branch}
                                          type="branch"
                                          onItemClick={onItemClick}
                                          onAddClick={onAddClick}
                                          hasChildren={false} // Disable years for now as per original functionality
                                          isExpanded={isBranchExpanded}
                                          onToggleExpand={() => toggleNode(branch.id, 'branch')}
                                        />
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Helper messages for better UX */}
        {visibleLevels.has('branches') && !expandedNodes.has('company') && (
          <div className="mt-8">
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Expand the company to view branches</p>
            </div>
          </div>
        )}

        {visibleLevels.has('branches') && expandedNodes.has('company') && !visibleLevels.has('schools') && (
          <div className="mt-8">
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <School className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Enable Schools tab to view branches</p>
            </div>
          </div>
        )}

        {visibleLevels.has('branches') && visibleLevels.has('schools') && expandedNodes.has('company') && 
         filteredSchools.length > 0 && allBranches.length === 0 && !isLoading && (
          <div className="mt-8">
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No branches found. Click the arrow on a school card to expand and view branches.</p>
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
            
            {/* Active/Inactive Toggle */}
            <button
              onClick={() => setShowInactive(!showInactive)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium
                         bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300
                         hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {showInactive ? (
                <ToggleRight className="w-4 h-4 text-green-500" />
              ) : (
                <ToggleLeft className="w-4 h-4" />
              )}
              <span>{showInactive ? 'Showing All' : 'Active Only'}</span>
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              disabled={zoomLevel <= 0.5}
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
            >
              <ZoomIn className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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

      {/* Chart Container */}
      <div className={`overflow-auto bg-gradient-to-b from-gray-50 to-white dark:from-gray-900/50 dark:to-gray-800 ${isFullscreen ? 'h-screen' : 'h-[calc(100vh-300px)]'} w-full`}>
        <div 
          className="p-8 w-full min-w-full h-full"
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s'
          }}
        >
          {renderChart()}
        </div>
      </div>
    </div>
  );
}