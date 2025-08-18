/**
 * File: /src/app/entity-module/organisation/tabs/organization-structure/page.tsx
 * 
 * Organization Structure Tab Component - Optimized Version
 * Now accepts companyData directly from parent to avoid duplicate API calls
 * 
 * Dependencies:
 *   - @/lib/supabase
 *   - @/contexts/UserContext
 *   - @/components/shared/Button
 *   - External: react, lucide-react, @tanstack/react-query
 * 
 * Preserved Features:
 *   - All original visualization components
 *   - Zoom controls and fullscreen functionality
 *   - Node expansion/collapse
 *   - View mode toggle
 *   - Branch lazy loading
 *   - All interaction handlers
 * 
 * Fixed:
 *   - Now accepts companyData prop instead of userCompanyId
 *   - Removed duplicate data fetching
 *   - Fixed infinite loading issue
 * 
 * Database Tables:
 *   - companies & companies_additional
 *   - schools & schools_additional
 *   - branches & branches_additional
 */

'use client';

import React, { useState, useCallback, memo } from 'react';
import { 
  Building2, School, MapPin, ChevronDown, ChevronUp, ChevronRight,
  Plus, Edit2, PlusCircle, Users, Building, MapPinned, User,
  CheckCircle2, XCircle, Clock, AlertTriangle, ZoomIn, ZoomOut,
  Maximize2, Minimize2, ScanLine, Fullscreen, RotateCcw, Loader2, X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ===== TYPE DEFINITIONS =====
export interface OrgStructureProps {
  companyData: any; // Changed from userCompanyId to companyData
  onAddClick: (parentItem: any, parentType: 'company' | 'school') => void;
  onEditClick: (item: any, type: 'company' | 'school' | 'branch') => void;
  onItemClick: (item: any, type: 'company' | 'school' | 'branch') => void;
  refreshData?: () => void;
}

// ===== STATUS BADGE COMPONENT =====
const StatusBadge = memo(({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' }) => {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';
  const statusConfig = {
    active: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-800 dark:text-green-300',
      icon: CheckCircle2
    },
    inactive: {
      bg: 'bg-gray-100 dark:bg-gray-700/50',
      text: 'text-gray-800 dark:text-gray-300',
      icon: XCircle
    },
    pending: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-800 dark:text-yellow-300',
      icon: Clock
    },
    suspended: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-800 dark:text-red-300',
      icon: AlertTriangle
    }
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClasses} ${config.bg} ${config.text}`}>
      <Icon className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
      {status}
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';

// ===== ORG CHART NODE COMPONENT =====
const OrgChartNode = memo(({ 
  item, 
  type, 
  onItemClick, 
  onAddClick, 
  onEditClick 
}: {
  item: any;
  type: 'company' | 'school' | 'branch';
  onItemClick: (item: any, type: 'company' | 'school' | 'branch') => void;
  onAddClick: (item: any, type: 'company' | 'school') => void;
  onEditClick: (item: any, type: 'company' | 'school' | 'branch') => void;
}) => {
  const getIcon = () => {
    switch (type) {
      case 'company': return <Building2 className="h-5 w-5" />;
      case 'school': return <School className="h-5 w-5" />;
      case 'branch': return <MapPin className="h-5 w-5" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'company': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'school': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'branch': return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'company': return 'text-blue-600 dark:text-blue-400';
      case 'school': return 'text-green-600 dark:text-green-400';
      case 'branch': return 'text-purple-600 dark:text-purple-400';
    }
  };

  const managerTitle = type === 'company' ? 'CEO' : type === 'school' ? 'Principal' : 'Manager';
  const managerName = item.additional?.ceo_name || item.additional?.principal_name || item.additional?.manager_name;
  const employeeCount = item.additional?.employee_count || item.additional?.teachers_count || 0;
  const location = item.address || item.additional?.head_office_city;

  return (
    <div 
      onClick={() => onItemClick(item, type)}
      className={`
        relative w-[300px] p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer
        ${getBgColor()}
        hover:shadow-xl hover:-translate-y-1 hover:border-opacity-80
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg bg-white/50 dark:bg-gray-900/50 ${getIconColor()}`}>
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
              {item.name}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              {item.code}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <StatusBadge status={item.status} />
          {type !== 'branch' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddClick(item, type);
              }}
              className="p-1 hover:bg-white/60 dark:hover:bg-gray-700/60 rounded transition-colors"
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
          {type === 'school' && item.branch_count > 0 && (
            <div className="flex items-center space-x-1.5">
              <Building className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">
                <span className="font-bold">{item.branch_count || 0}</span> Branches
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
export default function OrganizationStructureTab({ 
  companyData,
  onAddClick, 
  onEditClick, 
  onItemClick,
  refreshData 
}: OrgStructureProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['company']));
  const [viewMode, setViewMode] = useState<'expand' | 'colleagues'>('expand');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lazyLoadedBranches, setLazyLoadedBranches] = useState<Map<string, any[]>>(new Map());
  const [loadingBranches, setLoadingBranches] = useState<Set<string>>(new Set());
  
  // Zoom state
  const [zoomLevel, setZoomLevel] = useState(1);
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 2;
  const ZOOM_STEP = 0.1;

  // Lazy load branches for a school
  const loadBranchesForSchool = useCallback(async (schoolId: string) => {
    if (lazyLoadedBranches.has(schoolId) || loadingBranches.has(schoolId)) {
      return;
    }

    setLoadingBranches(prev => new Set(prev).add(schoolId));

    try {
      // Fetch branches and their additional data in parallel
      const [branchesResponse, branchesAdditionalResponse] = await Promise.all([
        supabase.from('branches').select('*').eq('school_id', schoolId).order('name'),
        supabase.from('branches_additional').select('*')
      ]);

      const branches = branchesResponse.data || [];
      const branchesAdditional = branchesAdditionalResponse.data || [];

      // Create lookup map for additional data
      const additionalMap = new Map(
        branchesAdditional
          .filter((ba: any) => branches.some((b: any) => b.id === ba.branch_id))
          .map((ba: any) => [ba.branch_id, ba])
      );

      // Combine branches with their additional data
      const branchesWithAdditional = branches.map((branch: any) => ({
        ...branch,
        additional: additionalMap.get(branch.id)
      }));

      setLazyLoadedBranches(prev => new Map(prev).set(schoolId, branchesWithAdditional));
    } catch (error) {
      console.error('Error loading branches:', error);
    } finally {
      setLoadingBranches(prev => {
        const newSet = new Set(prev);
        newSet.delete(schoolId);
        return newSet;
      });
    }
  }, [lazyLoadedBranches, loadingBranches]);

  // Toggle node expansion
  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
        // If expanding a school node, lazy load its branches
        if (nodeId.startsWith('school-')) {
          const schoolId = nodeId.replace('school-', '');
          loadBranchesForSchool(schoolId);
        }
      }
      return newSet;
    });
  }, [loadBranchesForSchool]);

  // Zoom controls
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  const handleResetZoom = () => setZoomLevel(1);
  const handleFitToScreen = () => setZoomLevel(0.8);

  // Check if we have company data
  if (!companyData) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <Building2 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">No organization data available</p>
      </div>
    );
  }

  // Render organization chart
  const renderOrgChart = () => {
    return (
      <div className="org-chart flex flex-col items-center space-y-8">
        {/* Company Node */}
        <OrgChartNode 
          item={companyData} 
          type="company"
          onItemClick={onItemClick}
          onAddClick={onAddClick}
          onEditClick={onEditClick}
        />

        {/* Connection Line */}
        {companyData.schools && companyData.schools.length > 0 && expandedNodes.has('company') && (
          <>
            <div className="w-0.5 h-12 bg-gradient-to-b from-blue-300 to-green-300 dark:from-blue-600 dark:to-green-600"></div>
            
            {/* Schools Container */}
            <div className="flex flex-wrap gap-8 justify-center max-w-7xl">
              {companyData.schools.map((school: any, index: number) => {
                const schoolNodeId = `school-${school.id}`;
                const isExpanded = expandedNodes.has(schoolNodeId);
                const schoolBranches = lazyLoadedBranches.get(school.id) || [];
                const isLoadingSchoolBranches = loadingBranches.has(school.id);
                const hasBranches = school.branch_count > 0 || schoolBranches.length > 0;

                return (
                  <div key={school.id} className="flex flex-col items-center space-y-4">
                    {/* School Node */}
                    <div className="relative">
                      {companyData.schools.length > 1 && index > 0 && (
                        <div className="absolute -left-4 top-1/2 w-4 h-0.5 bg-gray-300 dark:bg-gray-600"></div>
                      )}
                      <OrgChartNode 
                        item={school} 
                        type="school"
                        onItemClick={onItemClick}
                        onAddClick={onAddClick}
                        onEditClick={onEditClick}
                      />
                      
                      {/* Expand/Collapse Button */}
                      {(hasBranches || isLoadingSchoolBranches) && (
                        <button
                          onClick={() => toggleNode(schoolNodeId)}
                          className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 p-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors z-10"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Branches */}
                    {isExpanded && hasBranches && (
                      <>
                        <div className="w-0.5 h-8 bg-gradient-to-b from-green-300 to-purple-300 dark:from-green-600 dark:to-purple-600"></div>
                        <div className="flex flex-wrap gap-4 justify-center">
                          {isLoadingSchoolBranches ? (
                            <div className="flex items-center justify-center w-[300px] h-[150px] bg-gray-100 dark:bg-gray-700 rounded-xl border-2 border-gray-300 dark:border-gray-600">
                              <div className="text-center">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mb-2"></div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Loading branches...</p>
                              </div>
                            </div>
                          ) : (
                            schoolBranches.map((branch: any) => (
                              <div key={branch.id} className="flex flex-col items-center">
                                {schoolBranches.length > 1 && (
                                  <div className="w-0.5 h-8 bg-gradient-to-b from-gray-300 to-gray-200 dark:from-gray-600 dark:to-gray-700 -mt-8"></div>
                                )}
                                <OrgChartNode 
                                  item={branch} 
                                  type="branch"
                                  onItemClick={onItemClick}
                                  onAddClick={() => {}}
                                  onEditClick={onEditClick}
                                />
                              </div>
                            ))
                          )}
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

  return (
    <div className="org-chart-wrapper bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 relative">
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
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Expand View
              </button>
              <button
                onClick={() => setViewMode('colleagues')}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  viewMode === 'colleagues'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Colleagues View
              </button>
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= MIN_ZOOM}
                className="p-1.5 hover:bg-white dark:hover:bg-gray-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
              <span className="px-2 text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[3rem] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= MAX_ZOOM}
                className="p-1.5 hover:bg-white dark:hover:bg-gray-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <button
              onClick={handleResetZoom}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Reset Zoom"
            >
              <RotateCcw className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>

            <button
              onClick={handleFitToScreen}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Fit to Screen"
            >
              <ScanLine className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <Fullscreen className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div 
        className={`
          overflow-auto relative
          ${isFullscreen ? 'fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900' : 'h-[600px]'}
        `}
      >
        {isFullscreen && (
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 z-10 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        )}
        
        <div 
          className="p-8 min-w-max"
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease-in-out'
          }}
        >
          {renderOrgChart()}
        </div>
      </div>
    </div>
  );
}