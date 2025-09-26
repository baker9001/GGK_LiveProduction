// /home/project/src/App.tsx
// FINAL FIX - Properly preserves hash fragments during redirect

import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { UserProvider } from './contexts/UserContext';
import { PermissionProvider } from './contexts/PermissionContext';
import { Toast } from './components/shared/Toast';
import { ReactQueryProvider } from './providers/ReactQueryProvider';
import { TestModeBar } from './components/admin/TestModeBar';
import { isInTestMode, getCurrentUser } from './lib/auth';
import SystemAdminPage from './app/system-admin/page';
import SignInPage from './app/signin/page';
import ForgotPasswordPage from './app/forgot-password/page';
import ResetPasswordPage from './app/reset-password/page';
import LandingPage from './app/landing/page';
import AboutPage from './app/landing/about/page';
import SubjectsPage from './app/landing/subjects/page';
import ResourcesPage from './app/landing/resources/page';
import ContactPage from './app/landing/contact/page';
import EntityModulePage from './app/entity-module/page';
import StudentModulePage from './app/student-module/page';
import TeachersModulePage from './app/teachers-module/page';
import FormValidationPage from './pages/FormValidationPage';

// CRITICAL FIX: Use window.location.replace instead of navigate to preserve hash
function RootRedirect() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Get the current hash
    const hash = window.location.hash;
    
    console.log('[RootRedirect] Current URL:', window.location.href);
    console.log('[RootRedirect] Hash:', hash);
    
    // Check if this is a password reset (has recovery tokens in hash)
    if (hash && hash.includes('type=recovery')) {
      console.log('[RootRedirect] Password reset detected, redirecting with hash preserved');
      // Use window.location to preserve the hash fragments
      window.location.replace(`/reset-password${hash}`);
    } else if (hash && hash.includes('access_token')) {
      // Could be other auth types
      const hashParams = new URLSearchParams(hash.substring(1));
      const type = hashParams.get('type');
      
      if (type === 'signup' || type === 'invite') {
        console.log(`[RootRedirect] ${type} confirmation detected`);
        window.location.replace(`/auth/callback${hash}`);
      } else {
        // Unknown auth type, try reset-password anyway
        console.log('[RootRedirect] Auth tokens detected, trying reset-password');
        window.location.replace(`/reset-password${hash}`);
      }
    } else {
      // No special tokens, go to landing
      console.log('[RootRedirect] No auth tokens, redirecting to landing');
      window.location.replace('/landing');
    }
    
    setChecking(false);
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="h-8 w-8 mx-auto mb-4 bg-[#8CC63F] rounded-full animate-pulse"></div>
          <div className="text-white">Redirecting...</div>
        </div>
      </div>
    );
  }

  return null;
}

// Alternative: Direct hash handler component
function HashHandler() {
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      console.log('[HashHandler] Hash changed:', hash);
      
      if (hash && hash.includes('type=recovery')) {
        // Password reset tokens detected
        if (!window.location.pathname.includes('reset-password')) {
          console.log('[HashHandler] Redirecting to reset-password with hash');
          window.location.replace(`/reset-password${hash}`);
        }
      }
    };

    // Check on mount
    handleHashChange();
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  return null;
}

// Auth callback handler
function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const type = hashParams.get('type');
      
      console.log('[AuthCallback] Processing type:', type);
      
      switch (type) {
        case 'signup':
          navigate('/signin', { 
            replace: true,
            state: { message: 'Email confirmed! You can now sign in.' }
          });
          break;
        case 'invite':
          navigate('/signin', { 
            replace: true,
            state: { message: 'Invitation accepted! Please sign in.' }
          });
          break;
        default:
          navigate('/signin', { replace: true });
      }
    } else {
      navigate('/signin', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center text-white">
        <div className="animate-spin h-8 w-8 border-4 border-[#8CC63F] border-t-transparent rounded-full mx-auto mb-4"></div>
        <p>Processing authentication...</p>
      </div>
    </div>
  );
}

// Module access control wrapper
function ModuleRoute({ 
  path, 
  element, 
  allowedRoles 
}: { 
  path: string; 
  element: React.ReactNode; 
  allowedRoles: string[] 
}) {
  const currentUser = getCurrentUser();
  const testMode = isInTestMode();
  
  if (testMode && currentUser) {
    if (!allowedRoles.includes(currentUser.role)) {
      const redirectMap: Record<string, string> = {
        'ENTITY_ADMIN': '/app/entity-module/dashboard',
        'STUDENT': '/app/student-module/dashboard',
        'TEACHER': '/app/teachers-module/dashboard',
        'SSA': '/app/system-admin/dashboard',
        'SUPPORT': '/app/system-admin/dashboard',
        'VIEWER': '/app/system-admin/dashboard'
      };
      
      return <Navigate to={redirectMap[currentUser.role] || '/signin'} replace />;
    }
  }
  
  return <>{element}</>;
}

