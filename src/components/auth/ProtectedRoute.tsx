// /src/components/auth/ProtectedRoute.tsx
// ENHANCED VERSION with role-based access control

import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getCurrentUser, getRealAdminUser, isInTestMode } from '../../lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[]; // Add optional role requirements
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const location = useLocation();
  
  // Check if there's a real admin user (for test mode) or a regular authenticated user
  const realAdmin = getRealAdminUser();
  const currentUser = getCurrentUser();
  const testMode = isInTestMode();
  
  // Log access attempts for security monitoring
  useEffect(() => {
    if (currentUser) {
      console.log('[ProtectedRoute] Access attempt:', {
        user: currentUser.email,
        role: currentUser.role,
        path: location.pathname,
        requiredRoles: requiredRoles || 'none',
        timestamp: new Date().toISOString()
      });
    }
  }, [location.pathname, currentUser, requiredRoles]);
  
  // Allow access if:
  // 1. In test mode with a valid admin session
  // 2. Not in test mode with a valid user session
  const isAuthorized = testMode ? !!realAdmin : !!currentUser;

  if (!isAuthorized) {
    console.log('[ProtectedRoute] No authenticated user, redirecting to signin');
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }
  
  // Additional role-based check if requiredRoles are specified
  if (requiredRoles && currentUser && !requiredRoles.includes(currentUser.role)) {
    console.error('[ProtectedRoute] Role-based access denied:', {
      user: currentUser.email,
      userRole: currentUser.role,
      requiredRoles,
      path: location.pathname
    });
    
    // Log security violation
    const violations = JSON.parse(localStorage.getItem('security_violations') || '[]');
    violations.push({
      timestamp: new Date().toISOString(),
      type: 'ROLE_ACCESS_VIOLATION',
      user: currentUser.email,
      userRole: currentUser.role,
      requiredRoles,
      path: location.pathname
    });
    localStorage.setItem('security_violations', JSON.stringify(violations.slice(-100)));
    
    // Redirect to user's default module
    const roleRedirects: Record<string, string> = {
      'SSA': '/app/system-admin/dashboard',
      'SUPPORT': '/app/system-admin/dashboard',
      'VIEWER': '/app/system-admin/dashboard',
      'ENTITY_ADMIN': '/app/entity-module/dashboard',
      'STUDENT': '/app/student-module/dashboard',
      'TEACHER': '/app/teachers-module/dashboard'
    };
    
    return <Navigate to={roleRedirects[currentUser.role] || '/signin'} replace />;
  }

  return <>{children}</>;
}