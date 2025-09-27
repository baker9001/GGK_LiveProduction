// /src/app/teachers-module/page.tsx
// SECURITY ENHANCED VERSION with module access control

import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { getCurrentUser } from '../../lib/auth';
import { useModuleSecurity } from '../../hooks/useModuleSecurity';
import { Building2, Network, Settings, BarChart3, Users, User, GraduationCap, BookOpen, Calendar } from 'lucide-react';
import ProfilePage from './profile/page';

interface TeachersModulePageProps {
  moduleKey?: string;
}

// Dashboard Component
function DashboardPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Teachers Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Welcome to your teaching dashboard - manage your classes, students, and professional development
        </p>
      </div>

      {/* Teacher Dashboard Card */}
      <div className="bg-gradient-to-r from-[#8CC63F]/10 to-[#7AB635]/10 dark:from-[#8CC63F]/20 dark:to-[#7AB635]/20 border border-[#8CC63F]/30 dark:border-[#8CC63F]/40 rounded-lg p-6 mb-8">
        <div className="flex items-center">
          <GraduationCap className="h-8 w-8 text-[#8CC63F] mr-4" />
          <div>
            <h2 className="text-xl font-semibold text-[#5A8A2C] dark:text-[#8CC63F] mb-2">
              Teacher Portal
            </h2>
            <p className="text-[#5A8A2C] dark:text-[#8CC63F]">
              Access your teaching tools, manage your classes, track student progress, and update your professional profile.
            </p>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* My Classes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Users className="h-6 w-6 text-[#8CC63F] mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              My Classes
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            View and manage your assigned classes, students, and lesson plans.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500">
            Coming Soon
          </div>
        </div>
        {/* Student Progress */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Student Progress
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Track student performance, assignments, and academic progress.
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
        {/* My Profile */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <User className="h-6 w-6 text-purple-600 dark:text-purple-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              My Profile
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Manage your personal information, qualifications, and professional details.
          </p>
          <div className="text-sm text-green-600 dark:text-green-400 font-medium">
            Available
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
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  
  // SECURITY: Use the module security hook
  useModuleSecurity('teachers-module');
  
  // SECURITY: Additional role check
  useEffect(() => {
    const allowedRoles = ['SSA', 'TEACHER'];
    
    if (currentUser && !allowedRoles.includes(currentUser.role)) {
      console.error(`[Security] Unauthorized access to Teachers Module by ${currentUser.email} (${currentUser.role})`);
      
      // Log security event
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
      
      // Store violation
      const violations = JSON.parse(localStorage.getItem('security_violations') || '[]');
      violations.push(securityEvent);
      localStorage.setItem('security_violations', JSON.stringify(violations.slice(-100)));
      
      // Redirect based on user role
      const roleRedirects: Record<string, string> = {
        'ENTITY_ADMIN': '/app/entity-module/dashboard',
        'STUDENT': '/app/student-module/dashboard',
        'SUPPORT': '/app/system-admin/dashboard',
        'VIEWER': '/app/system-admin/dashboard',
        'SSA': '/app/system-admin/dashboard',
        'TEACHER': '/app/teachers-module/dashboard'
      };
      
      navigate(roleRedirects[currentUser.role] || '/signin', { replace: true });
    }
  }, [currentUser, navigate]);
  
  return (
    <AdminLayout moduleKey="teachers-module">
      <Routes>
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="staff" element={<StaffManagementPage />} />
        <Route path="curriculum" element={<CurriculumPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="performance" element={<PerformancePage />} />
      </Routes>
    </AdminLayout>
  );
}