///home/project/src/app/student-module/page.tsx

import React from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { GraduationCap, BookOpen, Trophy, Users } from 'lucide-react';

interface StudentModulePageProps {
  moduleKey: string;
}

export default function StudentModulePage({ moduleKey }: StudentModulePageProps) {
  return (
    <AdminLayout moduleKey={moduleKey}>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Student Module
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive student management and academic tracking system
          </p>
        </div>

        {/* Coming Soon Banner */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-8">
          <div className="flex items-center">
            <GraduationCap className="h-8 w-8 text-green-600 dark:text-green-400 mr-4" />
            <div>
              <h2 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-2">
                Student Management System
              </h2>
              <p className="text-green-700 dark:text-green-300">
                This module will provide comprehensive student management capabilities including enrollment, academic tracking, performance analytics, and student engagement tools.
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
                Student Enrollment
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Manage student registration, enrollment processes, and profile management.
            </p>
            <div className="text-sm text-gray-500 dark:text-gray-500">
              Coming Soon
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-4">
              <BookOpen className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Academic Tracking
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Track student progress, assignments, assessments, and academic performance.
            </p>
            <div className="text-sm text-gray-500 dark:text-gray-500">
              Coming Soon
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-4">
              <Trophy className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Performance Analytics
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Analyze student performance, generate reports, and identify improvement areas.
            </p>
            <div className="text-sm text-gray-500 dark:text-gray-500">
              Coming Soon
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-4">
              <GraduationCap className="h-6 w-6 text-purple-600 dark:text-purple-400 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Learning Pathways
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create personalized learning paths and track student progression through curricula.
            </p>
            <div className="text-sm text-gray-500 dark:text-gray-500">
              Coming Soon
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}