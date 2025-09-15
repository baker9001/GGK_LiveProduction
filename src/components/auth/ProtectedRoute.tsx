// /src/components/auth/ProtectedRoute.tsx

import { Navigate, useLocation } from 'react-router-dom';
import { getCurrentUserSync, getRealAdminUserSync, isInTestMode } from '../../lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  
  // Check if there's a real admin user (for test mode) or a regular authenticated user
  const realAdmin = getRealAdminUserSync();
  const currentUser = getCurrentUserSync();
  const testMode = isInTestMode();
  
  // Allow access if:
  // 1. In test mode with a valid admin session
  // 2. Not in test mode with a valid user session
  const isAuthorized = testMode ? !!realAdmin : !!currentUser;

  if (!isAuthorized) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}