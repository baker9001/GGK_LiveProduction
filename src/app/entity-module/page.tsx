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

import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/shared/Card';
import { Badge } from '../../components/shared/Badge';

// Dashboard Component
function DashboardPage() {
  return (
    <div className="min-h-screen bg-ggk-neutral-50 dark:bg-ggk-neutral-900">
      <PageHeader
        title="Entity Module"
        subtitle="Manage organizational entities, hierarchies, and relationships"
        accent={true}
      />

      <div className="px-24 pb-32 space-y-24">
        {/* Entity Management System Card */}
        <Card variant="elevated" className="bg-gradient-to-r from-ggk-primary-50 to-blue-50 dark:from-ggk-primary-900/20 dark:to-blue-900/20 border-ggk-primary-200 dark:border-ggk-primary-800">
          <CardContent className="p-24">
            <div className="flex items-center gap-16">
              <div className="flex-shrink-0 w-56 h-56 rounded-ggk-lg bg-ggk-primary-100 dark:bg-ggk-primary-800/50 flex items-center justify-center">
                <Building2 className="h-32 w-32 text-ggk-primary-600 dark:text-ggk-primary-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-ggk-neutral-900 dark:text-ggk-neutral-50 mb-8">
                  Entity Management System
                </h2>
                <p className="text-ggk-neutral-700 dark:text-ggk-neutral-300">
                  This module provides comprehensive entity management capabilities including organizational structure, entity relationships, and administrative controls.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
          {/* Organisation Management */}
          <Card variant="elevated" hover>
            <CardHeader accent>
              <div className="flex items-center gap-12">
                <div className="flex-shrink-0 w-48 h-48 rounded-ggk-md bg-ggk-primary-100 dark:bg-ggk-primary-800/50 flex items-center justify-center">
                  <Building2 className="h-24 w-24 text-ggk-primary-600 dark:text-ggk-primary-400" />
                </div>
                <CardTitle>Organisation Management</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-16">
              <p className="text-ggk-neutral-700 dark:text-ggk-neutral-300">
                Create and manage organizational hierarchies, departments, and business units.
              </p>
              <Badge variant="success">Available</Badge>
            </CardContent>
          </Card>

          {/* Entity Analytics */}
          <Card variant="elevated" hover>
            <CardHeader accent>
              <div className="flex items-center gap-12">
                <div className="flex-shrink-0 w-48 h-48 rounded-ggk-md bg-orange-100 dark:bg-orange-800/50 flex items-center justify-center">
                  <BarChart3 className="h-24 w-24 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle>Entity Analytics</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-16">
              <p className="text-ggk-neutral-700 dark:text-ggk-neutral-300">
                Monitor entity performance, usage statistics, and organizational metrics.
              </p>
              <Badge variant="default">Coming Soon</Badge>
            </CardContent>
          </Card>

          {/* License Management */}
          <Card variant="elevated" hover>
            <CardHeader accent>
              <div className="flex items-center gap-12">
                <div className="flex-shrink-0 w-48 h-48 rounded-ggk-md bg-ggk-success-100 dark:bg-ggk-success-800/50 flex items-center justify-center">
                  <Key className="h-24 w-24 text-ggk-success-600 dark:text-ggk-success-400" />
                </div>
                <CardTitle>License Management</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-16">
              <p className="text-ggk-neutral-700 dark:text-ggk-neutral-300">
                Assign and manage licenses for students within your administrative scope.
              </p>
              <Badge variant="success">Available</Badge>
            </CardContent>
          </Card>

          {/* Profile Management */}
          <Card variant="elevated" hover>
            <CardHeader accent>
              <div className="flex items-center gap-12">
                <div className="flex-shrink-0 w-48 h-48 rounded-ggk-md bg-blue-100 dark:bg-blue-800/50 flex items-center justify-center">
                  <User className="h-24 w-24 text-blue-600 dark:text-blue-400" />
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

          {/* Mock Exam Management */}
          <Card variant="elevated" hover>
            <CardHeader accent>
              <div className="flex items-center gap-12">
                <div className="flex-shrink-0 w-48 h-48 rounded-ggk-md bg-emerald-100 dark:bg-emerald-800/50 flex items-center justify-center">
                  <ClipboardList className="h-24 w-24 text-emerald-600 dark:text-emerald-400" />
                </div>
                <CardTitle>Mock Exam Management</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-16">
              <p className="text-ggk-neutral-700 dark:text-ggk-neutral-300">
                Orchestrate IGCSE-aligned mock papers, monitor staffing, and track learner readiness before final exam windows.
              </p>
              <Badge variant="success">Available</Badge>
            </CardContent>
          </Card>

          {/* Configuration Management */}
          <Card variant="elevated" hover>
            <CardHeader accent>
              <div className="flex items-center gap-12">
                <div className="flex-shrink-0 w-48 h-48 rounded-ggk-md bg-ggk-neutral-200 dark:bg-ggk-neutral-700 flex items-center justify-center">
                  <Settings className="h-24 w-24 text-ggk-neutral-700 dark:text-ggk-neutral-300" />
                </div>
                <CardTitle>Configuration Management</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-16">
              <p className="text-ggk-neutral-700 dark:text-ggk-neutral-300">
                Configure academic structure, departments, grade levels, and class sections.
              </p>
              <Badge variant="success">Available</Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Placeholder components for other pages
function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-ggk-neutral-50 dark:bg-ggk-neutral-900">
      <PageHeader
        title="Entity Analytics"
        subtitle="Monitor entity performance, usage statistics, and organizational metrics"
        accent={true}
      />
      <div className="px-24 pb-32">
        <Card variant="elevated">
          <CardContent className="p-48 text-center">
            <div className="max-w-md mx-auto space-y-16">
              <div className="w-96 h-96 mx-auto rounded-full bg-ggk-neutral-100 dark:bg-ggk-neutral-800 flex items-center justify-center">
                <BarChart3 className="h-48 w-48 text-ggk-neutral-400 dark:text-ggk-neutral-500" />
              </div>
              <h3 className="text-xl font-semibold text-ggk-neutral-900 dark:text-ggk-neutral-50">
                Coming Soon
              </h3>
              <p className="text-ggk-neutral-700 dark:text-ggk-neutral-300">
                Analytics and reporting features are currently in development. Monitor entity performance, usage statistics, and organizational metrics with comprehensive analytics dashboards.
              </p>
            </div>
          </CardContent>
        </Card>
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