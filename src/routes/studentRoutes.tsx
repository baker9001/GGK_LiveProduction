//home/project/src/routes/studentRoutes.tsx


import { lazy } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { RoleGuard } from '../components/auth/RoleGuard';

// Lazy load student pages for better performance
const StudentDashboard = lazy(() => import('../app/student/page'));
const StudentLearnPage = lazy(() => import('../app/student/learn/page'));
const StudentEngagePage = lazy(() => import('../app/student/engage/page'));
const StudentAchievePage = lazy(() => import('../app/student/achieve/page'));
const StudentPlayPage = lazy(() => import('../app/student/play/page'));

// Additional pages to be created
const StudentCoursesPage = lazy(() => import('../app/student/learn/courses/page'));
const StudentMaterialsPage = lazy(() => import('../app/student/learn/materials/page'));
const StudentVideosPage = lazy(() => import('../app/student/learn/videos/page'));
const StudentProgressPage = lazy(() => import('../app/student/learn/progress/page'));

const StudentAssignmentsPage = lazy(() => import('../app/student/engage/assignments/page'));
const StudentQuizzesPage = lazy(() => import('../app/student/engage/quizzes/page'));
const StudentPracticePage = lazy(() => import('../app/student/engage/practice/page'));
const StudentHomeworkPage = lazy(() => import('../app/student/engage/homework/page'));

const StudentGoalsPage = lazy(() => import('../app/student/achieve/goals/page'));
const StudentBadgesPage = lazy(() => import('../app/student/achieve/badges/page'));
const StudentAnalyticsPage = lazy(() => import('../app/student/achieve/analytics/page'));

const StudentDailyChallengePage = lazy(() => import('../app/student/play/daily/page'));
const StudentBattlePage = lazy(() => import('../app/student/play/battle/page'));
const StudentTournamentPage = lazy(() => import('../app/student/play/tournament/page'));
const StudentLeaderboardPage = lazy(() => import('../app/student/play/leaderboard/page'));
const StudentShopPage = lazy(() => import('../app/student/play/shop/page'));

const StudentProfilePage = lazy(() => import('../app/student/profile/page'));
const StudentSettingsPage = lazy(() => import('../app/student/settings/page'));
const StudentCalendarPage = lazy(() => import('../app/student/calendar/page'));
const StudentHelpPage = lazy(() => import('../app/student/help/page'));

