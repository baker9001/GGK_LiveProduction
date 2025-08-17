/**
 * File: /src/app/entity-module/organisation/tabs/teachers/page.tsx
 * 
 * Teachers Management Tab Component (Placeholder)
 * To be implemented with full teacher management functionality
 * 
 * Dependencies:
 *   - @/lib/supabase
 *   - @/contexts/UserContext
 *   - External: react, lucide-react
 */

'use client';

import React from 'react';
import { Users, Award, Calendar, BookOpen, Clock, Briefcase } from 'lucide-react';

export interface TeachersTabProps {
  companyId: string;
  refreshData?: () => void;
}

export default function TeachersTab({ companyId, refreshData }: TeachersTabProps) {
  return (
    <div className="min-h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Teacher Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive teacher management system coming soon
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <Briefcase className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Teacher Profiles
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage teacher information
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Schedule Management
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Track classes and timetables
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <Award className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Performance Tracking
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Monitor teaching effectiveness
            </p>
          </div>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
          <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 mb-2">
            <Clock className="w-5 h-5" />
            <span className="font-semibold">In Development</span>
          </div>
          <p className="text-sm text-purple-600 dark:text-purple-400">
            This feature is currently under development and will include:
          </p>
          <ul className="mt-2 text-sm text-purple-600 dark:text-purple-400 text-left list-disc list-inside">
            <li>Teacher registration and onboarding</li>
            <li>Qualification and certification tracking</li>
            <li>Class assignments and schedules</li>
            <li>Attendance monitoring</li>
            <li>Performance evaluations</li>
            <li>Professional development tracking</li>
            <li>Leave management</li>
            <li>Payroll integration</li>
          </ul>
        </div>
      </div>
    </div>
  );
}