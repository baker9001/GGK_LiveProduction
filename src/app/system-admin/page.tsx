// /src/app/system-admin/page.tsx
// SECURITY ENHANCED VERSION with module access control

import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { getCurrentUser } from '../../lib/auth';
import { useModuleSecurity } from '../../hooks/useModuleSecurity';
import DashboardPage from './dashboard/page';
import AdminUsersPage from './admin-users/page';
import TenantsPage from './tenants/page';
import LicenseManagementPage from './license-management/page';
import LicenseHistoryPage from './license-management/history/page';
import RegionsPage from './settings/locations/page';
import DataStructurePage from './settings/data-structure/page';
import MaterialManagementPage from './learning/materials/page';
import PapersSetupPage from './learning/practice-management/papers-setup/page';
import QuestionsSetupPage from './learning/practice-management/questions-setup/page';
import EducationCataloguePage from './learning/education-catalogue/page';
import ProfilePage from './profile/page';

interface SystemAdminPageProps {
  moduleKey?: string;
}

export default function SystemAdminPage({ moduleKey }: SystemAdminPageProps) {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  
  // SECURITY: Use the module security hook
  useModuleSecurity('system-admin');
  
  // SECURITY: Additional role check
  useEffect(() => {
    const allowedRoles = ['SSA', 'SUPPORT', 'VIEWER'];
    
    if (currentUser && !allowedRoles.includes(currentUser.role)) {
      console.error(`[Security] Unauthorized access to System Admin by ${currentUser.email} (${currentUser.role})`);
      
      // Log security event
      const securityEvent = {
        type: 'SYSTEM_ADMIN_ACCESS_VIOLATION',
        timestamp: new Date().toISOString(),
        user: {
          id: currentUser.id,
          email: currentUser.email,
          role: currentUser.role
        },
        module: 'system-admin',
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
        'TEACHER': '/app/teachers-module/dashboard',
        'SSA': '/app/system-admin/dashboard',
        'SUPPORT': '/app/system-admin/dashboard',
        'VIEWER': '/app/system-admin/dashboard'
      };
      
      navigate(roleRedirects[currentUser.role] || '/signin', { replace: true });
    }
  }, [currentUser, navigate]);
  
  return (
    <AdminLayout moduleKey="system-admin">
      <Routes>
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="admin-users/*" element={<AdminUsersPage />} />
        <Route path="tenants/*" element={<TenantsPage />} />
        <Route path="license-management" element={<LicenseManagementPage />} />
        <Route path="license-management/history/:licenseId" element={<LicenseHistoryPage />} />
        <Route path="settings/locations" element={<RegionsPage />} />
        <Route path="settings/data-structure" element={<DataStructurePage />} />
        <Route path="learning/materials" element={<MaterialManagementPage />} />
        <Route path="learning/practice-management/papers-setup" element={<PapersSetupPage />} />
        <Route path="learning/practice-management/questions-setup" element={<QuestionsSetupPage />} />
        <Route path="learning/education-catalogue/*" element={<EducationCataloguePage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Routes>
    </AdminLayout>
  );
}