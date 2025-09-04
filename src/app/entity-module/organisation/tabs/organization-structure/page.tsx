/**
 * File: /src/app/entity-module/organisation/tabs/organization-structure/page.tsx
 * Dependencies: 
 *   - @/lib/supabase
 *   - @/lib/layout/treeLayout
 *   - @/hooks/useNodeMeasurements
 *   - @/components/forms/BranchFormContent
 *   - @/components/shared/SlideInForm
 *   - External: react, @tanstack/react-query, lucide-react, react-hot-toast
 * 
 * ENHANCED VERSION - Better Centering & Sizing
 * 
 * ✅ Enhanced Features:
 *   - Improved diagram centering in both regular and fullscreen modes
 *   - Better initial sizing and positioning
 *   - Enhanced fitToScreen logic with proper content bounds calculation
 *   - Dynamic canvas sizing with better space utilization
 *   - Smart zoom levels for optimal viewing
 *   - All original features preserved (theme, zoom, pan, shortcuts, etc.)
 * 
 * ✅ Original Features Maintained:
 *   - Theme preservation in fullscreen (respects light/dark mode)
 *   - Mouse wheel zoom with focal point
 *   - Auto click-and-drag panning on empty canvas
 *   - Trackpad pinch-to-zoom support
 *   - Comprehensive keyboard shortcuts
 *   - Visual cursor feedback (auto grab cursor)
 *   - Smooth animations and transitions
 *   - Zoom slider control
 *   - Fixed tab hierarchy logic
 * 
 * Database Tables:
 *   - companies, schools, branches, grade_levels, class_sections
 *   - companies_additional, schools_additional, branches_additional
 */

'use client';

import React, { useState, useCallback, memo, useEffect, useMemo, useRef } from 'react';
import { 
  Building2, School, MapPin, ChevronDown, ChevronUp,
  PlusCircle, Users, User, Eye, EyeOff,
  ZoomIn, ZoomOut, Maximize2, Minimize2, 
  RotateCcw, Loader2, X, GraduationCap, BookOpen, Expand,
  ToggleLeft, ToggleRight, Move, MousePointer, Navigation
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
import { BranchFormContent } from '@/components/forms/BranchFormContent';
import { SlideInForm } from '@/components/shared/SlideInForm';
import { toast } from 'react-hot-toast';

// ===== ENHANCED ZOOM/PAN HOOK WITH BETTER CENTERING =====
const useZoomPan = (
  containerRef: React.RefObject<HTMLDivElement>,
  contentRef: React.RefObject<HTMLDivElement>,
  initialZoom: number = 1,
  minZoom: number = 0.25,
  maxZoom: number = 2
) => {
  const [zoom, setZoom] = useState(initialZoom);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [cursor, setCursor] = useState<'default' | 'grab' | 'grabbing' | 'move'>('default');
  
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pinchDistanceRef = useRef<number | null>(null);

  // Enhanced zoom with focal point
  const handleZoom = useCallback((delta: number, clientX?: number, clientY?: number) => {
    if (!containerRef.current || !contentRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    // Calculate focal point (default to center if not provided)
    const focalX = clientX !== undefined ? clientX - rect.left : rect.width / 2;
    const focalY = clientY !== undefined ? clientY - rect.top : rect.height / 2;
    
    setZoom(prevZoom => {
      const newZoom = Math.max(minZoom, Math.min(maxZoom, prevZoom + delta));
      
      // Adjust pan to keep focal point stable
      if (clientX !== undefined && clientY !== undefined) {
        setPan(prevPan => {
          const zoomRatio = newZoom / prevZoom;
          return {
            x: focalX - (focalX - prevPan.x) * zoomRatio,
            y: focalY - (focalY - prevPan.y) * zoomRatio
          };
        });
      }
      
      return newZoom;
    });
  }, [containerRef, contentRef, minZoom, maxZoom]);

  // Mouse wheel handler with throttling
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    
    e.preventDefault();
    
    // Clear previous timeout
    if (wheelTimeoutRef.current) {
      clearTimeout(wheelTimeoutRef.current);
    }
    
    // Normalize wheel delta across browsers
    const delta = -e.deltaY * 0.001;
    const zoomDelta = delta * (e.shiftKey ? 0.5 : 0.25); // Slower with shift
    
    // Use requestAnimationFrame for smooth updates
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      handleZoom(zoomDelta, e.clientX, e.clientY);
    });
    
    // Debounce end of zoom
    wheelTimeoutRef.current = setTimeout(() => {
      animationFrameRef.current = null;
    }, 150);
  }, [handleZoom]);

  // Touch handlers for pinch-to-zoom
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2 && pinchDistanceRef.current) {
      e.preventDefault();
      
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const delta = (distance - pinchDistanceRef.current) * 0.003;
      
      // Calculate center point between fingers
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      
      handleZoom(delta, centerX, centerY);
      pinchDistanceRef.current = distance;
    }
  }, [handleZoom]);

  const handleTouchEnd = useCallback(() => {
    pinchDistanceRef.current = null;
  }, []);

  // Mouse handlers for panning - AUTO PAN ON CANVAS
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    
    // Check if clicking on a card element
    const target = e.target as HTMLElement;
    const clickedCard = target.closest('[data-card-id]');
    
    // If clicking on a card, don't start panning (unless space is pressed)
    if (clickedCard && !isSpacePressed) return;
    
    setIsPanning(true);
    setCursor('grabbing');
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  }, [isSpacePressed]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      // Currently panning
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      
      setPan(prevPan => ({
        x: prevPan.x + dx,
        y: prevPan.y + dy
      }));
      
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      return; // Keep grabbing cursor while panning
    }
    
    // Not panning - update cursor based on hover target
    const target = e.target as HTMLElement;
    const hoveringCard = target.closest('[data-card-id]');
    
    if (hoveringCard && !isSpacePressed) {
      // Hovering over a card (and not forcing pan mode)
      setCursor('default');
    } else {
      // Hovering over empty space or space is pressed
      setCursor('grab');
    }
  }, [isPanning, isSpacePressed]);

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      // After releasing, update cursor based on current position
      setCursor('grab'); // Default to grab since we're likely still over canvas
    }
  }, [isPanning]);

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    // When entering the chart area, set appropriate cursor
    const target = e.target as HTMLElement;
    const hoveringCard = target.closest('[data-card-id]');
    
    if (!hoveringCard || isSpacePressed) {
      setCursor('grab');
    }
  }, [isSpacePressed]);

  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
    setCursor('default');
  }, []);

  // Keyboard handlers
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Space for pan mode
    if (e.code === 'Space' && !e.repeat) {
      e.preventDefault();
      setIsSpacePressed(true);
      setCursor('grab');
    }
    
    // Zoom shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoom(0.1);
      } else if (e.key === '-') {
        e.preventDefault();
        handleZoom(-0.1);
      } else if (e.key === '0') {
        e.preventDefault();
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    }
    
    // Arrow keys for panning
    const panSpeed = e.shiftKey ? 50 : 20;
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        setPan(p => ({ ...p, y: p.y + panSpeed }));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setPan(p => ({ ...p, y: p.y - panSpeed }));
        break;
      case 'ArrowLeft':
        e.preventDefault();
        setPan(p => ({ ...p, x: p.x + panSpeed }));
        break;
      case 'ArrowRight':
        e.preventDefault();
        setPan(p => ({ ...p, x: p.x - panSpeed }));
        break;
    }
  }, [handleZoom]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') {
      setIsSpacePressed(false);
      setCursor('default');
    }
  }, []);

  // Reset view
  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setCursor('default');
  }, []);

  // Effect to attach/detach event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Add event listeners
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Initialize cursor to grab when over canvas
    setCursor('grab');

    return () => {
      // Cleanup
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (wheelTimeoutRef.current) {
        clearTimeout(wheelTimeoutRef.current);
      }
    };
  }, [containerRef, handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd, handleKeyDown, handleKeyUp]);

  return {
    zoom,
    pan,
    isPanning,
    cursor,
    setZoom,
    setPan,
    resetView,
    handleMouseEnter,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleZoom
  };
};

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