export const studentRoutes: RouteObject[] = [
  {
    path: '/student',
    element: (
      <ProtectedRoute>
        <RoleGuard requiredRole="student">
          <StudentDashboard />
        </RoleGuard>
      </ProtectedRoute>
    ),
  },
  {
    path: '/student/learn',
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <RoleGuard requiredRole="student">
              <StudentLearnPage />
            </RoleGuard>
          </ProtectedRoute>
        ),
      },
      {
        path: 'courses',
        element: (
          <ProtectedRoute>
            <RoleGuard requiredRole="student">
              <StudentCoursesPage />
            </RoleGuard>
          </ProtectedRoute>
        ),
      },
      {
        path: 'materials',
        element: (
          <ProtectedRoute>
            <RoleGuard requiredRole="student">
              <StudentMaterialsPage />
            </RoleGuard>
          </ProtectedRoute>
        ),
      },
      {
        path: 'videos',
        element: (
          <ProtectedRoute>
            <RoleGuard requiredRole="student">
              <StudentVideosPage />
            </RoleGuard>
          </ProtectedRoute>
        ),
      },
      {
        path: 'progress',
        element: (
          <ProtectedRoute>
            <RoleGuard requiredRole="student">
              <StudentProgressPage />
            </RoleGuard>
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: '/student/engage',
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <RoleGuard requiredRole="student">
              <StudentEngagePage />
            </RoleGuard>
          </ProtectedRoute>
        ),
      },
      {
        path: 'assignments',
        element: (
          <ProtectedRoute>
            <RoleGuard requiredRole="student">
              <StudentAssignmentsPage />
            </RoleGuard>
          </ProtectedRoute>
        ),
      },
      {
        path: 'quizzes',
        element: (
          <ProtectedRoute>
            <RoleGuard requiredRole="student">
              <StudentQuizzesPage />
            </RoleGuard>
          </ProtectedRoute>
        ),
      },
      {
        path: 'practice',
        element: (
          <ProtectedRoute>
            <RoleGuard requiredRole="student">
              <StudentPracticePage />
            </RoleGuard>
          </ProtectedRoute>
        ),
      },
      {
        path: 'homework',
        element: (
          <ProtectedRoute>
            <RoleGuard requiredRole="student">
              <StudentHomeworkPage />
            </RoleGuard>
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: '/student/achieve',
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <RoleGuard requiredRole="student">
              <StudentAchievePage />
            </RoleGuard>
          </ProtectedRoute>
        ),
      },
      {
        path: 'progress',
        element: (
          <ProtectedRoute>
            <RoleGuard requiredRole="student">
              <Navigate to="/student/learn/progress" replace />
            </RoleGuard>
          </ProtectedRoute>
        ),
      },
      {
        path: 'goals',
        element: (
          <ProtectedRoute>
            <RoleGuard requiredRole="student">
              <StudentGoalsPage />
            </RoleGuard>
          </ProtectedRoute>
        ),
      },
      {
        path: 'badges',
        element: (
          <ProtectedRoute>
            <RoleGuard requiredRole="student">
              <StudentBadgesPage />
            </RoleGuard>
          </ProtectedRoute>
        ),
      },
      {
        path: 'analytics',
        element: (
          <ProtectedRoute>
            <RoleGuard requiredRole="student">
              <StudentAnalyticsPage />
            </RoleGuard>
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: '/student/play',
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <RoleGuard requiredRole="student">
              <StudentPlayPage />
            </RoleGuard>
          </ProtectedRoute>
        ),
      },
      {
        path: 'daily',
        element: (
          <ProtectedRoute>
            <RoleGuard requiredRole="student">
              <StudentDailyChallengePage />
            </RoleGuard>
          </ProtectedRoute>
        ),
      },
      {
        path: 'battle',
        element: (
          <ProtectedRoute>
            <RoleGuard requiredRole="student">
              <StudentBattlePage />
            </RoleGuard>
          </ProtectedRoute>
        ),
      },
      {
        path: 'tournament',
        element: (
          <ProtectedRoute>
            <RoleGuard requiredRole="student">
              <StudentTournamentPage />
            </RoleGuard>
          </ProtectedRoute>
        ),
      },
      {
        path: 'leaderboard',
        element: (
          <ProtectedRoute>
            <RoleGuard requiredRole="student">
              <StudentLeaderboardPage />
            </RoleGuard>
          </ProtectedRoute>
        ),
      },
      {
        path: 'shop',
        element: (
          <ProtectedRoute>
            <RoleGuard requiredRole="student">
              <StudentShopPage />
            </RoleGuard>
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: '/student/profile',
    element: (
      <ProtectedRoute>
        <RoleGuard requiredRole="student">
          <StudentProfilePage />
        </RoleGuard>
      </ProtectedRoute>
    ),
  },
  {
    path: '/student/settings',
    element: (
      <ProtectedRoute>
        <RoleGuard requiredRole="student">
          <StudentSettingsPage />
        </RoleGuard>
      </ProtectedRoute>
    ),
  },
  {
    path: '/student/calendar',
    element: (
      <ProtectedRoute>
        <RoleGuard requiredRole="student">
          <StudentCalendarPage />
        </RoleGuard>
      </ProtectedRoute>
    ),
  },
  {
    path: '/student/help',
    element: (
      <ProtectedRoute>
        <RoleGuard requiredRole="student">
          <StudentHelpPage />
        </RoleGuard>
      </ProtectedRoute>
    ),
  },
];

// Integration with main App.tsx routes
// In your App.tsx, import and use these routes:
/*
import { studentRoutes } from './routes/studentRoutes';

const router = createBrowserRouter([
  // ... other routes
  ...studentRoutes,
]);
*/