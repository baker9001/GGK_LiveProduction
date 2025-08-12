// src/app/teachers-module/page.tsx

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { UserCheck, Users, BookOpen, Calendar, BarChart3 } from 'lucide-react';

interface TeachersModulePageProps {
  moduleKey?: string;
}

// Dashboard Component
function DashboardPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Teachers Module
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive teacher management and instructional support system
        </p>
      </div>

      {/* Teacher Management System Banner */}
      <div className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6 mb-8">
        <div className="flex items-center">
          <Users className="h-8 w-8 text-purple-600 dark:text-purple-400 mr-4" />
          <div>
            <h2 className="text-xl font-semibold text-purple-900 dark:text-purple-100 mb-2">
              Teacher Management System
            </h2>
            <p className="text-purple-700 dark:text-purple-300">
              This module will provide comprehensive teacher management capabilities including staff administration, curriculum management, performance tracking, and professional development tools.
            </p>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Staff Management
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Manage teacher profiles, qualifications, assignments, and administrative records.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500">
            Coming Soon
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <BookOpen className="h-6 w-6 text-green-600 dark:text-green-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Curriculum Management
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Create, manage, and assign curricula, lesson plans, and educational resources.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500">
            Coming Soon
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Calendar className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Schedule Management
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Manage teacher schedules, class assignments, and availability tracking.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500">
            Coming Soon
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <BarChart3 className="h-6 w-6 text-orange-600 dark:text-orange-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Performance Analytics
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Track teaching effectiveness, student outcomes, and professional development progress.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500">
            Coming Soon
          </div>
        </div>
      </div>
    </div>
  );
}

// Placeholder components for other pages
function StaffManagementPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Staff Management
      </h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <Users className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Staff management features are coming soon.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Manage teacher profiles, qualifications, assignments, and administrative records.
        </p>
      </div>
    </div>
  );
}

function CurriculumPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Curriculum Management
      </h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <BookOpen className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Curriculum management features are coming soon.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Create, manage, and assign curricula, lesson plans, and educational resources.
        </p>
      </div>
    </div>
  );
}

function SchedulePage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Schedule Management
      </h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <Calendar className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Schedule management features are coming soon.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Manage teacher schedules, class assignments, and availability tracking.
        </p>
      </div>
    </div>
  );
}

function PerformancePage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Performance Analytics
      </h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <BarChart3 className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Performance analytics features are coming soon.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Track teaching effectiveness, student outcomes, and professional development progress.
        </p>
      </div>
    </div>
  );
}

export default function TeachersModulePage({ moduleKey }: TeachersModulePageProps) {
  return (
    <AdminLayout moduleKey="teachers-module">
      <Routes>
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="staff" element={<StaffManagementPage />} />
        <Route path="curriculum" element={<CurriculumPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="performance" element={<PerformancePage />} />
      </Routes>
    </AdminLayout>
  );
}