// src/app/system-admin/page.tsx

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from '../../components/layout/AdminLayout';
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