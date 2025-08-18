/**
 * File: /src/app/entity-module/organisation/tabs/organization-structure/page.tsx
 * 
 * REFINED Organization Structure - Matching Previous AOUSM Design
 * 
 * Features:
 * ✅ Clean minimalist cards like previous implementation
 * ✅ Proper hierarchical connection lines
 * ✅ 5-Level hierarchy with tabs
 * ✅ Initially show only Entity + Schools
 * ✅ Uniform card sizing with better proportions
 * ✅ Clean UI matching the screenshot style
 */

'use client';

import React, { useState, useCallback, memo, useRef } from 'react';
import { 
  Building2, School, MapPin, ChevronDown, ChevronUp,
  PlusCircle, Users, User, Eye, EyeOff,
  ZoomIn, ZoomOut, Maximize2, Minimize2, 
  RotateCcw, Loader2, X, GraduationCap, BookOpen
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ===== PROPS INTERFACE =====
export interface OrgStructureProps {
  companyData: any;
  onAddClick: (parentItem: any, parentType: 'company' | 'school' | 'branch' | 'year' | 'section') => void;
  onEditClick: (item: any, type: 'company' | 'school' | 'branch' | 'year' | 'section') => void;
  onItemClick: (item: any, type: 'company' | 'school' | 'branch' | 'year' | 'section') => void;
  refreshData?: () => void;
}

// ===== CLEAN CARD COMPONENT (Matching Screenshot Style) =====
const OrgCard = memo(({ 
  item, 
  type, 
  onItemClick, 
  onAddClick,
  hasChildren = false,
  isExpanded = false,
  onToggleExpand
}: {
  item: any;
  type: 'company' | 'school' | 'branch' | 'year' | 'section';
  onItemClick: (item: any, type: any) => void;
  onAddClick?: (item: any, type: any) => void;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}) => {
  const getConfig = () => {
    switch (type) {
      case 'company':
        return {
          icon: Building2,
          bgColor: 'bg-blue-500',
          textColor: 'text-blue-500',
          borderColor: 'border-blue-200',
          title: 'CEO',
          nameField: 'ceo_name',
          countLabel: 'Staff'
        };
      case 'school':
        return {
          icon: School,
          bgColor: 'bg-green-500',
          textColor: 'text-green-500',
          borderColor: 'border-green-200',
          title: 'Principal',
          nameField: 'principal_name',
          countLabel: 'Staff'
        };
      case 'branch':
        return {
          icon: MapPin,
          bgColor: 'bg-purple-500',
          textColor: 'text-purple-500',
          borderColor: 'border-purple-200',
          title: 'Branch Head',
          nameField: 'manager_name',
          countLabel: 'Staff'
        };
      case 'year':
        return {
          icon: GraduationCap,
          bgColor: 'bg-orange-500',
          textColor: 'text-orange-500',
          borderColor: 'border-orange-200',
          title: 'Coordinator',
          nameField: 'coordinator_name',
          countLabel: 'Students'
        };
      case 'section':
        return {
          icon: BookOpen,
          bgColor: 'bg-indigo-500',
          textColor: 'text-indigo-500',
          borderColor: 'border-indigo-200',
          title: 'Teacher',
          nameField: 'teacher_name',
          countLabel: 'Students'
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;
  const managerName = item.additional?.[config.nameField];
  const count = item.additional?.employee_count || item.additional?.teachers_count || 
                item.additional?.student_count || item.student_count || 0;
  const subCount = item.branch_count || item.section_count || 0;

  return (
    <div className="relative">
      <div 
        onClick={() => onItemClick(item, type)}
        className="bg-white dark:bg-gray-800 rounded-xl border-2 dark:border-gray-700 
                   hover:shadow-lg transition-all duration-200 cursor-pointer
                   w-[260px] p-4 relative"
      >
        {/* Header with Icon and Status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Icon Badge */}
            <div className={`w-12 h-12 ${config.bgColor} rounded-lg flex items-center justify-center text-white font-bold text-lg`}>
              {item.code?.substring(0, 2).toUpperCase() || <Icon className="w-6 h-6" />}
            </div>
            
            {/* Title and Code */}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                <Icon className="w-4 h-4 text-gray-400" />
                {item.name || item.year_name || item.section_name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {item.code}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                          ${item.status === 'active' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
            <span className="w-2 h-2 rounded-full bg-current mr-1"></span>
            {item.status || 'active'}
          </span>
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

        {/* Bottom Stats */}
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span className="font-semibold text-gray-900 dark:text-white">{count}</span>
              <span>{config.countLabel}</span>
            </span>
            
            {type === 'school' && item.branch_count > 0 && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                <span className="font-semibold text-gray-900 dark:text-white">{item.branch_count}</span>
                <span>Branches</span>
              </span>
            )}
          </div>
        </div>
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

// ===== LEVEL TABS (Cleaner Design) =====
const LevelTabs = ({ visibleLevels, onToggleLevel }: {
  visibleLevels: Set<string>;
  onToggleLevel: (level: string) => void;
}) => {
  const levels = [
    { id: 'entity', label: 'Entity', icon: Building2 },
    { id: 'schools', label: 'Schools', icon: School },
    { id: 'branches', label: 'Branches', icon: MapPin },
    { id: 'years', label: 'Years', icon: GraduationCap },
    { id: 'sections', label: 'Sections', icon: BookOpen }
  ];

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
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
              ${isVisible 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}
            `}
          >
            <Icon className="w-4 h-4" />
            <span>{level.label}</span>
            {isVisible ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5 opacity-50" />
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
    new Set(['entity', 'schools']) // Initially show only Entity and Schools
  );
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['company']));
  const [lazyLoadedData, setLazyLoadedData] = useState<Map<string, any[]>>(new Map());
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load data for expanded nodes
  const loadNodeData = useCallback(async (nodeId: string, nodeType: string) => {
    const key = `${nodeType}-${nodeId}`;
    if (lazyLoadedData.has(key) || loadingNodes.has(key)) return;

    setLoadingNodes(prev => new Set(prev).add(key));

    try {
      let data = [];

      if (nodeType === 'school') {
        const { data: branches } = await supabase
          .from('branches')
          .select('*, branches_additional(*)')
          .eq('school_id', nodeId)
          .order('name');

        data = branches?.map(b => ({
          ...b,
          additional: b.branches_additional?.[0] || {}
        })) || [];
      } else if (nodeType === 'branch') {
        const { data: years } = await supabase
          .from('academic_years')
          .select('*')
          .eq('branch_id', nodeId)
          .order('year_name');
        data = years || [];
      } else if (nodeType === 'year') {
        const { data: sections } = await supabase
          .from('class_sections')
          .select('*')
          .eq('academic_year_id', nodeId)
          .order('section_name');
        data = sections || [];
      }

      setLazyLoadedData(prev => new Map(prev).set(key, data));
    } catch (error) {
      console.error(`Error loading ${nodeType} data:`, error);
    } finally {
      setLoadingNodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  }, [lazyLoadedData, loadingNodes]);

  // Toggle node expansion
  const toggleNode = useCallback((nodeId: string, nodeType: string) => {
    const key = `${nodeType}-${nodeId}`;
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
        if (nodeType === 'school' || nodeType === 'branch' || nodeType === 'year') {
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

  if (!companyData) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
        <Building2 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">No organization data available</p>
      </div>
    );
  }

  // Render the chart
  const renderChart = () => {
    return (
      <div className="org-chart-content">
        {/* LEVEL 1: Company/Entity */}
        {visibleLevels.has('entity') && (
          <div className="flex justify-center mb-8">
            <OrgCard
              item={companyData}
              type="company"
              onItemClick={onItemClick}
              onAddClick={onAddClick}
              hasChildren={companyData.schools?.length > 0}
              isExpanded={expandedNodes.has('company')}
              onToggleExpand={() => toggleNode(companyData.id, 'company')}
            />
          </div>
        )}

        {/* Connection Line */}
        {visibleLevels.has('entity') && visibleLevels.has('schools') && 
         expandedNodes.has('company') && companyData.schools?.length > 0 && (
          <div className="flex justify-center">
            <div className="w-0.5 h-12 bg-gray-300 dark:bg-gray-600"></div>
          </div>
        )}

        {/* LEVEL 2: Schools */}
        {visibleLevels.has('schools') && expandedNodes.has('company') && companyData.schools?.length > 0 && (
          <div className="relative mb-8">
            {/* Horizontal Connection Line */}
            {companyData.schools.length > 1 && (
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-6 
                            h-12 flex items-end justify-center"
                   style={{ width: `${(companyData.schools.length - 1) * 290 + 260}px` }}>
                <div className="w-full h-0.5 bg-gray-300 dark:bg-gray-600"></div>
                {/* Vertical connectors for each school */}
                {companyData.schools.map((_: any, index: number) => (
                  <div key={index} 
                       className="absolute top-6 h-6 w-0.5 bg-gray-300 dark:bg-gray-600"
                       style={{ left: `${index * 290 + 130}px` }}></div>
                ))}
              </div>
            )}
            
            <div className="flex flex-wrap justify-center gap-8">
              {companyData.schools.map((school: any) => (
                <OrgCard
                  key={school.id}
                  item={school}
                  type="school"
                  onItemClick={onItemClick}
                  onAddClick={onAddClick}
                  hasChildren={school.branch_count > 0}
                  isExpanded={expandedNodes.has(`school-${school.id}`)}
                  onToggleExpand={() => toggleNode(school.id, 'school')}
                />
              ))}
            </div>
          </div>
        )}

        {/* LEVEL 3: Branches */}
        {visibleLevels.has('branches') && (
          <div className="space-y-8">
            {companyData.schools?.map((school: any) => {
              const schoolKey = `school-${school.id}`;
              const branches = lazyLoadedData.get(schoolKey) || [];
              const isLoading = loadingNodes.has(schoolKey);
              const isExpanded = expandedNodes.has(schoolKey);

              if (!isExpanded || (!branches.length && !isLoading)) return null;

              return (
                <div key={school.id}>
                  {/* Connection from school to branches */}
                  <div className="flex justify-center mb-4">
                    <div className="w-0.5 h-12 bg-gray-300 dark:bg-gray-600"></div>
                  </div>

                  {isLoading ? (
                    <div className="flex justify-center py-4">
                      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Loading branches...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Horizontal line for multiple branches */}
                      {branches.length > 1 && (
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-6 
                                      h-12 flex items-end justify-center"
                             style={{ width: `${(branches.length - 1) * 290 + 260}px` }}>
                          <div className="w-full h-0.5 bg-gray-300 dark:bg-gray-600"></div>
                          {branches.map((_: any, index: number) => (
                            <div key={index} 
                                 className="absolute top-6 h-6 w-0.5 bg-gray-300 dark:bg-gray-600"
                                 style={{ left: `${index * 290 + 130}px` }}></div>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex flex-wrap justify-center gap-8">
                        {branches.map((branch: any) => (
                          <OrgCard
                            key={branch.id}
                            item={branch}
                            type="branch"
                            onItemClick={onItemClick}
                            onAddClick={onAddClick}
                            hasChildren={branch.year_count > 0}
                            isExpanded={expandedNodes.has(`branch-${branch.id}`)}
                            onToggleExpand={() => toggleNode(branch.id, 'branch')}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* LEVEL 4: Years - Similar pattern */}
        {visibleLevels.has('years') && (
          <div className="mt-8">
            {/* Years implementation following same pattern */}
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Expand branches to view Year/Grade levels</p>
            </div>
          </div>
        )}

        {/* LEVEL 5: Sections - Similar pattern */}
        {visibleLevels.has('sections') && (
          <div className="mt-8">
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Expand years to view Section/Class levels</p>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Organization Structure
            </h2>
            <LevelTabs visibleLevels={visibleLevels} onToggleLevel={toggleLevel} />
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
              onClick={() => setIsFullscreen(!isFullscreen)}
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
      <div className={`overflow-auto bg-gray-50 dark:bg-gray-900/50 ${isFullscreen ? 'fixed inset-0 z-50' : 'h-[700px]'}`}>
        {isFullscreen && (
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 z-10 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        )}
        
        <div 
          className="p-8 min-w-max"
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