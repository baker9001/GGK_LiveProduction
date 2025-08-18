/**
 * File: /src/app/entity-module/organisation/tabs/organization-structure/page.tsx
 * 
 * FIXED Organization Structure with Proper Layout & Hierarchy
 * 
 * Features:
 * ✅ Proper hierarchical tree layout
 * ✅ Connection lines between levels
 * ✅ Color-coded cards based on level
 * ✅ Dynamic card sizing with alignment
 * ✅ Active/Inactive filter toggle
 * ✅ Real data integration with Supabase
 * ✅ Progressive loading with skeleton states
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
            onClick={() => {
              // Special handling for entity tab - never hide it when clicked
              if (level.id === 'entity' && isVisible) {
                return;
              }
              onToggleLevel(level.id);
            }}
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
    new Set(['entity', 'schools'])
  );
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['company']));
  const [lazyLoadedData, setLazyLoadedData] = useState<Map<string, any[]>>(new Map());
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

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

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Load branches for expanded schools
  const loadNodeData = useCallback(async (nodeId: string, nodeType: string) => {
    const key = `${nodeType}-${nodeId}`;
    if (lazyLoadedData.has(key) || loadingNodes.has(key)) return;

    setLoadingNodes(prev => new Set(prev).add(key));

    try {
      let data = [];

      if (nodeType === 'school') {
        // Fetch branches that belong to this specific school
        const { data: branches, error } = await supabase
          .from('branches')
          .select(`
            *,
            branches_additional (*)
          `)
          .eq('school_id', nodeId)  // Important: Filter by this specific school
          .eq('status', 'active')    // Only active branches by default
          .order('name');

        if (error) {
          console.error(`Error fetching branches for school ${nodeId}:`, error);
        } else if (branches) {
          // Process the branches data
          data = branches.map(b => ({
            ...b,
            school_id: nodeId,  // Ensure school_id is set
            additional: Array.isArray(b.branches_additional) 
              ? b.branches_additional[0] 
              : b.branches_additional || {
                  branch_head_name: 'Not Assigned',
                  student_count: 0,
                  teachers_count: 0,
                  admin_users_count: 0
                },
            student_count: b.branches_additional?.[0]?.student_count || 
                          b.branches_additional?.student_count || 
                          b.branches_additional?.current_students || 0,
            teachers_count: b.branches_additional?.[0]?.teachers_count || 
                           b.branches_additional?.teachers_count || 
                           b.branches_additional?.active_teachers_count || 0
          }));
        }
        
        // Filter by status if needed
        if (!showInactive && data.length > 0) {
          data = data.filter(d => d.status === 'active');
        }
        
        console.log(`Loaded ${data.length} branches for school ${nodeId}`);
      } else if (nodeType === 'branch') {
        // Fetch academic years for this branch
        const { data: years, error } = await supabase
          .from('academic_years')
          .select('*')
          .eq('branch_id', nodeId)
          .order('year_name');
        
        if (!error && years) {
          data = years;
        }
      } else if (nodeType === 'year') {
        // Fetch class sections for this year
        const { data: sections, error } = await supabase
          .from('class_sections')
          .select('*')
          .eq('academic_year_id', nodeId)
          .order('section_name');
        
        if (!error && sections) {
          data = sections;
        }
      }

      // Store the loaded data with the correct key
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

  // Toggle node expansion - Fixed to work properly
  const toggleNode = useCallback((nodeId: string, nodeType: string) => {
    const key = nodeType === 'company' ? 'company' : `${nodeType}-${nodeId}`;
    
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
        // Load data when expanding a node
        if (nodeType === 'school' && nodeId) {
          loadNodeData(nodeId, nodeType);
        } else if (nodeType === 'branch' && nodeId) {
          loadNodeData(nodeId, nodeType);
        }
      }
      return newSet;
    });
  }, [loadNodeData]);

  // Toggle level visibility
  const toggleLevel = useCallback((level: string) => {
    setVisibleLevels(prev => {
      const newSet = new Set(prev);
      if (level === 'entity' && newSet.has('entity')) {
        return prev;
      }
      
      if (newSet.has(level)) {
        newSet.delete(level);
      } else {
        newSet.add(level);
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

  // Render the chart
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
                onToggleExpand={() => {
                  setExpandedNodes(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has('company')) {
                      newSet.delete('company');
                    } else {
                      newSet.add('company');
                    }
                    return newSet;
                  });
                }}
                hierarchicalData={hierarchicalData}
              />
            )}
          </div>
        )}

        {/* Connection Line from Entity to Schools */}
        {visibleLevels.has('entity') && visibleLevels.has('schools') && 
         expandedNodes.has('company') && filteredSchools?.length > 0 && !initialLoading && (
          <div className="flex justify-center">
            <div className="w-0.5 h-12 bg-gray-300 dark:bg-gray-600"></div>
          </div>
        )}

        {/* LEVEL 2: Schools */}
        {visibleLevels.has('schools') && expandedNodes.has('company') && filteredSchools?.length > 0 && (
          <div className="relative mb-12">
            {/* Horizontal Connection Line for multiple schools */}
            {filteredSchools.length > 1 && !initialLoading && (
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-6 
                            flex items-end justify-center"
                   style={{ 
                     width: `${Math.max(280 * filteredSchools.length + 40 * (filteredSchools.length - 1), 280)}px`,
                     height: '48px'
                   }}>
                <div className="w-full h-0.5 bg-gray-300 dark:bg-gray-600 absolute bottom-0"></div>
                {/* Vertical connectors for each school */}
                <div className="w-full flex justify-center relative">
                  {filteredSchools.map((_: any, index: number) => (
                    <div 
                      key={index} 
                      className="absolute h-6 w-0.5 bg-gray-300 dark:bg-gray-600"
                      style={{ 
                        left: `${(100 / filteredSchools.length) * index + (50 / filteredSchools.length)}%`,
                        bottom: '-24px',
                        transform: 'translateX(-50%)'
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Schools Grid */}
            <div className="flex flex-wrap justify-center gap-10">
              {initialLoading ? (
                <>
                  <CardSkeleton />
                  <CardSkeleton />
                  <CardSkeleton />
                </>
              ) : (
                filteredSchools.map((school: any) => (
                  <OrgCard
                    key={school.id}
                    item={school}
                    type="school"
                    onItemClick={onItemClick}
                    onAddClick={onAddClick}
                    hasChildren={school.branch_count > 0}
                    isExpanded={expandedNodes.has(`school-${school.id}`)}
                    onToggleExpand={() => {
                      const key = `school-${school.id}`;
                      setExpandedNodes(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(key)) {
                          newSet.delete(key);
                        } else {
                          newSet.add(key);
                          // Load branches when expanding
                          loadNodeData(school.id, 'school');
                        }
                        return newSet;
                      });
                    }}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* LEVEL 3: Branches - Group by School */}
        {visibleLevels.has('branches') && filteredSchools?.map((school: any) => {
          const schoolKey = `school-${school.id}`;
          const branches = lazyLoadedData.get(schoolKey) || [];
          const isLoading = loadingNodes.has(schoolKey);
          const isExpanded = expandedNodes.has(schoolKey);

          // Don't show anything if school is not expanded
          if (!isExpanded) return null;

          // Auto-load branches when school is expanded
          if (!branches.length && !isLoading && isExpanded) {
            loadNodeData(school.id, 'school');
          }

          return (
            <div key={`branches-${school.id}`} className="mt-12">
              {/* Connection from specific school to its branches */}
              {(branches.length > 0 || isLoading) && (
                <div className="flex justify-center mb-4">
                  <div className="w-0.5 h-12 bg-gray-300 dark:bg-gray-600"></div>
                </div>
              )}

              {isLoading ? (
                <div className="flex justify-center gap-10">
                  <CardSkeleton />
                  <CardSkeleton />
                </div>
              ) : branches.length > 0 ? (
                <div className="relative">
                  {/* Horizontal line for multiple branches */}
                  {branches.length > 1 && (
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-6 
                                  flex items-end justify-center"
                         style={{ 
                           width: `${Math.max(280 * branches.length + 40 * (branches.length - 1), 280)}px`,
                           height: '48px'
                         }}>
                      <div className="w-full h-0.5 bg-gray-300 dark:bg-gray-600 absolute bottom-0"></div>
                      {/* Vertical connectors for each branch */}
                      <div className="w-full flex justify-center relative">
                        {branches.map((_: any, index: number) => (
                          <div 
                            key={index} 
                            className="absolute h-6 w-0.5 bg-gray-300 dark:bg-gray-600"
                            style={{ 
                              left: `${(100 / branches.length) * index + (50 / branches.length)}%`,
                              bottom: '-24px',
                              transform: 'translateX(-50%)'
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Branches Grid aligned under their school */}
                  <div className="flex flex-wrap justify-center gap-10">
                    {branches.map((branch: any) => (
                      <OrgCard
                        key={branch.id}
                        item={branch}
                        type="branch"
                        onItemClick={onItemClick}
                        onAddClick={onAddClick}
                        hasChildren={branch.year_count > 0}
                        isExpanded={expandedNodes.has(`branch-${branch.id}`)}
                        onToggleExpand={() => {
                          const key = `branch-${branch.id}`;
                          setExpandedNodes(prev => {
                            const newSet = new Set(prev);
                            if (newSet.has(key)) {
                              newSet.delete(key);
                            } else {
                              newSet.add(key);
                              // Load years when expanding
                              loadNodeData(branch.id, 'branch');
                            }
                            return newSet;
                          });
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}

        {/* LEVEL 4 & 5: Years and Sections placeholders */}
        {visibleLevels.has('years') && !visibleLevels.has('branches') && (
          <div className="mt-8">
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Enable Branches tab to view Year/Grade levels</p>
            </div>
          </div>
        )}

        {visibleLevels.has('sections') && !visibleLevels.has('years') && (
          <div className="mt-8">
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Enable Years tab to view Section/Class levels</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
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
      <div className={`overflow-auto bg-gradient-to-b from-gray-50 to-white dark:from-gray-900/50 dark:to-gray-800 ${isFullscreen ? 'h-screen' : 'h-[700px]'}`}>
        <div 
          className="p-8 min-w-[1024px]"
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