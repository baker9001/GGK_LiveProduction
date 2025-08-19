/**
 * File: /src/app/entity-module/organisation/tabs/organization-structure/page.tsx
 * 
 * Organization Structure Tab - Visual Tree Display
 * Shows company hierarchy with schools and branches in a tree layout
 * 
 * Dependencies:
 *   - @/lib/supabase
 *   - @/lib/layout/treeLayout
 *   - @/hooks/useNodeMeasurements
 *   - External: react, lucide-react
 * 
 * Database Tables:
 *   - companies, schools, branches
 */

'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Building2, School, MapPin, Plus, Users, GraduationCap,
  ChevronDown, ChevronRight, Eye, EyeOff, ZoomIn, ZoomOut,
  Maximize2, RotateCcw, Settings, Info, AlertCircle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/shared/Button';
import { 
  TreeLayoutEngine, 
  buildTreeFromData, 
  generateConnectionPath,
  type TreeNode, 
  type NodeDimensions, 
  type NodePosition 
} from '@/lib/layout/treeLayout';
import { useNodeMeasurements } from '@/hooks/useNodeMeasurements';
import { useSingleExpansion } from '@/hooks/useSingleExpansion';

// ===== PROPS INTERFACE =====
export interface OrgStructureProps {
  companyData: any;
  companyId: string;
  onAddClick: (parentItem: any, parentType: 'company' | 'school') => void;
  onEditClick: (item: any, type: 'company' | 'school' | 'branch') => void;
  onItemClick: (item: any, type: 'company' | 'school' | 'branch') => void;
  refreshData: () => void;
}

