// /src/components/auth/ProtectedRoute.tsx
// ENHANCED VERSION with role-based access control and loading states

import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getCurrentUser, getRealAdminUser, isInTestMode } from '../../lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[]; // Add optional role requirements
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [authState, setAuthState] = useState<{
    realAdmin: any;
    currentUser: any;
    testMode: boolean;
  } | null>(null);

  // Check authentication state with a small delay to allow session to initialize
  useEffect(() => {
    const checkAuth = () => {
      try {
        const realAdmin = getRealAdminUser();
        const currentUser = getCurrentUser();
        const testMode = isInTestMode();

        setAuthState({ realAdmin, currentUser, testMode });
        setIsChecking(false);
      } catch (error) {
        console.error('[ProtectedRoute] Error checking auth:', error);
        setIsChecking(false);
      }
    };

    // Small delay to allow session to be written to localStorage
    const timer = setTimeout(checkAuth, 100);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Show loading spinner while checking auth
  if (isChecking || !authState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#64BC46] mx-auto" />
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  const { realAdmin, currentUser, testMode } = authState;
  
  // Log access attempts for security monitoring
  useEffect(() => {
    if (currentUser && !isChecking) {
      console.log('[ProtectedRoute] Access attempt:', {
        user: currentUser.email,
        role: currentUser.role,
        path: location.pathname,
        requiredRoles: requiredRoles || 'none',
        timestamp: new Date().toISOString()
      });
    }
  }, [location.pathname, currentUser, requiredRoles, isChecking]);
  
  // Allow access if:
  // 1. In test mode with a valid admin session
  // 2. Not in test mode with a valid user session
  const isAuthorized = testMode ? !!realAdmin : !!currentUser;

  if (!isAuthorized) {
    console.log('[ProtectedRoute] No authenticated user, redirecting to signin');
    // Clear any stale auth data before redirecting
    if (typeof window !== 'undefined') {
      import('../../lib/auth').then(({ clearAuthenticatedUser, markSessionExpired }) => {
        clearAuthenticatedUser();
        markSessionExpired('Please sign in to access this page.');
      });
    }
    // Don't pass location state - always redirect to dashboard after login
    return <Navigate to="/signin" replace />;
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