// /src/app/system-admin/tenants/page.tsx

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/shared/Tabs';
import CompaniesTab from './tabs/CompaniesTab';
import SchoolsTab from './tabs/SchoolsTab';
import BranchesTab from './tabs/BranchesTab';
import { RLSDiagnostic } from '../../../components/shared/RLSDiagnostic';
import { AlertCircle } from 'lucide-react';

export default function TenantsPage() {
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tenants Management</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">Manage companies, schools, and branches</p>
          </div>
          <button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#99C93B] dark:text-[#AAD775] hover:bg-[#E8F5DC] dark:hover:bg-[#5D7E23]/20 rounded-lg transition-colors"
          >
            <AlertCircle className="w-4 h-4" />
            {showDiagnostics ? 'Hide' : 'Show'} Diagnostics
          </button>
        </div>
      </div>

      {showDiagnostics && (
        <div className="mb-6">
          <RLSDiagnostic />
        </div>
      )}

      <Tabs defaultValue="companies" className="space-y-6">
        <TabsList>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="schools">Schools</TabsTrigger>
          <TabsTrigger value="branches">Branches</TabsTrigger>
        </TabsList>

        <TabsContent value="companies">
          <CompaniesTab />
        </TabsContent>

        <TabsContent value="schools">
          <SchoolsTab />
        </TabsContent>

        <TabsContent value="branches">
          <BranchesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}