import React from 'react';
import ProvidersTable from './ProvidersTable';

export default function ProvidersPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Education Catalogue</h1>
        <div className="flex items-center mt-2">
          <span className="text-gray-600 dark:text-gray-400">Providers</span>
        </div>
      </div>

      <ProvidersTable />
    </div>
  );
}