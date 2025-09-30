import React from 'react';
import { Navigation } from '../../components/shared/Navigation';
import { ModuleNavigation } from '../../components/shared/ModuleNavigation';

interface TeachersModulePageProps {
  moduleKey: string;
}

export default function TeachersModulePage({ moduleKey }: TeachersModulePageProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation currentModule={moduleKey} />
      <ModuleNavigation moduleKey={moduleKey} />
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Teachers Module
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Teacher module features coming soon...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
