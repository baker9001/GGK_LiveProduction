// /src/app/entity-module/page.tsx
// SECURITY ENHANCED VERSION with module access control

import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { getCurrentUser } from '../../lib/auth';
import { useModuleSecurity } from '../../hooks/useModuleSecurity';
import { Building2, Key, Settings, BarChart3, Users, User, ClipboardList } from 'lucide-react';
import OrganisationRouter from './organisation';
import ConfigurationPage from './configuration/page';
import ProfilePage from './profile/page';
import LicenseManagementPage from './license-management/page';
import EntityMockExamsPage from './mock-exams/page';

interface EntityModulePageProps {
  moduleKey?: string;
}

// Dashboard Component
function DashboardPage() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Entity Module Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage organizational entities, hierarchies, and relationships
        </p>
      </div>

      {/* Entity Management System Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
        <div className="flex items-center">
          <Building2 className="h-8 w-8 text-blue-600 dark:text-blue-400 mr-4" />
          <div>
            <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Entity Management System
            </h2>
            <p className="text-blue-700 dark:text-blue-300">
              This module provides comprehensive entity management capabilities including organizational structure, entity relationships, and administrative controls.
            </p>
          </div>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Organisation Management */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Building2 className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Organisation Management
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Create and manage organizational hierarchies, departments, and business units.
          </p>
          <div className="text-sm text-green-600 dark:text-green-400 font-medium">
            Available
          </div>
        </div>

        {/* Profile Management */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <BarChart3 className="h-6 w-6 text-orange-600 dark:text-orange-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Entity Analytics
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Monitor entity performance, usage statistics, and organizational metrics.
          </p>
          <div className="text-sm text-green-600 dark:text-green-400 font-medium">
            Coming Soon
          </div>
        </div>

        {/* Entity Relationships */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Key className="h-6 w-6 text-green-600 dark:text-green-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              License Management
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Assign and manage licenses for students within your administrative scope.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500">
            Available
          </div>
        </div>

        {/* Profile Management */}
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
          <div className="text-sm text-gray-500 dark:text-gray-500">
            Available
          </div>
        </div>

        {/* Mock Exam Management */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <ClipboardList className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Mock Exam Management
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Orchestrate IGCSE-aligned mock papers, monitor staffing, and track learner readiness before final exam windows.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500">
            Available
          </div>
        </div>

        {/* Configuration Management */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Settings className="h-6 w-6 text-purple-600 dark:text-purple-400 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Configuration Management
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Configure academic structure, departments, grade levels, and class sections.
          </p>
          <div className="text-sm text-gray-500 dark:text-gray-500">
            Available
          </div>
        </div>
      </div>
    </div>
  );
}

// Placeholder components for other pages
function AnalyticsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        Entity Analytics
      </h1>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <BarChart3 className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Analytics and reporting features are coming soon.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Monitor entity performance, usage statistics, and organizational metrics with comprehensive analytics.
        </p>
      </div>
    </div>
  );
}

export default function EntityModulePage({ moduleKey }: EntityModulePageProps) {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  
  // SECURITY: Use the module security hook
  useModuleSecurity('entity-module');
  
  // SECURITY: Additional role check
  useEffect(() => {
    const allowedRoles = ['SSA', 'ENTITY_ADMIN'];
    
    if (currentUser && !allowedRoles.includes(currentUser.role)) {
      console.error(`[Security] Unauthorized access to Entity Module by ${currentUser.email} (${currentUser.role})`);
      
      // Log security event
      const securityEvent = {
        type: 'ENTITY_MODULE_ACCESS_VIOLATION',
        timestamp: new Date().toISOString(),
        user: {
          id: currentUser.id,
          email: currentUser.email,
          role: currentUser.role
        },
        module: 'entity-module',
        action: 'ACCESS_BLOCKED'
      };
      
      console.error('[SECURITY EVENT]', securityEvent);
      
      // Store violation
      const violations = JSON.parse(localStorage.getItem('security_violations') || '[]');
      violations.push(securityEvent);
      localStorage.setItem('security_violations', JSON.stringify(violations.slice(-100)));
      
      // Redirect based on user role
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
    <AdminLayout moduleKey="entity-module">
      <Routes>
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="organisation/*" element={<OrganisationRouter />} />
        <Route path="configuration" element={<ConfigurationPage />} />
        <Route path="mock-exams" element={<EntityMockExamsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="license-management" element={<LicenseManagementPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
      </Routes>
    </AdminLayout>
  );
}