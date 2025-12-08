import React from 'react';
import { Users, UserPlus, Search, Filter } from 'lucide-react';

export default function StudentsPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Students
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          View and manage all students assigned to your classes
        </p>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
        <div className="flex items-center">
          <Users className="h-8 w-8 text-blue-600 dark:text-blue-400 mr-4" />
          <div>
            <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Student Management
            </h2>
            <p className="text-blue-700 dark:text-blue-300">
              Access student rosters, monitor attendance, track progress, and communicate with students in your classes.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Student Roster
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            View complete list of students across all your assigned classes with detailed profiles.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500 font-medium">
            Coming Soon
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Search className="h-6 w-6 text-green-600 dark:text-green-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Search Students
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Quickly find students by name, class, or other criteria to access their information.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500 font-medium">
            Coming Soon
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Filter className="h-6 w-6 text-orange-600 dark:text-orange-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Filter & Sort
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Filter students by class, performance level, attendance status, and more.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500 font-medium">
            Coming Soon
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <UserPlus className="h-6 w-6 text-cyan-600 dark:text-cyan-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Student Progress
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Monitor individual student progress, grades, and learning outcomes.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500 font-medium">
            Coming Soon
          </div>
        </div>
      </div>
    </div>
  );
}
