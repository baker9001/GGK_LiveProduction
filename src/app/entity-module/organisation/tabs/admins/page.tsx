import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../../../../components/shared/Button';

// Placeholder components (will be created in later steps)
const AdminListTable = () => (
  <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Admin List Table (Placeholder)</h3>
    <p className="text-gray-600 dark:text-gray-400 mt-2">This will display a list of all administrators.</p>
  </div>
);
const AdminHierarchyTree = () => (
  <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Admin Hierarchy Tree (Placeholder)</h3>
    <p className="text-gray-600 dark:text-gray-400 mt-2">This will visualize the admin hierarchy.</p>
  </div>
);
const AdminAuditLogsPanel = () => (
  <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Admin Audit Logs Panel (Placeholder)</h3>
    <p className="text-gray-600 dark:text-gray-400 mt-2">This will display audit logs for admin activities.</p>
  </div>
);

interface AdminsPageProps {
  companyId: string; // Assuming companyId is passed from parent route
}

export default function AdminsPage({ companyId }: AdminsPageProps) {
  const [viewMode, setViewMode] = useState<'list' | 'hierarchy' | 'audit'>('list');

  // TODO: Replace with actual useAdminPermissions() hook
  const canCreateAdmin = true; // Mock for now

  return (
    <div className="p-6 space-y-6">
      {/* Header and Action Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Management</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Manage administrators, their roles, and access within your organization.</p>
        </div>
        {canCreateAdmin && (
          <Button
            onClick={() => console.log('Open Create Admin Modal')} // Placeholder action
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Create Admin
          </Button>
        )}
      </div>

      {/* View Mode Toggles */}
      <div className="flex space-x-3 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <Button
          variant={viewMode === 'list' ? 'default' : 'ghost'}
          onClick={() => setViewMode('list')}
          className="flex-1"
        >
          List View
        </Button>
        <Button
          variant={viewMode === 'hierarchy' ? 'default' : 'ghost'}
          onClick={() => setViewMode('hierarchy')}
          className="flex-1"
        >
          Hierarchy View
        </Button>
        <Button
          variant={viewMode === 'audit' ? 'default' : 'ghost'}
          onClick={() => setViewMode('audit')}
          className="flex-1"
        >
          Audit Logs
        </Button>
      </div>

      {/* Conditional Rendering of Views */}
      {viewMode === 'list' && <AdminListTable />}
      {viewMode === 'hierarchy' && <AdminHierarchyTree />}
      {viewMode === 'audit' && <AdminAuditLogsPanel />}
    </div>
  );
}