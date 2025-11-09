/**
 * File: /src/App.tsx
 * Dependencies: 
 *   - @/components/auth/ProtectedRoute
 *   - @/contexts/UserContext, PermissionContext
 *   - @/lib/auth
 *   - All page components from /app directories
 *   - React Router DOM
 * 
 * Preserved Features:
 *   - Authentication flow with ProtectedRoute
 *   - Module-based access control with role checking
 *   - Test mode support with TestModeBar
 *   - All existing module routes (system-admin, entity-module, student-module, teachers-module)
 *   - Password change route
 *   - Form validation route
 * 
 * Added/Modified:
 *   - Added missing public landing page routes (/subjects, /resources, /about, /contact)
 *   - Added /landing route as alias to home
 *   - Proper imports for all actual landing page components
 * 
 * Database Tables:
 *   - users (via auth context)
 *   - permissions (via permission context)
 * 
 * Connected Files:
 *   - All page components import this router setup
 *   - Protected routes use this for navigation
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { UserProvider } from './contexts/UserContext';
import { PermissionProvider } from './contexts/PermissionContext';
import { Toast } from './components/shared/Toast';
import { SessionExpiredNotice } from './components/shared/SessionExpiredNotice';
import { SessionWarningBanner } from './components/shared/SessionWarningBanner';
import { ActivityConfirmationDialog } from './components/shared/ActivityConfirmationDialog';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { ReactQueryProvider } from './providers/ReactQueryProvider';
import { TestModeBar } from './components/admin/TestModeBar';
import { isInTestMode, getCurrentUser } from './lib/auth';
import {
  initializeSessionManager,
  cleanupSessionManager
} from './lib/sessionManager';
import {
  getCurrentOperation,
  confirmActivity,
  cancelOperation,
  LONG_OPERATION_CONFIRMATION_EVENT as LONG_OP_EVENT
} from './lib/longOperationManager';

// Import existing page components - PRESERVED all original imports
import SystemAdminPage from './app/system-admin/page';
import SignInPage from './app/signin/page';
import ForgotPasswordPage from './app/forgot-password/page';
import ResetPasswordPage from './app/reset-password/page';
import LandingPage from './app/landing/page';
import EntityModulePage from './app/entity-module/page';
import StudentModulePage from './app/student-module/page';
import TeachersModulePage from './app/teachers-module/page';
import FormValidationPage from './pages/FormValidationPage';

// ADDED: Import actual landing page components that exist in the project
import SubjectsPage from './app/landing/subjects/page';
import ResourcesPage from './app/landing/resources/page';
import AboutPage from './app/landing/about/page';
import ContactPage from './app/landing/contact/page';
import MockExamsPage from './app/landing/mock-exams/page';
import VideoLessonsPage from './app/landing/video-lessons/page';
import PricingPage from './app/landing/pricing/page';
import CambridgeIgcsePage from './app/landing/cambridge-igcse/page';
import EdexcelIgcsePage from './app/landing/edexcel-igcse/page';
import CambridgeALevelPage from './app/landing/cambridge-a-level/page';
import EdexcelALevelPage from './app/landing/edexcel-a-level/page';
import CambridgeOLevelPage from './app/landing/cambridge-o-level/page';
import PrivacyPage from './app/landing/privacy/page';
import TermsPage from './app/landing/terms/page';
import CookiesPage from './app/landing/cookies/page';
import AuthCallbackPage from './app/auth/callback/page';

// PRESERVED: Module access control wrapper
function ModuleRoute({
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
  // Session management state
  const [showActivityDialog, setShowActivityDialog] = React.useState(false);
  const [activityDialogData, setActivityDialogData] = React.useState<any>(null);

  // PRESERVED: Add class to body when in test mode for visual styling
  React.useEffect(() => {
    if (isInTestMode()) {
      document.body.classList.add('test-mode-active');
    } else {
      document.body.classList.remove('test-mode-active');
    }
  }, []);

  // Initialize session manager (only on protected pages)
  React.useEffect(() => {
    // CRITICAL FIX: Only initialize session management on non-public pages
    const isPublicPath = (path: string): boolean => {
      const publicPaths = [
        '/',
        '/landing',
        '/signin',
        '/login',
        '/forgot-password',
        '/reset-password',
        '/about',
        '/contact',
        '/subjects',
        '/resources',
        '/pricing',
        '/privacy',
        '/terms',
        '/cookies',
        '/cambridge-igcse',
        '/cambridge-o-level',
        '/cambridge-a-level',
        '/edexcel-igcse',
        '/edexcel-a-level',
        '/mock-exams',
        '/video-lessons'
      ];

      return publicPaths.some(publicPath =>
        path === publicPath || (publicPath !== '/' && path.startsWith(publicPath + '/'))
      );
    };

    const currentPath = window.location.pathname;
    const isPublic = isPublicPath(currentPath);

    // Only initialize session manager on protected pages
    if (!isPublic) {
      console.log('[App] Initializing session management system on protected page');
      initializeSessionManager();
    } else {
      console.log('[App] Skipping session management on public page:', currentPath);
    }

    // Handle long operation confirmation requests
    const handleLongOperationConfirmation = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { operationId, operationName, progress } = customEvent.detail || {};

      console.log('[App] Long operation confirmation requested:', operationName);

      setActivityDialogData({
        operationId,
        operationName,
        progress
      });
      setShowActivityDialog(true);
    };

    window.addEventListener(LONG_OP_EVENT, handleLongOperationConfirmation as EventListener);

    return () => {
      if (!isPublic) {
        console.log('[App] Cleaning up session management system');
        cleanupSessionManager();
      }
      window.removeEventListener(LONG_OP_EVENT, handleLongOperationConfirmation as EventListener);
    };
  }, []);

  // Handle activity confirmation
  const handleActivityConfirm = () => {
    if (activityDialogData?.operationId) {
      confirmActivity(activityDialogData.operationId);
    }
    setShowActivityDialog(false);
    setActivityDialogData(null);
  };

  // Handle activity cancel
  const handleActivityCancel = () => {
    if (activityDialogData?.operationId) {
      cancelOperation(activityDialogData.operationId);
    }
    setShowActivityDialog(false);
    setActivityDialogData(null);
  };

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('[App] Caught error in ErrorBoundary:', error);
        console.error('[App] Error info:', errorInfo);
      }}
    >
      <ReactQueryProvider>
        <BrowserRouter>
          <UserProvider>
            <PermissionProvider>
              <Toast />
              <SessionExpiredNotice />
              <SessionWarningBanner />
              <ActivityConfirmationDialog
                isOpen={showActivityDialog}
                onConfirm={handleActivityConfirm}
                onCancel={handleActivityCancel}
                operationName={activityDialogData?.operationName || 'Operation'}
                operationProgress={activityDialogData?.progress || 0}
              />
              {/* PRESERVED: Test Mode Bar - Shows only when in test mode */}
              <TestModeBar />

              <Routes>
              {/* ============================================ */}
              {/* PUBLIC LANDING PAGES - NO AUTHENTICATION REQUIRED */}
              {/* ============================================ */}
              
              {/* PRESERVED: Home route */}
              <Route path="/" element={<LandingPage />} />
              
              {/* ADDED: Landing route as alias to home */}
              <Route path="/landing" element={<LandingPage />} />
              
              {/* ADDED: Public landing page routes using actual components */}
              <Route path="/subjects" element={<SubjectsPage />} />
              <Route path="/resources" element={<ResourcesPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/mock-exams" element={<MockExamsPage />} />
              <Route path="/video-lessons" element={<VideoLessonsPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/cambridge-igcse" element={<CambridgeIgcsePage />} />
              <Route path="/edexcel-igcse" element={<EdexcelIgcsePage />} />
              <Route path="/cambridge-a-level" element={<CambridgeALevelPage />} />
              <Route path="/edexcel-a-level" element={<EdexcelALevelPage />} />
              <Route path="/cambridge-o-level" element={<CambridgeOLevelPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/cookies" element={<CookiesPage />} />
              
              {/* ============================================ */}
              {/* AUTHENTICATION PAGES */}
              {/* ============================================ */}
              
              {/* PRESERVED: All authentication routes */}
              <Route path="/signin" element={<SignInPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/form-validation" element={<FormValidationPage />} />
              
              {/* PRESERVED: Password Change Route - Protected */}
              <Route
                path="/app/settings/change-password"
                element={
                  <ProtectedRoute>
                    <ResetPasswordPage />
                  </ProtectedRoute>
                }
              />
              
              {/* ============================================ */}
              {/* PROTECTED MODULE ROUTES */}
              {/* ============================================ */}
              
              {/* PRESERVED: Entity Module - Only ENTITY_ADMIN and SSA */}
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
              
              {/* PRESERVED: Student Module - Only STUDENT and SSA */}
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
              
              {/* PRESERVED: Teachers Module - Only TEACHER and SSA */}
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
              
              {/* PRESERVED: System Admin Module - SSA, SUPPORT, VIEWER */}
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
              
              {/* PRESERVED: Catch-all route - redirect to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </PermissionProvider>
          </UserProvider>
        </BrowserRouter>
      </ReactQueryProvider>
    </ErrorBoundary>
  );
}

export default App;