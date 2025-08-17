/**
 * File: /src/app/entity-module/organisation/tabs/organization-structure/page.tsx
 * 
 * Organization Structure Tab Component
 * Handles the organization chart visualization with zoom controls and node interactions
 * 
 * Dependencies:
 *   - @/lib/supabase
 *   - @/contexts/UserContext
 *   - @/components/shared/Button
 *   - External: react, lucide-react, @tanstack/react-query
 * 
 * Database Tables:
 *   - companies & companies_additional
 *   - schools & schools_additional
 *   - branches & branches_additional
 */

'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { 
  Building2, School, MapPin, ChevronDown, ChevronUp, ChevronRight,
  Plus, Edit2, PlusCircle, Users, Building, MapPinned, User,
  CheckCircle2, XCircle, Clock, AlertTriangle, ZoomIn, ZoomOut,
  Maximize2, Minimize2, ScanLine, Fullscreen, RotateCcw
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../../../lib/supabase';
import { useUser } from '../../../../../contexts/UserContext';
import { getAuthenticatedUser } from '../../../../../lib/auth';

// ===== TYPE DEFINITIONS =====
export interface OrgStructureProps {
  companyData: any;
  onAddClick: (parentItem: any, parentType: 'company' | 'school') => void;
  onEditClick: (item: any, type: 'company' | 'school' | 'branch') => void;
  onItemClick: (item: any, type: 'company' | 'school' | 'branch') => void;
  refreshData?: () => void;
}

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
    item.schools?.reduce((acc: number, school: any) => 
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
  }, []);

  // Modified toggle node to load branches when expanding
  const toggleNode = useCallback(async (id: string) => {
    // If expanding a school node and branches aren't loaded, load them first
    const school = companyData?.schools?.find((s: any) => s.id === id);
    if (school && !expandedNodes.has(id) && !lazyLoadedBranches.has(id)) {
      await loadBranchesForSchool(id);
    }

    setExpandedNodes(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      return newExpanded;
    });
  }, [companyData, expandedNodes, lazyLoadedBranches, loadBranchesForSchool]);

  // Render organization chart
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
            onItemClick={onItemClick}
            onAddClick={onAddClick}
            onEditClick={onEditClick}
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
              {companyData.schools.map((school: any) => {
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
                        onItemClick={onItemClick}
                        onAddClick={onAddClick}
                        onEditClick={onEditClick}
                      />
                      {((school.branch_count && school.branch_count > 0) || (school.branches && school.branches.length > 0)) && (
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
                    
                    {isSchoolExpanded && ((school.branch_count && school.branch_count > 0) || (school.branches && school.branches.length > 0)) && (
                      <>
                        <div className="w-0.5 h-16 bg-gradient-to-b from-gray-300 to-gray-200 dark:from-gray-600 dark:to-gray-700 mt-6"></div>
                        {/* Use branch_count or branches length for calculating width */}
                        {((lazyLoadedBranches.get(school.id)?.length || school.branches?.length || school.branch_count || 0) > 1) && (
                          <div className="relative h-0.5">
                            <div 
                              className="h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 absolute top-0"
                              style={{
                                width: `${((lazyLoadedBranches.get(school.id)?.length || school.branches?.length || school.branch_count || 1) - 1) * 316 + 100}px`,
                                left: '50%',
                                transform: 'translateX(-50%)'
                              }}
                            ></div>
                          </div>
                        )}
                        <div className="flex items-stretch space-x-4 mt-8">
                          {/* Show loading indicator if branches are being loaded */}
                          {loadingBranches.has(school.id) ? (
                            <div className="flex items-center justify-center w-[300px] h-[150px] bg-gray-100 dark:bg-gray-700 rounded-xl border-2 border-gray-300 dark:border-gray-600">
                              <div className="text-center">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mb-2"></div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Loading branches...</p>
                              </div>
                            </div>
                          ) : (
                            // Use lazy-loaded branches if available, otherwise use initial branches
                            (lazyLoadedBranches.get(school.id) || school.branches || []).map((branch: any) => (
                              <div key={branch.id} className="flex flex-col items-center">
                                {((lazyLoadedBranches.get(school.id)?.length || school.branches?.length || 0) > 1) && (
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
                    companyData?.schools?.every((s: any) => expandedNodes.has(s.id))
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
  );
}