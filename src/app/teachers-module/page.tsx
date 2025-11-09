import React, { useEffect } from 'react';
import { Link, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { GraduationCap, BookOpen, ClipboardList, BarChart3, Users, FileText, CalendarCheck } from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { PageHeader } from '../../components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/shared/Card';
import { Badge } from '../../components/shared/Badge';
import { Button } from '../../components/shared/Button';
import { getCurrentUser } from '../../lib/auth';
import { useModuleSecurity } from '../../hooks/useModuleSecurity';
import ProfilePage from './profile/page';
import StudentsPage from './students/page';
import LearningManagementPage from './learning-management/page';
import StudyCalendarPage from './study-calendar/page';
import TeacherMaterialsPage from './learning-management/materials/page';

interface TeachersModulePageProps {
  moduleKey?: string;
}

const featureTiles = [
  {
    title: 'Learning Management',
    description: 'Organise lesson plans, manage curriculum coverage, and keep resources aligned with your teaching goals.',
    icon: BookOpen,
    status: { label: 'Available', variant: 'success' as const },
    href: '/app/teachers-module/learning-management',
  },
  {
    title: 'Materials Library',
    description: 'Upload digital resources, stream secure media, and collaborate on classroom-ready content.',
    icon: FileText,
    status: { label: 'Available', variant: 'success' as const },
    href: '/app/teachers-module/learning-management/materials',
  },
  {
    title: 'Student Success Hub',
    description: 'Monitor student progress, prepare interventions, and communicate with families in one place.',
    icon: Users,
    status: { label: 'In Discovery', variant: 'info' as const },
    href: '/app/teachers-module/students',
  },
  {
    title: 'Performance Analytics',
    description: 'Surface mastery trends, class-wide insights, and growth opportunities for every learner.',
    icon: BarChart3,
    status: { label: 'Coming Soon', variant: 'warning' as const },
    href: '/app/teachers-module/dashboard',
  },
];

const focusAreas = [
  {
    label: 'Plan beautiful learning journeys',
    description: 'Map curriculum goals and keep every class on track with structured milestones.',
    icon: ClipboardList,
  },
  {
    label: 'Deliver engaging experiences',
    description: 'Share high-quality materials, stream video securely, and personalise instruction.',
    icon: BookOpen,
  },
  {
    label: 'Celebrate learner growth',
    description: 'Spot strengths, address learning gaps early, and celebrate wins with families.',
    icon: CalendarCheck,
  },
];

const quickActions = [
  {
    title: 'Upload a new resource',
    description: 'Share lesson slides, readings, or videos in seconds with your classes.',
    href: '/app/teachers-module/learning-management/materials',
  },
  {
    title: 'Review your schedule',
    description: 'Preview upcoming lessons, events, and assignment deadlines.',
    href: '/app/teachers-module/study-calendar',
  },
  {
    title: 'Refresh your profile',
    description: 'Update contact details, qualifications, and teaching preferences.',
    href: '/app/teachers-module/profile',
  },
];

function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-20 py-20 space-y-24">
      <PageHeader
        title="Teachers Module"
        subtitle="The refreshed educator workspace brings together lesson planning, content distribution, and student support tools in one modern experience."
        actions={(
          <Button asChild leftIcon={<FileText className="h-4 w-4" />}>
            <Link to="/app/teachers-module/learning-management/materials">Manage materials</Link>
          </Button>
        )}
      />

      <Card variant="elevated" className="relative overflow-hidden bg-gradient-to-br from-ggk-primary-50 via-ggk-neutral-0 to-ggk-neutral-50">
        <div className="absolute -top-24 right-[-12%] h-80 w-80 rounded-full bg-ggk-primary-200/40 blur-3xl" aria-hidden="true" />
        <CardContent className="grid gap-24 md:grid-cols-[1.4fr_1fr] items-start">
          <div className="space-y-12">
            <Badge variant="primary" size="sm" className="uppercase tracking-wide">Modern EdTech release</Badge>
            <div className="space-y-8">
              <h2 className="text-2xl font-semibold text-ggk-neutral-900 dark:text-ggk-neutral-50 tracking-tight">
                Welcome to your upgraded teacher workspace
              </h2>
              <p className="text-base leading-relaxed text-ggk-neutral-600 dark:text-ggk-neutral-300">
                Navigate seamlessly between planning, instruction, and reflection. Everything in this module now follows the new GGK design system for a calm, focused experience.
              </p>
            </div>
            <div className="grid gap-12 sm:grid-cols-2">
              {focusAreas.map((item) => (
                <div key={item.label} className="rounded-ggk-xl border border-ggk-neutral-200/70 dark:border-ggk-neutral-800/80 bg-white/80 dark:bg-ggk-neutral-900/50 p-16 shadow-ggk-sm">
                  <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-ggk-primary-100 text-ggk-primary-700">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-ggk-neutral-900 dark:text-ggk-neutral-50">
                    {item.label}
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed text-ggk-neutral-600 dark:text-ggk-neutral-400">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-12 rounded-ggk-2xl border border-ggk-primary-200/60 bg-white/90 p-20 shadow-ggk-lg backdrop-blur">
            <div className="flex items-center gap-12">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ggk-primary-500/10 text-ggk-primary-600">
                <GraduationCap className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-ggk-neutral-500">What&apos;s new</p>
                <h3 className="text-xl font-semibold text-ggk-neutral-900 dark:text-ggk-neutral-50">Design system adoption</h3>
              </div>
            </div>
            <ul className="space-y-10 text-sm text-ggk-neutral-600 dark:text-ggk-neutral-300">
              <li className="flex items-start gap-10">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-ggk-primary-500" aria-hidden="true" />
                <span>Consistent cards, typography, and interactions across every teacher page.</span>
              </li>
              <li className="flex items-start gap-10">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-ggk-primary-500" aria-hidden="true" />
                <span>Responsive layouts tuned for classroom devices and quick workflows.</span>
              </li>
              <li className="flex items-start gap-10">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-ggk-primary-500" aria-hidden="true" />
                <span>Dark mode refinements for low-light grading and review sessions.</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-12">
        <div className="flex items-center justify-between gap-12">
          <div>
            <h2 className="text-xl font-semibold text-ggk-neutral-900 dark:text-ggk-neutral-50">Explore module areas</h2>
            <p className="mt-4 text-sm text-ggk-neutral-600 dark:text-ggk-neutral-400">
              Every section now mirrors the GGK design language for clarity and ease of use.
            </p>
          </div>
        </div>

        <div className="grid gap-16 sm:grid-cols-2 xl:grid-cols-4">
          {featureTiles.map((tile) => (
            <Card key={tile.title} variant="outlined" className="h-full">
              <CardHeader className="border-none pb-12">
                <div className="flex items-center justify-between gap-12">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ggk-primary-100 text-ggk-primary-700">
                    <tile.icon className="h-5 w-5" />
                  </div>
                  <Badge variant={tile.status.variant} size="sm">{tile.status.label}</Badge>
                </div>
                <CardTitle className="mt-12 text-lg">{tile.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-12">
                <CardDescription className="mt-0 text-sm leading-relaxed">
                  {tile.description}
                </CardDescription>
                <Button asChild variant="ghost" size="sm" className="justify-start px-0 text-ggk-primary-600 hover:text-ggk-primary-700">
                  <Link to={tile.href}>Open workspace</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Card variant="outlined">
        <CardHeader accent>
          <CardTitle className="text-lg">Quick actions</CardTitle>
          <CardDescription className="mt-6">
            Shortcuts to help you jump straight into the workflows teachers use most.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-16 md:grid-cols-3">
            {quickActions.map((action) => (
              <div key={action.title} className="flex h-full flex-col justify-between rounded-ggk-xl bg-ggk-neutral-50/60 p-16 dark:bg-ggk-neutral-900/40">
                <div>
                  <h3 className="text-base font-semibold text-ggk-neutral-900 dark:text-ggk-neutral-50">{action.title}</h3>
                  <p className="mt-4 text-sm text-ggk-neutral-600 dark:text-ggk-neutral-400">{action.description}</p>
                </div>
                <Button asChild variant="outline" size="sm" className="mt-10 self-start">
                  <Link to={action.href}>Go now</Link>
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function TeachersModulePage({ moduleKey }: TeachersModulePageProps) {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  useModuleSecurity('teachers-module');

  useEffect(() => {
    const allowedRoles = ['SSA', 'TEACHER'];

    if (currentUser && !allowedRoles.includes(currentUser.role)) {
      console.error(`[Security] Unauthorized access to Teachers Module by ${currentUser.email} (${currentUser.role})`);

      const securityEvent = {
        type: 'TEACHERS_MODULE_ACCESS_VIOLATION',
        timestamp: new Date().toISOString(),
        user: {
          id: currentUser.id,
          email: currentUser.email,
          role: currentUser.role
        },
        module: 'teachers-module',
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
    <AdminLayout moduleKey="teachers-module">
      <Routes>
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="learning-management" element={<LearningManagementPage />} />
        <Route path="learning-management/materials" element={<TeacherMaterialsPage />} />
        <Route path="study-calendar" element={<StudyCalendarPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Routes>
    </AdminLayout>
  );
}
