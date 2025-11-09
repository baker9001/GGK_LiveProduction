// /src/app/system-admin/tenants/page.tsx

import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import ModulePageShell from '../../../components/layout/ModulePageShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/shared/Tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/shared/Card';
import { Button } from '../../../components/shared/Button';
import CompaniesTab from './tabs/CompaniesTab';
import SchoolsTab from './tabs/SchoolsTab';
import BranchesTab from './tabs/BranchesTab';
import { RLSDiagnostic } from '../../../components/shared/RLSDiagnostic';

export default function TenantsPage() {
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  return (
    <ModulePageShell
      title="Tenants Management"
      subtitle="Oversee companies, schools, and branches with the refreshed GGK EdTech design system."
      actions={(
        <Button
          variant={showDiagnostics ? 'secondary' : 'outline'}
          leftIcon={<AlertCircle className="h-4 w-4" />}
          onClick={() => setShowDiagnostics((prev) => !prev)}
        >
          {showDiagnostics ? 'Hide Diagnostics' : 'Show Diagnostics'}
        </Button>
      )}
    >
      {showDiagnostics && (
        <Card variant="outlined" className="bg-card/95 backdrop-blur-sm">
          <CardHeader accent>
            <CardTitle>RLS Diagnostics</CardTitle>
            <CardDescription>
              Review row-level security checks and recent violations across tenant resources.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RLSDiagnostic />
          </CardContent>
        </Card>
      )}

      <Card variant="outlined" className="bg-card/95 backdrop-blur-sm">
        <CardHeader accent>
          <CardTitle>Tenant Directory</CardTitle>
          <CardDescription>
            Navigate between companies, schools, and branches with a cohesive visual hierarchy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-24">
          <Tabs defaultValue="companies" className="space-y-16">
            <TabsList className="bg-card-elevated border border-filter rounded-ggk-full p-6 gap-8 shadow-theme-soft">
              <TabsTrigger value="companies">Companies</TabsTrigger>
              <TabsTrigger value="schools">Schools</TabsTrigger>
              <TabsTrigger value="branches">Branches</TabsTrigger>
            </TabsList>

            <TabsContent value="companies" className="mt-12">
              <CompaniesTab />
            </TabsContent>

            <TabsContent value="schools" className="mt-12">
              <SchoolsTab />
            </TabsContent>

            <TabsContent value="branches" className="mt-12">
              <BranchesTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </ModulePageShell>
  );
}