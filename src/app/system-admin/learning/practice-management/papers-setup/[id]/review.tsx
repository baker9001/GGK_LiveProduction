// src/app/system-admin/learning/practice-management/papers-setup/[id]/review.tsx
// Thin wrapper to reuse the shared Paper Setup Review page with dynamic params

import React from 'react';
import PaperSetupReviewPage from '../review/page';

const PaperSetupReviewRoute: React.FC = () => {
  return <PaperSetupReviewPage />;
};

export default PaperSetupReviewRoute;
