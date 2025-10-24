/**
 * File: /src/app/entity-module/configuration/page.tsx
 * 
 * Entity Configuration Management Page
 * Manages Years/Grade, Academic Year, and Departments
 * 
 * Dependencies:
 *   - @/components/shared/Tabs
 *   - @/hooks/useAccessControl
 *   - @/contexts/UserContext
 *   - ./tabs/* (all tab components)
 * 
 * Modified: Removed Class Sections tab as requested
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  GraduationCap, 
  Calendar, 
  Building2, 
  AlertTriangle, 
  Loader2,
  Info,
  Shield
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/shared/Tabs';
import { useAccessControl } from '../../../hooks/useAccessControl';
import { useUser } from '../../../contexts/UserContext';
import { toast } from '../../../components/shared/Toast';
import { GradeLevelsTab } from './tabs/GradeLevelsTab';
import { AcademicYearsTab } from './tabs/AcademicYearsTab';
import { DepartmentsTab } from './tabs/DepartmentsTab';

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
            {(isEntityAdmin || isSubEntityAdmin) && (
              <div className="flex items-center gap-1 px-3 py-1 bg-[#8CC63F]/10 rounded-lg">
                <Shield className="w-4 h-4 text-[#8CC63F]" />
                <span className="text-sm font-medium text-[#8CC63F]">
                  Full Access
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Access Information */}
        <div className="bg-gradient-to-r from-[#8CC63F]/10 to-[#7AB635]/10 dark:from-[#8CC63F]/20 dark:to-[#7AB635]/20 border border-[#8CC63F]/30 dark:border-[#8CC63F]/40 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Info className="h-5 w-5 text-[#7AB635] dark:text-[#8CC63F]" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Configuration Access
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {isEntityAdmin || isSubEntityAdmin 
                  ? "You have full access to configure all organizational settings and academic structures."
                  : isSchoolAdmin
                    ? "You can configure settings for your assigned schools and their academic structures."
                    : isBranchAdmin
                      ? "You can configure settings for your assigned branches."
                      : "Your configuration access may be limited based on your role."
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="grade-levels">
            <GraduationCap className="w-4 h-4 mr-2" />
            Grade Levels
          </TabsTrigger>
          <TabsTrigger value="academic-years">
            <Calendar className="w-4 h-4 mr-2" />
            Academic Years
          </TabsTrigger>
          <TabsTrigger value="departments">
            <Building2 className="w-4 h-4 mr-2" />
            Departments
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="grade-levels">
          <GradeLevelsTab companyId={userCompanyId} />
        </TabsContent>

        <TabsContent value="academic-years">
          <AcademicYearsTab companyId={userCompanyId} />
        </TabsContent>

        <TabsContent value="departments">
          <DepartmentsTab companyId={userCompanyId} />
        </TabsContent>
      </Tabs>

      {/* Development Status */}
      <div className="bg-[#8CC63F]/10 dark:bg-[#8CC63F]/20 border border-[#8CC63F]/30 dark:border-[#8CC63F]/40 rounded-lg p-6">
        <div className="flex items-center gap-2 text-[#5A8A2C] dark:text-[#8CC63F] mb-3">
          <Settings className="w-5 h-5" />
          <span className="font-semibold">Configuration Management</span>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
          Complete configuration management system for academic and organizational structure.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <GraduationCap className="w-4 h-4 text-[#8CC63F]" />
            <span className="text-gray-700 dark:text-gray-300">Grade Levels Management</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-[#8CC63F]" />
            <span className="text-gray-700 dark:text-gray-300">Academic Years Planning</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="w-4 h-4 text-[#8CC63F]" />
            <span className="text-gray-700 dark:text-gray-300">Department Structure</span>
          </div>
        </div>
      </div>
    </div>
  );
}