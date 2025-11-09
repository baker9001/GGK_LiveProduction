import React from 'react';
import { Calendar, Clock, CalendarDays, CalendarCheck, Bell, CalendarRange, CalendarCog } from 'lucide-react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/shared/Card';
import { Badge } from '../../../components/shared/Badge';

const calendarTiles = [
  {
    title: 'Class Schedule',
    description: 'Synchronise lessons, co-teachers, and locations with clear visibility across the week.',
    icon: CalendarDays,
    status: { label: 'In Discovery', variant: 'info' as const },
  },
  {
    title: 'Lesson Planning',
    description: 'Plan topics, attach materials, and surface prerequisites directly in the calendar.',
    icon: CalendarCheck,
    status: { label: 'Coming Soon', variant: 'warning' as const },
  },
  {
    title: 'Assignment Deadlines',
    description: 'Coordinate due dates and automatically notify students about upcoming submissions.',
    icon: Clock,
    status: { label: 'Planning', variant: 'default' as const },
  },
  {
    title: 'Reminders & Alerts',
    description: 'Smart reminders keep you and your classes aligned around key milestones.',
    icon: Bell,
    status: { label: 'Designing', variant: 'default' as const },
  },
  {
    title: 'Academic Calendar',
    description: 'Blend whole-school events with your personal schedule to avoid conflicts.',
    icon: CalendarRange,
    status: { label: 'Coming Soon', variant: 'warning' as const },
  },
  {
    title: 'Event Management',
    description: 'Manage parent evenings, enrichment activities, and extra sessions with ease.',
    icon: CalendarCog,
    status: { label: 'Planning', variant: 'default' as const },
  },
];

export default function StudyCalendarPage() {
  return (
    <div className="mx-auto max-w-7xl px-20 py-20 space-y-24">
      <PageHeader
        title="Study Calendar"
        subtitle="Plan lessons, coordinate events, and manage assignments with a refreshed calendar experience built on the GGK design system."
      />

      <Card variant="elevated" className="relative overflow-hidden bg-gradient-to-br from-ggk-primary-50 via-ggk-neutral-0 to-ggk-neutral-50">
        <div className="absolute -right-16 top-10 h-72 w-72 rounded-full bg-ggk-primary-200/50 blur-3xl" aria-hidden="true" />
        <CardContent className="grid gap-24 md:grid-cols-[1.3fr_1fr] items-start">
          <div className="space-y-10">
            <Badge variant="primary" size="sm" className="uppercase tracking-wide">Timeline intelligence</Badge>
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-ggk-neutral-900 dark:text-ggk-neutral-50">
                Keep everyone in sync
              </h2>
              <p className="text-sm leading-relaxed text-ggk-neutral-600 dark:text-ggk-neutral-300">
                We&apos;re aligning the calendar with our new design tokens so that managing schedules feels calm, predictable, and accessible across any device.
              </p>
            </div>
            <div className="grid gap-12 sm:grid-cols-2">
              <div className="rounded-ggk-xl border border-ggk-neutral-200/70 bg-white/80 p-16 shadow-ggk-sm dark:border-ggk-neutral-800/80 dark:bg-ggk-neutral-900/50">
                <h3 className="text-base font-semibold text-ggk-neutral-900 dark:text-ggk-neutral-50">Personal + shared</h3>
                <p className="mt-4 text-sm text-ggk-neutral-600 dark:text-ggk-neutral-400">
                  Toggle between personal schedules and shared team calendars without losing context.
                </p>
              </div>
              <div className="rounded-ggk-xl border border-ggk-neutral-200/70 bg-white/80 p-16 shadow-ggk-sm dark:border-ggk-neutral-800/80 dark:bg-ggk-neutral-900/50">
                <h3 className="text-base font-semibold text-ggk-neutral-900 dark:text-ggk-neutral-50">Actionable context</h3>
                <p className="mt-4 text-sm text-ggk-neutral-600 dark:text-ggk-neutral-400">
                  Each event will surface linked materials, notes, and quick actions in the same view.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-12 rounded-ggk-2xl border border-ggk-neutral-200/70 bg-white/90 p-20 shadow-ggk-lg dark:border-ggk-neutral-800/80 dark:bg-ggk-neutral-900/60">
            <div className="flex items-center gap-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ggk-primary-500/10 text-ggk-primary-600">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ggk-neutral-500">What to expect</p>
                <h3 className="text-lg font-semibold text-ggk-neutral-900 dark:text-ggk-neutral-50">A calmer calendar</h3>
              </div>
            </div>
            <ul className="space-y-8 text-sm text-ggk-neutral-600 dark:text-ggk-neutral-300">
              <li className="flex items-start gap-8">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-ggk-primary-500" />
                <span>Design tokens ensure consistent spacing, colours, and typography across calendar views.</span>
              </li>
              <li className="flex items-start gap-8">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-ggk-primary-500" />
                <span>Accessibility improvements include larger hit areas and keyboard-friendly navigation.</span>
              </li>
              <li className="flex items-start gap-8">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-ggk-primary-500" />
                <span>Upcoming integrations will sync with tasks, announcements, and student check-ins.</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardHeader accent>
          <CardTitle className="text-lg">Calendar roadmap</CardTitle>
          <CardDescription className="mt-6">
            The refreshed teacher module sets the stage for intelligent scheduling. Here&apos;s how the calendar evolves next.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-16 md:grid-cols-2 xl:grid-cols-3">
            {calendarTiles.map((tile) => (
              <div key={tile.title} className="flex h-full flex-col justify-between rounded-ggk-xl border border-ggk-neutral-200/70 bg-ggk-neutral-50/70 p-16 shadow-ggk-sm dark:border-ggk-neutral-800/80 dark:bg-ggk-neutral-900/40">
                <div className="space-y-8">
                  <div className="flex items-center justify-between gap-12">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ggk-primary-100 text-ggk-primary-700">
                      <tile.icon className="h-5 w-5" />
                    </div>
                    <Badge variant={tile.status.variant} size="sm">{tile.status.label}</Badge>
                  </div>
                  <h3 className="text-base font-semibold text-ggk-neutral-900 dark:text-ggk-neutral-50">{tile.title}</h3>
                  <p className="text-sm text-ggk-neutral-600 dark:text-ggk-neutral-400">{tile.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
