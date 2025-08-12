// /src/components/auth/RoleGuard.tsx

import React from 'react';
import { useLocation } from 'react-router-dom';
import { type UserRole, hasRequiredRole, getCurrentUser, isInTestMode, getRealAdminUser } from '../../lib/auth';
import { useUser } from '../../contexts/UserContext';

interface RoleGuardProps {
  requiredRole: UserRole;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGuard({ requiredRole, children, fallback }: RoleGuardProps) {
  const location = useLocation();
  const { user, isTestMode } = useUser();
  
  // Get the current user (which could be the test user)
  const currentUser = getCurrentUser();
  const realAdmin = getRealAdminUser();
  
  // In test mode, we need special logic
  if (isTestMode && realAdmin?.role === 'SSA') {
    // Map module paths to expected roles
    const moduleRoleMap: Record<string, UserRole[]> = {
      '/app/entity-module': ['ENTITY_ADMIN', 'SSA'],
      '/app/student-module': ['STUDENT', 'SSA'],
      '/app/teachers-module': ['TEACHER', 'SSA'],
      '/app/system-admin': ['SSA', 'SUPPORT', 'VIEWER'],
    };
    
    // Find which module we're trying to access
    const currentModule = Object.keys(moduleRoleMap).find(path => 
      location.pathname.startsWith(path)
    );
    
    if (currentModule) {
      const allowedRoles = moduleRoleMap[currentModule];
      const testUserRole = currentUser?.role;
      
      // Allow access if:
      // 1. Test user has one of the allowed roles for this module
      // 2. OR the real admin is SSA (can test any module)
      if (testUserRole && allowedRoles.includes(testUserRole)) {
        return <>{children}</>;
      }
      
      // Real admin is SSA, so they can access any module even when testing
      if (realAdmin?.role === 'SSA') {
        return <>{children}</>;
      }
    }
  }
  
  // Normal role checking (not in test mode)
  const hasRole = currentUser && hasRequiredRole(requiredRole);

  if (!user || !hasRole) {
    if (fallback) return <>{fallback}</>;
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">
            {isTestMode ? (
              <>
                The test user ({currentUser?.name}) doesn't have permission to access this module.
                <br />
                <span className="text-sm text-gray-500 mt-2 block">
                  Test user role: {currentUser?.role || 'None'} | Required: Access to {location.pathname}
                </span>
                <br />
                <span className="text-xs text-gray-400">
                  Note: As an SSA admin, you can still access all modules. The test user would see this error.
                </span>
              </>
            ) : (
              "You don't have permission to access this page. Please contact your administrator if you believe this is an error."
            )}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}