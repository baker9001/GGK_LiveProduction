// /home/project/src/App.tsx

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import SubjectsPage from './app/subjects/page';
import ResourcesPage from './app/resources/page';
import AboutPage from './app/about/page';
import ContactPage from './app/contact/page';
import EntityModulePage from './app/entity-module/page';
import StudentModulePage from './app/student-module/page';
import TeachersModulePage from './app/teachers-module/page';
import FormValidationPage from './pages/FormValidationPage';

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

  return (
    <ReactQueryProvider>
      <BrowserRouter>
        <UserProvider>
          <PermissionProvider>
            <Toast />
            {/* Test Mode Bar - Shows only when in test mode */}
            <TestModeBar />
            
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/subjects" element={<SubjectsPage />} />
              <Route path="/resources" element={<ResourcesPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
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
            </Routes>
          </PermissionProvider>
        </UserProvider>
      </BrowserRouter>
    </ReactQueryProvider>
  );
}

export default App;