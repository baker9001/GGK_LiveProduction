/**
 * File: /src/app/entity-module/organisation/index.tsx
 * 
 * Organisation Module Router - Handles sub-routes for organisation module
 * Including the wizard page
 */

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import OrganisationManagement from './page';
import OrganizationWizard from './wizard/page';

const OrganisationRouter = () => {
  return (
    <Routes>
      <Route index element={<OrganisationManagement />} />
      <Route path="wizard" element={<OrganizationWizard />} />
    </Routes>
  );
};

export default OrganisationRouter;