import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/shared/Tabs';
import UsersTab from './tabs/UsersTab';
import RolesPage from './roles/page';

export default function AdminUsersPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Users</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">Manage system administrators and their roles</p>
      </div>

      <Routes>
        <Route index element={
          <Tabs defaultValue="users" className="space-y-6">
            <TabsList>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <UsersTab />
            </TabsContent>

            <TabsContent value="roles">
              <RolesPage />
            </TabsContent>
          </Tabs>
        } />
        <Route path="roles" element={<RolesPage />} />
      </Routes>
    </div>
  );
}