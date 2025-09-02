/**
 * File: /src/app/entity-module/organisation/tabs/organization-structure/page.tsx
 * 
 * Organization Structure Tab - Visual Tree View
 * Displays organizational hierarchy with interactive tree layout
 */

'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Building2, School, MapPin, Plus, Edit, Trash2, 
  ZoomIn, ZoomOut, RotateCcw, Maximize2, Eye,
  Users, GraduationCap, Calendar, Grid3x3,
  ChevronRight, ChevronDown, Info, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import { TreeLayoutEngine, buildTreeFromData, generateConnectionPath } from '@/lib/layout/treeLayout';
import { useNodeMeasurements } from '@/hooks/useNodeMeasurements';

// Type definitions
interface Company {
  id: string;
  name: string;
  code?: string;
  status: 'active' | 'inactive';
  schools?: School[];
}

interface School {
  id: string;
  name: string;
  code?: string;
  status: 'active' | 'inactive';
  branches?: Branch[];
  grade_levels?: GradeLevel[];
  student_count?: number;
  teachers_count?: number;
  branch_count?: number;
}

interface Branch {
  id: string;
  name: string;
  code?: string;
  status: 'active' | 'inactive';
  student_count?: number;
  teachers_count?: number;
}

interface GradeLevel {
  id: string;
  grade_name: string;
  grade_code?: string;
  status: 'active' | 'inactive';
  class_sections?: ClassSection[];
}

interface ClassSection {
  id: string;
  section_name: string;
  section_code?: string;
  status: 'active' | 'inactive';
  max_capacity?: number;
}

interface OrganizationStructureTabProps {
  companyData: Company;
  companyId: string;
  onAddClick?: (parent: any, type: string) => void;
  onEditClick?: (item: any, type: string) => void;
  onItemClick?: (item: any, type: string) => void;
  refreshData?: () => void;
}

