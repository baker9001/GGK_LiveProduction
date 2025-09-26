// /home/project/src/App.tsx
// Enhanced version with robust password reset redirect handling

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

// Enhanced Root redirect component that properly handles Supabase password reset tokens
function RootRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    if (processed) return;

    // Check for hash fragments (Supabase sends tokens as hash fragments)
    const hash = window.location.hash;
    
    console.log('RootRedirect - Current URL:', window.location.href);
    console.log('RootRedirect - Hash:', hash);
    console.log('RootRedirect - Search:', window.location.search);
    
    // Check if this is a password reset callback
    // Supabase sends: #access_token=xxx&type=recovery&...
    if (hash) {
      // Parse the hash to check for recovery tokens
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      
      console.log('RootRedirect - Parsed type:', type);
      console.log('RootRedirect - Has access token:', !!accessToken);
      
      // If this is a recovery/password reset, redirect to reset-password with the hash
      if (type === 'recovery' && accessToken) {
        console.log('Password reset tokens detected, redirecting to /reset-password');
        setProcessed(true);
        // Navigate to reset-password and preserve the hash
        navigate(`/reset-password${hash}`, { replace: true });
        return;
      }
      
      // Also check for other auth types (signup confirmation, etc.)
      if (type === 'signup' || type === 'invite' || type === 'magiclink' || type === 'email_change') {
        console.log(`Auth type "${type}" detected, processing...`);
        setProcessed(true);
        // Handle other auth callbacks if needed
        navigate(`/auth/callback${hash}`, { replace: true });
        return;
      }
    }
    
    // If no special tokens, redirect to landing
    console.log('No special tokens found, redirecting to landing');
    setProcessed(true);
    navigate('/landing', { replace: true });
  }, [navigate, processed, location]);

  // Show a brief loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="animate-pulse">
          <div className="h-8 w-8 mx-auto mb-4 bg-[#8CC63F] rounded-full animate-ping"></div>
          <div className="text-white">Loading...</div>
        </div>
      </div>
    </div>
  );
}

// Auth callback handler component
function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Handle various auth callbacks here
    const hash = window.location.hash;
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const type = hashParams.get('type');
      
      console.log('AuthCallback - Processing type:', type);
      
      // Redirect based on the type
      switch (type) {
        case 'signup':
          // Email confirmed, redirect to signin
          navigate('/signin', { 
            replace: true,
            state: { message: 'Email confirmed! You can now sign in.' }
          });
          break;
        case 'invite':
          // User accepted invite
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
  }, [navigate, location]);

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
  
  // In test mode, check if user can access this module
  if (testMode && currentUser) {
    if (!allowedRoles.includes(currentUser.role)) {
      // Redirect to user's default module
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
  // Add class to body when in test mode for visual styling
  React.useEffect(() => {
    if (isInTestMode()) {
      document.body.classList.add('test-mode-active');
    } else {
      document.body.classList.remove('test-mode-active');
    }
  }, []);

  // Log initial load for debugging
  React.useEffect(() => {
    console.log('App initialized. Current URL:', window.location.href);
    console.log('Hash:', window.location.hash);
  }, []);

  return (
    <ReactQueryProvider>
      <BrowserRouter>
        <UserProvider>
          <PermissionProvider>
            <Toast />
            {/* Test Mode Bar - Shows only when in test mode */}
            <TestModeBar />
            
            <Routes>
              {/* Root route with enhanced hash fragment handling */}
              <Route path="/" element={<RootRedirect />} />
              
              {/* Auth callback route */}
              <Route path="/auth/callback" element={<AuthCallback />} />
              
              {/* Landing and public pages */}
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
              
              {/* Entity Module - Only ENTITY_ADMIN and SSA */}
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
              
              {/* Student Module - Only STUDENT and SSA */}
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
              
              {/* Teachers Module - Only TEACHER and SSA */}
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
              
              {/* System Admin Module - SSA, SUPPORT, VIEWER */}
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
              
              {/* Dashboard redirect based on role */}
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
              
              {/* Catch all - redirect to landing */}
              <Route path="*" element={<Navigate to="/landing" replace />} />
            </Routes>
          </PermissionProvider>
        </UserProvider>
      </BrowserRouter>
    </ReactQueryProvider>
  );
}

export default App;