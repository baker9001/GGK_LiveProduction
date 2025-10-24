// /src/app/system-admin/tenants/page.tsx

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/shared/Tabs';
import CompaniesTab from './tabs/CompaniesTab';  // Fixed path - removed extra 'tenants/'
import SchoolsTab from './tabs/SchoolsTab';      // Fixed path
import BranchesTab from './tabs/BranchesTab';    // Fixed path

export default function TenantsPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tenants Management</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">Manage companies, schools, and branches</p>
      </div>
      
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