export default function OrganizationStructureTab({
  companyData,
  companyId,
  onAddClick,
  onEditClick,
  onItemClick,
  refreshData
}: OrganizationStructureTabProps) {
  // State for tree visualization
  const [zoomLevel, setZoomLevel] = useState(1);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['company']));
  const [visibleLevels, setVisibleLevels] = useState<Set<string>>(new Set(['schools', 'branches']));
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'cards'>('tree');

  // Refs for DOM measurements
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const cardRefs = useRef<Map<string, React.RefObject<HTMLDivElement>>>(new Map());

  // Enhanced company data with statistics
  const enhancedCompanyData = useMemo(() => {
    if (!companyData) return null;

    const enhanced = { ...companyData };
    
    if (enhanced.schools) {
      enhanced.schools = enhanced.schools.map(school => ({
        ...school,
        branch_count: school.branches?.length || 0,
        student_count: school.student_count || 0,
        teachers_count: school.teachers_count || 0
      }));
    }

    return enhanced;
  }, [companyData]);

  // Build tree structure
  const treeNodes = useMemo(() => {
    if (!enhancedCompanyData) return new Map();
    
    return buildTreeFromData(
      enhancedCompanyData,
      expandedNodes,
      new Map(), // lazyLoadedData
      new Map(), // branchesData
      visibleLevels
    );
  }, [enhancedCompanyData, expandedNodes, visibleLevels]);

  // Initialize card refs for all nodes
  useEffect(() => {
    const newCardRefs = new Map<string, React.RefObject<HTMLDivElement>>();
    
    treeNodes.forEach((node, nodeId) => {
      if (!cardRefs.current.has(nodeId)) {
        newCardRefs.set(nodeId, React.createRef<HTMLDivElement>());
      } else {
        newCardRefs.set(nodeId, cardRefs.current.get(nodeId)!);
      }
    });
    
    cardRefs.current = newCardRefs;
  }, [treeNodes]);

  // FIXED: Initialize nodeDimensions before using it
  const nodeDimensions = useMemo(() => {
    const dimensions = new Map();
    
    // Set default dimensions for each node type
    treeNodes.forEach((node, nodeId) => {
      let width = 280;
      let height = 140;
      
      switch (node.type) {
        case 'company':
          width = 320;
          height = 160;
          break;
        case 'school':
          width = 300;
          height = 150;
          break;
        case 'branch':
          width = 280;
          height = 140;
          break;
        case 'year':
          width = 260;
          height = 120;
          break;
        case 'section':
          width = 240;
          height = 100;
          break;
      }
      
      dimensions.set(nodeId, { width, height });
    });
    
    return dimensions;
  }, [treeNodes]);

  // Use node measurements hook
  const measuredDimensions = useNodeMeasurements(
    cardRefs,
    zoomLevel,
    [treeNodes, expandedNodes, visibleLevels]
  );

  // Calculate layout using tree engine
  const layoutResult = useMemo(() => {
    if (treeNodes.size === 0) return null;

    const layoutEngine = new TreeLayoutEngine(
      treeNodes,
      measuredDimensions.size > 0 ? measuredDimensions : nodeDimensions,
      {
        gapX: 40,
        gapY: 80,
        centerParents: true,
        minCardWidth: 240,
        maxCardWidth: 320
      }
    );

    return layoutEngine.layout('company');
  }, [treeNodes, measuredDimensions, nodeDimensions]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!enhancedCompanyData) {
      return { totalSchools: 0, totalBranches: 0, totalStudents: 0, totalTeachers: 0, totalUsers: 0 };
    }

    const totalSchools = enhancedCompanyData.schools?.length || 0;
    const totalBranches = enhancedCompanyData.schools?.reduce((sum, school) => 
      sum + (school.branches?.length || 0), 0) || 0;
    const totalStudents = enhancedCompanyData.schools?.reduce((sum, school) => 
      sum + (school.student_count || 0), 0) || 0;
    const totalTeachers = enhancedCompanyData.schools?.reduce((sum, school) => 
      sum + (school.teachers_count || 0), 0) || 0;
    const totalUsers = totalStudents + totalTeachers;

    return { totalSchools, totalBranches, totalStudents, totalTeachers, totalUsers };
  }, [enhancedCompanyData]);

  // Handle branch editing from diagram
  const handleBranchEdit = useCallback(async (branch: any) => {
    if (onEditClick) {
      onEditClick(branch, 'branch');
    }
  }, [onEditClick]);

  // Handle school editing from diagram
  const handleSchoolEdit = useCallback(async (school: any) => {
    if (onEditClick) {
      onEditClick(school, 'school');
    }
  }, [onEditClick]);

  // Handle node expansion
  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  // Handle zoom controls
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / 1.2, 0.3));
  const handleZoomReset = () => setZoomLevel(1);

  // Handle level visibility
  const toggleLevel = (level: string) => {
    setVisibleLevels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(level)) {
        newSet.delete(level);
      } else {
        newSet.add(level);
      }
      return newSet;
    });
  };

  // Render organization card
  const renderCard = (nodeId: string, node: any) => {
    const ref = cardRefs.current.get(nodeId);
    const position = layoutResult?.positions.get(nodeId);
    const isExpanded = expandedNodes.has(nodeId);
    const isSelected = selectedNode === nodeId;

    if (!position || !ref) return null;

    const handleCardClick = () => {
      setSelectedNode(nodeId);
      if (onItemClick) {
        onItemClick(node.data, node.type);
      }
    };

    const handleExpandClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleNode(nodeId);
    };

    return (
      <div
        key={nodeId}
        ref={ref}
        data-card-id={nodeId}
        className={cn(
          "absolute bg-white dark:bg-gray-800 rounded-lg shadow-md border-2 transition-all duration-200 cursor-pointer",
          isSelected 
            ? "border-[#8CC63F] shadow-lg" 
            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
          "hover:shadow-lg transform hover:-translate-y-1"
        )}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'top left'
        }}
        onClick={handleCardClick}
      >
        {/* Card Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {node.type === 'company' && <Building2 className="h-5 w-5 text-blue-600" />}
              {node.type === 'school' && <School className="h-5 w-5 text-green-600" />}
              {node.type === 'branch' && <MapPin className="h-5 w-5 text-purple-600" />}
              {node.type === 'year' && <GraduationCap className="h-5 w-5 text-orange-600" />}
              {node.type === 'section' && <Users className="h-5 w-5 text-indigo-600" />}
              
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                  {node.data?.name || 'Unknown'}
                </h3>
                {node.data?.code && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {node.data.code}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <StatusBadge status={node.data?.status || 'active'} size="xs" />
              
              {node.children.length > 0 && (
                <button
                  onClick={handleExpandClick}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Card Content */}
        <div className="p-4">
          {/* Statistics */}
          {node.type === 'company' && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                <div className="font-bold text-blue-600">{summaryStats.totalSchools}</div>
                <div className="text-blue-700 dark:text-blue-300">Schools</div>
              </div>
              <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                <div className="font-bold text-purple-600">{summaryStats.totalBranches}</div>
                <div className="text-purple-700 dark:text-purple-300">Branches</div>
              </div>
            </div>
          )}

          {node.type === 'school' && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded">
                <div className="font-bold text-purple-600">{node.data?.branch_count || 0}</div>
                <div className="text-purple-700 dark:text-purple-300">Branches</div>
              </div>
              <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                <div className="font-bold text-green-600">{node.data?.student_count || 0}</div>
                <div className="text-green-700 dark:text-green-300">Students</div>
              </div>
            </div>
          )}

          {node.type === 'branch' && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                <div className="font-bold text-green-600">{node.data?.student_count || 0}</div>
                <div className="text-green-700 dark:text-green-300">Students</div>
              </div>
              <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                <div className="font-bold text-blue-600">{node.data?.teachers_count || 0}</div>
                <div className="text-blue-700 dark:text-blue-300">Teachers</div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-1 mt-3">
            {onAddClick && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddClick(node.data, node.type);
                }}
                leftIcon={<Plus className="h-3 w-3" />}
              >
                Add
              </Button>
            )}
            
            {onEditClick && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditClick(node.data, node.type);
                }}
                leftIcon={<Edit className="h-3 w-3" />}
              >
                Edit
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render connections between nodes
  const renderConnections = () => {
    if (!layoutResult) return null;

    const connections: JSX.Element[] = [];

    treeNodes.forEach((node, nodeId) => {
      if (node.children.length > 0 && expandedNodes.has(nodeId)) {
        const parentPos = layoutResult.positions.get(nodeId);
        const parentDimensions = measuredDimensions.get(nodeId) || nodeDimensions.get(nodeId);

        if (parentPos && parentDimensions) {
          node.children.forEach(childId => {
            const childPos = layoutResult.positions.get(childId);
            const childDimensions = measuredDimensions.get(childId) || nodeDimensions.get(childId);

            if (childPos && childDimensions) {
              const path = generateConnectionPath(
                parentPos,
                childPos,
                parentDimensions.height,
                childDimensions.height,
                80
              );

              connections.push(
                <path
                  key={`${nodeId}-${childId}`}
                  d={path}
                  stroke="#e5e7eb"
                  strokeWidth="2"
                  fill="none"
                  className="dark:stroke-gray-600"
                />
              );
            }
          });
        }
      }
    });

    return connections;
  };

  // Loading state
  if (!companyData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading organization structure...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Organization Structure
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Visual representation of your organizational hierarchy
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            leftIcon={<ZoomOut className="h-4 w-4" />}
          >
            Zoom Out
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomReset}
            leftIcon={<RotateCcw className="h-4 w-4" />}
          >
            Reset
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            leftIcon={<ZoomIn className="h-4 w-4" />}
          >
            Zoom In
          </Button>
        </div>
      </div>

      {/* Level Toggles */}
      <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Show Levels:
        </span>
        
        {[
          { key: 'schools', label: 'Schools', icon: School },
          { key: 'branches', label: 'Branches', icon: MapPin },
          { key: 'years', label: 'Grades', icon: GraduationCap },
          { key: 'sections', label: 'Sections', icon: Users }
        ].map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={visibleLevels.has(key) ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleLevel(key)}
            leftIcon={<Icon className="h-3 w-3" />}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Tree Visualization */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div 
          ref={containerRef}
          className="relative overflow-auto"
          style={{ height: '600px' }}
        >
          {layoutResult && (
            <div
              className="relative"
              style={{
                width: `${layoutResult.totalSize.width * zoomLevel}px`,
                height: `${layoutResult.totalSize.height * zoomLevel}px`,
                minWidth: '100%',
                minHeight: '100%'
              }}
            >
              {/* SVG for connections */}
              <svg
                ref={svgRef}
                className="absolute inset-0 pointer-events-none"
                style={{
                  width: `${layoutResult.totalSize.width * zoomLevel}px`,
                  height: `${layoutResult.totalSize.height * zoomLevel}px`
                }}
              >
                <g transform={`scale(${zoomLevel})`}>
                  {renderConnections()}
                </g>
              </svg>

              {/* Render all cards */}
              {Array.from(treeNodes.entries()).map(([nodeId, node]) => 
                renderCard(nodeId, node)
              )}
            </div>
          )}
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {summaryStats.totalSchools}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Schools</div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {summaryStats.totalBranches}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Branches</div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {summaryStats.totalStudents}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Students</div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {summaryStats.totalTeachers}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Teachers</div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {summaryStats.totalUsers}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Users</div>
        </div>
      </div>

      {/* Development Status */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 mb-2">
          <Info className="w-5 h-5" />
          <span className="font-semibold">Organization Structure Visualization</span>
        </div>
        <p className="text-sm text-blue-600 dark:text-blue-400">
          Interactive organizational chart with zoom, expand/collapse, and level filtering capabilities.
        </p>
      </div>
    </div>
  );
}