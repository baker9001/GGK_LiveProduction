import React from 'react';
import { Calendar, Clock, CalendarDays, CalendarCheck, Bell, CalendarRange } from 'lucide-react';

export default function StudyCalendarPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Study Calendar
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage class schedules, lessons, assignments, and important academic dates
        </p>
      </div>

      <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20 border border-violet-200 dark:border-violet-800 rounded-lg p-6 mb-8">
        <div className="flex items-center">
          <Calendar className="h-8 w-8 text-[#5D7E23] dark:text-violet-400 mr-4" />
          <div>
            <h2 className="text-xl font-semibold text-violet-900 dark:text-violet-100 mb-2">
              Schedule & Calendar Management
            </h2>
            <p className="text-violet-700 dark:text-violet-300">
              Plan and organize your teaching schedule, track lessons, manage deadlines, and coordinate academic activities.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <CalendarDays className="h-6 w-6 text-[#5D7E23] dark:text-violet-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Class Schedule
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            View and manage your weekly class schedule with times, locations, and class details.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500 font-medium">
            Coming Soon
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <CalendarCheck className="h-6 w-6 text-green-600 dark:text-green-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Lesson Planning
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Schedule lessons, plan topics, and organize teaching activities on a calendar view.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500 font-medium">
            Coming Soon
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Assignment Deadlines
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Set and track assignment due dates, test schedules, and project submission deadlines.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500 font-medium">
            Coming Soon
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Bell className="h-6 w-6 text-[#99C93B] dark:text-[#AAD775] mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Reminders & Alerts
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Set reminders for upcoming classes, meetings, and important academic events.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500 font-medium">
            Coming Soon
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <CalendarRange className="h-6 w-6 text-[#99C93B] dark:text-cyan-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Academic Calendar
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            View school-wide academic calendar including holidays, exams, and important dates.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500 font-medium">
            Coming Soon
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Calendar className="h-6 w-6 text-fuchsia-600 dark:text-fuchsia-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Event Management
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Create and manage special events, parent meetings, and extracurricular activities.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500 font-medium">
            Coming Soon
          </div>
        </div>
      </div>
    </div>
  );
}
