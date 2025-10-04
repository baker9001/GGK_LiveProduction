import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { getCurrentUser } from '../../lib/auth';
import { useModuleSecurity } from '../../hooks/useModuleSecurity';
import { GraduationCap, BookOpen, ClipboardList, User, BarChart3 } from 'lucide-react';
import ProfilePage from './profile/page';
import StudentsPage from './students/page';
import LearningManagementPage from './learning-management/page';
import StudyCalendarPage from './study-calendar/page';

interface TeachersModulePageProps {
  moduleKey?: string;
}

function DashboardPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Teachers Module Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your classes, students, assignments, and track performance
        </p>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
        <div className="flex items-center">
          <GraduationCap className="h-8 w-8 text-blue-600 dark:text-blue-400 mr-4" />
          <div>
            <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Welcome to the Teachers Module
            </h2>
            <p className="text-blue-700 dark:text-blue-300">
              This module provides comprehensive tools for managing your teaching activities, tracking student progress, and delivering engaging lessons.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <BookOpen className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              My Classes
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            View and manage all your assigned classes, schedules, and student rosters.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500 font-medium">
            Coming Soon
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <ClipboardList className="h-6 w-6 text-orange-600 dark:text-orange-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Assignments
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Create, distribute, and grade assignments for your students.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500 font-medium">
            Coming Soon
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Performance Analytics
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Track student progress, identify learning gaps, and monitor class performance.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500 font-medium">
            Coming Soon
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <User className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Profile Management
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Manage your personal profile, security settings, and account preferences.
          </p>
          <div className="text-sm text-green-600 dark:text-green-400 font-medium">
            Available
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeachersModulePage({ moduleKey }: TeachersModulePageProps) {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  useModuleSecurity('teachers-module');

  useEffect(() => {
    const allowedRoles = ['SSA', 'TEACHER'];

    if (currentUser && !allowedRoles.includes(currentUser.role)) {
      console.error(`[Security] Unauthorized access to Teachers Module by ${currentUser.email} (${currentUser.role})`);

      const securityEvent = {
        type: 'TEACHERS_MODULE_ACCESS_VIOLATION',
        timestamp: new Date().toISOString(),
        user: {
          id: currentUser.id,
          email: currentUser.email,
          role: currentUser.role
        },
        module: 'teachers-module',
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
    <AdminLayout moduleKey="teachers-module">
      <Routes>
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="learning-management" element={<LearningManagementPage />} />
        <Route path="study-calendar" element={<StudyCalendarPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Routes>
    </AdminLayout>
  );
}
