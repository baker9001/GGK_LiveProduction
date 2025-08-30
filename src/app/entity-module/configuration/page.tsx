/**
 * File: /src/app/entity-module/configuration/page.tsx
 * 
 * Entity Configuration Management Page
 * Manages Grade Levels, Academic Years, Departments, and Class Sections
 * 
 * Dependencies:
 *   - @/components/shared/Tabs
 *   - @/hooks/useAccessControl
 *   - @/contexts/UserContext
 *   - ./tabs/* (all tab components)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  GraduationCap, 
  Calendar, 
  Building2, 
  Users, 
  AlertTriangle, 
  Loader2,
  Info,
  Shield,
  BookOpen,
  School,
  Hash,
  Clock
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/shared/Tabs';
import { useAccessControl } from '../../../hooks/useAccessControl';
import { useUser } from '../../../contexts/UserContext';
import { toast } from '../../../components/shared/Toast';
import { GradeLevelsTab } from './tabs/GradeLevelsTab';
import { AcademicYearsTab } from './tabs/AcademicYearsTab';
import { DepartmentsTab } from './tabs/DepartmentsTab';
import { ClassSectionsTab } from './tabs/ClassSectionsTab';

export default function ConfigurationPage() {
  const { user } = useUser();
  const {
    canViewTab,
    can,
    getUserContext,
    isLoading: isAccessControlLoading,
    isAuthenticated,
    isEntityAdmin,
    isSubEntityAdmin,
    isSchoolAdmin,
    isBranchAdmin,
    hasError: accessControlError,
    error: accessControlErrorMessage
  } = useAccessControl();

  const [activeTab, setActiveTab] = useState<string>('grade-levels');
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);

  // Get user context and company ID
  useEffect(() => {
    const userContext = getUserContext();
    if (userContext?.companyId) {
      setUserCompanyId(userContext.companyId);
    }
  }, [getUserContext]);

  // Access control check
  useEffect(() => {
    if (!isAccessControlLoading && !isAuthenticated) {
      toast.error('You must be logged in to access configuration');
      window.location.href = '/signin';
      return;
    }
  }, [isAccessControlLoading, isAuthenticated]);

  // Loading state
  if (isAccessControlLoading || !userCompanyId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#8CC63F] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Loading Configuration
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Checking permissions and loading data...
          </p>
        </div>
      </div>
    );
  }

  // Access control error
  if (accessControlError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-200">
                Access Control Error
              </h3>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {accessControlErrorMessage || 'Failed to load access permissions. Please try again.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if user has access to configuration module
  const canAccessConfiguration = isEntityAdmin || isSubEntityAdmin || isSchoolAdmin || isBranchAdmin;
  
  if (!canAccessConfiguration) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
            <div>
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                Access Restricted
              </h3>
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                You don't have permission to access the configuration module. Please contact your administrator.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Determine which tabs the user can access
  const canViewGradeLevels = isEntityAdmin || isSubEntityAdmin || isSchoolAdmin;
  const canViewAcademicYears = isEntityAdmin || isSubEntityAdmin || isSchoolAdmin;
  const canViewDepartments = isEntityAdmin || isSubEntityAdmin || isSchoolAdmin;
  const canViewClassSections = true; // All admin levels can view class sections

  return (
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-[#8CC63F]/20 to-[#7AB635]/20 rounded-full flex items-center justify-center">
              <Settings className="w-8 h-8 text-[#8CC63F]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Entity Configuration
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Configure academic structure, departments, and organizational settings
              </p>
            </div>
          </div>

          {/* Access Level Indicator */}
          <div className="flex items-center gap-2">
            {isEntityAdmin && (
              <div className="flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  Entity Admin
                </span>
              </div>
            )}
            {isSubEntityAdmin && (
              <div className="flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Sub-Entity Admin
                </span>
              </div>
            )}
            {isSchoolAdmin && (
              <div className="flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <School className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  School Admin
                </span>
              </div>
            )}
            {isBranchAdmin && (
              <div className="flex items-center gap-1 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Building2 className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                  Branch Admin
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Access Information */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Configuration Access Level
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {isEntityAdmin || isSubEntityAdmin 
                  ? "You have full access to configure all organizational settings and academic structures across all schools."
                  : isSchoolAdmin
                    ? "You can configure settings for your assigned schools including grade levels, academic years, and departments."
                    : isBranchAdmin
                      ? "You can configure class sections for your assigned branches and view other configuration settings."
                      : "Your configuration access is based on your assigned role and permissions."
                }
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Grade Levels</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">Configurable</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Academic Years</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">Active</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Departments</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">Organized</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Class Sections</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">Managed</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="p-6">
          <TabsList className="grid w-full grid-cols-4">
            {canViewGradeLevels && (
              <TabsTrigger value="grade-levels" className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                <span className="hidden sm:inline">Grade Levels</span>
                <span className="sm:hidden">Grades</span>
              </TabsTrigger>
            )}
            {canViewAcademicYears && (
              <TabsTrigger value="academic-years" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Academic Years</span>
                <span className="sm:hidden">Years</span>
              </TabsTrigger>
            )}
            {canViewDepartments && (
              <TabsTrigger value="departments" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span className="hidden sm:inline">Departments</span>
                <span className="sm:hidden">Depts</span>
              </TabsTrigger>
            )}
            {canViewClassSections && (
              <TabsTrigger value="class-sections" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Class Sections</span>
                <span className="sm:hidden">Sections</span>
              </TabsTrigger>
            )}
          </TabsList>
          
          <div className="mt-6">
            {canViewGradeLevels && (
              <TabsContent value="grade-levels">
                <GradeLevelsTab companyId={userCompanyId} />
              </TabsContent>
            )}

            {canViewAcademicYears && (
              <TabsContent value="academic-years">
                <AcademicYearsTab companyId={userCompanyId} />
              </TabsContent>
            )}

            {canViewDepartments && (
              <TabsContent value="departments">
                <DepartmentsTab companyId={userCompanyId} />
              </TabsContent>
            )}

            {canViewClassSections && (
              <TabsContent value="class-sections">
                <ClassSectionsTab companyId={userCompanyId} />
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>

      {/* Configuration Tips */}
      <div className="bg-gradient-to-r from-[#8CC63F]/10 to-[#7AB635]/10 border border-[#8CC63F]/30 rounded-lg p-6">
        <div className="flex items-center gap-2 text-[#7AB635] mb-3">
          <BookOpen className="w-5 h-5" />
          <span className="font-semibold">Configuration Best Practices</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-[#8CC63F] mt-0.5 flex-shrink-0" />
              <span>Set up your academic years before creating grade levels to ensure proper term alignment</span>
            </div>
            <div className="flex items-start gap-2">
              <Hash className="w-4 h-4 text-[#8CC63F] mt-0.5 flex-shrink-0" />
              <span>Use consistent naming conventions for grade levels across all schools</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Users className="w-4 h-4 text-[#8CC63F] mt-0.5 flex-shrink-0" />
              <span>Assign teachers to class sections to enable attendance and grade management</span>
            </div>
            <div className="flex items-start gap-2">
              <Building2 className="w-4 h-4 text-[#8CC63F] mt-0.5 flex-shrink-0" />
              <span>Link departments to grade levels for better academic organization</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Status */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        <p>Configuration module version 2.0 • Last updated: {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
}