// ===== MAIN COMPONENT =====
export default function OrganizationStructureTab({
  companyData,
  companyId,
  onAddClick,
  onEditClick,
  onItemClick,
  refreshData
}: OrgStructureProps) {
  // ===== STATE MANAGEMENT =====
  const [zoomLevel, setZoomLevel] = useState(0.8);
  const [showInactive, setShowInactive] = useState(false);
  const [visibleLevels, setVisibleLevels] = useState(new Set(['company', 'schools', 'branches']));
  const [lazyLoadedData, setLazyLoadedData] = useState(new Map());
  const [branchesData, setBranchesData] = useState(new Map());
  
  // Use single expansion hook for tree nodes
  const { expandedId, toggleExpansion, isExpanded } = useSingleExpansion();
  const expandedNodes = new Set(expandedId ? [expandedId] : []);

  // ===== REFS =====
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const cardRefs = useRef(new Map<string, React.RefObject<HTMLDivElement>>());

  // ===== LAYOUT CONFIGURATION =====
  const layoutConfig = {
    gapX: 40,
    gapY: 80,
    centerParents: true,
    minCardWidth: 280,
    maxCardWidth: 320
  };

  // ===== FETCH BRANCHES DATA =====
  const { data: allBranches = [] } = useQuery(
    ['organization-branches', companyId],
    async () => {
      if (!companyData?.schools) return [];
      
      const schoolIds = companyData.schools.map((s: any) => s.id);
      if (schoolIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('branches')
        .select(`
          id, name, code, school_id, status, address,
          branches_additional (
            student_count, teachers_count, branch_head_name
          )
        `)
        .in('school_id', schoolIds)
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    {
      enabled: !!companyData?.schools && companyData.schools.length > 0,
      staleTime: 5 * 60 * 1000
    }
  );

  // ===== UPDATE BRANCHES DATA MAP =====
  useEffect(() => {
    if (allBranches.length > 0) {
      const branchesMap = new Map();
      
      // Group branches by school_id
      allBranches.forEach((branch: any) => {
        if (!branchesMap.has(branch.school_id)) {
          branchesMap.set(branch.school_id, []);
        }
        branchesMap.get(branch.school_id).push(branch);
      });
      
      setBranchesData(branchesMap);
    }
  }, [allBranches]);

  // ===== BUILD TREE NODES =====
  const treeNodes = useMemo(() => {
    return buildTreeFromData(
      companyData,
      expandedNodes,
      lazyLoadedData,
      branchesData,
      visibleLevels
    );
  }, [companyData, expandedNodes, lazyLoadedData, branchesData, visibleLevels]);

  // ===== MEASURE NODE DIMENSIONS =====
  const dimensions = useNodeMeasurements(
    cardRefs,
    zoomLevel,
    [treeNodes, showInactive, visibleLevels]
  );

  // ===== CALCULATE LAYOUT =====
  const layoutResult = useMemo(() => {
    if (treeNodes.size === 0 || dimensions.size === 0) {
      return {
        positions: new Map(),
        totalSize: { width: 800, height: 600 },
        levelHeights: new Map()
      };
    }

    const layoutEngine = new TreeLayoutEngine(treeNodes, dimensions, layoutConfig);
    return layoutEngine.layout('company');
  }, [treeNodes, dimensions, layoutConfig]);

  // ===== EVENT HANDLERS =====
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 0.3));
  const handleResetZoom = () => setZoomLevel(0.8);

  const handleToggleLevel = (level: string) => {
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

  const handleNodeExpansion = (nodeId: string) => {
    toggleExpansion(nodeId);
    
    // Lazy load data if needed
    if (nodeId.startsWith('school-') && !lazyLoadedData.has(nodeId)) {
      const schoolId = nodeId.replace('school-', '');
      const branches = branchesData.get(schoolId) || [];
      setLazyLoadedData(prev => new Map(prev).set(nodeId, branches));
    }
  };

  // ===== CARD CLICK HANDLERS =====
  const handleCompanyClick = () => {
    onItemClick(companyData, 'company');
  };

  const handleSchoolClick = (school: any) => {
    onItemClick(school, 'school');
  };

  const handleBranchClick = (branch: any) => {
    onItemClick(branch, 'branch');
  };

  const handleAddSchoolClick = () => {
    onAddClick(companyData, 'company');
  };

  const handleAddBranchClick = (school: any) => {
    onAddClick(school, 'school');
  };

  // ===== CARD COMPONENTS =====
  const CompanyCard = ({ company, position }: { company: any; position: NodePosition }) => {
    if (!cardRefs.current.has('company')) {
      cardRefs.current.set('company', React.createRef());
    }

    return (
      <div
        ref={cardRefs.current.get('company')!}
        data-card-id="company"
        className="absolute bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-blue-200 dark:border-blue-700 p-4 cursor-pointer hover:shadow-xl transition-all duration-200"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: '280px',
          minHeight: '120px'
        }}
        onClick={handleCompanyClick}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            {company.logo ? (
              <img src={company.logo} alt="Company logo" className="w-8 h-8 object-contain" />
            ) : (
              <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">{company.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{company.code}</p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNodeExpansion('company');
            }}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            {isExpanded('company') ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <School className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">
              {company.schools?.length || 0} Schools
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">
              {allBranches.length} Branches
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">
              0 Teachers
            </span>
          </div>
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">
              0 Students
            </span>
          </div>
        </div>
      </div>
    );
  };

  const SchoolCard = ({ school, position }: { school: any; position: NodePosition }) => {
    const schoolId = `school-${school.id}`;
    
    if (!cardRefs.current.has(schoolId)) {
      cardRefs.current.set(schoolId, React.createRef());
    }

    const schoolBranches = branchesData.get(school.id) || [];
    const activeBranches = schoolBranches.filter((b: any) => showInactive || b.status === 'active');

    return (
      <div
        ref={cardRefs.current.get(schoolId)!}
        data-card-id={schoolId}
        className="absolute bg-white dark:bg-gray-800 rounded-lg shadow-md border border-green-200 dark:border-green-700 p-3 cursor-pointer hover:shadow-lg transition-all duration-200"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: '260px',
          minHeight: '100px'
        }}
        onClick={() => handleSchoolClick(school)}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
            {school.logo ? (
              <img src={school.logo} alt="School logo" className="w-6 h-6 object-contain" />
            ) : (
              <School className="w-4 h-4 text-green-600 dark:text-green-400" />
            )}
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 dark:text-white text-sm">{school.name}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">{school.code}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddBranchClick(school);
              }}
              className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded text-green-600 dark:text-green-400"
              title="Add Branch"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNodeExpansion(schoolId);
              }}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              {isExpanded(schoolId) ? (
                <ChevronDown className="w-3 h-3 text-gray-400" />
              ) : (
                <ChevronRight className="w-3 h-3 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">
              {activeBranches.length} Branches
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">
              {school.teachers_count || 0} Teachers
            </span>
          </div>
          <div className="flex items-center gap-1">
            <GraduationCap className="w-3 h-3 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">
              {school.student_count || 0} Students
            </span>
          </div>
        </div>
      </div>
    );
  };

  const BranchCard = ({ branch, position }: { branch: any; position: NodePosition }) => {
    const branchId = `branch-${branch.id}`;
    
    if (!cardRefs.current.has(branchId)) {
      cardRefs.current.set(branchId, React.createRef());
    }

    return (
      <div
        ref={cardRefs.current.get(branchId)!}
        data-card-id={branchId}
        className="absolute bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-purple-200 dark:border-purple-700 p-3 cursor-pointer hover:shadow-md transition-all duration-200"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: '220px',
          minHeight: '80px'
        }}
        onClick={() => handleBranchClick(branch)}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded flex items-center justify-center">
            <MapPin className="w-3 h-3 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <h5 className="font-medium text-gray-900 dark:text-white text-sm">{branch.name}</h5>
            <p className="text-xs text-gray-500 dark:text-gray-400">{branch.code}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1 text-xs">
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">
              {branch.branches_additional?.[0]?.teachers_count || 0} Teachers
            </span>
          </div>
          <div className="flex items-center gap-1">
            <GraduationCap className="w-3 h-3 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">
              {branch.branches_additional?.[0]?.student_count || 0} Students
            </span>
          </div>
        </div>

        {branch.branches_additional?.[0]?.branch_head_name && (
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Head: {branch.branches_additional[0].branch_head_name}
            </p>
          </div>
        )}
      </div>
    );
  };

  // ===== RENDER CONNECTIONS =====
  const renderConnections = () => {
    const connections: JSX.Element[] = [];
    
    treeNodes.forEach((node, nodeId) => {
      if (node.parentId) {
        const parentPos = layoutResult.positions.get(node.parentId);
        const childPos = layoutResult.positions.get(nodeId);
        const parentDim = dimensions.get(node.parentId);
        const childDim = dimensions.get(nodeId);
        
        if (parentPos && childPos && parentDim && childDim) {
          const path = generateConnectionPath(
            parentPos,
            childPos,
            parentDim.height,
            childDim.height,
            layoutConfig.gapY
          );
          
          connections.push(
            <path
              key={`${node.parentId}-${nodeId}`}
              d={path}
              stroke="#e5e7eb"
              strokeWidth="2"
              fill="none"
              className="dark:stroke-gray-600"
            />
          );
        }
      }
    });
    
    return connections;
  };

  // ===== MAIN RENDER =====
  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Organization Structure
            </h2>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Show/Hide:</span>
              {[
                { key: 'company', label: 'Entity', icon: Building2, color: 'blue' },
                { key: 'schools', label: 'Schools', icon: School, color: 'green' },
                { key: 'branches', label: 'Branches', icon: MapPin, color: 'purple' }
              ].map(({ key, label, icon: Icon, color }) => (
                <button
                  key={key}
                  onClick={() => handleToggleLevel(key)}
                  className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    visibleLevels.has(key)
                      ? `bg-${color}-100 text-${color}-700 dark:bg-${color}-900/30 dark:text-${color}-300`
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInactive(!showInactive)}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-colors ${
                showInactive
                  ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              {showInactive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              Show Inactive
            </button>

            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={handleZoomOut}
                className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
              <span className="px-2 text-sm text-gray-600 dark:text-gray-300 min-w-[3rem] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            <button
              onClick={handleResetZoom}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              title="Reset Zoom"
            >
              <RotateCcw className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>

            <button
              onClick={() => {}}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>
      </div>

      {/* Tree Visualization */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div 
          ref={containerRef}
          className="relative overflow-auto bg-gray-50 dark:bg-gray-900"
          style={{ height: '70vh' }}
        >
          {treeNodes.size === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">No organization data available</p>
              </div>
            </div>
          ) : (
            <div
              className="relative"
              style={{
                width: `${layoutResult.totalSize.width * zoomLevel}px`,
                height: `${layoutResult.totalSize.height * zoomLevel}px`,
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top left'
              }}
            >
              {/* SVG for connections */}
              <svg
                ref={svgRef}
                className="absolute inset-0 pointer-events-none"
                width={layoutResult.totalSize.width}
                height={layoutResult.totalSize.height}
              >
                {renderConnections()}
              </svg>

              {/* Company Card */}
              {visibleLevels.has('company') && layoutResult.positions.has('company') && (
                <CompanyCard
                  company={companyData}
                  position={layoutResult.positions.get('company')!}
                />
              )}

              {/* School Cards */}
              {visibleLevels.has('schools') && companyData?.schools?.map((school: any) => {
                const schoolId = `school-${school.id}`;
                const position = layoutResult.positions.get(schoolId);
                
                if (!position || (!showInactive && school.status !== 'active')) return null;
                
                return (
                  <SchoolCard
                    key={schoolId}
                    school={school}
                    position={position}
                  />
                );
              })}

              {/* Branch Cards */}
              {visibleLevels.has('branches') && allBranches.map((branch: any) => {
                const branchId = `branch-${branch.id}`;
                const position = layoutResult.positions.get(branchId);
                const schoolId = `school-${branch.school_id}`;
                
                if (!position || !isExpanded(schoolId) || (!showInactive && branch.status !== 'active')) {
                  return null;
                }
                
                return (
                  <BranchCard
                    key={branchId}
                    branch={branch}
                    position={position}
                  />
                );
              })}

              {/* Add School Button */}
              {visibleLevels.has('schools') && isExpanded('company') && (
                <button
                  onClick={handleAddSchoolClick}
                  className="absolute bg-green-50 dark:bg-green-900/20 border-2 border-dashed border-green-300 dark:border-green-700 rounded-lg p-4 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                  style={{
                    left: `${(layoutResult.positions.get('company')?.x || 0) + 300}px`,
                    top: `${(layoutResult.positions.get('company')?.y || 0) + 140}px`,
                    width: '260px',
                    height: '100px'
                  }}
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <Plus className="w-6 h-6 text-green-600 dark:text-green-400 mb-1" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      Add School
                    </span>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Legend:</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">Company</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">School</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">Branch</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-gray-50 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">Add New</span>
          </div>
        </div>
      </div>
    </div>
  );
}