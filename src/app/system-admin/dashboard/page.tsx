// /src/app/system-admin/dashboard/page.tsx

import React, { useState } from 'react';
import clsx from 'clsx';
import { Building2, Users, Key, ClipboardList, FlaskConical } from 'lucide-react';
import { Button } from '../../../components/shared/Button';
import { TestAnyUserModal } from '../../../components/admin/TestAnyUserModal';
import { getRealAdminUser, isInTestMode } from '../../../lib/auth';
import { getPreferredName, getTimeBasedGreeting } from '../../../lib/greeting';

export default function DashboardPage() {
  const [showTestModal, setShowTestModal] = useState(false);

  const realAdmin = getRealAdminUser();
  const isSSA = realAdmin?.role === 'SSA';
  const inTestMode = isInTestMode();

  const greeting = getTimeBasedGreeting();
  const preferredName = getPreferredName(realAdmin?.name) ?? 'Admin';

  return (
    <div className="p-6 space-y-6">
      {/* Header with Test Mode Button */}
      <section
        className={clsx(
          'relative overflow-hidden rounded-2xl border border-gray-200',
          'bg-gradient-to-r from-indigo-50 via-white to-purple-50 p-6 shadow-sm',
          'dark:border-gray-700 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950'
        )}
        aria-live="polite"
      >
        <div
          className={clsx(
            'pointer-events-none absolute -right-12 top-0 hidden h-40 w-40 rounded-full',
            'bg-indigo-200/50 blur-3xl sm:block dark:bg-indigo-500/10'
          )}
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
              {greeting}, {preferredName}
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
              Your system overview is ready.
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
              Review the live metrics below to stay ahead of adoption, licensing, and activity
              trends across your organization.
            </p>
          </div>

          {/* Test Mode Button - Only show for SSA and not already in test mode */}
          {isSSA && !inTestMode && (
            <Button
              onClick={() => setShowTestModal(true)}
              variant="outline"
              leftIcon={<FlaskConical className="h-4 w-4" />}
              className={clsx(
                'border-indigo-500 text-indigo-600 backdrop-blur hover:bg-indigo-50',
                'dark:border-indigo-500/50 dark:text-indigo-200 dark:hover:bg-indigo-500/10'
              )}
            >
              Test as User
            </Button>
          )}
        </div>
      </section>

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