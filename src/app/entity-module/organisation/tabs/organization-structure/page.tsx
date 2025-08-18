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
                   w-[260px] p-4 relative`}
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

// ===== SVG CONNECTION LINES COMPONENT =====
const SVGConnections = memo(({ 
  containerRef, 
  cardRefs, 
  expandedNodes, 
  filteredSchools, 
  branchesData,
  zoomLevel,
  visibleLevels,
  lazyLoadedData
}: {
  containerRef: React.RefObject<HTMLDivElement>;
  cardRefs: React.MutableRefObject<Map<string, React.RefObject<HTMLDivElement>>>;
  expandedNodes: Set<string>;
  filteredSchools: any[];
  branchesData: Map<string, any[]>;
  zoomLevel: number;
  visibleLevels: Set<string>;
  lazyLoadedData: Map<string, any[]>;
}) => {
  const [connections, setConnections] = useState<string[]>([]);

  const calculateConnections = useCallback(() => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const paths: string[] = [];

    // Company to Schools connections
    if (expandedNodes.has('company') && filteredSchools.length > 0) {
      const companyRef = cardRefs.current.get('company');
      if (companyRef?.current) {
        const companyRect = companyRef.current.getBoundingClientRect();
        const companyCenter = {
          x: companyRect.left + companyRect.width / 2 - containerRect.left,
          y: companyRect.bottom - containerRect.top
        };

        // Get all visible school positions
        const schoolPositions = filteredSchools.map(school => {
          const schoolRef = cardRefs.current.get(`school-${school.id}`);
          if (schoolRef?.current) {
            const schoolRect = schoolRef.current.getBoundingClientRect();
            return {
              id: school.id,
              x: schoolRect.left + schoolRect.width / 2 - containerRect.left,
              y: schoolRect.top - containerRect.top
            };
          }
          return null;
        }).filter(Boolean);

        if (schoolPositions.length > 0) {
          const verticalGap = 40;
          const horizontalY = companyCenter.y + verticalGap;

          // Vertical line from company down
          paths.push(`M ${companyCenter.x} ${companyCenter.y} L ${companyCenter.x} ${horizontalY}`);

          if (schoolPositions.length > 1) {
            // Horizontal distribution line
            const leftmostX = Math.min(...schoolPositions.map(p => p!.x));
            const rightmostX = Math.max(...schoolPositions.map(p => p!.x));
            
            // Connect to company's vertical line
            paths.push(`M ${companyCenter.x} ${horizontalY} L ${leftmostX} ${horizontalY}`);
            paths.push(`M ${leftmostX} ${horizontalY} L ${rightmostX} ${horizontalY}`);
            paths.push(`M ${rightmostX} ${horizontalY} L ${companyCenter.x} ${horizontalY}`);
          }

          // Vertical lines to each school
          schoolPositions.forEach(pos => {
            if (pos) {
              paths.push(`M ${pos.x} ${horizontalY} L ${pos.x} ${pos.y}`);
            }
          });
        }
      }
    }

    // School to Branches connections
    if (visibleLevels.has('branches')) {
      // Get all visible branches grouped by school
      const allVisibleBranches: any[] = [];
      filteredSchools.forEach(school => {
        const schoolKey = `school-${school.id}`;
        if (expandedNodes.has(schoolKey)) {
          const branches = lazyLoadedData.get(schoolKey) || branchesData.get(school.id) || [];
          branches.forEach(branch => {
            allVisibleBranches.push({ ...branch, parentSchoolId: school.id });
          });
        }
      });

      if (allVisibleBranches.length > 0) {
        // Group branches by their parent school for connection lines
        const branchesBySchool = new Map<string, any[]>();
        allVisibleBranches.forEach(branch => {
          const schoolId = branch.parentSchoolId;
          if (!branchesBySchool.has(schoolId)) {
            branchesBySchool.set(schoolId, []);
          }
          branchesBySchool.get(schoolId)!.push(branch);
        });

        // Draw connections from each school to its branches
        branchesBySchool.forEach((branches, schoolId) => {
          const schoolRef = cardRefs.current.get(`school-${schoolId}`);
          if (schoolRef?.current && branches.length > 0) {
            const schoolRect = schoolRef.current.getBoundingClientRect();
            const schoolCenter = {
              x: schoolRect.left + schoolRect.width / 2 - containerRect.left,
              y: schoolRect.bottom - containerRect.top
            };

            // Get positions of branches for this school
            const branchPositions = branches.map(branch => {
              const branchRef = cardRefs.current.get(`branch-${branch.id}`);
              if (branchRef?.current) {
                const branchRect = branchRef.current.getBoundingClientRect();
                return {
                  x: branchRect.left + branchRect.width / 2 - containerRect.left,
                  y: branchRect.top - containerRect.top
                };
              }
              return null;
            }).filter(Boolean);

            if (branchPositions.length > 0) {
              const verticalGap = 40;
              const horizontalY = schoolCenter.y + verticalGap;

              // Vertical line from school down
              paths.push(`M ${schoolCenter.x} ${schoolCenter.y} L ${schoolCenter.x} ${horizontalY}`);

              if (branchPositions.length > 1) {
                // Horizontal distribution line
                const leftmostX = Math.min(...branchPositions.map(p => p!.x));
                const rightmostX = Math.max(...branchPositions.map(p => p!.x));
                
                // Connect to school's vertical line
                paths.push(`M ${schoolCenter.x} ${horizontalY} L ${leftmostX} ${horizontalY}`);
                paths.push(`M ${leftmostX} ${horizontalY} L ${rightmostX} ${horizontalY}`);
                paths.push(`M ${rightmostX} ${horizontalY} L ${schoolCenter.x} ${horizontalY}`);
              }

              // Vertical lines to each branch
              branchPositions.forEach(pos => {
                if (pos) {
                  paths.push(`M ${pos.x} ${horizontalY} L ${pos.x} ${pos.y}`);
                }
              });
            }
          }
        });
      }
    }

    setConnections(paths);
  }, [containerRef, cardRefs, expandedNodes, filteredSchools, branchesData, visibleLevels, lazyLoadedData]);

  // Recalculate connections when layout changes
  useEffect(() => {
    const timer = setTimeout(calculateConnections, 150); // Slightly longer delay for DOM updates
    return () => clearTimeout(timer);
  }, [calculateConnections]);

  // Recalculate on window resize and scroll
  useEffect(() => {
    const handleResize = () => {
      setTimeout(calculateConnections, 150);
    };

    const handleScroll = () => {
      setTimeout(calculateConnections, 50);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [calculateConnections]);

  if (!containerRef.current) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none z-0"
      style={{
        width: '100%',
        height: '100%'
      }}
    >
      {connections.map((path, index) => (
        <path
          key={index}
          d={path}
          stroke="#9CA3AF"
          strokeWidth="2"
          fill="none"
          className="dark:stroke-gray-500"
          strokeDasharray="none"
        />
      ))}
    </svg>
  );
});

SVGConnections.displayName = 'SVGConnections';

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
  const [showInactive, setShowInactive] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [branchesData, setBranchesData] = useState<Map<string, any[]>>(new Map());

  // Refs for SVG connections
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, React.RefObject<HTMLDivElement>>>(new Map());

  // Helper to get or create card ref
  const getCardRef = useCallback((id: string) => {
    if (!cardRefs.current.has(id)) {
      cardRefs.current.set(id, React.createRef<HTMLDivElement>());
    }
    return cardRefs.current.get(id)!;
  }, []);

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
  const { data: allBranches = [], isLoading: isAllBranchesLoading } = useQuery(
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
            if (companyData?.schools) {
              companyData.schools.forEach((school: any) => {
                newExpanded.delete(`school-${school.id}`);
              });
            }
            return newExpanded;
          });
        } else if (level === 'branches') {
          // When turning OFF branches, collapse all schools
          setExpandedNodes(prevExpanded => {
            const newExpanded = new Set(prevExpanded);
            if (companyData?.schools) {
              companyData.schools.forEach((school: any) => {
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
            if (companyData?.schools) {
              companyData.schools.forEach((school: any) => {
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
              if (companyData?.schools) {
                companyData.schools.forEach((school: any) => {
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
  }, [companyData, loadNodeData]);

  // Zoom controls
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => setZoomLevel(1);
  const handleFitToPage = () => {
    // Calculate optimal zoom level based on content
    const containerWidth = 1200; // Approximate container width
    const contentWidth = Math.max(800, (filteredSchools?.length || 1) * 320);
    const optimalZoom = Math.min(1, containerWidth / contentWidth);
    setZoomLevel(Math.max(0.5, optimalZoom));
  };

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
      <div className="w-full relative">
        {/* LEVEL 1: Company/Entity */}
        {visibleLevels.has('entity') && (
          <div className="flex justify-center mb-16">
            {initialLoading ? (
              <CardSkeleton />
            ) : (
              <OrgCard
                ref={getCardRef('company')}
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

        {/* LEVEL 2: Schools */}
        {visibleLevels.has('schools') && expandedNodes.has('company') && filteredSchools?.length > 0 && !initialLoading && (
          <div className="mb-16 flex justify-center">
            <div className="flex gap-12 flex-wrap justify-center max-w-6xl">
              {filteredSchools.map((school: any) => {
                const schoolKey = `school-${school.id}`;
                const isExpanded = expandedNodes.has(schoolKey);
                const branches = lazyLoadedData.get(schoolKey) || branchesData.get(school.id) || [];
                const isSchoolLoading = loadingNodes.has(schoolKey);
                
                const hasChildren = school.branch_count > 0 || 
                                  isSchoolLoading || 
                                  branches.length > 0 ||
                                  branchesData.has(school.id);

                return (
                  <div key={school.id} className="flex flex-col items-center">
                    <OrgCard
                      ref={getCardRef(schoolKey)}
                      item={school}
                      type="school"
                      onItemClick={onItemClick}
                      onAddClick={onAddClick}
                      hasChildren={hasChildren}
                      isExpanded={isExpanded}
                      onToggleExpand={() => toggleNode(school.id, 'school')}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* LEVEL 3: Branches */}
        {visibleLevels.has('branches') && (
          <div className="mb-16 flex justify-center">
            <div className="flex gap-8 flex-wrap justify-center max-w-7xl">
              {filteredSchools.map((school: any) => {
                const schoolKey = `school-${school.id}`;
                const isExpanded = expandedNodes.has(schoolKey);
                const branches = lazyLoadedData.get(schoolKey) || branchesData.get(school.id) || [];
                const isSchoolLoading = loadingNodes.has(schoolKey);

                if (!isExpanded || (!isSchoolLoading && branches.length === 0)) {
                  return null;
                }

                return (
                  <React.Fragment key={`branches-${school.id}`}>
                    {isSchoolLoading ? (
                      <>
                        <CardSkeleton />
                        <CardSkeleton />
                      </>
                    ) : (
                      branches.map((branch: any) => (
                        <OrgCard
                          key={branch.id}
                          ref={getCardRef(`branch-${branch.id}`)}
                          item={branch}
                          type="branch"
                          onItemClick={onItemClick}
                          onAddClick={onAddClick}
                          hasChildren={false}
                          isExpanded={false}
                          onToggleExpand={() => {}}
                        />
                      ))
                    )}
                  </React.Fragment>
                );
              }).filter(Boolean)}
            </div>
          </div>
        )}

        {/* Helper messages for better UX */}
        {!expandedNodes.has('company') && filteredSchools?.length > 0 && (
          <div className="mt-8">
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
              onClick={handleFitToPage}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Fit to page"
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
          ref={chartContainerRef}
          className="p-8 w-full min-w-full h-full flex flex-col items-center relative"
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s'
          }}
        >
          {/* SVG Connection Lines Overlay */}
          <SVGConnections
            containerRef={chartContainerRef}
            cardRefs={cardRefs}
            expandedNodes={expandedNodes}
            filteredSchools={filteredSchools}
            branchesData={branchesData}
            zoomLevel={zoomLevel}
            visibleLevels={visibleLevels}
            lazyLoadedData={lazyLoadedData}
          />
          
          {/* Organization Chart Content */}
          <div className="relative z-10">
            {renderChart()}
          </div>
        </div>
      </div>
    </div>
  );
}