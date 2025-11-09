import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { getCurrentUser } from '../../lib/auth';
import { useModuleSecurity } from '../../hooks/useModuleSecurity';
import { useUser } from '../../contexts/UserContext';
import { supabase } from '../../lib/supabase';
import { getPublicUrl } from '../../lib/storageHelpers';
import { BookOpen, Award, Clock, TrendingUp, Key, Video, Building2, MapPin, GraduationCap } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/shared/Card';
import { Badge } from '../../components/shared/Badge';
import LicensesPage from './licenses/page';
import LearningPathPage from './pathways/page';
import StudentProfileSettingsPage from './profile/page';
import StudentLearningMaterialsPage from './pathways/materials/page';
import PracticePage from './practice/page';

interface StudentModulePageProps {
  moduleKey?: string;
}

interface StudentInfo {
  schoolName?: string | null;
  schoolLogoUrl?: string | null;
  branchName?: string | null;
  gradeLevel?: string | null;
  section?: string | null;
}

function DashboardPage() {
  const { user } = useUser();

  // Fetch student school information
  const { data: studentInfo } = useQuery<StudentInfo>({
    queryKey: ['student-dashboard-info', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return {};
      }

      const { data: studentRow } = await supabase
        .from('students')
        .select('school_id, branch_id, grade_level, section')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!studentRow) {
        return {};
      }

      let schoolName: string | null = null;
      let schoolLogoUrl: string | null = null;
      if (studentRow.school_id) {
        const { data: schoolData } = await supabase
          .from('schools')
          .select('name, logo_url')
          .eq('id', studentRow.school_id)
          .maybeSingle();
        schoolName = schoolData?.name ?? null;
        schoolLogoUrl = schoolData?.logo_url ?? null;
      }

      let branchName: string | null = null;
      if (studentRow.branch_id) {
        const { data: branchData } = await supabase
          .from('branches')
          .select('name')
          .eq('id', studentRow.branch_id)
          .maybeSingle();
        branchName = branchData?.name ?? null;
      }

      return {
        schoolName,
        schoolLogoUrl,
        branchName,
        gradeLevel: studentRow.grade_level,
        section: studentRow.section
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000
  });

  return (
    <div className="min-h-screen bg-ggk-neutral-50 dark:bg-ggk-neutral-900">
      <PageHeader
        title="Student Dashboard"
        subtitle="Access your courses, track progress, and manage your learning journey"
        accent={true}
      />

      <div className="px-24 pb-32 space-y-24">
        {/* School Identity Banner */}
        {studentInfo?.schoolName && (
          <Card variant="elevated" className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 border-blue-500/20">
            <CardContent className="p-24 md:p-32">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* School Logo */}
            {studentInfo.schoolLogoUrl ? (
              <div className="flex-shrink-0">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white shadow-lg p-3 ring-4 ring-white/30">
                  <img
                    src={getPublicUrl('school-logos', studentInfo.schoolLogoUrl) || undefined}
                    alt={`${studentInfo.schoolName} logo`}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-600"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg></div>';
                      }
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex-shrink-0">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white shadow-lg p-3 ring-4 ring-white/30 flex items-center justify-center">
                  <Building2 className="w-12 h-12 md:w-14 md:h-14 text-blue-600" />
                </div>
              </div>
            )}

            {/* School Information */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-blue-200" />
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-200">My School</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 break-words">
                {studentInfo.schoolName}
              </h2>

              <div className="flex flex-wrap items-center gap-3 text-sm md:text-base">
                {studentInfo.branchName && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full">
                    <MapPin className="w-4 h-4 text-blue-100" />
                    <span className="text-white font-medium">{studentInfo.branchName}</span>
                  </div>
                )}
                {studentInfo.gradeLevel && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full">
                    <GraduationCap className="w-4 h-4 text-blue-100" />
                    <span className="text-white font-medium">
                      {studentInfo.gradeLevel}
                      {studentInfo.section && ` - Section ${studentInfo.section}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Welcome Card */}
        <Card variant="elevated" className="bg-gradient-to-r from-ggk-success-50 to-teal-50 dark:from-ggk-success-900/20 dark:to-teal-900/20 border-ggk-success-200 dark:border-ggk-success-800">
          <CardContent className="p-24">
            <div className="flex items-center gap-16">
              <div className="flex-shrink-0 w-56 h-56 rounded-ggk-lg bg-ggk-success-100 dark:bg-ggk-success-800/50 flex items-center justify-center">
                <BookOpen className="h-32 w-32 text-ggk-success-600 dark:text-ggk-success-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-ggk-success-900 dark:text-ggk-success-100 mb-8">
                  Welcome to Your Learning Hub
                </h2>
                <p className="text-ggk-success-700 dark:text-ggk-success-300">
                  This module provides access to all your learning resources, practice materials, and progress tracking tools.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
          <Card variant="elevated" hover>
            <CardHeader accent>
              <div className="flex items-center gap-12">
                <div className="flex-shrink-0 w-48 h-48 rounded-ggk-md bg-blue-100 dark:bg-blue-800/50 flex items-center justify-center">
                  <BookOpen className="h-24 w-24 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle>My Courses</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-16">
              <p className="text-ggk-neutral-700 dark:text-ggk-neutral-300">
                Access all your enrolled courses, materials, and learning resources.
              </p>
              <Link
                to="/app/student-module/practice"
                className="inline-flex items-center gap-2 text-sm font-semibold text-ggk-primary-600 hover:text-ggk-primary-700"
              >
                Open Practice Arena
              </Link>
            </CardContent>
          </Card>

          <Card variant="elevated" hover>
            <CardHeader accent>
              <div className="flex items-center gap-12">
                <div className="flex-shrink-0 w-48 h-48 rounded-ggk-md bg-orange-100 dark:bg-orange-800/50 flex items-center justify-center">
                  <Clock className="h-24 w-24 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle>Practice & Assignments</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-16">
              <p className="text-ggk-neutral-700 dark:text-ggk-neutral-300">
                Complete assignments, practice questions, and mock exams.
              </p>
              <Badge variant="default">Coming Soon</Badge>
            </CardContent>
          </Card>

          <Card variant="elevated" hover>
            <CardHeader accent>
              <div className="flex items-center gap-12">
                <div className="flex-shrink-0 w-48 h-48 rounded-ggk-md bg-ggk-success-100 dark:bg-ggk-success-800/50 flex items-center justify-center">
                  <TrendingUp className="h-24 w-24 text-ggk-success-600 dark:text-ggk-success-400" />
                </div>
                <CardTitle>Progress Tracking</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-16">
              <p className="text-ggk-neutral-700 dark:text-ggk-neutral-300">
                Monitor your learning progress, scores, and performance metrics.
              </p>
              <Badge variant="default">Coming Soon</Badge>
            </CardContent>
          </Card>

          <Card variant="elevated" hover>
            <CardHeader accent>
              <div className="flex items-center gap-12">
                <div className="flex-shrink-0 w-48 h-48 rounded-ggk-md bg-ggk-primary-100 dark:bg-ggk-primary-800/50 flex items-center justify-center">
                  <Key className="h-24 w-24 text-ggk-primary-600 dark:text-ggk-primary-400" />
                </div>
                <CardTitle>My Licenses</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-16">
              <p className="text-ggk-neutral-700 dark:text-ggk-neutral-300">
                View and manage your active learning licenses and subscriptions.
              </p>
              <Badge variant="success">Available</Badge>
            </CardContent>
          </Card>

          <Card variant="elevated" hover>
            <CardHeader accent>
              <div className="flex items-center gap-12">
                <div className="flex-shrink-0 w-48 h-48 rounded-ggk-md bg-purple-100 dark:bg-purple-800/50 flex items-center justify-center">
                  <Video className="h-24 w-24 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle>Video Lessons</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-16">
              <p className="text-ggk-neutral-700 dark:text-ggk-neutral-300">
                Watch video tutorials and recorded lessons from your teachers.
              </p>
              <Badge variant="default">Coming Soon</Badge>
            </CardContent>
          </Card>

          <Card variant="elevated" hover>
            <CardHeader accent>
              <div className="flex items-center gap-12">
                <div className="flex-shrink-0 w-48 h-48 rounded-ggk-md bg-yellow-100 dark:bg-yellow-800/50 flex items-center justify-center">
                  <Award className="h-24 w-24 text-yellow-600 dark:text-yellow-400" />
                </div>
                <CardTitle>Achievements</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-16">
              <p className="text-ggk-neutral-700 dark:text-ggk-neutral-300">
                Track your achievements, badges, and learning milestones.
              </p>
              <Badge variant="default">Coming Soon</Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function StudentModulePage({ moduleKey }: StudentModulePageProps) {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  useModuleSecurity('student-module');

  useEffect(() => {
    const allowedRoles = ['SSA', 'STUDENT'];

    if (currentUser && !allowedRoles.includes(currentUser.role)) {
      console.error(`[Security] Unauthorized access to Student Module by ${currentUser.email} (${currentUser.role})`);

      const securityEvent = {
        type: 'STUDENT_MODULE_ACCESS_VIOLATION',
        timestamp: new Date().toISOString(),
        user: {
          id: currentUser.id,
          email: currentUser.email,
          role: currentUser.role
        },
        module: 'student-module',
        action: 'ACCESS_BLOCKED'
      };

      console.error('[SECURITY EVENT]', securityEvent);

      const violations = JSON.parse(localStorage.getItem('security_violations') || '[]');
      violations.push(securityEvent);
      localStorage.setItem('security_violations', JSON.stringify(violations.slice(-100)));

      const roleRedirects: Record<string, string> = {
        'STUDENT': '/app/student-module/dashboard',
        'TEACHER': '/app/teachers-module/dashboard',
        'SUPPORT': '/app/system-admin/dashboard',
        'VIEWER': '/app/system-admin/dashboard',
        'SSA': '/app/system-admin/dashboard',
        'ENTITY_ADMIN': '/app/entity-module/dashboard'
      };

      navigate(roleRedirects[currentUser.role] || '/signin', { replace: true });
    }
  }, [currentUser, navigate]);

  return (
    <AdminLayout moduleKey="student-module">
      <Routes>
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="licenses" element={<LicensesPage />} />
        <Route path="pathways" element={<LearningPathPage />} />
        <Route path="pathways/materials/:subjectId" element={<StudentLearningMaterialsPage />} />
        <Route path="profile" element={<StudentProfileSettingsPage />} />
        <Route path="practice" element={<PracticePage />} />
      </Routes>
    </AdminLayout>
  );
}
