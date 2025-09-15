// /src/app/system-admin/dashboard/page.tsx

import React, { useState } from 'react';
import { Building2, Users, Key, ClipboardList, FlaskConical } from 'lucide-react';
import { Button } from '../../../components/shared/Button';
import { TestAnyUserModal } from '../../../components/admin/TestAnyUserModal';
import { getRealAdminUser, isInTestMode } from '../../../lib/auth';

export default function DashboardPage() {
  const [showTestModal, setShowTestModal] = useState(false);
  
  const realAdmin = getRealAdminUser();
  const isSSA = realAdmin?.role === 'SSA';
  const inTestMode = isInTestMode();

  return (
    <div className="p-6 space-y-6">
      {/* Header with Test Mode Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            System Dashboard
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Welcome back, {realAdmin?.name || 'Admin'}! Here's an overview of your system.
          </p>
        </div>
        
        {/* Test Mode Button - Only show for SSA and not already in test mode */}
        {isSSA && !inTestMode && (
          <Button
            onClick={() => setShowTestModal(true)}
            variant="outline"
            leftIcon={<FlaskConical className="h-4 w-4" />}
            className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
          >
            Test as User
          </Button>
        )}
      </div>

      {/* Simple Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Companies</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">24</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">+2 this month</p>
            </div>
            <Building2 className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">1,234</p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">+48 this week</p>
            </div>
            <Users className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Licenses</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">892</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">86% utilization</p>
            </div>
            <Key className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">License Requests</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">8</p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">Pending approval</p>
            </div>
            <ClipboardList className="h-8 w-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Activity
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-2 h-2 mt-2 bg-green-400 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-white">
                  <span className="font-medium">Sarah Johnson</span> added new company
                  <span className="font-medium ml-1">Eco Innovations</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">12:30 PM</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-2 h-2 mt-2 bg-blue-400 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-white">
                  <span className="font-medium">Mike Brown</span> updated user role
                  <span className="font-medium ml-1">Sustainable Corp</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">11:45 AM</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-2 h-2 mt-2 bg-yellow-400 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-white">
                  <span className="font-medium">John Smith</span> allocated license
                  <span className="font-medium ml-1">Green Tech Solutions</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">10:15 AM</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Test Any User Modal */}
      <TestAnyUserModal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
      />
    </div>
  );
}