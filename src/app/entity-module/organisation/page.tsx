/**
 * File: /src/app/entity-module/organisation/page.tsx
 * 
 * Organization Management Page with Standard Tabs
 * Uses the standard Tabs components for consistent UI
 */

'use client';

import React, { useState } from 'react';
import { 
  Building2, School, MapPin, Shield, Users, GraduationCap,
  Network, BarChart3, Settings, Plus, Search, Filter
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/shared/Tabs';
import { Button } from '../../../components/shared/Button';
import { useUser } from '../../../contexts/UserContext';
import { getAuthenticatedUser } from '../../../lib/auth';

// Import tab components
import OrganizationStructureTab from './tabs/organization-structure/page';
import SchoolsTab from './tabs/schools/page';
import BranchesTab from './tabs/branches/page';
import AdminsPage from './tabs/admins/page';
import TeachersTab from './tabs/teachers/page';
import StudentsTab from './tabs/students/page';

export default function OrganisationManagement() {
  const { user } = useUser();
  const authenticatedUser = getAuthenticatedUser();
  
  // Get company ID from user context
  const companyId = user?.userType === 'entity' ? 
    authenticatedUser?.id || '' : // This would need to be mapped to actual company_id
    'demo-company-id'; // Fallback for demo

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Organization Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your organization's structure, schools, branches, and personnel
        </p>
      </div>

      {/* Standard Tabs Component */}
      <Tabs defaultValue="organization-structure" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="organization-structure" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Organization Structure
          </TabsTrigger>
          <TabsTrigger value="schools" className="flex items-center gap-2">
            <School className="h-4 w-4" />
            Schools
          </TabsTrigger>
          <TabsTrigger value="branches" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Branches
          </TabsTrigger>
          <TabsTrigger value="admins" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Admins
          </TabsTrigger>
          <TabsTrigger value="teachers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Teachers
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Students
          </TabsTrigger>
        </TabsList>

        <TabsContent value="organization-structure">
          <OrganizationStructureTab 
            companyId={companyId}
            refreshData={refreshData}
          />
        </TabsContent>

        <TabsContent value="schools">
          <SchoolsTab 
            companyId={companyId}
            refreshData={refreshData}
          />
        </TabsContent>

        <TabsContent value="branches">
          <BranchesTab 
            companyId={companyId}
            refreshData={refreshData}
          />
        </TabsContent>

        <TabsContent value="admins">
          <AdminsPage 
            companyId={companyId}
          />
        </TabsContent>

        <TabsContent value="teachers">
          <TeachersTab 
            companyId={companyId}
            refreshData={refreshData}
          />
        </TabsContent>

        <TabsContent value="students">
          <StudentsTab 
            companyId={companyId}
            refreshData={refreshData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}