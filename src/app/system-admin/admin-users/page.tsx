import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/shared/Tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/shared/Card';
import ModulePageShell from '../../../components/layout/ModulePageShell';
import UsersTab from './tabs/UsersTab';
import RolesPage from './roles/page';

export default function AdminUsersPage() {
  return (
    <Routes>
      <Route index element={<AdminUsersOverview />} />
      <Route path="roles" element={<RolesStandalone />} />
    </Routes>
  );
}

function AdminUsersOverview() {
  return (
    <ModulePageShell
      title="Admin Users"
      subtitle="Manage, audit, and secure the accounts that power system administration across the GGK platform."
    >
      <Card variant="outlined" className="bg-card/95 backdrop-blur-sm">
        <CardHeader accent>
          <CardTitle>Administration Console</CardTitle>
          <CardDescription>
            Switch between administrator accounts and the permissions matrix using the refreshed GGK design system layout.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-24">
          <Tabs defaultValue="users" className="space-y-16">
            <TabsList className="bg-card-elevated border border-filter rounded-ggk-full p-6 gap-8 shadow-theme-soft">
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="roles">Roles &amp; Permissions</TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="mt-12">
              <UsersTab />
            </TabsContent>

            <TabsContent value="roles" className="mt-12">
              <div className="space-y-16">
                <RolesPage />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </ModulePageShell>
  );
}

function RolesStandalone() {
  return (
    <ModulePageShell
      title="Roles &amp; Permissions"
      subtitle="Define granular access across the system admin module with consistent styling and design tokens."
    >
      <Card variant="outlined" className="bg-card/95 backdrop-blur-sm">
        <CardContent className="space-y-16">
          <RolesPage />
        </CardContent>
      </Card>
    </ModulePageShell>
  );
}