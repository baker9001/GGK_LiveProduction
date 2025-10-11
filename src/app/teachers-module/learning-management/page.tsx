import React from 'react';
import { BookOpen, FileText, Video, Target, Library, BookMarked } from 'lucide-react';

export default function LearningManagementPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Learning Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage curriculum, learning materials, and educational content for your classes
        </p>
      </div>

      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-6 mb-8">
        <div className="flex items-center">
          <BookOpen className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mr-4" />
          <div>
            <h2 className="text-xl font-semibold text-emerald-900 dark:text-emerald-100 mb-2">
              Curriculum & Content Management
            </h2>
            <p className="text-emerald-700 dark:text-emerald-300">
              Access and organize learning materials, lesson plans, assignments, and educational resources for your teaching activities.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <BookMarked className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Lesson Plans
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Create, organize, and manage lesson plans aligned with curriculum standards and learning objectives.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500 font-medium">
            Coming Soon
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Library className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Resource Library
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Access a comprehensive library of educational materials, worksheets, and teaching resources.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500 font-medium">
            Coming Soon
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <FileText className="h-6 w-6 text-orange-600 dark:text-orange-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Course Materials
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Upload and distribute course materials, readings, and supplementary content to students.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500 font-medium">
            Coming Soon
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Video className="h-6 w-6 text-red-600 dark:text-red-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Video Lessons
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Create and share video lessons, tutorials, and recorded lectures with your students.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500 font-medium">
            Coming Soon
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Target className="h-6 w-6 text-cyan-600 dark:text-cyan-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Learning Objectives
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Define and track learning objectives, outcomes, and competencies for each course.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500 font-medium">
            Coming Soon
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <BookOpen className="h-6 w-6 text-teal-600 dark:text-teal-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Curriculum Mapping
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Map curriculum content to standards, assessments, and learning progressions.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500 font-medium">
            Coming Soon
          </div>
        </div>
      </div>
    </div>
  );
}
