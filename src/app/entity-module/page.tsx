//home/project/src/app/entity-module/page.tsx

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Building2, Users, Settings, BarChart3 } from 'lucide-react';
import OrganisationPage from './organisation/page';

interface EntityModulePageProps {
  moduleKey: string;
}

export default function EntityModulePage({ moduleKey }: EntityModulePageProps) {
  return (
    <AdminLayout moduleKey={moduleKey}>
      <Routes>
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<EntityDashboard />} />
        <Route path="organisation/*" element={<OrganisationPage />} />
      </Routes>
    </AdminLayout>
  );
}

// Dashboard component for the Entity Module
function EntityDashboard() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Entity Module Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage organizational entities, hierarchies, and relationships
        </p>
      </div>

      {/* Coming Soon Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
        <div className="flex items-center">
          <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400 mr-4" />
          <div>
            <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Entity Management System
            </h2>
            <p className="text-blue-700 dark:text-blue-300">
              This module provides comprehensive entity management capabilities including organizational structure, entity relationships, and administrative controls.
            </p>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Building2 className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Organisation Management
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Create and manage organizational hierarchies, departments, and business units.
          </p>
          <div className="text-sm text-green-600 dark:text-green-400 font-medium">
            Available
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Users className="h-6 w-6 text-green-600 dark:text-green-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Entity Relationships
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Define and manage relationships between different organizational entities.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500">
            Coming Soon
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Settings className="h-6 w-6 text-purple-600 dark:text-purple-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Entity Configuration
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Configure entity properties, permissions, and access controls.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500">
            Coming Soon
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <BarChart3 className="h-6 w-6 text-orange-600 dark:text-orange-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Entity Analytics
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Monitor entity performance, usage statistics, and organizational metrics.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500">
            Coming Soon
          </div>
        </div>
      </div>
    </div>
  );
}