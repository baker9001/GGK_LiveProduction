/**
 * File: /src/app/entity-module/organisation/page.tsx
 * 
 * PHASE 5: Organization Structure Tab with Access Control
 * Main organization page with hierarchical view and scope-based filtering
 * 
 * Access Rules Applied:
 * 1. Access Check: Only entity_admin and sub_entity_admin can view
 * 2. Scoped Queries: All data fetching respects user scope
 * 3. UI Gating: Create/Edit/Delete buttons shown based on permissions
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Building2, School, MapPin, Plus, Edit2, Trash2, Eye, 
  Users, GraduationCap, Crown, Shield, AlertTriangle,
  Loader2, Search, Filter, ZoomIn, ZoomOut, Maximize2,
  RefreshCw, Download, Upload, Settings, Info
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAccessControl } from '../../../hooks/useAccessControl';
import { useUser } from '../../../contexts/UserContext';
import { Button } from '../../../components/shared/Button';
import { FormField, Input, Select } from '../../../components/shared/FormField';
import { StatusBadge } from '../../../components/shared/StatusBadge';
import { SlideInForm } from '../../../components/shared/SlideInForm';
import { ConfirmationDialog } from '../../../components/shared/ConfirmationDialog';
import { toast } from '../../../components/shared/Toast';
import { cn } from '../../../lib/utils';
import { 
  TreeLayoutEngine, 
  buildTreeFromData, 
  generateConnectionPath,
  type TreeNode,
  type NodeDimensions,
  type NodePosition 
} from '../../../lib/layout/treeLayout';
import { useNodeMeasurements } from '../../../hooks/useNodeMeasurements';
import { ScrollNavigator } from '../../../components/shared/ScrollNavigator';

// Import tab components
import SchoolsTab from './tabs/schools/page';
import BranchesTab from './tabs/branches/page';
import AdminsPage from './tabs/admins/page';
import TeachersTab from './tabs/teachers/page';
import StudentsTab from './tabs/students/page';

interface CompanyData {
  id: string;
  name: string;
  code: string;
  status: string;
  logo: string | null;
  schools: SchoolData[];
}

interface SchoolData {
  id: string;
  name: string;
  code: string;
  status: string;
  logo: string | null;
  student_count: number;
  branch_count: number;
  branches?: BranchData[];
}

interface BranchData {
  id: string;
  name: string;
  code: string;
  status: string;
  student_count: number;
  school_id: string;
}

export default function OrganisationPage() {
  const { user } = useUser();
  const {
    canViewTab,
    can,
    getScopeFilters,
    isLoading: isAccessControlLoading,
    isEntityAdmin,
    isSubEntityAdmin,
    isSchoolAdmin,
    isBranchAdmin,
    getUserContext
  } = useAccessControl();

  // PHASE 5 RULE 1: ACCESS CHECK
  // Block entry if user cannot view this tab
  useEffect(() => {
    if (!isAccessControlLoading && !canViewTab('structure')) {
      toast.error('You do not have permission to view the organization structure');
      // Redirect to first accessible tab or dashboard
      window.location.href = '/app/entity-module/dashboard';
      return;
    }
  }, [isAccessControlLoading, canViewTab]);

  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState<'structure' | 'schools' | 'branches' | 'admins' | 'teachers' | 'students'>('structure');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['company']));
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(0.8);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Layout state
  const [svgDimensions, setSvgDimensions] = useState({ width: 1200, height: 800 });
  const [nodePositions, setNodePositions] = useState<Map<string, NodePosition>>(new Map());
  const cardRefs = useRef<Map<string, React.RefObject<HTMLDivElement>>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // Get user's company ID from context
  const userContext = getUserContext();
  const companyId = userContext?.companyId;

  // PHASE 5 RULE 2: SCOPED QUERIES
  // Apply getScopeFilters to all Supabase queries
  const scopeFilters = getScopeFilters('schools');

  // Fetch organization data with scope filtering
  const { 
    data: organizationData, 
    isLoading: isLoadingOrg, 
    error: orgError,
    refetch: refetchOrganization 
  } = useQuery(
    ['organization-structure', companyId, scopeFilters],
    async () => {
      if (!companyId) throw new Error('No company ID available');

      // Fetch company data
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select(`
          id,
          name,
          code,
          status,
          logo
        `)
        .eq('id', companyId)
        .single();

      if (companyError) throw companyError;

      // SCOPED QUERY: Apply scope filters to schools query
      let schoolsQuery = supabase
        .from('schools')
        .select(`
          id,
          name,
          code,
          status,
          logo,
          schools_additional (
            student_count
          )
        `)
        .eq('company_id', companyId);

      // Apply scope filters if user is not entity admin
      if (scopeFilters.school_ids) {
        schoolsQuery = schoolsQuery.in('id', scopeFilters.school_ids);
      }

      const { data: schoolsData, error: schoolsError } = await schoolsQuery;
      if (schoolsError) throw schoolsError;

      // SCOPED QUERY: Apply scope filters to branches query
      const schoolIds = schoolsData?.map(s => s.id) || [];
      let branchesQuery = supabase
        .from('branches')
        .select(`
          id,
          name,
          code,
          status,
          school_id,
          branches_additional (
            student_count
          )
        `);

      if (schoolIds.length > 0) {
        branchesQuery = branchesQuery.in('school_id', schoolIds);
      }

      // Apply additional scope filters for branches
      if (scopeFilters.branch_ids) {
        branchesQuery = branchesQuery.in('id', scopeFilters.branch_ids);
      }

      const { data: branchesData, error: branchesError } = await branchesQuery;
      if (branchesError) throw branchesError;

      // Group branches by school
      const branchesMap = new Map<string, BranchData[]>();
      (branchesData || []).forEach(branch => {
        if (!branchesMap.has(branch.school_id)) {
          branchesMap.set(branch.school_id, []);
        }
        branchesMap.get(branch.school_id)!.push({
          id: branch.id,
          name: branch.name,
          code: branch.code,
          status: branch.status,
          school_id: branch.school_id,
          student_count: branch.branches_additional?.student_count || 0
        });
      });

      // Enrich schools with branch data
      const enrichedSchools = (schoolsData || []).map(school => ({
        id: school.id,
        name: school.name,
        code: school.code,
        status: school.status,
        logo: school.logo,
        student_count: school.schools_additional?.student_count || 0,
        branch_count: branchesMap.get(school.id)?.length || 0,
        branches: branchesMap.get(school.id) || []
      }));

      return {
        ...companyData,
        schools: enrichedSchools
      } as CompanyData;
    },
    {
      enabled: !!companyId && !isAccessControlLoading && isAuthenticated,
      staleTime: 2 * 60 * 1000, // 2 minutes
      retry: 2
    }
  );

  // Node measurements for layout
  const nodeDimensions = useNodeMeasurements(cardRefs, zoomLevel, [organizationData, expandedNodes]);

  // Calculate layout positions
  useEffect(() => {
    if (!organizationData || nodeDimensions.size === 0) return;

    const nodes = buildTreeFromData(
      organizationData,
      expandedNodes,
      new Map(),
      new Map(),
      new Set()
    );

    if (nodes.size === 0) return;

    const layoutEngine = new TreeLayoutEngine(
      nodes,
      nodeDimensions,
      {
        gapX: 80,
        gapY: 100,
        centerParents: true,
        minCardWidth: 280,
        maxCardWidth: 320
      }
    );

    const result = layoutEngine.layout('company');
    setNodePositions(result.positions);
    setSvgDimensions({
      width: Math.max(1200, result.totalSize.width + 100),
      height: Math.max(800, result.totalSize.height + 100)
    });
  }, [organizationData, expandedNodes, nodeDimensions]);

  // Handle node expansion
  const toggleNodeExpansion = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  // Get accessible tabs for current user
  const accessibleTabs = useMemo(() => {
    return TAB_CONFIGURATIONS.filter(tab => {
      if (tab.adminLevelsAllowed) {
        const userContext = getUserContext();
        if (!userContext?.adminLevel || !tab.adminLevelsAllowed.includes(userContext.adminLevel)) {
          return false;
        }
      }
      return canViewTab(tab.id);
    });
  }, [canViewTab, getUserContext]);

  // PHASE 5 RULE 3: UI GATING
  // Show/hide buttons based on permissions
  const canCreateSchool = can('create_school');
  const canCreateBranch = can('create_branch');
  const canCreateAdmin = can('create_admin');
  const canModifyStructure = can('modify_organization');

  // Render company card
  const renderCompanyCard = (company: CompanyData) => {
    const nodeId = 'company';
    const position = nodePositions.get(nodeId);
    if (!position) return null;

    if (!cardRefs.current.has(nodeId)) {
      cardRefs.current.set(nodeId, React.createRef());
    }

    return (
      <div
        key={nodeId}
        ref={cardRefs.current.get(nodeId)!}
        data-card-id={nodeId}
        className="absolute bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 border-2 border-blue-200 dark:border-blue-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'top left',
          width: '300px'
        }}
        onClick={() => setSelectedNode(nodeId)}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
                {company.logo ? (
                  <img
                    src={company.logo}
                    alt={`${company.name} logo`}
                    className="w-full h-full object-contain rounded-lg"
                  />
                ) : (
                  <Building2 className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {company.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {company.code}
                </p>
              </div>
            </div>
            <StatusBadge status={company.status} />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <School className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700 dark:text-gray-300">
                {company.schools.length} Schools
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700 dark:text-gray-300">
                {company.schools.reduce((acc, s) => acc + s.branch_count, 0)} Branches
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <GraduationCap className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700 dark:text-gray-300">
                {company.schools.reduce((acc, s) => acc + s.student_count, 0)} Students
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700 dark:text-gray-300">
                Active
              </span>
            </div>
          </div>

          {/* UI GATING: Show action buttons based on permissions */}
          <div className="mt-4 flex justify-between items-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNodeExpansion(nodeId);
              }}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
            >
              {expandedNodes.has(nodeId) ? 'Collapse' : 'Expand'} Schools
            </button>
            
            {canCreateSchool && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveView('schools');
                }}
                leftIcon={<Plus className="h-3 w-3" />}
              >
                Add School
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render school card
  const renderSchoolCard = (school: SchoolData) => {
    const nodeId = `school-${school.id}`;
    const position = nodePositions.get(nodeId);
    if (!position) return null;

    if (!cardRefs.current.has(nodeId)) {
      cardRefs.current.set(nodeId, React.createRef());
    }

    return (
      <div
        key={nodeId}
        ref={cardRefs.current.get(nodeId)!}
        data-card-id={nodeId}
        className="absolute bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border-2 border-green-200 dark:border-green-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'top left',
          width: '280px'
        }}
        onClick={() => setSelectedNode(nodeId)}
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
                {school.logo ? (
                  <img
                    src={school.logo}
                    alt={`${school.name} logo`}
                    className="w-full h-full object-contain rounded-lg"
                  />
                ) : (
                  <School className="w-5 h-5" />
                )}
              </div>
              <div>
                <h4 className="text-md font-bold text-gray-900 dark:text-white">
                  {school.name}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {school.code}
                </p>
              </div>
            </div>
            <StatusBadge status={school.status} size="xs" />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div className="flex items-center space-x-1">
              <MapPin className="w-3 h-3 text-gray-500" />
              <span className="text-gray-700 dark:text-gray-300">
                {school.branch_count} Branches
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <GraduationCap className="w-3 h-3 text-gray-500" />
              <span className="text-gray-700 dark:text-gray-300">
                {school.student_count} Students
              </span>
            </div>
          </div>

          {/* UI GATING: Show action buttons based on permissions */}
          <div className="flex justify-between items-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNodeExpansion(nodeId);
              }}
              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 text-xs font-medium"
            >
              {expandedNodes.has(nodeId) ? 'Hide' : 'Show'} Branches
            </button>
            
            <div className="flex space-x-1">
              {can('modify_school', school.id) && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Open school edit modal
                    setActiveView('schools');
                  }}
                  className="h-6 w-6 p-0"
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              )}
              
              {canCreateBranch && can('create_branch', school.id) && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveView('branches');
                  }}
                  className="h-6 w-6 p-0"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render branch card
  const renderBranchCard = (branch: BranchData) => {
    const nodeId = `branch-${branch.id}`;
    const position = nodePositions.get(nodeId);
    if (!position) return null;

    if (!cardRefs.current.has(nodeId)) {
      cardRefs.current.set(nodeId, React.createRef());
    }

    return (
      <div
        key={nodeId}
        ref={cardRefs.current.get(nodeId)!}
        data-card-id={nodeId}
        className="absolute bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 border-2 border-purple-200 dark:border-purple-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'top left',
          width: '260px'
        }}
        onClick={() => setSelectedNode(nodeId)}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-sm font-bold text-gray-900 dark:text-white">
                  {branch.name}
                </h5>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {branch.code}
                </p>
              </div>
            </div>
            <StatusBadge status={branch.status} size="xs" />
          </div>

          <div className="text-xs text-gray-700 dark:text-gray-300 mb-3">
            <div className="flex items-center space-x-1">
              <GraduationCap className="w-3 h-3 text-gray-500" />
              <span>{branch.student_count} Students</span>
            </div>
          </div>

          {/* UI GATING: Show edit button based on permissions */}
          {can('modify_branch', branch.id) && (
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveView('branches');
                }}
                className="h-6 w-6 p-0"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render connections between nodes
  const renderConnections = () => {
    if (!organizationData) return null;

    const connections: JSX.Element[] = [];

    // Company to schools connections
    if (expandedNodes.has('company')) {
      organizationData.schools.forEach(school => {
        const schoolNodeId = `school-${school.id}`;
        const companyPos = nodePositions.get('company');
        const schoolPos = nodePositions.get(schoolNodeId);

        if (companyPos && schoolPos) {
          const path = generateConnectionPath(
            companyPos,
            schoolPos,
            120, // Company card height
            100, // School card height
            100  // Gap
          );

          connections.push(
            <path
              key={`company-${school.id}`}
              d={path}
              stroke="#3B82F6"
              strokeWidth="2"
              fill="none"
              className="opacity-60"
            />
          );
        }
      });
    }

    // Schools to branches connections
    organizationData.schools.forEach(school => {
      const schoolNodeId = `school-${school.id}`;
      if (expandedNodes.has(schoolNodeId) && school.branches) {
        school.branches.forEach(branch => {
          const branchNodeId = `branch-${branch.id}`;
          const schoolPos = nodePositions.get(schoolNodeId);
          const branchPos = nodePositions.get(branchNodeId);

          if (schoolPos && branchPos) {
            const path = generateConnectionPath(
              schoolPos,
              branchPos,
              100, // School card height
              80,  // Branch card height
              100  // Gap
            );

            connections.push(
              <path
                key={`${school.id}-${branch.id}`}
                d={path}
                stroke="#10B981"
                strokeWidth="2"
                fill="none"
                className="opacity-60"
              />
            );
          }
        });
      }
    });

    return connections;
  };

  // Loading state
  if (isAccessControlLoading || isLoadingOrg) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Loading Organization
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Fetching your organization structure and permissions...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (orgError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Error Loading Organization
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {orgError instanceof Error ? orgError.message : 'Failed to load organization data'}
          </p>
          <Button onClick={() => refetchOrganization()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header with User Context Info */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Organization Management
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                Manage your organization structure, schools, branches, and personnel
              </p>
            </div>
            
            {/* User Context Display */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="text-sm">
                <div className="font-medium text-gray-900 dark:text-white mb-1">Your Access Level</div>
                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    {isEntityAdmin && <Crown className="w-3 h-3 text-purple-500" />}
                    {isSubEntityAdmin && <Shield className="w-3 h-3 text-blue-500" />}
                    {isSchoolAdmin && <School className="w-3 h-3 text-green-500" />}
                    {isBranchAdmin && <MapPin className="w-3 h-3 text-orange-500" />}
                    <span className="capitalize">
                      {getUserContext()?.adminLevel?.replace('_', ' ') || 'Unknown'}
                    </span>
                  </div>
                  {!isEntityAdmin && !isSubEntityAdmin && (
                    <div className="text-amber-600 dark:text-amber-400">
                      Limited scope access
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Tab Navigation */}
        <Tabs value={activeView} onValueChange={(value) => setActiveView(value as any)}>
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${accessibleTabs.length}, 1fr)` }}>
            {accessibleTabs.map(tab => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex items-center gap-2"
                  disabled={tab.comingSoon}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Tab Contents */}
          <TabsContent value="structure" className="mt-6">
            {/* Organization Structure View */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              {/* Controls */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Organization Structure
                    </h2>
                    {!isEntityAdmin && !isSubEntityAdmin && (
                      <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                        <Info className="h-4 w-4" />
                        <span>Showing your assigned scope only</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setZoomLevel(prev => Math.max(0.3, prev - 0.1))}
                      disabled={zoomLevel <= 0.3}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[60px] text-center">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setZoomLevel(prev => Math.min(1.5, prev + 0.1))}
                      disabled={zoomLevel >= 1.5}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchOrganization()}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Organization Chart */}
              <div className="relative overflow-auto" style={{ height: '600px' }}>
                <div
                  ref={containerRef}
                  className="relative"
                  style={{
                    width: `${svgDimensions.width}px`,
                    height: `${svgDimensions.height}px`,
                    minWidth: '100%',
                    minHeight: '100%'
                  }}
                >
                  {/* SVG for connections */}
                  <svg
                    className="absolute inset-0 pointer-events-none"
                    width={svgDimensions.width}
                    height={svgDimensions.height}
                  >
                    {renderConnections()}
                  </svg>

                  {/* Render nodes */}
                  {organizationData && (
                    <>
                      {renderCompanyCard(organizationData)}
                      
                      {expandedNodes.has('company') && organizationData.schools.map(school => (
                        <React.Fragment key={school.id}>
                          {renderSchoolCard(school)}
                          
                          {expandedNodes.has(`school-${school.id}`) && school.branches?.map(branch => 
                            renderBranchCard(branch)
                          )}
                        </React.Fragment>
                      ))}
                    </>
                  )}
                </div>

                {/* Scroll Navigator */}
                <ScrollNavigator
                  scrollContainerRef={containerRef}
                  position="right"
                  offset={20}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="schools" className="mt-6">
            {canViewTab('schools') ? (
              <SchoolsTab companyId={companyId!} refreshData={refetchOrganization} />
            ) : (
              <div className="text-center py-8">
                <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  You don't have permission to view schools
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="branches" className="mt-6">
            {canViewTab('branches') ? (
              <BranchesTab companyId={companyId!} refreshData={refetchOrganization} />
            ) : (
              <div className="text-center py-8">
                <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  You don't have permission to view branches
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="admins" className="mt-6">
            {canViewTab('admins') ? (
              <AdminsPage companyId={companyId!} />
            ) : (
              <div className="text-center py-8">
                <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  You don't have permission to view administrators
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="teachers" className="mt-6">
            {canViewTab('teachers') ? (
              <TeachersTab companyId={companyId!} refreshData={refetchOrganization} />
            ) : (
              <div className="text-center py-8">
                <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  You don't have permission to view teachers
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="students" className="mt-6">
            {canViewTab('students') ? (
              <StudentsTab companyId={companyId!} refreshData={refetchOrganization} />
            ) : (
              <div className="text-center py-8">
                <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  You don't have permission to view students
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}