function App() {
  // Add class to body when in test mode
  React.useEffect(() => {
    if (isInTestMode()) {
      document.body.classList.add('test-mode-active');
    } else {
      document.body.classList.remove('test-mode-active');
    }
  }, []);

  // Log current URL on mount for debugging
  React.useEffect(() => {
    console.log('[App] Initialized with URL:', window.location.href);
    console.log('[App] Hash:', window.location.hash);
    console.log('[App] Pathname:', window.location.pathname);
  }, []);

  return (
    <ReactQueryProvider>
      <BrowserRouter>
        {/* Global hash handler */}
        <HashHandler />
        
        <UserProvider>
          <PermissionProvider>
            <Toast />
            <TestModeBar />
            
            <Routes>
              {/* Root route with proper hash handling */}
              <Route path="/" element={<RootRedirect />} />
              
              {/* Auth callback route */}
              <Route path="/auth/callback" element={<AuthCallback />} />
              
              {/* Public pages */}
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/subjects" element={<SubjectsPage />} />
              <Route path="/resources" element={<ResourcesPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              
              {/* Auth pages */}
              <Route path="/signin" element={<SignInPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/form-validation" element={<FormValidationPage />} />
              
              {/* Password Change Route - Protected */}
              <Route
                path="/app/settings/change-password"
                element={
                  <ProtectedRoute>
                    <ResetPasswordPage />
                  </ProtectedRoute>
                }
              />
              
              {/* Entity Module */}
              <Route
                path="/app/entity-module/*"
                element={
                  <ProtectedRoute>
                    <ModuleRoute 
                      path="/app/entity-module"
                      allowedRoles={['SSA', 'ENTITY_ADMIN']}
                      element={
                        <div className="min-h-screen bg-gray-50">
                          <main className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                            <EntityModulePage moduleKey="entity-module" />
                          </main>
                        </div>
                      }
                    />
                  </ProtectedRoute>
                }
              />
              
              {/* Student Module */}
              <Route
                path="/app/student-module/*"
                element={
                  <ProtectedRoute>
                    <ModuleRoute 
                      path="/app/student-module"
                      allowedRoles={['SSA', 'STUDENT']}
                      element={
                        <div className="min-h-screen bg-gray-50">
                          <main className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                            <StudentModulePage moduleKey="student-module" />
                          </main>
                        </div>
                      }
                    />
                  </ProtectedRoute>
                }
              />
              
              {/* Teachers Module */}
              <Route
                path="/app/teachers-module/*"
                element={
                  <ProtectedRoute>
                    <ModuleRoute 
                      path="/app/teachers-module"
                      allowedRoles={['SSA', 'TEACHER']}
                      element={
                        <div className="min-h-screen bg-gray-50">
                          <main className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                            <TeachersModulePage moduleKey="teachers-module" />
                          </main>
                        </div>
                      }
                    />
                  </ProtectedRoute>
                }
              />
              
              {/* System Admin Module */}
              <Route
                path="/app/system-admin/*"
                element={
                  <ProtectedRoute>
                    <ModuleRoute 
                      path="/app/system-admin"
                      allowedRoles={['SSA', 'SUPPORT', 'VIEWER']}
                      element={
                        <div className="min-h-screen bg-gray-50">
                          <main className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                            <SystemAdminPage moduleKey="system-admin" />
                          </main>
                        </div>
                      }
                    />
                  </ProtectedRoute>
                }
              />
              
              {/* Dashboard redirect */}
              <Route
                path="/app/dashboard"
                element={
                  <ProtectedRoute>
                    {(() => {
                      const user = getCurrentUser();
                      if (!user) return <Navigate to="/signin" replace />;
                      
                      const roleRedirects: Record<string, string> = {
                        'SSA': '/app/system-admin/dashboard',
                        'SUPPORT': '/app/system-admin/dashboard',
                        'VIEWER': '/app/system-admin/dashboard',
                        'ENTITY_ADMIN': '/app/entity-module/dashboard',
                        'STUDENT': '/app/student-module/dashboard',
                        'TEACHER': '/app/teachers-module/dashboard'
                      };
                      
                      return <Navigate to={roleRedirects[user.role] || '/signin'} replace />;
                    })()}
                  </ProtectedRoute>
                }
              />
              
              {/* Catch all */}
              <Route path="*" element={<Navigate to="/landing" replace />} />
            </Routes>
          </PermissionProvider>
        </UserProvider>
      </BrowserRouter>
    </ReactQueryProvider>
  );
}

export default App;