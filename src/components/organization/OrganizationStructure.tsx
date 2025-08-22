// /src/components/organization/OrganizationStructure.tsx

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Building2, 
  School, 
  MapPin, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Edit2,
  Users,
  GraduationCap,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlertCircle,
  Info
} from 'lucide-react';
import { Button } from '../shared/Button';
import { usePermissions } from '../../contexts/PermissionContext';
import { useScopeFilter } from '../../hooks/useScopeFilter';
import { cn } from '../../lib/utils';

interface CompanyData {
  id: string;
  name: string;
  code?: string;
  logo?: string;
  schools: SchoolData[];
}

interface SchoolData {
  id: string;
  name: string;
  code?: string;
  logo?: string;
  student_count?: number;
  branch_count?: number;
  branches?: BranchData[];
}

interface BranchData {
  id: string;
  name: string;
  code?: string;
  logo?: string;
  student_count?: number;
  school_id: string;
}

interface OrganizationStructureProps {
  companyData: CompanyData;
  onEditSchool?: (school: SchoolData) => void;
  onEditBranch?: (branch: BranchData) => void;
  className?: string;
}

export function OrganizationStructure({
  companyData,
  onEditSchool,
  onEditBranch,
  className
}: OrganizationStructureProps) {
  const { canModify, canView } = usePermissions();
  const [expandedSchools, setExpandedSchools] = useState<Set<string>>(new Set());
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showDetails, setShowDetails] = useState(true);

  // Toggle school expansion
  const toggleSchool = (schoolId: string) => {
    setExpandedSchools(prev => {
      const newSet = new Set(prev);
      if (newSet.has(schoolId)) {
        newSet.delete(schoolId);
      } else {
        newSet.add(schoolId);
      }
      return newSet;
    });
  };

  // Zoom controls
  const zoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 2));
  const zoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
  const resetZoom = () => setZoomLevel(1);

  // Get logo URL helper
  const getLogoUrl = (path: string | null | undefined, type: 'company' | 'school' | 'branch') => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    
    const bucketMap = {
      company: 'company-logos',
      school: 'school-logos',
      branch: 'branch-logos'
    };
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `${supabaseUrl}/storage/v1/object/public/${bucketMap[type]}/${path}`;
  };

  // Calculate total stats from accessible data
  const totalStats = useMemo(() => {
    const totalSchools = companyData.schools.length;
    const totalBranches = companyData.schools.reduce((sum, school) => sum + (school.branches?.length || 0), 0);
    const totalStudents = companyData.schools.reduce((sum, school) => sum + (school.student_count || 0), 0);
    
    return { totalSchools, totalBranches, totalStudents };
  }, [companyData.schools]);

  return (
    <div className={cn("bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700", className)}>
      {/* Header with Controls */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-[#8CC63F]" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Organization Structure
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {totalStats.totalSchools} schools • {totalStats.totalBranches} branches • {totalStats.totalStudents} students
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              leftIcon={showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
            
            <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-600 rounded-md">
              <Button
                variant="ghost"
                size="sm"
                onClick={zoomOut}
                disabled={zoomLevel <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="px-2 text-sm text-gray-600 dark:text-gray-400">
                {Math.round(zoomLevel * 100)}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={zoomIn}
                disabled={zoomLevel >= 2}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetZoom}
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Organization Tree */}
      <div className="p-6 overflow-auto" style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}>
        {/* Company Node */}
        <div className="mb-6">
          <div className="flex items-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold shadow-md overflow-hidden relative">
              {companyData.logo ? (
                <>
                  <img
                    src={getLogoUrl(companyData.logo, 'company')}
                    alt={`${companyData.name} logo`}
                    className="w-full h-full object-contain p-1"
                    onError={(e) => {
                      const imgElement = e.currentTarget as HTMLImageElement;
                      imgElement.style.display = 'none';
                      const parent = imgElement.parentElement;
                      if (parent) {
                        const fallback = parent.querySelector('.logo-fallback') as HTMLElement;
                        if (fallback) {
                          fallback.style.display = 'flex';
                        }
                      }
                    }}
                  />
                  <span className="text-lg font-bold logo-fallback hidden items-center justify-center w-full h-full absolute inset-0 bg-blue-500 text-white">
                    {companyData.code?.substring(0, 2).toUpperCase() || 
                     companyData.name?.substring(0, 2).toUpperCase() || 
                     <Building2 className="w-6 h-6" />}
                  </span>
                </>
              ) : (
                <span className="text-lg font-bold">
                  {companyData.code?.substring(0, 2).toUpperCase() || 
                   companyData.name?.substring(0, 2).toUpperCase() || 
                   <Building2 className="w-6 h-6" />}
                </span>
              )}
            </div>
            
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {companyData.name}
              </h3>
              {companyData.code && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Code: {companyData.code}
                </p>
              )}
              {showDetails && (
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <School className="w-4 h-4" />
                    {totalStats.totalSchools} schools
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {totalStats.totalBranches} branches
                  </span>
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-4 h-4" />
                    {totalStats.totalStudents} students
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Schools */}
        <div className="ml-8 space-y-4">
          {companyData.schools.map((school) => {
            const isExpanded = expandedSchools.has(school.id);
            const canEditSchool = canModify('school', school.id, 'school');
            const schoolLogoUrl = getLogoUrl(school.logo, 'school');
            
            return (
              <div key={school.id} className="relative">
                {/* Connection Line */}
                <div className="absolute -left-8 top-6 w-8 h-px bg-gray-300 dark:bg-gray-600"></div>
                <div className="absolute -left-8 top-0 w-px h-6 bg-gray-300 dark:bg-gray-600"></div>
                
                {/* School Node */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold shadow-md overflow-hidden relative">
                        {schoolLogoUrl ? (
                          <>
                            <img
                              src={schoolLogoUrl}
                              alt={`${school.name} logo`}
                              className="w-full h-full object-contain p-0.5"
                              onError={(e) => {
                                const imgElement = e.currentTarget as HTMLImageElement;
                                imgElement.style.display = 'none';
                                const parent = imgElement.parentElement;
                                if (parent) {
                                  const fallback = parent.querySelector('.logo-fallback') as HTMLElement;
                                  if (fallback) {
                                    fallback.style.display = 'flex';
                                  }
                                }
                              }}
                            />
                            <span className="text-sm font-bold logo-fallback hidden items-center justify-center w-full h-full absolute inset-0 bg-green-500 text-white">
                              {school.code?.substring(0, 2).toUpperCase() || 
                               school.name?.substring(0, 2).toUpperCase() || 
                               <School className="w-5 h-5" />}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm font-bold">
                            {school.code?.substring(0, 2).toUpperCase() || 
                             school.name?.substring(0, 2).toUpperCase() || 
                             <School className="w-5 h-5" />}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {school.name}
                        </h4>
                        {school.code && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {school.code}
                          </p>
                        )}
                        {showDetails && (
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <GraduationCap className="w-3 h-3" />
                              {school.student_count || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {school.branch_count || 0} branches
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {canEditSchool && onEditSchool && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditSchool(school)}
                          leftIcon={<Edit2 className="h-4 w-4" />}
                        >
                          Edit
                        </Button>
                      )}
                      
                      {school.branches && school.branches.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSchool(school.id)}
                          leftIcon={isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        >
                          {isExpanded ? 'Collapse' : 'Expand'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Branches */}
                {isExpanded && school.branches && school.branches.length > 0 && (
                  <div className="ml-8 mt-4 space-y-3">
                    {school.branches.map((branch, branchIndex) => {
                      const canEditBranch = canModify('branch', branch.id, 'branch');
                      const branchLogoUrl = getLogoUrl(branch.logo, 'branch');
                      const isLastBranch = branchIndex === school.branches!.length - 1;
                      
                      return (
                        <div key={branch.id} className="relative">
                          {/* Connection Lines */}
                          <div className="absolute -left-8 top-4 w-8 h-px bg-gray-300 dark:bg-gray-600"></div>
                          <div className={cn(
                            "absolute -left-8 w-px bg-gray-300 dark:bg-gray-600",
                            isLastBranch ? "top-0 h-4" : "top-0 h-full"
                          )}></div>
                          
                          {/* Branch Node */}
                          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center text-white font-bold shadow-md overflow-hidden relative">
                                  {branchLogoUrl ? (
                                    <>
                                      <img
                                        src={branchLogoUrl}
                                        alt={`${branch.name} logo`}
                                        className="w-full h-full object-contain p-0.5"
                                        onError={(e) => {
                                          const imgElement = e.currentTarget as HTMLImageElement;
                                          imgElement.style.display = 'none';
                                          const parent = imgElement.parentElement;
                                          if (parent) {
                                            const fallback = parent.querySelector('.logo-fallback') as HTMLElement;
                                            if (fallback) {
                                              fallback.style.display = 'flex';
                                            }
                                          }
                                        }}
                                      />
                                      <span className="text-xs font-bold logo-fallback hidden items-center justify-center w-full h-full absolute inset-0 bg-purple-500 text-white">
                                        {branch.code?.substring(0, 2).toUpperCase() || 
                                         branch.name?.substring(0, 2).toUpperCase() || 
                                         <MapPin className="w-4 h-4" />}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-xs font-bold">
                                      {branch.code?.substring(0, 2).toUpperCase() || 
                                       branch.name?.substring(0, 2).toUpperCase() || 
                                       <MapPin className="w-4 h-4" />}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex-1">
                                  <h5 className="font-medium text-gray-900 dark:text-white">
                                    {branch.name}
                                  </h5>
                                  {branch.code && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                      {branch.code}
                                    </p>
                                  )}
                                  {showDetails && (
                                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                      <span className="flex items-center gap-1">
                                        <GraduationCap className="w-3 h-3" />
                                        {branch.student_count || 0}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {canEditBranch && onEditBranch && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onEditBranch(branch)}
                                  leftIcon={<Edit2 className="h-3 w-3" />}
                                >
                                  Edit
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {companyData.schools.length === 0 && (
          <div className="text-center py-12">
            <School className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Schools Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This company doesn't have any schools yet, or you don't have access to view them.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}