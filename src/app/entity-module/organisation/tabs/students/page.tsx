/**
 * File: /src/app/entity-module/organisation/tabs/students/page.tsx
 * 
 * Students Management Tab Component (Placeholder)
 * To be implemented with full student management functionality
 * 
 * Dependencies:
 *   - @/lib/supabase
 *   - @/contexts/UserContext
 *   - External: react, lucide-react
 */

'use client';

import React from 'react';
import { GraduationCap, Users, BookOpen, Award, Clock } from 'lucide-react';

export interface StudentsTabProps {
  companyId: string;
  refreshData?: () => void;
}

export default function StudentsTab({ companyId, refreshData }: StudentsTabProps) {
  return (
    <div className="min-h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Student Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive student management system coming soon
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Student Profiles
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage detailed student information
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Academic Records
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Track grades and performance
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <Award className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Achievements
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Record awards and recognitions
            </p>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 mb-2">
            <Clock className="w-5 h-5" />
            <span className="font-semibold">In Development</span>
          </div>
          <p className="text-sm text-blue-600 dark:text-blue-400">
            This feature is currently under development and will include:
          </p>
          <ul className="mt-2 text-sm text-blue-600 dark:text-blue-400 text-left list-disc list-inside">
            <li>Student enrollment and registration</li>
            <li>Attendance tracking</li>
            <li>Grade management</li>
            <li>Parent/guardian information</li>
            <li>Health records</li>
            <li>Disciplinary records</li>
            <li>Financial information</li>
            <li>Transport management</li>
          </ul>
        </div>
      </div>
    </div>
  );
}