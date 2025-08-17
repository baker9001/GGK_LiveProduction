/**
 * File: /src/app/entity-module/organisation/index.tsx
 * 
 * Organisation Module Router - Simple version without wizard
 * Only includes the main organization management page
 */

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import OrganisationManagement from './page';

const OrganisationRouter = () => {
  return (
    <Routes>
      <Route index element={<OrganisationManagement />} />
    </Routes>
  );
};

export default OrganisationRouter;