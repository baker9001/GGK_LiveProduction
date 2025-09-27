// /src/hooks/useModuleSecurity.ts
// Centralized module security hook for access control

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUser } from '../lib/auth';

export type ModuleKey = 'system-admin' | 'entity-module' | 'student-module' | 'teachers-module';

const MODULE_PERMISSIONS: Record<ModuleKey, string[]> = {
  'system-admin': ['SSA', 'SUPPORT', 'VIEWER'],
  'entity-module': ['SSA', 'ENTITY_ADMIN'],
  'student-module': ['SSA', 'STUDENT'],
  'teachers-module': ['SSA', 'TEACHER']
};

const ROLE_REDIRECTS: Record<string, string> = {
  'SSA': '/app/system-admin/dashboard',
  'SUPPORT': '/app/system-admin/dashboard',
  'VIEWER': '/app/system-admin/dashboard',
  'ENTITY_ADMIN': '/app/entity-module/dashboard',
  'STUDENT': '/app/student-module/dashboard',
  'TEACHER': '/app/teachers-module/dashboard'
};

export function useModuleSecurity(moduleKey: ModuleKey) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAccess = () => {
      const currentUser = getCurrentUser();
      
      if (!currentUser) {
        console.error('[ModuleSecurity] No authenticated user');
        navigate('/signin', { 
          state: { from: location },
          replace: true 
        });
        return;
      }

      const allowedRoles = MODULE_PERMISSIONS[moduleKey];
      
      if (!allowedRoles.includes(currentUser.role)) {
        // Log security violation
        const violation = {
          type: 'MODULE_ACCESS_VIOLATION',
          timestamp: new Date().toISOString(),
          user: {
            id: currentUser.id,
            email: currentUser.email,
            role: currentUser.role
          },
          attempted: {
            module: moduleKey,
            path: location.pathname
          }
        };
        
        console.error('[SECURITY VIOLATION]', violation);
        
        // Store violation for audit (optional)
        const violations = JSON.parse(localStorage.getItem('security_violations') || '[]');
        violations.push(violation);
        localStorage.setItem('security_violations', JSON.stringify(violations.slice(-100))); // Keep last 100
        
        // Redirect to user's allowed module
        const redirectPath = ROLE_REDIRECTS[currentUser.role] || '/signin';
        navigate(redirectPath, { replace: true });
        
        // Optional: Show alert in development
        if (process.env.NODE_ENV === 'development') {
          alert(`Access Denied: Your role (${currentUser.role}) cannot access the ${moduleKey} module.`);
        }
      }
    };

    checkAccess();
    
    // Re-check on auth changes
    const handleAuthChange = () => checkAccess();
    window.addEventListener('auth-change', handleAuthChange);
    
    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, [moduleKey, navigate, location]);
}

// Helper function to get module name for display
export function getModuleName(moduleKey: ModuleKey): string {
  const moduleNames: Record<ModuleKey, string> = {
    'system-admin': 'System Admin',
    'entity-module': 'Entity Module',
    'student-module': 'Student Module',
    'teachers-module': 'Teachers Module'
  };
  return moduleNames[moduleKey];
}

// Helper function to check if user can access module
export function canAccessModule(moduleKey: ModuleKey, userRole?: string): boolean {
  const role = userRole || getCurrentUser()?.role;
  if (!role) return false;
  
  const allowedRoles = MODULE_PERMISSIONS[moduleKey];
  return allowedRoles.includes(role);
}

// Helper to get all accessible modules for a user
export function getAccessibleModules(userRole?: string): ModuleKey[] {
  const role = userRole || getCurrentUser()?.role;
  if (!role) return [];
  
  const modules: ModuleKey[] = ['system-admin', 'entity-module', 'student-module', 'teachers-module'];
  return modules.filter(moduleKey => canAccessModule(moduleKey, role));
}

// Export security event logger
export function logSecurityEvent(event: {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: any;
}) {
  const currentUser = getCurrentUser();
  const fullEvent = {
    ...event,
    timestamp: new Date().toISOString(),
    user: currentUser ? {
      id: currentUser.id,
      email: currentUser.email,
      role: currentUser.role
    } : null,
    location: window.location.pathname
  };
  
  console.error('[SECURITY EVENT]', fullEvent);
  
  // Store in localStorage for audit
  const events = JSON.parse(localStorage.getItem('security_events') || '[]');
  events.push(fullEvent);
  localStorage.setItem('security_events', JSON.stringify(events.slice(-500))); // Keep last 500
  
  // In production, you would send this to your backend
  // Example: await fetch('/api/security/log', { method: 'POST', body: JSON.stringify(fullEvent) });
}