// ===== ENHANCED ORG CARD WITH REF FORWARDING AND LOGO SUPPORT =====
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
  // Helper function to get logo URL based on type and item data
  const getLogoUrl = () => {
    let logoPath = null;
    let bucketName = '';
    
    switch (type) {
      case 'company':
        logoPath = item.logo || item.additional?.logo_url || item.additional?.logo;
        bucketName = 'company-logos';
        break;
      case 'school':
        logoPath = item.logo;
        bucketName = 'school-logos';
        break;
      case 'branch':
        logoPath = item.logo;
        bucketName = 'branch-logos';
        break;
      default:
        return null;
    }
    
    if (!logoPath) return null;
    
    // If it's already a full URL, return as is
    if (logoPath.startsWith('http')) {
      return logoPath;
    }
    
    // Construct Supabase storage URL
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      console.warn('VITE_SUPABASE_URL is not defined');
      return null;
    }
    return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${logoPath}`;
  };

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
            { label: 'Grades', value: item.total_grades || 0, icon: GraduationCap },
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
            { label: 'Grades', value: item.grade_count || 0, icon: GraduationCap },
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
          nameField: 'grade_coordinator',
          stats: [
            { label: 'Sections', value: item.class_sections?.length || 0, icon: BookOpen },
            { label: 'Max/Section', value: item.max_students_per_section || 30, icon: Users },
            { label: 'Total Sections', value: item.total_sections || item.class_sections?.length || 0, icon: BookOpen }
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
          nameField: 'section_teacher',
          stats: [
            { label: 'Capacity', value: item.max_capacity || 30, icon: Users },
            { label: 'Current', value: item.current_students || 0, icon: GraduationCap },
            { label: 'Room', value: item.room_number || item.classroom_number || 'N/A', icon: Building2 }
          ]
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;
  const managerName = item.additional?.[config.nameField] || item[config.nameField];
  const logoUrl = getLogoUrl();

  // Handle click event 
  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent pan when clicking cards
    onItemClick(item, type);
  };

  // Display name based on type
  const getDisplayName = () => {
    switch (type) {
      case 'year':
        return item.grade_name || item.name;
      case 'section':
        return item.section_name || item.name;
      default:
        return item.name || item.grade_name || item.section_name;
    }
  };

  return (
    <div className="relative inline-block">
      <div 
        ref={ref}
        onClick={handleCardClick}
        className={`${config.cardBg} ${config.borderColor} rounded-xl border-2
                   hover:shadow-lg transition-all duration-200 cursor-pointer
                   min-w-[260px] max-w-[300px] flex-grow p-4 relative`}
        data-card-id={`${type}-${item.id}`}
        data-card-type={type}
      >
        {/* Header with Icon */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            {/* Logo or Icon */}
            <div className={`w-12 h-12 ${config.iconBg} rounded-lg flex items-center justify-center text-white font-bold shadow-md overflow-hidden relative bg-white`}>
              {logoUrl ? (
                <>
                  <img
                    src={logoUrl}
                    alt={`${getDisplayName()} logo`}
                    className="w-full h-full object-contain p-0.5"
                    style={{ maxWidth: '100%', maxHeight: '100%' }}
                    onError={(e) => {
                      const imgElement = e.currentTarget as HTMLImageElement;
                      imgElement.style.display = 'none';
                      const parent = imgElement.parentElement;
                      if (parent) {
                        const fallback = parent.querySelector('.logo-fallback') as HTMLElement;
                        if (fallback) {
                          fallback.style.display = 'flex';
                          fallback.classList.remove('bg-white');
                          fallback.classList.add(config.iconBg);
                        }
                      }
                    }}
                  />
                  <span className={`text-sm font-bold logo-fallback hidden items-center justify-center w-full h-full absolute inset-0 ${config.iconBg}`}>
                    {item.code?.substring(0, 2).toUpperCase() || 
                     getDisplayName()?.substring(0, 2).toUpperCase() || 
                     <Icon className="w-6 h-6" />}
                  </span>
                </>
              ) : (
                <span className={`text-sm font-bold flex items-center justify-center w-full h-full ${config.iconBg} text-white`}>
                  {item.code?.substring(0, 2).toUpperCase() || 
                   getDisplayName()?.substring(0, 2).toUpperCase() || 
                   <Icon className="w-6 h-6" />}
                </span>
              )}
            </div>
            
            {/* Title and Code */}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                {getDisplayName()}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {item.code || item.grade_code || item.section_code || `${type.charAt(0).toUpperCase()}${type.slice(1)}`}
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
        
        {/* Additional stat if present */}
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
    { id: 'years', label: 'Grade/Years', icon: GraduationCap, color: 'orange' },
    { id: 'sections', label: 'Class/Section', icon: BookOpen, color: 'indigo' }
  ];

  const getColorClasses = (color: string, isVisible: boolean) => {
    if (!isVisible) {
      return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
    }
    
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

// ===== ZOOM SLIDER COMPONENT =====
const ZoomSlider = ({ zoom, onZoomChange, min = 0.25, max = 2 }: {
  zoom: number;
  onZoomChange: (value: number) => void;
  min?: number;
  max?: number;
}) => {
  return (
    <div className="flex items-center gap-2">
      <ZoomOut className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      <input
        type="range"
        min={min * 100}
        max={max * 100}
        value={zoom * 100}
        onChange={(e) => onZoomChange(Number(e.target.value) / 100)}
        className="w-24 h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
                   [&::-webkit-slider-thumb]:bg-[#8CC63F] [&::-webkit-slider-thumb]:rounded-full 
                   [&::-webkit-slider-thumb]:hover:bg-[#7AB635] [&::-webkit-slider-thumb]:transition-colors
                   [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:bg-[#8CC63F]
                   [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-full
                   [&::-moz-range-thumb]:hover:bg-[#7AB635] [&::-moz-range-thumb]:transition-colors"
      />
      <ZoomIn className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 min-w-[3rem]">
        {Math.round(zoom * 100)}%
      </span>
    </div>
  );
};

// ===== KEYBOARD SHORTCUTS HELPER =====
const KeyboardShortcuts = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  const shortcuts = [
    { key: 'Ctrl/Cmd + Scroll', action: 'Zoom in/out' },
    { key: 'Drag Canvas', action: 'Pan view' },
    { key: 'Space + Drag', action: 'Force pan mode' },
    { key: 'Arrow Keys', action: 'Pan view' },
    { key: 'Ctrl/Cmd + 0', action: 'Reset zoom' },
    { key: 'Ctrl/Cmd + +/-', action: 'Zoom in/out' },
    { key: 'F11', action: 'Toggle fullscreen' },
    { key: 'Shift + Arrow', action: 'Fast pan' },
  ];
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        title="Keyboard shortcuts"
      >
        <Navigation className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg 
                        border border-gray-200 dark:border-gray-700 p-3 z-50 w-64">
          <h4 className="font-semibold text-sm mb-2 text-gray-900 dark:text-white">
            Keyboard Shortcuts
          </h4>
          <div className="space-y-1">
            {shortcuts.map((s, i) => (
              <div key={i} className="flex justify-between text-xs">
                <kbd className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300 font-mono">
                  {s.key}
                </kbd>
                <span className="text-gray-600 dark:text-gray-400">{s.action}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ===== MAIN COMPONENT WITH ENHANCED CENTERING =====
export default function OrganizationStructureTab({ 
  companyData,
  companyId,
  onAddClick, 
  onEditClick, 
  onItemClick,
  refreshData
}: OrgStructureProps) {
  // State management
  const [visibleLevels, setVisibleLevels] = useState<Set<string>>(
    new Set(['entity', 'schools'])  // Default: Entity and Schools visible
  );
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['company']));
  const [lazyLoadedData, setLazyLoadedData] = useState<Map<string, any[]>>(new Map());
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [layoutPositions, setLayoutPositions] = useState<Map<string, NodePosition>>(new Map());
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Branch form state
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [branchFormData, setBranchFormData] = useState<any>({});
  const [branchFormErrors, setBranchFormErrors] = useState<Record<string, string>>({});
  const [branchFormActiveTab, setBranchFormActiveTab] = useState<'basic' | 'additional' | 'contact'>('basic');
  
  // Refs for SVG connections
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, React.RefObject<HTMLDivElement>>>(new Map());
  const layoutUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check for dark mode on mount
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    
    checkDarkMode();
    
    // Observer for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  // Use the enhanced zoom/pan hook
  const {
    zoom,
    pan,
    cursor,
    setZoom,
    setPan,
    resetView,
    handleMouseEnter,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleZoom
  } = useZoomPan(scrollAreaRef, contentRef, 1, 0.25, 2);

  // Filter schools based on active/inactive toggle
  const filteredSchools = useMemo(() => {
    if (!companyData?.schools) return [];
    
    return showInactive 
      ? companyData.schools 
      : companyData.schools.filter((s: any) => s.status === 'active');
  }, [companyData?.schools, showInactive]);

  // Fetch schools for branch form dropdown
  const { data: schoolsForForm = [] } = useQuery(
    ['schools-for-form', companyId],
    async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    { enabled: !!companyId }
  );

  // Fetch complete hierarchical data including grade levels and sections
  const { data: completeHierarchyData, isLoading: isHierarchyLoading } = useQuery(
    ['complete-hierarchy', companyId, showInactive, expandedNodes],
    async () => {
      if (!companyId || !filteredSchools || filteredSchools.length === 0) return null;

      const schoolIds = filteredSchools.map((s: any) => s.id);
      
      // Fetch all branches
      let branchQuery = supabase
        .from('branches')
        .select(`
          *,
          branches_additional (*)
        `)
        .in('school_id', schoolIds)
        .order('name');
      
      if (!showInactive) {
        branchQuery = branchQuery.eq('status', 'active');
      }
      
      const { data: branches, error: branchError } = await branchQuery;
      if (branchError) throw branchError;
      
      const branchIds = branches?.map(b => b.id) || [];
      
      // Fetch grade levels (both school-level and branch-level)
      let gradeLevelsQuery = supabase
        .from('grade_levels')
        .select('*')
        .order('grade_order');

      // Build OR condition for school_id and branch_id
      if (schoolIds.length > 0 || branchIds.length > 0) {
        const conditions = [];
        
        if (schoolIds.length > 0) {
          conditions.push(`school_id.in.(${schoolIds.join(',')})`);
        }
        
        if (branchIds.length > 0) {
          conditions.push(`branch_id.in.(${branchIds.join(',')})`);
        }
        
        if (conditions.length > 0) {
          gradeLevelsQuery = gradeLevelsQuery.or(conditions.join(','));
        }
      }
      
      if (!showInactive) {
        gradeLevelsQuery = gradeLevelsQuery.eq('status', 'active');
      }
      
      const { data: gradeLevels, error: gradeError } = await gradeLevelsQuery;
      if (gradeError) throw gradeError;
      
      // Fetch class sections for all grade levels
      let classSections: any[] = [];
      if (gradeLevels && gradeLevels.length > 0) {
        const { data: sections, error: sectionError } = await supabase
          .from('class_sections')
          .select('*')
          .in('grade_level_id', gradeLevels.map(g => g.id))
          .order('class_section_order');
        
        if (sectionError) throw sectionError;
        classSections = sections || [];
      }
      
      // Build complete hierarchy
      return {
        branches: branches?.map(b => ({
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
        })) || [],
        gradeLevels: gradeLevels || [],
        classSections: classSections || []
      };
    },
    {
      enabled: !!companyId && filteredSchools.length > 0,
      staleTime: 60 * 1000,
      cacheTime: 5 * 60 * 1000
    }
  );

  // Process hierarchy data for tree building
  const processedSchoolData = useMemo(() => {
    if (!filteredSchools || !completeHierarchyData) return [];
    
    return filteredSchools.map((school: any) => {
      // Get branches for this school
      const schoolBranches = completeHierarchyData.branches.filter(b => b.school_id === school.id);
      
      // Get school-level grades (grades without branch_id but with school_id)
      const schoolGrades = completeHierarchyData.gradeLevels.filter(g => 
        g.school_id === school.id && !g.branch_id
      );
      
      // Add sections to school-level grades
      const schoolGradesWithSections = schoolGrades.map(grade => ({
        ...grade,
        class_sections: completeHierarchyData.classSections.filter(s => 
          s.grade_level_id === grade.id
        )
      }));
      
      // Process branches with their grades
      const branchesWithGrades = schoolBranches.map(branch => {
        // Get branch-level grades
        const branchGrades = completeHierarchyData.gradeLevels.filter(g => 
          g.branch_id === branch.id
        );
        
        // Add sections to branch grades
        const branchGradesWithSections = branchGrades.map(grade => ({
          ...grade,
          class_sections: completeHierarchyData.classSections.filter(s => 
            s.grade_level_id === grade.id
          )
        }));
        
        return {
          ...branch,
          grade_levels: branchGradesWithSections,
          grade_count: branchGradesWithSections.length
        };
      });
      
      return {
        ...school,
        branches: branchesWithGrades,
        grade_levels: schoolGradesWithSections, // School-level grades
        total_grades: schoolGradesWithSections.length + 
                     branchesWithGrades.reduce((sum, b) => sum + b.grade_levels.length, 0)
      };
    });
  }, [filteredSchools, completeHierarchyData]);

  // Helper to get or create card ref
  const getCardRef = useCallback((id: string) => {
    if (!cardRefs.current.has(id)) {
      cardRefs.current.set(id, React.createRef<HTMLDivElement>());
    }
    return cardRefs.current.get(id)!;
  }, []);

  // Layout configuration
  const layoutConfig: LayoutConfig = useMemo(() => ({
    gapX: 48,
    gapY: 80,
    centerParents: true,
    minCardWidth: 260,
    maxCardWidth: 300
  }), []);

  // Measure node dimensions
  const nodeDimensions = useNodeMeasurements(
    cardRefs,
    1, // Use base zoom for measurements
    [expandedNodes, visibleLevels, processedSchoolData.length, showInactive]
  );

  // Build tree structure from processed data
  const treeNodes = useMemo(() => {
    if (!companyData) return new Map();
    
    const filteredCompanyData = {
      ...companyData,
      schools: processedSchoolData
    };
    
    return buildTreeFromData(
      filteredCompanyData,
      expandedNodes,
      new Map(),
      new Map(),
      visibleLevels
    );
  }, [companyData, processedSchoolData, expandedNodes, visibleLevels]);

  // ===== ENHANCED FIT TO SCREEN WITH BETTER CENTERING =====
  const fitToScreen = useCallback(() => {
    if (!scrollAreaRef.current || !contentRef.current || layoutPositions.size === 0) return;
    
    const container = scrollAreaRef.current;
    const containerRect = container.getBoundingClientRect();
    
    // Calculate content bounds from layout positions
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    layoutPositions.forEach((pos, nodeId) => {
      const dims = nodeDimensions.get(nodeId) || { width: 260, height: 140 };
      const left = pos.x - dims.width / 2;
      const right = pos.x + dims.width / 2;
      const top = pos.y;
      const bottom = pos.y + dims.height;
      
      minX = Math.min(minX, left);
      maxX = Math.max(maxX, right);
      minY = Math.min(minY, top);
      maxY = Math.max(maxY, bottom);
    });
    
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    // Enhanced padding for better appearance
    const padding = isFullscreen ? 100 : 50;
    const availableWidth = containerRect.width - padding * 2;
    const availableHeight = containerRect.height - padding * 2;
    
    // Calculate optimal zoom with better sizing for fullscreen
    const scaleX = availableWidth / contentWidth;
    const scaleY = availableHeight / contentHeight;
    const baseScale = Math.min(scaleX, scaleY);
    
    // Enhanced scaling logic: allow larger content in fullscreen, moderate sizing in regular
    const maxZoom = isFullscreen ? 1.5 : 1.2;
    const minZoom = 0.3;
    const optimalZoom = Math.min(baseScale, maxZoom);
    
    const finalZoom = Math.max(minZoom, optimalZoom);
    
    // Calculate centered position
    const scaledContentWidth = contentWidth * finalZoom;
    const scaledContentHeight = contentHeight * finalZoom;
    
    const centerX = (containerRect.width - scaledContentWidth) / 2;
    const centerY = (containerRect.height - scaledContentHeight) / 2;
    
    // Account for content offset and center it
    const contentCenterX = (minX + maxX) / 2;
    const contentCenterY = (minY + maxY) / 2;
    
    setZoom(finalZoom);
    setPan({
      x: centerX - (contentCenterX - contentWidth / 2) * finalZoom,
      y: centerY - (contentCenterY - contentHeight / 2) * finalZoom
    });
  }, [scrollAreaRef, layoutPositions, nodeDimensions, isFullscreen, setZoom, setPan]);

  // Layout calculation with enhanced centering
  useEffect(() => {
    if (treeNodes.size === 0) return;
    
    if (layoutUpdateTimeoutRef.current) {
      clearTimeout(layoutUpdateTimeoutRef.current);
    }
    
    layoutUpdateTimeoutRef.current = setTimeout(() => {
      const dimensionsToUse = new Map<string, NodeDimensions>();
      treeNodes.forEach((node, nodeId) => {
        const measured = nodeDimensions.get(nodeId);
        dimensionsToUse.set(nodeId, measured || { width: 260, height: 140 });
      });

      const layoutEngine = new TreeLayoutEngine(treeNodes, dimensionsToUse, layoutConfig);
      const result = layoutEngine.layout('company');
      
      // Enhanced canvas sizing - make it larger for better centering
      const baseWidth = result.totalSize.width;
      const baseHeight = result.totalSize.height;
      
      // Ensure minimum canvas size for good centering
      const minCanvasWidth = 1400;
      const minCanvasHeight = 1000;
      
      const paddedSize = {
        width: Math.max(baseWidth + 200, minCanvasWidth),
        height: Math.max(baseHeight + 200, minCanvasHeight)
      };
      
      // Center content in the larger canvas
      const centerOffsetX = (paddedSize.width - baseWidth) / 2;
      const centerOffsetY = (paddedSize.height - baseHeight) / 2;
      
      const centeredPositions = new Map<string, NodePosition>();
      result.positions.forEach((pos, nodeId) => {
        centeredPositions.set(nodeId, {
          x: pos.x + centerOffsetX,
          y: pos.y + centerOffsetY
        });
      });
      
      setLayoutPositions(centeredPositions);
      setCanvasSize(paddedSize);
      
      // Enhanced initial centering - delay fitToScreen for better user experience
      if (!hasInitialized) {
        setTimeout(() => {
          fitToScreen();
          setHasInitialized(true);
        }, 150); // Slightly longer delay for smoother initialization
      }
    }, 200);
    
    return () => {
      if (layoutUpdateTimeoutRef.current) {
        clearTimeout(layoutUpdateTimeoutRef.current);
      }
    };
  }, [treeNodes, nodeDimensions, layoutConfig, hasInitialized, fitToScreen]);

  // Calculate hierarchical data
  const hierarchicalData = useMemo(() => {
    if (!processedSchoolData || processedSchoolData.length === 0) {
      return { totalSchools: 0, totalBranches: 0, totalStudents: 0, totalTeachers: 0, totalUsers: 0 };
    }
    
    const totalSchools = processedSchoolData.length;
    const totalBranches = processedSchoolData.reduce((sum: number, school: any) => 
      sum + (school.branches?.length || 0), 0
    );
    const totalStudents = processedSchoolData.reduce((sum: number, school: any) => 
      sum + (school.student_count || school.additional?.student_count || 0), 0
    );
    const totalTeachers = processedSchoolData.reduce((sum: number, school: any) => 
      sum + (school.additional?.teachers_count || 0), 0
    );
    const totalUsers = processedSchoolData.reduce((sum: number, school: any) => 
      sum + (school.additional?.admin_users_count || 0), 0
    ) + (companyData?.additional?.admin_users_count || 0);
    
    return { totalSchools, totalBranches, totalStudents, totalTeachers, totalUsers };
  }, [processedSchoolData, companyData]);

  // Handle branch editing from diagram
  const handleBranchEdit = useCallback(async (branch: any) => {
    try {
      const { data: additionalData, error } = await supabase
        .from('branches_additional')
        .select('*')
        .eq('branch_id', branch.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching branch additional data:', error);
      }
      
      const combinedData = {
        ...branch,
        ...(additionalData || branch.additional || {})
      };
      
      setBranchFormData(combinedData);
      setBranchFormErrors({});
      setEditingBranch(branch);
      setBranchFormActiveTab('basic');
      setShowBranchForm(true);
    } catch (error) {
      console.error('Error preparing branch form:', error);
      toast.error('Failed to load branch details');
    }
  }, []);

  // Handle branch form submission
  const handleBranchFormSubmit = useCallback(async () => {
    const errors: Record<string, string> = {};
    
    if (!branchFormData.name) errors.name = 'Name is required';
    if (!branchFormData.code) errors.code = 'Code is required';
    if (!branchFormData.school_id) errors.school_id = 'School is required';
    if (!branchFormData.status) errors.status = 'Status is required';
    
    if (branchFormData.branch_head_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(branchFormData.branch_head_email)) {
      errors.branch_head_email = 'Invalid email address';
    }
    
    if (Object.keys(errors).length > 0) {
      setBranchFormErrors(errors);
      toast.error('Please fix the errors before submitting');
      return;
    }
    
    try {
      const mainData = {
        name: branchFormData.name,
        code: branchFormData.code,
        school_id: branchFormData.school_id,
        status: branchFormData.status,
        address: branchFormData.address,
        notes: branchFormData.notes,
        logo: branchFormData.logo
      };
      
      const { error } = await supabase
        .from('branches')
        .update(mainData)
        .eq('id', editingBranch.id);
      
      if (error) throw error;
      
      const additionalData: any = {
        branch_id: editingBranch.id,
        student_capacity: branchFormData.student_capacity,
        current_students: branchFormData.current_students,
        teachers_count: branchFormData.teachers_count,
        active_teachers_count: branchFormData.active_teachers_count,
        branch_head_name: branchFormData.branch_head_name,
        branch_head_email: branchFormData.branch_head_email,
        branch_head_phone: branchFormData.branch_head_phone,
        building_name: branchFormData.building_name,
        floor_details: branchFormData.floor_details,
        opening_time: branchFormData.opening_time,
        closing_time: branchFormData.closing_time,
        working_days: branchFormData.working_days
      };
      
      const { error: updateError } = await supabase
        .from('branches_additional')
        .update(additionalData)
        .eq('branch_id', editingBranch.id);
      
      if (updateError?.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('branches_additional')
          .insert([additionalData]);
        
        if (insertError && insertError.code !== '23505') {
          console.error('Additional insert error:', insertError);
        }
      }
      
      toast.success('Branch updated successfully');
      setShowBranchForm(false);
      setEditingBranch(null);
      setBranchFormData({});
      setBranchFormErrors({});
      
      if (refreshData) {
        refreshData();
      }
    } catch (error) {
      console.error('Error updating branch:', error);
      toast.error('Failed to update branch');
    }
  }, [branchFormData, editingBranch, refreshData]);

  // Initial loading simulation
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Toggle node expansion
  const toggleNode = useCallback((nodeId: string, nodeType: string) => {
    const key = nodeType === 'company' ? 'company' : `${nodeType}-${nodeId}`;
    
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }, []);

  // Toggle level visibility with proper hierarchical rules
  const toggleLevel = useCallback((level: string) => {
    setVisibleLevels(prev => {
      const newSet = new Set(prev);
      
      // Entity tab can never be turned off
      if (level === 'entity' && newSet.has('entity')) {
        return prev;
      }
      
      if (newSet.has(level)) {
        // Turning OFF a level - cascade down
        newSet.delete(level);
        
        // Hierarchy: entity -> schools -> branches -> years -> sections
        if (level === 'schools') {
          // Turn off all child levels
          newSet.delete('branches');
          newSet.delete('years');
          newSet.delete('sections');
          // Collapse all schools
          setExpandedNodes(prevExpanded => {
            const newExpanded = new Set(prevExpanded);
            processedSchoolData.forEach((school: any) => {
              newExpanded.delete(`school-${school.id}`);
            });
            return newExpanded;
          });
        } else if (level === 'branches') {
          // Turn off grades and sections when turning off branches
          newSet.delete('years');
          newSet.delete('sections');
          // Collapse all branches
          setExpandedNodes(prevExpanded => {
            const newExpanded = new Set(prevExpanded);
            processedSchoolData.forEach((school: any) => {
              school.branches?.forEach((branch: any) => {
                newExpanded.delete(`branch-${branch.id}`);
              });
            });
            return newExpanded;
          });
        } else if (level === 'years') {
          // Turn off sections when turning off years/grades
          newSet.delete('sections');
          // Collapse all grade levels
          setExpandedNodes(prevExpanded => {
            const newExpanded = new Set(prevExpanded);
            Array.from(newExpanded).forEach(node => {
              if (node.startsWith('grade-')) {
                newExpanded.delete(node);
              }
            });
            return newExpanded;
          });
        }
      } else {
        // Turning ON a level - cascade up
        newSet.add(level);
        
        // Ensure parent levels are also on
        if (level === 'sections') {
          // Need years, branches, and schools
          if (!newSet.has('years')) newSet.add('years');
          if (!newSet.has('branches')) newSet.add('branches');
          if (!newSet.has('schools')) newSet.add('schools');
          
          // Expand relevant nodes
          setExpandedNodes(prevExpanded => {
            const newExpanded = new Set(prevExpanded);
            processedSchoolData.forEach((school: any) => {
              const hasGradesWithSections = (school.grade_levels && school.grade_levels.some((g: any) => g.class_sections.length > 0)) ||
                                           (school.branches && school.branches.some((b: any) => b.grade_levels.some((g: any) => g.class_sections.length > 0)));
              
              if (hasGradesWithSections) {
                newExpanded.add(`school-${school.id}`);
                // Expand grades with sections
                school.grade_levels?.forEach((grade: any) => {
                  if (grade.class_sections && grade.class_sections.length > 0) {
                    newExpanded.add(`grade-${grade.id}`);
                  }
                });
                // Expand branches with grades that have sections
                school.branches?.forEach((branch: any) => {
                  if (branch.grade_levels && branch.grade_levels.length > 0) {
                    newExpanded.add(`branch-${branch.id}`);
                    branch.grade_levels.forEach((grade: any) => {
                      if (grade.class_sections && grade.class_sections.length > 0) {
                        newExpanded.add(`grade-${grade.id}`);
                      }
                    });
                  }
                });
              }
            });
            return newExpanded;
          });
        } else if (level === 'years') {
          // Need branches and schools (grades can be under branches)
          if (!newSet.has('branches')) newSet.add('branches');
          if (!newSet.has('schools')) newSet.add('schools');
          
          // Expand schools and branches that have grades
          setExpandedNodes(prevExpanded => {
            const newExpanded = new Set(prevExpanded);
            processedSchoolData.forEach((school: any) => {
              if ((school.grade_levels && school.grade_levels.length > 0) || 
                  (school.branches && school.branches.some((b: any) => b.grade_levels.length > 0))) {
                newExpanded.add(`school-${school.id}`);
                // Also expand branches that have grades
                school.branches?.forEach((branch: any) => {
                  if (branch.grade_levels && branch.grade_levels.length > 0) {
                    newExpanded.add(`branch-${branch.id}`);
                  }
                });
              }
            });
            return newExpanded;
          });
        } else if (level === 'branches') {
          // Need schools
          if (!newSet.has('schools')) newSet.add('schools');
          
          // Expand schools with branches
          setExpandedNodes(prevExpanded => {
            const newExpanded = new Set(prevExpanded);
            processedSchoolData.forEach((school: any) => {
              if (school.branches && school.branches.length > 0) {
                newExpanded.add(`school-${school.id}`);
              }
            });
            return newExpanded;
          });
        }
      }
      
      return newSet;
    });
  }, [processedSchoolData]);

  // Toggle fullscreen - Preserve theme
  const toggleFullscreen = () => {
    const element = fullscreenContainerRef.current;
    if (!element) return;

    if (!document.fullscreenElement) {
      element.requestFullscreen().then(() => {
        setIsFullscreen(true);
        setTimeout(() => {
          fitToScreen();
        }, 300);
      }).catch(err => {
        console.error('Error entering fullscreen:', err);
        toast.error('Could not enter fullscreen mode');
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        setTimeout(() => {
          fitToScreen();
        }, 300);
      }).catch(err => {
        console.error('Error exiting fullscreen:', err);
      });
    }
  };

  // Listen for fullscreen changes and F11
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      setTimeout(() => {
        fitToScreen();
      }, 100);
    };
    
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyPress);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [fitToScreen, toggleFullscreen]);

  if (!companyData) {
    return (
      <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
        <Building2 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">No organization data available</p>
      </div>
    );
  }

  // Render the enhanced organizational chart
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

    const shouldShowConnections = visibleLevels.has('schools') && expandedNodes.has('company');

    return (
      <div 
        ref={contentRef}
        className="relative pan-area"
        style={{
          width: `${canvasSize.width}px`,
          height: `${canvasSize.height}px`,
          minHeight: '400px',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          transition: 'none',
          willChange: 'transform'
        }}
      >
        {/* Render all nodes with absolute positioning */}
        {Array.from(treeNodes.entries()).map(([nodeId, node]) => {
          const position = layoutPositions.get(nodeId);
          const dimensions = nodeDimensions.get(nodeId) || { width: 260, height: 140 };
          
          if (!position) return null;

          if (initialLoading && nodeId !== 'company') return null;
          
          const nodeTypeToLevel = {
            'company': 'entity',
            'school': 'schools', 
            'branch': 'branches',
            'year': 'years',
            'section': 'sections'
          };
          
          const levelKey = nodeTypeToLevel[node.type as keyof typeof nodeTypeToLevel];
          
          // Special handling for different node types based on their parent relationships
          if (node.type === 'branch') {
            const parentSchoolId = node.parentId;
            const isSchoolExpanded = parentSchoolId && expandedNodes.has(parentSchoolId);
            
            if (!isSchoolExpanded || !visibleLevels.has('branches')) {
              return null;
            }
          } else if (node.type === 'year') {
            // Grade levels should show when years tab is on and parent is expanded
            const parentId = node.parentId;
            const isParentExpanded = parentId && expandedNodes.has(parentId);
            
            if (!isParentExpanded || !visibleLevels.has('years')) {
              return null;
            }
          } else if (node.type === 'section') {
            // Class sections should show when sections tab is on and parent grade is expanded
            const parentGradeId = node.parentId;
            const isGradeExpanded = parentGradeId && expandedNodes.has(parentGradeId);
            
            if (!isGradeExpanded || !visibleLevels.has('sections')) {
              return null;
            }
          } else if (levelKey && !visibleLevels.has(levelKey)) {
            return null;
          }
          
          const isLoading = loadingNodes.has(nodeId);
          if (isLoading) {
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
            hasChildren = processedSchoolData?.length > 0;
            isExpanded = expandedNodes.has('company');
          } else if (node.type === 'school') {
            const schoolId = node.id.replace('school-', '');
            const school = processedSchoolData.find((s: any) => s.id === schoolId);
            item = school;
            
            // A school has children if it has branches OR grade levels (depending on visible tabs)
            const hasBranches = school?.branches && school.branches.length > 0;
            const hasGradeLevels = school?.grade_levels && school.grade_levels.length > 0;
            
            hasChildren = (hasBranches && visibleLevels.has('branches')) || 
                         (hasGradeLevels && visibleLevels.has('years'));
            isExpanded = expandedNodes.has(node.id);
          } else if (node.type === 'branch') {
            const branchId = node.id.replace('branch-', '');
            // Find branch in processed data
            for (const school of processedSchoolData) {
              const branch = school.branches?.find((b: any) => b.id === branchId);
              if (branch) {
                item = branch;
                // Branch has children if it has grade levels and years tab is visible
                hasChildren = branch.grade_levels && branch.grade_levels.length > 0 && visibleLevels.has('years');
                isExpanded = expandedNodes.has(node.id);
                break;
              }
            }
          } else if (node.type === 'year') {
            // Grade level node
            item = node.data;
            hasChildren = item?.class_sections && item.class_sections.length > 0 && visibleLevels.has('sections');
            isExpanded = expandedNodes.has(node.id);
          } else if (node.type === 'section') {
            // Class section node
            item = node.data;
            hasChildren = false; // Sections are leaf nodes
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
                onItemClick={(clickedItem, clickedType) => {
                  if (clickedType === 'branch') {
                    handleBranchEdit(clickedItem);
                  } else {
                    onItemClick(clickedItem, clickedType);
                  }
                }}
                onAddClick={onAddClick}
                hasChildren={hasChildren}
                isExpanded={isExpanded}
                onToggleExpand={() => {
                  if (node.type === 'company') {
                    setExpandedNodes(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has('company')) {
                        newSet.delete('company');
                      } else {
                        newSet.add('company');
                      }
                      return newSet;
                    });
                  } else {
                    const id = node.id.replace(`${node.type}-`, '');
                    toggleNode(id, node.type);
                  }
                }}
                hierarchicalData={node.type === 'company' ? hierarchicalData : undefined}
              />
            </div>
          );
        })}

        {/* Enhanced SVG Connections with better path handling */}
        {shouldShowConnections && (
          <svg
            className="absolute pointer-events-none z-0"
            style={{
              left: '0px',
              top: '0px',
              width: `${canvasSize.width}px`,
              height: `${canvasSize.height}px`,
              overflow: 'visible'
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
              {/* Enhanced gradient for better line appearance */}
              <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#9CA3AF" stopOpacity="0.8"/>
                <stop offset="100%" stopColor="#9CA3AF" stopOpacity="0.6"/>
              </linearGradient>
            </defs>
            {Array.from(treeNodes.entries())
              .filter(([nodeId, node]) => {
                // Enhanced filtering for cleaner connections
                if (!node.parentId) return false;
                
                const nodeTypeToLevel = {
                  'company': 'entity',
                  'school': 'schools', 
                  'branch': 'branches',
                  'year': 'years',
                  'section': 'sections'
                };
                
                const parentNode = treeNodes.get(node.parentId);
                if (!parentNode) return false;
                
                const childLevel = nodeTypeToLevel[node.type as keyof typeof nodeTypeToLevel];
                const parentLevel = nodeTypeToLevel[parentNode.type as keyof typeof nodeTypeToLevel];
                
                // Enhanced visibility logic for complex hierarchies
                if (node.type === 'branch') {
                  if (!visibleLevels.has('branches') || !expandedNodes.has(node.parentId)) {
                    return false;
                  }
                } else if (node.type === 'year') {
                  if (!visibleLevels.has('years') || !expandedNodes.has(node.parentId)) {
                    return false;
                  }
                } else if (node.type === 'section') {
                  if (!visibleLevels.has('sections') || !expandedNodes.has(node.parentId)) {
                    return false;
                  }
                } else {
                  if (!visibleLevels.has(childLevel) || !visibleLevels.has(parentLevel)) {
                    return false;
                  }
                }
                
                return true;
              })
              .map(([nodeId, node]) => {
                const parentPos = layoutPositions.get(node.parentId!);
                const childPos = layoutPositions.get(nodeId);
                const parentDim = nodeDimensions.get(node.parentId!);
                const childDim = nodeDimensions.get(nodeId);

                const parentDimensions = parentDim || { width: 260, height: 140 };
                const childDimensions = childDim || { width: 260, height: 140 };
                
                if (!parentPos || !childPos) return null;

                // Enhanced path generation with better spacing consideration
                const enhancedGapY = layoutConfig.gapY;
                const path = generateConnectionPath(
                  { x: parentPos.x, y: parentPos.y },
                  { x: childPos.x, y: childPos.y },
                  parentDimensions.height,
                  childDimensions.height,
                  enhancedGapY
                );

                // Dynamic stroke width based on hierarchy level
                const getStrokeWidth = (nodeType: string) => {
                  switch (nodeType) {
                    case 'school': return '2.5';
                    case 'branch': return '2';
                    case 'year': return '1.8';
                    case 'section': return '1.5';
                    default: return '2';
                  }
                };

                return (
                  <path
                    key={`${node.parentId}-${nodeId}`}
                    d={path}
                    stroke="url(#connectionGradient)"
                    strokeWidth={getStrokeWidth(node.type)}
                    fill="none"
                    markerEnd="url(#arrowhead)"
                    className="dark:stroke-gray-500 transition-opacity duration-200"
                    opacity="0.8"
                  />
                );
              })}
          </svg>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Main container with fullscreen ref - Preserve theme */}
      <div 
        ref={fullscreenContainerRef}
        className={`
          ${isFullscreen 
            ? `fixed inset-0 z-50 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}` 
            : 'bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 w-full'}
        `}
      >
        {/* Header - Adapt to current theme */}
        <div className={`
          ${isFullscreen 
            ? (isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900 border-b border-gray-200')
            : 'bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700'}
          p-4
        `}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <h2 className={`text-lg font-semibold ${isFullscreen && !isDarkMode ? 'text-gray-900' : ''}`}>
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

            {/* Enhanced Zoom Controls */}
            <div className="flex items-center gap-3">
              {/* Zoom Slider */}
              <ZoomSlider 
                zoom={zoom} 
                onZoomChange={setZoom}
                min={0.25}
                max={2}
              />
              
              {/* Control Buttons */}
              <div className="flex items-center gap-1 border-l pl-3 border-gray-300 dark:border-gray-600">
                <button
                  onClick={() => handleZoom(-0.1)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  disabled={zoom <= 0.25}
                  title="Zoom out (Ctrl + -)"
                >
                  <ZoomOut className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={() => handleZoom(0.1)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  disabled={zoom >= 2}
                  title="Zoom in (Ctrl + +)"
                >
                  <ZoomIn className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={fitToScreen}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Fit to screen"
                >
                  <Expand className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={resetView}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Reset view (Ctrl + 0)"
                >
                  <RotateCcw className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
                
                {/* Keyboard Shortcuts Helper */}
                <KeyboardShortcuts />
                
                <button
                  onClick={toggleFullscreen}
                  className={`
                    p-2 rounded-lg transition-colors ml-2
                    ${isFullscreen 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}
                  `}
                  title={isFullscreen ? "Exit fullscreen (F11)" : "Enter fullscreen (F11)"}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
          
          {/* Interactive Help Text */}
          <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <MousePointer className="w-3 h-3" />
              Drag empty space to pan
            </span>
            <span className="flex items-center gap-1">
              <Move className="w-3 h-3" />
              Ctrl+Scroll to zoom
            </span>
            <span className="flex items-center gap-1">
              Click cards to view details
            </span>
          </div>
        </div>

        {/* Chart Container with Enhanced Interactions */}
        <div 
          ref={scrollAreaRef}
          className={`
            overflow-hidden relative select-none
            ${isFullscreen 
              ? 'h-[calc(100vh-73px)]' 
              : 'h-[calc(100vh-300px)]'} 
            ${isDarkMode || (isFullscreen && isDarkMode) 
              ? 'bg-gradient-to-b from-gray-900/50 to-gray-800' 
              : 'bg-gradient-to-b from-gray-50 to-white'}
          `}
          style={{ cursor: cursor === 'grab' ? 'grab' : cursor === 'grabbing' ? 'grabbing' : 'default' }}
          onMouseEnter={handleMouseEnter}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {/* Main Chart */}
          <div 
            ref={chartContainerRef}
            className="absolute inset-0"
          >
            {/* Organization Chart Content */}
            {isHierarchyLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-[#8CC63F]" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">
                  Loading organization structure...
                </span>
              </div>
            ) : (
              renderChart()
            )}
          </div>
        </div>
      </div>

      {/* Branch Edit Form - Always outside of fullscreen container */}
      <SlideInForm
        title="Edit Branch"
        isOpen={showBranchForm}
        onClose={() => {
          setShowBranchForm(false);
          setEditingBranch(null);
          setBranchFormData({});
          setBranchFormErrors({});
        }}
        onSave={handleBranchFormSubmit}
      >
        <BranchFormContent
          formData={branchFormData}
          setFormData={setBranchFormData}
          formErrors={branchFormErrors}
          setFormErrors={setBranchFormErrors}
          activeTab={branchFormActiveTab}
          setActiveTab={setBranchFormActiveTab}
          schools={schoolsForForm}
          isEditing={true}
        />
      </SlideInForm>
    </>
  );
}