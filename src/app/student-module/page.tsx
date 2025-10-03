import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { getCurrentUser } from '../../lib/auth';
import { useModuleSecurity } from '../../hooks/useModuleSecurity';
import { BookOpen, Award, Clock, TrendingUp, Key, Video } from 'lucide-react';
import LicensesPage from './licenses/page';

interface StudentModulePageProps {
  moduleKey?: string;
}

function DashboardPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Student Module Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Access your courses, track progress, and manage your learning journey
        </p>
      </div>

      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-6 mb-8">
        <div className="flex items-center">
          <BookOpen className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mr-4" />
          <div>
            <h2 className="text-xl font-semibold text-emerald-900 dark:text-emerald-100 mb-2">
              Welcome to Your Learning Hub
            </h2>
            <p className="text-emerald-700 dark:text-emerald-300">
              This module provides access to all your learning resources, practice materials, and progress tracking tools.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <BookOpen className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              My Courses
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Access all your enrolled courses, materials, and learning resources.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500 font-medium">
            Coming Soon
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Practice & Assignments
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Complete assignments, practice questions, and mock exams.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500 font-medium">
            Coming Soon
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Progress Tracking
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Monitor your learning progress, scores, and performance metrics.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500 font-medium">
            Coming Soon
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Key className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              My Licenses
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            View and manage your active learning licenses and subscriptions.
          </p>
          <div className="text-sm text-green-600 dark:text-green-400 font-medium">
            Available
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Video className="h-6 w-6 text-purple-600 dark:text-purple-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Video Lessons
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Watch video tutorials and recorded lessons from your teachers.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500 font-medium">
            Coming Soon
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Award className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Achievements
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Track your achievements, badges, and learning milestones.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500 font-medium">
            Coming Soon
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StudentModulePage({ moduleKey }: StudentModulePageProps) {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  useModuleSecurity('student-module');

  useEffect(() => {
    const allowedRoles = ['SSA', 'STUDENT'];

    if (currentUser && !allowedRoles.includes(currentUser.role)) {
      console.error(`[Security] Unauthorized access to Student Module by ${currentUser.email} (${currentUser.role})`);

      const securityEvent = {
        type: 'STUDENT_MODULE_ACCESS_VIOLATION',
        timestamp: new Date().toISOString(),
        user: {
          id: currentUser.id,
          email: currentUser.email,
          role: currentUser.role
        },
        module: 'student-module',
        action: 'ACCESS_BLOCKED'
      };

      console.error('[SECURITY EVENT]', securityEvent);

      const violations = JSON.parse(localStorage.getItem('security_violations') || '[]');
      violations.push(securityEvent);
      localStorage.setItem('security_violations', JSON.stringify(violations.slice(-100)));

      const roleRedirects: Record<string, string> = {
        'STUDENT': '/app/student-module/dashboard',
        'TEACHER': '/app/teachers-module/dashboard',
        'SUPPORT': '/app/system-admin/dashboard',
        'VIEWER': '/app/system-admin/dashboard',
        'SSA': '/app/system-admin/dashboard',
        'ENTITY_ADMIN': '/app/entity-module/dashboard'
      };

      navigate(roleRedirects[currentUser.role] || '/signin', { replace: true });
    }
  }, [currentUser, navigate]);

  return (
    <AdminLayout moduleKey="student-module">
      <Routes>
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="licenses" element={<LicensesPage />} />
      </Routes>
    </AdminLayout>
  );
}
