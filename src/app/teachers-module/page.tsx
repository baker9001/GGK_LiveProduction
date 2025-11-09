import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { getCurrentUser } from '../../lib/auth';
import { useModuleSecurity } from '../../hooks/useModuleSecurity';
import { GraduationCap, BookOpen, ClipboardList, User, BarChart3 } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/shared/Card';
import { Badge } from '../../components/shared/Badge';
import ProfilePage from './profile/page';
import StudentsPage from './students/page';
import LearningManagementPage from './learning-management/page';
import StudyCalendarPage from './study-calendar/page';
import TeacherMaterialsPage from './learning-management/materials/page';

interface TeachersModulePageProps {
  moduleKey?: string;
}

function DashboardPage() {
  return (
    <div className="min-h-screen bg-ggk-neutral-50 dark:bg-ggk-neutral-900">
      <PageHeader
        title="Teachers Module"
        subtitle="Manage your classes, students, assignments, and track performance"
        accent={true}
      />

      <div className="px-24 pb-32 space-y-24">
        <Card variant="elevated" className="bg-gradient-to-r from-ggk-primary-50 to-blue-50 dark:from-ggk-primary-900/20 dark:to-blue-900/20 border-ggk-primary-200 dark:border-ggk-primary-800">
          <CardContent className="p-24">
            <div className="flex items-center gap-16">
              <div className="flex-shrink-0 w-56 h-56 rounded-ggk-lg bg-ggk-primary-100 dark:bg-ggk-primary-800/50 flex items-center justify-center">
                <GraduationCap className="h-32 w-32 text-ggk-primary-600 dark:text-ggk-primary-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-ggk-neutral-900 dark:text-ggk-neutral-50 mb-8">
                  Welcome to the Teachers Module
                </h2>
                <p className="text-ggk-neutral-700 dark:text-ggk-neutral-300">
                  This module provides comprehensive tools for managing your teaching activities, tracking student progress, and delivering engaging lessons.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
          <Card variant="elevated" hover>
            <CardHeader accent>
              <div className="flex items-center gap-12">
                <div className="flex-shrink-0 w-48 h-48 rounded-ggk-md bg-blue-100 dark:bg-blue-800/50 flex items-center justify-center">
                  <BookOpen className="h-24 w-24 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle>My Classes</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-16">
              <p className="text-ggk-neutral-700 dark:text-ggk-neutral-300">
                View and manage all your assigned classes, schedules, and student rosters.
              </p>
              <Badge variant="default">Coming Soon</Badge>
            </CardContent>
          </Card>

          <Card variant="elevated" hover>
            <CardHeader accent>
              <div className="flex items-center gap-12">
                <div className="flex-shrink-0 w-48 h-48 rounded-ggk-md bg-orange-100 dark:bg-orange-800/50 flex items-center justify-center">
                  <ClipboardList className="h-24 w-24 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle>Assignments</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-16">
              <p className="text-ggk-neutral-700 dark:text-ggk-neutral-300">
                Create, distribute, and grade assignments for your students.
              </p>
              <Badge variant="default">Coming Soon</Badge>
            </CardContent>
          </Card>

          <Card variant="elevated" hover>
            <CardHeader accent>
              <div className="flex items-center gap-12">
                <div className="flex-shrink-0 w-48 h-48 rounded-ggk-md bg-ggk-success-100 dark:bg-ggk-success-800/50 flex items-center justify-center">
                  <BarChart3 className="h-24 w-24 text-ggk-success-600 dark:text-ggk-success-400" />
                </div>
                <CardTitle>Performance Analytics</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-16">
              <p className="text-ggk-neutral-700 dark:text-ggk-neutral-300">
                Track student progress, identify learning gaps, and monitor class performance.
              </p>
              <Badge variant="default">Coming Soon</Badge>
            </CardContent>
          </Card>

          <Card variant="elevated" hover>
            <CardHeader accent>
              <div className="flex items-center gap-12">
                <div className="flex-shrink-0 w-48 h-48 rounded-ggk-md bg-ggk-primary-100 dark:bg-ggk-primary-800/50 flex items-center justify-center">
                  <User className="h-24 w-24 text-ggk-primary-600 dark:text-ggk-primary-400" />
                </div>
                <CardTitle>Profile Management</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-16">
              <p className="text-ggk-neutral-700 dark:text-ggk-neutral-300">
                Manage your personal profile, security settings, and account preferences.
              </p>
              <Badge variant="success">Available</Badge>
            </CardContent>
          </Card>
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
        <Route path="learning-management/materials" element={<TeacherMaterialsPage />} />
        <Route path="study-calendar" element={<StudyCalendarPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Routes>
    </AdminLayout>
  );
}
